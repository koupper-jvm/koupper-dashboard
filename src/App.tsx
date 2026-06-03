import { useState } from 'react'
import { useSSE } from './hooks/useSSE'
import { useLogPoller } from './hooks/useLogPoller'
import { useResize } from './hooks/useResize'
import { Header } from './components/Header'
import { MetricsBar } from './components/MetricsBar'
import { ObservabilityBar } from './components/ObservabilityBar'
import { JobsPanel } from './components/JobsPanel'
import { LogViewer } from './components/LogViewer'
import { AgentViewer } from './components/AgentViewer'
import { AgentsList } from './components/AgentsList'
import { SchedulesList } from './components/SchedulesList'
import { CortexChat } from './components/CortexChat'
import './index.css'

const EMPTY_METRICS = { pending: 0, processing: 0, done: 0, failed: 0 }
const EMPTY_OBS = {
  jobsPerMin: '0.00', successRate: '100.0',
  p50Ms: 0, p95Ms: 0,
  totalLastHour: 0, doneLastHour: 0, failedLastHour: 0,
  sparkline: Array(12).fill([0, 0]) as [number, number][],
}

export default function App() {
  const { snapshot, status } = useSSE()
  const { leftW, midW, startDrag } = useResize(350, 420)

  const [selectedJob, setSelectedJob] = useState<{ queue: string; id: string } | null>(null)
  const [agentView,   setAgentView]   = useState<{ name: string; content: string } | null>(null)
  const [logTitle,    setLogTitle]    = useState('Log')
  const log = useLogPoller(selectedJob)

  const metrics   = snapshot?.metrics      ?? EMPTY_METRICS
  const obs       = snapshot?.observability ?? EMPTY_OBS
  const jobs      = snapshot?.jobs         ?? []
  const agents    = snapshot?.agents       ?? []
  const schedules = snapshot?.schedules    ?? []

  function handleJobSelect(job: { queue: string; id: string }) {
    setAgentView(null)
    setSelectedJob(job)
    setLogTitle(job.id)
  }

  async function handleRunAgent(name: string) {
    try {
      await fetch('/api/run-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, queue: 'default' }),
      })
    } catch {}
  }

  function handleViewAgent(name: string) {
    fetch(`/api/agent/${name}`)
      .then(r => r.json())
      .then(data => {
        if (data.content) {
          setSelectedJob(null)
          setAgentView({ name, content: data.content })
        }
      })
      .catch(() => {})
  }

  function handleCloseAgentView() {
    setAgentView(null)
    setLogTitle('Log')
  }

  return (
    <div className="app">
      <Header status={status} cortexActive={snapshot?.cortexActive ?? false} />
      <MetricsBar metrics={metrics} agentCount={agents.length} scheduleCount={schedules.length} />
      <ObservabilityBar obs={obs} />

      <div className="main-layout">

        {/* ── Left: Jobs ── */}
        <div className="panel-col" style={{ width: leftW }}>
          <JobsPanel jobs={jobs} selectedJob={selectedJob} onSelect={handleJobSelect} />
        </div>

        <div className="resize-handle" onMouseDown={startDrag('lm')} />

        {/* ── Middle: Log or Agent source ── */}
        <div className="panel-col" style={{ width: midW }}>
          {agentView
            ? <AgentViewer name={agentView.name} content={agentView.content} onClose={handleCloseAgentView} />
            : <LogViewer log={log} title={logTitle} />
          }
        </div>

        <div className="resize-handle" onMouseDown={startDrag('mr')} />

        {/* ── Right: Sidebar ── */}
        <div className="panel-col sidebar">
          <CortexChat onJobSelect={handleJobSelect} />

          <div className="sidebar-section">
            <div className="panel-header">
              Available Agents <span className="panel-count">({agents.length})</span>
            </div>
            <AgentsList agents={agents} onView={handleViewAgent} onRun={handleRunAgent} />
          </div>

          <div className="sidebar-section">
            <div className="panel-header">
              Schedules <span className="panel-count">({schedules.length})</span>
            </div>
            <SchedulesList schedules={schedules} />
          </div>
        </div>

      </div>
    </div>
  )
}
