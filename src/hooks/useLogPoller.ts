import { useEffect, useRef, useState } from 'react'
import type { LogResponse } from '../types/api'

export function useLogPoller(selectedJob: { queue: string; id: string } | null) {
  const [log, setLog] = useState<LogResponse | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)

    if (!selectedJob) {
      setLog(null)
      return
    }

    async function fetchLog() {
      if (!selectedJob) return
      try {
        const res = await fetch(`/api/logs/${selectedJob.id}?queue=${selectedJob.queue}`)
        const data: LogResponse = await res.json()
        setLog(data)
      } catch {}
    }

    fetchLog()
    timerRef.current = setInterval(fetchLog, 2000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [selectedJob?.queue, selectedJob?.id])

  return log
}
