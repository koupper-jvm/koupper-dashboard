import { useState } from 'react'
import type { Schedule } from '../types/api'

interface Props {
  schedules: Schedule[]
}

async function toggleSchedule(id: string, enable: boolean): Promise<void> {
  await fetch(enable ? '/api/schedules/enable' : '/api/schedules/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
}

export function SchedulesList({ schedules }: Props) {
  const [pending, setPending] = useState<string | null>(null)

  if (schedules.length === 0) {
    return (
      <div className="empty">
        No schedules
        <br />
        <span style={{ color: 'var(--border)' }}>koupper schedule add</span>
      </div>
    )
  }

  async function handleToggle(id: string, currentlyEnabled: boolean) {
    if (pending) return
    setPending(id)
    try {
      await toggleSchedule(id, !currentlyEnabled)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="schedules-list">
      {schedules.map((s, i) => {
        const info = s.type === 'cron'
          ? s.cron
          : s.type === 'rate'
          ? `every ${Math.round((s.rateMs ?? 0) / 1000)}s`
          : s.runAt ?? ''
        const enabled = s.enabled !== false
        const color = enabled ? 'var(--green)' : 'var(--muted)'
        const isBusy = pending === s.id
        return (
          <div key={i} className="schedule-item">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ color, fontSize: 12 }}>
                {enabled ? '●' : '○'} {s.agent}
              </div>
              <button
                className={`sched-toggle ${enabled ? 'sched-toggle-on' : 'sched-toggle-off'}`}
                disabled={isBusy}
                onClick={() => handleToggle(s.id, enabled)}
                title={enabled ? 'Disable schedule' : 'Enable schedule'}
              >
                {isBusy ? '…' : enabled ? 'disable' : 'enable'}
              </button>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>
              <span className={`sched-badge sched-${s.type}`}>{s.type}</span>{' '}
              {info}
              {s.input && (
                <span style={{ marginLeft: 6, color: 'var(--border)' }}>
                  input: {s.input.length > 30 ? s.input.slice(0, 30) + '…' : s.input}
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
