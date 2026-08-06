import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      data: [{
        id: 1,
        title: 'Project interview',
        mime_type: 'audio/webm',
        size_bytes: 1_024,
        duration_ms: 1_500,
        created_at: '2026-08-07T00:00:00Z',
        audio_url: '/api/recordings/1/audio',
      }],
    }),
  }))
})

afterEach(() => vi.unstubAllGlobals())

describe('App', () => {
  it('opens a selected sidebar recording without starting playback', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(await screen.findByRole('button', { name: /Project interview/ }))

    expect(screen.getByRole('textbox', { name: 'Recording name' })).toHaveTextContent('Project interview')
    expect(screen.getByRole('button', { name: 'Play recording' })).toBeInTheDocument()
  })
})
