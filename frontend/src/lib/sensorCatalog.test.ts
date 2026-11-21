import { describe, expect, it } from 'vitest'
import { filterSensorsByVendor, sensorNavItems, sensorVendors } from './sensorCatalog'
import type { Sensor } from '../types'

const sensors = [
  { id: 'indoor-air', vendor: 'xinpuhui', name: '空气温湿度传感器' },
  { id: 'mqtt-weather', vendor: 'huachuang', name: '室外气象站' },
] as Sensor[]

describe('sensor catalog', () => {
  it('lists both vendors', () => {
    expect(sensorVendors.map((item) => item.id)).toEqual(['xinpuhui', 'huachuang'])
  })

  it('groups sensors under their vendor', () => {
    expect(sensorNavItems.filter((item) => item.vendorId === 'xinpuhui').map((item) => item.id)).toContain('indoor-air')
    expect(sensorNavItems.filter((item) => item.vendorId === 'huachuang').map((item) => item.id)).toContain('mqtt-weather')
  })

  it('filters sensors by vendor', () => {
    expect(filterSensorsByVendor(sensors, 'xinpuhui').map((sensor) => sensor.id)).toEqual(['indoor-air'])
    expect(filterSensorsByVendor(sensors, 'huachuang').map((sensor) => sensor.id)).toEqual(['mqtt-weather'])
  })
})
