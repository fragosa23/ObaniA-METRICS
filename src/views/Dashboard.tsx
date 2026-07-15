import { useEffect, useMemo, useRef, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoTip } from '@/components/InfoTip'
import { ObaniA } from '@/components/ObaniA'
import type { Db, ProductionRecord } from '@/lib/types'
import {
  aggregate,
  fmt,
  fmtOfRnc,
  machineName,
  MONTHS,
  recordsFor,
  sectionName,
} from '@/lib/db'
import { healthIndex, sectionTotals } from '@/lib/health'
import { dashboardInsights } from '@/lib/insights'
import { taxaTone, toneVar, type Tone } from '@/lib/severity'
import { SECTION_COLORS, sectionColor } from '@/lib/colors'

function machineInfo(db: Db, id: string): string {
  const m = db.machines.find((x) => x.id === id)
  if (!m) return id
  const tipo = m.sectionId === 'flexo' ? 'Flexografia' : m.sectionId === 'roto' ? 'Rotogravura' : 'Offset'
  const estado = m.status === 'discontinued' ? ` · ${m.statusNote || 'máquina descontinuada'}` : ''
  return `Máquina de ${tipo} (secção ${sectionName(db, m.sectionId)})${estado}`
}

// ---------------------------------------------------------------------------
// Efeitos: contagem animada, sparkline, variação, anel de saúde
// ---------------------------------------------------------------------------

/** Anima um número do valor anterior para o novo (salta logo se reduced-motion). */
function useCountUp(target: number, duration = 750): number {
  const [val, setVal] = useState(target)
  const prevRef = useRef(target)
  useEffect(() => {
    const from = prevRef.current
    prevRef.current = target
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || from === target) {
      setVal(target)
      return
    }
    let raf: number
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

/** Mini-gráfico de linha (últimos meses) desenhado em SVG puro. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const w = 92
  const h = 30
  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }))
  const pts = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = points.at(-1)!
  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label="Evolução mensal do indicador">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className="omp-spark"
        opacity={0.9}
      />
      <circle cx={last.x} cy={last.y} r="3" fill={color} stroke="var(--card)" strokeWidth="1.5" />
    </svg>
  )
}

interface DeltaInfo {
  arrow: string
  text: string
  tone: Tone
  title: string
}
/** Variação face ao período anterior (percentagem, ou pontos percentuais para taxas). */
function deltaOf(curr: number, prev: number | null, goodWhenUp: boolean, pp = false): DeltaInfo | null {
  if (prev === null) return null
  const diff = curr - prev
  if (pp) {
    const rounded = Math.round(diff * 100) / 100
    if (Math.abs(rounded) < 0.05) return { arrow: '→', text: '=', tone: 'neutral', title: 'Sem variação' }
    const up = rounded > 0
    return {
      arrow: up ? '▲' : '▼',
      text: `${Math.abs(rounded).toFixed(1).replace('.', ',')} pp`,
      tone: up === goodWhenUp ? 'success' : 'danger',
      title: 'Variação em pontos percentuais face ao período anterior',
    }
  }
  if (prev === 0) return null
  const rel = Math.round((diff / prev) * 100)
  if (rel === 0) return { arrow: '→', text: '=', tone: 'neutral', title: 'Sem variação' }
  const up = rel > 0
  return {
    arrow: up ? '▲' : '▼',
    text: `${Math.abs(rel)}%`,
    tone: up === goodWhenUp ? 'success' : 'danger',
    title: 'Variação face ao período anterior',
  }
}

function DeltaChip({ d, vs }: { d: DeltaInfo | null; vs: string }) {
  if (!d) return null
  return (
    <span
      title={`${d.title} (${vs})`}
      className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap tabular-nums"
      style={{ color: toneVar[d.tone], borderColor: `color-mix(in srgb, ${toneVar[d.tone]} 40%, transparent)` }}
    >
      {d.arrow} {d.text}
    </span>
  )
}

/** Anel de saúde 0–100 com brilho e animação de preenchimento. */
function HealthRing({ score, tone }: { score: number; tone: Tone }) {
  const R = 42
  const C = 2 * Math.PI * R
  const [offset, setOffset] = useState(C)
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = C * (1 - score / 100)
    if (reduced) {
      setOffset(target)
      return
    }
    const id = setTimeout(() => setOffset(target), 80)
    return () => clearTimeout(id)
  }, [score, C])
  const color = toneVar[tone]
  const displayed = Math.round(useCountUp(score))
  return (
    <div className="relative size-28 shrink-0" role="img" aria-label={`Índice de saúde: ${score} em 100`}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="var(--muted)" strokeWidth="8" opacity={0.5} />
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          className="omp-ring"
          style={{ filter: `drop-shadow(0 0 7px color-mix(in srgb, ${color} 70%, transparent))` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold tabular-nums">{displayed}</span>
        <span className="text-[10px] tracking-widest text-muted-foreground uppercase">/ 100</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cartões
// ---------------------------------------------------------------------------

function Kpi({
  label,
  info,
  value,
  format,
  delta,
  vsLabel,
  spark,
  sparkColor,
  extra,
}: {
  label: string
  info: string
  value: number | null
  format: (v: number) => string
  delta: DeltaInfo | null
  vsLabel: string
  spark: number[]
  sparkColor: string
  extra?: React.ReactNode
}) {
  const animated = useCountUp(value ?? 0)
  return (
    <Card className="omp-card-hover">
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {label}
          <InfoTip text={info} />
        </div>
        <div className="mt-1 flex items-end justify-between gap-2">
          <div>
            <div className="text-3xl font-semibold tabular-nums">
              {value === null ? 'N/A' : format(animated)}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <DeltaChip d={delta} vs={vsLabel} />
              {extra}
            </div>
          </div>
          <Sparkline values={spark} color={sparkColor} />
        </div>
      </CardContent>
    </Card>
  )
}

const HEALTH_TONE: Record<string, Tone> = {
  Excelente: 'success',
  Bom: 'success',
  Atenção: 'warning',
  Mau: 'danger',
  Crítico: 'danger',
}

function SectionDonut({
  db,
  title,
  info,
  metric,
  records,
}: {
  db: Db
  title: string
  info: string
  metric: 'of' | 'rnc'
  records: ProductionRecord[]
}) {
  const totals = sectionTotals(db, records)
  const data = totals
    .map((t) => ({ name: t.section.name, id: t.section.id, value: metric === 'rnc' ? t.rnc : t.of }))
    .filter((d) => d.value > 0)
  const total = data.reduce((a, d) => a + d.value, 0)

  return (
    <Card className="omp-card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          {title}
          <InfoTip text={info} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados para este período.</p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={40} outerRadius={64} paddingAngle={2}>
                  {data.map((d) => (
                    <Cell key={d.id} fill={SECTION_COLORS[d.id] ?? 'var(--muted-foreground)'} />
                  ))}
                </Pie>
                <RTooltip
                  formatter={(value, name) => {
                    const v = Number(value)
                    return [`${v} (${Math.round((v / total) * 100)}%)`, name as string]
                  }}
                  contentStyle={{
                    background: 'var(--popover)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--popover-foreground)',
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 text-sm">
              {data.map((d) => (
                <div key={d.id} className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: SECTION_COLORS[d.id] }} />
                  <span className="text-muted-foreground">{d.name}:</span>
                  <span className="font-medium tabular-nums">{d.value}</span>
                </div>
              ))}
              <div className="pt-1 text-muted-foreground">
                Total: <span className="font-semibold text-foreground tabular-nums">{total}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MachineOverview({ db, records }: { db: Db; records: ProductionRecord[] }) {
  const rows = db.machines
    .map((m) => ({ m, a: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.a.of > 0 || x.a.rnc > 0)
    .sort((x, y) => y.a.of - x.a.of)
  const maxOf = Math.max(...rows.map((x) => x.a.of), 1)
  const maxRnc = Math.max(...rows.map((x) => x.a.rnc), 1)
  const withOf = rows.filter((x) => x.a.of > 0)
  const best = withOf.length
    ? withOf.reduce((a, b) => ((a.a.taxa ?? Infinity) <= (b.a.taxa ?? Infinity) ? a : b))
    : null

  return (
    <Card className="omp-card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          Máquinas — trabalhos e RNC
          <InfoTip text="Todas as máquinas do período, ordenadas por OF. A barra larga mostra os OF na mesma escala para todas; a barra fina vermelha mostra as RNC numa escala própria (mais curta de propósito). O badge é a taxa RNC/100 OF e a estrela assinala a melhor taxa." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          rows.map((x) => {
            const tone = taxaTone(x.a.taxa)
            const isBest = best !== null && x.m.id === best.m.id
            const rncW = x.a.rnc ? Math.max(5, (x.a.rnc / maxRnc) * 42) : 0
            return (
              <div key={x.m.id} className="flex items-center gap-3">
                <div className="w-[84px] shrink-0 text-sm">
                  <span className="flex items-center gap-1 font-semibold">
                    {x.m.name}
                    <InfoTip text={machineInfo(db, x.m.id)} label={`O que é ${x.m.name}`} />
                  </span>
                  {isBest && (
                    <span
                      className="block text-[10px] font-semibold whitespace-nowrap"
                      style={{ color: 'var(--success)' }}
                    >
                      ★ melhor taxa
                    </span>
                  )}
                  {x.m.status === 'discontinued' && (
                    <span className="block text-[10px] text-destructive/80">descontinuada</span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div
                    className="omp-bar flex h-5 min-w-[34px] items-center justify-end rounded-md pr-2 text-[11px] font-semibold text-white tabular-nums"
                    style={{
                      width: `${Math.max(7, (x.a.of / maxOf) * 100)}%`,
                      background: sectionColor(x.m.sectionId),
                    }}
                  >
                    {x.a.of}
                  </div>
                  {x.a.rnc > 0 ? (
                    <div
                      className="omp-bar flex h-2.5 min-w-[20px] items-center justify-end rounded pr-1 text-[9px] font-semibold text-white tabular-nums"
                      style={{ width: `${rncW}%`, background: 'var(--destructive)' }}
                    >
                      {x.a.rnc}
                    </div>
                  ) : (
                    <span className="text-[11px] font-semibold" style={{ color: 'var(--success)' }}>
                      0 RNC ✓
                    </span>
                  )}
                </div>
                <span
                  className="w-[72px] shrink-0 rounded-md border px-1.5 py-1 text-center text-xs font-semibold tabular-nums"
                  style={{
                    color: toneVar[tone],
                    borderColor: `color-mix(in srgb, ${toneVar[tone]} 40%, transparent)`,
                    background: `color-mix(in srgb, ${toneVar[tone]} 10%, transparent)`,
                  }}
                >
                  {fmt(x.a.taxa)}
                </span>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function Dashboard({ db, assistantOn }: { db: Db; assistantOn: boolean }) {
  const allRecords = recordsFor(db, {})

  // Períodos disponíveis: o ano inteiro e cada mês com dados registados.
  const { options, defaultKey } = useMemo(() => {
    const years = [...new Set(allRecords.map((r) => r.year))].sort((x, y) => y - x)
    const opts: { value: string; label: string; isYear: boolean }[] = []
    years.forEach((y) => {
      opts.push({ value: `${y}`, label: `Ano ${y}`, isYear: true })
      const months = [...new Set(allRecords.filter((r) => r.year === y).map((r) => r.month))].sort(
        (a, b) => b - a,
      )
      months.forEach((m) => opts.push({ value: `${y}-${m}`, label: `${MONTHS[m]} ${y}`, isYear: false }))
    })
    const fallback = years.length ? `${years[0]}` : `${new Date().getFullYear()}`
    return { options: opts, defaultKey: fallback }
  }, [allRecords])

  const [periodKey, setPeriodKey] = useState(defaultKey)
  const [yearStr, monthStr] = periodKey.split('-')
  const year = Number(yearStr)
  const month = monthStr !== undefined ? Number(monthStr) : undefined
  const isYear = month === undefined

  const records = isYear ? recordsFor(db, { year }) : recordsFor(db, { year, month })
  const a = aggregate(records)
  const health = healthIndex(db, records, allRecords)
  const healthTone = HEALTH_TONE[health.label] ?? 'neutral'
  const periodLabel = isYear ? `${year}` : `${MONTHS[month!]} ${year}`
  const targetTaxa = db.settings?.targetTaxa ?? 2

  // Tendência mensal: compara sempre o último mês visível com o mês anterior.
  // No ano inteiro usa os dois últimos meses com dados; num mês específico usa até esse mês.
  const { trendCurrent, trendPrevious, prevLabel } = useMemo(() => {
    const yearRecords = recordsFor(db, { year })
    const visibleMonths = [...new Set(yearRecords.map((r) => r.month))]
      .filter((m) => isYear || m <= (month ?? 11))
      .sort((x, y) => x - y)
    if (visibleMonths.length < 2) {
      return { trendCurrent: null, trendPrevious: null, prevLabel: '' }
    }
    const currentMonth = visibleMonths.at(-1)!
    const previousMonth = visibleMonths.at(-2)!
    return {
      trendCurrent: aggregate(yearRecords.filter((r) => r.month === currentMonth)),
      trendPrevious: aggregate(yearRecords.filter((r) => r.month === previousMonth)),
      prevLabel: `${MONTHS[currentMonth]} vs ${MONTHS[previousMonth]}`,
    }
  }, [db, isYear, year, month])

  // Séries mensais do ano selecionado (para as sparklines).
  const spark = useMemo(() => {
    const yearRecords = recordsFor(db, { year })
    const keys = [...new Set(yearRecords.map((r) => r.month))]
      .filter((m) => isYear || m <= (month ?? 11))
      .sort((x, y) => x - y)
    const per = keys.map((m) => aggregate(yearRecords.filter((r) => r.month === m)))
    return {
      of: per.map((p) => p.of),
      rnc: per.map((p) => p.rnc),
      taxa: per.map((p) => p.taxa ?? 0),
      ofRnc: per.map((p) => p.ofRnc ?? 0),
    }
  }, [db, isYear, year, month])

  // Alertas: pior máquina ATIVA por taxa; descontinuadas ficam de fora (com nota).
  const byMachine = db.machines
    .filter((m) => m.status !== 'discontinued')
    .map((m) => ({ m, agg: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.agg.of > 0)
    .sort((x, y) => (y.agg.taxa || 0) - (x.agg.taxa || 0))
  const worst = byMachine[0]
  const discontinuedWithRnc = db.machines
    .filter((m) => m.status === 'discontinued')
    .map((m) => ({ m, agg: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.agg.rnc > 0)

  // Sugestões do assistente para o período selecionado.
  const insights = useMemo(
    () =>
      dashboardInsights(db, records, allRecords, {
        isYear,
        year,
        month,
        periodLabel,
        targetTaxa,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, periodKey],
  )

  return (
    <div className="space-y-5">
      {/* Fundo decorativo (não interativo) */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="omp-blob omp-blob-1" />
        <div className="omp-blob omp-blob-2" />
      </div>

      <div className="omp-in flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="omp-gradient-text text-2xl font-bold tracking-tight">
            IMPRESSÃO — {periodLabel}
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da secção de impressão. Toca no ícone{' '}
            <span className="inline-flex align-middle">
              <InfoTip text="É assim que cada dado se explica a si próprio — funciona com o rato e com o dedo." />
            </span>{' '}
            para perceber cada indicador.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-[170px]" aria-label="Escolher período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Ano inteiro (todos os meses)</SelectLabel>
                {options
                  .filter((o) => o.isYear)
                  .map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
              </SelectGroup>
              {options.some((o) => !o.isYear) && (
                <>
                  <SelectSeparator />
                  <SelectGroup>
                    <SelectLabel>Meses com dados</SelectLabel>
                    {options
                      .filter((o) => !o.isYear)
                      .map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </>
              )}
            </SelectContent>
          </Select>
          <InfoTip text="Vê os indicadores do ano inteiro ou de um mês específico. Só aparecem períodos que já têm dados." />
        </div>
      </div>

      <div className="omp-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4" style={{ animationDelay: '60ms' }}>
        <Kpi
          label="OF / trabalhos"
          info="Ordens de Fabrico: número total de trabalhos produzidos no período."
          value={a.of}
          format={(v) => Math.round(v).toLocaleString('pt-PT')}
          delta={deltaOf(trendCurrent?.of ?? 0, trendPrevious?.of ?? null, true)}
          vsLabel={prevLabel}
          spark={spark.of}
          sparkColor="var(--primary)"
        />
        <Kpi
          label="RNC"
          info="Registos de Não Conformidade: defeitos ou problemas de qualidade detetados."
          value={a.rnc}
          format={(v) => Math.round(v).toLocaleString('pt-PT')}
          delta={deltaOf(trendCurrent?.rnc ?? 0, trendPrevious?.rnc ?? null, false)}
          vsLabel={prevLabel}
          spark={spark.rnc}
          sparkColor="var(--destructive)"
        />
        <Kpi
          label="Taxa RNC / 100 OF"
          info="Defeitos por cada 100 trabalhos: (RNC ÷ OF) × 100. Quanto menor, melhor."
          value={a.taxa}
          format={(v) => `${v.toFixed(2).replace('.', ',')}%`}
          delta={deltaOf(trendCurrent?.taxa ?? 0, trendPrevious?.taxa ?? null, false, true)}
          vsLabel={prevLabel}
          spark={spark.taxa}
          sparkColor="var(--warning)"
        />
        <Kpi
          label="OF por RNC"
          info="Quantos trabalhos são feitos por cada defeito. Quanto maior, melhor."
          value={a.ofRnc}
          format={(v) => v.toFixed(1).replace('.', ',')}
          delta={deltaOf(trendCurrent?.ofRnc ?? 0, trendPrevious?.ofRnc ?? null, true)}
          vsLabel={prevLabel}
          spark={spark.ofRnc}
          sparkColor="var(--success)"
        />
      </div>

      <Card className="omp-in omp-card-hover omp-health" style={{ animationDelay: '120ms' }}>
        <CardContent className="flex flex-wrap items-center gap-6 px-6 py-5">
          <HealthRing score={health.score} tone={healthTone} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 font-semibold">
              Índice de Saúde da Produção
              <InfoTip text="Nota de 0 a 100 que resume a saúde da produção do período, a partir da taxa de RNC, alertas de máquinas ativas, equilíbrio entre secções e evolução recente. Maior = melhor." />
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Estado:{' '}
              <span className="font-medium" style={{ color: toneVar[healthTone] }}>
                {health.label}
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fmtOfRnc(a) === 'Sem RNC'
                ? 'Sem defeitos registados neste período.'
                : `Neste período: ${a.of.toLocaleString('pt-PT')} OF, ${a.rnc} RNC (${fmt(a.taxa)}).`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="omp-in grid gap-4 md:grid-cols-2" style={{ animationDelay: '180ms' }}>
        <SectionDonut
          db={db}
          title="RNC por secção"
          info="Distribuição dos defeitos entre as secções de impressão."
          metric="rnc"
          records={records}
        />
        <SectionDonut
          db={db}
          title="OF por secção"
          info="Distribuição dos trabalhos produzidos entre as secções de impressão."
          metric="of"
          records={records}
        />
      </div>

      <div className="omp-in" style={{ animationDelay: '240ms' }}>
        <MachineOverview db={db} records={records} />
      </div>

      <Card className="omp-in omp-card-hover" style={{ animationDelay: '300ms' }}>
        <CardHeader>
          <CardTitle className="text-base">Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {worst ? (
            <>
              <p>
                Pior máquina ativa por taxa:{' '}
                <span className="inline-flex items-center gap-1 font-medium">
                  {machineName(db, worst.m.id)}
                  <InfoTip text={machineInfo(db, worst.m.id)} label={`O que é ${worst.m.name}`} />
                </span>{' '}
                ({fmt(worst.agg.taxa)}).
              </p>
              <p className="text-muted-foreground">
                Média do período: <span className="font-medium text-foreground">{fmt(a.taxa)}</span>.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Sem dados de máquinas ativas.</p>
          )}
          {discontinuedWithRnc.map((x) => (
            <p key={x.m.id} className="text-xs text-muted-foreground">
              Nota: a {x.m.name} (descontinuada) registou {x.agg.rnc} RNC neste período — fica fora dos
              alertas por já não estar em produção.
            </p>
          ))}
        </CardContent>
      </Card>

      <ObaniA insights={insights} enabled={assistantOn} />
    </div>
  )
}
