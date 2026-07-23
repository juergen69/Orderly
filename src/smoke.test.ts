import { describe, it, expect } from 'vitest'
import { first } from './domain/ordering'

describe('smoke', () => {
  it('ordering module exports first()', () => {
    expect(first()).toBe('m')
  })
})
