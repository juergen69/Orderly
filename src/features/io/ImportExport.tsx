import { useRef, useState } from 'react';
import { parseImport, type ParseResult, type ImportPayload } from '../../domain/validation';
import { getActiveStore } from '../../store/storeInstance';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from './ImportExport.module.css';

export const IMPORT_SIZE_CAP_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Triggers a browser download of `text` as a JSON file. Returns false if the
 * environment lacks the APIs needed (e.g. non-DOM test contexts) so callers can
 * no-op safely.
 */
export function downloadJson(filename: string, text: string): boolean {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return false;
  try {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    return true;
  } catch {
    return false;
  }
}

export function isOversize(size: number, cap = IMPORT_SIZE_CAP_BYTES): boolean {
  return size > cap;
}

export interface ImportExportProps {
  onImported?: (data: ImportPayload) => void;
}

export function ImportExport({ onImported }: ImportExportProps) {
  const store = getActiveStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<ImportPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = () => {
    void (async () => {
      const data = await store.getState().exportAll();
      // Focus areas are intentionally excluded from export.
      downloadJson(
        'orderly-export.json',
        JSON.stringify({ schemaVersion: 1, ...data }, null, 2),
      );
    })();
  };

  const readFile = (file: File): Promise<ParseResult<ImportPayload>> =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        let parsed: unknown = null;
        try {
          parsed = JSON.parse(String(reader.result));
        } catch {
          resolve({
            success: false,
            error: { kind: 'invalid-shape', issues: [{ path: '', message: 'File is not valid JSON' }] },
          });
          return;
        }
        resolve(parseImport(parsed));
      };
      reader.onerror = () =>
        resolve({
          success: false,
          error: { kind: 'invalid-shape', issues: [{ path: '', message: 'Could not read file' }] },
        });
      reader.readAsText(file);
    });

  const handleFile = async (file: File) => {
    setError(null);
    if (isOversize(file.size)) {
      setError(`File is too large (max ${Math.round(IMPORT_SIZE_CAP_BYTES / 1024 / 1024)}MB).`);
      return;
    }
    const result = await readFile(file);
    if (!result.success) {
      const message =
        result.error.kind === 'version-mismatch'
          ? result.error.message
          : `Import failed: ${result.error.issues.map((i) => i.message).join('; ')}`;
      setError(message);
      return;
    }
    setPending(result.data);
  };

  const confirmImport = async () => {
    if (!pending) return;
    await store.getState().replaceAll(pending); // atomic; reconciles focus slots
    onImported?.(pending);
    setPending(null);
  };

  return (
    <div className={styles.io}>
      <button type="button" className={styles.button} onClick={handleExport}>
        Export
      </button>
      <button
        type="button"
        className={styles.button}
        onClick={() => fileRef.current?.click()}
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className={styles.fileInput}
        aria-label="Import JSON file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = '';
        }}
      />
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {pending !== null && (
        <ConfirmDialog
          title="Replace all data?"
          confirmLabel="Import"
          onConfirm={confirmImport}
          onCancel={() => setPending(null)}
        >
          Importing will replace all current projects, todos, and sub-steps. This cannot be
          undone.
        </ConfirmDialog>
      )}
    </div>
  );
}
