import { describe, expect, it } from 'vitest';
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

it('can be instantiated directly', () => {
  expect(new InMemoryRepository()).toBeDefined();
});
