# Recording Studio Redesign

## Purpose

Replace Timbre's separate Record and Library screens with a Voice Memos-style
workspace. Recordings live in the left sidebar; the right side is a full-height
capture or selected-recording editor. The experience should borrow the
operational clarity of macOS Voice Memos and retain the calm, dark studio
language established for Timbre. This is an interaction and presentation
change; the existing Phoenix recording API and local storage model remain the
source of truth.

## User flow

1. The user opens the recording workspace. The left sidebar contains **Record**
   and saved recordings; the right pane opens in ready-to-record mode.
2. On **Start recording**, the browser requests microphone access. After access
   succeeds, Timbre starts `MediaRecorder` and expands the recorder into the
   active studio surface.
3. The active surface continuously draws a scrolling timeline of vertical audio
   bars from an `AnalyserNode` connected to the captured media stream. A timer
   and input selector remain visible beside the ready state.
4. The user can **Pause**, **Resume**, **Cancel and discard**, or **Done**.
   Pause stops the recorder clock and visual update without finalizing the
   capture. Resume continues the same `MediaRecorder` capture. Cancel discards
   the unsaved chunks after a confirmation. Done stops capture and immediately
   uploads the recording.
5. A successful upload returns the interface to its ready state and prepends the
   auto-named recording to the sidebar. Failures preserve an actionable error
   and do not falsely imply that audio was saved.
6. Selecting a saved sidebar recording opens a full-height playback editor in
   the right pane. It never autoplays. The user presses an icon-only Play
   control to start playback; the same editor provides previous/next 15-second
   seek, timeline scrubbing, rename, and delete controls.

## Controls and constraints

- **Microphone input**: a selector is populated only after permission has been
  granted. Selecting another microphone is allowed while idle; during a capture
  it is disabled, so a single recording cannot silently switch sources.
- **Live level**: this is a read-only monitoring meter derived from Web Audio;
  it does not promise gain adjustment that the browser cannot reliably apply to
  hardware capture.
- **Format and recording limit**: still selected and enforced internally, but
  not displayed in the capture UI. The client automatically ends and saves at
  ten minutes; the API remains the authoritative validator.
- **Cancel**: is explicitly destructive for the unsaved recording and requires
  confirmation. Deleting a saved recording retains its existing confirmation.
- Trimming, transcription, effects, and re-recording a selection are deferred
  to future assignment parts; the visualizer and component boundaries should
  not preclude them.

## Layout

```
┌──────────── sidebar ────────────┬──────────── right editor ───────────┐
│ timbre              [collapse] │  RECORDING                          │
│ [Record]                        │  [Ready · Input selector]          │
│                                  │                                    │
│ RECORDINGS                       │  live vertical-bar audio timeline  │
│ ● Recording 10:43                │                                    │
│   Meeting notes                  │  [record circle] / [pause][done]   │
│   Voice note                     │                                    │
│                                  │                                    │
│                                  │  SELECTED RECORDING                 │
│                                  │  decoded audio timeline             │
│                                  │  [rewind] [play] [forward] […]      │
└──────────────────────────────────┴────────────────────────────────────┘
```

The sidebar collapses to an accessible icon rail on desktop and becomes a
mobile menu trigger below the existing small-screen breakpoint. It contains no
separate library/recording buttons beyond the Record entry and the recording
list. On narrow screens, selection still swaps the single main editor.

## Component boundaries

- `App`: owns recording data, selected recording/editor state, and persisted
  sidebar preference.
- `RecordingStudio`: owns capture lifecycle and surfaces state changes to App.
- `AudioTimeline`: owns the Web Audio analyser and canvas animation lifecycle.
  It draws real vertical audio bars for a live `MediaStream` or a decoded saved
  recording; it never saves audio.
- `MicrophoneSelect`: enumerates available audio inputs after permission and
  reports an idle-only selection to `RecordingStudio`.
- `RecordingSidebar`: selects recordings and exposes their timestamp/title.
- `RecordingPlayer`: owns icon-only playback transport, scrubber, rename, and
  deletion for the selected saved recording.

## Visual system

- **Canvas** `#121212`, **raised surface** `#1d1d1f`, **edge** `#303034`,
  **utility text** `#929299`, **signal blue** `#79aefe`, and **record red**
  `#ee6470`.
- Typography stays compact and practical: a system sans for content, tabular
  numerals for time and decibels, and a large semibold time readout only while
  recording.
- The vertical-bar audio timeline is the signature element. Its live motion and
  saved shape represent actual audio rather than decoration. With reduced
  motion, live bars update at a lower frequency without transitions.
- The rest of the UI remains intentionally quiet: small radii, little shadow,
  labels that state the actual action, and no speculative effects controls.

## Verification

- Unit-test capture-state transitions, especially pause/resume duration
  accounting and cancellation without upload.
- Keep the existing Phoenix upload/playback integration test and limits tests.
- Manually validate browser microphone permission, live visualizer updates,
  pause/resume, cancel, save, microphone selection, keyboard focus, reduced
  motion, and narrow-screen layout.
- Run `just test`, `just check`, and `just build` before handoff.
