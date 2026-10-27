export type SensorStatus = 'online' | 'warning' | 'offline'
export type SensorCategoryId = 'all' | 'air' | 'co2' | 'light' | 'leaf' | 'soil' | 'weather' | 'gateway' | 'controller'
export type AgentId = 'environment' | 'fertilizer' | 'robot-dog' | 'phenotype' | 'crop-model' | 'machinery-qa'

export interface SensorMetric {
  label: string
  value: number | string
  unit: string
}

export interface Observation {
  timestamp: string
  temperature: number
  humidity: number
  soilMoisture: number
  light: number
}

export interface Sensor {
  id: string
  name: string
  category: Exclude<SensorCategoryId, 'all'>
  type: string
  model: string
  manufacturer: string
  zone: string
  connection: string
  value: number
  unit: string
  metrics: SensorMetric[]
  status: SensorStatus
  battery: number
  lastSeen: string
}

export interface Zone { name: string; temperature: number; humidity: number; health: number }
export interface Alert { id: string; severity: 'warning' | 'critical'; title: string; detail: string; time: string }

export interface DashboardData {
  latest: Observation
  history: Observation[]
  zones: Zone[]
  alerts: Alert[]
  online: number
  total: number
  updatedAt: string
  efficiency: number
}

export interface AgentAction { device: string; command: string; reason: string; priority: 'high' | 'medium' | 'low' }
export interface TraceStep { label: string; detail: string; outcome: string }
export interface AgentRun {
  id: string
  sourceName: string
  status: 'completed' | 'failed'
  summary: string
  confidence: number
  actions: AgentAction[]
  trace: TraceStep[]
  records: number
  createdAt: string
  completedAt: string
}
