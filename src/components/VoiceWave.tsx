import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react'

const BAR_COUNT = 38

export interface VoiceHandle {
  speak: (text: string) => void
}

interface Props {
  greeting?: string
}

export const VoiceWave = forwardRef<VoiceHandle, Props>(function VoiceWave({ greeting }, ref) {
  const [bars, setBars]         = useState<number[]>(Array(BAR_COUNT).fill(3))
  const [playing, setPlaying]   = useState(false)
  const [ready, setReady]       = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  const analyserRef    = useRef<AnalyserNode | null>(null)
  const animRef        = useRef<number>(0)
  const ctxRef         = useRef<AudioContext | null>(null)
  const audioRef       = useRef<HTMLAudioElement | null>(null)
  const abortRef       = useRef<AbortController | null>(null)
  const pendingRef     = useRef<string | null>(null)  // text to speak once unlocked
  const lastSpokenRef  = useRef<string | null>(null)  // last spoken text (for replay)
  const unlockingRef   = useRef(false)                // prevent double unlock

  useEffect(() => {
    fetch('/api/voice/status')
      .then(r => r.json())
      .then(d => setReady(d.ready === true))
      .catch(() => setReady(false))
  }, [])

  function stopAnim() {
    cancelAnimationFrame(animRef.current)
    setBars(Array(BAR_COUNT).fill(3))
    setPlaying(false)
  }

  function animate() {
    if (!analyserRef.current) return
    const data = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(data)
    const step = Math.floor(data.length / BAR_COUNT)
    setBars(Array.from({ length: BAR_COUNT }, (_, i) => {
      const raw = data[Math.min(i * step, data.length - 1)] / 255
      const boost = 1 - Math.abs((i / BAR_COUNT) - 0.5) * 0.6
      return Math.max(3, raw * boost * 44)
    }))
    animRef.current = requestAnimationFrame(animate)
  }

  async function playText(ctx: AudioContext, text: string) {
    lastSpokenRef.current = text
    abortRef.current?.abort()
    abortRef.current = new AbortController()

    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    cancelAnimationFrame(animRef.current)
    setPlaying(false)

    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
        signal: abortRef.current.signal,
      })
      if (!res.ok) return
      const { url, error } = await res.json()
      if (error || !url) return

      const audio = new Audio(url)
      audio.crossOrigin = 'anonymous'
      audioRef.current = audio

      const source   = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser

      audio.onplay  = () => { setPlaying(true); animate() }
      audio.onended = stopAnim
      audio.onerror = stopAnim

      await audio.play()
    } catch (e: unknown) {
      if ((e as { name?: string })?.name !== 'AbortError')
        console.warn('[VoiceWave]', e)
      stopAnim()
    }
  }

  const speak = useCallback((text: string) => {
    if (!ready) return
    if (!unlocked || !ctxRef.current) {
      // Queue for when AudioContext is activated
      pendingRef.current = text
      return
    }
    playText(ctxRef.current, text)
  }, [ready, unlocked])

  // Expose speak() to parent (CortexChat uses this for responses)
  useImperativeHandle(ref, () => ({ speak }), [speak])

  // Listen for first user interaction ANYWHERE on the page
  useEffect(() => {
    if (unlocked || !ready) return

    function unlock() {
      if (unlockingRef.current) return
      unlockingRef.current = true

      const ctx = new AudioContext()
      ctxRef.current = ctx
      ctx.resume().then(() => {
        setUnlocked(true)
        // Play greeting (or pending chat response if one arrived first)
        const text = pendingRef.current ?? greeting
        pendingRef.current = null
        if (text) playText(ctx, text)
      })
    }

    document.addEventListener('click',   unlock, { once: true })
    document.addEventListener('keydown', unlock, { once: true })
    return () => {
      document.removeEventListener('click',   unlock)
      document.removeEventListener('keydown', unlock)
    }
  }, [unlocked, ready, greeting])

  // Play pending text when unlocked state propagates
  useEffect(() => {
    if (unlocked && ctxRef.current && pendingRef.current) {
      const text = pendingRef.current
      pendingRef.current = null
      playText(ctxRef.current, text)
    }
  }, [unlocked])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      cancelAnimationFrame(animRef.current)
      ctxRef.current?.close()
    }
  }, [])

  if (!ready) return null

  return (
    <div
      className={`voice-wave${playing ? ' playing' : ''}${!unlocked ? ' needs-click' : ''}`}
      title={unlocked ? 'Click to replay last response' : 'Voice activates on first interaction'}
      onClick={() => {
        if (unlocked && ctxRef.current) {
          const text = lastSpokenRef.current ?? greeting
          if (text) playText(ctxRef.current, text)
        }
      }}
    >
      {!unlocked && <span className="voice-wave-tap">▶ TAP</span>}
      {bars.map((h, i) => (
        <div key={i} className="voice-bar" style={{ height: `${h}px` }} />
      ))}
    </div>
  )
})
