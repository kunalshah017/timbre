import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecordingStudio } from './RecordingStudio'

let mockRecorder: { pause: ReturnType<typeof vi.fn>; resume: ReturnType<typeof vi.fn> }
let enumerateDevices: ReturnType<typeof vi.fn>

beforeEach(() => {
  const track = { stop: vi.fn(), label: 'Test microphone' }
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] } as unknown as MediaStream
  enumerateDevices = vi.fn().mockResolvedValue([])
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      enumerateDevices,
    },
  })

  class MockMediaRecorder extends EventTarget {
    state: RecordingState = 'inactive'
    mimeType = 'audio/webm'
    start = vi.fn(() => { this.state = 'recording' })
    pause = vi.fn(() => { this.state = 'paused' })
    resume = vi.fn(() => { this.state = 'recording' })
    stop = vi.fn(() => { this.state = 'inactive' })

    constructor(_stream: MediaStream, _options: MediaRecorderOptions) {
      super()
      mockRecorder = this
    }

    static isTypeSupported() { return true }
  }

  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
})

afterEach(() => vi.unstubAllGlobals())

describe('RecordingStudio', () => {
  it('lists available microphone inputs before recording starts', async () => {
    enumerateDevices.mockResolvedValue([
      { kind: 'audioinput', deviceId: 'built-in', label: 'Built-in Microphone' },
    ])

    render(<RecordingStudio onCaptured={vi.fn()} />)

    expect(await screen.findByRole('option', { name: 'Built-in Microphone' })).toBeInTheDocument()
  })

  it('pauses then resumes an active recorder', async () => {
    const user = userEvent.setup()
    render(<RecordingStudio onCaptured={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Start recording' }))
    await user.click(screen.getByRole('button', { name: 'Pause recording' }))
    expect(mockRecorder.pause).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'Resume recording' }))
    expect(mockRecorder.resume).toHaveBeenCalledTimes(1)
  })
})
