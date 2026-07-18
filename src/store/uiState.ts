import type { FocusArea, FocusSlot } from '../domain/types';

export type ActiveView = 'board' | 'calendar' | 'focus';

const STORAGE_KEY = 'orderly.uiState';
const SCHEMA_VERSION = 1;

const FOCUS_AREA_COUNT = 3;
const FOCUS_SLOT_COUNT = 9;

export interface UiState {
  activeView: ActiveView;
  showAllRecurring: boolean;
  focusSlots: FocusSlot[];
  focusAreas: FocusArea[];
  /** Transient header-search query (not persisted). */
  searchQuery: string;
  /** Transient tag-filter selection (not persisted). */
  selectedTags: string[];
  /** Transient sidebar project selection (not persisted). */
  selectedProjectId: string | null;
}

function defaultFocusSlots(): FocusSlot[] {
  return Array.from({ length: FOCUS_SLOT_COUNT }, (_, index) => ({
    index,
    todoId: null,
  }));
}

function defaultFocusAreas(): FocusArea[] {
  return Array.from({ length: FOCUS_AREA_COUNT }, (_, index) => ({
    index,
    text: '',
  }));
}

export function defaultUiState(): UiState {
  return {
    activeView: 'board',
    showAllRecurring: false,
    focusSlots: defaultFocusSlots(),
    focusAreas: defaultFocusAreas(),
    searchQuery: '',
    selectedTags: [],
    selectedProjectId: null,
  };
}

function clampIndex(value: unknown, max: number): number {
  const n = typeof value === 'number' && Number.isInteger(value) ? value : -1;
  return n >= 0 && n < max ? n : -1;
}

function sanitizeFocusSlots(raw: unknown): FocusSlot[] {
  const base = defaultFocusSlots();
  if (!Array.isArray(raw)) {
    return base;
  }
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const index = clampIndex(record['index'], FOCUS_SLOT_COUNT);
    if (index === -1) continue;
    const todoId = record['todoId'];
    base[index] = {
      index,
      todoId: typeof todoId === 'string' ? todoId : null,
    };
  }
  return base;
}

function sanitizeFocusAreas(raw: unknown): FocusArea[] {
  const base = defaultFocusAreas();
  if (!Array.isArray(raw)) {
    return base;
  }
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const record = entry as Record<string, unknown>;
    const index = clampIndex(record['index'], FOCUS_AREA_COUNT);
    if (index === -1) continue;
    const text = record['text'];
    base[index] = {
      index,
      text: typeof text === 'string' ? text : '',
    };
  }
  return base;
}

function sanitizeView(raw: unknown): ActiveView {
  return raw === 'calendar' ? 'calendar' : raw === 'focus' ? 'focus' : 'board';
}

export function loadUiState(): UiState {
  try {
    if (typeof localStorage === 'undefined') {
      return defaultUiState();
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return defaultUiState();
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed['schemaVersion'] !== SCHEMA_VERSION) {
      return defaultUiState();
    }
    return {
      activeView: sanitizeView(parsed['activeView']),
      showAllRecurring:
        typeof parsed['showAllRecurring'] === 'boolean'
          ? parsed['showAllRecurring']
          : false,
      focusSlots: sanitizeFocusSlots(parsed['focusSlots']),
      focusAreas: sanitizeFocusAreas(parsed['focusAreas']),
      searchQuery: '',
      selectedTags: [],
      selectedProjectId: null,
    };
  } catch {
    return defaultUiState();
  }
}

export function saveUiState(state: UiState): void {
  try {
    if (typeof localStorage === 'undefined') {
      return;
    }
    const payload = {
      schemaVersion: SCHEMA_VERSION,
      activeView: state.activeView,
      showAllRecurring: state.showAllRecurring,
      focusSlots: state.focusSlots,
      focusAreas: state.focusAreas,
    };
    // searchQuery and selectedTags are transient (session-only) and excluded
    // from persistence.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota exceeded: ignore, keep in-memory state only
  }
}

export function reconcileFocusSlots(slots: FocusSlot[], validTodoIds: Set<string>): FocusSlot[] {
  return slots.map((slot) => {
    if (slot.todoId !== null && !validTodoIds.has(slot.todoId)) {
      return { index: slot.index, todoId: null };
    }
    return slot;
  });
}
