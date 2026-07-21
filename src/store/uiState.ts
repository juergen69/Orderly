export type ActiveView = 'board' | 'calendar';

const STORAGE_KEY = 'orderly.uiState';
const SCHEMA_VERSION = 1;

export interface UiState {
  activeView: ActiveView;
  showAllRecurring: boolean;
  /** Transient header-search query (not persisted). */
  searchQuery: string;
  /** Transient tag-filter selection (not persisted). */
  selectedTags: string[];
  /** Transient sidebar project selection (not persisted). */
  selectedProjectId: string | null;
  /** Transient mobile sidebar open state (not persisted). */
  sidebarOpen: boolean;
}

export function defaultUiState(): UiState {
  return {
    activeView: 'board',
    showAllRecurring: false,
    searchQuery: '',
    selectedTags: [],
    selectedProjectId: null,
    sidebarOpen: false,
  };
}

function sanitizeView(raw: unknown): ActiveView {
  return raw === 'calendar' ? 'calendar' : 'board';
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
      searchQuery: '',
      selectedTags: [],
      selectedProjectId: null,
      sidebarOpen: false,
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
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // private mode / quota exceeded: ignore, keep in-memory state only
  }
}
