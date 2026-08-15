import { describe, expect, it } from 'vitest'
import { parseObservationFile } from './importData'

describe('parseObservationFile', () => {
  it('parses a JSON observation array', () => {
    const result = parseObservationFile('readings.json', JSON.stringify([{
      timestamp: '2026-08-14T08:00:00Z', temperature: 26.2, humidity: 64,
      soilMoisture: 42, light: 720,
    }]))
    expect(result).toHaveLength(1)
    expect(result[0]?.soilMoisture).toBe(42)
  })

  it('parses CSV and accepts common Chinese column aliases', () => {
    const csv = '时间,温度,湿度,土壤湿度,光照\n2026-08-14T08:00:00Z,31.5,55,35,900'
    const result = parseObservationFile('readings.csv', csv)
    expect(result[0]).toMatchObject({ temperature: 31.5, humidity: 55, soilMoisture: 35, light: 900 })
  })

  it('rejects records with missing or non-numeric metrics', () => {
    expect(() => parseObservationFile('broken.json', '[{"temperature":"hot"}]')).toThrow('第 1 条记录')
  })

  it('rejects unsupported file types', () => {
    expect(() => parseObservationFile('notes.txt', 'hello')).toThrow('仅支持')
  })
})
