import { useEffect, useMemo, useRef, useState } from 'react';
import { buildCommands, fuzzyScore, type Command } from './commands';
import styles from './CommandPalette.module.css';

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const commands = useMemo<Command[]>(() => (open ? buildCommands() : []), [open]);

  const filtered = useMemo(() => {
    if (query.trim().length === 0) return commands;
    return commands
      .map((cmd) => {
        const score = fuzzyScore(query, `${cmd.title} ${cmd.keywords}`);
        return score === null ? null : { cmd, score };
      })
      .filter((x): x is { cmd: Command; score: number } => x !== null)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.cmd);
  }, [commands, query]);

  // Reset state when (re)opened and focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // Defer focus until the dialog is in the DOM.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keep the active index in range as the result set changes.
  useEffect(() => {
    setActive((a) => (filtered.length === 0 ? 0 : Math.min(a, filtered.length - 1)));
  }, [filtered.length]);

  // Scroll the active item into view.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const runCommand = (cmd: Command | undefined) => {
    if (!cmd) return;
    cmd.run();
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (filtered.length === 0 ? 0 : (a + 1) % filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) =>
        filtered.length === 0 ? 0 : (a - 1 + filtered.length) % filtered.length,
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(filtered[active]);
    }
  };

  return (
    <button
      type="button"
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div // NOSONAR(S6819)
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onKeyDown={handleKeyDown}
      >
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          value={query}
          placeholder="Type a command…"
          aria-label="Command query"
          aria-controls="command-list"
          aria-activedescendant={
            filtered[active] ? `command-${filtered[active]!.id}` : undefined
          }
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul id="command-list" className={styles.list} ref={listRef} role="listbox"> // NOSONAR(S6819)
          {filtered.length === 0 && <li className={styles.empty}>No commands</li>}
          {filtered.map((cmd, i) => (
            <li
              key={cmd.id}
              id={`command-${cmd.id}`}
              role="option"
              aria-selected={i === active}
              className={styles.item}
              data-active={i === active || undefined}
              tabIndex={i === active ? 0 : -1}
              onMouseEnter={() => setActive(i)}
              onClick={() => runCommand(cmd)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  runCommand(cmd);
                }
              }}
            >
              <span className={styles.itemTitle}>{cmd.title}</span>
              {cmd.hint && <span className={styles.itemHint}>{cmd.hint}</span>}
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}
