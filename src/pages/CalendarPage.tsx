import { useState } from 'react'
import { ChevronLeft, ChevronRight, Clock, Bot, X, Code2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import type { Schedule } from '../types/api'

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December']
const DAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const COLORS = ['#4f6ef7','#a78bfa','#34d399','#fb923c','#f59e0b','#60a5fa','#f472b6']

function scheduleColor(idx: number) { return COLORS[idx % COLORS.length] }

// ── Cron → human-readable ────────────────────────────────────────────────────
function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return cron
  const [rawMin, rawHour, , , rawDow] = parts
  const hour = parseInt(rawHour)
  const min  = parseInt(rawMin)
  if (rawHour === '*' || isNaN(hour)) return cron

  const hDisplay = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const period   = hour < 12 ? 'AM' : 'PM'
  const timeStr  = `${hDisplay}:${min.toString().padStart(2, '0')} ${period}`

  if (rawDow === '*')    return `Daily at ${timeStr}`
  if (rawDow === '1-5')  return `Weekdays at ${timeStr}`
  if (rawDow === '0,6' || rawDow === '6,0') return `Weekends at ${timeStr}`

  const days = rawDow.split(',')
    .map(n => DAY_SHORT[parseInt(n)] ?? n)
    .join('/')
  return `${days} at ${timeStr}`
}

function rateLabel(ms: number): string {
  if (ms < 60_000)      return `every ${ms / 1000}s`
  if (ms < 3_600_000)   return `every ${ms / 60_000}m`
  if (ms < 86_400_000)  return `every ${ms / 3_600_000}h`
  return `every ${ms / 86_400_000}d`
}

function scheduleLabel(s: Schedule): string {
  if (s.type === 'cron' && s.cron)      return cronToHuman(s.cron)
  if (s.type === 'rate' && s.rateMs)    return rateLabel(s.rateMs)
  if (s.type === 'once' && s.runAt)     return new Date(s.runAt).toLocaleString()
  return ''
}

function agentNames(s: Schedule): string[] {
  return s.agent.split(/\s*→\s*|\s*->\s*/).map(a => a.trim()).filter(Boolean)
}

function displayName(s: Schedule): string {
  return s.id ?? agentNames(s)[0]?.replace(/\.kts$/, '') ?? s.agent
}

// ── Agent source modal ───────────────────────────────────────────────────────
function AgentSourceModal({ schedule, onClose }: { schedule: Schedule; onClose: () => void }) {
  const names = agentNames(schedule)
  const [activeAgent, setActiveAgent] = useState(names[0]?.replace(/\.kts$/, '') ?? '')
  const [source, setSource] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchedFor, setFetchedFor] = useState('')

  if (fetchedFor !== activeAgent && activeAgent) {
    setFetchedFor(activeAgent)
    setLoading(true)
    setSource(null)
    fetch(`/api/agent/${activeAgent}`)
      .then(r => r.json())
      .then((d: any) => setSource(d.content ?? d.error ?? 'empty'))
      .catch(() => setSource('Failed to load source'))
      .finally(() => setLoading(false))
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box modal-code" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <Code2 size={16} />
            <span>{displayName(schedule)}</span>
          </div>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        {names.length > 1 && (
          <div className="modal-tabs">
            {names.map(n => {
              const id = n.replace(/\.kts$/, '')
              return (
                <button
                  key={id}
                  className={`modal-tab ${id === activeAgent ? 'active' : ''}`}
                  onClick={() => setActiveAgent(id)}
                >{id}</button>
              )
            })}
          </div>
        )}

        <div className="modal-code-body">
          {loading && <div className="modal-loading">Loading…</div>}
          {!loading && source && (
            <pre className="modal-pre"><code>{source}</code></pre>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Week calendar ─────────────────────────────────────────────────────────────
interface CalEvent { schedule: Schedule; color: string; hour: number; dayOfWeek: number }

function buildWeekEvents(schedules: Schedule[]): CalEvent[][] {
  const byDay: CalEvent[][] = Array.from({ length: 7 }, () => [])
  schedules.forEach((s, i) => {
    const color = scheduleColor(i)
    if (s.type === 'cron' && s.cron) {
      const parts = s.cron.trim().split(/\s+/)
      const hour  = parseInt(parts[1]) || 0
      const dow   = parts[4] ?? '*'
      const days  = dow === '*' ? [0,1,2,3,4,5,6]
                  : dow === '1-5' ? [1,2,3,4,5]
                  : dow.split(',').map(Number).filter(n => !isNaN(n))
      days.forEach(d => byDay[d]?.push({ schedule: s, color, hour, dayOfWeek: d }))
    } else if (s.type === 'rate') {
      for (let d = 0; d < 7; d++) byDay[d].push({ schedule: s, color, hour: 0, dayOfWeek: d })
    }
  })
  return byDay
}

function WeekCalendar({
  schedules, weekStart, onSelect,
}: { schedules: Schedule[]; weekStart: Date; onSelect: (s: Schedule) => void }) {
  const byDay = buildWeekEvents(schedules)
  const hours = Array.from({ length: 24 }, (_, i) => i)
  const days  = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(weekStart.getDate() + i)
    return d
  })
  const today = new Date()

  return (
    <div className="cal-week">
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

      <div className="cal-grid-body">
        {hours.map(h => (
          <div key={h} className="cal-hour-row">
            <div className="cal-time-label">
              {h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h-12}pm`}
            </div>
            {days.map((_, di) => {
              const evs = byDay[di]?.filter(e => e.hour === h) ?? []
              return (
                <div key={di} className="cal-cell">
                  {evs.map((ev, ei) => (
                    <div
                      key={ei}
                      className="cal-event"
                      style={{ background: `${ev.color}22`, borderLeft: `3px solid ${ev.color}`, cursor: 'pointer' }}
                      onClick={() => onSelect(ev.schedule)}
                    >
                      <span className="cal-event-name" style={{ color: ev.color }}>
                        {displayName(ev.schedule)}
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

// ── Main page ─────────────────────────────────────────────────────────────────
export function CalendarPage() {
  const { snapshot } = useApp()
  const schedules = snapshot?.schedules ?? []
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<Schedule | null>(null)

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
        <p className="page-desc">Scheduled and recurring jobs managed by CORTEX.</p>
        <div className="cal-nav">
          <button className="icon-btn" onClick={() => setWeekOffset(v => v - 1)}><ChevronLeft size={16} /></button>
          <span className="cal-range">{fmt(weekStart)} — {fmt(weekEnd)}, {weekStart.getFullYear()}</span>
          <button className="icon-btn" onClick={() => setWeekOffset(v => v + 1)}><ChevronRight size={16} /></button>
          {weekOffset !== 0 && (
            <button className="btn-ghost" onClick={() => setWeekOffset(0)}>Today</button>
          )}
        </div>
      </div>

      {schedules.length > 0 && (
        <div className="cal-legend">
          {schedules.map((s, i) => (
            <div
              key={s.id}
              className="cal-legend-item"
              onClick={() => setSelected(s)}
              title="Click to view script"
            >
              <span className="cal-legend-dot" style={{ background: scheduleColor(i) }} />
              <div className="cal-legend-body">
                <div className="cal-legend-top">
                  <span className="cal-legend-name">{displayName(s)}</span>
                  <span className="cal-legend-info">
                    <Clock size={11} />
                    {scheduleLabel(s)}
                  </span>
                  <span className={`cal-legend-status ${s.enabled ? 'enabled' : 'disabled'}`}>
                    {s.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
                {agentNames(s).length > 1 && (
                  <div className="cal-legend-pipeline">
                    {agentNames(s).map(a => a.replace(/\.kts$/, '')).join(' → ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="nodes-empty-page">
          <Clock size={48} strokeWidth={1} style={{ color: '#2a3a55' }} />
          <div className="empty-state-title">No schedules configured</div>
          <div className="empty-state-sub">
            Define conditions in <code>heartbeat.md</code> to schedule recurring tasks.
          </div>
          <div className="cal-demo-note">
            <Bot size={14} />
            <span>Ask CORTEX: "schedule FileIndexerAgent to run every night at 2am"</span>
          </div>
        </div>
      ) : (
        <WeekCalendar schedules={schedules} weekStart={weekStart} onSelect={setSelected} />
      )}

      {selected && <AgentSourceModal schedule={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
