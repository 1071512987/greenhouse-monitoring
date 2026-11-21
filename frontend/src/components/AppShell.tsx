import { useState, type ReactNode } from 'react'
import {
  Bot, ChevronRight, Dog, LayoutDashboard, Menu, MessageCircleQuestion,
  Radio, ScanLine, Sprout, TestTubes, X,
} from 'lucide-react'
import { agentCatalog, getAgentDefinition } from '../lib/agentCatalog'
import { getSensorNavItem, getSensorVendor, sensorNavItems, sensorVendors } from '../lib/sensorCatalog'
import type { AgentId, SensorVendorId } from '../types'
import agentLogo from '../assets/branding/huanong-agent-logo.webp'
import brandWordmark from '../assets/branding/huanong-zhikong-wordmark.png'
import hzauLogo from '../assets/branding/hzau-logo-white.png'

export type PageId = 'home' | 'plaza' | 'dashboard' | 'sensors' | 'agent'

const navigation = [
  { id: 'home' as const, label: '智能问答', hint: '返回首页', icon: MessageCircleQuestion },
  { id: 'plaza' as const, label: '智能体广场', hint: '发现专业能力', icon: Sprout },
  { id: 'dashboard' as const, label: '环境总览', hint: '实时态势', icon: LayoutDashboard },
  { id: 'sensors' as const, label: '传感器', hint: '设备与数据', icon: Radio },
  { id: 'agent' as const, label: '智能体中心', hint: '六类专职智能体', icon: Bot },
]

const agentIcons = {
  environment: Bot,
  fertilizer: TestTubes,
  'robot-dog': Dog,
  phenotype: ScanLine,
  'crop-model': Sprout,
  'machinery-qa': MessageCircleQuestion,
}

interface AppShellProps {
  page: PageId
  sensorVendor: SensorVendorId
  sensorId: string
  agentId: AgentId
  onNavigate: (page: PageId) => void
  onSelectSensor: (vendor: SensorVendorId, id: string) => void
  onAgentChange: (agent: AgentId) => void
  children: ReactNode
}

export function AppShell({ page, sensorVendor, sensorId, agentId, onNavigate, onSelectSensor, onAgentChange, children }: AppShellProps) {
  const [open, setOpen] = useState(false)
  const [openVendor, setOpenVendor] = useState<SensorVendorId | null>(sensorVendor)
  const current = navigation.find((item) => item.id === page)!
  const vendorCurrent = getSensorVendor(sensorVendor)
  const sensorCurrentItem = getSensorNavItem(sensorId)
  const agentCurrent = getAgentDefinition(agentId)
  const navigate = (next: PageId) => { onNavigate(next); setOpen(false) }
  const selectAgent = (nextAgent: AgentId) => {
    onAgentChange(nextAgent)
    onNavigate('agent')
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
            const isAgentParent = item.id === 'agent'
            const isGroup = isSensorParent || isAgentParent
            const active = page === item.id
            return <div className={isGroup ? 'navigation__group' : undefined} key={item.id}>
              <button
                className={active ? (isGroup ? 'is-parent-active' : 'is-active') : ''}
                onClick={() => isSensorParent ? (setOpenVendor(sensorVendor), onSelectSensor(sensorVendor, 'all')) : isAgentParent ? selectAgent(agentId) : navigate(item.id)}
                aria-expanded={isGroup ? active : undefined}
              >
                <Icon size={18} /><span><b>{item.label}</b><small>{item.hint}</small></span>
                {isGroup ? <ChevronRight className={`navigation__chevron ${active ? 'is-open' : ''}`} size={14} /> : null}
              </button>
              {isSensorParent && active ? <div className="navigation__sub" aria-label="传感器来源">
                {sensorVendors.map((vendor) => {
                  const expanded = openVendor === vendor.id
                  const vendorActive = sensorVendor === vendor.id
                  const items = sensorNavItems.filter((sensor) => sensor.vendorId === vendor.id)
                  return <div className="navigation__subgroup" key={vendor.id}>
                    <button className={vendorActive ? 'is-vendor-active' : ''} onClick={() => { setOpenVendor(expanded ? null : vendor.id); onSelectSensor(vendor.id, 'all') }} aria-expanded={expanded}>
                      <span><b>{vendor.label}</b><small>{vendor.hint}</small></span>
                      <ChevronRight className={`navigation__chevron ${expanded ? 'is-open' : ''}`} size={14} />
                    </button>
                    {expanded ? <>
                      <button className={vendorActive && sensorId === 'all' ? 'is-active' : ''} onClick={() => onSelectSensor(vendor.id, 'all')}>
                        <span><b>全部设备</b><small>汇总</small></span>
                      </button>
                      {items.map((sensor) => <button className={vendorActive && sensorId === sensor.id ? 'is-active' : ''} onClick={() => onSelectSensor(vendor.id, sensor.id)} key={sensor.id}>
                        <span><b>{sensor.label}</b><small>{sensor.hint}</small></span>
                      </button>)}
                    </> : null}
                  </div>
                })}
              </div> : null}
              {isAgentParent && active ? <div className="navigation__sub navigation__sub--agents" aria-label="智能体分类">
                {agentCatalog.map((agent) => {
                  const AgentIcon = agentIcons[agent.id]
                  return <button className={agentId === agent.id ? 'is-active' : ''} onClick={() => selectAgent(agent.id)} key={agent.id}>
                    <AgentIcon size={14} /><span><b>{agent.shortLabel}</b><small>{agent.hint}</small></span>
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
              <span className="topbar__parent">{page === 'sensors' ? vendorCurrent.label : '智能体中心'}</span>
              <ChevronRight aria-hidden="true" />
              <strong className="topbar__current">{page === 'sensors' ? (sensorId === 'all' ? '全部设备' : sensorCurrentItem?.label ?? '全部设备') : agentCurrent.label}</strong>
            </h1>}
          </div>
          <div className="topbar__meta"><time>{new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date())}</time><div className="topbar__institution"><img src={hzauLogo} alt="华中农业大学"/></div></div>
        </header>
        <section className="workspace__content">{children}</section>
      </main>
    </div>
  )
}
