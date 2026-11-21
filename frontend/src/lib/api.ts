import type { AgentRun, DashboardData, MeasurementPage, Observation, Sensor } from '../types'

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
	sensorMeasurements: (id: string, params: { page?: string; pageSize?: string; metric?: string }) => {
		const search = new URLSearchParams()
		if (params.page) search.set('page', params.page)
		if (params.pageSize) search.set('pageSize', params.pageSize)
		if (params.metric) search.set('metric', params.metric)
		const query = search.toString()
		return request<MeasurementPage>(`/api/sensors/${encodeURIComponent(id)}/measurements${query ? `?${query}` : ''}`)
	},
  agentRuns: () => request<AgentRun[]>('/api/agent/runs'),
  executeAgent: (sourceName: string, observations: Observation[]) => request<AgentRun>('/api/agent/runs', {
    method: 'POST', body: JSON.stringify({ sourceName, observations }),
  }),
}

export class AssistantError extends Error {
	code: number
	constructor(code: number, message: string) {
		super(message)
		this.code = code
	}
}

interface AssistantStreamCallbacks {
	onMeta?: (sessionId: string) => void
	onDelta?: (content: string) => void
	onDone?: (elapsedMs?: number) => void
}

export async function assistantChatStream(message: string, sessionId: string | null, callbacks: AssistantStreamCallbacks): Promise<void> {
	const response = await fetch('/api/assistant/chat/stream', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ message, session_id: sessionId ?? undefined }),
	})
	if (!response.ok) {
		let code = 0
		let text = `请求失败（${response.status}）`
		try {
			const body = await response.json() as { code?: number; message?: string }
			if (typeof body.code === 'number') code = body.code
			if (body.message) text = body.message
		} catch { /* 非 JSON 错误体，保留默认文案 */ }
		throw new AssistantError(code, text)
	}
	if (!response.body) throw new AssistantError(0, '当前浏览器不支持流式读取')

	const handleFrame = (frame: string) => {
		if (!frame.trim()) return
		const event = /^event: (.+)$/m.exec(frame)?.[1]
		const raw = /^data: (.+)$/m.exec(frame)?.[1] ?? '{}'
		let data: Record<string, unknown> = {}
		try { data = JSON.parse(raw) } catch { data = {} }
		if (event === 'meta') callbacks.onMeta?.(String(data.session_id ?? ''))
		else if (event === 'delta') callbacks.onDelta?.(String(data.content ?? ''))
		else if (event === 'done') callbacks.onDone?.(typeof data.elapsed_ms === 'number' ? data.elapsed_ms : undefined)
		else if (event === 'error') {
			throw new AssistantError(Number(data.code ?? 50001), String(data.message ?? '生成失败'))
		}
	}

	const reader = response.body.getReader()
	const decoder = new TextDecoder()
	let buffer = ''
	while (true) {
		const { value, done } = await reader.read()
		if (done) break
		buffer += decoder.decode(value, { stream: true })
		let index: number
		while ((index = buffer.indexOf('\n\n')) >= 0) {
			const frame = buffer.slice(0, index)
			buffer = buffer.slice(index + 2)
			handleFrame(frame)
		}
	}
	buffer += decoder.decode()
	if (buffer.trim()) handleFrame(buffer)
}

export async function assistantDeleteSession(id: string): Promise<void> {
	try {
		await fetch(`/api/assistant/sessions/${encodeURIComponent(id)}`, { method: 'DELETE' })
	} catch { /* 忽略删除失败，本地状态已清理 */ }
}
