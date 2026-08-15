import { useEffect, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CloudSun, Droplets, Gauge, Sprout, Thermometer, WifiOff } from 'lucide-react'
import { api } from '../lib/api'
import type { DashboardData } from '../types'
import { MetricTile } from '../components/MetricTile'

function DashboardSkeleton() { return <div className="state-panel"><span className="loader" /><b>正在接入温室数据流</b><p>同步传感器与环境历史记录…</p></div> }

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    const load = () => api.dashboard().then((value) => { if (active) { setData(value); setError('') } }).catch((reason: Error) => { if (active) setError(reason.message) })
    load(); const timer = window.setInterval(load, 10000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  if (error && !data) return <div className="state-panel state-panel--error"><WifiOff /><b>数据流连接失败</b><p>{error}</p><button onClick={() => location.reload()}>重新连接</button></div>
  if (!data) return <DashboardSkeleton />
  const { latest } = data
  return <div className="dashboard-page">
    <div className="metrics-grid">
      <MetricTile label="冠层温度" value={latest.temperature.toFixed(1)} unit="°C" note="目标 22–28°C" tone="#d86f3d" icon={Thermometer} />
      <MetricTile label="空气湿度" value={latest.humidity.toFixed(1)} unit="% RH" note="处于舒适区间" tone="#3f8aa8" icon={Droplets} />
      <MetricTile label="根域含水率" value={latest.soilMoisture.toFixed(1)} unit="%" note="过去 2h 下降 1.4%" tone="#09803a" icon={Sprout} />
      <MetricTile label="自然光照" value={latest.light.toFixed(0)} unit="lx" note="补光策略未启动" tone="#c8982f" icon={CloudSun} />
    </div>
    <div className="dashboard-grid">
      <article className="panel environment-panel">
        <div className="panel__heading"><div><span className="eyebrow">ENVIRONMENT PULSE</span><h2>24 小时环境脉搏</h2></div><div className="chart-legend"><span className="temperature">温度</span><span className="humidity">湿度</span></div></div>
        <div className="daylight-band" aria-label="昼夜光照带">{data.history.map((item) => <i key={item.timestamp} style={{ opacity: Math.max(.08, item.light / 1000) }} />)}</div>
        <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={data.history} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs><linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d86f3d" stopOpacity=".22"/><stop offset="1" stopColor="#d86f3d" stopOpacity="0"/></linearGradient><linearGradient id="humidFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3f8aa8" stopOpacity=".16"/><stop offset="1" stopColor="#3f8aa8" stopOpacity="0"/></linearGradient></defs>
          <CartesianGrid vertical={false} stroke="#dce6df" strokeDasharray="2 5"/><XAxis dataKey="timestamp" tickFormatter={(value) => new Date(value).getHours().toString().padStart(2, '0') + ':00'} tick={{ fill: '#789087', fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={36}/><YAxis yAxisId="temp" domain={[15, 34]} tick={{ fill: '#789087', fontSize: 12 }} axisLine={false} tickLine={false}/><YAxis yAxisId="humidity" hide domain={[30, 90]}/>
          <Tooltip labelFormatter={(value) => typeof value === 'string' || typeof value === 'number' ? new Date(value).toLocaleString('zh-CN') : ''} contentStyle={{ border: '1px solid #d4e0d8', borderRadius: 4, boxShadow: '0 10px 30px rgba(23,60,52,.12)', fontSize: 12 }}/><Area yAxisId="temp" type="monotone" dataKey="temperature" name="温度 °C" stroke="#d86f3d" strokeWidth={2} fill="url(#tempFill)"/><Area yAxisId="humidity" type="monotone" dataKey="humidity" name="湿度 %" stroke="#3f8aa8" strokeWidth={1.8} fill="url(#humidFill)"/>
        </AreaChart></ResponsiveContainer></div>
        <footer className="chart-footer"><span>夜间</span><div /><span>日出 05:42</span><div /><span>日落 18:47</span></footer>
      </article>
      <article className="panel health-panel">
        <div className="panel__heading"><div><span className="eyebrow">SYSTEM HEALTH</span><h2>系统健康度</h2></div><Gauge size={19}/></div>
        <div className="health-score"><strong>{data.efficiency.toFixed(1)}</strong><span>%</span><p>综合运行效率</p></div>
        <div className="health-row"><span>传感器在线</span><b>{data.online} / {data.total}</b></div><div className="health-track"><i style={{ width: `${data.online / data.total * 100}%` }} /></div>
        <div className="health-stats"><div><span>数据完整率</span><b>99.4%</b></div><div><span>网关延迟</span><b>28 ms</b></div></div>
      </article>
      <article className="panel zone-panel">
        <div className="panel__heading"><div><span className="eyebrow">ZONE BENCHMARK</span><h2>分区状态</h2></div><span className="subtle">当前均值</span></div>
        <div className="zone-list">{data.zones.map((zone) => <div className="zone-row" key={zone.name}><div><b>{zone.name}</b><span>{zone.temperature.toFixed(1)}°C · {zone.humidity.toFixed(0)}% RH</span></div><div className="zone-meter"><i style={{ width: `${zone.health}%` }} /></div><strong>{zone.health}</strong></div>)}</div>
      </article>
      <article className="panel alerts-panel">
        <div className="panel__heading"><div><span className="eyebrow">ATTENTION</span><h2>需要关注</h2></div><span className="alert-count">{data.alerts.length}</span></div>
        <div className="alert-list">{data.alerts.map((alert) => <div className={`alert-item alert-item--${alert.severity}`} key={alert.id}><i/><div><b>{alert.title}</b><span>{alert.detail}</span></div><time>{alert.time}</time></div>)}</div>
      </article>
    </div>
  </div>
}
