import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Agent } from '../types/api'

interface Snapshot {
  agents?: Agent[]
}

type Status = 'idle' | 'loading' | 'success' | 'error'

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,29}$/

function slugify(val: string): string {
  return val.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').slice(0, 30)
}

export function OnboardingPage() {
  const navigate = useNavigate()

  const [clientId,     setClientId]     = useState('')
  const [displayName,  setDisplayName]  = useState('')
  const [extraQueues,  setExtraQueues]  = useState<string[]>([])
  const [queueInput,   setQueueInput]   = useState('')
  const [agents,       setAgents]       = useState<Agent[]>([])
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  const [status,       setStatus]       = useState<Status>('idle')
  const [errorMsg,     setErrorMsg]     = useState('')

  useEffect(() => {
    fetch('/api/snapshot')
      .then(r => r.json())
      .then((s: Snapshot) => setAgents(s.agents ?? []))
      .catch(() => {})
  }, [])

  const slugOk   = SLUG_RE.test(clientId)
  const canSubmit = slugOk && status !== 'loading'

  function handleIdChange(val: string) {
    setClientId(slugify(val))
    if (!displayName) setDisplayName('')
  }

  function addQueue() {
    const q = slugify(queueInput.trim())
    if (q && q !== 'default' && !extraQueues.includes(q)) {
      setExtraQueues(prev => [...prev, q])
    }
    setQueueInput('')
  }

  function removeQueue(q: string) {
    setExtraQueues(prev => prev.filter(x => x !== q))
  }

  function toggleAgent(name: string) {
    setSelectedAgents(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    setStatus('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id:          clientId,
          displayName: displayName.trim() || clientId,
          queues:      extraQueues,
          agents:      Array.from(selectedAgents),
        }),
      })
      const data = await res.json() as { ok: boolean; error?: string }
      if (!data.ok) {
        setStatus('error')
        setErrorMsg(data.error ?? 'Unknown error')
      } else {
        setStatus('success')
        setTimeout(() => navigate('/'), 1200)
      }
    } catch (err: unknown) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="onboarding-page">
      <div className="onboarding-header">
        <button className="onb-back-btn" onClick={() => navigate('/')}>← Dashboard</button>
        <h1 className="onb-title">New Client</h1>
        <p className="onb-subtitle">Provision a new client workspace with its own queues and agents.</p>
      </div>

      <form className="onboarding-form" onSubmit={handleSubmit}>

        {/* ── Identity ── */}
        <section className="onb-section">
          <h2 className="onb-section-title">Identity</h2>

          <div className="onb-field">
            <label className="onb-label">
              Client ID <span className="onb-required">*</span>
            </label>
            <input
              className={`onb-input ${clientId && !slugOk ? 'onb-input-error' : ''}`}
              type="text"
              placeholder="acme-corp"
              value={clientId}
              onChange={e => handleIdChange(e.target.value)}
              autoFocus
            />
            <span className="onb-hint">
              Lowercase letters, numbers and hyphens only. 2–30 chars.
              {clientId && !slugOk && <span className="onb-error-inline"> — invalid format</span>}
            </span>
          </div>

          <div className="onb-field">
            <label className="onb-label">Display Name <span className="onb-optional">optional</span></label>
            <input
              className="onb-input"
              type="text"
              placeholder="Acme Corporation"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
            />
          </div>
        </section>

        {/* ── Queues ── */}
        <section className="onb-section">
          <h2 className="onb-section-title">Job Queues</h2>

          <div className="onb-queue-list">
            <div className="onb-queue-tag onb-queue-default">default</div>
            {extraQueues.map(q => (
              <div key={q} className="onb-queue-tag">
                {q}
                <button type="button" className="onb-queue-remove" onClick={() => removeQueue(q)}>×</button>
              </div>
            ))}
          </div>

          <div className="onb-queue-add-row">
            <input
              className="onb-input onb-queue-input"
              type="text"
              placeholder="Add queue…"
              value={queueInput}
              onChange={e => setQueueInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addQueue() } }}
            />
            <button type="button" className="onb-add-btn" onClick={addQueue}>+ Add</button>
          </div>
          <span className="onb-hint">The <code>default</code> queue is always created.</span>
        </section>

        {/* ── Agents ── */}
        <section className="onb-section">
          <h2 className="onb-section-title">Agents to Provision <span className="onb-optional">optional</span></h2>
          <p className="onb-hint" style={{ marginBottom: 10 }}>
            Selected agents will be recorded in the client's config. They share the global agents directory.
          </p>

          {agents.length === 0 ? (
            <p className="onb-hint">Loading agents…</p>
          ) : (
            <div className="onb-agent-grid">
              {agents.map(a => {
                const selected = selectedAgents.has(a.name)
                return (
                  <div
                    key={a.name}
                    className={`onb-agent-card ${selected ? 'selected' : ''}`}
                    onClick={() => toggleAgent(a.name)}
                  >
                    <div className="onb-agent-check">{selected ? '☑' : '☐'}</div>
                    <div className="onb-agent-info">
                      <div className="onb-agent-name">{a.name}</div>
                      {a.description && (
                        <div className="onb-agent-desc">{a.description.slice(0, 80)}{a.description.length > 80 ? '…' : ''}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Submit ── */}
        <div className="onb-footer">
          {status === 'success' && (
            <span className="onb-feedback onb-ok">✓ Client created — redirecting…</span>
          )}
          {status === 'error' && (
            <span className="onb-feedback onb-err">✗ {errorMsg}</span>
          )}

          <button
            type="submit"
            className={`onb-submit-btn ${status}`}
            disabled={!canSubmit}
          >
            {status === 'loading' ? '◌ Creating…' : 'Create Client'}
          </button>
        </div>

      </form>
    </div>
  )
}
