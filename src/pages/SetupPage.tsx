import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronLeft, Check, Zap, Cloud, MessageCircle, RefreshCw } from 'lucide-react'

type Step = 'welcome' | 'primary' | 'cloud' | 'telegram' | 'done'

interface LLMProvider {
  name: string
  url: string
  model: string
  apiKey: string
  enabled: boolean
  priority: number
  role: string
  ctx: number
  noTools: boolean
}

const PRESETS = [
  { label: 'LM Studio (LAN)',  url: 'http://192.168.1.X:1234/v1', model: 'google/gemma-4-12b', apiKey: 'lm-studio' },
  { label: 'Ollama (local)',   url: 'http://localhost:11434/v1',   model: 'gemma3:12b',          apiKey: 'ollama'    },
  { label: 'OpenAI',           url: 'https://api.openai.com/v1',   model: 'gpt-4o',              apiKey: ''          },
  { label: 'Custom',           url: '',                            model: '',                    apiKey: ''          },
]

function StepDots({ current }: { current: number }) {
  const steps = ['primary', 'cloud', 'telegram']
  return (
    <div className="setup-dots">
      {steps.map((_, i) => (
        <span key={i} className={`setup-dot ${i < current ? 'done' : i === current ? 'active' : ''}`} />
      ))}
    </div>
  )
}

export function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('welcome')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [alreadyConfigured, setAlreadyConfigured] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then((s: any) => setAlreadyConfigured(!!s.complete))
      .catch(() => setAlreadyConfigured(false))
  }, [])

  const [primary, setPrimary] = useState<LLMProvider>({
    name: 'LAN', url: '', model: '', apiKey: 'lm-studio',
    enabled: true, priority: 1, role: 'general', ctx: 131072, noTools: false,
  })
  const [presetIdx, setPresetIdx] = useState(0)

  const [groqKey, setGroqKey] = useState('')
  const [groqEnabled, setGroqEnabled] = useState(false)

  const [telegramToken, setTelegramToken] = useState('')
  const [telegramChatId, setTelegramChatId] = useState('')
  const [telegramSkip, setTelegramSkip] = useState(false)

  function applyPreset(idx: number) {
    const p = PRESETS[idx]
    setPresetIdx(idx)
    setPrimary(prev => ({
      ...prev,
      name: p.label === 'LM Studio (LAN)' ? 'LAN'
          : p.label === 'Ollama (local)'   ? 'GEMMA'
          : p.label === 'OpenAI'           ? 'OPENAI'
          : 'CUSTOM',
      url:    p.url,
      model:  p.model,
      apiKey: p.apiKey,
      noTools: p.label === 'Ollama (local)',
    }))
  }

  async function saveAndFinish() {
    setSaving(true)
    setError('')
    try {
      const providers: LLMProvider[] = [primary]
      if (groqEnabled && groqKey) {
        providers.push({
          name: 'GROQ', url: 'https://api.groq.com/openai/v1',
          model: 'llama-3.3-70b-versatile', apiKey: groqKey,
          enabled: true, priority: 2, role: 'fast', ctx: 131072, noTools: false,
        })
      }

      const provRes = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providers }),
      })
      if (!provRes.ok) throw new Error('Failed to save providers')

      if (!telegramSkip && telegramToken.trim()) {
        await fetch('/api/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: telegramToken.trim(), chatId: telegramChatId.trim() }),
        })
      }

      setStep('done')
    } catch (e: any) {
      setError(e.message ?? 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  if (alreadyConfigured === null) return null

  if (alreadyConfigured && step === 'welcome') {
    return (
      <div className="setup-page">
        <div className="setup-orb setup-orb-1" />
        <div className="setup-orb setup-orb-2" />
        <div className="setup-card">
          <div className="setup-step setup-done">
            <div className="setup-done-ring">✓</div>
            <h2 className="setup-title">CORTEX ya está configurado</h2>
            <p className="setup-subtitle">
              Tus providers y notificaciones están activos.<br />
              Para reconfigurar, usa el wizard abajo.
            </p>
            <button className="setup-btn-primary" onClick={() => navigate('/')}>
              Ir al Dashboard <ChevronRight size={16} />
            </button>
            <button className="setup-skip" onClick={() => setAlreadyConfigured(false)}>
              Reconfigurar desde cero
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="setup-page">
      <div className="setup-orb setup-orb-1" />
      <div className="setup-orb setup-orb-2" />

      <div className="setup-card">

        {/* WELCOME */}
        {step === 'welcome' && (
          <div className="setup-step">
            <div className="setup-icon-ring">◈</div>
            <h1 className="setup-title">Welcome to CORTEX</h1>
            <p className="setup-subtitle">
              Let's configure your AI infrastructure.<br />
              Takes about 2 minutes.
            </p>
            <div className="setup-feature-list">
              <div className="setup-feature"><Zap size={14} /><span>Local + cloud LLM routing with automatic fallback</span></div>
              <div className="setup-feature"><Cloud size={14} /><span>Optional Groq cloud key for when local is unavailable</span></div>
              <div className="setup-feature"><MessageCircle size={14} /><span>Telegram notifications for agent results</span></div>
            </div>
            <button className="setup-btn-primary" onClick={() => setStep('primary')}>
              Get started <ChevronRight size={16} />
            </button>
            <button className="setup-skip" onClick={() => navigate('/')}>
              Skip — I'll configure manually
            </button>
          </div>
        )}

        {/* STEP 1 — Primary LLM */}
        {step === 'primary' && (
          <div className="setup-step">
            <StepDots current={0} />
            <h2 className="setup-step-title"><Zap size={18} /> Primary LLM</h2>
            <p className="setup-step-desc">The first model CORTEX will try for every request.</p>

            <div className="setup-presets">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  className={`setup-preset-btn ${presetIdx === i ? 'active' : ''}`}
                  onClick={() => applyPreset(i)}
                >{p.label}</button>
              ))}
            </div>

            <div className="setup-fields">
              <div className="setup-field">
                <label>URL</label>
                <input className="setup-input" value={primary.url}
                  placeholder="http://192.168.1.8:1234/v1"
                  onChange={e => setPrimary(p => ({ ...p, url: e.target.value }))} />
              </div>
              <div className="setup-field">
                <label>Model</label>
                <input className="setup-input" value={primary.model}
                  placeholder="google/gemma-4-12b"
                  onChange={e => setPrimary(p => ({ ...p, model: e.target.value }))} />
              </div>
              <div className="setup-field">
                <label>API Key</label>
                <input className="setup-input" value={primary.apiKey}
                  placeholder="lm-studio / ollama / sk-..."
                  onChange={e => setPrimary(p => ({ ...p, apiKey: e.target.value }))} />
              </div>
              <label className="setup-checkbox">
                <input type="checkbox" checked={primary.noTools}
                  onChange={e => setPrimary(p => ({ ...p, noTools: e.target.checked }))} />
                This model doesn't support tool calling
              </label>
            </div>

            <div className="setup-nav">
              <button className="setup-btn-ghost" onClick={() => setStep('welcome')}><ChevronLeft size={14} /> Back</button>
              <button className="setup-btn-primary"
                disabled={!primary.url.trim() || !primary.model.trim()}
                onClick={() => setStep('cloud')}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2 — Cloud fallback */}
        {step === 'cloud' && (
          <div className="setup-step">
            <StepDots current={1} />
            <h2 className="setup-step-title"><Cloud size={18} /> Cloud Fallback</h2>
            <p className="setup-step-desc">
              Optional. Used when local model is unavailable.<br />
              Groq provides a generous free tier.
            </p>

            <label className="setup-checkbox setup-checkbox-big">
              <input type="checkbox" checked={groqEnabled}
                onChange={e => setGroqEnabled(e.target.checked)} />
              Enable Groq as cloud fallback
            </label>

            {groqEnabled && (
              <div className="setup-fields">
                <div className="setup-field">
                  <label>Groq API Key</label>
                  <input className="setup-input" type="password" value={groqKey}
                    placeholder="gsk_..."
                    onChange={e => setGroqKey(e.target.value)} />
                  <span className="setup-hint">Get one free at console.groq.com</span>
                </div>
              </div>
            )}

            <div className="setup-nav">
              <button className="setup-btn-ghost" onClick={() => setStep('primary')}><ChevronLeft size={14} /> Back</button>
              <button className="setup-btn-primary" onClick={() => setStep('telegram')}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 — Telegram */}
        {step === 'telegram' && (
          <div className="setup-step">
            <StepDots current={2} />
            <h2 className="setup-step-title"><MessageCircle size={18} /> Telegram Notifications</h2>
            <p className="setup-step-desc">
              Optional. CORTEX sends you job results and alerts via Telegram.
            </p>

            <label className="setup-checkbox setup-checkbox-big">
              <input type="checkbox" checked={telegramSkip}
                onChange={e => setTelegramSkip(e.target.checked)} />
              Skip for now
            </label>

            {!telegramSkip && (
              <div className="setup-fields">
                <div className="setup-field">
                  <label>Bot Token</label>
                  <input className="setup-input" type="password" value={telegramToken}
                    placeholder="8843683350:AAEx..."
                    onChange={e => setTelegramToken(e.target.value)} />
                  <span className="setup-hint">Create a bot with @BotFather on Telegram</span>
                </div>
                <div className="setup-field">
                  <label>Your Chat ID</label>
                  <input className="setup-input" value={telegramChatId}
                    placeholder="5370651958"
                    onChange={e => setTelegramChatId(e.target.value)} />
                  <span className="setup-hint">Get it from @userinfobot</span>
                </div>
              </div>
            )}

            {error && <div className="setup-error">{error}</div>}

            <div className="setup-nav">
              <button className="setup-btn-ghost" onClick={() => setStep('cloud')}><ChevronLeft size={14} /> Back</button>
              <button className="setup-btn-primary" disabled={saving} onClick={saveAndFinish}>
                {saving
                  ? <><RefreshCw size={14} className="spin" /> Saving…</>
                  : <>Finish setup <Check size={16} /></>}
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {step === 'done' && (
          <div className="setup-step setup-done">
            <div className="setup-done-ring">✓</div>
            <h2 className="setup-title">CORTEX is ready</h2>
            <p className="setup-subtitle">
              Configuration saved. Restart CORTEX to apply the new providers.
            </p>
            <div className="setup-done-info">
              <code>bash ~/.koupper/bin/koupper-start.sh</code>
            </div>
            <button className="setup-btn-primary" onClick={() => navigate('/')}>
              Go to Dashboard <ChevronRight size={16} />
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
