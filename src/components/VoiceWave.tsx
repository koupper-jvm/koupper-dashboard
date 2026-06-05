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
  // Always start needing a click — browser blocks AudioContext without user gesture
  const [unlocked, setUnlocked] = useState(false)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const animRef     = useRef<number>(0)
  const ctxRef      = useRef<AudioContext | null>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const abortRef    = useRef<AbortController | null>(null)

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

  const speak = useCallback(async (text: string) => {
    if (!ready || !unlocked) return

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

      const ctx = ctxRef.current!
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
  }, [ready, unlocked])

  // Expose speak() to parent so chat responses can trigger voice
  useImperativeHandle(ref, () => ({ speak }), [speak])

  async function activate() {
    // Must be called directly from a click event so AudioContext is allowed
    const ctx = new AudioContext()
    await ctx.resume()
    ctxRef.current = ctx
    setUnlocked(true)
    if (greeting) {
      // speak() checks unlocked, but we just set it — call directly here
      abortRef.current?.abort()
      abortRef.current = new AbortController()
      try {
        const res = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: greeting,
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
          console.warn('[VoiceWave] activate:', e)
        stopAnim()
      }
    }
  }

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
      title={unlocked ? 'CORTEX Voice — click to replay' : 'Click to activate CORTEX voice'}
      onClick={() => {
        if (!unlocked) activate()
        else if (greeting) speak(greeting)
      }}
    >
      {!unlocked && <span className="voice-wave-tap">▶ TAP</span>}
      {bars.map((h, i) => (
        <div key={i} className="voice-bar" style={{ height: `${h}px` }} />
      ))}
    </div>
  )
})
