import { useState, useEffect } from 'react'
import { Search, Play, Eye, Download, Star, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { AgentDetailPanel } from '../components/AgentDetailPanel'
import { AgentViewer } from '../components/AgentViewer'
import type { Agent, RegistryAgent } from '../types/api'

type Tab = 'installed' | 'browse'
type InstallState = 'idle' | 'installing' | 'ok' | 'error'

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null
  const colors: Record<string, string> = {
    Orchestrator: '#a78bfa', Indexer: '#34d399', Summarizer: '#60a5fa',
    Bridge: '#fb923c', Monitor: '#f59e0b', Provisioner: '#10d68e',
  }
  const color = colors[role] ?? '#6e7681'
  return <span className="role-badge" style={{ color, background: `${color}18`, borderColor: `${color}33` }}>{role}</span>
}

const TAG_COLORS: Record<string, string> = {
  llm: '#d2a8ff', mcp: '#79c0ff', cortex: '#56d364', telegram: '#58a6ff',
  inference: '#e3b341', bridge: '#6ee7b7', channel: '#6ee7b7', messaging: '#6ee7b7',
  filesystem: '#ffa657', monitoring: '#f59e0b', webhook: '#fb923c',
  scheduler: '#a78bfa', worker: '#60a5fa', provisioner: '#10d68e',
  database: '#4ade80', api: '#38bdf8', voice: '#e879f9', email: '#fb7185',
  ssh: '#94a3b8', docker: '#2dd4bf', aws: '#f97316', github: '#8b949e',
  indexer: '#34d399', summarizer: '#60a5fa', orchestrator: '#a78bfa',
}

function TagPill({ label }: { label: string }) {
  const color = TAG_COLORS[label.toLowerCase()] ?? '#6e7681'
  return (
    <span className="tag-pill" style={{ color, borderColor: `${color}55`, background: `${color}14` }}>
      {label}
    </span>
  )
}

function InstalledCard({ agent, onView, onRun }: {
  agent: Agent; onView: (n: string) => void; onRun: (n: string) => void
}) {
  const name = agent.name.replace(/\.kts$/, '')
  return (
    <div className={`agent-card ${agent.running ? 'agent-card-running' : ''}`}>
      <div className="agent-card-header">
        <div className="agent-card-title-row">
          <span className="agent-card-name">{name}</span>
          {agent.running && <span className="running-pill">● running</span>}
          {agent.persistent && <span className="persistent-pill">persistent</span>}
        </div>
        <RoleBadge role={agent.role} />
      </div>
      {agent.description && (
        <p className="agent-card-desc">{agent.description}</p>
      )}
      {agent.tags && agent.tags.length > 0 && (
        <div className="agent-card-tags">
          {agent.tags.slice(0, 5).map(t => <TagPill key={t} label={t} />)}
        </div>
      )}
      {agent.metrics && (
        <div className="agent-card-metrics">
          <span>{agent.metrics.totalRuns} runs</span>
          <span style={{ color: '#10d68e' }}>{agent.metrics.successRate}% OK</span>
          <span>{agent.metrics.lastRun}</span>
        </div>
      )}
      <div className="agent-card-actions">
        <button className="btn-ghost" onClick={() => onView(name)}><Eye size={14} /> View</button>
        <button className="btn-primary" onClick={() => onRun(name)}><Play size={14} /> Run</button>
      </div>
    </div>
  )
}

function MarketplaceCard({ agent, onInstall, state }: {
  agent: RegistryAgent; onInstall: (a: RegistryAgent) => void; state: InstallState
}) {
  return (
    <div className="agent-card marketplace-card">
      <div className="agent-card-header">
        <div className="agent-card-title-row">
          <span className="agent-card-name">{agent.name}</span>
          <span className="version-pill">v{agent.version}</span>
        </div>
        <RoleBadge role={agent.role} />
      </div>
      <p className="agent-card-desc">{agent.description || 'No description.'}</p>
      {agent.tags.length > 0 && (
        <div className="agent-card-tags">
          {agent.tags.slice(0, 6).map(t => <TagPill key={t} label={t} />)}
        </div>
      )}
      <div className="agent-card-footer">
        <span className="agent-author"><Star size={11} /> {agent.author}</span>
        {agent.persistent && <span className="persistent-pill">persistent</span>}
        <button
          className={`btn-install ${state === 'ok' ? 'btn-installed' : state === 'error' ? 'btn-install-error' : ''}`}
          onClick={() => state === 'idle' && onInstall(agent)}
          disabled={state !== 'idle'}
        >
          {state === 'installing' && <><RefreshCw size={13} className="spin" /> Installing…</>}
          {state === 'ok'         && <><CheckCircle2 size={13} /> Installed</>}
          {state === 'error'      && 'Error — retry'}
          {state === 'idle'       && <><Download size={13} /> Install</>}
        </button>
      </div>
    </div>
  )
}

export function AgentsPage() {
  const { snapshot } = useApp()
  const [tab, setTab] = useState<Tab>('installed')
  const [query, setQuery] = useState('')
  const [registry, setRegistry] = useState<RegistryAgent[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState<Record<string, InstallState>>({})
  const [viewingAgent, setViewingAgent] = useState<{ agent: Agent; source: string } | null>(null)
  const [detailTab, setDetailTab] = useState<'info' | 'code'>('info')

  const agents = snapshot?.agents ?? []

  useEffect(() => {
    if (tab === 'browse' && registry.length === 0) {
      setLoading(true)
      fetch('/api/marketplace').then(r => r.json()).then(d => {
        setRegistry(d.agents ?? [])
        setLoading(false)
      }).catch(() => setLoading(false))
    }
  }, [tab])

  function handleView(name: string) {
    const clean = name.replace(/\.kts$/, '')
    const agent = agents.find(a => a.name.replace(/\.kts$/, '') === clean)
    if (!agent) return
    fetch(`/api/agent/${clean}`).then(r => r.json()).then(d => {
      setViewingAgent({ agent, source: d.content ?? '' })
      setDetailTab('info')
    }).catch(() => {})
  }

  async function handleRun(name: string) {
    await fetch('/api/run-agent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, queue: 'default' }),
    }).catch(() => {})
  }

  async function handleInstall(agent: RegistryAgent) {
    setInstalling(s => ({ ...s, [agent.name]: 'installing' }))
    try {
      const res = await fetch('/api/install-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillUrl: agent.skillUrl, name: agent.name }),
      })
      setInstalling(s => ({ ...s, [agent.name]: res.ok ? 'ok' : 'error' }))
    } catch {
      setInstalling(s => ({ ...s, [agent.name]: 'error' }))
    }
  }

  const installedNames = new Set(agents.map(a => a.name.replace(/\.kts$/, '')))

  const lq = query.toLowerCase()
  const filteredInstalled = agents.filter(a =>
    !lq || a.name.toLowerCase().includes(lq) || a.role?.toLowerCase().includes(lq) ||
    a.tags?.some(t => t.toLowerCase().includes(lq))
  )
  const filteredRegistry = registry.filter(a =>
    !lq || a.name.toLowerCase().includes(lq) || a.role.toLowerCase().includes(lq) ||
    a.tags.some(t => t.toLowerCase().includes(lq))
  )

  return (
    <div className={viewingAgent ? 'page agents-page-split' : 'page'}>
      <div className="page-header">
        <h1 className="page-title">Agents</h1>
        <div className="search-box">
          <Search size={15} />
          <input
            placeholder={tab === 'installed' ? `Search ${agents.length} installed agents…` : 'Search marketplace…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && <button onClick={() => setQuery('')}>×</button>}
        </div>
      </div>
      <p className="page-desc">Automate tasks with installed agents or discover new ones in the marketplace.</p>

      <div className="tab-bar">
        <button className={`tab-btn tab-installed ${tab === 'installed' ? 'active' : ''}`} onClick={() => setTab('installed')}>
          Installed <span className="tab-count tab-count-installed">{agents.length}</span>
        </button>
        <button className={`tab-btn tab-marketplace ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>
          Marketplace {registry.length > 0 && <span className="tab-count tab-count-marketplace">{registry.length}</span>}
          {registry.length === 0 && tab !== 'browse' && <span className="tab-count tab-count-marketplace">···</span>}
        </button>
      </div>

      {/* Fullscreen code overlay */}
      {viewingAgent && detailTab === 'code' && (
        <div className="code-fullscreen">
          <AgentViewer
            name={viewingAgent.agent.name.replace(/\.kts$/, '')}
            content={viewingAgent.source}
            onClose={() => setDetailTab('info')}
          />
        </div>
      )}

      {tab === 'installed' && (
        viewingAgent ? (
          <div className="agents-split">
            <div className="agents-split-list">
              {filteredInstalled.length === 0
                ? <div className="empty-state">No agents found</div>
                : filteredInstalled.map(a => (
                    <InstalledCard key={a.name} agent={a} onView={handleView} onRun={handleRun} />
                  ))
              }
            </div>
            <div className="agents-split-detail">
              <div className="agents-detail-tabs">
                <button
                  className={detailTab === 'info' ? 'active' : ''}
                  onClick={() => setDetailTab('info')}
                >Info</button>
                <button
                  className={detailTab === 'code' ? 'active' : ''}
                  onClick={() => setDetailTab('code')}
                >Code</button>
                <button className="agents-detail-close" onClick={() => setViewingAgent(null)}>✕</button>
              </div>
              <div className="agents-split-detail-body">
                <AgentDetailPanel
                  agent={viewingAgent.agent}
                  sourceCode={viewingAgent.source}
                  onClose={() => setViewingAgent(null)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="agents-grid">
            {filteredInstalled.length === 0
              ? <div className="empty-state">No agents found</div>
              : filteredInstalled.map(a => (
                  <InstalledCard key={a.name} agent={a} onView={handleView} onRun={handleRun} />
                ))
            }
          </div>
        )
      )}

      {tab === 'browse' && (
        loading
          ? <div className="empty-state"><RefreshCw size={20} className="spin" /> Loading marketplace…</div>
          : <div className="agents-grid">
              {filteredRegistry.map(a => (
                <MarketplaceCard key={a.name} agent={a}
                  onInstall={handleInstall}
                  state={installing[a.name] ?? (installedNames.has(a.name.replace(/\.kts$/, '')) ? 'ok' : 'idle')} />
              ))}
            </div>
      )}
    </div>
  )
}
