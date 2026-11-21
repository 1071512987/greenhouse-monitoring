import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Filter, Radio, Search, WifiOff } from 'lucide-react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { StatusMark } from '../components/StatusMark'
import { api } from '../lib/api'
import { getSensorVendor } from '../lib/sensorCatalog'
import type { MeasurementPage, Sensor, SensorStatus, SensorVendorId } from '../types'

const PAGE_SIZE = 288
const linePalette = ['#d86f3d', '#3f8aa8', '#09803a', '#c8982f', '#7a5ea8', '#b85a45', '#5a8f7b', '#6b7f8f']

export function SensorsPage({ vendor, sensorId, onBack }: { vendor: SensorVendorId; sensorId: string; onBack: () => void }) {
  const [sensors, setSensors] = useState<Sensor[]>([])
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | SensorStatus>('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [detailId, setDetailId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const load = () => api.sensors()
      .then((value) => { if (active) { setSensors(value); setError('') } })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    load()
    const timer = window.setInterval(load, 15000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const vendorSensors = useMemo(() => sensors.filter((sensor) => sensor.vendor === vendor), [sensors, vendor])
  const filtered = useMemo(() => vendorSensors.filter((sensor) => (
    (status === 'all' || sensor.status === status)
    && `${sensor.name}${sensor.id}${sensor.model}${sensor.zone}`.toLowerCase().includes(query.toLowerCase())
  )), [vendorSensors, status, query])

  const selected = sensorId !== 'all' ? vendorSensors.find((sensor) => sensor.id === sensorId) ?? null : null
  const detail = detailId ? vendorSensors.find((sensor) => sensor.id === detailId) ?? null : null
  if (selected) return <SensorDetail sensor={selected} onBack={onBack} />
  if (detail) return <SensorDetail sensor={detail} onBack={() => setDetailId(null)} />

  if (loading) return <div className="state-panel"><span className="loader"/><b>正在读取设备目录</b></div>
  if (error) return <div className="state-panel state-panel--error"><WifiOff/><b>设备数据不可用</b><p>{error}</p></div>

  const vendorInfo = getSensorVendor(vendor)
  const online = vendorSensors.filter((sensor) => sensor.status !== 'offline').length
  return <div className="sensors-page">
    <div className="page-intro">
      <p>{vendorInfo.label}（{vendorInfo.hint}）· 点击任意设备查看实时读数和历史曲线。</p>
      <div className="summary-block"><Radio/><span><b>{online} / {vendorSensors.length}</b> 台设备在线</span></div>
    </div>
    <div className="sensor-toolbar"><label><Search size={17}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索设备、编号或区域"/></label><div className="status-filter"><Filter size={15}/>{(['all','online','warning','offline'] as const).map((value) => <button className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)} key={value}>{({ all:'全部', online:'在线', warning:'需关注', offline:'离线' })[value]}</button>)}</div></div>
    <div className="sensor-table-wrap"><table className="sensor-table"><thead><tr><th>设备</th><th>型号</th><th>部署区域</th><th>接入方式</th><th>状态</th><th>最近上报</th></tr></thead><tbody>{filtered.map((sensor) => <tr key={sensor.id} onClick={() => setDetailId(sensor.id)} style={{ cursor: 'pointer' }}><td><div className="device-name"><span><Radio size={16}/></span><div><b>{sensor.name}</b><small>{sensor.id}</small></div></div></td><td><strong className="model-code">{sensor.model}</strong></td><td>{sensor.zone}</td><td>{sensor.connection}</td><td><StatusMark status={sensor.status}/></td><td className="muted">{sensor.lastSeen}</td></tr>)}</tbody></table>{filtered.length === 0 ? <EmptyState /> : null}</div>
  </div>
}

function SensorDetail({ sensor, onBack }: { sensor: Sensor; onBack: () => void }) {
  const [page, setPage] = useState(1)
  const [history, setHistory] = useState<MeasurementPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    api.sensorMeasurements(sensor.id, { page: String(page), pageSize: String(PAGE_SIZE) })
      .then((value) => { if (active) { setHistory(value); setError('') } })
      .catch((reason: Error) => { if (active) setError(reason.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sensor.id, page])

  const totalPages = history ? Math.max(1, Math.ceil(history.total / history.pageSize)) : 1
  const chartData = useMemo(() => (history?.items ?? []).map((point) => {
    const row: Record<string, string | number> = { time: formatTime(point.timestamp) }
    for (const metric of point.metrics) row[metric.label] = metric.value
    return row
  }), [history])
  const lines = useMemo(() => sensor.metrics.map((metric) => metric.label), [sensor.metrics])

  return <div className="sensor-detail-page">
    <div className="sensor-detail-head">
      <button className="sensor-detail-back" onClick={onBack}><ArrowLeft size={15}/>返回设备列表</button>
      <div className="sensor-detail-title"><span><Radio size={18}/></span><div><small>{sensor.id}</small><h2>{sensor.name}</h2></div><StatusMark status={sensor.status}/></div>
      <div className="sensor-detail-meta">{sensor.model} · {sensor.zone} · {sensor.connection}</div>
    </div>

    <div className="sensor-metrics panel">{sensor.metrics.length ? sensor.metrics.map((metric) => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}<small>{metric.unit}</small></strong></div>) : <div><span>暂无实时数据</span><strong>—</strong></div>}</div>

    <article className="sensor-history-panel panel">
      <div className="panel__heading"><div><span className="eyebrow">HISTORY</span><h2>历史曲线</h2></div></div>
      <div className="sensor-history-toolbar"><span>共 {history?.total ?? 0} 个时间点</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</button><span>第 {page} / {totalPages} 页</span><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>下一页</button></div></div>
      {loading ? <div className="state-panel"><span className="loader"/><b>正在读取历史数据</b></div>
        : error ? <div className="state-panel state-panel--error"><WifiOff/><b>历史数据不可用</b><p>{error}</p></div>
        : !history || history.items.length === 0 ? <div className="empty-state"><Search/><b>暂无历史数据</b><span>采集器写入数据后会自动显示。</span></div>
        : <div className="sensor-history-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} margin={{ top: 8, right: 14, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#dce6df" strokeDasharray="2 5"/>
          <XAxis dataKey="time" tick={{ fill: '#789087', fontSize: 11 }} minTickGap={42} axisLine={false} tickLine={false}/>
          <YAxis tick={{ fill: '#789087', fontSize: 11 }} width={46} axisLine={false} tickLine={false}/>
          <Tooltip contentStyle={{ border: '1px solid #d4e0d8', borderRadius: 4, fontSize: 12 }}/>
          <Legend wrapperStyle={{ fontSize: 11 }}/>
          {lines.map((label, index) => <Line key={label} type="monotone" dataKey={label} stroke={linePalette[index % linePalette.length]} strokeWidth={2} dot={false}/>)}
        </LineChart></ResponsiveContainer></div>}
    </article>
  </div>
}

function formatTime(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value)
  return match ? `${match[2]}-${match[3]} ${match[4]}:${match[5]}` : value
}

function EmptyState() {
  return <div className="empty-state"><Search/><b>没有匹配的设备</b><span>调整关键词或状态筛选。</span></div>
}
