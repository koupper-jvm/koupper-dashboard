import type { Agent } from '../types/api'

const COLORS = ['#56d364', '#79c0ff', '#d2a8ff', '#e3b341', '#6ee7b7']

interface Props {
  agents: Agent[]
  onView: (name: string) => void
  onRun: (name: string) => void
}

export function AgentsList({ agents, onView, onRun }: Props) {
  if (agents.length === 0) {
    return <div className="empty">No agents installed</div>
  }

  return (
    <div className="agents-list">
      {agents.map((agent, i) => (
        <div key={agent.name} className="agent-item">
          <div
            className="agent-dot"
            style={{ background: COLORS[i % COLORS.length], boxShadow: `0 0 6px ${COLORS[i % COLORS.length]}` }}
          />
          <div className="agent-info" onClick={() => onView(agent.name)}>
            <div className="agent-name">{agent.name}</div>
            {agent.description && (
              <div className="agent-desc">{agent.description}</div>
            )}
          </div>
          <button
            className="run-btn"
            onClick={() => onRun(agent.name)}
            title="Run agent"
          >
            ▶
          </button>
        </div>
      ))}
    </div>
  )
}
