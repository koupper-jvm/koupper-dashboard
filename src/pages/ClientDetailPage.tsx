import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { ClientDetail } from '../types/api'

type Status = 'loading' | 'ready' | 'error'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ClientDetail | null>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    if (!id) return
    setStatus('loading')
    fetch(`/api/client/${id}`)
      .then(r => r.json())
      .then((data: ClientDetail) => {
        if (!data.ok) { setStatus('error'); return }
        setDetail(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [id])

  if (status === 'loading') return (
    <div className="client-detail-page">
      <button className="onb-back-btn" onClick={() => navigate('/')}>← Dashboard</button>
      <div className="cd-loading">Loading client…</div>
    </div>
  )

  if (status === 'error' || !detail) return (
    <div className="client-detail-page">
      <button className="onb-back-btn" onClick={() => navigate('/')}>← Dashboard</button>
      <div className="cd-error">Client not found.</div>
    </div>
  )

  const totalPending    = detail.stats.reduce((s, q) => s + q.pending,    0)
  const totalProcessing = detail.stats.reduce((s, q) => s + q.processing, 0)
  const totalFailed     = detail.stats.reduce((s, q) => s + q.failed,     0)
  const totalDead       = detail.stats.reduce((s, q) => s + q.dead,       0)

  return (
    <div className="client-detail-page">
      <div className="cd-header">
        <button className="onb-back-btn" onClick={() => navigate('/')}>← Dashboard</button>
        <div className="cd-title-row">
          <h1 className="cd-title">{detail.displayName}</h1>
          <span className="cd-id-badge">{detail.id}</span>
          {detail.createdAt && (
            <span className="cd-created">
              since {new Date(detail.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>

      <div className="cd-summary-row">
        <div className="cd-stat-card">
          <span className="cd-stat-val">{totalPending}</span>
          <span className="cd-stat-label">Pending</span>
        </div>
        <div className="cd-stat-card cd-stat-processing">
          <span className="cd-stat-val">{totalProcessing}</span>
          <span className="cd-stat-label">Processing</span>
        </div>
        <div className="cd-stat-card cd-stat-failed">
          <span className="cd-stat-val">{totalFailed}</span>
          <span className="cd-stat-label">Failed</span>
        </div>
        <div className="cd-stat-card cd-stat-dead">
          <span className="cd-stat-val">{totalDead}</span>
          <span className="cd-stat-label">Dead</span>
        </div>
      </div>

      <div className="cd-body">
        <section className="cd-section">
          <h2 className="cd-section-title">Queues</h2>
          <table className="cd-table">
            <thead>
              <tr>
                <th>Queue</th>
                <th>Pending</th>
                <th>Processing</th>
                <th>Failed</th>
                <th>Dead</th>
              </tr>
            </thead>
            <tbody>
              {detail.stats.map(q => (
                <tr key={q.queue}>
                  <td className="cd-queue-name">{q.queue}</td>
                  <td>{q.pending || '—'}</td>
                  <td className={q.processing > 0 ? 'cd-active' : ''}>{q.processing || '—'}</td>
                  <td className={q.failed > 0 ? 'cd-warn' : ''}>{q.failed || '—'}</td>
                  <td className={q.dead > 0 ? 'cd-dead' : ''}>{q.dead || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {detail.agents.length > 0 && (
          <section className="cd-section">
            <h2 className="cd-section-title">Agents</h2>
            <div className="cd-agent-list">
              {detail.agents.map(a => (
                <span key={a} className="cd-agent-tag">{a}</span>
              ))}
            </div>
          </section>
        )}

        {detail.agents.length === 0 && (
          <section className="cd-section">
            <h2 className="cd-section-title">Agents</h2>
            <span className="cd-empty">No agents assigned to this client.</span>
          </section>
        )}
      </div>
    </div>
  )
}
