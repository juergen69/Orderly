import { describe } from 'vitest';
import { InMemoryRepository } from './InMemoryRepository';
import { repositoryContractTest } from './contract.test';

class FailingReplaceAllRepository extends InMemoryRepository {
  async replaceAll(): Promise<void> {
    throw new Error('simulated failure');
  }
}

describe('InMemoryRepository contract', () => {
  repositoryContractTest(
    () => new InMemoryRepository(),
    () => new FailingReplaceAllRepository(),
  );
});
