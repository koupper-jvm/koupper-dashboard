import { Activity, CheckCircle2, Clock, XCircle, Zap, Cpu, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Job } from '../types/api'

function StatusCard({ icon: Icon, label, value, sub, color, onClick }: {
  icon: React.ElementType; label: string; value: string | number
  sub?: string; color: string; onClick?: () => void
}) {
  return (
    <div
      className={`ov-card${onClick ? ' ov-card-clickable' : ''}`}
      onClick={onClick}
    >
      <div className="ov-card-icon" style={{ color, background: `${color}18` }}>
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="ov-card-body">
        <div className="ov-card-value">{value}</div>
        <div className="ov-card-label">{label}</div>
        {sub && <div className="ov-card-sub">{sub}</div>}
      </div>
    </div>
  )
}

function elapsedSince(hhmmss: string): string {
  try {
    const [hh, mm, ss] = hhmmss.split(':').map(Number)
    if ([hh, mm, ss].some(isNaN)) return ''
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss)
    const diffMs = now.getTime() - start.getTime()
    if (diffMs < 0) return ''
    const totalSec = Math.floor(diffMs / 1000)
    const totalMin = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    if (totalMin < 60) return `${totalMin}m ${sec}s`
    const hrs = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    return `${hrs}h ${mins}m`
  } catch {
    return ''
  }
}

function JobRow({ job }: { job: Job }) {
  const colors: Record<string, string> = {
    PROCESSING: '#4f6ef7', DONE: '#10d68e', FAILED: '#f04455',
    PENDING: '#f59e0b', DEAD: '#6e7681',
  }
  const color = colors[job.status] ?? '#6e7681'
  const resultSnippet = job.result ? String(job.result).slice(0, 60) : null
  const elapsed = elapsedSince(job.time)
  return (
    <div className="ov-job-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="ov-job-dot" style={{ background: color }} />
        <span className="ov-job-id">{job.id}</span>
        <span className="ov-job-queue">{job.queue}</span>
        <span className="ov-job-status" style={{ color }}>{job.status}</span>
        <span className="ov-job-time" title={`Started at ${job.time}`}>🕐 {job.time}</span>
        {job.status === 'PROCESSING' && elapsed && (
          <span className="job-card-elapsed" title="Time running since job started">⏱ running {elapsed}</span>
        )}
      </div>
      {job.pipelineTotal && (
        <div className="job-card-pipeline" style={{ margin: '2px 20px 0' }}>
          <div className="job-pipeline-bar">
            <div className="job-pipeline-fill"
              style={{ width: `${((job.pipelineStep ?? 0) / job.pipelineTotal) * 100}%`, background: color }} />
          </div>
          <span className="job-pipeline-label">{job.pipelineStep}/{job.pipelineTotal}</span>
        </div>
      )}
      {resultSnippet && (
        <div className="job-card-result" style={{ marginLeft: 20 }}>{resultSnippet}</div>
      )}
    </div>
  )
}

export function OverviewPage() {
  const { snapshot, nodes } = useApp()
  const navigate = useNavigate()
  const metrics = snapshot?.metrics ?? { pending: 0, processing: 0, done: 0, failed: 0 }
  const obs = snapshot?.observability
  const jobs = snapshot?.jobs ?? []
  const agents = snapshot?.agents ?? []
  const tokens = snapshot?.tokenMetrics
  const nodesOnline = nodes.filter(n => n.status === 'ready').length

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <div className="page-time">{snapshot?.time ?? '—'}</div>
      </div>
      <p className="page-desc">Real-time snapshot of your CORTEX swarm — active jobs, agent health, and system throughput.</p>

      {/* Metrics row */}
      <div className="ov-cards">
        <StatusCard icon={Activity}    label="Processing"   value={metrics.processing} color="#4f6ef7"
          onClick={() => navigate('/jobs?filter=PROCESSING')} />
        <StatusCard icon={Clock}       label="Pending"      value={metrics.pending}    color="#f59e0b"
          onClick={() => navigate('/jobs?filter=PENDING')} />
        <StatusCard icon={CheckCircle2}label="Done"         value={metrics.done}       color="#10d68e"
          onClick={() => navigate('/jobs?filter=DONE')} />
        <StatusCard icon={XCircle}     label="Failed"       value={metrics.failed}     color="#f04455"
          onClick={() => navigate('/jobs?filter=FAILED')} />
        <StatusCard icon={Cpu}         label="Agents"       value={agents.length}      color="#a78bfa"
          onClick={() => navigate('/agents')} />
        <StatusCard icon={Zap}         label="Nodes online" value={nodesOnline}        color="#34d399"
          sub={nodes.length > 0 ? `${nodes.length} total` : undefined}
          onClick={() => navigate('/nodes')} />
      </div>

      {/* Observability + Tokens */}
      {obs && (
        <div className="ov-row">
          <div className="ov-section">
            <div className="section-title">Observability</div>
            <div className="ov-obs-grid">
              <div className="ov-obs-item">
                <div className="ov-obs-val">{obs.jobsPerMin}</div>
                <div className="ov-obs-key">jobs/min</div>
              </div>
              <div className="ov-obs-item">
                <div className="ov-obs-val" style={{ color: parseFloat(obs.successRate) > 95 ? '#10d68e' : '#f04455' }}>
                  {obs.successRate}%
                </div>
                <div className="ov-obs-key">success rate</div>
              </div>
              <div className="ov-obs-item">
                <div className="ov-obs-val">{obs.p50Ms}<span className="ov-obs-unit">ms</span></div>
                <div className="ov-obs-key">p50 latency</div>
              </div>
              <div className="ov-obs-item">
                <div className="ov-obs-val">{obs.p95Ms}<span className="ov-obs-unit">ms</span></div>
                <div className="ov-obs-key">p95 latency</div>
              </div>
            </div>
            {/* Sparkline */}
            <div className="ov-sparkline">
              {obs.sparkline.map(([, v], i) => (
                <div key={i} className="ov-spark-bar"
                  style={{ height: `${Math.max(4, (v / (Math.max(...obs.sparkline.map(s => s[1])) || 1)) * 40)}px` }} />
              ))}
            </div>
          </div>

          {tokens && tokens.byProvider.length > 0 && (
            <div className="ov-section">
              <div className="section-title"><TrendingUp size={13} style={{ marginRight: 6 }} />LLM Tokens</div>
              <div className="ov-tokens">
                {tokens.byProvider.map(p => (
                  <div key={p.provider} className="ov-token-row">
                    <span className="ov-token-provider">{p.provider}</span>
                    <div className="ov-token-bar-wrap">
                      <div className="ov-token-bar"
                        style={{ width: `${(p.total / (tokens.total.total || 1)) * 100}%` }} />
                    </div>
                    <span className="ov-token-count">{p.total.toLocaleString()}</span>
                  </div>
                ))}
                <div className="ov-token-total">Total: {tokens.total.total.toLocaleString()} tokens</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Live jobs */}
      <div className="ov-section">
        <div className="section-title">Live Jobs</div>
        {jobs.length === 0
          ? <div className="empty-state">No active jobs</div>
          : <div className="ov-jobs">{jobs.map(j => <JobRow key={j.id} job={j} />)}</div>
        }
      </div>
    </div>
  )
}
