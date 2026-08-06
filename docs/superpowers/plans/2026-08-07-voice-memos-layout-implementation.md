# Voice Memos Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Timbre into a full-height record/playback editor with saved recordings in a retractable sidebar.

**Architecture:** `App` selects either the capture editor or one saved recording. `AudioTimeline` renders analyser-derived bars for live capture and decoded waveform bars for saved audio. `RecordingPlayer` owns a hidden native audio element plus icon-only accessible transport.

**Tech Stack:** React, TypeScript, Web Audio API, Canvas 2D, native HTML audio, Lucide React, Vitest.

---

### Task 1: Test and implement selected-editor state

**Files:**
- Modify: `web/src/App.test.tsx`
- Modify: `web/src/App.tsx`

- [ ] Write a failing test that fetches one recording, clicks its sidebar label, and expects the selected recording heading plus a Play button.
- [ ] Run `cd web && npm test -- App.test.tsx` and verify the current inline-library layout fails.
- [ ] Replace scroll-based record/library navigation with `editor: 'record' | Recording`. Keep a single `Record` button and place recording rows in the sidebar. Clicking a row selects it without playing; clicking Record returns to capture mode.
- [ ] Re-run `cd web && npm test -- App.test.tsx` and verify it passes.

### Task 2: Render actual bar timelines

**Files:**
- Modify: `web/src/components/LiveVisualizer.tsx`
- Modify: `web/src/components/LiveVisualizer.test.tsx`
- Create: `web/src/components/RecordingPlayer.tsx`
- Create: `web/src/components/RecordingPlayer.test.tsx`

- [ ] Write a failing test for an `AudioTimeline` label and a playback timeline rendered from an `audioUrl`.
- [ ] Run the test and verify it fails before the new component API exists.
- [ ] Rename the live visualizer concept to `AudioTimeline`; maintain a rolling history of measured analyser RMS values and draw vertical bars. For a saved `audioUrl`, fetch and decode the ArrayBuffer in an `AudioContext`, reduce channel samples into bar amplitudes, and draw the resulting bars. If decoding is unavailable, show a neutral baseline without inventing audio data.
- [ ] Implement `RecordingPlayer` around `<audio>` with icon-only Previous 15 seconds, Play/Pause, Next 15 seconds, Delete, and Rename actions. It must begin paused and use the decoded `AudioTimeline` plus a progress overlay.
- [ ] Run the component tests and verify they pass.

### Task 3: Simplify capture controls

**Files:**
- Modify: `web/src/components/RecordingStudio.tsx`
- Modify: `web/src/components/RecordingStudio.test.tsx`

- [ ] Extend the existing recorder test to assert the Start control has an accessible `Start recording` label while rendering only a red circle.
- [ ] Run `cd web && npm test -- RecordingStudio.test.tsx` and verify the current text button fails the assertion.
- [ ] Remove the Recorder heading, marketing copy, format chip, separate input box, visible duration limit, and text from transport controls. Keep the ready state and input selector in one compact control beside it. Render a red-circle Start icon; use accessible labels for Pause, Resume, Done, and Discard.
- [ ] Run the recorder tests and verify they pass.

### Task 4: Apply editor layout and verify

**Files:**
- Modify: `web/src/index.css`
- Modify: `README.md`

- [ ] Make the sidebar list scroll independently below Record, keep its collapsed icon rail behavior, and make the main editor fill the available right-side viewport.
- [ ] Remove styles for the inline recent-recordings section; create dense sidebar recording rows and large capture/playback timelines with icon-only controls.
- [ ] Update README wording to describe sidebar selection, non-autoplay playback, and actual audio bars.
- [ ] Run `nix develop --impure --command sh -c 'cd web && npm test && npm run typecheck'`.
- [ ] Run `nix develop --impure --command sh -c 'just test && just check && just build'`.
- [ ] Verify locally in a browser: collapsed sidebar, Record navigation, selected recording stays paused, playback controls, and capture UI with microphone permission granted by the user.
