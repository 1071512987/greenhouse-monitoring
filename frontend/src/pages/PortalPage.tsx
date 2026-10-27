import { useState } from 'react'
import { ArrowUp, ArrowUpRight, ArrowLeft, Sprout, Thermometer, FlaskConical, Dog, ScanLine, ChartNoAxesCombined, MessageCircle, LayoutGrid, Search } from 'lucide-react'
import type { PageId } from '../components/AppShell'
import type { AgentId } from '../types'
import { agentCatalog } from '../lib/agentCatalog'
import logo from '../assets/branding/huanong-agent-logo.webp'
import wordmark from '../assets/branding/huanong-zhikong-wordmark.png'
import university from '../assets/branding/hzau-logo-white.png'
import './portal.css'

const icons = [Thermometer, FlaskConical, Dog, ScanLine, ChartNoAxesCombined, MessageCircle]
const prompts = ['温室温度偏高，如何调控？', '如何提取植株的表型指标？', '水肥机出现故障怎么排查？']
const matchAgent = (text: string): AgentId => /表型|株高|叶面积|鲜重|RGBD/i.test(text) ? 'phenotype' : /肥|养分|营养/.test(text) && !/机器|故障|水肥机/.test(text) ? 'fertilizer' : /机器狗|病虫|巡检/.test(text) ? 'robot-dog' : /模型|产量|预测/.test(text) ? 'crop-model' : /故障|农机|维修|设备|水肥机/.test(text) ? 'machinery-qa' : 'environment'

interface Props {
  page: 'home' | 'plaza'
  question: string
  onQuestionChange: (text: string) => void
  onNavigate: (page: PageId) => void
  onSelectAgent: (id: AgentId) => void
}

export function PortalPage({ page, question, onQuestionChange, onNavigate, onSelectAgent }: Props) {
  const [submitted, setSubmitted] = useState('')
  const [search, setSearch] = useState('')
  const recommendation = agentCatalog.find((agent) => agent.id === matchAgent(submitted))!
  const ask = (text: string) => { if (text.trim()) { onQuestionChange(text); setSubmitted(text.trim()) } }
  return <div className="portal">
    <header className="portal-header">
      <button className="portal-brand" onClick={() => onNavigate('home')} aria-label="华农智控首页"><img src={logo} alt="华农智能体" /><img className="portal-wordmark" src={wordmark} alt="华农·智控" /></button>
      <nav aria-label="平台导航"><button className={page === 'home' ? 'selected' : ''} onClick={() => onNavigate('home')}>智能问答</button><button className={page === 'plaza' ? 'selected' : ''} onClick={() => onNavigate('plaza')}>智能体广场</button><button onClick={() => onNavigate('dashboard')}>温室监控 <ArrowUpRight size={14} /></button><button onClick={() => onNavigate('sensors')}>传感器</button></nav>
      <img className="portal-university" src={university} alt="华中农业大学" />
    </header>
    {page === 'home' ? <main className="portal-home">
      <div className="portal-greeting"><img src={logo} alt="" /><span>扎根农业 · 智见生长</span><h1>你好，今天有什么可以帮你？</h1><p>从温室环境到作物生长，让每一个农业问题都有方向。</p></div>
      <form className="portal-composer" onSubmit={(event) => { event.preventDefault(); ask(question) }}>
        <textarea aria-label="农业问题" placeholder="描述你的农业问题，或告诉我你想完成的任务…" value={question} onChange={(event) => onQuestionChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(question) } }} />
        <div className="portal-composer-bottom"><span><Sprout size={16} /> 设施农业助手</span><small>Enter 发送 · Shift + Enter 换行</small><button type="submit" disabled={!question.trim()} aria-label="发送问题"><ArrowUp size={20} /></button></div>
      </form>
      {submitted ? <section className="portal-recommendation" aria-live="polite"><span>任务建议</span><p>{submitted}</p><p>这个问题可以从「{recommendation.shortLabel}」工作区开始处理。通用问答模型尚未接入，当前提供任务导航。</p><button onClick={() => onSelectAgent(recommendation.id)}>进入{recommendation.shortLabel} <ArrowUpRight size={16} /></button></section> : <div className="portal-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)}>{prompt}<ArrowUpRight size={13} /></button>)}</div>}
      <button className="portal-plaza-link" onClick={() => onNavigate('plaza')}><span className="portal-plaza-symbol"><LayoutGrid size={22} /></span><span><b>智能体广场</b><small>探索 6 位农业专业助手</small></span><ArrowUpRight size={20} /></button>
    </main> : <main className="portal-plaza"><button className="portal-back" onClick={() => onNavigate('home')}><ArrowLeft size={15} /> 返回问答</button><div className="portal-plaza-heading"><div><span>让专业的助手，处理专业的事</span><h1>智能体广场</h1><p>覆盖感知、决策与作业，选择你的农业工作伙伴。</p></div><label><Search size={17} /><input aria-label="搜索智能体" placeholder="搜索名称或能力" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      <div className="portal-agent-grid">{agentCatalog.map((agent, index) => { const Icon = icons[index]; return `${agent.label}${agent.description}`.includes(search.trim()) ? <button className="portal-agent-card" key={agent.id} onClick={() => onSelectAgent(agent.id)}><div className={`portal-agent-icon tone-${index}`}><Icon size={25} /></div><h2>{agent.shortLabel}智能体</h2><p>{agent.description}</p><div className="portal-agent-bottom"><span>{agent.state}</span><b>进入工作区 <ArrowUpRight size={16} /></b></div></button> : null })}</div>
      {!agentCatalog.some((agent) => `${agent.label}${agent.description}`.includes(search.trim())) ? <p role="status">未找到匹配的智能体，请尝试“环境”“表型”或“农机”。</p> : null}
    </main>}
    <footer className="portal-footer">华中农业大学 <span>·</span> 华农智控 <span>让农业知识走向生产现场</span></footer>
  </div>
}
