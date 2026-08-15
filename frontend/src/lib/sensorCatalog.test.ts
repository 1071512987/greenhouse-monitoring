import { describe, expect, it } from 'vitest'
import { filterSensorsByCategory, sensorCategories } from './sensorCatalog'
import type { Sensor } from '../types'

const sensors = [
  { id: 'AIR-01', category: 'air', model: 'PH-WSD-2G', name: '空气温湿度传感器' },
  { id: 'SOIL-01', category: 'soil', model: 'PH-TRWS-3C', name: '土壤综合传感器' },
] as Sensor[]

describe('sensor catalog', () => {
  it('covers every installed device category', () => {
    expect(sensorCategories.map((item) => item.id)).toEqual([
      'all', 'air', 'co2', 'light', 'leaf', 'soil', 'weather', 'gateway', 'controller',
    ])
  })

  it('returns all devices for the summary and only matching devices for a child category', () => {
    expect(filterSensorsByCategory(sensors, 'all')).toHaveLength(2)
    expect(filterSensorsByCategory(sensors, 'soil').map((sensor) => sensor.model)).toEqual(['PH-TRWS-3C'])
  })
})
