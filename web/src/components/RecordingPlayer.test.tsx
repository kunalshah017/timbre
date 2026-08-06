import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Recording } from '../api/recordings'
import { RecordingPlayer } from './RecordingPlayer'

const recording: Recording = {
  id: 1,
  title: 'Morning notes',
  mime_type: 'audio/webm',
  size_bytes: 1_024,
  duration_ms: 1_500,
  created_at: '2026-08-07T00:00:00Z',
  audio_url: '/api/recordings/1/audio',
}

afterEach(() => vi.unstubAllGlobals())

describe('RecordingPlayer', () => {
  it('saves an inline title edit when the title loses focus', async () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    const onRename = vi.fn().mockResolvedValue(undefined)

    render(<RecordingPlayer recording={recording} onRename={onRename} onDelete={vi.fn()} />)

    const title = screen.getByRole('textbox', { name: 'Recording name' })
    expect(title).toHaveAttribute('contenteditable', 'true')

    title.textContent = 'Weekly standup'
    fireEvent.blur(title)

    await waitFor(() => expect(onRename).toHaveBeenCalledWith(recording, 'Weekly standup'))
  })
})
