import {
  BarChart, Bar, Cell, ResponsiveContainer, Tooltip,
} from 'recharts'
import type { ObservabilityData } from '../types/api'

interface Props {
  obs: ObservabilityData
}

function fmtMs(ms: number): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}m`
}

export function ObservabilityBar({ obs }: Props) {
  const sr = parseFloat(obs.successRate) || 100
  const srColor = sr >= 95 ? 'var(--green)' : sr >= 80 ? 'var(--yellow)' : 'var(--red)'

  const chartData = obs.sparkline.map((bucket, i) => ({
    name: `${(11 - i) * 5}m ago`,
    done: bucket[0],
    failed: bucket[1],
  }))

  return (
    <div className="obs-bar">
      <ObsItem label="Jobs/min" value={obs.jobsPerMin} sub="last 60m" color="var(--cyan)" />
      <div className="obs-sep" />
      <ObsItem
        label="Success rate"
        value={`${sr.toFixed(1)}%`}
        sub={`${obs.doneLastHour}d / ${obs.failedLastHour}f`}
        color={srColor}
      />
      <div className="obs-sep" />
      <ObsItem label="P50" value={fmtMs(obs.p50Ms)} sub="median"  color="var(--purple)" />
      <ObsItem label="P95" value={fmtMs(obs.p95Ms)} sub="95th pct" color="var(--yellow)" />
      <div className="obs-sep" />
      <div className="obs-spark-wrap">
        <span className="obs-label">Activity (1h)</span>
        <div style={{ width: 160, height: 36 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barSize={8} barCategoryGap={2}>
              <Bar dataKey="done" stackId="a" fill="var(--green)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill="var(--red)" radius={[2, 2, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} />
                ))}
              </Bar>
              <Tooltip
                contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border)', fontSize: 11 }}
                labelStyle={{ color: 'var(--muted)' }}
                itemStyle={{ color: 'var(--text)' }}
                cursor={{ fill: 'rgba(255,255,255,0.04)' }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function ObsItem({
  label, value, sub, color,
}: { label: string; value: string; sub: string; color: string }) {
  return (
    <div className="obs-item">
      <span className="obs-label">{label}</span>
      <span className="obs-value" style={{ color }}>{value}</span>
      <span className="obs-sub">{sub}</span>
    </div>
  )
}
