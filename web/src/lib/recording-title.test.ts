import { describe, expect, it } from 'vitest'
import { localRecordingTitle } from './recording-title'

describe('localRecordingTitle', () => {
  it('uses the requested local time zone instead of UTC', () => {
    const title = localRecordingTitle(new Date('2026-08-07T00:00:00Z'), 'en-GB', 'Asia/Kolkata')

    expect(title).toContain('05:30')
    expect(title).not.toContain('UTC')
  })
})
