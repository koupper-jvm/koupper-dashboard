import { useRef } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useSSE } from './hooks/useSSE'
import { useNodes } from './hooks/useNodes'
import { AppProvider, useApp } from './context/AppContext'
import { Sidebar } from './components/Sidebar'
import { CortexChat } from './components/CortexChat'
import type { VoiceHandle } from './components/VoiceWave'
import { VoiceWave } from './components/VoiceWave'
import { OverviewPage }  from './pages/OverviewPage'
import { JobsPage }      from './pages/JobsPage'
import { AgentsPage }    from './pages/AgentsPage'
import { NodesPage }     from './pages/NodesPage'
import { CalendarPage }  from './pages/CalendarPage'
import { LogsPage }      from './pages/LogsPage'
import './index.css'

function Shell() {
  const { snapshot } = useApp()
  const { chatOpen, setChatOpen, setSelectedJob } = useApp()
  const voiceRef = useRef<VoiceHandle>(null)

  return (
    <div className="shell">
      <Sidebar />

      <div className="shell-body">
        {/* Top status bar */}
        <div className="topbar">
          <div className="topbar-left">
            <span className={`topbar-status ${snapshot ? 'status-online' : 'status-offline'}`}>
              {snapshot ? '● live' : '○ connecting'}
            </span>
            {snapshot?.cortexActive && (
              <span className="topbar-cortex">CORTEX active</span>
            )}
          </div>
          <div className="topbar-right">
            <VoiceWave ref={voiceRef} />
            <span className="topbar-time">{snapshot?.time ?? '—'}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="content-area">
          <Routes>
            <Route path="/"         element={<OverviewPage />} />
            <Route path="/jobs"     element={<JobsPage />} />
            <Route path="/agents"   element={<AgentsPage />} />
            <Route path="/nodes"    element={<NodesPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/logs"     element={<LogsPage />} />
          </Routes>
        </div>
      </div>

      {/* Chat panel */}
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span className="chat-panel-title">CORTEX Chat</span>
            <button className="chat-panel-close" onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-panel-body">
            <CortexChat
              onJobSelect={j => setSelectedJob(j)}
              onSpeak={t => voiceRef.current?.speak(t)}
              onStop={() => voiceRef.current?.stop()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { snapshot } = useSSE()
  const nodes = useNodes()

  return (
    <AppProvider snapshot={snapshot} nodes={nodes}>
      <Shell />
    </AppProvider>
  )
}
