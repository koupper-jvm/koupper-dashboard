import type { Schedule } from '../types/api'

interface Props {
  schedules: Schedule[]
}

export function SchedulesList({ schedules }: Props) {
  if (schedules.length === 0) {
    return (
      <div className="empty">
        No schedules
        <br />
        <span style={{ color: 'var(--border)' }}>koupper schedule add</span>
      </div>
    )
  }

  return (
    <div className="schedules-list">
      {schedules.map((s, i) => {
        const info = s.type === 'cron'
          ? s.cron
          : s.type === 'rate'
          ? `every ${Math.round((s.rateMs ?? 0) / 1000)}s`
          : s.runAt ?? ''
        const color = s.enabled === false ? 'var(--muted)' : 'var(--green)'
        return (
          <div key={i} className="schedule-item">
            <div style={{ color, fontSize: 12 }}>
              {s.enabled === false ? '○' : '●'} {s.agent}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 10 }}>
              <span className={`sched-badge sched-${s.type}`}>{s.type}</span>{' '}
              {info}
            </div>
          </div>
        )
      })}
    </div>
  )
}
