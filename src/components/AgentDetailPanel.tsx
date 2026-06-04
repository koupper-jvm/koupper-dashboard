import { useState } from 'react'
import { RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import type { Agent } from '../types/api'

interface Props {
  agent: Agent
  sourceCode: string
  onClose: () => void
}

const TAG_COLORS: Record<string, string> = {
  llm: '#d2a8ff', mcp: '#79c0ff', cortex: '#56d364', telegram: '#58a6ff',
  inference: '#e3b341', bridge: '#6ee7b7', channel: '#6ee7b7', messaging: '#6ee7b7',
  filesystem: '#ffa657', default: '#8b949e',
}

function tagColor(tag: string) {
  return TAG_COLORS[tag] ?? TAG_COLORS.default
}

function SuccessDonut({ rate }: { rate: number }) {
  const data = [{ value: rate, fill: rate >= 80 ? '#56d364' : rate >= 50 ? '#e3b341' : '#f85149' }]
  return (
    <div style={{ position: 'relative', width: 72, height: 72 }}>
      <RadialBarChart
        width={72} height={72}
        cx={36} cy={36}
        innerRadius={22} outerRadius={34}
        startAngle={90} endAngle={-270}
        data={data}
        barSize={8}
      >
        <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
        <RadialBar background={{ fill: '#21262d' }} dataKey="value" angleAxisId={0} cornerRadius={4} />
      </RadialBarChart>
      <span style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        fontSize: 11, fontWeight: 700,
        color: rate >= 80 ? '#56d364' : rate >= 50 ? '#e3b341' : '#f85149',
      }}>
        {rate.toFixed(0)}%
      </span>
    </div>
  )
}

export function AgentDetailPanel({ agent, sourceCode, onClose }: Props) {
  const [showSource, setShowSource] = useState(false)
  const rate = parseFloat(agent.metrics?.successRate ?? '100')

  return (
    <div className="agent-detail-panel">

      {/* ── Header ── */}
      <div className="adp-header">
        <div className="adp-header-left">
          <div className={`adp-status-dot ${agent.running ? 'running' : 'idle'}`} />
          <div>
            <div className="adp-name">{agent.name}</div>
            {agent.role && <div className="adp-role">{agent.role}</div>}
          </div>
        </div>
        <div className="adp-header-right">
          <span className={`adp-badge ${agent.running ? 'badge-running' : 'badge-idle'}`}>
            {agent.running ? '⬤ RUNNING' : '○ IDLE'}
          </span>
          {agent.persistent && <span className="adp-badge badge-persistent">PERSISTENT</span>}
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
      </div>

      {/* ── Tags ── */}
      {agent.tags && agent.tags.length > 0 && (
        <div className="adp-tags">
          {agent.tags.map(t => (
            <span key={t} className="adp-tag" style={{ borderColor: tagColor(t), color: tagColor(t) }}>
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="adp-body">

        {/* ── Description ── */}
        {agent.description && (
          <div className="adp-section">
            <p className="adp-desc">{agent.description}</p>
          </div>
        )}

        {/* ── Metrics ── */}
        {agent.metrics && (
          <div className="adp-section">
            <div className="adp-section-title">Metrics</div>
            <div className="adp-metrics-row">
              <SuccessDonut rate={rate} />
              <div className="adp-metrics-grid">
                <div className="adp-metric">
                  <span className="adp-metric-val">{agent.metrics.totalRuns}</span>
                  <span className="adp-metric-lbl">Total Runs</span>
                </div>
                <div className="adp-metric">
                  <span className="adp-metric-val" style={{ color: '#56d364' }}>{agent.metrics.successRuns}</span>
                  <span className="adp-metric-lbl">Success</span>
                </div>
                <div className="adp-metric">
                  <span className="adp-metric-val" style={{ color: '#f85149' }}>{agent.metrics.failedRuns}</span>
                  <span className="adp-metric-lbl">Failed</span>
                </div>
                {agent.metrics.lastRun && (
                  <div className="adp-metric" style={{ gridColumn: 'span 3' }}>
                    <span className="adp-metric-lbl">Last run: </span>
                    <span className="adp-metric-val" style={{ fontSize: 11 }}>
                      {agent.metrics.lastRun.replace('T', ' ').slice(0, 16)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Triggers ── */}
        {agent.triggers && agent.triggers.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Triggers</div>
            <div className="adp-chips">
              {agent.triggers.map(t => <span key={t} className="adp-chip">{t}</span>)}
            </div>
          </div>
        )}

        {/* ── Providers ── */}
        {agent.providers && agent.providers.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Providers</div>
            <div className="adp-chips">
              {agent.providers.map(p => <span key={p} className="adp-chip adp-chip-purple">{p}</span>)}
            </div>
          </div>
        )}

        {/* ── Requires ── */}
        {agent.requires && agent.requires.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Requires</div>
            {agent.requires.map((r, i) => (
              <div key={i} className="adp-require-item">⚡ {r}</div>
            ))}
          </div>
        )}

        {/* ── Env Vars ── */}
        {agent.envVars && agent.envVars.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Environment Variables</div>
            <table className="adp-env-table">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Required</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {agent.envVars.map(v => (
                  <tr key={v.name}>
                    <td className="adp-env-name">{v.name}</td>
                    <td>
                      <span className={v.required ? 'adp-required' : 'adp-optional'}>
                        {v.required ? 'required' : 'optional'}
                      </span>
                    </td>
                    <td className="adp-env-desc">{v.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Setup ── */}
        {agent.setup && agent.setup.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Setup</div>
            <ol className="adp-setup-list">
              {agent.setup.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        )}

        {/* ── Source toggle ── */}
        <div className="adp-section">
          <button className="adp-source-toggle" onClick={() => setShowSource(s => !s)}>
            {showSource ? '▾' : '▸'} Source code
          </button>
          {showSource && (
            <pre className="adp-source-code">{sourceCode}</pre>
          )}
        </div>

      </div>
    </div>
  )
}
