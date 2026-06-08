import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ConnectionStatus } from '../hooks/useSSE'
import AuroraRing from './AuroraRing'
import { VoiceWave } from './VoiceWave'
import type { VoiceHandle } from './VoiceWave'

interface Props {
  status: ConnectionStatus
  cortexActive: boolean
  voiceRef?: React.Ref<VoiceHandle>
}

export function Header({ status, cortexActive, voiceRef }: Props) {
  const [clock, setClock] = useState('')
  const [showClients, setShowClients] = useState(false)
  const [clients, setClients] = useState<string[]>([])
  const dropRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (!showClients) return
    fetch('/api/clients')
      .then(r => r.json())
      .then((data: string[]) => setClients(data ?? []))
      .catch(() => {})
  }, [showClients])

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setShowClients(false)
      }
    }
    if (showClients) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [showClients])

  return (
    <header className="header">
      <div className="header-brand">
        <AuroraRing size={72} style={{ flexShrink: 0 }} />
        <div className="header-brand-text" style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:4 }}>
          <span className="header-title-pixel">CORTEX</span>
          <span className="header-subtitle">IGLY SWARM MONITOR</span>
        </div>
        <VoiceWave ref={voiceRef} greeting="CORTEX en línea. Todos los sistemas operativos." />
      </div>
      <div className="header-right">
        {cortexActive && <span className="cortex-badge">● ONLINE</span>}

        <div className="header-clients-wrap" ref={dropRef}>
          <button
            className="header-new-client-btn"
            onClick={() => setShowClients(v => !v)}
          >
            Clients {showClients ? '▴' : '▾'}
          </button>
          {showClients && (
            <div className="header-clients-dropdown">
              {clients.map(id => (
                <Link
                  key={id}
                  to={`/clients/${id}`}
                  className="header-clients-item"
                  onClick={() => setShowClients(false)}
                >
                  {id}
                </Link>
              ))}
              <div className="header-clients-divider" />
              <Link
                to="/clients/new"
                className="header-clients-item header-clients-new"
                onClick={() => setShowClients(false)}
              >
                + New Client
              </Link>
            </div>
          )}
        </div>

        <span className="conn-dot"
          style={{ background: status === 'connected' ? 'var(--green)' : 'var(--red)' }}
        />
        <span className="clock">{clock}</span>
      </div>
    </header>
  )
}
