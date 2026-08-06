# Recording Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scaffold demo with a browser voice recorder that saves, lists, plays, renames, and deletes recordings.

**Architecture:** React owns media capture and page state; Phoenix owns validation and the recordings API. SQLite stores metadata and a focused local storage module persists files beneath a configurable root. The public API exposes stable recording DTOs and never exposes filesystem paths.

**Tech Stack:** React 19, TypeScript, browser MediaRecorder, Vite, Elixir 1.18, Phoenix 1.8, Ecto/SQLite, Rust/WASM retained for later audio processing.

---

## File structure

| File | Responsibility |
| --- | --- |
| `api/priv/repo/migrations/*_create_recordings.exs` | `recordings` schema and indexes. |
| `api/lib/timbre/recordings/recording.ex` | Ecto schema and changesets. |
| `api/lib/timbre/recordings/storage.ex` | Local file storage boundary. |
| `api/lib/timbre/recordings.ex` | Recording lifecycle and database operations. |
| `api/lib/timbre_web/controllers/recording_controller.ex` | JSON/multipart HTTP boundary. |
| `api/lib/timbre_web/controllers/recording_json.ex` | Stable recording response shape. |
| `api/lib/timbre_web/router.ex` | Recording resource routes; removes demo route. |
| `api/test/timbre/recordings_test.exs` | Context/storage persistence tests. |
| `api/test/timbre_web/controllers/recording_controller_test.exs` | API integration tests. |
| `web/src/api/recordings.ts` | Typed HTTP client. |
| `web/src/components/Recorder.tsx` | MediaRecorder lifecycle and upload action. |
| `web/src/components/RecordingList.tsx` | Playback, rename, and delete controls. |
| `web/src/App.tsx` | App shell and Record/Library navigation. |
| `web/src/index.css` | Application-specific layout states. |

### Task 1: Remove demo-only API and make storage configurable

**Files:**
- Modify: `api/config/dev.exs`
- Modify: `api/config/test.exs`
- Modify: `api/config/runtime.exs`
- Modify: `api/lib/timbre_web/router.ex`
- Delete: `api/lib/timbre_web/controllers/hello_controller.ex`

- [ ] Add `recordings_storage_path` beside the database path:

```elixir
config :timbre, :recordings_storage_path,
  Path.expand("../.tmp/uploads", __DIR__)
```

- [ ] In test config use `Path.expand("../.tmp/test_uploads", __DIR__)`; in production read `RECORDINGS_STORAGE_PATH` with `/data/uploads` as the documented container default.
- [ ] Remove `get "/hello", HelloController, :show`; retain `/healthz` and `/readyz`.
- [ ] Run `cd api && mix format --check-formatted` and confirm the removed route is absent with `rg 'hello|HelloController' api`.
- [ ] Commit: `git commit -am "chore: remove scaffold API demo"`.

### Task 2: Define the recording model with a migration

**Files:**
- Create: `api/priv/repo/migrations/*_create_recordings.exs`
- Create: `api/lib/timbre/recordings/recording.ex`
- Create: `api/test/timbre/recordings_test.exs`

- [ ] Write the failing test for persisted recording validation:

```elixir
test "changeset requires safe recording metadata" do
  changeset = Recording.changeset(%Recording{}, %{})
  assert %{title: ["can't be blank"], mime_type: ["can't be blank"]} = errors_on(changeset)
end
```

- [ ] Run `MIX_ENV=test mix test test/timbre/recordings_test.exs` and confirm it fails because `Recording` is undefined.
- [ ] Add the migration with required fields and a unique `storage_key`:

```elixir
create table(:recordings) do
  add :title, :string, null: false
  add :mime_type, :string, null: false
  add :extension, :string, null: false
  add :size_bytes, :bigint, null: false
  add :duration_ms, :integer, null: false
  add :storage_key, :string, null: false
  timestamps(type: :utc_datetime)
end

create unique_index(:recordings, [:storage_key])
```

- [ ] Add `Timbre.Recordings.Recording` with a changeset that validates title length, allow-listed MIME/extension pairs, positive size, non-negative duration, and a non-empty storage key.
- [ ] Run the focused test and `MIX_ENV=test mix ecto.migrate`.
- [ ] Commit: `git add api && git commit -m "feat: add recording metadata model"`.

### Task 3: Build and test local audio storage

**Files:**
- Create: `api/lib/timbre/recordings/storage.ex`
- Modify: `api/test/timbre/recordings_test.exs`

- [ ] Write failing tests that create a temporary configured root, write `"audio"` with a generated `storage_key`, read it back, and delete it.
- [ ] Implement the focused storage API:

```elixir
@spec put(binary(), String.t()) :: {:ok, String.t()} | {:error, term()}
@spec read(String.t()) :: {:ok, binary()} | {:error, :not_found | term()}
@spec delete(String.t()) :: :ok | {:error, term()}
```

- [ ] Derive the path only from the configured root and the server-generated storage key; create the root with `File.mkdir_p/1`; use `File.write/2`, `File.read/1`, and `File.rm/1`.
- [ ] Run `MIX_ENV=test mix test test/timbre/recordings_test.exs` and confirm the storage tests pass.
- [ ] Commit: `git add api && git commit -m "feat: add local recording storage"`.

### Task 4: Implement the recordings context

**Files:**
- Modify: `api/lib/timbre/recordings.ex`
- Modify: `api/test/timbre/recordings_test.exs`

- [ ] Write failing context tests for `list_recordings/0`, `create_recording/1`, `rename_recording/2`, and `delete_recording/1`.
- [ ] Implement `create_recording/1` to generate a `UUID` storage key and UTC timestamp title, persist bytes through `Storage.put/2`, then insert metadata. If insertion fails, remove the newly written file.
- [ ] Implement list order as `created_at DESC`, rename through the changeset, and deletion as storage deletion before `Repo.delete/1`.
- [ ] Run the focused context test file and `mix format`.
- [ ] Commit: `git add api && git commit -m "feat: add recordings lifecycle"`.

### Task 5: Add the recording HTTP API

**Files:**
- Create: `api/lib/timbre_web/controllers/recording_controller.ex`
- Create: `api/lib/timbre_web/controllers/recording_json.ex`
- Modify: `api/lib/timbre_web/router.ex`
- Create: `api/test/timbre_web/controllers/recording_controller_test.exs`

- [ ] Write a failing API test for `POST /api/recordings` using `multipart` data and asserting `201` plus exactly the public DTO keys.
- [ ] Route the API:

```elixir
resources "/recordings", RecordingController, only: [:index, :show, :create, :update, :delete]
get "/recordings/:id/audio", RecordingController, :audio
```

- [ ] Make `create/2` accept only an `audio` upload of `audio/webm` or `audio/mp4`, reject a file over 50 MB with `413`, and return validation errors with `422`.
- [ ] Implement `index`, `show`, `update`, `delete`, and `audio`. Set `content-type`, `content-length`, and `content-disposition: inline` for streaming; return `404` if metadata or file is absent.
- [ ] Render every recording as:

```elixir
%{
  id: recording.id,
  title: recording.title,
  mime_type: recording.mime_type,
  size_bytes: recording.size_bytes,
  duration_ms: recording.duration_ms,
  created_at: recording.created_at,
  audio_url: ~p"/api/recordings/#{recording.id}/audio"
}
```

- [ ] Run `MIX_ENV=test mix test test/timbre_web/controllers/recording_controller_test.exs` then all API tests.
- [ ] Commit: `git add api && git commit -m "feat: expose recordings API"`.

### Task 6: Replace the frontend scaffold with typed API access

**Files:**
- Create: `web/src/api/recordings.ts`
- Modify: `web/src/App.tsx`
- Modify: `web/src/index.css`

- [ ] Remove assignment markdown, health dots, and WASM demo imports from `App.tsx`.
- [ ] Define the frontend DTO and a single request helper:

```ts
export type Recording = {
  id: number
  title: string
  mime_type: 'audio/webm' | 'audio/mp4'
  size_bytes: number
  duration_ms: number
  created_at: string
  audio_url: string
}
```

- [ ] Implement `listRecordings`, `createRecording`, `renameRecording`, and `deleteRecording` in this module. Non-2xx responses must throw a typed message suitable for the UI.
- [ ] Create a minimal application shell with separate Record and Library navigation, using React state rather than a routing dependency.
- [ ] Run `cd web && npm run typecheck` and confirm no demo references remain with `rg 'ReactMarkdown|rms_level|api/hello' web/src`.
- [ ] Commit: `git add web && git commit -m "feat: add recording API client"`.

### Task 7: Implement the record page

**Files:**
- Create: `web/src/components/Recorder.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/index.css`

- [ ] Implement a state machine with `idle`, `recording`, `saving`, `saved`, and `error` states. Request microphone access only from the Record button.
- [ ] Choose the first supported MIME from `audio/webm;codecs=opus`, `audio/webm`, and `audio/mp4`; give a clear unsupported-browser error if none work.
- [ ] Accumulate recorder chunks, stop automatically at 10 minutes, create a `File` with the chosen MIME, reject files over 50 MB, and call `createRecording`.
- [ ] Display elapsed time, an accessible status message, a Stop button during recording, and a link to the Library after a successful save.
- [ ] Run `npm run typecheck` and manually verify microphone denial, stop/save, and limit messaging in `just dev`.
- [ ] Commit: `git add web && git commit -m "feat: add browser audio recorder"`.

### Task 8: Implement the library page

**Files:**
- Create: `web/src/components/RecordingList.tsx`
- Modify: `web/src/App.tsx`
- Modify: `web/src/index.css`

- [ ] Fetch recordings when the Library page becomes active; show loading, empty, and retry states.
- [ ] Render each recording with a native `<audio controls preload="metadata">`, metadata, inline edit/save/cancel controls, and a Delete button.
- [ ] Confirm deletion with `window.confirm`, disable the row while a mutation is in progress, optimistically update only after success, and show an inline error if it fails.
- [ ] Ensure rename rejects blank titles client-side and lets server-side errors remain visible.
- [ ] Run `npm run typecheck` and manually verify playback, rename persistence after refresh, and deletion removes audio and list entry.
- [ ] Commit: `git add web && git commit -m "feat: add recording library"`.

### Task 9: Validate the complete flow and document local operation

**Files:**
- Modify: `README.md`
- Modify: `api/README.md`

- [ ] Replace scaffold-only startup text with recorder setup, supported formats, local storage location, 10-minute/50-MB limits, and the `RECORDINGS_STORAGE_PATH` deployment setting.
- [ ] Start `just dev`, create a short recording, confirm it appears in Library, play it, rename it, delete it, and confirm the file disappears from `api/.tmp/uploads`.
- [ ] Run fresh Nix verification:

```bash
nix develop --impure --command just test
nix develop --impure --command just check
nix develop --impure --command just build
```

- [ ] Run `git status --short` and confirm only intended source, migration, test, documentation, and ignored runtime artifacts exist.
- [ ] Commit: `git add README.md api/README.md && git commit -m "docs: document recording application"`.
