import { useState, useRef } from 'react'
import { useSSE } from './hooks/useSSE'
import { useLogPoller } from './hooks/useLogPoller'
import { useResize } from './hooks/useResize'
import { useVerticalResize } from './hooks/useVerticalResize'
import { Header } from './components/Header'
import type { VoiceHandle } from './components/VoiceWave'
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

type ColKey = 'left' | 'mid' | 'right'

export default function App() {
  const { snapshot, status } = useSSE()
  const voiceRef = useRef<VoiceHandle>(null)
  const { leftW, midW, startDrag } = useResize(350, 420)
  const { chatPct, startVDrag, containerRef } = useVerticalResize(48)

  const [selectedJob,   setSelectedJob]   = useState<{ queue: string; id: string } | null>(null)
  const [selectedAgent, setSelectedAgent] = useState<{ agent: Agent; source: string } | null>(null)
  const [logTitle,      setLogTitle]      = useState('Log')
  const [agentQuery,    setAgentQuery]    = useState('')

  // Collapsible columns state
  const [collapsed, setCollapsed] = useState<Record<ColKey, boolean>>({
    left: false, mid: false, right: false,
  })
  const log = useLogPoller(selectedJob)

  const metrics   = snapshot?.metrics      ?? EMPTY_METRICS
  const obs       = snapshot?.observability ?? EMPTY_OBS
  const jobs      = snapshot?.jobs         ?? []
  const agents    = snapshot?.agents       ?? []
  const schedules = snapshot?.schedules    ?? []

  function toggleCol(col: ColKey) {
    setCollapsed(prev => ({ ...prev, [col]: !prev[col] }))
  }

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
    const cleanName = name.replace(/\.kts$/, '')
    const agentMeta = agents.find(a => a.name === name || a.name === cleanName || a.name === `${cleanName}.kts`)
    if (!agentMeta) return
    fetch(`/api/agent/${cleanName}`)
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

  const allCollapsed = collapsed.left && collapsed.mid && collapsed.right

  function colStrip(key: ColKey, label: string) {
    return (
      <div className="col-strip" key={key} onClick={() => toggleCol(key)} title={`Expand ${label}`}>
        <span className="col-strip-label">{label}</span>
        <span className="col-strip-expand">+</span>
      </div>
    )
  }

  return (
    <div className="app">
      <Header status={status} cortexActive={snapshot?.cortexActive ?? false} voiceRef={voiceRef} />
      <MetricsBar metrics={metrics} agentCount={agents.length} scheduleCount={schedules.length} />
      <ObservabilityBar obs={obs} />

      <div className="main-layout">

        {allCollapsed ? (
          <div className="all-collapsed-center">
            <button className="collapsed-reopen-btn" onClick={() => toggleCol('left')}>Jobs</button>
            <button className="collapsed-reopen-btn" onClick={() => toggleCol('mid')}>Log</button>
            <button className="collapsed-reopen-btn" onClick={() => toggleCol('right')}>Chat</button>
          </div>
        ) : (
          <>
            {/* ── Left: Jobs ── */}
            {collapsed.left
              ? colStrip('left', 'JOBS')
              : (
                <div className="panel-col" style={{ width: leftW }}>
                  <div className="col-close-bar">
                    <span className="col-close-label">JOBS</span>
                    <button className="col-close-btn" onClick={() => toggleCol('left')} title="Collapse">×</button>
                  </div>
                  <JobsPanel jobs={jobs} selectedJob={selectedJob} onSelect={handleJobSelect} />
                </div>
              )
            }

            {!collapsed.left && !collapsed.mid && (
              <div className="resize-handle" onMouseDown={startDrag('lm')} />
            )}

            {/* ── Middle: Log or Agent Detail ── */}
            {collapsed.mid
              ? colStrip('mid', 'LOG')
              : (
                <div className="panel-col" style={{ width: midW }}>
                  <div className="col-close-bar">
                    <span className="col-close-label">{selectedAgent ? 'AGENT' : 'LOG'}</span>
                    <button className="col-close-btn" onClick={() => toggleCol('mid')} title="Collapse">×</button>
                  </div>
                  {selectedAgent
                    ? <AgentDetailPanel
                        agent={selectedAgent.agent}
                        sourceCode={selectedAgent.source}
                        onClose={handleCloseAgent}
                      />
                    : <LogViewer log={log} title={logTitle} />
                  }
                </div>
              )
            }

            {!collapsed.mid && !collapsed.right && (
              <div className="resize-handle" onMouseDown={startDrag('mr')} />
            )}

            {/* ── Right: Sidebar (vertically resizable) ── */}
            {collapsed.right
              ? colStrip('right', 'CHAT')
              : (
                <div className="panel-col sidebar" ref={containerRef}>
                  <div className="col-close-bar">
                    <span className="col-close-label">CORTEX</span>
                    <button className="col-close-btn" onClick={() => toggleCol('right')} title="Collapse">×</button>
                  </div>

                  {/* Chat — resizable height */}
                  <div style={{ height: `${chatPct}%`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 160 }}>
                    <CortexChat onJobSelect={handleJobSelect} onSpeak={t => voiceRef.current?.speak(t)} onStop={() => voiceRef.current?.stop()} />
                  </div>

                  {/* Vertical resize handle */}
                  <div className="resize-handle-v" onMouseDown={startVDrag} />

                  {/* Agents + Schedules — remaining height */}
                  <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div className="sidebar-section" style={{ flex: 1, maxHeight: 'none' }}>
                      <div className="panel-header">
                        <span>Agents <span className="panel-count">({agents.length})</span></span>
                      </div>
                      <div className="agent-search-row">
                        <input
                          className="agent-search-input"
                          type="text"
                          placeholder="Search agents…"
                          value={agentQuery}
                          onChange={e => setAgentQuery(e.target.value)}
                        />
                        {agentQuery && (
                          <button className="agent-search-clear" onClick={() => setAgentQuery('')}>×</button>
                        )}
                      </div>
                      <AgentsList
                        agents={agents}
                        selectedAgent={selectedAgent?.agent.name ?? null}
                        onView={handleViewAgent}
                        onRun={handleRunAgent}
                        query={agentQuery}
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
              )
            }
          </>
        )}
      </div>
    </div>
  )
}
