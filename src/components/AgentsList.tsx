import { useState } from 'react'
import type { Agent } from '../types/api'

const TAG_COLORS: Record<string, string> = {
  llm: '#d2a8ff', mcp: '#79c0ff', cortex: '#56d364', telegram: '#58a6ff',
  inference: '#e3b341', bridge: '#6ee7b7', channel: '#6ee7b7',
  default: '#8b949e',
}

// Agents that are test/scratch files with no real purpose
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

  // Exact match in name gets highest score
  if (name.includes(q)) return 100
  // Single word: keyword match
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
  // Multi-word: fuzzy keyword matching
  let score = 0
  let matched = 0
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
  // Bonus for matching most words
  if (matched === words.length) score += 20
  return score
}

export function AgentsList({ agents, selectedAgent, onView, onRun, query = '' }: Props) {
  const [showAll, setShowAll] = useState(false)

  const filtered = agents.filter(a => {
    const base = a.name.replace('.kts', '')
    if (SKIP_NAMES.has(base)) return false
    if (!a.description && !a.role && (a.tags ?? []).length === 0) return showAll
    return true
  })

  // Apply search query
  const searched = query.trim()
    ? filtered
        .map(a => ({ agent: a, score: scoreAgent(a, query) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ agent }) => agent)
    : filtered

  if (agents.length === 0) {
    return <div className="empty">No agents installed</div>
  }

  if (query.trim() && searched.length === 0) {
    return <div className="empty">No agents match "{query}"</div>
  }

  return (
    <div className="agents-list">
      {searched.map(agent => {
        const rate     = parseFloat(agent.metrics?.successRate ?? '100')
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

      {/* Toggle to show all including scratch agents */}
      {!query.trim() && agents.length > filtered.length && (
        <button className="show-all-btn" onClick={() => setShowAll(s => !s)}>
          {showAll ? '▲ Less' : `▼ +${agents.length - filtered.length} more`}
        </button>
      )}
    </div>
  )
}
