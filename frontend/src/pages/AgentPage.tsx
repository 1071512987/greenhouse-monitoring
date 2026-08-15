import { useEffect, useRef, useState } from 'react'
import { Bot, BrainCircuit, CheckCircle2, FileJson, LoaderCircle, Play, Upload, Zap } from 'lucide-react'
import { DecisionTrace } from '../components/DecisionTrace'
import { api } from '../lib/api'
import { parseObservationFile } from '../lib/importData'
import type { AgentRun, Observation } from '../types'

const sample: Observation[] = Array.from({ length: 12 }, (_, index) => ({ timestamp: new Date(Date.now() - (11-index)*300000).toISOString(), temperature: 30.6 + index*.12, humidity: 52-index*.15, soilMoisture: 36-index*.35, light: 780+index*9 }))

export function AgentPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState('示例实时数据'), [observations, setObservations] = useState<Observation[]>(sample), [runs, setRuns] = useState<AgentRun[]>([]), [result, setResult] = useState<AgentRun | null>(null), [error, setError] = useState(''), [running, setRunning] = useState(false)
  useEffect(() => { api.agentRuns().then(setRuns).catch(() => undefined) }, [])
  const importFile = async (file?: File) => { if (!file) return; try { const rows = parseObservationFile(file.name, await file.text()); setSource(file.name); setObservations(rows); setError(''); setResult(null) } catch (reason) { setError(reason instanceof Error ? reason.message : '文件解析失败') } }
  const execute = async () => { setRunning(true); setError(''); try { const run = await api.executeAgent(source, observations); setResult(run); setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]) } catch (reason) { setError(reason instanceof Error ? reason.message : '推理执行失败') } finally { setRunning(false) } }
  const preview = observations.at(-1)
  return <div className="agent-page">
    <section className="agent-console">
      <div className="agent-intro"><div className="agent-symbol"><BrainCircuit/></div><p>导入温室观测数据，完成诊断、策略生成与执行建议。模型接入点已预留。</p><span className="agent-status"><i/>规则引擎就绪</span></div>
      <div className="agent-flow">
        <div className="import-panel"><div className="section-label"><span>01</span><div><b>数据输入</b><small>JSON / CSV，最多 5,000 条</small></div></div><button className="dropzone" onClick={() => inputRef.current?.click()}><Upload/><b>导入温室数据</b><span>点击选择本地文件</span></button><input ref={inputRef} hidden type="file" accept=".json,.csv" onChange={(e) => void importFile(e.target.files?.[0])}/><button className="text-button" onClick={() => { setSource('示例实时数据'); setObservations(sample); setError(''); setResult(null) }}><FileJson size={15}/>使用示例数据</button></div>
        <div className="data-preview"><div className="section-label"><span>02</span><div><b>输入快照</b><small>{source}</small></div></div><div className="record-count"><strong>{observations.length.toLocaleString()}</strong><span>条观测记录</span></div>{preview ? <div className="preview-grid"><div><span>温度</span><b>{preview.temperature.toFixed(1)}°C</b></div><div><span>湿度</span><b>{preview.humidity.toFixed(1)}%</b></div><div><span>土壤</span><b>{preview.soilMoisture.toFixed(1)}%</b></div><div><span>光照</span><b>{preview.light.toFixed(0)} lx</b></div></div> : null}<button className="execute-button" disabled={running || observations.length === 0} onClick={() => void execute()}>{running ? <LoaderCircle className="spin"/> : <Play/>}{running ? '正在推理…' : '启动自主推理'}</button>{error ? <p className="inline-error">{error}</p> : null}</div>
        <div className="result-panel"><div className="section-label"><span>03</span><div><b>决策输出</b><small>诊断与动作建议</small></div></div>{result ? <div className="result-content"><div className="result-summary"><CheckCircle2/><div><b>{result.summary}</b><span>置信度 {(result.confidence*100).toFixed(0)}%</span></div></div><div className="action-list">{result.actions.map((action) => <div className={`agent-action agent-action--${action.priority}`} key={`${action.device}-${action.command}`}><Zap/><div><b>{action.command}</b><span>{action.device} · {action.reason}</span></div></div>)}</div></div> : <div className="result-empty"><Bot/><b>等待推理任务</b><span>结果将在这里形成可审计的决策链。</span></div>}</div>
      </div>
    </section>
    <section className="agent-lower">
      <article className="panel trace-panel"><div className="panel__heading"><div><span className="eyebrow">REASONING TRACE</span><h2>推理轨迹</h2></div></div>{result ? <DecisionTrace trace={result.trace}/> : <p className="quiet-empty">运行一次推理后显示数据校验、环境诊断与策略生成过程。</p>}</article>
      <article className="panel history-panel"><div className="panel__heading"><div><span className="eyebrow">RUN HISTORY</span><h2>最近任务</h2></div></div><div className="run-history">{runs.length ? runs.slice(0,4).map((run) => <button key={run.id} onClick={() => setResult(run)}><span className="run-icon"><CheckCircle2/></span><div><b>{run.sourceName}</b><small>{run.records} 条 · {new Date(run.createdAt).toLocaleString('zh-CN')}</small></div><em>{Math.round(run.confidence*100)}%</em></button>) : <p className="quiet-empty">还没有推理记录。</p>}</div></article>
    </section>
  </div>
}
