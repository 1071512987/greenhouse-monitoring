import type { Observation } from '../types'

const aliases = {
  timestamp: ['timestamp', 'time', 'datetime', '时间', '采集时间'],
  temperature: ['temperature', 'temp', '温度'],
  humidity: ['humidity', 'airhumidity', '湿度', '空气湿度'],
  soilMoisture: ['soilmoisture', 'soil', '土壤湿度', '土壤含水率'],
  light: ['light', 'lux', '光照', '光照强度'],
} as const

type RawRecord = Record<string, unknown>

const normalized = (key: string) => key.toLowerCase().replace(/[\s_-]/g, '')

function readField(record: RawRecord, field: keyof typeof aliases): unknown {
  const entry = Object.entries(record).find(([key]) => aliases[field].includes(normalized(key) as never))
  return entry?.[1]
}

function toObservation(record: RawRecord, index: number): Observation {
  const timestampValue = readField(record, 'timestamp')
  const timestamp = typeof timestampValue === 'string' && !Number.isNaN(Date.parse(timestampValue))
    ? new Date(timestampValue).toISOString()
    : new Date(Date.now() + index * 1000).toISOString()
  const metric = (field: keyof typeof aliases) => Number(readField(record, field))
  const observation = {
    timestamp,
    temperature: metric('temperature'),
    humidity: metric('humidity'),
    soilMoisture: metric('soilMoisture'),
    light: metric('light'),
  }
  if ([observation.temperature, observation.humidity, observation.soilMoisture, observation.light].some((value) => !Number.isFinite(value))) {
    throw new Error(`第 ${index + 1} 条记录缺少有效的温度、湿度、土壤湿度或光照数据`)
  }
  return observation
}

function parseCSV(text: string): RawRecord[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) throw new Error('CSV 文件至少需要表头和一行数据')
  const headers = lines[0]!.split(',').map((item) => item.trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((item) => item.trim())
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  })
}

export function parseObservationFile(name: string, text: string): Observation[] {
  const extension = name.split('.').pop()?.toLowerCase()
  let records: RawRecord[]
  if (extension === 'json') {
    let parsed: unknown
    try { parsed = JSON.parse(text) } catch { throw new Error('JSON 文件格式无效') }
    records = Array.isArray(parsed) ? parsed as RawRecord[] : [parsed as RawRecord]
  } else if (extension === 'csv') {
    records = parseCSV(text)
  } else {
    throw new Error('仅支持 .json 或 .csv 数据文件')
  }
  if (records.length === 0) throw new Error('文件中没有可分析的数据')
  if (records.length > 5000) throw new Error('单次最多导入 5000 条记录')
  return records.map(toObservation)
}
