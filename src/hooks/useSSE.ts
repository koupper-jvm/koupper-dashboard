import { useEffect, useRef, useState } from 'react'
import type { SwarmSnapshot } from '../types/api'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export function useSSE() {
  const [snapshot, setSnapshot] = useState<SwarmSnapshot | null>(null)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    function connect() {
      const es = new EventSource('/events')
      esRef.current = es

      es.onopen = () => setStatus('connected')
      es.onerror = () => {
        setStatus('disconnected')
        es.close()
        setTimeout(connect, 3000)
      }
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as SwarmSnapshot
          if (data.type === 'snapshot') setSnapshot(data)
        } catch {}
      }
    }

    connect()
    return () => esRef.current?.close()
  }, [])

  return { snapshot, status }
}
