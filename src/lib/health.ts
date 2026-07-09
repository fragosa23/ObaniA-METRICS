import type { Aggregate, Db, ProductionRecord, Section } from './types'
import { aggregate, MONTHS } from './db'

export interface HealthResult {
  score: number
  label: string
}

export interface SectionTotal extends Aggregate {
  section: Section
}

function monthKey(year: number, month: number): number {
  return year * 12 + month
}
function monthLabel(year: number, month: number): string {
  return `${MONTHS[month].slice(0, 3)} ${year}`
}

export function sectionTotals(db: Db, records: ProductionRecord[]): SectionTotal[] {
  return db.sections.map((s) => {
    const recs = records.filter((r) => r.sectionId === s.id)
    return { section: s, ...aggregate(recs) }
  })
}

export interface MonthPoint extends Aggregate {
  year: number
  month: number
  label: string
}
export function monthlySeriesBase(records: ProductionRecord[], monthsBack = 12): MonthPoint[] {
  if (!records.length) return []
  const maxKey = Math.max(...records.map((r) => monthKey(r.year, r.month)))
  const out: MonthPoint[] = []
  for (let k = maxKey - monthsBack + 1; k <= maxKey; k++) {
    const year = Math.floor(k / 12)
    const month = ((k % 12) + 12) % 12
    const recs = records.filter((r) => monthKey(r.year, r.month) === k)
    out.push({ year, month, label: monthLabel(year, month), ...aggregate(recs) })
  }
  return out
}

export function healthIndex(
  db: Db,
  currentRecords: ProductionRecord[],
  allRecords: ProductionRecord[],
): HealthResult {
  const a = aggregate(currentRecords)
  let score = 100
  const taxa = a.taxa || 0
  score -= Math.min(45, taxa * 7)

  // Só máquinas ativas contam para alertas — as descontinuadas já não produzem.
  const machineAlerts = db.machines.filter((m) => {
    if (m.status === 'discontinued') return false
    const ma = aggregate(currentRecords.filter((r) => r.machineId === m.id))
    return ma.of > 0 && (ma.taxa || 0) > 5
  }).length
  score -= Math.min(20, machineAlerts * 5)

  const sections = sectionTotals(db, currentRecords).filter((s) => s.of > 0)
  if (sections.length > 1) {
    const rates = sections.map((s) => s.taxa || 0)
    score -= Math.min(10, Math.abs(rates[0] - rates[1]) * 2)
  }

  const series = monthlySeriesBase(allRecords, 3)
  if (series.length >= 2) {
    const last = series[series.length - 1].taxa || 0
    const prev = series[series.length - 2].taxa || 0
    if (last > prev) score -= Math.min(15, (last - prev) * 4)
    else score += Math.min(5, (prev - last) * 2)
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const label =
    score >= 90 ? 'Excelente' : score >= 80 ? 'Bom' : score >= 70 ? 'Atenção' : score >= 60 ? 'Mau' : 'Crítico'
  return { score, label }
}
