import { useState } from 'react'
import { Search, FileText, MousePointerClick } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useLogStream } from '../hooks/useLogStream'
import { LogViewer } from '../components/LogViewer'

export function LogsPage() {
  const { snapshot, selectedJob, setSelectedJob } = useApp()
  const [filter, setFilter] = useState('')
  const log = useLogStream(selectedJob)

  const jobs = snapshot?.jobs ?? []
  const filtered = jobs.filter(j =>
    !filter || j.id.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="page page-split">
      <div className="jobs-list-col">
        <h2 className="col-title">Logs</h2>
        <div className="search-box col-search">
          <Search size={14} />
          <input placeholder="Filter jobs…" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
        <div className="jobs-count">{filtered.length} job{filtered.length !== 1 ? 's' : ''} matching</div>
        <div className="jobs-cards">
          {filtered.length === 0
            ? <div className="empty-state"><FileText size={20} /> No jobs</div>
            : filtered.map(j => (
                <div key={j.id}
                  className={`log-job-row ${selectedJob?.id === j.id ? 'log-job-selected' : ''}`}
                  onClick={() => setSelectedJob({ queue: j.queue, id: j.id })}
                >
                  <span className={`log-job-dot status-${j.status.toLowerCase()}`} />
                  <div className="log-job-info">
                    <span className="log-job-id">{j.id}</span>
                    <span className="log-job-queue">{j.queue}</span>
                  </div>
                  <span className="log-job-time">{j.time}</span>
                </div>
              ))
          }
        </div>
      </div>
      <div className="jobs-log-col">
        <div className="page-header">
          <h1 className="page-title">{selectedJob?.id ?? 'Select a job'}</h1>
        </div>
        {selectedJob
          ? <LogViewer log={log} title={selectedJob.id} />
          : (
            <div className="empty-state" style={{ flex: 1, flexDirection: 'column', gap: 12 }}>
              <MousePointerClick size={32} strokeWidth={1.4} style={{ color: 'var(--muted-2)' }} />
              <span>Select a job to view its logs</span>
            </div>
          )
        }
      </div>
    </div>
  )
}
