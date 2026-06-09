export type JobStatus = 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED' | 'DEAD'

export interface Job {
  id: string
  queue: string
  status: JobStatus
  time: string
  result?: string | null
  pipelineId?: string | null
  pipelineStep?: number | null
  pipelineTotal?: number | null
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
  defaultValue?: string
  currentValue?: string | null
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
  id: string
  agent: string
  type: 'cron' | 'rate' | 'once'
  cron?: string
  rateMs?: number
  runAt?: string
  input?: string
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

export interface RegistryAgent {
  name: string
  description: string
  version: string
  role: string
  tags: string[]
  persistent: boolean
  url: string
  skillUrl: string
  author: string
}

export interface AgentRegistry {
  version: number
  source: string
  agents: RegistryAgent[]
}

export interface QueueStats {
  queue: string
  pending: number
  processing: number
  failed: number
  dead: number
}

export interface ClientDetail {
  ok: boolean
  id: string
  displayName: string
  queues: string[]
  agents: string[]
  createdAt: string | null
  stats: QueueStats[]
  error?: string
}

export interface LogResponse {
  jobId: string
  lines: string[]
  error?: string
  live?: boolean
}
