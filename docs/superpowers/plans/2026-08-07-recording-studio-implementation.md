# Recording Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page, retractable recording studio with genuine live microphone visualization, pause/resume, immediate save, discard, and inline recording library.

**Architecture:** The React app owns recordings and the persisted sidebar preference. A new `RecordingStudio` encapsulates MediaRecorder state and reports one finalized Blob to App. A canvas `LiveVisualizer` observes the same MediaStream through Web Audio but neither transforms nor saves it; this isolates the future DSP seam from Part 1 capture.

**Tech Stack:** React 19, TypeScript, Browser MediaRecorder and Web Audio APIs, Canvas 2D, Lucide React, Vitest + Testing Library, Phoenix JSON API.

---

## File Structure

- Create: `web/src/lib/recording-session.ts` — pure elapsed-time calculation and capture-state helpers.
- Create: `web/src/lib/recording-session.test.ts` — unit tests for elapsed duration across pause and resume.
- Create: `web/src/components/LiveVisualizer.tsx` — lifecycle-safe analyser canvas.
- Create: `web/src/components/LiveVisualizer.test.tsx` — visualizer accessibility contract.
- Create: `web/src/components/RecordingStudio.tsx` — microphone selection, recording controls, capture lifecycle, and status surface.
- Create: `web/src/components/RecordingStudio.test.tsx` — recorder controls with mocked media APIs.
- Create: `web/src/App.test.tsx` — single-workspace and sidebar control test.
- Modify: `web/src/App.tsx` — single-page layout, inline library, sidebar preference, and upload callback.
- Modify: `web/src/components/RecordingList.tsx` — inline section heading mode and compact list treatment.
- Modify: `web/src/index.css` — studio, visualizer, collapsible rail, and responsive layout styles.
- Modify: `web/package.json`, `web/package-lock.json` — add test runner and test command.
- Modify: `README.md` — explain pause/resume, cancel, live monitor, and inline library.

### Task 1: Add a frontend test foundation and capture-time helper

**Files:**
- Create: `web/src/lib/recording-session.ts`
- Create: `web/src/lib/recording-session.test.ts`
- Modify: `web/package.json`
- Modify: `web/tsconfig.json`

- [ ] **Step 1: Write the failing elapsed-time test**

```ts
import { describe, expect, it } from 'vitest'
import { elapsedDuration } from './recording-session'

describe('elapsedDuration', () => {
  it('excludes paused time from a resumed recording', () => {
    expect(elapsedDuration({ accumulatedMs: 1_500, startedAtMs: 10_000 }, 12_250)).toBe(3_750)
    expect(elapsedDuration({ accumulatedMs: 3_750, startedAtMs: null }, 20_000)).toBe(3_750)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- recording-session.test.ts`

Expected: FAIL because the test script and `recording-session` module do not exist.

- [ ] **Step 3: Install test dependencies and implement the helper**

```ts
export type RecordingClock = { accumulatedMs: number; startedAtMs: number | null }

export function elapsedDuration(clock: RecordingClock, nowMs: number) {
  return clock.startedAtMs === null
    ? clock.accumulatedMs
    : clock.accumulatedMs + Math.max(0, nowMs - clock.startedAtMs)
}
```

Add `"test": "vitest run"` to `web/package.json`, install `vitest`,
`jsdom`, `@testing-library/react`, and `@testing-library/jest-dom` as dev
dependencies, and include `"vitest/globals"` in the test TypeScript types.

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd web && npm test -- recording-session.test.ts`

Expected: one passing test.

### Task 2: Build the analyser-backed visualizer

**Files:**
- Create: `web/src/components/LiveVisualizer.tsx`
- Modify: `web/src/index.css`

- [ ] **Step 1: Add a component test for the visualizer contract**

```tsx
render(<LiveVisualizer stream={null} active={false} />)
expect(screen.getByLabelText('Live microphone waveform')).toBeInTheDocument()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd web && npm test -- LiveVisualizer.test.tsx`

Expected: FAIL because `LiveVisualizer` does not exist.

- [ ] **Step 3: Implement `LiveVisualizer`**

Create a labelled canvas wrapper. When given a stream, create an
`AudioContext`, `MediaStreamAudioSourceNode`, and `AnalyserNode` with
`fftSize = 256`. Draw a history waveform via `requestAnimationFrame` while
`active` is true, report normalized RMS level through `onLevelChange`, and
cancel animation, disconnect nodes, and close the context on stream change or
unmount. Draw a restrained static baseline when no stream is active. Respect
`prefers-reduced-motion` by rendering at a lower frame cadence.

- [ ] **Step 4: Run the visualizer test**

Run: `cd web && npm test -- LiveVisualizer.test.tsx`

Expected: one passing test.

### Task 3: Implement recording session controls

**Files:**
- Create: `web/src/components/RecordingStudio.tsx`
- Create: `web/src/components/RecordingStudio.test.tsx`
- Modify: `web/src/index.css`

- [ ] **Step 1: Write failing control-state tests**

```tsx
it('pauses then resumes an active recorder', async () => {
  render(<RecordingStudio onCaptured={vi.fn()} />)
  await user.click(screen.getByRole('button', { name: 'Start recording' }))
  expect(mockRecorder.pause).toHaveBeenCalledTimes(0)
  await user.click(screen.getByRole('button', { name: 'Pause' }))
  expect(mockRecorder.pause).toHaveBeenCalledTimes(1)
  await user.click(screen.getByRole('button', { name: 'Resume' }))
  expect(mockRecorder.resume).toHaveBeenCalledTimes(1)
})
```

Mock `navigator.mediaDevices.getUserMedia`, `enumerateDevices`, `MediaRecorder`,
and `AudioContext`; keep the test focused on the component's public controls.

- [ ] **Step 2: Run the recorder test to verify it fails**

Run: `cd web && npm test -- RecordingStudio.test.tsx`

Expected: FAIL because `RecordingStudio` does not exist.

- [ ] **Step 3: Implement `RecordingStudio`**

Use the existing MIME-selection and upload callback behavior, but replace
`Recorder`. Maintain states `idle | recording | paused | saving | error` and
the `RecordingClock` helper. Start capture with the selected `deviceId` when
available. Once permission resolves, call `enumerateDevices` and show friendly
input names. Pause calls `MediaRecorder.pause()` and freezes the clock; resume
calls `MediaRecorder.resume()` and starts a new clock segment. Done calls
`stop()` and uploads the assembled Blob. Cancel asks for confirmation, stops
tracks, clears chunks, and returns to idle without calling `onCaptured`.

Render only real controls: source selector while idle, visible format, live
level percentage, time, waveform, Pause/Resume, Cancel, and Done. Disable
source selection during a capture. Stop automatically at ten minutes.

- [ ] **Step 4: Run the recorder tests to verify they pass**

Run: `cd web && npm test -- RecordingStudio.test.tsx`

Expected: all control-state tests pass.

### Implemented follow-up: Discover inputs before recording

- [x] Enumerate `audioinput` devices when `RecordingStudio` mounts, before a recording begins.
- [x] Refresh the picker when browser hardware changes and retain the selected device while it remains available.
- [x] Cover the mount-time discovery behavior in `web/src/components/RecordingStudio.test.tsx`.

### Follow-up: Improve recording navigation and timeline readability

- [x] Add deliberate vertical spacing between saved recording rows in the sidebar.
- [x] Reduce the player title scale and enlarge the rename and delete hit areas.
- [x] Add tested audio-level shaping for both live and saved timeline bars, preserving meaningful quiet-to-loud variation.

### Follow-up: Inline recording title editing

- [x] Replace the separate rename action with a title that is directly editable in place and saves when focus leaves it.

### Follow-up: Local-time automatic recording names

- [x] Generate browser-created recording names in the user's resolved local time zone, while retaining UTC database timestamps.
- [x] Allow the recordings API to accept an optional client-generated title and preserve its server-side fallback for other clients.

### Follow-up: Completion and discard transitions

- [x] Open and select a newly saved recording as soon as the recording upload succeeds.
- [x] Clear the live timeline immediately when the user discards an in-progress recording.

### Task 4: Compose one recording workspace and retractable navigation

**Files:**
- Modify: `web/src/App.tsx`
- Modify: `web/src/components/RecordingList.tsx`
- Modify: `web/src/index.css`

- [ ] **Step 1: Add a failing app-layout test**

```tsx
render(<App />)
expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
expect(screen.getByRole('heading', { name: 'Recent recordings' })).toBeInTheDocument()
```

- [ ] **Step 2: Run the layout test to verify it fails**

Run: `cd web && npm test -- App.test.tsx`

Expected: FAIL because the current app has separate Record and Library views.

- [ ] **Step 3: Implement the composed workspace**

Remove page switching. Render `RecordingStudio` above a `Recent recordings`
section on the same canvas. Maintain the existing list, playback, rename, and
delete behavior. Add `sidebarCollapsed` state initialized from localStorage and
persist changes under `timbre.sidebar.collapsed`. The collapse button uses an
accessible name that changes between `Collapse sidebar` and `Expand sidebar`.
When collapsed, keep icon controls available and visually hide only labels.

- [ ] **Step 4: Run the layout test to verify it passes**

Run: `cd web && npm test -- App.test.tsx`

Expected: one passing layout test.

### Task 5: Finish styling, documentation, and verification

**Files:**
- Modify: `web/src/index.css`
- Modify: `README.md`

- [ ] **Step 1: Apply the recording-studio visual system**

Implement the six design tokens in the spec. Make the live canvas the dominant
active-state element; keep the library quiet below it. Add visual state changes
for recording, paused, saving, error, focus-visible controls, reduced motion,
collapsed desktop rail, and the small-screen stacked layout.

- [ ] **Step 2: Update README behavior notes**

Document that recordings can pause/resume, Done saves immediately, Cancel
discards unsaved capture, and the waveform is input monitoring only.

- [ ] **Step 3: Run all frontend tests and repository checks**

Run: `nix develop --impure --command sh -c 'cd web && npm test && npm run typecheck'`

Expected: all frontend tests and type checking pass.

Run: `nix develop --impure --command sh -c 'just test && just check && just build'`

Expected: Rust tests, Phoenix tests, client checks, and production builds pass.

- [ ] **Step 4: Manually verify the local browser experience**

Run `nix develop --impure --command just dev`, open `http://localhost:5173`,
and verify: sidebar collapse/expand; microphone permission; waveform and level
updates; pause/resume timer; cancel; Done/save; new row in recent recordings;
playback; and a narrow viewport.
