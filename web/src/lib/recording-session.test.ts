import { describe, expect, it } from 'vitest'
import { elapsedDuration } from './recording-session'

describe('elapsedDuration', () => {
  it('excludes paused time from a resumed recording', () => {
    expect(elapsedDuration({ accumulatedMs: 1_500, startedAtMs: 10_000 }, 12_250)).toBe(3_750)
    expect(elapsedDuration({ accumulatedMs: 3_750, startedAtMs: null }, 20_000)).toBe(3_750)
  })
})
