import { useState, useEffect } from 'react'
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

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

function initEnvValues(agent: Agent): Record<string, string> {
  const vals: Record<string, string> = {}
  for (const v of agent.envVars ?? []) {
    vals[v.name] = v.defaultValue ?? ''
  }
  return vals
}

export function AgentDetailPanel({ agent, sourceCode, onClose }: Props) {
  const [envValues, setEnvValues] = useState<Record<string, string>>(() => initEnvValues(agent))
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle')
  const [submitMsg, setSubmitMsg] = useState('')
  const rate = parseFloat(agent.metrics?.successRate ?? '100')
  const hasEnvVars = (agent.envVars?.length ?? 0) > 0

  useEffect(() => {
    setEnvValues(initEnvValues(agent))
    setSubmitStatus('idle')
    setSubmitMsg('')
  }, [agent.name])

  async function handleRun(e: React.FormEvent) {
    e.preventDefault()
    const missing = (agent.envVars ?? []).filter(v => v.required && !envValues[v.name]?.trim())
    if (missing.length > 0) {
      setSubmitStatus('error')
      setSubmitMsg(`Required: ${missing.map(v => v.name).join(', ')}`)
      return
    }

    setSubmitStatus('loading')
    setSubmitMsg('')

    const env: Record<string, string> = {}
    for (const [k, v] of Object.entries(envValues)) {
      if (v.trim()) env[k] = v.trim()
    }

    try {
      const res = await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${agent.name}.kts`, queue: 'default', env }),
      })
      if (!res.ok) {
        const text = await res.text()
        setSubmitStatus('error')
        setSubmitMsg(text || `HTTP ${res.status}`)
      } else {
        setSubmitStatus('success')
        setSubmitMsg('Agent queued successfully')
        setTimeout(() => setSubmitStatus('idle'), 3000)
      }
    } catch (err: unknown) {
      setSubmitStatus('error')
      setSubmitMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

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

        {/* ── Configure & Run ── */}
        <div className="adp-section adp-run-section">
          <div className="adp-section-title">Configure &amp; Run</div>
          <form onSubmit={handleRun} className="adp-run-form">
            {hasEnvVars ? (
              <div className="adp-env-form">
                {(agent.envVars ?? []).map(v => (
                  <div key={v.name} className="adp-env-field">
                    <label className="adp-env-label">
                      <span className="adp-env-varname">{v.name}</span>
                      {v.required
                        ? <span className="adp-required">required</span>
                        : <span className="adp-optional">optional</span>
                      }
                    </label>
                    {v.description && (
                      <div className="adp-env-hint">{v.description}</div>
                    )}
                    <input
                      className="adp-env-input"
                      type={
                        v.name.toLowerCase().includes('token') || v.name.toLowerCase().includes('secret')
                          ? 'password'
                          : 'text'
                      }
                      value={envValues[v.name] ?? ''}
                      placeholder={v.defaultValue ?? ''}
                      onChange={e => setEnvValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="adp-no-config">No configuration required — this agent runs without env vars.</p>
            )}

            <div className="adp-run-footer">
              <button
                type="submit"
                className={`adp-run-btn ${submitStatus}`}
                disabled={submitStatus === 'loading'}
              >
                {submitStatus === 'loading' ? '◌ Queuing…' : '▶ Run Agent'}
              </button>
              {submitStatus === 'success' && (
                <span className="adp-run-feedback adp-run-ok">✓ {submitMsg}</span>
              )}
              {submitStatus === 'error' && (
                <span className="adp-run-feedback adp-run-err">✗ {submitMsg}</span>
              )}
            </div>
          </form>
        </div>

        {/* ── Setup ── */}
        {agent.setup && agent.setup.length > 0 && (
          <div className="adp-section">
            <div className="adp-section-title">Setup</div>
            <ol className="adp-setup-list">
              {agent.setup.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        )}

      </div>
    </div>
  )
}
