import { useEffect, useRef, useState, type ComponentType } from 'react'
import {
  Activity, Bot, CheckCircle2, ChevronRight, CircleDashed,
  Database, Dog, FileJson, Gauge, LoaderCircle, Play, Radio,
  ScanLine, Send, Sprout, TestTubes,
  Upload, Zap,
} from 'lucide-react'
import { DecisionTrace } from '../components/DecisionTrace'
import { api } from '../lib/api'
import { parseObservationFile } from '../lib/importData'
import type { AgentId, AgentRun, Observation } from '../types'

const sample: Observation[] = Array.from({ length: 12 }, (_, index) => ({
  timestamp: new Date(Date.now() - (11 - index) * 300000).toISOString(),
  temperature: 30.6 + index * .12,
  humidity: 52 - index * .15,
  soilMoisture: 36 - index * .35,
  light: 780 + index * 9,
}))

interface AgentPageProps { agentId: AgentId }

const agentOperationalData: Record<AgentId, Array<[string, string]>> = {
  environment: [['接入设备', '9 台'], ['控制模式', '半自动'], ['决策核心', '规则引擎'], ['最近同步', '8 秒前']],
  fertilizer: [['数据来源', '土壤 + 作物'], ['处方分区', '3 个'], ['决策核心', '待接入'], ['最近任务', '暂无']],
  'robot-dog': [['视频源', '机器狗 01'], ['巡检路线', '1 条'], ['视觉模型', '待接入'], ['当前状态', '待命']],
  phenotype: [['数据模式', 'RGBD'], ['输出指标', '4 项'], ['表型模型', '待接入'], ['最近任务', '暂无']],
  'crop-model': [['模拟周期', '30 天'], ['输入因子', '4 类'], ['作物模型', '待接入'], ['当前场景', '默认']],
  'machinery-qa': [['知识分类', '4 类'], ['资料文档', '0 份'], ['问答模型', '待接入'], ['今日会话', '0 次']],
}

export function AgentPage({ agentId }: AgentPageProps) {
  if (agentId === 'environment') return <EnvironmentAgent />
  if (agentId === 'machinery-qa') return <MachineryQaAgent />
  return <SpecialistAgent agentId={agentId} />
}

function AgentOperationsBar({ agentId }: { agentId: AgentId }) {
  return <div className="agent-operations" aria-label="智能体运行概览">
    <div className="agent-operations__signal"><span><Radio /></span><div><b>运行概览</b><small>WORKSPACE STATUS</small></div></div>
    {agentOperationalData[agentId].map(([label, value], index) => <div className="agent-operations__metric" key={label}>
      <span>{label}</span><b>{value}</b>{index === 2 && value === '待接入' ? <em>配置</em> : null}
    </div>)}
  </div>
}

function EnvironmentAgent() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState('示例实时数据')
  const [observations, setObservations] = useState<Observation[]>(sample)
  const [runs, setRuns] = useState<AgentRun[]>([])
  const [result, setResult] = useState<AgentRun | null>(null)
  const [error, setError] = useState('')
  const [running, setRunning] = useState(false)
  useEffect(() => { api.agentRuns().then(setRuns).catch(() => undefined) }, [])
  const importFile = async (file?: File) => {
    if (!file) return
    try {
      const rows = parseObservationFile(file.name, await file.text())
      setSource(file.name); setObservations(rows); setError(''); setResult(null)
    } catch (reason) { setError(reason instanceof Error ? reason.message : '文件解析失败') }
  }
  const execute = async () => {
    setRunning(true); setError('')
    try {
      const run = await api.executeAgent(source, observations)
      setResult(run); setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)])
    } catch (reason) { setError(reason instanceof Error ? reason.message : '推理执行失败') }
    finally { setRunning(false) }
  }
  const preview = observations.at(-1)
  return <div className="agent-page">
    <section className="agent-console">
      <AgentOperationsBar agentId="environment" />
      <div className="agent-flow">
        <div className="import-panel">
          <StepLabel index="01" title="数据输入" detail="实时接口 / JSON / CSV" />
          <button className="dropzone" onClick={() => inputRef.current?.click()}><Upload /><b>导入温室数据</b><span>点击选择本地文件</span></button>
          <input ref={inputRef} hidden type="file" accept=".json,.csv" onChange={(event) => void importFile(event.target.files?.[0])} />
          <button className="text-button" onClick={() => { setSource('示例实时数据'); setObservations(sample); setError(''); setResult(null) }}><FileJson size={15} />使用示例数据</button>
        </div>
        <div className="data-preview">
          <StepLabel index="02" title="输入快照" detail={source} />
          <div className="record-count"><strong>{observations.length.toLocaleString()}</strong><span>条观测记录</span></div>
          {preview ? <div className="preview-grid"><div><span>温度</span><b>{preview.temperature.toFixed(1)}°C</b></div><div><span>湿度</span><b>{preview.humidity.toFixed(1)}%</b></div><div><span>土壤</span><b>{preview.soilMoisture.toFixed(1)}%</b></div><div><span>光照</span><b>{preview.light.toFixed(0)} lx</b></div></div> : null}
          <button className="execute-button" disabled={running || observations.length === 0} onClick={() => void execute()}>{running ? <LoaderCircle className="spin" /> : <Play />}{running ? '正在推理…' : '启动自主推理'}</button>
          {error ? <p className="inline-error">{error}</p> : null}
        </div>
        <div className="result-panel">
          <StepLabel index="03" title="决策输出" detail="诊断与动作建议" />
          {result ? <div className="result-content"><div className="result-summary"><CheckCircle2 /><div><b>{result.summary}</b><span>置信度 {(result.confidence * 100).toFixed(0)}%</span></div></div><div className="action-list">{result.actions.map((action) => <div className={`agent-action agent-action--${action.priority}`} key={`${action.device}-${action.command}`}><Zap /><div><b>{action.command}</b><span>{action.device} · {action.reason}</span></div></div>)}</div></div> : <EmptyResult text="结果将在这里形成可审计的决策链。" />}
        </div>
      </div>
    </section>
    <section className="agent-lower">
      <article className="panel trace-panel"><PanelTitle english="REASONING TRACE" title="推理轨迹" />{result ? <DecisionTrace trace={result.trace} /> : <p className="quiet-empty">运行一次推理后显示数据校验、环境诊断与策略生成过程。</p>}</article>
      <article className="panel history-panel"><PanelTitle english="RUN HISTORY" title="最近任务" /><div className="run-history">{runs.length ? runs.slice(0, 4).map((run) => <button key={run.id} onClick={() => setResult(run)}><span className="run-icon"><CheckCircle2 /></span><div><b>{run.sourceName}</b><small>{run.records} 条 · {new Date(run.createdAt).toLocaleString('zh-CN')}</small></div><em>{Math.round(run.confidence * 100)}%</em></button>) : <p className="quiet-empty">还没有推理记录。</p>}</div></article>
    </section>
  </div>
}

interface SpecialistConfig {
  accept: string
  uploadTitle: string
  uploadHint: string
  dataTitle: string
  dataRows: Array<[string, string]>
  pipeline: string[]
  outputTitle: string
  outputRows: Array<[string, string]>
  resultText: string
  Icon: ComponentType<{ size?: number }>
}

const specialistConfigs: Record<Exclude<AgentId, 'environment' | 'machinery-qa'>, SpecialistConfig> = {
  fertilizer: {
    accept: '.csv,.xlsx,.json', uploadTitle: '导入土壤与作物数据', uploadHint: 'CSV / XLSX / JSON',
    dataTitle: '处方条件', dataRows: [['作物', '番茄'], ['生育期', '结果初期'], ['目标区域', '育苗 A 区'], ['策略', '水肥一体化']],
    pipeline: ['土壤养分诊断', '需肥量计算', '肥料配比优化', '分区处方生成'],
    outputTitle: '推荐处方', outputRows: [['N-P-K', '18-8-24'], ['单次用量', '7.5 kg/亩'], ['灌溉量', '12 m³/亩'], ['执行窗口', '明日 06:00']],
    resultText: '当前为处方工作区骨架，接入土壤检测与施肥模型后生成正式处方。', Icon: TestTubes,
  },
  'robot-dog': {
    accept: 'image/*,video/*', uploadTitle: '上传巡检图像或视频', uploadHint: 'JPG / PNG / MP4，支持机器狗摄像头',
    dataTitle: '巡检任务', dataRows: [['设备', '植保机器狗 01'], ['路线', '番茄 B 区第 3 垄'], ['识别目标', '病斑 / 虫害 / 障碍'], ['采样模式', '每 2 米定点']],
    pipeline: ['影像质量检查', '目标检测与定位', '病虫害分类', '生成巡检工单'],
    outputTitle: '识别摘要', outputRows: [['异常植株', '待识别'], ['疑似病斑', '待识别'], ['障碍物', '待识别'], ['任务状态', '等待影像']],
    resultText: '上传巡检影像后，视觉模型将在此返回目标位置、类别和置信度。', Icon: Dog,
  },
  phenotype: {
    accept: 'image/*,.zip,.ply,.pcd', uploadTitle: '上传 RGBD 俯视数据', uploadHint: 'RGB + Depth / ZIP / 点云',
    dataTitle: '鉴定设置', dataRows: [['作物', '设施番茄'], ['视角', '冠层正上方'], ['标尺', '深度相机内参'], ['样本编号', '自动读取']],
    pipeline: ['RGBD 配准', '植株实例分割', '三维结构重建', '表型参数反演'],
    outputTitle: '表型指标', outputRows: [['株高', '待计算'], ['估测鲜重', '待计算'], ['叶面积', '待计算'], ['果实数量', '待计算']],
    resultText: '模型接入后输出单株与群体表型结果，并支持导出 CSV。', Icon: ScanLine,
  },
  'crop-model': {
    accept: '.csv,.json', uploadTitle: '导入环境与管理序列', uploadHint: '逐日气象 / 灌溉 / 施肥记录',
    dataTitle: '模拟场景', dataRows: [['作物', '番茄'], ['品种', '华番 12'], ['定植日期', '2026-08-20'], ['预测周期', '未来 30 天']],
    pipeline: ['参数初始化', '冠层生长模拟', '物质积累计算', '产量与节点预测'],
    outputTitle: '预测结果', outputRows: [['当前 LAI', '2.84'], ['开花节点', '第 4 天'], ['采收窗口', '28–32 天'], ['预估产量', '待模型计算']],
    resultText: '上传连续环境序列后，作物模型将生成生长曲线与情景对比。', Icon: Sprout,
  },
}

function SpecialistAgent({ agentId }: { agentId: Exclude<AgentId, 'environment' | 'machinery-qa'> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const config = specialistConfigs[agentId]
  const [fileName, setFileName] = useState('')
  const [running, setRunning] = useState(false)
  const [completed, setCompleted] = useState(false)
  const start = () => {
    setRunning(true); setCompleted(false)
    window.setTimeout(() => { setRunning(false); setCompleted(true) }, 900)
  }
  return <div className="agent-page specialist-page">
    <section className="agent-console">
      <AgentOperationsBar agentId={agentId} />
      <div className="specialist-grid">
        <article className="specialist-input">
          <StepLabel index="01" title="任务输入" detail={config.uploadHint} />
          <button className="dropzone dropzone--large" onClick={() => inputRef.current?.click()}><config.Icon size={26} /><b>{fileName || config.uploadTitle}</b><span>{fileName ? '已载入，可重新选择' : '点击选择本地文件'}</span></button>
          <input ref={inputRef} hidden type="file" accept={config.accept} onChange={(event) => { setFileName(event.target.files?.[0]?.name ?? ''); setCompleted(false) }} />
          <div className="agent-field-grid">{config.dataRows.map(([label, value]) => <label key={label}><span>{label}</span><input defaultValue={value} /></label>)}</div>
          <button className="execute-button" onClick={start} disabled={running}>{running ? <LoaderCircle className="spin" /> : <Play />}{running ? '正在分析…' : '启动智能分析'}</button>
        </article>
        <article className="specialist-process">
          <StepLabel index="02" title="执行链" detail="模型接入点已预留" />
          <ol className="pipeline-list">{config.pipeline.map((step, index) => <li className={completed ? 'is-complete' : index === 0 && running ? 'is-running' : ''} key={step}><span>{completed ? <CheckCircle2 /> : index === 0 && running ? <LoaderCircle className="spin" /> : <CircleDashed />}</span><div><small>STEP {String(index + 1).padStart(2, '0')}</small><b>{step}</b></div><ChevronRight /></li>)}</ol>
          <div className="model-port"><Database /><div><b>模型服务接口</b><span>等待配置推理地址与鉴权信息</span></div><em>API</em></div>
        </article>
        <article className="specialist-output">
          <StepLabel index="03" title={config.outputTitle} detail="结构化结果" />
          <div className={`output-board ${completed ? 'is-ready' : ''}`}>{config.outputRows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{completed && value.startsWith('待') ? '示例结果' : value}</strong></div>)}</div>
          <div className="agent-note"><Activity /><p>{completed ? '演示流程已完成。' : config.resultText}</p></div>
        </article>
      </div>
    </section>
    <section className="agent-summary-strip">
      <div><Gauge /><span>今日任务</span><b>0</b></div><div><CheckCircle2 /><span>已完成</span><b>0</b></div><div><Activity /><span>平均耗时</span><b>—</b></div><div><Database /><span>数据集</span><b>{fileName ? '1' : '0'}</b></div>
    </section>
  </div>
}

function MachineryQaAgent() {
  const [question, setQuestion] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const examples = ['卷帘机限位失灵怎么排查？', '水肥机 EC 值波动过大是什么原因？', '植保机器狗日常需要检查哪些部件？']
  const ask = (value = question) => { if (!value.trim()) return; setQuestion(value); setSubmitted(true) }
  return <div className="agent-page qa-page">
    <section className="agent-console">
      <AgentOperationsBar agentId="machinery-qa" />
      <div className="qa-layout">
        <aside className="qa-sidebar"><StepLabel index="01" title="知识范围" detail="设施蔬菜农机" /><div className="knowledge-list"><span><Gauge />环境控制设备<em>28</em></span><span><TestTubes />水肥装备<em>17</em></span><span><Dog />巡检与植保机械<em>12</em></span><span><Sprout />种植作业机械<em>9</em></span></div><div className="model-port"><Database /><div><b>知识库接口</b><span>等待导入手册与维修记录</span></div><em>RAG</em></div></aside>
        <section className="qa-chat"><StepLabel index="02" title="农机问答" detail="操作 · 维护 · 故障排查" /><div className="chat-stage">
          <div className="chat-message chat-message--agent"><Bot /><div><b>农机问答助手</b><p>请描述设备型号、故障现象和已尝试的操作。我会给出分步排查建议。</p></div></div>
          {submitted ? <><div className="chat-message chat-message--user"><div><b>我的问题</b><p>{question}</p></div></div><div className="chat-message chat-message--agent"><Bot /><div><b>回答框架已就绪</b><p>知识库与大模型接口尚未配置。接入后，这里会引用设备手册并给出安全检查、原因判断和处理步骤。</p><small>回答将标注资料来源和风险提示</small></div></div></> : <div className="question-examples"><span>可以这样问</span>{examples.map((example) => <button key={example} onClick={() => { setQuestion(example); ask(example) }}>{example}<ChevronRight /></button>)}</div>}
        </div>
        <div className="question-box"><textarea value={question} onChange={(event) => { setQuestion(event.target.value); setSubmitted(false) }} placeholder="输入农机操作、维护或故障问题…" /><button onClick={() => ask()} aria-label="发送问题"><Send /></button></div></section>
      </div>
    </section>
  </div>
}

function StepLabel({ index, title, detail }: { index: string; title: string; detail: string }) {
  return <div className="section-label"><span>{index}</span><div><b>{title}</b><small>{detail}</small></div></div>
}

function PanelTitle({ english, title }: { english: string; title: string }) {
  return <div className="panel__heading"><div><span className="eyebrow">{english}</span><h2>{title}</h2></div></div>
}

function EmptyResult({ text }: { text: string }) {
  return <div className="result-empty"><Bot /><b>等待推理任务</b><span>{text}</span></div>
}
