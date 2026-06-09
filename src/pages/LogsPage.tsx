import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
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
        <div className="page-header">
          <h1 className="page-title">Logs</h1>
        </div>
        <div className="search-box" style={{ margin: '0 0 12px' }}>
          <Search size={14} />
          <input placeholder="Filter jobs…" value={filter} onChange={e => setFilter(e.target.value)} />
        </div>
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
        <LogViewer log={log} title={selectedJob?.id ?? ''} />
      </div>
    </div>
  )
}
