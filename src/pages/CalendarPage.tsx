import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Bot } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Schedule } from '../types/api'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']

function parseCronHour(cron: string): number | null {
  // "0 2 * * *" → hour=2
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 2) return null
  const h = parseInt(parts[1])
  return isNaN(h) ? null : h
}

function parseCronDays(cron: string): number[] {
  // "0 2 * * 1,3,5" → [1,3,5]  "0 2 * * *" → all 7 days
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return [0,1,2,3,4,5,6]
  const dow = parts[4]
  if (dow === '*') return [0,1,2,3,4,5,6]
  return dow.split(',').map(Number).filter(n => !isNaN(n))
}

function rateLabel(ms: number): string {
  if (ms < 60_000) return `every ${ms / 1000}s`
  if (ms < 3_600_000) return `every ${ms / 60_000}m`
  if (ms < 86_400_000) return `every ${ms / 3_600_000}h`
  return `every ${ms / 86_400_000}d`
}

const COLORS = ['#4f6ef7','#a78bfa','#34d399','#fb923c','#f59e0b','#60a5fa','#f472b6']

function scheduleColor(idx: number) { return COLORS[idx % COLORS.length] }

interface CalEvent {
  schedule: Schedule
  color: string
  hour: number
  dayOfWeek: number
}

function buildWeekEvents(schedules: Schedule[]): CalEvent[][] {
  // Returns array indexed [dayOfWeek 0-6][...events]
  const byDay: CalEvent[][] = Array.from({ length: 7 }, () => [])
  schedules.forEach((s, i) => {
    const color = scheduleColor(i)
    if (s.type === 'cron' && s.cron) {
      const hour = parseCronHour(s.cron) ?? 0
      const days = parseCronDays(s.cron)
      days.forEach(d => byDay[d].push({ schedule: s, color, hour, dayOfWeek: d }))
    } else if (s.type === 'rate') {
      // Show on every day at hour 0 as a recurring indicator
      for (let d = 0; d < 7; d++) byDay[d].push({ schedule: s, color, hour: 0, dayOfWeek: d })
    }
  })
  return byDay
}

function WeekCalendar({ schedules, weekStart }: { schedules: Schedule[]; weekStart: Date }) {
  const byDay = buildWeekEvents(schedules)
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const today = new Date()

  return (
    <div className="cal-week">
      {/* Header row */}
      <div className="cal-week-header">
        <div className="cal-time-gutter" />
        {days.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString()
          return (
            <div key={i} className={`cal-day-header ${isToday ? 'cal-today' : ''}`}>
              <div className="cal-day-name">{DAYS[d.getDay()]}</div>
              <div className={`cal-day-num ${isToday ? 'cal-today-num' : ''}`}>{d.getDate()}</div>
            </div>
          )
        })}
      </div>

      {/* Time grid */}
      <div className="cal-grid-body">
        {hours.map(h => (
          <div key={h} className="cal-hour-row">
            <div className="cal-time-label">{h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}</div>
            {days.map((_, di) => {
              const evs = byDay[di]?.filter(e => e.hour === h) ?? []
              return (
                <div key={di} className="cal-cell">
                  {evs.map((ev, ei) => (
                    <div key={ei} className="cal-event" style={{ background: `${ev.color}22`, borderLeft: `3px solid ${ev.color}` }}>
                      <span className="cal-event-name" style={{ color: ev.color }}>
                        {ev.schedule.agent.replace(/\.kts$/, '')}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function CalendarPage() {
  const { snapshot } = useApp()
  const schedules = snapshot?.schedules ?? []
  const [weekOffset, setWeekOffset] = useState(0)

  // Compute week start (Monday)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + weekOffset * 7)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const fmt = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getDate()}`

  return (
    <div className="page page-calendar">
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setWeekOffset(v => v - 1)}><ChevronLeft size={16} /></button>
          <span className="cal-range">{fmt(weekStart)} — {fmt(weekEnd)}, {weekStart.getFullYear()}</span>
          <button className="icon-btn" onClick={() => setWeekOffset(v => v + 1)}><ChevronRight size={16} /></button>
          {weekOffset !== 0 && (
            <button className="btn-ghost" onClick={() => setWeekOffset(0)}>Today</button>
          )}
        </div>
      </div>

      {/* Schedule legend */}
      {schedules.length > 0 && (
        <div className="cal-legend">
          {schedules.map((s, i) => (
            <div key={s.id} className="cal-legend-item">
              <span className="cal-legend-dot" style={{ background: scheduleColor(i) }} />
              <span className="cal-legend-name">{s.agent.replace(/\.kts$/, '')}</span>
              <span className="cal-legend-info">
                {s.type === 'cron' && s.cron}
                {s.type === 'rate' && s.rateMs && rateLabel(s.rateMs)}
                {s.type === 'once' && s.runAt && new Date(s.runAt).toLocaleString()}
              </span>
              <span className={`cal-legend-status ${s.enabled ? 'enabled' : 'disabled'}`}>
                {s.enabled ? 'enabled' : 'disabled'}
              </span>
            </div>
          ))}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="nodes-empty-page">
          <Clock size={48} strokeWidth={1} style={{ color: '#2a3a55' }} />
          <div className="empty-state-title">No schedules configured</div>
          <div className="empty-state-sub">
            Use <code>@Scheduled</code> or <code>@JobsListener</code> in your agents to schedule tasks.
          </div>
          <div className="cal-demo-note">
            <Bot size={14} />
            <span>Ask CORTEX: "schedule FileIndexerAgent to run every night at 2am"</span>
          </div>
        </div>
      ) : (
        <WeekCalendar schedules={schedules} weekStart={weekStart} />
      )}
    </div>
  )
}
