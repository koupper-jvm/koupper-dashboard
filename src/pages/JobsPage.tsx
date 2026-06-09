import { useState, useEffect } from 'react'
import { Trash2, RotateCcw } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLogStream } from '../hooks/useLogStream'
import { LogViewer } from '../components/LogViewer'
import type { Job } from '../types/api'

const STATUS_COLOR: Record<string, string> = {
  PROCESSING: '#4f6ef7', DONE: '#10d68e', FAILED: '#f04455',
  PENDING: '#f59e0b', DEAD: '#6e7681',
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

function JobCard({ job, selected, onClick }: {
  job: Job; selected: boolean; onClick: () => void
}) {
  const color = STATUS_COLOR[job.status] ?? '#6e7681'
  const resultSnippet = job.result ? String(job.result).slice(0, 80) : null
  return (
    <div className={`job-card ${selected ? 'job-card-selected' : ''}`} onClick={onClick}>
      <div className="job-card-top">
        <span className="job-card-dot" style={{ background: color }} />
        <span className="job-card-id">{job.id}</span>
        <span className="job-card-status" style={{ color }}>{job.status}</span>
      </div>
      <div className="job-card-meta">
        <span className="job-card-queue" title="Queue">⬡ {job.queue}</span>
        <span className="job-card-time" title={`Started at ${job.time}`}>🕐 {job.time}</span>
        {job.status === 'PROCESSING' && elapsedSince(job.time) && (
          <span className="job-card-elapsed" title="Time running since job started">⏱ running {elapsedSince(job.time)}</span>
        )}
      </div>
      {job.pipelineTotal && (
        <div className="job-card-pipeline">
          <div className="job-pipeline-bar">
            <div className="job-pipeline-fill"
              style={{ width: `${((job.pipelineStep ?? 0) / job.pipelineTotal) * 100}%`, background: color }} />
          </div>
          <span className="job-pipeline-label">{job.pipelineStep}/{job.pipelineTotal}</span>
        </div>
      )}
      {resultSnippet && (
        <div className="job-card-result">{resultSnippet}</div>
      )}
    </div>
  )
}

export function JobsPage() {
  const { snapshot, selectedJob, setSelectedJob } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<string>(() => searchParams.get('filter') ?? 'all')
  const log = useLogStream(selectedJob)

  // Sync filter state when URL param changes (e.g. navigated from Overview cards)
  useEffect(() => {
    const param = searchParams.get('filter') ?? 'all'
    setFilter(param)
  }, [searchParams])

  const jobs = snapshot?.jobs ?? []
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  async function retryJob() {
    if (!selectedJob) return
    await fetch('/api/jobs/retry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob.id, queue: selectedJob.queue }),
    }).catch(() => {})
  }

  async function purgeJob() {
    if (!selectedJob) return
    await fetch('/api/jobs/purge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob.id, queue: selectedJob.queue }),
    }).catch(() => {})
    setSelectedJob(null)
  }

  return (
    <div className="page page-split">
      {/* Left: job list */}
      <div className="jobs-list-col">
        <h2 className="col-title">Jobs</h2>
        <p className="col-desc">Job execution queue across all agents.</p>
        <div className="jobs-filter-pills">
          {['all','PROCESSING','PENDING','DONE','FAILED'].map(s => (
            <button key={s}
              className={`filter-pill ${filter === s ? 'active' : ''}`}
              style={filter === s && s !== 'all' ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}
              onClick={() => {
                setFilter(s)
                if (s === 'all') {
                  setSearchParams({})
                } else {
                  setSearchParams({ filter: s })
                }
              }}
            >{s === 'all' ? 'All' : s}</button>
          ))}
        </div>

        <div className="jobs-count" style={{ marginTop: 12 }}>{filtered.length} job{filtered.length !== 1 ? 's' : ''}</div>

        <div className="jobs-cards">
          {filtered.length === 0
            ? <div className="empty-state">No jobs matching filter</div>
            : filtered.map(j => (
                <JobCard key={j.id} job={j} selected={selectedJob?.id === j.id}
                  onClick={() => setSelectedJob({ queue: j.queue, id: j.id })} />
              ))
          }
        </div>
      </div>

      {/* Right: log viewer */}
      <div className="jobs-log-col">
        <div className="page-header">
          <h1 className="page-title">{selectedJob ? selectedJob.id : 'Log'}</h1>
          {selectedJob && (
            <div className="jobs-log-actions">
              <button className="icon-btn" title="Retry" onClick={retryJob}><RotateCcw size={15} /></button>
              <button className="icon-btn icon-btn-danger" title="Purge" onClick={purgeJob}><Trash2 size={15} /></button>
            </div>
          )}
        </div>
        <LogViewer log={log} title={selectedJob?.id ?? 'Log'} />
      </div>
    </div>
  )
}
