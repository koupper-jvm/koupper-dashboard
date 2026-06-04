import { useRef, useState } from 'react'

interface Message {
  role: 'user' | 'cortex'
  text: string
}

interface Props {
  onJobSelect: (job: { queue: string; id: string }) => void
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
        !s.startsWith('→') &&        // tool calls
        !s.startsWith('↺') &&        // retry
        !s.startsWith('↳') &&        // tool results
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
  const chatRef = useRef<HTMLDivElement>(null)

  function scrollDown() {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

  function newChat() {
    setMessages([])
    setThinking(false)
    setInput('')
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
            <span className="chat-label">CORTEX</span>
            <button className="new-chat-btn" onClick={newChat} title="New conversation">＋ New</button>
          </div>
          <div className="chat-log" ref={chatRef}>
            {messages.length === 0 && (
              <div className="empty" style={{ color: '#4a3a6a', fontSize: 11 }}>Ask CORTEX anything…</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-${m.role}`}>
                <span className="chat-role-tag">{m.role === 'user' ? 'YOU' : 'CORTEX'}</span>
                <span className="chat-msg-text">{m.text}</span>
              </div>
            ))}
            {thinking && <div className="chat-thinking">◈ procesando…</div>}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              placeholder="Message CORTEX..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="chat-send" onClick={send} disabled={thinking}>⚡</button>
          </div>
        </div>
      </div>
    </div>
  )
}
