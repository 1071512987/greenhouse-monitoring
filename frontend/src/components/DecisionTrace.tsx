import { Check } from 'lucide-react'
import type { TraceStep } from '../types'

export function DecisionTrace({ trace }: { trace: TraceStep[] }) { return <ol className="decision-trace">{trace.map((step, index) => <li key={step.label}><span><Check size={12}/></span><div><small>STEP {String(index + 1).padStart(2,'0')}</small><b>{step.label}</b><p>{step.detail}</p></div><em>{step.outcome}</em></li>)}</ol> }
