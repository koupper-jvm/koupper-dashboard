import { useState } from 'react'
import type { Job, JobStatus } from '../types/api'

type Filter = 'all' | 'active' | 'done' | 'failed'

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

function applyFilter(jobs: Job[], filter: Filter): Job[] {
  switch (filter) {
    case 'active':  return jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PENDING')
    case 'done':    return jobs.filter(j => j.status === 'DONE')
    case 'failed':  return jobs.filter(j => j.status === 'FAILED' || j.status === 'DEAD')
    default:        return jobs
  }
}

export function JobsPanel({ jobs, selectedJob, onSelect }: Props) {
  const [filter, setFilter] = useState<Filter>('all')
  const visible = applyFilter(jobs, filter)

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
            {visible.length === 0 ? (
              <tr><td colSpan={5} className="empty">— no jobs —</td></tr>
            ) : visible.map(j => {
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
          </tbody>
        </table>
      </div>
    </div>
  )
}
