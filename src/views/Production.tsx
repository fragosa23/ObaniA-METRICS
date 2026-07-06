import { useState } from 'react'
import {
  CartesianGrid,
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
import { InfoTip } from '@/components/InfoTip'
import type { Db, Machine, Section } from '@/lib/types'
import { aggregate, fmt, MONTHS, recordsFor, sectionName } from '@/lib/db'
import { machineColor, sectionColor } from '@/lib/colors'
import { taxaTone, toneVar } from '@/lib/severity'

function machineInfo(db: Db, m: Machine): string {
  const tipo = m.sectionId === 'flexo' ? 'Flexografia' : 'Rotogravura'
  const estado = m.status === 'discontinued' ? ` · ${m.statusNote || 'máquina descontinuada'}` : ''
  return `Máquina de ${tipo} (secção ${sectionName(db, m.sectionId)})${estado}`
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${max ? Math.max(value > 0 ? 4 : 0, (value / max) * 100) : 0}%`, background: color }}
      />
    </div>
  )
}

/** Uma secção: lista de máquinas com barra de OF (cor da secção) e barra de RNC (cor por severidade). */
function SectionCard({ db, section }: { db: Db; section: Section }) {
  const all = recordsFor(db, {})
  const rows = db.machines
    .filter((m) => m.sectionId === section.id)
    .map((m) => ({ m, a: aggregate(all.filter((r) => r.machineId === m.id)) }))
  const maxOf = Math.max(...rows.map((x) => x.a.of), 1)
  const maxRnc = Math.max(...rows.map((x) => x.a.rnc), 1)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="size-3 rounded-full" style={{ background: sectionColor(section.id) }} />
          {section.name}
          <InfoTip text={`Máquinas da secção de ${section.name}. Barra colorida = OF (trabalhos). Barra ao lado = RNC (defeitos), com cor pela taxa: verde 0, âmbar até 5%, vermelho acima.`} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((x) => (
          <div key={x.m.id} className="grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-medium">
                  {x.m.name}
                  <InfoTip text={machineInfo(db, x.m)} label={`O que é ${x.m.name}`} />
                </span>
                <span className="text-muted-foreground tabular-nums">{x.a.of} OF</span>
              </div>
              <Bar value={x.a.of} max={maxOf} color={sectionColor(section.id)} />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">RNC</span>
                <span className="tabular-nums" style={{ color: toneVar[taxaTone(x.a.taxa)] }}>
                  {x.a.rnc} · {fmt(x.a.taxa)}
                </span>
              </div>
              <Bar value={x.a.rnc} max={maxRnc} color={toneVar[taxaTone(x.a.taxa)]} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function Highlight({
  db,
  kind,
  item,
}: {
  db: Db
  kind: 'best' | 'worst'
  item?: { m: Machine; a: ReturnType<typeof aggregate> }
}) {
  const isBest = kind === 'best'
  const color = isBest ? 'var(--success)' : 'var(--destructive)'
  return (
    <Card className="border-l-4" style={{ borderLeftColor: color }}>
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {isBest ? 'Melhor máquina' : 'Pior máquina'}
          <InfoTip
            text={
              isBest
                ? 'Máquina com menor taxa de RNC por 100 OF — a que produz com menos defeitos por trabalho.'
                : 'Máquina com maior taxa de RNC por 100 OF — a que mais defeitos tem por trabalho.'
            }
          />
        </div>
        {item ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="flex items-center gap-1.5 text-2xl font-semibold">
              {item.m.name}
              <InfoTip text={machineInfo(db, item.m)} label={`O que é ${item.m.name}`} />
            </span>
            <span className="text-lg font-medium" style={{ color }}>
              {fmt(item.a.taxa)}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">Sem dados suficientes.</p>
        )}
      </CardContent>
    </Card>
  )
}

function TrendChart({ db }: { db: Db }) {
  const [metric, setMetric] = useState<'of' | 'rnc'>('of')
  const [sectionFilter, setSectionFilter] = useState<'all' | 'flexo' | 'roto'>('all')
  const all = recordsFor(db, {})

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
          <InfoTip text="Evolução mês a mês de cada máquina. Cada linha é uma máquina; sobe = mais, desce = menos. Escolhe ver OF (trabalhos) ou RNC (defeitos)." />
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
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} width={36} />
              <RTooltip
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--popover-foreground)',
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {machines.map((m) => (
                <Line
                  key={m.id}
                  type="monotone"
                  dataKey={m.name}
                  stroke={machineColor(db, m.id)}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

export function Production({ db }: { db: Db }) {
  const all = recordsFor(db, {})
  const rated = db.machines
    .map((m) => ({ m, a: aggregate(all.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.a.of > 0 && x.a.taxa !== null)
    .sort((a, b) => (a.a.taxa || 0) - (b.a.taxa || 0))
  const best = rated[0]
  const worst = rated[rated.length - 1]

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Produção</h1>
        <p className="text-sm text-muted-foreground">
          Trabalhos (OF) e defeitos (RNC) por máquina, com todos os meses registados.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Highlight db={db} kind="best" item={best} />
        <Highlight db={db} kind="worst" item={worst} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {db.sections.map((s) => (
          <SectionCard key={s.id} db={db} section={s} />
        ))}
      </div>

      <TrendChart db={db} />
    </div>
  )
}
