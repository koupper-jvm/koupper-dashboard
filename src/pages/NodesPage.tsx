import { Server, Wifi, WifiOff, Bot, Clock, Plus } from 'lucide-react'
import { useApp } from '../context/AppContext'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NodesPage() {
  const { nodes } = useApp()
  const online  = nodes.filter(n => n.status === 'ready').length
  const offline = nodes.filter(n => n.status === 'uninstalled').length

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Edge Nodes</h1>
        <div className="page-header-actions">
          <div className="nodes-summary">
            <span className="nodes-online-badge"><span className="dot-green" /> {online} online</span>
            {offline > 0 && <span className="nodes-offline-badge"><span className="dot-gray" /> {offline} offline</span>}
          </div>
        </div>
      </div>

      {nodes.length === 0 ? (
        <div className="nodes-empty-page">
          <Server size={48} strokeWidth={1} style={{ color: '#2a3a55' }} />
          <div className="empty-state-title">No edge nodes registered</div>
          <div className="empty-state-sub">
            Use <code>NodeProvisionerAgent</code> or ask CORTEX to provision a node.
          </div>
        </div>
      ) : (
        <div className="nodes-grid">
          {nodes.map(node => {
            const isReady = node.status === 'ready'
            const isOff   = node.status === 'uninstalled'
            return (
              <div key={node.host} className={`node-card ${isReady ? 'node-card-ready' : 'node-card-off'}`}>
                <div className="node-card-header">
                  <div className="node-card-icon" style={{ color: isReady ? '#10d68e' : '#4a5a7a' }}>
                    {isReady ? <Wifi size={20} strokeWidth={1.8} /> : <WifiOff size={20} strokeWidth={1.8} />}
                  </div>
                  <div className="node-card-info">
                    <div className="node-card-host">{node.host}</div>
                    <div className={`node-card-status-text ${isReady ? 'text-green' : 'text-muted'}`}>
                      {node.status}
                    </div>
                  </div>
                  <span className={`node-status-chip ${isReady ? 'chip-green' : 'chip-gray'}`}>
                    {isReady ? '● online' : '○ offline'}
                  </span>
                </div>

                {!isOff && (
                  <>
                    <div className="node-card-divider" />
                    <div className="node-card-body">
                      {node.role && node.role !== 'none' && (
                        <div className="node-meta-row">
                          <Server size={13} />
                          <span>Role: <strong>{node.role}</strong></span>
                        </div>
                      )}
                      {node.agents.length > 0 && (
                        <div className="node-meta-row">
                          <Bot size={13} />
                          <span>Agents: {node.agents.join(', ')}</span>
                        </div>
                      )}
                      {node.registeredAt && (
                        <div className="node-meta-row">
                          <Clock size={13} />
                          <span>Registered {timeAgo(node.registeredAt)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}

          {/* Add node card */}
          <div className="node-card node-card-add">
            <Plus size={28} strokeWidth={1} style={{ color: '#2a3a55' }} />
            <span>Provision new node</span>
            <span className="node-add-sub">via NodeProvisionerAgent</span>
          </div>
        </div>
      )}
    </div>
  )
}
