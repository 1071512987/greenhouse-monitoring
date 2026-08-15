import type { AgentRun, DashboardData, Observation, Sensor } from '../types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new Error('无法连接温室服务，请确认 Go API 已启动')
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: `请求失败（${response.status}）` })) as { error?: string }
    throw new Error(body.error ?? `请求失败（${response.status}）`)
  }
  return response.json() as Promise<T>
}

export const api = {
  dashboard: () => request<DashboardData>('/api/dashboard'),
  sensors: () => request<Sensor[]>('/api/sensors'),
  agentRuns: () => request<AgentRun[]>('/api/agent/runs'),
  executeAgent: (sourceName: string, observations: Observation[]) => request<AgentRun>('/api/agent/runs', {
    method: 'POST', body: JSON.stringify({ sourceName, observations }),
  }),
}
