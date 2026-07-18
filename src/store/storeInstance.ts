import { createStore, type StoreState } from './store';
import { IndexedDbRepository } from '../storage/IndexedDbRepository';

export const store: ReturnType<typeof createStore> = createStore({
  repository: new IndexedDbRepository(),
});

export type AppStore = StoreState;

// Test seam: allows tests to point the ticker hooks at a fresh, isolated
// store (e.g. backed by InMemoryRepository) so the singleton store's
// IndexedDB-backed state is never shared across tests.
let activeStore: ReturnType<typeof createStore> = store;

export function getActiveStore(): ReturnType<typeof createStore> {
  return activeStore;
}

export function setActiveStore(next: ReturnType<typeof createStore> | null): void {
  activeStore = next ?? store;
}
