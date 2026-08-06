# Timbre Part 1: Recording Library Design

## Goal

Replace the scaffold demo with a focused voice-recording application that records microphone audio in the browser, persists recordings, and lets users browse, play, rename, and delete them.

## Scope

Part 1 includes recording, upload, durable local persistence, listing, playback, renaming, and deletion. It does not include authentication, sharing, audio effects, waveform rendering, background processing, transcription, or multiplayer sessions.

## User experience

The application has two browser routes:

- **Record** is the default page. It requests microphone access only after the user presses Record, displays recording state and elapsed time, enforces a 10-minute client-side limit, and uploads the completed file when the user saves it.
- **Library** lists recordings newest first. Each item shows its generated title, duration, MIME type, size, and creation time; it plays with the browser's native audio controls, supports inline rename, and can be deleted after confirmation.

On save, the server generates a title from the creation timestamp. Rename is optional and updates only the title.

## Browser recording boundary

React uses the browser-native `MediaRecorder` and `getUserMedia` APIs. It chooses a supported format from `audio/webm` and `audio/mp4`, records chunks in memory for one session, then submits a single `multipart/form-data` request. The client rejects recordings longer than ten minutes and files over 50 MB before upload; the server repeats MIME type and size validation because browser checks are not a security boundary.

The browser plays recordings through the native `<audio>` element. No audio transformation is part of Part 1. The existing Rust/WASM seam remains in the repository for Part 2 but is not loaded by the recorder UI.

## API contract

All endpoints are JSON except the audio-file response and multipart upload.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/recordings` | List recording metadata, newest first. |
| `POST` | `/api/recordings` | Accept a multipart `audio` field and create a recording. |
| `GET` | `/api/recordings/:id` | Return one recording's metadata. |
| `GET` | `/api/recordings/:id/audio` | Stream the stored file with its recorded content type. |
| `PATCH` | `/api/recordings/:id` | Rename a recording with `{ "title": "..." }`. |
| `DELETE` | `/api/recordings/:id` | Remove the stored file and metadata. |

Responses use a stable public recording shape: `id`, `title`, `mime_type`, `size_bytes`, `duration_ms`, `created_at`, and `audio_url`. Storage-specific paths never leave the API.

## Persistence and storage

SQLite stores recording metadata in a `recordings` table. Each row has an integer primary key, a required title, MIME type, extension, byte size, duration in milliseconds, a unique storage key, and UTC timestamps.

Audio is stored as a file under a configured root directory. The development default is `api/.tmp/uploads`; deployment sets the root with `RECORDINGS_STORAGE_PATH`. File names are generated server-side from a random storage key and an allow-listed extension, never from the client filename.

`Timbre.Recordings.Storage` owns the file-store operations: `put`, `open`, and `delete`. Part 1 has one local implementation. The recordings context depends on this focused module rather than an Azure SDK, so a future Azure Blob implementation changes storage code and configuration without changing routes, database records, or React components.

Deletion attempts file removal before deleting the database row. If file deletion fails, the request fails and retains the row. If database deletion fails after successful file removal, the API reports an internal error; this rare mismatch is recoverable with a future orphan-file maintenance task. This is preferable to retaining an API record for unavailable audio.

## Deployment evolution

Local development uses SQLite and the local storage directory. A small, single-instance Azure App Service demo can mount persistent storage and point both paths at it, but SQLite must not be used across multiple instances or on a network storage mount. Production deployment moves metadata to Postgres and supplies an Azure Blob-backed storage implementation. These are configuration and adapter changes, not API or UI rewrites.

## Cleanup

Remove the scaffold assignment markdown page, WASM/API status dots, `HelloController`, and `/api/hello`. Keep the existing Phoenix health and readiness endpoints, Nix environment, Rust crate, and shared styling foundation. Replace the default page with the new app shell and two client-side routes.

## Error handling and accessibility

The UI clearly distinguishes microphone denial, unsupported recording, recording-limit reached, upload failure, empty library, rename failure, and deletion failure. Buttons expose their state with text, use native semantic controls, keep keyboard focus visible, and do not rely on color alone. API validation returns structured JSON errors and never exposes filesystem paths.

## Testing

Elixir tests cover recording validation, file-store behavior using a test directory, context operations, API success/error responses, rename, deletion, and audio streaming. React tests cover recorder state transitions and Library actions with mocked API and media APIs. Existing Rust tests remain unchanged. The full suite is run in the Nix environment with `just test`, `just check`, and `just build`.
