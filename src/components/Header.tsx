import { useEffect, useState } from 'react'
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
      <div className="header-brand">
        <AuroraRing size={72} style={{ flexShrink: 0 }} />
        <div className="header-brand-text" style={{ display:'flex', flexDirection:'column', justifyContent:'center', gap:4 }}>
          <span className="header-title-pixel">CORTEX</span>
          <span className="header-subtitle">IGLY SWARM MONITOR</span>
        </div>
        <VoiceWave ref={voiceRef} greeting="CORTEX online. All systems nominal." />
      </div>
      <div className="header-right">
        {cortexActive && <span className="cortex-badge">● ONLINE</span>}
        <span className="conn-dot"
          style={{ background: status === 'connected' ? 'var(--green)' : 'var(--red)' }}
        />
        <span className="clock">{clock}</span>
      </div>
    </header>
  )
}
