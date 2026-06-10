import { useState, useEffect } from 'react'
import { RotateCcw, Trash2, FileText, CheckCircle2, XCircle, Clock, Hash, Layers, ChevronRight } from 'lucide-react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Job, JobDetail } from '../types/api'

const STATUS_COLOR: Record<string, string> = {
  PROCESSING: '#00f2fe', DONE: '#4ade80', FAILED: '#ff007a',
  PENDING: '#fbbf24', DEAD: '#475569',
}

function scriptName(id: string) {
  return id.replace(/-\d+$/, '')
}

function elapsedSince(hhmmss: string): string {
  try {
    const [hh, mm, ss] = hhmmss.split(':').map(Number)
    if ([hh, mm, ss].some(isNaN)) return ''
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm, ss)
    const diffMs = now.getTime() - start.getTime()
    if (diffMs < 0) return ''
    const totalSec = Math.floor(diffMs / 1000)
    const totalMin = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    if (totalMin < 60) return `${totalMin}m ${sec}s`
    return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`
  } catch { return '' }
}

function JobCard({ job, selected, onClick }: { job: Job; selected: boolean; onClick: () => void }) {
  const color = STATUS_COLOR[job.status] ?? '#6e7681'
  return (
    <div className={`job-card ${selected ? 'job-card-selected' : ''}`} onClick={onClick}>
      <div className="job-card-top">
        <span className="job-card-dot" style={{ background: color }} />
        <span className="job-card-id">{scriptName(job.id)}</span>
        <span className="job-card-status" style={{ color }}>{job.status}</span>
      </div>
      <div className="job-card-meta">
        <span className="job-card-queue" title="Queue">⬡ {job.queue}</span>
        <span className="job-card-time"><span className="meta-label">started</span> {job.time}</span>
        {job.status === 'PROCESSING' && elapsedSince(job.time) && (
          <span className="job-card-elapsed">{elapsedSince(job.time)}</span>
        )}
      </div>
      {job.pipelineTotal && (
        <div className="job-card-pipeline">
          <div className="job-pipeline-bar">
            <div className="job-pipeline-fill"
              style={{ width: `${((job.pipelineStep ?? 0) / job.pipelineTotal) * 100}%`, background: color }} />
          </div>
          <span className="job-pipeline-label">{job.pipelineStep}/{job.pipelineTotal}</span>
        </div>
      )}
    </div>
  )
}

function ProvisionResultView({ result }: { result: Record<string, unknown> }) {
  const success = result.success as boolean
  const steps   = (result.steps as string[]) ?? []
  const error   = result.error as string | undefined
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {success
          ? <CheckCircle2 size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
          : <XCircle size={16} style={{ color: '#ff007a', flexShrink: 0 }} />
        }
        <span style={{ fontSize: 13, fontWeight: 600, color: success ? '#4ade80' : '#ff007a' }}>
          {String(result.action ?? '')} {success ? 'exitoso' : 'fallido'}
        </span>
        <code style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
          {String(result.host ?? '')}
        </code>
      </div>
      {steps.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12 }}>
              <span style={{ color: '#4ade80', flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ color: 'var(--text-secondary)' }}>{s}</span>
            </div>
          ))}
        </div>
      )}
      {error && (
        <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'rgba(255,0,122,0.08)', border: '1px solid rgba(255,0,122,0.2)', fontSize: 12, color: '#ff007a', fontFamily: 'var(--mono)' }}>
          {error}
        </div>
      )}
    </div>
  )
}

function InputView({ input }: { input: unknown }) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return <pre style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{JSON.stringify(input, null, 2)}</pre>
  }
  const entries = Object.entries(input as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {entries.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: 8, fontSize: 12 }}>
          <span style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', minWidth: 120, flexShrink: 0 }}>{k}</span>
          <span style={{ color: 'var(--text-secondary)', wordBreak: 'break-all', fontFamily: typeof v === 'object' ? 'var(--mono)' : 'inherit' }}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// The panel only needs the job ref — it finds status/result from context internally
function JobDetailPanel({ jobRef, onRetry, onPurge }: {
  jobRef: { id: string; queue: string }
  onRetry: () => void
  onPurge: () => void
}) {
  const navigate = useNavigate()
  const { snapshot, setSelectedJob } = useApp()
  const [detail, setDetail]         = useState<JobDetail | null>(null)
  const [loadingDetail, setLoading] = useState(false)

  // Find full job data from snapshot (status, result, time)
  const job: Job | undefined = snapshot?.jobs.find(
    j => j.id === jobRef.id && j.queue === jobRef.queue
  )

  useEffect(() => {
    setDetail(null)
    setLoading(true)
    fetch(`/api/jobs/detail/${jobRef.queue}/${jobRef.id}`)
      .then(r => r.json())
      .then(d => { if (d.ok && d.found) setDetail(d.job as JobDetail) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [jobRef.id, jobRef.queue])

  const status  = job?.status ?? 'UNKNOWN'
  const color   = STATUS_COLOR[status] ?? '#6e7681'
  const name    = detail?.fileName ?? scriptName(jobRef.id)
  const isProv  = name === 'NodeProvisionerAgent'
  const result  = job?.result ?? null

  let parsedResult: Record<string, unknown> | null = null
  if (result) {
    try { parsedResult = JSON.parse(result) } catch { /* plain string */ }
  }
  const isProvResult = parsedResult && 'steps' in parsedResult && 'success' in parsedResult

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mono)', marginBottom: 6 }}>
              {name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>● {status}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>⬡ {jobRef.queue}</span>
              {status === 'PROCESSING' && job?.time && elapsedSince(job.time) && (
                <span style={{ fontSize: 11, color: '#00f2fe' }}>{elapsedSince(job.time)}</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button className="icon-btn" title="Reintentar jobs fallidos en esta cola" onClick={onRetry}><RotateCcw size={14} /></button>
            <button className="icon-btn icon-btn-danger" title="Purgar jobs fallidos/muertos" onClick={onPurge}><Trash2 size={14} /></button>
          </div>
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>

        <Section title="Información">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12 }}>
              <Hash size={12} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: 'var(--muted)', minWidth: 80, flexShrink: 0 }}>ID</span>
              <code style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{jobRef.id}</code>
            </div>
            {job?.time && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <Clock size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', minWidth: 80 }}>Iniciado</span>
                <span style={{ color: 'var(--text-secondary)' }}>{job.time}</span>
              </div>
            )}
            {detail?.submittedAt && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <Clock size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', minWidth: 80 }}>Enviado</span>
                <span style={{ color: 'var(--text-secondary)' }}>{new Date(detail.submittedAt).toLocaleString()}</span>
              </div>
            )}
            {detail?.scriptPath && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <FileText size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', minWidth: 80 }}>Script</span>
                <code style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--mono)' }}>{detail.scriptPath}</code>
              </div>
            )}
            {detail?.clientId && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
                <Layers size={12} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', minWidth: 80 }}>Cliente</span>
                <span style={{ color: 'var(--text-secondary)' }}>{detail.clientId}</span>
              </div>
            )}
          </div>
        </Section>

        {/* Input — show while loading or once loaded */}
        <Section title={isProv ? 'Parámetros' : 'Input'}>
          {loadingDetail
            ? <span style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando…</span>
            : detail?.input
              ? <InputView input={detail.input} />
              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin input disponible</span>
          }
        </Section>

        {/* Result */}
        <Section title="Resultado">
          {result
            ? isProvResult
              ? <ProvisionResultView result={parsedResult!} />
              : parsedResult
                ? <InputView input={parsedResult} />
                : <pre style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 }}>{result}</pre>
            : status === 'PROCESSING'
              ? <span style={{ fontSize: 12, color: 'var(--accent)' }}>Ejecutando…</span>
              : <span style={{ fontSize: 12, color: 'var(--muted)' }}>Sin resultado aún</span>
          }
        </Section>
      </div>

      {/* Footer: link to logs */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8, flexShrink: 0 }}>
        <button
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0 }}
          onClick={() => {
            setSelectedJob({ queue: jobRef.queue, id: jobRef.id })
            navigate('/logs')
          }}
        >
          <FileText size={13} />
          Ver logs de ejecución
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )
}

export function JobsPage() {
  const { snapshot, selectedJob, setSelectedJob } = useApp()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter] = useState<string>(() => searchParams.get('filter') ?? 'all')

  useEffect(() => {
    const param = searchParams.get('filter') ?? 'all'
    setFilter(param)
  }, [searchParams])

  const jobs = snapshot?.jobs ?? []
  const filtered = filter === 'all' ? jobs : jobs.filter(j => j.status === filter)

  async function retryJob() {
    if (!selectedJob) return
    await fetch('/api/jobs/retry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob.id, queue: selectedJob.queue }),
    }).catch(() => {})
  }

  async function purgeJob() {
    if (!selectedJob) return
    await fetch('/api/jobs/purge', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobId: selectedJob.id, queue: selectedJob.queue, bucket: 'failed' }),
    }).catch(() => {})
    setSelectedJob(null)
  }

  return (
    <div className="page page-split">
      {/* Left: job list */}
      <div className="jobs-list-col">
        <h2 className="col-title">Jobs</h2>
        <p className="col-desc">Cola de ejecución de todos los agentes.</p>
        <div className="jobs-filter-pills">
          {['all', 'PROCESSING', 'PENDING', 'DONE', 'FAILED'].map(s => (
            <button key={s}
              className={`filter-pill ${filter === s ? 'active' : ''}`}
              style={filter === s && s !== 'all' ? { borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] } : {}}
              onClick={() => {
                setFilter(s)
                s === 'all' ? setSearchParams({}) : setSearchParams({ filter: s })
              }}
            >{s === 'all' ? 'Todos' : s}</button>
          ))}
        </div>

        <div className="jobs-count" style={{ marginTop: 12 }}>
          {filtered.length} job{filtered.length !== 1 ? 's' : ''}
        </div>

        <div className="jobs-cards">
          {filtered.length === 0
            ? <div className="empty-state">Sin jobs con ese filtro</div>
            : filtered.map(j => (
                <JobCard key={j.id} job={j} selected={selectedJob?.id === j.id}
                  onClick={() => setSelectedJob({ queue: j.queue, id: j.id })} />
              ))
          }
        </div>
      </div>

      {/* Right: job detail — renders whenever selectedJob is set */}
      <div className="jobs-log-col">
        {selectedJob
          ? <JobDetailPanel jobRef={selectedJob} onRetry={retryJob} onPurge={purgeJob} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--muted)' }}>
              <FileText size={32} strokeWidth={1.4} style={{ color: 'var(--muted-2, #2a3a55)' }} />
              <span style={{ fontSize: 13 }}>Selecciona un job para ver su detalle</span>
            </div>
          )
        }
      </div>
    </div>
  )
}
