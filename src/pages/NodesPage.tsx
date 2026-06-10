import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Server, Wifi, WifiOff, Bot, Clock, Plus, Trash2, X, Play } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { NodeInfo } from '../hooks/useNodes'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

interface ProvisionFormData {
  host: string
  user: string
  password: string
  port: string
  role: string
  llmUrl: string
  llmModel: string
  centralUrl: string
}

function ProvisionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ProvisionFormData>({
    host: '',
    user: 'root',
    password: '',
    port: '22',
    role: 'worker',
    llmUrl: 'http://localhost:1234/v1',
    llmModel: 'gemma-3-12b',
    centralUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  function set(field: keyof ProvisionFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.host.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NodeProvisionerAgent',
          queue: 'default',
          env: {
            NODE_HOST: form.host,
            NODE_USER: form.user,
            NODE_PASSWORD: form.password,
            NODE_PORT: form.port,
            NODE_ROLE: form.role,
            LAN_LLM_URL: form.llmUrl,
            LAN_LLM_MODEL: form.llmModel,
            CORTEX_CENTRAL_URL: form.centralUrl,
          },
        }),
      })
    } catch {
      // ignore
    }
    setSubmitting(false)
    setToast(true)
  }

  if (toast) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-box" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <span className="modal-title">Provisioning queued</span>
            <button className="icon-btn" onClick={onClose}><X size={16} /></button>
          </div>
          <div className="modal-toast">
            Provisioning started — check Jobs for progress.
          </div>
          <div className="modal-footer">
            <button className="modal-submit" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Provision new node</span>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="modal-field">
              <label className="modal-label">Host (IP or hostname) *</label>
              <input className="modal-input" value={form.host} onChange={e => set('host', e.target.value)}
                placeholder="192.168.1.100" required />
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">SSH User</label>
                <input className="modal-input" value={form.user} onChange={e => set('user', e.target.value)}
                  placeholder="root" />
              </div>
              <div className="modal-field">
                <label className="modal-label">SSH Port</label>
                <input className="modal-input" value={form.port} onChange={e => set('port', e.target.value)}
                  placeholder="22" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">SSH Password</label>
              <input className="modal-input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="modal-field">
              <label className="modal-label">Node Role</label>
              <input className="modal-input" value={form.role} onChange={e => set('role', e.target.value)}
                placeholder="worker" />
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">LAN LLM URL</label>
                <input className="modal-input" value={form.llmUrl} onChange={e => set('llmUrl', e.target.value)}
                  placeholder="http://localhost:1234/v1" />
              </div>
              <div className="modal-field">
                <label className="modal-label">LLM Model</label>
                <input className="modal-input" value={form.llmModel} onChange={e => set('llmModel', e.target.value)}
                  placeholder="gemma-3-12b" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">CORTEX Central URL (optional)</label>
              <input className="modal-input" value={form.centralUrl} onChange={e => set('centralUrl', e.target.value)}
                placeholder="http://cortex-central:8080" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="modal-submit" disabled={submitting || !form.host.trim()}>
              {submitting ? 'Starting…' : 'Provision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RunScriptModal({ node, onClose }: { node: NodeInfo; onClose: () => void }) {
  const agents = node.agents ?? []
  const [script, setScript]   = useState(agents[0] ?? '')
  const [sshUser, setSshUser] = useState(node.sshUser ?? '')
  const [sshKey, setSshKey]   = useState(node.sshKeyPath ?? '')
  const [sshPass, setSshPass] = useState('')
  const [useKey, setUseKey]   = useState(!!node.sshKeyPath)
  const [running, setRunning] = useState(false)
  const [result, setResult]   = useState<{ ok: boolean; msg: string } | null>(null)

  async function handleRun() {
    if (!script || !sshUser || (useKey ? !sshKey : !sshPass)) return
    setRunning(true)
    setResult(null)
    try {
      await fetch(`/api/nodes/update/${encodeURIComponent(node.host)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sshUser, ...(useKey ? { sshKeyPath: sshKey } : {}) }),
      })
      const res = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NodeProvisionerAgent',
          queue: 'default',
          args: {
            action: 'run',
            host: node.host,
            user: sshUser,
            ...(useKey ? { keyPath: sshKey } : { password: sshPass }),
            scriptName: script,
          },
        }),
      })
      const data = await res.json()
      setResult({ ok: !!data.ok, msg: data.ok ? `✓ ${script.replace(/\.kts$/, '')} lanzado en ${node.host}` : (data.error ?? 'Error') })
    } catch (e: any) {
      setResult({ ok: false, msg: e?.message ?? 'Error de red' })
    }
    setRunning(false)
  }

  const canRun = !!(script && sshUser && (useKey ? sshKey : sshPass))

  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box node-run-modal">
        <div className="modal-header">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Run en <code style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>{node.host}</code>
          </span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="node-run-modal-body">
          <div className="run-modal-field">
            <label className="run-modal-label">Agente</label>
            {agents.length === 0
              ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sin agentes registrados</span>
              : <select className="node-run-select" value={script} onChange={e => setScript(e.target.value)}>
                  {agents.map(a => <option key={a} value={a}>{a.replace(/\.kts$/, '')}</option>)}
                </select>
            }
          </div>

          <div className="run-modal-field">
            <label className="run-modal-label">Usuario SSH</label>
            <input className="modal-input" value={sshUser} onChange={e => setSshUser(e.target.value)} placeholder="pi" autoFocus />
          </div>

          <div className="run-modal-field">
            <label className="run-modal-label">Autenticación</label>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <button className={`run-modal-tab ${useKey ? 'active' : ''}`} onClick={() => setUseKey(true)}>Clave SSH</button>
              <button className={`run-modal-tab ${!useKey ? 'active' : ''}`} onClick={() => setUseKey(false)}>Contraseña</button>
            </div>
            {useKey
              ? <input className="modal-input" value={sshKey} onChange={e => setSshKey(e.target.value)} placeholder="~/.ssh/id_rsa" />
              : <input className="modal-input" type="password" value={sshPass} onChange={e => setSshPass(e.target.value)} placeholder="contraseña SSH" />
            }
          </div>

          {result && (
            <div className={`run-modal-result ${result.ok ? 'ok' : 'err'}`}>{result.msg}</div>
          )}
        </div>

        <div className="node-run-modal-footer">
          <button className="node-action-btn" onClick={onClose}>Cancelar</button>
          <button className="node-action-btn node-action-primary" onClick={handleRun} disabled={running || !canRun}>
            <Play size={11} style={{ display: 'inline', marginRight: 4 }} />
            {running ? 'Ejecutando…' : 'Run'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function nodeEffectiveStatus(node: NodeInfo): 'ready' | 'stale' | 'offline' {
  if (node.status === 'uninstalled') return 'offline'
  if (!node.registeredAt) return 'stale'
  const ageMs = Date.now() - new Date(node.registeredAt).getTime()
  if (ageMs > 10 * 60 * 1000) return 'stale'
  return 'ready'
}

function NodeCard({ node, onProvision: _onProvision }: { node: NodeInfo; onProvision: () => void }) {
  const { refreshNodes } = useApp()
  const effective = nodeEffectiveStatus(node)
  const isReady = effective === 'ready'
  const isOff   = node.status === 'uninstalled'
  const isStale = effective === 'stale'
  const [reconnecting, setReconnecting] = useState(false)
  const [reconnected, setReconnected] = useState(false)
  const [showRunModal, setShowRunModal] = useState(false)

  async function handleUninstall() {
    await fetch('/api/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NodeProvisionerAgent', queue: 'default',
        env: { NODE_HOST: node.host, NODE_ACTION: 'uninstall' },
      }),
    }).catch(() => {})
  }

  async function handleReconnect() {
    setReconnecting(true)
    try {
      const res = await fetch(`/api/nodes/touch/${encodeURIComponent(node.host)}`)
      const data = await res.json()
      if (data.ok) {
        setReconnected(true)
        refreshNodes()
        setTimeout(() => setReconnected(false), 8000)
      }
    } catch {}
    setReconnecting(false)
  }

  const cardClass = (isReady || reconnected) ? 'node-card-ready' : isStale ? 'node-card-stale' : 'node-card-off'
  const chipClass = (isReady || reconnected) ? 'chip-green' : isStale ? 'chip-amber' : 'chip-gray'
  const chipLabel = (isReady || reconnected) ? '● online'   : isStale ? '◌ stale'   : '○ offline'
  const iconColor = (isReady || reconnected) ? '#4ade80' : isStale ? '#fbbf24' : '#475569'

  return (
    <div className={`node-card ${cardClass}`}>
      <div className="node-card-header">
        <div className="node-card-icon" style={{ color: iconColor }}>
          {isReady ? <Wifi size={20} strokeWidth={1.8} /> : <WifiOff size={20} strokeWidth={1.8} />}
        </div>
        <div className="node-card-info">
          <div className="node-card-host">{node.host}</div>
          <div className={`node-card-status-text ${isReady ? 'text-green' : 'text-muted'}`}>
            {isStale ? `last seen ${timeAgo(node.registeredAt)}` : node.status}
          </div>
        </div>
        <span className={`node-status-chip ${chipClass}`}>{chipLabel}</span>
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
                <span>Last seen {timeAgo(node.registeredAt)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {!isOff && (
        <div className="node-card-actions">
          {isStale && !reconnected && (
            <button className="node-action-btn node-action-primary" onClick={handleReconnect}
              disabled={reconnecting}>
              <Wifi size={11} style={{ display: 'inline', marginRight: 4 }} />
              {reconnecting ? 'Connecting…' : 'Reconnect'}
            </button>
          )}
          {(isReady || reconnected) && node.agents.length > 0 && (
            <button className="node-action-btn" onClick={() => setShowRunModal(true)}>
              <Play size={11} style={{ display: 'inline', marginRight: 4 }} />Run script
            </button>
          )}
          <button className="node-action-btn node-action-danger" onClick={handleUninstall}>
            <Trash2 size={11} style={{ display: 'inline', marginRight: 4 }} />Uninstall
          </button>
        </div>
      )}

      {showRunModal && <RunScriptModal node={node} onClose={() => setShowRunModal(false)} />}
    </div>
  )
}

export function NodesPage() {
  const { nodes } = useApp()
  const online  = nodes.filter(n => n.status === 'ready').length
  const offline = nodes.filter(n => n.status === 'uninstalled').length
  const [provisionOpen, setProvisionOpen] = useState(false)

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
      <p className="page-desc">Remote machines provisioned with koupper — each node runs its own daemon and can execute scripts via SSH.</p>

      {provisionOpen && <ProvisionModal onClose={() => setProvisionOpen(false)} />}

      {nodes.length === 0 ? (
        <div className="nodes-empty-page">
          <Server size={48} strokeWidth={1} style={{ color: '#2a3a55' }} />
          <div className="empty-state-title">No edge nodes registered</div>
          <div className="empty-state-sub">
            Use <code>NodeProvisionerAgent</code> or ask CORTEX to provision a node.
          </div>
          <button className="modal-submit" style={{ marginTop: 16 }} onClick={() => setProvisionOpen(true)}>
            + Provision first node
          </button>
        </div>
      ) : (
        <>
          <div className="nodes-grid">
            {nodes.map(node => (
              <NodeCard key={node.host} node={node} onProvision={() => setProvisionOpen(true)} />
            ))}

            {/* Add node card */}
            <div className="node-card node-card-add" onClick={() => setProvisionOpen(true)}
              style={{ cursor: 'pointer' }}>
              <Plus size={28} strokeWidth={1} style={{ color: '#2a3a55' }} />
              <span>Provision new node</span>
              <span className="node-add-sub">via NodeProvisionerAgent</span>
            </div>
          </div>

          {/* Architecture explanation */}
          <div className="nodes-arch-section">
            <div className="nodes-arch-title">How edge nodes work</div>
            <div className="nodes-arch-body">
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">⬡</span>
                <div>
                  <strong>Provisioning</strong> — Asks CORTEX to run <code>NodeProvisionerAgent</code> with the target IP. The agent connects via SSH, uploads koupper (~300MB) and starts the daemon on port 9998. Once up, the node calls back to CORTEX and appears here as <em>online</em>.
                </div>
              </div>
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">⚡</span>
                <div>
                  <strong>Remote execution</strong> — Any agent on this machine can dispatch work to a node using the SSH provider: <code>ssh.exec("koupper run FileIndexerAgent.kts")</code>. The script compiles and runs on the node's own JVM — the node doesn't need internet access, just a reachable IP.
                </div>
              </div>
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">◈</span>
                <div>
                  <strong>Heartbeat</strong> — Each node daemon periodically POSTs to <code>CORTEX_CENTRAL_URL/api/nodes/register</code>. If CORTEX stops seeing heartbeats for more than 10 min the node turns <em>stale</em>. Hit <strong>Reconnect</strong> to restart the daemon over SSH.
                </div>
              </div>
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">◉</span>
                <div>
                  <strong>Use cases</strong> — Run a <code>FileIndexerAgent</code> on a NAS without moving files. Fan out a batch job across several machines in parallel. Keep a heavy model (Qwen3 35B) running on a LAN server and route inference there automatically via LAN priority.
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
