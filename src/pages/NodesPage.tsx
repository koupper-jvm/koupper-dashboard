import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Server, Wifi, WifiOff, Clock, Plus, Trash2, X, Play, FolderOpen } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { NodeInfo } from '../hooks/useNodes'

const AGENT_INFO: Record<string, { label: string; desc: string }> = {
  FileIndexerAgent:    { label: 'Indexer',   desc: 'Escanea y cataloga archivos en el workspace' },
  SummarizerAgent:     { label: 'Summarizer', desc: 'Resume contenido usando el LLM del nodo' },
  RssFeedAgent:        { label: 'RSS',        desc: 'Descarga e indexa feeds RSS' },
  KnowledgeQueryAgent: { label: 'Query',      desc: 'Responde preguntas desde la base de conocimiento' },
  HeartbeatAgent:      { label: 'Heartbeat',  desc: 'Reporta salud del nodo al central cada N segundos' },
}

const ROLES = [
  {
    value: 'indexer',
    label: 'Indexer',
    desc: 'Vigila y cataloga archivos del workspace',
    installs: ['FileIndexerAgent'],
  },
  {
    value: 'summarizer',
    label: 'Summarizer',
    desc: 'Indexa + resume + consume RSS feeds',
    installs: ['FileIndexerAgent', 'SummarizerAgent', 'RssFeedAgent'],
  },
  {
    value: 'full',
    label: 'Full',
    desc: 'Todos los agentes habilitados',
    installs: ['FileIndexerAgent', 'SummarizerAgent', 'RssFeedAgent', 'KnowledgeQueryAgent', 'HeartbeatAgent'],
  },
]

const sshCredsKey = (host: string) => `cortex-ssh-${host}`

function loadSshCreds(host: string): { user: string; keyPath?: string; password?: string } | null {
  try { return JSON.parse(localStorage.getItem(sshCredsKey(host)) ?? 'null') } catch { return null }
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

interface ProvisionFormData {
  host: string
  user: string
  password: string
  port: string
  role: string
  workspacePath: string
  llmUrl: string
  llmModel: string
  centralUrl: string
}

function ProvisionModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<ProvisionFormData>({
    host: '',
    user: 'pi',
    password: '',
    port: '22',
    role: 'indexer',
    workspacePath: '/home/pi/files',
    llmUrl: 'http://192.168.56.1:1234',
    llmModel: 'qwen/qwen3-5-9b',
    centralUrl: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(false)

  function set(field: keyof ProvisionFormData, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  const selectedRole = ROLES.find(r => r.value === form.role) ?? ROLES[0]

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
          input: {
            action: 'install',
            host: form.host,
            user: form.user,
            password: form.password || undefined,
            port: parseInt(form.port, 10) || 22,
            role: form.role,
            workspacePath: form.workspacePath || undefined,
            llmUrl: form.llmUrl,
            llmModel: form.llmModel,
            centralUrl: form.centralUrl || 'http://192.168.1.19:18083',
          },
        }),
      })
    } catch { /* ignore */ }
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
              <label className="modal-label">Host (IP o hostname) *</label>
              <input className="modal-input" value={form.host} onChange={e => set('host', e.target.value)}
                placeholder="192.168.1.100" required />
            </div>
            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">Usuario SSH</label>
                <input className="modal-input" value={form.user} onChange={e => set('user', e.target.value)}
                  placeholder="pi" />
              </div>
              <div className="modal-field">
                <label className="modal-label">Puerto SSH</label>
                <input className="modal-input" value={form.port} onChange={e => set('port', e.target.value)}
                  placeholder="22" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">Contraseña SSH</label>
              <input className="modal-input" type="password" value={form.password}
                onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>

            {/* Role selector */}
            <div className="modal-field">
              <label className="modal-label">Rol del nodo</label>
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {ROLES.map(r => (
                  <button key={r.value} type="button"
                    className={`run-modal-tab ${form.role === r.value ? 'active' : ''}`}
                    onClick={() => set('role', r.value)}>
                    {r.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{selectedRole.desc}</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {selectedRole.installs.map(a => (
                  <span key={a} style={{
                    fontSize: 10, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(99,179,237,0.12)', color: 'var(--accent)', fontFamily: 'var(--mono)'
                  }}>{a}</span>
                ))}
              </div>
            </div>

            {/* Workspace */}
            <div className="modal-field">
              <label className="modal-label">Workspace (directorio a indexar)</label>
              <input className="modal-input" value={form.workspacePath} onChange={e => set('workspacePath', e.target.value)}
                placeholder="/home/pi/files" />
            </div>

            <div className="modal-row">
              <div className="modal-field">
                <label className="modal-label">LAN LLM URL</label>
                <input className="modal-input" value={form.llmUrl} onChange={e => set('llmUrl', e.target.value)}
                  placeholder="http://192.168.56.1:1234" />
              </div>
              <div className="modal-field">
                <label className="modal-label">Modelo LLM</label>
                <input className="modal-input" value={form.llmModel} onChange={e => set('llmModel', e.target.value)}
                  placeholder="qwen/qwen3-5-9b" />
              </div>
            </div>
            <div className="modal-field">
              <label className="modal-label">CORTEX Central URL (opcional)</label>
              <input className="modal-input" value={form.centralUrl} onChange={e => set('centralUrl', e.target.value)}
                placeholder="http://192.168.1.19:18083" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="modal-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="modal-submit" disabled={submitting || !form.host.trim()}>
              {submitting ? 'Iniciando…' : 'Provision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RunScriptModal({ node, onClose }: { node: NodeInfo; onClose: () => void }) {
  const navigate = useNavigate()
  const { setSelectedJob } = useApp()
  const agents = node.agents ?? []

  // Creds: localStorage takes priority, server-saved key as fallback
  const saved = useMemo(() => loadSshCreds(node.host), [node.host])
  const hasSavedCreds = !!(saved || (node.sshUser && node.sshKeyPath))

  const [script, setScript]   = useState(agents[0] ?? '')
  const [sshUser, setSshUser] = useState(saved?.user ?? node.sshUser ?? '')
  const [sshKey, setSshKey]   = useState(saved?.keyPath ?? node.sshKeyPath ?? '')
  const [sshPass, setSshPass] = useState(saved?.password ?? '')
  const [useKey, setUseKey]   = useState(!!(saved?.keyPath ?? node.sshKeyPath))
  const [running, setRunning] = useState(false)
  const [jobId, setJobId]     = useState<string | null>(null)
  const [showCreds, setShowCreds] = useState(!hasSavedCreds)

  function forgetCreds() {
    localStorage.removeItem(sshCredsKey(node.host))
    setSshUser(''); setSshKey(''); setSshPass('')
    setUseKey(false); setShowCreds(true)
  }

  async function enqueue(user: string, key: string | undefined, pass: string | undefined, scriptName: string) {
    // Persist to localStorage so next open is pre-filled
    localStorage.setItem(sshCredsKey(node.host), JSON.stringify({
      user, ...(key ? { keyPath: key } : { password: pass }),
    }))
    // Persist key path server-side too
    await fetch(`/api/nodes/update/${encodeURIComponent(node.host)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sshUser: user, ...(key ? { sshKeyPath: key } : {}) }),
    }).catch(() => {})
    const res = await fetch('/api/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NodeProvisionerAgent',
        queue: 'default',
        input: {
          action: 'run',
          host: node.host,
          user,
          scriptName: scriptName.replace(/\.kts$/, ''),
          ...(key ? { keyPath: key } : { password: pass }),
        },
      }),
    })
    return res.json()
  }

  async function handleRun() {
    if (!script) return
    const user = sshUser || ''
    const key  = useKey ? sshKey : undefined
    const pass = !useKey ? sshPass : undefined
    if (!user || (useKey ? !key : !pass)) return
    setRunning(true)
    try {
      const data = await enqueue(user, key, pass, script)
      if (data.ok) { setJobId(data.jobId); setShowCreds(false) }
      else setShowCreds(true)
    } catch {}
    setRunning(false)
  }

  const canRun = !!(script && sshUser && (useKey ? sshKey : sshPass))

  const credsLabel = saved
    ? `${saved.user} · ${saved.keyPath ? saved.keyPath : '●●●●'}`
    : `${node.sshUser} · ${node.sshKeyPath}`

  return createPortal(
    <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box node-run-modal">
        <div className="modal-header">
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Run en <code style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 12 }}>{node.host}</code>
          </span>
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        {jobId ? (
          <div className="node-run-modal-body">
            <div className="run-modal-result ok">
              Job encolado — <code style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{jobId}</code>
            </div>
          </div>
        ) : (
          <div className="node-run-modal-body">
            <div className="run-modal-field">
              <label className="run-modal-label">Agente</label>
              {agents.length === 0
                ? <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sin agentes registrados</span>
                : <select className="node-run-select" value={script} onChange={e => setScript(e.target.value)} autoFocus>
                    {agents.map(a => <option key={a} value={a}>{a.replace(/\.kts$/, '')}</option>)}
                  </select>
              }
            </div>

            {/* Compact saved-creds row */}
            {hasSavedCreds && !showCreds && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 10, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  SSH: <code style={{ fontFamily: 'var(--mono)' }}>{credsLabel}</code>
                </span>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                    onClick={() => setShowCreds(true)}>cambiar</button>
                  <button style={{ fontSize: 10, background: 'none', border: 'none', color: 'var(--danger, #f87171)', cursor: 'pointer' }}
                    onClick={forgetCreds}>olvidar</button>
                </div>
              </div>
            )}

            {/* Full creds form */}
            {showCreds && (
              <>
                <div className="run-modal-field">
                  <label className="run-modal-label">Usuario SSH</label>
                  <input className="modal-input" value={sshUser} onChange={e => setSshUser(e.target.value)} placeholder="pi" />
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
              </>
            )}
          </div>
        )}

        <div className="node-run-modal-footer">
          {jobId ? (
            <>
              <button className="node-action-btn" onClick={onClose}>Cerrar</button>
              <button className="node-action-btn node-action-primary"
                onClick={() => {
                  setSelectedJob({ queue: 'default', id: jobId! })
                  onClose()
                  navigate('/jobs')
                }}>
                Ver job →
              </button>
            </>
          ) : (
            <>
              <button className="node-action-btn" onClick={onClose}>Cancelar</button>
              <button className="node-action-btn node-action-primary" onClick={handleRun} disabled={running || !canRun}>
                <Play size={11} style={{ display: 'inline', marginRight: 4 }} />
                {running ? 'Conectando SSH…' : 'Run'}
              </button>
            </>
          )}
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
        input: {
          action: 'uninstall',
          host: node.host,
          user: node.sshUser || 'pi',
          ...(node.sshKeyPath ? { keyPath: node.sshKeyPath } : {}),
        },
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
                <span>Rol: <strong>{node.role}</strong></span>
              </div>
            )}
            {node.workspacePath && (
              <div className="node-meta-row" title={node.workspacePath}>
                <FolderOpen size={13} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {node.workspacePath}
                </span>
              </div>
            )}
            {node.agents.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {node.agents.map(a => {
                    const name = a.replace(/\.kts$/, '')
                    const info = AGENT_INFO[name]
                    return (
                      <span key={a} title={info?.desc ?? name} style={{
                        fontSize: 10, padding: '2px 7px', borderRadius: 4,
                        background: 'rgba(99,179,237,0.10)', color: 'var(--accent)',
                        fontFamily: 'var(--mono)', cursor: 'default'
                      }}>
                        {info?.label ?? name}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}
            {node.registeredAt && (
              <div className="node-meta-row" style={{ marginTop: 6 }}>
                <Clock size={13} />
                <span>Visto {timeAgo(node.registeredAt)}</span>
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
