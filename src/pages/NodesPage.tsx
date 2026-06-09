import { useState } from 'react'
import { Server, Wifi, WifiOff, Bot, Clock, Plus, Play, Trash2, X } from 'lucide-react'
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

function RunScriptInput({ node, onClose }: { node: NodeInfo; onClose: () => void }) {
  const [script, setScript] = useState('')
  const [running, setRunning] = useState(false)

  async function handleRun() {
    if (!script.trim()) return
    setRunning(true)
    try {
      await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'NodeProvisionerAgent',
          queue: 'default',
          env: {
            NODE_HOST: node.host,
            NODE_ACTION: 'run',
            NODE_SCRIPT: script.trim(),
          },
        }),
      })
    } catch {
      // ignore
    }
    setRunning(false)
    onClose()
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 6 }}>
      <input
        className="modal-input"
        style={{ flex: 1, fontSize: 11 }}
        placeholder="agent-name.kts"
        value={script}
        onChange={e => setScript(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleRun(); if (e.key === 'Escape') onClose() }}
        autoFocus
      />
      <button className="node-action-btn" onClick={handleRun} disabled={running || !script.trim()}>
        {running ? '…' : 'Run'}
      </button>
      <button className="node-action-btn" onClick={onClose}>✕</button>
    </div>
  )
}

function NodeCard({ node, onProvision: _onProvision }: { node: NodeInfo; onProvision: () => void }) {
  const isReady = node.status === 'ready'
  const isOff = node.status === 'uninstalled'
  const [showRunInput, setShowRunInput] = useState(false)

  async function handleUninstall() {
    await fetch('/api/run-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'NodeProvisionerAgent',
        queue: 'default',
        env: {
          NODE_HOST: node.host,
          NODE_ACTION: 'uninstall',
        },
      }),
    }).catch(() => {})
  }

  return (
    <div className={`node-card ${isReady ? 'node-card-ready' : 'node-card-off'}`}>
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

      {isReady && (
        <div className="node-card-actions">
          <button className="node-action-btn" onClick={() => setShowRunInput(v => !v)}>
            <Play size={11} style={{ display: 'inline', marginRight: 4 }} />Run script
          </button>
          <button className="node-action-btn node-action-danger" onClick={handleUninstall}>
            <Trash2 size={11} style={{ display: 'inline', marginRight: 4 }} />Uninstall
          </button>
        </div>
      )}

      {isReady && showRunInput && (
        <RunScriptInput node={node} onClose={() => setShowRunInput(false)} />
      )}
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
            <div className="nodes-arch-title">How remote execution works</div>
            <div className="nodes-arch-body">
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">⬡</span>
                <div><strong>Provision</strong> — NodeProvisionerAgent connects via SSH, uploads the koupper JARs (~300MB) to the node, and starts the daemon on port 9998.</div>
              </div>
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">⚡</span>
                <div><strong>Execute</strong> — Scripts run on the node's own koupper daemon. The SSH provider can call <code>ssh.exec("koupper run agent.kts")</code> to dispatch work remotely.</div>
              </div>
              <div className="nodes-arch-item">
                <span className="nodes-arch-icon">◈</span>
                <div><strong>Coordinate</strong> — Nodes report status back to CORTEX central via <code>CORTEX_CENTRAL_URL</code>. Each node is independently capable of running any installed agent.</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
