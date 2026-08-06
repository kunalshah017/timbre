import { useEffect, useRef } from 'react'
import { timelineAmplitude } from '../lib/audio-timeline'

type LiveVisualizerProps = {
  stream: MediaStream | null
  active: boolean
  resetKey?: number
  onLevelChange?: (level: number) => void
}

export function LiveVisualizer({ stream, active, resetKey = 0, onLevelChange }: LiveVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const levelCallbackRef = useRef(onLevelChange)
  const historyRef = useRef<number[]>([])

  useEffect(() => {
    levelCallbackRef.current = onLevelChange
  }, [onLevelChange])

  useEffect(() => {
    historyRef.current = []
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
  }, [resetKey])

  useEffect(() => {
    if (!stream || !active) {
      if (!stream) historyRef.current = []
      levelCallbackRef.current?.(0)
      return
    }

    const canvas = canvasRef.current
    const AudioContextConstructor = window.AudioContext
    if (!canvas || !AudioContextConstructor) return
    const targetCanvas = canvas

    const context = new AudioContextConstructor()
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)

    const samples = new Uint8Array(analyser.fftSize)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastDrawAt = 0
    let lastSampleAt = -Infinity

    function draw(now: number) {
      frame = window.requestAnimationFrame(draw)
      if (reduceMotion && now - lastDrawAt < 100) return
      lastDrawAt = now

      const context2d = targetCanvas.getContext('2d')
      if (!context2d) return

      const pixelRatio = window.devicePixelRatio || 1
      const width = targetCanvas.clientWidth || 600
      const height = targetCanvas.clientHeight || 180
      if (targetCanvas.width !== width * pixelRatio || targetCanvas.height !== height * pixelRatio) {
        targetCanvas.width = width * pixelRatio
        targetCanvas.height = height * pixelRatio
        context2d.scale(pixelRatio, pixelRatio)
      }

      analyser.getByteTimeDomainData(samples)
      const amplitude = timelineAmplitude(samples)
      levelCallbackRef.current?.(amplitude)

      context2d.clearRect(0, 0, width, height)
      if (now - lastSampleAt >= 45) {
        historyRef.current.push(amplitude)
        lastSampleAt = now
      }
      const barWidth = 4
      const gap = 4
      const maxBars = Math.floor(width / (barWidth + gap))
      if (historyRef.current.length > maxBars) historyRef.current.splice(0, historyRef.current.length - maxBars)
      const startX = width - historyRef.current.length * (barWidth + gap)
      context2d.fillStyle = '#ee6470'
      context2d.shadowBlur = 12
      context2d.shadowColor = '#ee647099'
      historyRef.current.forEach((amplitude, index) => {
        const barHeight = Math.max(3, amplitude * height * .9)
        context2d.fillRect(startX + index * (barWidth + gap), (height - barHeight) / 2, barWidth, barHeight)
      })
      context2d.shadowBlur = 0
    }

    frame = window.requestAnimationFrame(draw)

    return () => {
      window.cancelAnimationFrame(frame)
      source.disconnect()
      analyser.disconnect()
      levelCallbackRef.current?.(0)
      void context.close()
    }
  }, [active, stream])

  return <canvas ref={canvasRef} className="relative z-10 block h-full w-full" aria-label="Live microphone waveform" />
}
