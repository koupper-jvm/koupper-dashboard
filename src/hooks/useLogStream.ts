import { useEffect, useRef, useState } from 'react'
import type { LogResponse } from '../types/api'

const TERMINAL = /\[DONE\]|\[FAILED\]|\[TIMEOUT\]/

export function useLogStream(selectedJob: { queue: string; id: string } | null) {
  const [log, setLog] = useState<LogResponse | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stop() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }

  async function fetchLog(id: string) {
    try {
      const res  = await fetch(`/api/logs/${id}`)
      const data = await res.json() as { jobId: string; lines: string[]; error?: string }
      const lines = data.lines ?? []
      const done  = lines.some(l => TERMINAL.test(l))
      setLog({ jobId: id, lines, live: !done, error: data.error })
      if (done) stop()
    } catch {
      setLog(prev => prev ? { ...prev, live: false } : null)
    }
  }

  useEffect(() => {
    stop()
    setLog(null)
    if (!selectedJob) return

    const { id } = selectedJob
    setLog({ jobId: id, lines: [], live: true })

    fetchLog(id)
    timerRef.current = setInterval(() => fetchLog(id), 2_000)

    return stop
  }, [selectedJob?.queue, selectedJob?.id])

  return log
}
