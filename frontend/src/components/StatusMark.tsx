import type { SensorStatus } from '../types'

const labels: Record<SensorStatus, string> = { online: '在线', warning: '需关注', offline: '离线' }
export function StatusMark({ status }: { status: SensorStatus }) { return <span className={`status-mark status-mark--${status}`}><i />{labels[status]}</span> }
