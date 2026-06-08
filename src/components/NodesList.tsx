import type { NodeInfo } from '../hooks/useNodes'

interface Props {
  nodes: NodeInfo[]
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function NodesList({ nodes }: Props) {
  if (nodes.length === 0) {
    return <div className="nodes-empty">No edge nodes registered</div>
  }

  return (
    <div className="nodes-list">
      {nodes.map(node => {
        const isReady = node.status === 'ready'
        const isUninstalled = node.status === 'uninstalled'
        return (
          <div key={node.host} className="node-item">
            <div className="node-row-main">
              <span className={`node-dot ${isReady ? 'node-dot-ready' : isUninstalled ? 'node-dot-off' : 'node-dot-warn'}`} />
              <span className="node-host">{node.host}</span>
              <span className={`node-status-badge ${isReady ? 'badge-ready' : isUninstalled ? 'badge-off' : 'badge-warn'}`}>
                {node.status}
              </span>
            </div>
            {!isUninstalled && (
              <div className="node-row-meta">
                {node.role && node.role !== 'none' && (
                  <span className="node-role">{node.role}</span>
                )}
                {node.agents.length > 0 && (
                  <span className="node-agents">{node.agents.join(', ')}</span>
                )}
                {node.registeredAt && (
                  <span className="node-time">{timeAgo(node.registeredAt)}</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
