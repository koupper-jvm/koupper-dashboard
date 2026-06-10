import { useRef, useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { useApp } from '../context/AppContext'

function stripMd(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')     // code blocks
    .replace(/`[^`]+`/g, w => w.slice(1, -1))  // inline code — keep text
    .replace(/#{1,6}\s+/g, '')           // headers
    .replace(/\*\*([^*]+)\*\*/g, '$1')  // bold
    .replace(/\*([^*]+)\*/g, '$1')      // italic
    .replace(/~~([^~]+)~~/g, '$1')      // strikethrough
    .replace(/!\[.*?\]\(.*?\)/g, '')    // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links → keep label
    .replace(/^[-*+]\s+/gm, '')         // bullet lists
    .replace(/^\d+\.\s+/gm, '')         // numbered lists
    .replace(/^>\s+/gm, '')             // blockquotes
    .replace(/[-_*]{3,}/g, '')          // horizontal rules
    .replace(/\n{3,}/g, '\n\n')         // excess newlines
    .trim()
}

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
  onSpeak?: (text: string) => void
  onStop?:  () => void
}

const SESSIONS_KEY = 'cortex-chat-sessions'
const ACTIVE_KEY   = 'cortex-active-session'
const PENDING_KEY  = 'cortex-chat-pending'

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

function getInitialSession(): { messages: Message[]; sessionId: string | null } {
  try {
    const lastId = localStorage.getItem(ACTIVE_KEY)
    if (!lastId) return { messages: [], sessionId: null }
    const sessions: ChatSession[] = JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]')
    const found = sessions.find(s => s.id === lastId)
    if (found) return { messages: found.messages, sessionId: lastId }
  } catch {}
  return { messages: [], sessionId: null }
}

function cleanLogLines(lines: string[]): string {
  const stripped = lines.map(l => l.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trimEnd())

  let inToolResult = false
  const result: string[] = []

  for (const line of stripped) {
    const s = line.trimStart()

    if (s.length === 0) {
      inToolResult = false
      continue
    }

    if (s.startsWith('↳')) { inToolResult = true; continue }

    if (inToolResult) continue

    if (
      s.startsWith('▶') || s.startsWith('━') || s.startsWith('◈') ||
      s.startsWith('→') || s.startsWith('↺') || s.startsWith('⏳') ||
      s.startsWith('CORTEX_TOOL:') || s.startsWith('Built-in') ||
      s.startsWith('JOB_') || s.startsWith('[DEBUG]') ||
      s.startsWith('[DONE]') || s.startsWith('[FAILED]') ||
      s.startsWith('[Error:') || s.startsWith('External MCP') ||
      s.startsWith('CORTEX ONLINE') || s.startsWith('Providers:') ||
      s.startsWith('Tools:') || s.startsWith('Press Enter') ||
      /^\[\d{2}:\d{2}:\d{2}\]/.test(s)
    ) continue

    result.push(line)
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function CortexChat({ onJobSelect, onSpeak, onStop }: Props) {
  const { voiceMuted, toggleMute: ctxToggleMute } = useApp()
  const [{ messages: _initMsgs, sessionId: _initId }] = useState(getInitialSession)
  const [messages, setMessages] = useState<Message[]>(_initMsgs)
  const [input, setInput]       = useState('')
  const [thinking, setThinking] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>(loadSessions)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const currentSessionId = useRef<string | null>(_initId)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Restore pending poll on refresh
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_KEY)
      if (!raw) return
      const { linesBeforeSend } = JSON.parse(raw)
      // Resume if the last restored message is from user (no cortex reply yet)
      const lastMsg = _initMsgs[_initMsgs.length - 1]
      if (lastMsg?.role === 'user') {
        setThinking(true)
        onJobSelect({ queue: 'cortex', id: 'cortex-session' })
        pollResponse(linesBeforeSend)
      } else {
        localStorage.removeItem(PENDING_KEY)
      }
    } catch {}

    return () => {
      if (pollRef.current !== null) clearInterval(pollRef.current)
    }
  }, [])

  function cancelPoll() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  function toggleMute() {
    if (!voiceMuted) onStop?.()
    ctxToggleMute()
  }

  function speak(text: string) {
    if (!voiceMuted && onSpeak) onSpeak(text)
  }

  function scrollDown() {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

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
        localStorage.setItem(ACTIVE_KEY, currentSessionId.current)
        return
      }
    }
    const id = `session-${Date.now()}`
    currentSessionId.current = id
    const newSession: ChatSession = { id, title, messages, createdAt: Date.now() }
    const updated = [newSession, ...all].slice(0, 20)
    saveSessions(updated)
    setSessions(updated)
    localStorage.setItem(ACTIVE_KEY, id)
  }, [messages])

  function newChat() {
    cancelPoll()
    currentSessionId.current = null
    localStorage.removeItem(ACTIVE_KEY)
    localStorage.removeItem(PENDING_KEY)
    setMessages([])
    setThinking(false)
    setInput('')
    setShowHistory(false)
    setPendingDeleteId(null)
  }

  function loadSession(session: ChatSession) {
    currentSessionId.current = session.id
    localStorage.setItem(ACTIVE_KEY, session.id)
    setMessages(session.messages)
    setThinking(false)
    setInput('')
    setShowHistory(false)
    setPendingDeleteId(null)
    scrollDown()
  }

  function requestDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setPendingDeleteId(id)
  }

  function confirmDelete(id: string) {
    const updated = sessions.filter(s => s.id !== id)
    saveSessions(updated)
    setSessions(updated)
    if (currentSessionId.current === id) {
      currentSessionId.current = null
      localStorage.removeItem(ACTIVE_KEY)
      localStorage.removeItem(PENDING_KEY)
      setMessages([])
    }
    setPendingDeleteId(null)
  }

  function cancelDelete() {
    setPendingDeleteId(null)
  }

  async function pollResponse(linesBeforeSend: number) {
    cancelPoll()
    let attempts    = 0
    let lastSnap    = ''
    let stableCount = 0
    let lastRawLen  = linesBeforeSend

    pollRef.current = setInterval(async () => {
      if (++attempts > 150) {
        cancelPoll()
        setThinking(false)
        localStorage.removeItem(PENDING_KEY)
        return
      }
      try {
        const res  = await fetch('/api/logs/cortex-session?queue=cortex')
        const data = await res.json()
        if (!data.lines) return
        const rawLen = data.lines.length
        if (rawLen <= linesBeforeSend) return

        const response = cleanLogLines((data.lines as string[]).slice(linesBeforeSend))

        if (response && response === lastSnap) {
          if (rawLen === lastRawLen) {
            if (++stableCount >= 3) {
              cancelPoll()
              localStorage.removeItem(PENDING_KEY)
              setThinking(false)
              setMessages(prev => [...prev, { role: 'cortex', text: response }])
              scrollDown()
              const voiceText = stripMd(response).slice(0, 1200)
              if (voiceText) speak(voiceText)
            }
          } else {
            stableCount = 0
          }
        } else {
          lastSnap    = response
          stableCount = 0
        }
        lastRawLen = rawLen
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
        localStorage.setItem(PENDING_KEY, JSON.stringify({
          sessionId: currentSessionId.current,
          linesBeforeSend: linesBefore,
        }))
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
                  onClick={() => { setShowHistory(s => !s); setPendingDeleteId(null) }}
                  title="Chat history"
                >
                  {showHistory ? '▾' : '▸'} History ({sessions.length})
                </button>
              )}
            </div>
            <div className="chat-header-actions">
              <button className="new-chat-btn" onClick={newChat} title="New conversation">＋ New</button>
            </div>
          </div>

          {showHistory && (
            <div className="chat-history-list">
              {sessions.map(s => (
                pendingDeleteId === s.id ? (
                  <div key={s.id} className="chat-confirm-row">
                    <span className="chat-confirm-text">¿Eliminar "{s.title.substring(0, 20)}{s.title.length > 20 ? '…' : ''}"?</span>
                    <button className="chat-confirm-yes" onClick={() => confirmDelete(s.id)}>Sí</button>
                    <button className="chat-confirm-no" onClick={cancelDelete}>No</button>
                  </div>
                ) : (
                  <div
                    key={s.id}
                    className={`chat-history-item ${currentSessionId.current === s.id ? 'active' : ''}`}
                    onClick={() => loadSession(s)}
                  >
                    <span className="chat-history-title">{s.title}</span>
                    <button
                      className="chat-history-del"
                      onClick={e => requestDelete(s.id, e)}
                      title="Eliminar conversación"
                    >×</button>
                  </div>
                )
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
                  {m.role === 'cortex'
                    ? <div className="chat-msg-text chat-md"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                    : <div className="chat-msg-text">{m.text}</div>
                  }
                  {m.role === 'cortex' && onSpeak && (
                    <button
                      className="chat-replay-btn"
                      title={voiceMuted ? 'Voz silenciada' : 'Reproducir audio'}
                      onClick={() => {
                        const t = stripMd(m.text).slice(0, 1200)
                        if (t) speak(t)
                      }}
                    >{voiceMuted ? '🔇' : '🔊'}</button>
                  )}
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
            <div className="chat-input-actions">
              <button
                className={`chat-mute-btn ${voiceMuted ? 'muted' : ''}`}
                onClick={toggleMute}
                title={voiceMuted ? 'Activar voz' : 'Silenciar voz'}
              >{voiceMuted ? '🔇' : '🔊'}</button>
              <button className="chat-send" onClick={send} disabled={thinking}>
                <span className="chat-send-icon">⚡</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
