export type RecordingClock = { accumulatedMs: number; startedAtMs: number | null }

export function elapsedDuration(clock: RecordingClock, nowMs: number) {
  return clock.startedAtMs === null
    ? clock.accumulatedMs
    : clock.accumulatedMs + Math.max(0, nowMs - clock.startedAtMs)
}
