import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '../hooks/useSSE'

interface Props {
  status: ConnectionStatus
  cortexActive: boolean
}

export function Header({ status, cortexActive }: Props) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    function tick() {
      const n = new Date()
      setClock(
        String(n.getHours()).padStart(2, '0') + ':' +
        String(n.getMinutes()).padStart(2, '0') + ':' +
        String(n.getSeconds()).padStart(2, '0')
      )
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <header className="header">
      <h1 className="header-title">◈ &nbsp;IGLY CORTEX — SWARM MONITOR</h1>
      <div className="header-right">
        {cortexActive && <span className="cortex-badge">● CORTEX ONLINE</span>}
        <span
          className="conn-dot"
          style={{ background: status === 'connected' ? 'var(--green)' : 'var(--red)' }}
        />
        <span className="clock">{clock}</span>
      </div>
    </header>
  )
}
