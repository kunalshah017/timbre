import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recording } from './api/recordings'
import App from './App'

const savedRecording: Recording = {
  id: 2,
  title: 'New recording',
  mime_type: 'audio/webm',
  size_bytes: 1_024,
  duration_ms: 1_500,
  created_at: '2026-08-07T00:00:00Z',
  audio_url: '/api/recordings/2/audio',
}

vi.mock('./components/RecordingStudio', () => ({
  RecordingStudio: ({ onCaptured }: { onCaptured: (audio: Blob, durationMs: number) => Promise<void> }) => (
    <button onClick={() => void onCaptured(new Blob(['audio']), 1_500)}>Finish recording</button>
  ),
}))

vi.mock('./components/RecordingPlayer', () => ({
  RecordingPlayer: ({ recording }: { recording: Recording }) => <output aria-label="Selected recording">{recording.title}</output>,
}))

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((_url: string, init?: RequestInit) => Promise.resolve({
    ok: true,
    status: init?.method === 'POST' ? 201 : 200,
    json: async () => ({ data: init?.method === 'POST' ? savedRecording : [] }),
  })))
})

afterEach(() => vi.unstubAllGlobals())

describe('App capture completion', () => {
  it('opens and selects the recording immediately after it is saved', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Finish recording' }))

    expect(await screen.findByRole('status', { name: 'Selected recording' })).toHaveTextContent('New recording')
    expect(screen.getByRole('button', { name: /New recording/ })).toBeInTheDocument()
  })
})
