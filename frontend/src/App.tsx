import { lazy, Suspense, useState } from 'react'
import { AppShell, type PageId } from './components/AppShell'
import type { AgentId, SensorVendorId } from './types'
import { PortalPage } from './pages/PortalPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SensorsPage = lazy(() => import('./pages/SensorsPage').then((module) => ({ default: module.SensorsPage })))
const AgentPage = lazy(() => import('./pages/AgentPage').then((module) => ({ default: module.AgentPage })))

export default function App() {
  const [page, setPage] = useState<PageId>('home')
  const [sensorVendor, setSensorVendor] = useState<SensorVendorId>('xinpuhui')
  const [sensorId, setSensorId] = useState('all')
  const [agentId, setAgentId] = useState<AgentId>('environment')
  const [question, setQuestion] = useState('')
  const selectSensor = (vendor: SensorVendorId, id: string) => { setSensorVendor(vendor); setSensorId(id); setPage('sensors') }
  if (page === 'home' || page === 'plaza') return <PortalPage page={page} question={question} onQuestionChange={setQuestion} onNavigate={setPage} onSelectAgent={(id) => { setAgentId(id); setPage('agent') }} />
  return (
    <AppShell page={page} sensorVendor={sensorVendor} sensorId={sensorId} agentId={agentId} onNavigate={setPage} onSelectSensor={selectSensor} onAgentChange={setAgentId}>
      <Suspense fallback={<div className="state-panel"><span className="loader" /><b>正在载入工作区</b></div>}>
        {page === 'dashboard' ? <DashboardPage /> : page === 'sensors' ? <SensorsPage vendor={sensorVendor} sensorId={sensorId} onBack={() => setSensorId('all')} /> : <AgentPage agentId={agentId} />}
      </Suspense>
    </AppShell>
  )
}
