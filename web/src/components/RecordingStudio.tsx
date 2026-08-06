import { Check, Mic, Pause, Play, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { elapsedDuration, type RecordingClock } from '../lib/recording-session'
import { LiveVisualizer } from './LiveVisualizer'

const MAX_DURATION_MS = 10 * 60 * 1_000

type RecordingStatus = 'idle' | 'recording' | 'paused' | 'saving' | 'error'
type InputDevice = { deviceId: string; label: string }

type RecordingStudioProps = {
  onCaptured: (audio: Blob, durationMs: number) => Promise<void>
}

function formatDuration(milliseconds: number) {
  const totalTenths = Math.floor(milliseconds / 100)
  const seconds = Math.floor(totalTenths / 10)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}.${totalTenths % 10}`
}

function recorderMimeType() {
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
}

function normalizedMimeType(mimeType: string) {
  return mimeType.startsWith('audio/mp4') ? 'audio/mp4' : 'audio/webm'
}

export function RecordingStudio({ onCaptured }: RecordingStudioProps) {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [, setLevel] = useState(0)
  const [devices, setDevices] = useState<InputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [selectedInputName, setSelectedInputName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [visualizerResetKey, setVisualizerResetKey] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const clockRef = useRef<RecordingClock>({ accumulatedMs: 0, startedAtMs: null })
  const discardRef = useRef(false)

  useEffect(() => {
    if (status !== 'recording') return

    const timer = window.setInterval(() => {
      const nextElapsed = Math.min(elapsedDuration(clockRef.current, Date.now()), MAX_DURATION_MS)
      setElapsed(nextElapsed)
      if (nextElapsed >= MAX_DURATION_MS) recorderRef.current?.stop()
    }, 100)

    return () => window.clearInterval(timer)
  }, [status])

  useEffect(
    () => () => {
      discardRef.current = true
      if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
      stopTracks()
    },
    [],
  )

  function stopTracks() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }

  async function refreshDevices() {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) return

    const available = await mediaDevices.enumerateDevices()
    const inputs = available
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({ deviceId: device.deviceId, label: device.label || `Microphone ${index + 1}` }))
    setDevices(inputs)
    setSelectedDeviceId((current) => inputs.some((device) => device.deviceId === current) ? current : (inputs[0]?.deviceId ?? ''))
  }

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices
    if (!mediaDevices) return

    void refreshDevices()

    const handleDeviceChange = () => void refreshDevices()
    mediaDevices.addEventListener?.('devicechange', handleDeviceChange)

    return () => mediaDevices.removeEventListener?.('devicechange', handleDeviceChange)
  }, [])

  async function start() {
    try {
      setError(null)
      discardRef.current = false
      const capture = await navigator.mediaDevices.getUserMedia({
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      })
      const mimeType = recorderMimeType()

      if (!mimeType) {
        capture.getTracks().forEach((track) => track.stop())
        throw new Error('This browser does not support a compatible audio recording format.')
      }

      const recorder = new MediaRecorder(capture, { mimeType })
      setSelectedInputName(capture.getAudioTracks()[0]?.label || 'Microphone')
      streamRef.current = capture
      recorderRef.current = recorder
      chunksRef.current = []
      clockRef.current = { accumulatedMs: 0, startedAtMs: Date.now() }
      setElapsed(0)
      setStream(capture)

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      })

      recorder.addEventListener('stop', async () => {
        const durationMs = Math.min(elapsedDuration(clockRef.current, Date.now()), MAX_DURATION_MS)
        const audio = new Blob(chunksRef.current, { type: normalizedMimeType(mimeType) })
        stopTracks()
        recorderRef.current = null

        if (discardRef.current) {
          discardRef.current = false
          chunksRef.current = []
          clockRef.current = { accumulatedMs: 0, startedAtMs: null }
          setElapsed(0)
          setStatus('idle')
          return
        }

        if (audio.size === 0) {
          setError('No audio was captured. Please try again.')
          setStatus('error')
          return
        }

        setStatus('saving')
        try {
          await onCaptured(audio, durationMs)
          chunksRef.current = []
          clockRef.current = { accumulatedMs: 0, startedAtMs: null }
          setElapsed(0)
          setStatus('idle')
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : 'Could not save this recording.')
          setStatus('error')
        }
      })

      recorder.start()
      setStatus('recording')
      void refreshDevices()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Microphone access is unavailable.')
      setStatus('error')
    }
  }

  function pause() {
    if (recorderRef.current?.state !== 'recording') return
    clockRef.current = { accumulatedMs: elapsedDuration(clockRef.current, Date.now()), startedAtMs: null }
    setElapsed(clockRef.current.accumulatedMs)
    recorderRef.current.pause()
    setStatus('paused')
  }

  function resume() {
    if (recorderRef.current?.state !== 'paused') return
    clockRef.current = { ...clockRef.current, startedAtMs: Date.now() }
    recorderRef.current.resume()
    setStatus('recording')
  }

  function finish() {
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') recorderRef.current.stop()
  }

  function discard() {
    if (!window.confirm('Discard this unsaved recording?')) return
    discardRef.current = true
    setVisualizerResetKey((current) => current + 1)
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') recorderRef.current.stop()
  }

  const active = status === 'recording'
  const capturing = active || status === 'paused'
  const selectedLabel = devices.find((device) => device.deviceId === selectedDeviceId)?.label ?? selectedInputName ?? 'Allow microphone access'

  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_50%,#202a3a,#151516_62%)] px-[clamp(34px,7vw,96px)]" aria-label="Recording editor">
      <div className="absolute left-[clamp(34px,7vw,96px)] right-[clamp(34px,7vw,96px)] top-7 flex items-center gap-3">
        <span className={`rounded-full border px-2 py-1 text-[11px] font-semibold ${active ? 'border-rose-400/40 bg-rose-500/15 text-rose-300' : 'border-zinc-700 bg-zinc-800 text-zinc-300'}`}>{active ? 'LIVE' : status === 'paused' ? 'PAUSED' : 'READY'}</span>
        <label className="flex items-center gap-2 text-xs text-zinc-300"><Mic size={14} /><select className="max-w-56 bg-transparent outline-none" aria-label="Input" value={selectedDeviceId} disabled={capturing || devices.length === 0} onChange={(event) => setSelectedDeviceId(event.target.value)}>{devices.length === 0 ? <option>{selectedLabel}</option> : devices.map((device) => <option key={device.deviceId} value={device.deviceId}>{device.label}</option>)}</select></label>
      </div>

      <div className="relative -ml-[clamp(34px,7vw,96px)] h-[min(58vh,520px)] w-[calc(100%+clamp(68px,14vw,192px))]">
        <LiveVisualizer stream={stream} active={active} resetKey={visualizerResetKey} onLevelChange={setLevel} />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xl font-semibold tracking-tight">{formatDuration(elapsed)}</div>
      </div>

      <div className="mt-8 flex justify-center">
        <div className="flex items-center gap-2">
          {status === 'idle' || status === 'error' ? (
            <button className="grid h-14 w-14 place-items-center rounded-full border-[5px] border-zinc-100" aria-label="Start recording" onClick={() => void start()}><span className="h-8 w-8 rounded-full bg-rose-400" /></button>
          ) : status === 'saving' ? <span className="text-sm text-zinc-400">Saving recording…</span> : (
            <>
              <button className="grid h-12 w-12 place-items-center rounded-full bg-zinc-800" aria-label={active ? 'Pause recording' : 'Resume recording'} onClick={active ? pause : resume}>{active ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button>
              <button className="grid h-12 w-12 place-items-center rounded-full bg-zinc-800 text-zinc-300" aria-label="Discard recording" onClick={discard}><Trash2 size={18} /></button>
              <button className="grid h-12 w-12 place-items-center rounded-full bg-rose-400 text-white" aria-label="Done recording" onClick={finish}><Check size={18} /></button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-4 text-center text-sm text-rose-300" role="alert">{error}</p>}
    </section>
  )
}
