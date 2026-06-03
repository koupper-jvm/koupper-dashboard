export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'DEAD'

export interface Job {
  id: string
  queue: string
  status: JobStatus
  time: string
  result?: string | null
}

export interface ObservabilityData {
  jobsPerMin: string
  successRate: string
  p50Ms: number
  p95Ms: number
  totalLastHour: number
  doneLastHour: number
  failedLastHour: number
  sparkline: [number, number][]
}

export interface Agent {
  name: string
  description: string
}

export interface Schedule {
  agent: string
  type: 'cron' | 'rate' | 'once'
  cron?: string
  rateMs?: number
  runAt?: string
  enabled?: boolean
}

export interface SwarmMetrics {
  pending: number
  processing: number
  done: number
  failed: number
}

export interface SwarmSnapshot {
  type: 'snapshot'
  jobs: Job[]
  metrics: SwarmMetrics
  observability: ObservabilityData
  agents: Agent[]
  schedules: Schedule[]
  cortexActive: boolean
  time: string
}

export interface HistoryEntry {
  id: string
  queue: string
  status: string
  time: string
  finishedAt: string
  result?: string | null
}

export interface LogResponse {
  jobId: string
  lines: string[]
  error?: string
}
