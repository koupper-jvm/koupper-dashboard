import type { SwarmMetrics } from '../types/api'

interface Props {
  metrics: SwarmMetrics
  agentCount: number
  scheduleCount: number
}

export function MetricsBar({ metrics, agentCount, scheduleCount }: Props) {
  return (
    <div className="metrics-bar">
      <Metric label="Pending"    value={metrics.pending}    color="var(--yellow)" />
      <Metric label="Processing" value={metrics.processing} color="var(--purple)" />
      <Metric label="Done"       value={metrics.done}       color="var(--green)"  />
      <Metric label="Failed"     value={metrics.failed}     color="var(--red)"    />
      <div className="metrics-sep" />
      <Metric label="Agents"    value={agentCount}    color="var(--cyan)"    />
      <Metric label="Schedules" value={scheduleCount} color="var(--teal)"    />
    </div>
  )
}

function Metric({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value" style={{ color }}>{value}</span>
    </div>
  )
}
