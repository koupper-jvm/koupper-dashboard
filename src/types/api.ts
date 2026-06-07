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

export interface AgentEnvVar {
  name: string
  required: boolean
  description: string
}

export interface AgentMetrics {
  totalRuns: number
  successRuns: number
  failedRuns: number
  successRate: string
  lastRun: string
}

export interface Agent {
  name: string
  description: string
  role?: string
  tags?: string[]
  persistent?: boolean
  providers?: string[]
  triggers?: string[]
  envVars?: AgentEnvVar[]
  setup?: string[]
  requires?: string[]
  running?: boolean
  metrics?: AgentMetrics
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

export interface ProviderTokenRow {
  provider: string
  in: number
  out: number
  total: number
}

export interface TokenMetrics {
  byProvider: ProviderTokenRow[]
  total: { in: number; out: number; total: number }
}

export interface SwarmSnapshot {
  type: 'snapshot'
  jobs: Job[]
  metrics: SwarmMetrics
  observability: ObservabilityData
  tokenMetrics?: TokenMetrics
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
