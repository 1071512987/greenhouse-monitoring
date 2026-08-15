import type { LucideIcon } from 'lucide-react'

export function MetricTile({ label, value, unit, note, tone, icon: Icon }: { label: string; value: string | number; unit: string; note: string; tone: string; icon: LucideIcon }) {
  return <article className="metric-tile" style={{ '--metric-tone': tone } as React.CSSProperties}>
    <div className="metric-tile__top"><span>{label}</span><Icon size={16} /></div>
    <div className="metric-tile__value"><strong>{value}</strong><small>{unit}</small></div>
    <p><i />{note}</p>
  </article>
}
