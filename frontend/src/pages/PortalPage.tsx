import { useEffect, useRef, useState } from 'react'
import { ArrowUp, ArrowUpRight, ArrowLeft, Sprout, Thermometer, FlaskConical, Dog, ScanLine, ChartNoAxesCombined, MessageCircle, LayoutGrid, Search } from 'lucide-react'
import type { PageId } from '../components/AppShell'
import type { AgentId } from '../types'
import { agentCatalog } from '../lib/agentCatalog'
import { AssistantError, assistantChatStream, assistantDeleteSession } from '../lib/api'
import logo from '../assets/branding/huanong-agent-logo.webp'
import wordmark from '../assets/branding/huanong-zhikong-wordmark.png'
import university from '../assets/branding/hzau-logo-white.png'
import './portal.css'

const icons = [Thermometer, FlaskConical, Dog, ScanLine, ChartNoAxesCombined, MessageCircle]
const prompts = ['温室温度偏高，如何调控？', '如何提取植株的表型指标？', '水肥机出现故障怎么排查？']

type ChatRole = 'user' | 'assistant' | 'system'
interface ChatMessage { role: ChatRole; content: string; error?: boolean }

interface Props {
  page: 'home' | 'plaza'
  question: string
  onQuestionChange: (text: string) => void
  onNavigate: (page: PageId) => void
  onSelectAgent: (id: AgentId) => void
}

export function PortalPage({ page, question, onQuestionChange, onNavigate, onSelectAgent }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('assistant.session_id'))
  const [search, setSearch] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = listRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, sending])

  const runAssistant = async (message: string, sid: string | null) => {
    await assistantChatStream(message, sid, {
      onMeta: (id) => { setSessionId(id); localStorage.setItem('assistant.session_id', id) },
      onDelta: (content) => setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.role === 'assistant') {
          const next = [...prev]
          next[prev.length - 1] = { ...last, content: last.content + content }
          return next
        }
        return [...prev, { role: 'assistant', content }]
      }),
    })
  }

  const failAssistant = (reason: unknown) => {
    const text = reason instanceof Error ? reason.message : '生成失败，请稍后重试'
    setMessages((prev) => [...prev, { role: 'system', content: `回答失败：${text}`, error: true }])
  }

  const ask = async (text: string) => {
    const message = text.trim()
    if (!message || sending) return
    onQuestionChange('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setSending(true)
    try {
      await runAssistant(message, sessionId)
    } catch (reason) {
      if (reason instanceof AssistantError && reason.code === 40401) {
        localStorage.removeItem('assistant.session_id')
        setSessionId(null)
        setMessages((prev) => [...prev, { role: 'system', content: '会话已过期，已为你开启新对话' }])
        try {
          await runAssistant(message, null)
        } catch (reason2) {
          failAssistant(reason2)
        }
      } else {
        failAssistant(reason)
      }
    } finally {
      setSending(false)
    }
  }

  const newChat = async () => {
    if (sessionId) assistantDeleteSession(sessionId)
    setSessionId(null)
    localStorage.removeItem('assistant.session_id')
    setMessages([])
    onQuestionChange('')
  }

  const thinking = sending && (messages.length === 0 || messages[messages.length - 1].role !== 'assistant')

  return <div className="portal">
    <header className="portal-header">
      <button className="portal-brand" onClick={() => onNavigate('home')} aria-label="华农智控首页"><img src={logo} alt="华农智能体" /><img className="portal-wordmark" src={wordmark} alt="华农·智控" /></button>
      <nav aria-label="平台导航"><button className={page === 'home' ? 'selected' : ''} onClick={() => onNavigate('home')}>智能问答</button><button className={page === 'plaza' ? 'selected' : ''} onClick={() => onNavigate('plaza')}>智能体广场</button><button onClick={() => onNavigate('dashboard')}>温室监控 <ArrowUpRight size={14} /></button><button onClick={() => onNavigate('sensors')}>传感器</button></nav>
      <img className="portal-university" src={university} alt="华中农业大学" />
    </header>
    {page === 'home' ? <main className={`portal-home ${messages.length ? 'portal-home--chat' : ''}`}>
      {messages.length === 0 && !sending ? <div className="portal-greeting"><img src={logo} alt="" /><span>扎根农业 · 智见生长</span><h1>你好，今天有什么可以帮你？</h1><p>从温室环境到作物生长，让每一个农业问题都有方向。</p></div> : null}
      {messages.length === 0 ? <div className="portal-prompts">{prompts.map((prompt) => <button key={prompt} onClick={() => ask(prompt)} disabled={sending}>{prompt}<ArrowUpRight size={13} /></button>)}</div>
        : <section className="portal-chat">
          <div className="portal-chat-actions"><button onClick={newChat} disabled={sending}>新建对话</button></div>
          <div className="portal-chat-list" ref={listRef} aria-live="polite">
            {messages.map((msg, index) => msg.role === 'user' ? <div className="portal-chat-message portal-chat-message--user" key={index}><div className="portal-chat-bubble">{msg.content}</div></div>
              : msg.role === 'assistant' ? <div className="portal-chat-message portal-chat-message--assistant" key={index}><span className="portal-chat-avatar"><Sprout size={16} /></span><div className="portal-chat-bubble">{msg.content}</div></div>
              : <div className="portal-chat-message portal-chat-message--system" key={index}><div className={`portal-chat-bubble ${msg.error ? 'portal-chat-bubble--error' : ''}`}>{msg.content}</div></div>)}
            {thinking ? <div className="portal-chat-message portal-chat-message--assistant"><span className="portal-chat-avatar"><Sprout size={16} /></span><div className="portal-chat-bubble portal-chat-thinking">正在思考…</div></div> : null}
          </div>
        </section>}
      <form className="portal-composer" onSubmit={(event) => { event.preventDefault(); ask(question) }}>
        <textarea aria-label="农业问题" placeholder="描述你的农业问题，或告诉我你想完成的任务…" value={question} onChange={(event) => onQuestionChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); ask(question) } }} />
        <div className="portal-composer-bottom"><span><Sprout size={16} /> 设施农业助手</span><small>{sending ? '正在生成回答…' : 'Enter 发送 · Shift + Enter 换行'}</small><button type="submit" disabled={!question.trim() || sending} aria-label="发送问题"><ArrowUp size={20} /></button></div>
      </form>
      {messages.length === 0 ? <button className="portal-plaza-link" onClick={() => onNavigate('plaza')}><span className="portal-plaza-symbol"><LayoutGrid size={22} /></span><span><b>智能体广场</b><small>探索 6 位农业专业助手</small></span><ArrowUpRight size={20} /></button> : null}
    </main> : <main className="portal-plaza"><button className="portal-back" onClick={() => onNavigate('home')}><ArrowLeft size={15} /> 返回问答</button><div className="portal-plaza-heading"><div><span>让专业的助手，处理专业的事</span><h1>智能体广场</h1><p>覆盖感知、决策与作业，选择你的农业工作伙伴。</p></div><label><Search size={17} /><input aria-label="搜索智能体" placeholder="搜索名称或能力" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
      <div className="portal-agent-grid">{agentCatalog.map((agent, index) => { const Icon = icons[index]; return `${agent.label}${agent.description}`.includes(search.trim()) ? <button className="portal-agent-card" key={agent.id} onClick={() => onSelectAgent(agent.id)}><div className={`portal-agent-icon tone-${index}`}><Icon size={25} /></div><h2>{agent.shortLabel}智能体</h2><p>{agent.description}</p><div className="portal-agent-bottom"><span>{agent.state}</span><b>进入工作区 <ArrowUpRight size={16} /></b></div></button> : null })}</div>
      {!agentCatalog.some((agent) => `${agent.label}${agent.description}`.includes(search.trim())) ? <p role="status">未找到匹配的智能体，请尝试“环境”“表型”或“农机”。</p> : null}
    </main>}
    <footer className="portal-footer">华中农业大学 <span>·</span> 华农智控 <span>让农业知识走向生产现场</span></footer>
  </div>
}
