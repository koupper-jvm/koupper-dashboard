import { useEffect, useRef, useState, useCallback } from 'react'

const BAR_COUNT = 38

interface Props {
  greeting?: string
}

export function VoiceWave({ greeting }: Props) {
  const [bars, setBars]       = useState<number[]>(Array(BAR_COUNT).fill(3))
  const [playing, setPlaying] = useState(false)
  const [ready, setReady]     = useState(false)

  const analyserRef = useRef<AnalyserNode | null>(null)
  const animRef     = useRef<number>(0)
  const ctxRef      = useRef<AudioContext | null>(null)
  const audioRef    = useRef<HTMLAudioElement | null>(null)
  const spokenRef   = useRef(false)

  // Check if voice engine is ready
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
      // Boost mid frequencies for a more natural waveform shape
      const boost = 1 - Math.abs((i / BAR_COUNT) - 0.5) * 0.6
      return Math.max(3, raw * boost * 44)
    }))
    animRef.current = requestAnimationFrame(animate)
  }

  const speak = useCallback(async (text: string) => {
    if (!ready) return
    try {
      const res = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: text,
      })
      if (!res.ok) return
      const { url, error } = await res.json()
      if (error || !url) return

      // Stop previous audio
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      cancelAnimationFrame(animRef.current)

      if (!ctxRef.current || ctxRef.current.state === 'closed') {
        ctxRef.current = new AudioContext()
      }
      const ctx = ctxRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const audio    = new Audio(url)
      audioRef.current = audio

      const source   = ctx.createMediaElementSource(audio)
      const analyser = ctx.createAnalyser()
      analyser.fftSize        = 128
      analyser.smoothingTimeConstant = 0.75
      source.connect(analyser)
      analyser.connect(ctx.destination)
      analyserRef.current = analyser

      audio.onplay   = () => { setPlaying(true); animate() }
      audio.onended  = stopAnim
      audio.onerror  = stopAnim

      await audio.play()
    } catch (e) {
      console.warn('[VoiceWave] speak error:', e)
      stopAnim()
    }
  }, [ready])

  // Speak greeting once voice engine is confirmed ready
  useEffect(() => {
    if (ready && greeting && !spokenRef.current) {
      spokenRef.current = true
      const t = setTimeout(() => speak(greeting), 800)
      return () => clearTimeout(t)
    }
  }, [ready, greeting, speak])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animRef.current)
      ctxRef.current?.close()
    }
  }, [])

  if (!ready) return null

  return (
    <div
      className={`voice-wave${playing ? ' playing' : ''}`}
      title="CORTEX Voice — click to replay"
      onClick={() => greeting && speak(greeting)}
    >
      {bars.map((h, i) => (
        <div key={i} className="voice-bar" style={{ height: `${h}px` }} />
      ))}
    </div>
  )
}
