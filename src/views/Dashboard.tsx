import { useMemo, useState } from 'react'
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
import type { Db } from '@/lib/types'
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
import { taxaTone, toneVar, type Tone } from '@/lib/severity'
import { SECTION_COLORS } from '@/lib/colors'

function machineInfo(db: Db, id: string): string {
  const m = db.machines.find((x) => x.id === id)
  if (!m) return id
  const tipo = m.sectionId === 'flexo' ? 'Flexografia' : 'Rotogravura'
  const estado = m.status === 'discontinued' ? ` · ${m.statusNote || 'máquina descontinuada'}` : ''
  return `Máquina de ${tipo} (secção ${sectionName(db, m.sectionId)})${estado}`
}

function Kpi({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {label}
          <InfoTip text={info} />
        </div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{value}</div>
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
  records: ReturnType<typeof recordsFor>
}) {
  const totals = sectionTotals(db, records)
  const data = totals
    .map((t) => ({ name: t.section.name, id: t.section.id, value: metric === 'rnc' ? t.rnc : t.of }))
    .filter((d) => d.value > 0)
  const total = data.reduce((a, d) => a + d.value, 0)

  return (
    <Card>
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

function MachineRanking({
  db,
  title,
  info,
  metric,
  records,
  colorByTone,
}: {
  db: Db
  title: string
  info: string
  metric: 'of' | 'rnc'
  records: ReturnType<typeof recordsFor>
  colorByTone: boolean
}) {
  const items = db.machines
    .map((m) => ({ m, a: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => (metric === 'of' ? x.a.of > 0 : x.a.rnc > 0))
    .sort((a, b) => (metric === 'of' ? b.a.of - a.a.of : b.a.rnc - a.a.rnc))
    .slice(0, 3)
  const max = Math.max(...items.map((x) => (metric === 'of' ? x.a.of : x.a.rnc)), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          {title}
          <InfoTip text={info} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados.</p>
        ) : (
          items.map((x) => {
            const value = metric === 'of' ? x.a.of : x.a.rnc
            const tone = colorByTone ? taxaTone(x.a.taxa) : 'neutral'
            const barColor = colorByTone ? toneVar[tone] : 'var(--primary)'
            return (
              <div key={x.m.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {x.m.name}
                    <InfoTip text={machineInfo(db, x.m.id)} label={`O que é ${x.m.name}`} />
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {value} · {fmt(x.a.taxa)}
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.max(4, (value / max) * 100)}%`, background: barColor }}
                  />
                </div>
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}

export function Dashboard({ db }: { db: Db }) {
  const allRecords = recordsFor(db, {})

  // Períodos disponíveis: o ano inteiro e cada mês com dados registados.
  const { options, defaultKey } = useMemo(() => {
    const years = [...new Set(allRecords.map((r) => r.year))].sort((x, y) => y - x)
    const opts: { value: string; label: string; isYear: boolean }[] = []
    years.forEach((y) => {
      opts.push({ value: `${y}`, label: `Ano ${y} (todos os meses)`, isYear: true })
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

  // alertas: pior máquina por taxa no período escolhido
  const byMachine = db.machines
    .map((m) => ({ m, agg: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.agg.of > 0)
    .sort((x, y) => (y.agg.taxa || 0) - (x.agg.taxa || 0))
  const worst = byMachine[0]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard — {periodLabel}</h1>
          <p className="text-sm text-muted-foreground">
            Escolhe o período à direita. Passa o cursor sobre o ícone{' '}
            <span className="inline-flex align-middle">
              <InfoTip text="É assim que cada dado se explica a si próprio." />
            </span>{' '}
            para perceber cada indicador.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={periodKey} onValueChange={setPeriodKey}>
            <SelectTrigger className="w-[190px]" aria-label="Escolher período">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Ano inteiro</SelectLabel>
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
          <InfoTip text="Vê os indicadores do ano inteiro ou de um mês específico. Só aparecem meses de que já há dados ou relatórios." />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="OF / trabalhos"
          value={a.of.toLocaleString('pt-PT')}
          info="Ordens de Fabrico: número total de trabalhos produzidos no ano."
        />
        <Kpi
          label="RNC"
          value={a.rnc.toLocaleString('pt-PT')}
          info="Registos de Não Conformidade: defeitos ou problemas de qualidade detetados."
        />
        <Kpi
          label="Taxa RNC / 100 OF"
          value={fmt(a.taxa)}
          info="Defeitos por cada 100 trabalhos: (RNC ÷ OF) × 100. Quanto menor, melhor."
        />
        <Kpi
          label="OF por RNC"
          value={fmtOfRnc(a)}
          info="Quantos trabalhos são feitos por cada defeito. Quanto maior, melhor."
        />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 px-6 py-5">
          <div
            className="flex size-20 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
            style={{ background: toneVar[healthTone], color: 'white' }}
          >
            {health.score}
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-semibold">
              Índice de Saúde da Produção
              <InfoTip text="Nota de 0 a 100 que resume a saúde da produção do ano, a partir da taxa de RNC, alertas de máquinas, equilíbrio entre secções e evolução recente. Maior = melhor." />
            </div>
            <p className="text-sm text-muted-foreground">
              Estado: <span className="font-medium text-foreground">{health.label}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionDonut
          db={db}
          title="RNC por secção"
          info="Distribuição dos defeitos entre Flexografia e Rotogravura."
          metric="rnc"
          records={records}
        />
        <SectionDonut
          db={db}
          title="OF por secção"
          info="Distribuição dos trabalhos produzidos entre as duas secções."
          metric="of"
          records={records}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <MachineRanking
          db={db}
          title="Top 3 máquinas com mais trabalho"
          info="As máquinas que mais OF produziram este ano."
          metric="of"
          records={records}
          colorByTone={false}
        />
        <MachineRanking
          db={db}
          title="Piores 3 máquinas por RNC"
          info="As máquinas com mais defeitos este ano. A cor da barra segue a taxa: verde = 0, âmbar até 5%, vermelho acima."
          metric="rnc"
          records={records}
          colorByTone
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Alertas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {worst ? (
            <>
              <p>
                Pior máquina por taxa:{' '}
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
            <p className="text-muted-foreground">Sem dados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
