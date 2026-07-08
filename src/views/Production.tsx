import { useState } from 'react'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoTip } from '@/components/InfoTip'
import type { Db, Machine, ProductionRecord } from '@/lib/types'
import { aggregate, fmt, MONTHS, recordsFor, sectionName } from '@/lib/db'
import { machineColor, sectionColor } from '@/lib/colors'
import { taxaTone, toneVar, type Tone } from '@/lib/severity'

function machineInfo(db: Db, m: Machine): string {
  const tipo = m.sectionId === 'flexo' ? 'Flexografia' : 'Rotogravura'
  const estado = m.status === 'discontinued' ? ` · ${m.statusNote || 'máquina descontinuada'}` : ''
  return `Máquina de ${tipo} (secção ${sectionName(db, m.sectionId)})${estado}`
}

const SECTION_ORDER: Record<string, number> = { flexo: 0, roto: 1 }
const BARS_HEIGHT = 240

/** Barras verticais com todas as máquinas: Flexografia primeiro, Rotogravura depois.
 *  Barra = OF (cor da secção). Número grande ao lado = RNC (cor por severidade).
 *  A melhor e a pior máquina (por taxa) ficam destacadas com 👍 / 👎 animados. */
function MachinesChart({ db, year }: { db: Db; year: number }) {
  const all = recordsFor(db, { year })
  const rows = [...db.machines]
    .sort((a, b) => (SECTION_ORDER[a.sectionId] ?? 9) - (SECTION_ORDER[b.sectionId] ?? 9))
    .map((m) => ({ m, a: aggregate(all.filter((r) => r.machineId === m.id)) }))

  const maxOf = Math.max(...rows.map((x) => x.a.of), 1)

  const rated = rows.filter((x) => x.a.of > 0 && x.a.taxa !== null)
  const sortedByTaxa = [...rated].sort((a, b) => (a.a.taxa || 0) - (b.a.taxa || 0))
  const bestId = sortedByTaxa[0]?.m.id
  const worstId = sortedByTaxa[sortedByTaxa.length - 1]?.m.id

  const pct = (v: number, max: number) => (max ? Math.max(v > 0 ? 3 : 0, (v / max) * 100) : 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          Trabalhos e defeitos por máquina
          <InfoTip text="Todas as máquinas juntas para comparar a secção de impressão e as suas duas sub-secções. A barra é o OF (trabalhos), na cor da secção. O número grande ao lado é o RNC (defeitos), com cor pela taxa. A melhor e a pior máquina estão destacadas com 👍 e 👎." />
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: sectionColor('flexo') }} /> OF Flexografia
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: sectionColor('roto') }} /> OF Rotogravura
          </span>
          <span className="flex items-center gap-1.5">
            <b className="text-sm text-foreground">12</b> = nº de RNC
          </span>
          <span className="flex items-center gap-1.5">
            <ThumbsUp className="size-3.5" style={{ color: 'var(--success)' }} /> melhor
          </span>
          <span className="flex items-center gap-1.5">
            <ThumbsDown className="size-3.5" style={{ color: 'var(--destructive)' }} /> pior
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-1.5 overflow-x-auto pb-1 sm:gap-2">
          {rows.map((x, i) => {
            const prev = rows[i - 1]
            const newSection = !prev || prev.m.sectionId !== x.m.sectionId
            const isBest = x.m.id === bestId
            const isWorst = x.m.id === worstId
            const rncColor = toneVar[taxaTone(x.a.taxa)]
            return (
              <div key={x.m.id} className="flex items-end">
                {newSection && i > 0 && <div className="mx-1 h-[300px] w-px self-stretch bg-border" />}
                <div
                  className={`flex min-w-[68px] flex-1 flex-col items-center gap-1 rounded-lg px-1.5 pt-1 ${
                    isBest ? 'omp-best bg-success/10' : isWorst ? 'omp-worst bg-destructive/10' : ''
                  }`}
                >
                  <div className="flex h-6 items-center">
                    {isBest && <ThumbsUp className="omp-bob size-5" style={{ color: 'var(--success)' }} />}
                    {isWorst && <ThumbsDown className="omp-bob size-5" style={{ color: 'var(--destructive)' }} />}
                  </div>
                  <div className="text-[11px] font-medium tabular-nums text-muted-foreground">{x.a.of} OF</div>
                  <div className="flex w-full items-end justify-center gap-2" style={{ height: BARS_HEIGHT }}>
                    <div
                      className="w-5 rounded-t transition-all"
                      style={{ height: `${pct(x.a.of, maxOf)}%`, background: sectionColor(x.m.sectionId) }}
                      title={`${x.m.name} — ${x.a.of} OF`}
                    />
                    <div className="flex flex-col items-center self-center leading-none">
                      <span className="text-[10px] text-muted-foreground">RNC</span>
                      <span className="text-2xl font-bold tabular-nums" style={{ color: rncColor }}>
                        {x.a.rnc}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium">
                    {x.m.name}
                    <InfoTip text={machineInfo(db, x.m)} label={`O que é ${x.m.name}`} />
                  </div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    % RNC <span style={{ color: rncColor }}>{fmt(x.a.taxa)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: sectionColor('flexo') }} /> Flexografia (IF)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: sectionColor('roto') }} /> Rotogravura (IR)
          </span>
        </div>
      </CardContent>
    </Card>
  )
}

interface TipItem {
  dataKey?: string | number
  name?: string
  value?: number | string
  color?: string
  stroke?: string
}
/** Tooltip que mostra só a máquina do ponto sob o cursor (não a coluna toda). */
function SinglePointTooltip({
  active,
  payload,
  label,
  hovered,
}: {
  active?: boolean
  payload?: TipItem[]
  label?: string | number
  hovered: string | null
}) {
  if (!active || !payload || !payload.length) return null
  const item = (hovered && payload.find((p) => p.dataKey === hovered)) || payload[0]
  if (!item) return null
  return (
    <div
      style={{
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--popover-foreground)',
        fontSize: 12,
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ marginBottom: 3, color: 'var(--muted-foreground)' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span
          style={{ width: 10, height: 10, borderRadius: 9999, background: item.color ?? item.stroke }}
        />
        <b>{item.name}</b>: {item.value}
      </div>
    </div>
  )
}

function TrendChart({ db, year }: { db: Db; year: number }) {
  const [metric, setMetric] = useState<'of' | 'rnc'>('of')
  const [sectionFilter, setSectionFilter] = useState<'all' | 'flexo' | 'roto'>('all')
  const [hovered, setHovered] = useState<string | null>(null)
  const all = recordsFor(db, { year })

  const monthKeys = [...new Set(all.map((r) => r.year * 12 + r.month))].sort((a, b) => a - b)
  const machines = db.machines.filter(
    (m) =>
      (sectionFilter === 'all' || m.sectionId === sectionFilter) &&
      all.some((r) => r.machineId === m.id),
  )

  const data = monthKeys.map((k) => {
    const y = Math.floor(k / 12)
    const mo = ((k % 12) + 12) % 12
    const row: Record<string, number | string> = { label: `${MONTHS[mo].slice(0, 3)} ${String(y).slice(2)}` }
    machines.forEach((m) => {
      const a = aggregate(all.filter((r) => r.machineId === m.id && r.year === y && r.month === mo))
      row[m.name] = metric === 'of' ? a.of : a.rnc
    })
    return row
  })

  const metricBtn = (id: 'of' | 'rnc', label: string) => (
    <Button size="sm" variant={metric === id ? 'default' : 'outline'} onClick={() => setMetric(id)}>
      {label}
    </Button>
  )
  const sectionBtn = (id: 'all' | 'flexo' | 'roto', label: string) => (
    <Button
      size="sm"
      variant={sectionFilter === id ? 'default' : 'outline'}
      onClick={() => setSectionFilter(id)}
    >
      {label}
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-1.5 text-base">
          Tendência ao longo dos meses
          <InfoTip text="Evolução mês a mês de cada máquina. Passa o cursor sobre um ponto para ver o valor dessa máquina nesse mês. Sobe = mais, desce = menos." />
        </CardTitle>
        <div className="flex flex-wrap gap-3 pt-2">
          <div className="flex gap-1.5">
            {metricBtn('of', 'OF / trabalhos')}
            {metricBtn('rnc', 'RNC / defeitos')}
          </div>
          <div className="flex gap-1.5">
            {sectionBtn('all', 'Todas')}
            {sectionBtn('flexo', 'Flexografia')}
            {sectionBtn('roto', 'Rotogravura')}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda não há meses com dados.</p>
        ) : (
          <ResponsiveContainer width="100%" height={340}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }} onMouseLeave={() => setHovered(null)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} width={36} />
              <RTooltip cursor={{ stroke: 'var(--border)' }} content={<SinglePointTooltip hovered={hovered} />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {machines.map((m) => {
                const color = machineColor(db, m.id)
                return (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={m.name}
                    stroke={color}
                    strokeWidth={2.5}
                    activeDot={false}
                    connectNulls
                    dot={(props: { cx?: number; cy?: number; index?: number }) => {
                      const { cx, cy, index } = props
                      if (cx == null || cy == null) return <g key={`${m.id}-${index}`} />
                      return (
                        <g
                          key={`${m.id}-${index}`}
                          className="omp-dot"
                          onMouseEnter={() => setHovered(m.name)}
                        >
                          <circle className="omp-dot-core" cx={cx} cy={cy} r={4} fill={color} />
                          <circle cx={cx} cy={cy} r={12} fill="transparent" />
                        </g>
                      )
                    }}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

interface Delta {
  arrow: string
  text: string
  tone: Tone
}
/** Variação face ao mês anterior, com cor por qualidade (OF sobe = bom; RNC sobe = mau). */
function qualityDelta(curr: number, prev: number | undefined, kind: 'of' | 'rnc'): Delta | null {
  if (prev === undefined) return null
  if (prev === 0) {
    if (curr === 0) return { arrow: '→', text: '0%', tone: 'neutral' }
    return { arrow: '▲', text: 'novo', tone: kind === 'of' ? 'success' : 'danger' }
  }
  const rounded = Math.round(((curr - prev) / prev) * 100)
  const up = rounded > 0
  const down = rounded < 0
  const tone: Tone =
    kind === 'of'
      ? up ? 'success' : down ? 'danger' : 'neutral'
      : up ? 'danger' : down ? 'success' : 'neutral'
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : ''
  return { arrow: up ? '▲' : down ? '▼' : '→', text: `${sign}${Math.abs(rounded)}%`, tone }
}

interface EvoPoint {
  label: string
  monthName: string
  of: number
  rnc: number
  ofD: Delta | null
  rncD: Delta | null
}

const RNC_LINE = 'var(--destructive)'

/** Etiqueta de RNC junto à bola da linha: com halo (contorno) para ler sobre qualquer barra + pulse. */
function RncLabel(props: { x?: number; y?: number; value?: number | string }) {
  const { x, y, value } = props
  if (x == null || y == null) return null
  return (
    <g className="omp-rnc-label">
      <text
        x={x}
        y={y}
        dy={-10}
        textAnchor="middle"
        fontSize={13}
        fontWeight={800}
        fill={RNC_LINE}
        stroke="var(--background)"
        strokeWidth={3}
        strokeLinejoin="round"
        paintOrder="stroke"
      >
        {value}
      </text>
    </g>
  )
}

function evoSeries(records: ProductionRecord[]): EvoPoint[] {
  const monthKeys = [...new Set(records.map((r) => r.year * 12 + r.month))].sort((a, b) => a - b)
  const series: EvoPoint[] = monthKeys.map((k) => {
    const y = Math.floor(k / 12)
    const mo = ((k % 12) + 12) % 12
    const a = aggregate(records.filter((r) => r.year === y && r.month === mo))
    return {
      label: `${MONTHS[mo].slice(0, 3)} ${String(y).slice(2)}`,
      monthName: `${MONTHS[mo]} ${y}`,
      of: a.of,
      rnc: a.rnc,
      ofD: null,
      rncD: null,
    }
  })
  series.forEach((s, i) => {
    const p = series[i - 1]
    s.ofD = qualityDelta(s.of, p?.of, 'of')
    s.rncD = qualityDelta(s.rnc, p?.rnc, 'rnc')
  })
  return series
}

/** Cartão de evolução mês a mês (reutilizado para secção e para máquina). */
function EvolutionCard({
  title,
  color,
  records,
  info,
  height = 210,
}: {
  title: string
  color: string
  records: ProductionRecord[]
  info: string
  height?: number
}) {
  const series = evoSeries(records)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="size-3 rounded-full" style={{ background: color }} />
          {title}
          <InfoTip text={info} />
        </CardTitle>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm" style={{ background: color }} /> OF (barras)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4" style={{ background: RNC_LINE }} /> RNC (linha)
          </span>
        </div>
      </CardHeader>
      <CardContent>
        {series.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados para este período.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <ComposedChart data={series} margin={{ top: 24, right: 4, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
                <YAxis
                  yAxisId="of"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  allowDecimals={false}
                  width={40}
                />
                <YAxis
                  yAxisId="rnc"
                  orientation="right"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  allowDecimals={false}
                  width={28}
                />
                <RTooltip content={<EvoTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.4 }} />
                <Bar yAxisId="of" dataKey="of" fill={color} radius={[3, 3, 0, 0]} maxBarSize={44}>
                  <LabelList dataKey="of" position="insideBottom" offset={10} fontSize={12} fontWeight={700} fill="#ffffff" />
                </Bar>
                <Line
                  yAxisId="rnc"
                  type="monotone"
                  dataKey="rnc"
                  stroke={RNC_LINE}
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: RNC_LINE, strokeWidth: 0 }}
                >
                  <LabelList dataKey="rnc" content={<RncLabel />} />
                </Line>
              </ComposedChart>
            </ResponsiveContainer>

            {/* faixa de variação mês a mês */}
            <div className="mt-3 flex flex-wrap gap-2">
              {series.slice(1).map((s) => (
                <div key={s.label} className="rounded-md border px-2.5 py-1.5 text-xs">
                  <div className="font-medium">{s.label}</div>
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">OF</span>
                      {s.ofD && (
                        <span className="tabular-nums" style={{ color: toneVar[s.ofD.tone] }}>
                          {s.ofD.arrow} {s.ofD.text}
                        </span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="text-muted-foreground">RNC</span>
                      {s.rncD && (
                        <span className="tabular-nums" style={{ color: toneVar[s.rncD.tone] }}>
                          {s.rncD.arrow} {s.rncD.text}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function EvoTooltip({ active, payload }: { active?: boolean; payload?: { payload?: EvoPoint }[] }) {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload
  if (!d) return null
  const line = (label: string, value: number, delta: Delta | null) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span>
        {label}: <b>{value}</b>
      </span>
      {delta && (
        <span style={{ color: toneVar[delta.tone] }}>
          {delta.arrow} {delta.text}
        </span>
      )}
    </div>
  )
  return (
    <div
      style={{
        background: 'var(--popover)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        color: 'var(--popover-foreground)',
        fontSize: 12,
        padding: '6px 10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <div style={{ marginBottom: 3, color: 'var(--muted-foreground)' }}>{d.monthName}</div>
      {line('OF', d.of, d.ofD)}
      {line('RNC', d.rnc, d.rncD)}
    </div>
  )
}

export function Production({ db }: { db: Db }) {
  const years = [...new Set(db.productionRecords.map((r) => r.year))].sort((a, b) => b - a)
  const [year, setYear] = useState(years[0] ?? new Date().getFullYear())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Produção</h1>
          <p className="text-sm text-muted-foreground">
            Trabalhos (OF) e defeitos (RNC) por máquina, no ano selecionado.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[130px]" aria-label="Escolher ano">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Ano {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <InfoTip text="Escolhe o ano. Só aparecem anos com dados; à medida que acrescentares registos de outros anos, aparecem aqui." />
        </div>
      </div>

      <MachinesChart db={db} year={year} />
      <TrendChart db={db} year={year} />

      {db.sections.map((section) => {
        const machines = db.machines.filter((m) => m.sectionId === section.id)
        return (
          <div key={section.id} className="space-y-3">
            <EvolutionCard
              title={`Evolução — ${section.name}`}
              color={sectionColor(section.id)}
              records={recordsFor(db, { sectionId: section.id, year })}
              info={`Mês a mês, ${section.name}: barras = OF (trabalhos), linha = RNC (defeitos). Por baixo, a variação face ao mês anterior — verde é bom, vermelho é mau.`}
              height={220}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {machines.map((m) => (
                <EvolutionCard
                  key={m.id}
                  title={m.name}
                  color={sectionColor(section.id)}
                  records={recordsFor(db, { machineId: m.id, year })}
                  info={`Evolução mês a mês da máquina ${m.name}: OF (barras) e RNC (linha), com a variação face ao mês anterior.`}
                  height={170}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
