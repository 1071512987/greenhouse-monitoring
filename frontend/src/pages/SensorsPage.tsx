import { useEffect, useMemo, useState } from 'react'
import { Battery, Filter, MapPin, Radio, Search, Signal, WifiOff } from 'lucide-react'
import { StatusMark } from '../components/StatusMark'
import { api } from '../lib/api'
import { filterSensorsByCategory, getSensorCategory } from '../lib/sensorCatalog'
import type { Sensor, SensorCategoryId, SensorStatus } from '../types'

export function SensorsPage({ category }: { category: SensorCategoryId }) {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | SensorStatus>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { api.sensors().then(setSensors).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false)) }, [])
  const categoryInfo = getSensorCategory(category)
  const categorySensors = useMemo(() => filterSensorsByCategory(sensors, category), [sensors, category])
  const filtered = useMemo(() => categorySensors.filter((sensor) => (
    (status === 'all' || sensor.status === status)
    && `${sensor.name}${sensor.id}${sensor.model}${sensor.zone}`.toLowerCase().includes(query.toLowerCase())
  )), [categorySensors, status, query])

  if (loading) return <div className="state-panel"><span className="loader"/><b>正在读取设备目录</b></div>
  if (error) return <div className="state-panel state-panel--error"><WifiOff/><b>设备数据不可用</b><p>{error}</p></div>

  const online = categorySensors.filter((sensor) => sensor.status !== 'offline').length
  return <div className="sensors-page">
    <div className="page-intro">
      <p>{category === 'all' ? '统一查看全部接入设备的连通状态与部署信息。' : `查看 ${categoryInfo.model} 的专属监测指标与接入状态。`}</p>
      <div className="summary-block"><Radio/><span><b>{online} / {categorySensors.length}</b> 台设备在线</span></div>
    </div>
    <div className="sensor-toolbar"><label><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索设备、型号、编号或区域"/></label><div className="status-filter"><Filter size={15}/>{(['all','online','warning','offline'] as const).map((value) => <button className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)} key={value}>{({ all:'全部', online:'在线', warning:'需关注', offline:'离线' })[value]}</button>)}</div></div>

    {category === 'all' ? <div className="sensor-table-wrap"><table className="sensor-table"><thead><tr><th>设备</th><th>设备类型</th><th>型号</th><th>部署区域</th><th>接入方式</th><th>状态</th><th>最近上报</th></tr></thead><tbody>{filtered.map((sensor) => <tr key={sensor.id}><td><div className="device-name"><span><Radio size={16}/></span><div><b>{sensor.name}</b><small>{sensor.id}</small></div></div></td><td>{getSensorCategory(sensor.category).shortLabel}</td><td><strong className="model-code">{sensor.model}</strong></td><td>{sensor.zone}</td><td>{sensor.connection}</td><td><StatusMark status={sensor.status}/></td><td className="muted">{sensor.lastSeen}</td></tr>)}</tbody></table>{filtered.length === 0 ? <EmptyState /> : null}</div>
    : <div className="sensor-detail-grid">{filtered.map((sensor) => <article className="sensor-detail-card panel" key={sensor.id}>
      <header><div className="sensor-detail-card__identity"><span><Radio size={18}/></span><div><small>{sensor.id}</small><h3>{sensor.name}</h3></div></div><StatusMark status={sensor.status}/></header>
      <div className="sensor-model"><span>设备型号</span><strong>{sensor.model}</strong><small>{sensor.manufacturer}</small></div>
      <div className="sensor-metrics">{sensor.metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}<small>{metric.unit}</small></strong></div>)}</div>
      <footer><span><MapPin size={13}/>{sensor.zone}</span><span><Signal size={13}/>{sensor.connection}</span>{sensor.battery < 100 ? <span><Battery size={13}/>{sensor.battery}%</span> : null}<time>{sensor.lastSeen}上报</time></footer>
    </article>)}{filtered.length === 0 ? <EmptyState /> : null}</div>}
  </div>
}

function EmptyState() {
  return <div className="empty-state"><Search/><b>没有匹配的设备</b><span>调整关键词或状态筛选。</span></div>
}
