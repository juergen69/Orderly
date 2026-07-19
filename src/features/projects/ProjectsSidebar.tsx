import { useMemo, useState } from 'react';
import type { Project } from '../../domain/types';
import { colorSchema, projectNameSchema } from '../../domain/validation';
import { DEFAULT_COLOR } from '../../domain/colors';
import { getActiveStore } from '../../store/storeInstance';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import styles from './ProjectsSidebar.module.css';

export const ALL_PROJECTS = null;

function sortByName(projects: Project[]): Project[] {
  return [...projects].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
}

interface DraftState {
  mode: 'create' | 'edit';
  id: string | null;
  name: string;
  color: string;
}

export interface ProjectsSidebarProps {
   /** Currently selected project filter (`null` = all projects). Transient. */
   selectedProjectId: string | null;
   onSelect: (projectId: string | null) => void;
   /** Mobile drawer mode - shows overlay backdrop and close button. */
   drawer?: boolean;
   /** Callback to close the drawer (mobile only). */
   onClose?: () => void;
 }

export function ProjectsSidebar({ selectedProjectId, onSelect, drawer, onClose }: ProjectsSidebarProps) {
   const store = getActiveStore();
   const projects = store((s) => s.projects);
   const createProject = store((s) => s.createProject);
   const updateProject = store((s) => s.updateProject);
   const deleteProject = store((s) => s.deleteProject);

   const sorted = useMemo(() => sortByName(projects), [projects]);

   const [draft, setDraft] = useState<DraftState | null>(null);
   const [error, setError] = useState<string | null>(null);
   const [deleting, setDeleting] = useState<Project | null>(null);

const openCreate = () => {
    setError(null);
    setDraft({ mode: 'create', id: null, name: '', color: DEFAULT_COLOR });
  };

  const openEdit = (project: Project) => {
    setError(null);
    setDraft({ mode: 'edit', id: project.id, name: project.name, color: project.color });
  };

  const closeDraft = () => {
    setDraft(null);
    setError(null);
  };

  const submitDraft = async () => {
    if (!draft) return;
    const nameResult = projectNameSchema.safeParse(draft.name);
    if (!nameResult.success) {
      setError(nameResult.error.issues[0]?.message ?? 'Invalid name');
      return;
    }
    const colorResult = colorSchema.safeParse(draft.color);
    if (!colorResult.success) {
      setError(colorResult.error.issues[0]?.message ?? 'Invalid hex color format');
      return;
    }
    const name = nameResult.data;
    const color = colorResult.data;
    if (draft.mode === 'create') {
      await createProject(name, color);
    } else if (draft.id !== null) {
      const existing = projects.find((p) => p.id === draft.id);
      if (existing) {
        await updateProject({ ...existing, name, color });
      }
    }
    closeDraft();
  };

  const handleSelect = (projectId: string | null) => {
    onSelect(projectId);
    if (drawer && onClose) {
      onClose();
    }
  };

  return (
    <nav
      className={styles.sidebar}
      aria-label="Projects"
      data-drawer-open={drawer || undefined}
    >
      <div className={styles.header}>
        <h2 className={styles.heading}>Projects</h2>
        {drawer && (
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close projects"
          >
            ×
          </button>
        )}
        <button
          type="button"
          className={styles.newButton}
          onClick={openCreate}
          aria-label="New project"
        >
          +
        </button>
      </div>

      <ul className={styles.list}>
        <li>
          <button
            type="button"
            className={styles.projectRow}
            aria-current={selectedProjectId === ALL_PROJECTS ? 'true' : undefined}
            data-selected={selectedProjectId === ALL_PROJECTS || undefined}
            onClick={() => handleSelect(ALL_PROJECTS)}
          >
            <span className={styles.allDot} aria-hidden="true" />
            <span className={styles.projectName}>All projects</span>
          </button>
        </li>

        {sorted.map((project) => (
          <li key={project.id} className={styles.projectItem}>
            <button
              type="button"
              className={styles.projectRow}
              aria-current={selectedProjectId === project.id ? 'true' : undefined}
              data-selected={selectedProjectId === project.id || undefined}
              onClick={() => handleSelect(project.id)}
            >
              <span
                className={styles.dot}
                style={{ backgroundColor: project.color }}
                aria-hidden="true"
              />
              <span className={styles.projectName}>{project.name}</span>
            </button>
            <span className={styles.rowActions}>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Edit ${project.name}`}
                onClick={() => openEdit(project)}
              >
                Edit
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label={`Delete ${project.name}`}
                onClick={() => setDeleting(project)}
              >
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>

      {draft && (
        <ConfirmDialog
          title={draft.mode === 'create' ? 'New project' : 'Edit project'}
          confirmLabel={draft.mode === 'create' ? 'Create' : 'Save'}
          onConfirm={() => void submitDraft()}
          onCancel={closeDraft}
        >
          <label className={styles.field}>
            <span>Name</span>
            <input
              type="text"
              value={draft.name}
              autoComplete="off"
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              aria-label="Project name"
            />
          </label>
          <label className={styles.field}>
            <span>Color (#rrggbb)</span>
            <span className={styles.colorInputs}>
              <input
                type="color"
                value={colorSchema.safeParse(draft.color).success ? draft.color : DEFAULT_COLOR}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                aria-label="Project color picker"
              />
              <input
                type="text"
                value={draft.color}
                onChange={(e) => setDraft({ ...draft, color: e.target.value })}
                aria-label="Project color hex"
                placeholder="#22d3ee"
              />
            </span>
          </label>
          {error !== null && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
        </ConfirmDialog>
      )}

      {deleting && (
        <DeleteProjectDialog
          project={deleting}
          projects={sorted.filter((p) => p.id !== deleting.id)}
          onCancel={() => setDeleting(null)}
          onConfirm={async (options) => {
            await deleteProject(deleting.id, options);
            if (selectedProjectId === deleting.id) {
              handleSelect(ALL_PROJECTS);
            }
            setDeleting(null);
          }}
        />
      )}
    </nav>
  );
}

type DeleteMode = 'cascade' | 'reassign';

function DeleteProjectDialog({
  project,
  projects,
  onCancel,
  onConfirm,
}: {
  project: Project;
  projects: Project[];
  onCancel: () => void;
  onConfirm: (options: {
    mode: DeleteMode;
    reassignTo?: string | null;
  }) => Promise<void>;
}) {
  const [mode, setMode] = useState<DeleteMode>('reassign');
  // Empty string represents "No project" (null); otherwise a project id.
  const [reassignTo, setReassignTo] = useState<string>('');

  return (
    <ConfirmDialog
      title={`Delete "${project.name}"?`}
      confirmLabel={mode === 'cascade' ? 'Delete everything' : 'Reassign & delete'}
      destructive
      onConfirm={() =>
        void onConfirm(
          mode === 'cascade'
            ? { mode: 'cascade' }
            : { mode: 'reassign', reassignTo: reassignTo === '' ? null : reassignTo },
        )
      }
      onCancel={onCancel}
    >
      <fieldset className={styles.fieldset}>
        <legend>What should happen to its todos?</legend>
        <label className={styles.radioRow}>
          <input
            type="radio"
            name="delete-mode"
            checked={mode === 'reassign'}
            onChange={() => setMode('reassign')}
          />
          <span>Move todos to another project</span>
        </label>
        {mode === 'reassign' && (
          <label className={styles.field}>
            <span>Reassign to</span>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              aria-label="Reassign todos to"
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={styles.radioRow}>
          <input
            type="radio"
            name="delete-mode"
            checked={mode === 'cascade'}
            onChange={() => setMode('cascade')}
          />
          <span>Delete todos and their sub-steps</span>
        </label>
      </fieldset>
    </ConfirmDialog>
  );
}
