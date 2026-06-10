import { useRef, useEffect, useState, Component, type ReactNode, type ErrorInfo } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(e: Error) { return { error: e } }
  componentDidCatch(e: Error, info: ErrorInfo) { console.error('[ErrorBoundary]', e, info) }
  render() {
    if (this.state.error) return (
      <div style={{ padding: 32, color: '#ff007a', fontFamily: 'var(--mono)', fontSize: 13 }}>
        <div style={{ marginBottom: 8, fontWeight: 700 }}>Error de renderizado</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: 'var(--text-secondary)' }}>
          {(this.state.error as Error).message}
        </pre>
        <button style={{ marginTop: 16, padding: '6px 14px', background: 'var(--border)', border: 'none', color: 'var(--text)', borderRadius: 6, cursor: 'pointer' }}
          onClick={() => this.setState({ error: null })}>
          Reintentar
        </button>
      </div>
    )
    return this.props.children
  }
}
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
import { ProvidersPage } from './pages/ProvidersPage'
import { SetupPage }     from './pages/SetupPage'
import './index.css'

function Shell() {
  const { snapshot, chatOpen, setChatOpen, setSelectedJob, voiceMuted, toggleMute } = useApp()
  const navigate = useNavigate()

  useEffect(() => {
    if (!snapshot) return
    if (window.location.pathname === '/setup') return
    fetch('/api/setup/status')
      .then(r => r.json())
      .then((s: any) => { if (!s.complete) navigate('/setup') })
      .catch(() => {})
  }, [snapshot])
  const voiceRef = useRef<VoiceHandle>(null)

  function handleToggleMute() {
    if (voiceMuted) {
      // Unmuting — stop any playing audio
    } else {
      voiceRef.current?.stop?.()
    }
    toggleMute()
  }

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
            <button
              className={`topbar-mute-btn ${voiceMuted ? 'muted' : ''}`}
              onClick={handleToggleMute}
              title={voiceMuted ? 'Voice muted — click to enable' : 'Click to mute voice'}
            >
              {voiceMuted ? '🔇' : '🔊'}
            </button>
            <VoiceWave ref={voiceRef} greeting="CORTEX en línea." />
            <span className="topbar-time">{snapshot?.time ?? '—'}</span>
          </div>
        </div>

        {/* Main content */}
        <div className="content-area">
          <ErrorBoundary>
            <Routes>
              <Route path="/"         element={<OverviewPage />} />
              <Route path="/jobs"     element={<JobsPage />} />
              <Route path="/agents"   element={<AgentsPage />} />
              <Route path="/nodes"     element={<NodesPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/calendar"  element={<CalendarPage />} />
              <Route path="/logs"     element={<LogsPage />} />
              <Route path="/setup"    element={<SetupPage />} />
            </Routes>
          </ErrorBoundary>
        </div>
      </div>

      {/* Chat panel — always mounted so poll/state survive open/close */}
      <div className={`chat-panel${chatOpen ? '' : ' chat-panel-hidden'}`}>
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
    </div>
  )
}

export default function App() {
  const { snapshot } = useSSE()
  const [nodesTick, setNodesTick] = useState(0)
  const nodes = useNodes(nodesTick)
  const refreshNodes = () => setNodesTick(t => t + 1)

  return (
    <AppProvider snapshot={snapshot} nodes={nodes} refreshNodes={refreshNodes}>
      <Shell />
    </AppProvider>
  )
}
