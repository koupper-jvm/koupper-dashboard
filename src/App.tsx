import { useState } from 'react'
import { useSSE } from './hooks/useSSE'
import { useLogPoller } from './hooks/useLogPoller'
import { useResize } from './hooks/useResize'
import { useVerticalResize } from './hooks/useVerticalResize'
import { Header } from './components/Header'
import { MetricsBar } from './components/MetricsBar'
import { ObservabilityBar } from './components/ObservabilityBar'
import { JobsPanel } from './components/JobsPanel'
import { LogViewer } from './components/LogViewer'
import { AgentDetailPanel } from './components/AgentDetailPanel'
import { AgentsList } from './components/AgentsList'
import { SchedulesList } from './components/SchedulesList'
import { CortexChat } from './components/CortexChat'
import type { Agent } from './types/api'
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
  const { chatPct, startVDrag, containerRef } = useVerticalResize(48)

  const [selectedJob,   setSelectedJob]   = useState<{ queue: string; id: string } | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<{ agent: Agent; source: string } | null>(null)
  const [logTitle,      setLogTitle]      = useState('Log')
  const log = useLogPoller(selectedJob)

  const metrics   = snapshot?.metrics      ?? EMPTY_METRICS
  const obs       = snapshot?.observability ?? EMPTY_OBS
  const jobs      = snapshot?.jobs         ?? []
  const agents    = snapshot?.agents       ?? []
  const schedules = snapshot?.schedules    ?? []

  function handleJobSelect(job: { queue: string; id: string }) {
    setSelectedAgent(null)
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
    const agentMeta = agents.find(a => a.name === name)
    if (!agentMeta) return
    fetch(`/api/agent/${name}`)
      .then(r => r.json())
      .then(data => {
        setSelectedJob(null)
        setSelectedAgent({ agent: agentMeta, source: data.content ?? '' })
      })
      .catch(() => {})
  }

  function handleCloseAgent() {
    setSelectedAgent(null)
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

        {/* ── Middle: Log or Agent Detail ── */}
        <div className="panel-col" style={{ width: midW }}>
          {selectedAgent
            ? <AgentDetailPanel
                agent={selectedAgent.agent}
                sourceCode={selectedAgent.source}
                onClose={handleCloseAgent}
              />
            : <LogViewer log={log} title={logTitle} />
          }
        </div>

        <div className="resize-handle" onMouseDown={startDrag('mr')} />

        {/* ── Right: Sidebar (vertically resizable) ── */}
        <div className="panel-col sidebar" ref={containerRef}>

          {/* Chat — resizable height */}
          <div style={{ height: `${chatPct}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 160 }}>
            <CortexChat onJobSelect={handleJobSelect} />
          </div>

          {/* Vertical resize handle */}
          <div className="resize-handle-v" onMouseDown={startVDrag} />

          {/* Agents + Schedules — remaining height */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div className="sidebar-section" style={{ flex: 1, maxHeight: 'none' }}>
              <div className="panel-header">
                Agents <span className="panel-count">({agents.length})</span>
              </div>
              <AgentsList
                agents={agents}
                selectedAgent={selectedAgent?.agent.name ?? null}
                onView={handleViewAgent}
                onRun={handleRunAgent}
              />
            </div>

            {schedules.length > 0 && (
              <div className="sidebar-section" style={{ maxHeight: '30%' }}>
                <div className="panel-header">
                  Schedules <span className="panel-count">({schedules.length})</span>
                </div>
                <SchedulesList schedules={schedules} />
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  )
}
