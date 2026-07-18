import { createStore, type StoreState } from './store';
import { IndexedDbRepository } from '../storage/IndexedDbRepository';

export const store: ReturnType<typeof createStore> = createStore({
  repository: new IndexedDbRepository(),
});

export type AppStore = StoreState;
