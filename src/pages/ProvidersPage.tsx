import { useState, useEffect } from 'react'
import { Save, Plus, Trash2, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react'

interface Provider {
  name: string
  enabled: boolean
  url: string
  model: string
  apiKey: string
  priority: number
  role: string
  ctx: number
  noTools: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'
type RestartState = Record<string, 'idle' | 'restarting' | 'done' | 'error'>

const ROLES = ['', 'general', 'reasoning', 'fast', 'code']

function ProviderCard({
  p, index, total,
  onChange, onDelete, onMove,
}: {
  p: Provider; index: number; total: number
  onChange: (p: Provider) => void
  onDelete: () => void
  onMove: (dir: -1 | 1) => void
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <div className={`prov-card ${p.enabled ? '' : 'prov-card-disabled'}`}>
      <div className="prov-card-header">
        <div className="prov-card-header-left">
          <button
            className={`prov-toggle ${p.enabled ? 'prov-toggle-on' : 'prov-toggle-off'}`}
            onClick={() => onChange({ ...p, enabled: !p.enabled })}
            title={p.enabled ? 'Disable provider' : 'Enable provider'}
          >
            {p.enabled ? '●' : '○'}
          </button>
          <span className="prov-name">{p.name}</span>
          {p.role && <span className="prov-role-badge">{p.role}</span>}
        </div>
        <div className="prov-card-header-right">
          <span className="prov-pos-badge">#{index + 1}</span>
          <button className="prov-move-btn" disabled={index === 0} onClick={() => onMove(-1)} title="Move up">
            <ChevronUp size={14} />
          </button>
          <button className="prov-move-btn" disabled={index === total - 1} onClick={() => onMove(1)} title="Move down">
            <ChevronDown size={14} />
          </button>
          <button className="prov-delete-btn" onClick={onDelete} title="Remove provider">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="prov-fields">
        <div className="prov-field">
          <label>URL</label>
          <input
            className="prov-input"
            type="text"
            value={p.url}
            placeholder="https://api.groq.com/openai/v1"
            onChange={e => onChange({ ...p, url: e.target.value })}
          />
        </div>
        <div className="prov-field">
          <label>Model</label>
          <input
            className="prov-input"
            type="text"
            value={p.model}
            placeholder="llama-3.3-70b-versatile"
            onChange={e => onChange({ ...p, model: e.target.value })}
          />
        </div>
        <div className="prov-field">
          <label>API Key</label>
          <div className="prov-secret-row">
            <input
              className="prov-input"
              type={showKey ? 'text' : 'password'}
              value={p.apiKey}
              placeholder="sk-... or 'ollama' for local"
              onChange={e => onChange({ ...p, apiKey: e.target.value })}
            />
            <button className="prov-show-btn" onClick={() => setShowKey(v => !v)}>
              {showKey ? 'hide' : 'show'}
            </button>
          </div>
        </div>
        <div className="prov-field prov-field-row">
          <div className="prov-field">
            <label>Role</label>
            <select
              className="prov-select"
              value={p.role}
              onChange={e => onChange({ ...p, role: e.target.value })}
            >
              {ROLES.map(r => <option key={r} value={r}>{r || '—'}</option>)}
            </select>
          </div>
          <div className="prov-field">
            <label>Context (tokens)</label>
            <input
              className="prov-input"
              type="number" min={0}
              value={p.ctx || ''}
              placeholder="131072"
              onChange={e => onChange({ ...p, ctx: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="prov-field prov-field-checkbox">
            <label>
              <input
                type="checkbox"
                checked={p.noTools}
                onChange={e => onChange({ ...p, noTools: e.target.checked })}
              />
              No tools
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([])
  const [envFile, setEnvFile] = useState('')
  const [hasFile, setHasFile] = useState(false)
  const [loading, setLoading] = useState(true)
  const [dirty, setDirty] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [affectedAgents, setAffectedAgents] = useState<string[]>([])
  const [restartStates, setRestartStates] = useState<RestartState>({})

  useEffect(() => {
    fetch('/api/providers').then(r => r.json()).then(d => {
      setProviders(d.providers ?? [])
      setEnvFile(d.envFile ?? '')
      setHasFile(d.hasFile ?? false)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  function update(index: number, p: Provider) {
    setProviders(prev => prev.map((v, i) => i === index ? p : v))
    setDirty(true)
  }

  function remove(index: number) {
    setProviders(prev => prev.filter((_, i) => i !== index))
    setDirty(true)
  }

  function move(index: number, dir: -1 | 1) {
    setProviders(prev => {
      const next = [...prev]
      const swap = index + dir
      if (swap < 0 || swap >= next.length) return prev
      ;[next[index], next[swap]] = [next[swap], next[index]]
      next.forEach((p, i) => { p.priority = i + 1 })
      return next
    })
    setDirty(true)
  }

  function addProvider() {
    setProviders(prev => [...prev, {
      name: 'NEW', enabled: true, url: '', model: '', apiKey: '',
      priority: prev.length + 1, role: 'general', ctx: 0, noTools: false,
    }])
    setDirty(true)
  }

  async function save() {
    setSaveState('saving')
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers }),
      })
      if (res.ok) {
        const d = await res.json()
        setEnvFile(d.path ?? envFile)
        setHasFile(true)
        setSaveState('saved')
        setDirty(false)
        setAffectedAgents(d.affectedAgents ?? [])
        setRestartStates({})
      } else {
        setSaveState('error')
        setTimeout(() => setSaveState('idle'), 3000)
      }
    } catch {
      setSaveState('error')
    }
  }

  async function restartAgent(name: string) {
    setRestartStates(s => ({ ...s, [name]: 'restarting' }))
    try {
      const res = await fetch('/api/run-agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${name}.kts`, queue: 'default' }),
      })
      setRestartStates(s => ({ ...s, [name]: res.ok ? 'done' : 'error' }))
    } catch {
      setRestartStates(s => ({ ...s, [name]: 'error' }))
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Providers</h1>
        <div className="prov-header-actions">
          <button className="btn-ghost" onClick={addProvider}><Plus size={14} /> Add provider</button>
          <button
            className={`btn-primary prov-save-btn ${saveState}`}
            onClick={save}
            disabled={!dirty || saveState === 'saving'}
          >
            {saveState === 'saving' ? <><RefreshCw size={14} className="spin" /> Saving…</> :
             saveState === 'saved'  ? <>✓ Saved</> :
             saveState === 'error'  ? <>✗ Error</> :
             <><Save size={14} /> Save</>}
          </button>
        </div>
      </div>
      <p className="page-desc">
        Configure LLM providers — routing order, models, credentials.
        {hasFile
          ? <> Changes persist to <code className="prov-env-path">{envFile}</code> · active on next agent restart.</>
          : <> Saves to <code className="prov-env-path">{envFile}</code> · active on next agent restart.</>}
      </p>

      {loading ? (
        <div className="empty-state"><RefreshCw size={20} className="spin" /> Loading…</div>
      ) : providers.length === 0 ? (
        <div className="empty-state" style={{ flexDirection: 'column', gap: 12 }}>
          <span>No LLM providers found in environment.</span>
          <button className="btn-primary" onClick={addProvider}><Plus size={14} /> Add your first provider</button>
        </div>
      ) : (
        <div className="prov-list">
          {providers.map((p, i) => (
            <ProviderCard
              key={`${p.name}-${i}`}
              p={p} index={i} total={providers.length}
              onChange={np => update(i, np)}
              onDelete={() => remove(i)}
              onMove={dir => move(i, dir)}
            />
          ))}
        </div>
      )}

      {saveState === 'saved' && affectedAgents.length > 0 && (
        <div className="prov-restart-bar">
          <span>Saved — restart affected agents to apply:</span>
          <div className="prov-restart-agents">
            {affectedAgents.map(name => {
              const s = restartStates[name] ?? 'idle'
              return (
                <button
                  key={name}
                  className={`prov-restart-btn prov-restart-${s}`}
                  disabled={s === 'restarting' || s === 'done'}
                  onClick={() => restartAgent(name)}
                >
                  {s === 'restarting' && <RefreshCw size={12} className="spin" />}
                  {s === 'done'       && '✓'}
                  {s === 'error'      && '✗'}
                  {s === 'idle'       && '↺'}
                  {' '}{name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {dirty && saveState === 'idle' && (
        <div className="prov-unsaved-bar">Unsaved changes · <button onClick={save}>Save now</button></div>
      )}
    </div>
  )
}
