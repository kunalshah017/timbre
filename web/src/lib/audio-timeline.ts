export function timelineAmplitude(samples: Uint8Array) {
  if (samples.length === 0) return 0

  let squaredTotal = 0
  let peak = 0
  for (const sample of samples) {
    const value = Math.abs((sample - 128) / 128)
    squaredTotal += value ** 2
    peak = Math.max(peak, value)
  }

  const rms = Math.sqrt(squaredTotal / samples.length)
  const noiseFloor = .012
  const sustained = Math.max(0, (rms - noiseFloor) / .16)
  const transient = Math.max(0, (peak - noiseFloor) / .72)
  return Math.min(1, Math.pow(Math.max(sustained, transient * .55), .7))
}

export function scaleTimelineAmplitudes(values: number[]) {
  if (values.length === 0) return []

  const floor = Math.min(...values)
  const range = Math.max(.001, Math.max(...values) - floor)
  return values.map((value) => Math.max(.06, Math.min(1, (value - floor) / range)))
}
