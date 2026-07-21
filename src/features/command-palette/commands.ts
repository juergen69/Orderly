import { getActiveStore } from '../../store/storeInstance';
import type { ActiveView } from '../../store/uiState';

export interface Command {
  id: string;
  title: string;
  hint?: string;
  keywords: string;
  run: () => void;
}

export function fuzzyScore(query: string, text: string): number | null {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (q.length === 0) return 0;

  let ti = 0;
  let score = 0;
  let streak = 0;
  let firstMatch = -1;

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi]!;
    let found = -1;
    for (let i = ti; i < t.length; i++) {
      if (t[i] === ch) {
        found = i;
        break;
      }
    }
    if (found === -1) return null;
    if (firstMatch === -1) firstMatch = found;
    if (found === ti) {
      streak += 1;
      score += 3 + streak;
    } else {
      streak = 0;
      score += 1;
    }
    ti = found + 1;
  }

  score -= firstMatch * 0.1;
  score -= Math.max(0, t.length - q.length) * 0.05;
  return score;
}

function focusByLabel(label: string): void {
  const el = document.querySelector<HTMLElement>(`[aria-label="${label}"]`);
  el?.focus();
}

export function buildCommands(store = getActiveStore()): Command[] {
  const state = store.getState();
  const commands: Command[] = [];

  commands.push({
    id: 'new-todo',
    title: 'New todo',
    hint: 'Create',
    keywords: 'new todo add create',
    run: () => {
      void store.getState().createTodo({ projectId: state.ui.selectedProjectId, title: 'New todo' });
    },
  });

  for (const view of ['board', 'calendar'] as ActiveView[]) {
    commands.push({
      id: `view-${view}`,
      title: `Go to ${view === 'calendar' ? 'Calendar' : 'Board'}`,
      hint: 'View',
      keywords: `switch view go ${view}`,
      run: () => store.getState().setActiveView(view),
    });
  }

  commands.push({
    id: 'focus-search',
    title: 'Focus search',
    hint: 'Search',
    keywords: 'focus search find filter',
    run: () => {
      focusByLabel('Search todos');
    },
  });

  for (const project of state.projects) {
    commands.push({
      id: `project-${project.id}`,
      title: `Go to project: ${project.name}`,
      hint: 'Project',
      keywords: `jump go project ${project.name}`,
      run: () => store.getState().setSelectedProjectId(project.id),
    });
  }

  commands.push({
    id: 'project-none',
    title: 'Show all projects',
    hint: 'Project',
    keywords: 'jump go project all none clear',
    run: () => store.getState().setSelectedProjectId(null),
  });

  return commands;
}
