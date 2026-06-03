import { useRef, useState } from 'react'

interface Message {
  role: 'user' | 'cortex'
  text: string
}

interface Props {
  onJobSelect: (job: { queue: string; id: string }) => void
}

export function CortexChat({ onJobSelect }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  function scrollDown() {
    setTimeout(() => {
      if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
    }, 50)
  }

  async function pollResponse(linesBeforeSend: number) {
    let attempts = 0
    let lastSnapshot = ''
    let stableCount = 0

    const poll = setInterval(async () => {
      if (++attempts > 90) { clearInterval(poll); setThinking(false); return }
      try {
        const res = await fetch('/api/logs/cortex-session?queue=cortex')
        const data = await res.json()
        if (!data.lines || data.lines.length <= linesBeforeSend) return

        const response = (data.lines as string[])
          .slice(linesBeforeSend)
          .map((l: string) => l.replace(/^\[\d{2}:\d{2}:\d{2}\]\s*/, '').trim())
          .filter((t: string) => t &&
            !t.startsWith('▶') && !t.startsWith('CORTEX_TOOL:') &&
            !t.startsWith('━') && !t.startsWith('↳') &&
            !t.startsWith('⏳') && !t.startsWith('✓') && !t.startsWith('✗') &&
            !t.startsWith('[') && !t.startsWith('Built-in') &&
            !t.startsWith('JOB_') && !t.startsWith('[DEBUG]') &&
            !t.startsWith('[DONE]') && !t.startsWith('[FAILED]'))
          .join(' ')
          .trim()

        if (!response) return

        if (response === lastSnapshot) {
          if (++stableCount >= 2) {
            clearInterval(poll)
            setThinking(false)
            setMessages(prev => [...prev, { role: 'cortex', text: response }])
            scrollDown()
          }
        } else {
          lastSnapshot = response
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
      const logRes = await fetch('/api/logs/cortex-session?queue=cortex')
      const logData = await logRes.json()
      const linesBefore = logData.lines?.length ?? 0

      const res = await fetch('/api/cortex', {
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
          <div className="chat-log" ref={chatRef}>
            {messages.length === 0 && (
              <div className="empty" style={{ color: '#4a3a6a' }}>Ask CORTEX anything…</div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg chat-${m.role}`}>{m.text}</div>
            ))}
            {thinking && (
              <div className="chat-thinking">→ pensando…</div>
            )}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              value={input}
              placeholder="Message CORTEX..."
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button className="chat-send" onClick={send} disabled={thinking}>
              ⚡ Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
