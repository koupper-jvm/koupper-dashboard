import { useEffect, useRef, useState } from 'react'
import type { LogResponse } from '../types/api'

export function useLogStream(selectedJob: { queue: string; id: string } | null) {
  const [log, setLog] = useState<LogResponse | null>(null)
  const esRef   = useRef<EventSource | null>(null)
  const linesRef = useRef<string[]>([])

  useEffect(() => {
    esRef.current?.close()
    esRef.current = null
    linesRef.current = []

    if (!selectedJob) { setLog(null); return }

    const { id } = selectedJob
    setLog({ jobId: id, lines: [], live: true })

    const es = new EventSource(`/api/logs/${id}/stream`)
    esRef.current = es

    es.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as {
          line?: string
          done?: boolean
          error?: string
        }
        if (msg.error) {
          setLog({ jobId: id, lines: linesRef.current, error: msg.error, live: false })
          es.close()
        } else if (msg.line) {
          linesRef.current = [...linesRef.current, msg.line]
          setLog({ jobId: id, lines: linesRef.current, live: true })
        } else if (msg.done) {
          setLog({ jobId: id, lines: linesRef.current, live: false })
          es.close()
        }
      } catch { /* ignore parse errors */ }
    }

    es.onerror = () => {
      setLog(prev => prev ? { ...prev, live: false } : null)
      es.close()
    }

    return () => { es.close() }
  }, [selectedJob?.queue, selectedJob?.id])

  return log
}
