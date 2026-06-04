import { useRef, useState, useEffect } from 'react'

interface Message {
  role: 'user' | 'cortex'
  text: string
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

interface Props {
  onJobSelect: (job: { queue: string; id: string }) => void
}

const SESSIONS_KEY = 'cortex-chat-sessions'

function loadSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions))
}

function cleanLogLines(lines: string[]): string {
  return lines
    .map(l => l.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trimEnd())
    .filter(t => {
      const s = t.trimStart()
      return s.length > 0 &&
        !s.startsWith('▶') &&
        !s.startsWith('━') &&
        !s.startsWith('◈') &&
        !s.startsWith('CORTEX_TOOL:') &&
        !s.startsWith('Built-in') &&
        !s.startsWith('JOB_') &&
        !s.startsWith('[DEBUG]') &&
        !s.startsWith('[DONE]') &&
        !s.startsWith('[FAILED]') &&
        !s.startsWith('[Error:') &&
        !s.startsWith('→') &&
        !s.startsWith('↺') &&
        !s.startsWith('↳') &&
        !s.startsWith('⏳') &&
        !s.startsWith('External MCP') &&
        !s.startsWith('CORTEX ONLINE') &&
        !s.startsWith('Providers:') &&
        !s.startsWith('Tools:') &&
        !s.startsWith('Press Enter')
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function CortexChat({ onJobSelect }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [showHistory, setShowHistory] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(null)

  function scrollDown() {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

  // Save current session whenever messages change (if non-empty)
  useEffect(() => {
    if (messages.length === 0) return
    const all = loadSessions()
    const firstUser = messages.find(m => m.role === 'user')
    const title = firstUser
      ? firstUser.text.substring(0, 30) + (firstUser.text.length > 30 ? '…' : '')
      : 'Session'

    if (currentSessionId.current) {
      const idx = all.findIndex(s => s.id === currentSessionId.current)
      if (idx >= 0) {
        all[idx] = { ...all[idx], title, messages }
        saveSessions(all)
        setSessions([...all])
        return
      }
    }
    // New session
    const id = `session-${Date.now()}`
    currentSessionId.current = id
    const newSession: ChatSession = { id, title, messages, createdAt: Date.now() }
    const updated = [newSession, ...all].slice(0, 20)
    saveSessions(updated)
    setSessions(updated)
  }, [messages])

  function newChat() {
    currentSessionId.current = null
    setMessages([])
    setThinking(false)
    setInput('')
    setShowHistory(false)
  }

  function loadSession(session: ChatSession) {
    currentSessionId.current = session.id
    setMessages(session.messages)
    setThinking(false)
    setInput('')
    setShowHistory(false)
    scrollDown()
  }

  function deleteSession(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = sessions.filter(s => s.id !== id)
    saveSessions(updated)
    setSessions(updated)
    if (currentSessionId.current === id) {
      currentSessionId.current = null
      setMessages([])
    }
  }

  async function pollResponse(linesBeforeSend: number) {
    let attempts   = 0
    let lastSnap   = ''
    let stableCount = 0

    const poll = setInterval(async () => {
      if (++attempts > 120) { clearInterval(poll); setThinking(false); return }
      try {
        const res  = await fetch('/api/logs/cortex-session?queue=cortex')
        const data = await res.json()
        if (!data.lines || data.lines.length <= linesBeforeSend) return

        const response = cleanLogLines((data.lines as string[]).slice(linesBeforeSend))
        if (!response) return

        if (response === lastSnap) {
          if (++stableCount >= 2) {
            clearInterval(poll)
            setThinking(false)
            setMessages(prev => [...prev, { role: 'cortex', text: response }])
            scrollDown()
          }
        } else {
          lastSnap    = response
          stableCount = 0
        }
      } catch {}
    }, 2000)
  }

  async function send() {
    const msg = input.trim()
    if (!msg || thinking) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: msg }])
    scrollDown()

    try {
      const logRes  = await fetch('/api/logs/cortex-session?queue=cortex')
      const logData = await logRes.json()
      const linesBefore = logData.lines?.length ?? 0

      const res  = await fetch('/api/cortex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })
      const data = await res.json()
      if (data.ok) {
        setThinking(true)
        onJobSelect({ queue: 'cortex', id: 'cortex-session' })
        pollResponse(linesBefore)
      }
    } catch {}
  }

  return (
    <div className="cortex-chat">
      <div className="cortex-glow">
        <div className="cortex-inner">
          <div className="chat-header-row">
            <div className="chat-header-left">
              <span className="chat-label">CORTEX</span>
              {sessions.length > 0 && (
                <button
                  className="chat-history-btn"
                  onClick={() => setShowHistory(s => !s)}
                  title="Chat history"
                >
                  {showHistory ? '▾' : '▸'} History ({sessions.length})
                </button>
              )}
            </div>
            <button className="new-chat-btn" onClick={newChat} title="New conversation">＋ New</button>
          </div>

          {showHistory && (
            <div className="chat-history-list">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className={`chat-history-item ${currentSessionId.current === s.id ? 'active' : ''}`}
                  onClick={() => loadSession(s)}
                >
                  <span className="chat-history-title">{s.title}</span>
                  <button
                    className="chat-history-del"
                    onClick={e => deleteSession(s.id, e)}
                    title="Delete"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div className="chat-log" ref={chatRef}>
            {messages.length === 0 && (
              <div className="chat-empty-state">
                <div className="chat-empty-icon">◈</div>
                <div className="chat-empty-text">Ask CORTEX anything…</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-${m.role}`}>
                {m.role === 'cortex' && (
                  <div className="chat-avatar">◈</div>
                )}
                <div className="chat-bubble">
                  <div className="chat-msg-text">{m.text}</div>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="chat-msg chat-cortex">
                <div className="chat-avatar">◈</div>
                <div className="chat-bubble chat-typing">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              value={input}
              placeholder="Message CORTEX..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              rows={2}
            />
            <button className="chat-send" onClick={send} disabled={thinking}>
              <span className="chat-send-icon">⚡</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
