import { useState } from 'react'
import type { Job, JobStatus } from '../types/api'

type Filter = 'all' | 'active' | 'done' | 'failed'
type ActionState = 'idle' | 'loading' | 'ok' | 'error'

interface Props {
  jobs: Job[]
  selectedJob: { queue: string; id: string } | null
  onSelect: (job: { queue: string; id: string }) => void
}

const STATUS_COLOR: Record<JobStatus, string> = {
  PROCESSING: 'var(--purple)',
  PENDING: 'var(--yellow)',
  DONE: 'var(--green)',
  FAILED: 'var(--red)',
  DEAD: 'var(--muted)',
}

const DOT_COLOR: Record<JobStatus, string> = {
  PROCESSING: 'var(--purple)',
  PENDING: '#2a2a4a',
  DONE: 'var(--green)',
  FAILED: 'var(--red)',
  DEAD: 'var(--muted)',
}

function applyFilter(jobs: Job[], filter: Filter): Job[] {
  switch (filter) {
    case 'active':  return jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING')
    case 'done':    return jobs.filter(j => j.status === 'DONE')
    case 'failed':  return jobs.filter(j => j.status === 'FAILED' || j.status === 'DEAD')
    default:        return jobs
  }
}

function pipelineOverallStatus(steps: Job[]): JobStatus {
  if (steps.some(j => j.status === 'DEAD'))       return 'DEAD'
  if (steps.some(j => j.status === 'FAILED'))     return 'FAILED'
  if (steps.some(j => j.status === 'PROCESSING')) return 'PROCESSING'
  if (steps.some(j => j.status === 'PENDING'))    return 'PENDING'
  return 'DONE'
}

interface PipelineGroupProps {
  pipelineId: string
  steps: Job[]
  selectedJob: { queue: string; id: string } | null
  onSelect: (job: { queue: string; id: string }) => void
}

function PipelineGroup({ pipelineId, steps, selectedJob, onSelect }: PipelineGroupProps) {
  const [collapsed, setCollapsed] = useState(false)
  const sorted = [...steps].sort((a, b) => (a.pipelineStep ?? 0) - (b.pipelineStep ?? 0))
  const total  = sorted[0]?.pipelineTotal ?? sorted.length
  const overall = pipelineOverallStatus(sorted)
  const doneCount = sorted.filter(j => j.status === 'DONE').length

  // Build dots array covering all declared steps (fill gaps with PENDING)
  const dots = Array.from({ length: total }, (_, i) => {
    return sorted.find(s => s.pipelineStep === i)?.status ?? 'PENDING' as JobStatus
  })

  return (
    <>
      <tr className="pipeline-group-header" onClick={() => setCollapsed(c => !c)}>
        <td colSpan={5}>
          <div className="pipeline-header-inner">
            <span className="pipeline-chevron">{collapsed ? '▶' : '▼'}</span>
            <span className="pipeline-icon">⟶</span>
            <span className="pipeline-name" title={pipelineId}>{pipelineId}</span>
            <div className="pipeline-dots">
              {dots.map((s, i) => (
                <span
                  key={i}
                  className={`pdot ${s === 'PROCESSING' ? 'pdot-pulse' : ''}`}
                  style={{ background: DOT_COLOR[s as JobStatus] }}
                  title={`step ${i}: ${s}`}
                />
              ))}
            </div>
            <span className="pipeline-progress" style={{ color: STATUS_COLOR[overall] }}>
              {doneCount}/{total}
            </span>
            <span className="pipeline-status-badge" style={{ color: STATUS_COLOR[overall] }}>
              {overall}
            </span>
          </div>
        </td>
      </tr>
      {!collapsed && sorted.map(j => {
        const key = `${j.queue}:${j.id}`
        const isSelected = selectedJob && `${selectedJob.queue}:${selectedJob.id}` === key
        return (
          <tr
            key={key}
            className={`pipeline-step-row ${isSelected ? 'selected' : ''}`}
            onClick={e => { e.stopPropagation(); onSelect({ queue: j.queue, id: j.id }) }}
          >
            <td className="job-id">
              <span className="step-marker">└ [{j.pipelineStep ?? '?'}]</span>
              <span title={j.id}>{j.id}</span>
            </td>
            <td className="muted">{j.queue}</td>
            <td>
              <span
                className={`status-badge ${j.status === 'PROCESSING' ? 'pulse' : ''}`}
                style={{ color: STATUS_COLOR[j.status] }}
              >
                {j.status}
              </span>
            </td>
            <td className="muted">{j.time || ''}</td>
            <td className="result-cell" title={j.result ?? ''}>
              {j.result
                ? <span style={{ color: 'var(--green)' }}>{j.result.substring(0, 50)}{j.result.length > 50 ? '…' : ''}</span>
                : <span className="muted">—</span>
              }
            </td>
          </tr>
        )
      })}
    </>
  )
}

async function postJobAction(path: string, body: object): Promise<{ ok: boolean; requeued?: number; purged?: number; error?: string }> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  return res.json()
}

export function JobsPanel({ jobs, selectedJob, onSelect }: Props) {
  const [filter, setFilter]       = useState<Filter>('all')
  const [search, setSearch]       = useState('')
  const [retryState, setRetry]    = useState<ActionState>('idle')
  const [purgeState, setPurge]    = useState<ActionState>('idle')
  const [actionMsg, setActionMsg] = useState('')

  async function handleRetry() {
    setRetry('loading'); setActionMsg('')
    try {
      const data = await postJobAction('/api/jobs/retry', {})
      setRetry(data.ok ? 'ok' : 'error')
      setActionMsg(data.ok ? `↩ ${data.requeued ?? 0} job(s) re-queued` : data.error ?? 'error')
    } catch {
      setRetry('error'); setActionMsg('Network error')
    }
    setTimeout(() => { setRetry('idle'); setActionMsg('') }, 3000)
  }

  async function handlePurgeDead() {
    setPurge('loading'); setActionMsg('')
    try {
      const data = await postJobAction('/api/jobs/purge', { bucket: 'dead' })
      setPurge(data.ok ? 'ok' : 'error')
      setActionMsg(data.ok ? `✗ ${data.purged ?? 0} dead job(s) purged` : data.error ?? 'error')
    } catch {
      setPurge('error'); setActionMsg('Network error')
    }
    setTimeout(() => { setPurge('idle'); setActionMsg('') }, 3000)
  }

  const filtered = applyFilter(jobs, filter)
  const visible = search.trim()
    ? filtered.filter(j =>
        j.id.toLowerCase().includes(search.toLowerCase()) ||
        j.queue.toLowerCase().includes(search.toLowerCase()) ||
        (j.pipelineId ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : filtered

  // Separate pipeline jobs and individual jobs
  const pipelineMap = new Map<string, Job[]>()
  const individualJobs: Job[] = []

  visible.forEach(j => {
    if (j.pipelineId) {
      const group = pipelineMap.get(j.pipelineId) ?? []
      group.push(j)
      pipelineMap.set(j.pipelineId, group)
    } else {
      individualJobs.push(j)
    }
  })

  const isEmpty = pipelineMap.size === 0 && individualJobs.length === 0

  const failedCount = jobs.filter(j => j.status === 'FAILED').length
  const deadCount   = jobs.filter(j => j.status === 'DEAD').length

  return (
    <div className="jobs-panel">
      <div className="panel-header">
        <span>Jobs</span>
        <div className="filter-row">
          {(['all', 'active', 'done', 'failed'] as Filter[]).map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {(failedCount > 0 || deadCount > 0) && (
        <div className="jobs-actions-row">
          {failedCount > 0 && (
            <button
              className={`job-action-btn retry-btn ${retryState !== 'idle' ? retryState : ''}`}
              disabled={retryState === 'loading'}
              onClick={handleRetry}
            >
              {retryState === 'loading' ? '◌' : retryState === 'ok' ? '✓' : retryState === 'error' ? '✗' : `↩ Retry Failed (${failedCount})`}
            </button>
          )}
          {deadCount > 0 && (
            <button
              className={`job-action-btn purge-btn ${purgeState !== 'idle' ? purgeState : ''}`}
              disabled={purgeState === 'loading'}
              onClick={handlePurgeDead}
            >
              {purgeState === 'loading' ? '◌' : purgeState === 'ok' ? '✓' : purgeState === 'error' ? '✗' : `☠ Purge Dead (${deadCount})`}
            </button>
          )}
          {actionMsg && <span className="job-action-msg">{actionMsg}</span>}
        </div>
      )}
      <div className="jobs-search-row">
        <input
          className="jobs-search-input"
          type="text"
          placeholder="Search by ID, queue, or pipeline…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && (
          <button className="jobs-search-clear" onClick={() => setSearch('')}>×</button>
        )}
      </div>
      <div className="jobs-scroll">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Queue</th>
              <th>Status</th>
              <th>Time</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {isEmpty ? (
              <tr><td colSpan={5} className="empty">— no jobs —</td></tr>
            ) : (
              <>
                {/* Pipeline groups */}
                {Array.from(pipelineMap.entries()).map(([pid, steps]) => (
                  <PipelineGroup
                    key={pid}
                    pipelineId={pid}
                    steps={steps}
                    selectedJob={selectedJob}
                    onSelect={onSelect}
                  />
                ))}

                {/* Separator between pipelines and individual jobs */}
                {pipelineMap.size > 0 && individualJobs.length > 0 && (
                  <tr className="pipeline-separator">
                    <td colSpan={5}><div className="separator-line" /></td>
                  </tr>
                )}

                {/* Individual jobs */}
                {individualJobs.map(j => {
                  const key = `${j.queue}:${j.id}`
                  const isSelected = selectedJob && `${selectedJob.queue}:${selectedJob.id}` === key
                  return (
                    <tr
                      key={key}
                      className={isSelected ? 'selected' : ''}
                      onClick={() => onSelect({ queue: j.queue, id: j.id })}
                    >
                      <td className="job-id" title={j.id}>{j.id}</td>
                      <td className="muted">{j.queue}</td>
                      <td>
                        <span
                          className={`status-badge ${j.status === 'PROCESSING' ? 'pulse' : ''}`}
                          style={{ color: STATUS_COLOR[j.status] }}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="muted">{j.time || ''}</td>
                      <td className="result-cell" title={j.result ?? ''}>
                        {j.result
                          ? <span style={{ color: 'var(--green)' }}>{j.result.substring(0, 60)}{j.result.length > 60 ? '…' : ''}</span>
                          : <span className="muted">—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
