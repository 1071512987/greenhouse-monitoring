import { lazy, Suspense, useState } from 'react'
import { AppShell, type PageId } from './components/AppShell'
import type { SensorCategoryId } from './types'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const SensorsPage = lazy(() => import('./pages/SensorsPage').then((module) => ({ default: module.SensorsPage })))
const AgentPage = lazy(() => import('./pages/AgentPage').then((module) => ({ default: module.AgentPage })))

export default function App() {
  const [page, setPage] = useState<PageId>('dashboard')
  const [sensorCategory, setSensorCategory] = useState<SensorCategoryId>('all')
  return (
    <AppShell page={page} sensorCategory={sensorCategory} onNavigate={setPage} onSensorCategoryChange={setSensorCategory}>
      <Suspense fallback={<div className="state-panel"><span className="loader" /><b>正在载入工作区</b></div>}>
        {page === 'dashboard' ? <DashboardPage /> : page === 'sensors' ? <SensorsPage category={sensorCategory} /> : <AgentPage />}
      </Suspense>
    </AppShell>
  )
}
