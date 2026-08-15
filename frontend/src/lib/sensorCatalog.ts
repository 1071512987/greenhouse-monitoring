import type { Sensor, SensorCategoryId } from '../types'

export const sensorCategories: Array<{ id: SensorCategoryId; label: string; shortLabel: string; model: string }> = [
  { id: 'all', label: '全部设备', shortLabel: '汇总', model: '9 台设备' },
  { id: 'air', label: '空气温湿度', shortLabel: '空气', model: 'PH-WSD-2G' },
  { id: 'co2', label: '二氧化碳', shortLabel: 'CO₂', model: 'PH-CO2-2H' },
  { id: 'light', label: '光照', shortLabel: '光照', model: 'PH-GZ-1A' },
  { id: 'leaf', label: '叶面温湿度', shortLabel: '叶面', model: 'PH-YMX-2K' },
  { id: 'soil', label: '土壤综合', shortLabel: '土壤', model: 'PH-TRWS-3C' },
  { id: 'weather', label: '多功能气象站', shortLabel: '气象', model: 'PH-QX7' },
  { id: 'gateway', label: '数据采集终端', shortLabel: '采集', model: 'PH-CJ-01' },
  { id: 'controller', label: '控制与计算', shortLabel: '控制', model: 'RI V1.0 / GWB' },
]

export function filterSensorsByCategory(sensors: Sensor[], category: SensorCategoryId) {
  return category === 'all' ? sensors : sensors.filter((sensor) => sensor.category === category)
}

export function getSensorCategory(category: SensorCategoryId) {
  return sensorCategories.find((item) => item.id === category) ?? sensorCategories[0]
}
