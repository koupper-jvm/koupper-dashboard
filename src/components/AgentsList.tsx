import { useEffect, useState } from 'react'
import type { Agent, RegistryAgent, AgentRegistry } from '../types/api'

const TAG_COLORS: Record<string, string> = {
  llm: '#d2a8ff', mcp: '#79c0ff', cortex: '#56d364', telegram: '#58a6ff',
  inference: '#e3b341', bridge: '#6ee7b7', channel: '#6ee7b7',
  default: '#8b949e',
}

const SKIP_NAMES = new Set([
  'HelloWorld', 'HelloWorldAgent', 'HolaAgent', 'FinalWin', 'FreshStart',
  'PruebaFinal', 'SuperFast', 'hello_manual', 'LlmTest',
])

interface Props {
  agents: Agent[]
  selectedAgent: string | null
  onView: (name: string) => void
  onRun: (name: string) => void
  query?: string
}

function scoreAgent(agent: Agent, query: string): number {
  if (!query) return 1
  const q = query.toLowerCase().trim()
  const words = q.split(/\s+/)
  const name = (agent.name ?? '').toLowerCase().replace('.kts', '')
  const desc = (agent.description ?? '').toLowerCase()
  const role = (agent.role ?? '').toLowerCase()
  const tags = (agent.tags ?? []).map(t => t.toLowerCase()).join(' ')
  const combined = `${name} ${desc} ${role} ${tags}`

  if (name.includes(q)) return 100
  if (words.length <= 2) {
    let score = 0
    for (const w of words) {
      if (name.includes(w)) score += 40
      else if (role.includes(w)) score += 20
      else if (tags.includes(w)) score += 15
      else if (desc.includes(w)) score += 10
      else if (combined.includes(w)) score += 5
    }
    return score
  }
  let score = 0; let matched = 0
  for (const w of words) {
    if (w.length < 2) continue
    if (combined.includes(w)) {
      matched++
      if (name.includes(w)) score += 30
      else if (role.includes(w)) score += 15
      else if (tags.includes(w)) score += 12
      else score += 8
    }
  }
  if (matched === words.length) score += 20
  return score
}

type Tab = 'installed' | 'browse'
type InstallState = 'idle' | 'installing' | 'ok' | 'error'

export function AgentsList({ agents, selectedAgent, onView, onRun, query = '' }: Props) {
  const [showAll, setShowAll]   = useState(false)
  const [tab, setTab]           = useState<Tab>('installed')
  const [registry, setRegistry] = useState<RegistryAgent[] | null>(null)
  const [regError, setRegError] = useState('')
  const [regLoading, setRegLoading] = useState(false)
  const [installing, setInstalling] = useState<Record<string, InstallState>>({})

  useEffect(() => {
    if (tab !== 'browse' || registry !== null) return
    setRegLoading(true)
    setRegError('')
    fetch('/api/marketplace')
      .then(r => r.json())
      .then((data: AgentRegistry | { ok: false; error: string }) => {
        if ('ok' in data && !data.ok) {
          setRegError((data as { ok: false; error: string }).error ?? 'Registry unavailable')
        } else {
          setRegistry((data as AgentRegistry).agents ?? [])
        }
      })
      .catch(() => setRegError('Network error — check connection'))
      .finally(() => setRegLoading(false))
  }, [tab, registry])

  async function handleInstall(agent: RegistryAgent) {
    setInstalling(prev => ({ ...prev, [agent.name]: 'installing' }))
    try {
      const res = await fetch('/api/install-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: agent.url }),
      })
      const data = await res.json() as { ok: boolean }
      setInstalling(prev => ({ ...prev, [agent.name]: data.ok ? 'ok' : 'error' }))
    } catch {
      setInstalling(prev => ({ ...prev, [agent.name]: 'error' }))
    }
  }

  const installedNames = new Set(agents.map(a => a.name.replace('.kts', '')))

  // ── Installed tab ──────────────────────────────────────────────────────────

  const filtered = agents.filter(a => {
    const base = a.name.replace('.kts', '')
    if (SKIP_NAMES.has(base)) return false
    if (!a.description && !a.role && (a.tags ?? []).length === 0) return showAll
    return true
  })

  const searched = query.trim()
    ? filtered
        .map(a => ({ agent: a, score: scoreAgent(a, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ agent }) => agent)
    : filtered

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="agents-list">
      <div className="agents-tabs">
        <button
          className={`agents-tab-btn ${tab === 'installed' ? 'active' : ''}`}
          onClick={() => setTab('installed')}
        >
          Installed {agents.length > 0 && <span className="agents-tab-count">{filtered.length}</span>}
        </button>
        <button
          className={`agents-tab-btn ${tab === 'browse' ? 'active' : ''}`}
          onClick={() => setTab('browse')}
        >
          Browse
        </button>
      </div>

      {/* ── Installed ── */}
      {tab === 'installed' && (
        <>
          {agents.length === 0 && <div className="empty">No agents installed</div>}
          {query.trim() && searched.length === 0 && (
            <div className="empty">No agents match "{query}"</div>
          )}
          {searched.map(agent => {
            const rate      = parseFloat(agent.metrics?.successRate ?? '100')
            const rateColor = rate >= 80 ? '#56d364' : rate >= 50 ? '#e3b341' : '#f85149'
            const isSelected = selectedAgent === agent.name

            return (
              <div
                key={agent.name}
                className={`agent-card ${isSelected ? 'agent-card-selected' : ''}`}
                onClick={() => onView(agent.name)}
              >
                <div className="agent-card-top">
                  <div className="agent-card-left">
                    <div className={`agent-status-dot ${agent.running ? 'running' : ''}`} />
                    <div>
                      <div className="agent-card-name">{agent.name.replace('.kts', '')}</div>
                      {agent.role && <div className="agent-card-role">{agent.role}</div>}
                    </div>
                  </div>
                  <button
                    className="run-btn"
                    onClick={e => { e.stopPropagation(); onRun(agent.name) }}
                    title="Run agent"
                  >▶</button>
                </div>

                {agent.description && (
                  <div className="agent-card-desc">{agent.description}</div>
                )}

                <div className="agent-card-footer">
                  <div className="agent-card-tags">
                    {(agent.tags ?? []).slice(0, 3).map(t => (
                      <span key={t} className="agent-card-tag"
                        style={{ color: TAG_COLORS[t] ?? TAG_COLORS.default }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  {(agent.metrics?.totalRuns ?? 0) > 0 && (
                    <div className="agent-card-stats">
                      <span style={{ color: rateColor }}>{agent.metrics!.successRate}%</span>
                      <span className="agent-card-runs">{agent.metrics!.totalRuns} runs</span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          {!query.trim() && agents.length > filtered.length && (
            <button className="show-all-btn" onClick={() => setShowAll(s => !s)}>
              {showAll ? '▲ Less' : `▼ +${agents.length - filtered.length} more`}
            </button>
          )}
        </>
      )}

      {/* ── Browse ── */}
      {tab === 'browse' && (
        <>
          {regLoading && <div className="empty">Loading registry…</div>}
          {regError  && <div className="empty" style={{ color: '#f85149' }}>✗ {regError}</div>}
          {!regLoading && !regError && registry && registry.map(agent => {
            const alreadyInstalled = installedNames.has(agent.name)
            const state = installing[agent.name] ?? 'idle'

            return (
              <div key={agent.name} className="agent-card registry-card">
                <div className="agent-card-top">
                  <div className="agent-card-left">
                    <div>
                      <div className="agent-card-name">{agent.name}</div>
                      {agent.role && <div className="agent-card-role">{agent.role} · v{agent.version}</div>}
                    </div>
                  </div>
                  {alreadyInstalled ? (
                    <span className="registry-installed-badge">✓ installed</span>
                  ) : state === 'ok' ? (
                    <span className="registry-installed-badge">✓ done</span>
                  ) : state === 'error' ? (
                    <span className="registry-error-badge">✗ failed</span>
                  ) : (
                    <button
                      className="registry-install-btn"
                      disabled={state === 'installing'}
                      onClick={() => handleInstall(agent)}
                    >
                      {state === 'installing' ? '◌' : '↓ Install'}
                    </button>
                  )}
                </div>

                {agent.description && (
                  <div className="agent-card-desc">{agent.description}</div>
                )}

                <div className="agent-card-footer">
                  <div className="agent-card-tags">
                    {agent.tags.slice(0, 4).map(t => (
                      <span key={t} className="agent-card-tag"
                        style={{ color: TAG_COLORS[t] ?? TAG_COLORS.default }}>
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="registry-author">{agent.author}</span>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
