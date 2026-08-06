import { Pause, Play, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Recording } from '../api/recordings'
import { scaleTimelineAmplitudes } from '../lib/audio-timeline'

const TIMELINE_BAR_COUNT = 88

type Props = {
  recording: Recording
  onRename: (recording: Recording, title: string) => Promise<void>
  onDelete: (recording: Recording) => Promise<void>
}

async function decodeTimeline(buffer: ArrayBuffer) {
  const context = new AudioContext()

  try {
    const decoded = await context.decodeAudioData(buffer)
    const channel = decoded.getChannelData(0)
    const step = Math.max(1, Math.floor(channel.length / TIMELINE_BAR_COUNT))
    const values = Array.from({ length: TIMELINE_BAR_COUNT }, (_, index) => {
      const slice = channel.subarray(index * step, Math.min(channel.length, (index + 1) * step))
      const sumOfSquares = slice.reduce((sum, value) => sum + value * value, 0)
      return Math.sqrt(sumOfSquares / Math.max(1, slice.length))
    })

    return scaleTimelineAmplitudes(values)
  } finally {
    await context.close()
  }
}

export function RecordingPlayer({ recording, onRename, onDelete }: Props) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [title, setTitle] = useState(recording.title)
  const [bars, setBars] = useState<number[]>([])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadTimeline() {
      try {
        const response = await fetch(recording.audio_url)
        const bars = await decodeTimeline(await response.arrayBuffer())
        if (!cancelled) setBars(bars)
      } catch {
        if (!cancelled) setBars([])
      }
    }

    void loadTimeline()
    return () => { cancelled = true }
  }, [recording.audio_url])

  useEffect(() => {
    setTitle(recording.title)
  }, [recording.id, recording.title])

  function seek(seconds: number) {
    if (!audio.current) return

    audio.current.currentTime = Math.max(
      0,
      Math.min(audio.current.duration || 0, audio.current.currentTime + seconds),
    )
  }

  async function togglePlayback() {
    if (!audio.current) return

    if (audio.current.paused) {
      await audio.current.play()
      setPlaying(true)
    } else {
      audio.current.pause()
      setPlaying(false)
    }
  }

  function saveTitle(element: HTMLHeadingElement) {
    const nextTitle = element.textContent?.trim() || recording.title
    element.textContent = nextTitle
    setTitle(nextTitle)

    if (nextTitle !== recording.title) void onRename(recording, nextTitle)
  }

  return (
    <section
      className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#202a3a,#151516_66%)] px-[clamp(34px,7vw,96px)]"
      aria-labelledby="player-title"
    >
      <audio
        ref={audio}
        src={recording.audio_url}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime / (event.currentTarget.duration || 1))}
        onEnded={() => { setPlaying(false); setProgress(1) }}
      />

      <div className="absolute left-[clamp(34px,7vw,96px)] right-[clamp(34px,7vw,96px)] top-10 flex items-center justify-between gap-6">
        <h1
          className="max-w-[70%] cursor-text rounded-md text-2xl font-semibold tracking-tight outline-none focus:bg-white/5 focus:ring-2 focus:ring-blue-300/70"
          id="player-title"
          role="textbox"
          aria-label="Recording name"
          contentEditable
          suppressContentEditableWarning
          onBlur={(event) => saveTitle(event.currentTarget)}
        >
          {title}
        </h1>

        <button
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-rose-300"
          aria-label="Delete recording"
          onClick={() => void onDelete(recording)}
        >
          <Trash2 size={19} />
        </button>
      </div>

      <div className="flex h-[min(42vh,300px)] items-center justify-center gap-[3px]" aria-label="Audio timeline">
        {bars.map((amplitude, index) => (
          <i
            key={index}
            className={`w-1 rounded-full transition-colors ${index / Math.max(1, bars.length - 1) <= progress ? 'bg-blue-400' : 'bg-slate-600'}`}
            style={{ height: `${8 + amplitude * 86}%` }}
          />
        ))}
      </div>

      <div className="mt-9 flex items-center justify-center gap-8">
        <button className="text-zinc-200" aria-label="Previous 15 seconds" onClick={() => seek(-15)}>
          <RotateCcw size={22} />
        </button>
        <button
          className="grid h-16 w-16 place-items-center rounded-full bg-blue-400 text-slate-950"
          aria-label={playing ? 'Pause recording' : 'Play recording'}
          onClick={() => void togglePlayback()}
        >
          {playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
        </button>
        <button className="text-zinc-200" aria-label="Next 15 seconds" onClick={() => seek(15)}>
          <RotateCw size={22} />
        </button>
      </div>
    </section>
  )
}
