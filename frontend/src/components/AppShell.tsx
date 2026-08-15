import { useState, type ReactNode } from 'react'
import {
  Bot, ChevronRight, CloudSun, Cpu, Droplets, Gauge, LayoutDashboard,
  Leaf, Menu, Radio, Router, Sprout, Sun, Thermometer, Wind, X,
} from 'lucide-react'
import { getSensorCategory, sensorCategories } from '../lib/sensorCatalog'
import type { SensorCategoryId } from '../types'
import agentLogo from '../assets/branding/huanong-agent-logo.webp'
import brandWordmark from '../assets/branding/huanong-zhikong-wordmark.png'
import hzauLogo from '../assets/branding/hzau-logo-white.png'

export type PageId = 'dashboard' | 'sensors' | 'agent'

const navigation = [
  { id: 'dashboard' as const, label: '环境总览', hint: '实时态势', icon: LayoutDashboard },
  { id: 'sensors' as const, label: '传感器', hint: '设备与数据', icon: Radio },
  { id: 'agent' as const, label: 'Agent 决策', hint: '推理与执行', icon: Bot },
]

const categoryIcons = {
  air: Thermometer,
  co2: Wind,
  light: Sun,
  leaf: Leaf,
  soil: Sprout,
  weather: CloudSun,
  gateway: Router,
  controller: Cpu,
}

interface AppShellProps {
  page: PageId
  sensorCategory: SensorCategoryId
  onNavigate: (page: PageId) => void
  onSensorCategoryChange: (category: SensorCategoryId) => void
  children: ReactNode
}

export function AppShell({ page, sensorCategory, onNavigate, onSensorCategoryChange, children }: AppShellProps) {
  const [open, setOpen] = useState(false)
  const current = navigation.find((item) => item.id === page)!
  const sensorCurrent = getSensorCategory(sensorCategory)
  const navigate = (next: PageId) => { onNavigate(next); setOpen(false) }
  const selectSensorCategory = (category: SensorCategoryId) => {
    onSensorCategoryChange(category)
    onNavigate('sensors')
    setOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        <div className="brand"><img className="brand__agent" src={agentLogo} alt="华农智能体"/><img className="brand__wordmark" src={brandWordmark} alt="华农·智控"/></div>
        <div className="site-label"><span>GH-01</span><p>东部示范温室</p><button aria-label="切换温室"><ChevronRight size={14} /></button></div>
        <nav className="navigation" aria-label="主导航">
          <span className="navigation__eyebrow">工作区</span>
          {navigation.map((item) => {
            const Icon = item.icon
            const isSensorParent = item.id === 'sensors'
            const active = page === item.id
            return <div className={isSensorParent ? 'navigation__group' : undefined} key={item.id}>
              <button
                className={active ? (isSensorParent && sensorCategory !== 'all' ? 'is-parent-active' : 'is-active') : ''}
                onClick={() => isSensorParent ? selectSensorCategory('all') : navigate(item.id)}
                aria-expanded={isSensorParent ? active : undefined}
              >
                <Icon size={18} /><span><b>{item.label}</b><small>{item.hint}</small></span>
                {isSensorParent ? <ChevronRight className={`navigation__chevron ${active ? 'is-open' : ''}`} size={14} /> : null}
              </button>
              {isSensorParent && active ? <div className="navigation__sub" aria-label="传感器分类">
                {sensorCategories.slice(1).map((category) => {
                  const CategoryIcon = categoryIcons[category.id as keyof typeof categoryIcons] ?? Gauge
                  return <button className={sensorCategory === category.id ? 'is-active' : ''} onClick={() => selectSensorCategory(category.id)} key={category.id}>
                    <CategoryIcon size={14} /><span><b>{category.label}</b><small>{category.model}</small></span>
                  </button>
                })}
              </div> : null}
            </div>
          })}
        </nav>
        <div className="sidebar__footer"><div className="pulse-dot" /><div><b>边缘网关在线</b><span>最后心跳 8 秒前</span></div></div>
        <button className="sidebar__close" onClick={() => setOpen(false)} aria-label="关闭菜单"><X /></button>
      </aside>
      {open ? <button className="sidebar-scrim" onClick={() => setOpen(false)} aria-label="关闭菜单" /> : null}
      <main className="workspace">
        <header className="topbar">
          <button className="menu-button" onClick={() => setOpen(true)} aria-label="打开菜单"><Menu size={20} /></button>
          <div className="topbar__title">
            {page === 'dashboard' ? <h1>环境总览</h1> : <h1 className="topbar__breadcrumb">
              <span className="topbar__parent">{page === 'sensors' ? '传感器' : 'Agent 决策'}</span>
              <ChevronRight aria-hidden="true" />
              <strong className="topbar__current">{page === 'sensors' ? sensorCurrent.label : '环境推理工作台'}</strong>
            </h1>}
          </div>
          <div className="topbar__meta"><time>{new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())}</time><div className="topbar__institution"><img src={hzauLogo} alt="华中农业大学"/></div></div>
        </header>
        <section className="workspace__content">{children}</section>
      </main>
    </div>
  )
}
