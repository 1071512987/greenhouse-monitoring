import type { Sensor, SensorVendorId } from '../types'

export interface SensorNavItem {
	id: string
	label: string
	hint: string
	vendorId: SensorVendorId
}

export const sensorVendors: Array<{ id: SensorVendorId; label: string; hint: string }> = [
	{ id: 'xinpuhui', label: '新普惠', hint: '云平台 HTTP' },
	{ id: 'huachuang', label: '华创科技', hint: '控制器 MQTT' },
]

export const sensorNavItems: SensorNavItem[] = [
	{ id: 'indoor-air', label: '空气温湿度', hint: '温度 / 湿度', vendorId: 'xinpuhui' },
	{ id: 'indoor-co2', label: '二氧化碳', hint: 'CO₂', vendorId: 'xinpuhui' },
	{ id: 'indoor-light', label: '光照', hint: '照度', vendorId: 'xinpuhui' },
	{ id: 'indoor-leaf', label: '叶面温湿度', hint: '叶温 / 叶湿', vendorId: 'xinpuhui' },
	{ id: 'indoor-soil', label: '土壤综合', hint: '土温 / 土湿 / EC / 盐分', vendorId: 'xinpuhui' },
	{ id: 'outdoor-weather', label: '室外气象站', hint: '风速 / 雨量 / 气压', vendorId: 'xinpuhui' },
	{ id: 'mqtt-weather', label: '室外气象站', hint: '温湿 / 风速 / 风向', vendorId: 'huachuang' },
	{ id: 'mqtt-zone1-multi', label: '多要素传感器', hint: '区域1 · 温湿 / 光照 / 土壤', vendorId: 'huachuang' },
	{ id: 'mqtt-zone1-co2', label: '电子式温湿度计', hint: '区域1 · CO₂', vendorId: 'huachuang' },
	{ id: 'mqtt-zone2-multi', label: '多要素传感器2', hint: '区域2 · 温湿 / 光照 / 土壤', vendorId: 'huachuang' },
	{ id: 'mqtt-zone2-co2', label: '电子式温湿度计2', hint: '区域2 · CO₂', vendorId: 'huachuang' },
]

export function filterSensorsByVendor(sensors: Sensor[], vendor: SensorVendorId) {
	return sensors.filter((sensor) => sensor.vendor === vendor)
}

export function getSensorNavItem(id: string) {
	return sensorNavItems.find((item) => item.id === id)
}

export function getSensorVendor(id: SensorVendorId) {
	return sensorVendors.find((item) => item.id === id) ?? sensorVendors[0]
}
