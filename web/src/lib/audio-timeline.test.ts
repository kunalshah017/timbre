import { describe, expect, it } from 'vitest'
import { scaleTimelineAmplitudes, timelineAmplitude } from './audio-timeline'

describe('timelineAmplitude', () => {
  it('keeps silence at the baseline while making louder input visibly taller', () => {
    const silence = new Uint8Array(256).fill(128)
    const softInput = new Uint8Array(256).fill(132)
    const loudInput = new Uint8Array(256).fill(184)

    expect(timelineAmplitude(silence)).toBe(0)
    expect(timelineAmplitude(softInput)).toBeLessThan(timelineAmplitude(loudInput))
    expect(timelineAmplitude(loudInput)).toBeLessThanOrEqual(1)
  })
})

describe('scaleTimelineAmplitudes', () => {
  it('preserves the shape between quieter and louder saved-audio windows', () => {
    expect(scaleTimelineAmplitudes([.02, .05, .18])).toEqual([.06, .1875, 1])
  })
})
