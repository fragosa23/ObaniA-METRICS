import { ArrowLeft, ArrowUpRight, Boxes, ChevronRight, Factory, IdCard, Info, Pencil } from 'lucide-react'
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoTip } from '@/components/InfoTip'
import { ChartReview } from '@/components/ChartReview'
import { ChangeLogList } from '@/components/ChangeLogList'
import type { Db, Machine, Team, Worker } from '@/lib/types'
import {
  ageFromBirth,
  aggregate,
  fmt,
  humanDuration,
  machineName,
  MONTHS,
  monthsBetween,
  placeLabel,
  printingMonths,
  recordsFor,
  sectionName,
  teamName,
  teamRegimeLabel,
  workerLabel,
} from '@/lib/db'
import { MACHINE_PALETTE, sectionColor } from '@/lib/colors'
import { reviewMachineEvolution } from '@/lib/insights'
import { taxaTone, toneVar } from '@/lib/severity'

/** Alvo aberto nas Fichas (controlado pelo App para permitir navegação cruzada). */
export type ProfileTarget = { kind: 'worker' | 'team' | 'machine'; id: string } | null

/** Botão "Editar" das fichas: leva ao menu Dados, onde toda a edição acontece. */
function EditInData({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} aria-label={label}>
      <Pencil className="size-4" /> Editar
      <span className="hidden text-xs font-normal text-muted-foreground sm:inline">· nos Dados</span>
    </Button>
  )
}

/** '2012-03' → 'Mar 2012'; vazio → 'hoje'. */
function fmtMonth(v?: string): string {
  if (!v) return 'hoje'
  const m = /^(\d{4})-(\d{1,2})$/.exec(v)
  if (!m) return v
  return `${MONTHS[Number(m[2]) - 1]?.slice(0, 3) ?? '?'} ${m[1]}`
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/)
  const ini = ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
  return (
    <span className="omp-mascot flex size-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold !text-white">
      {ini}
    </span>
  )
}

function Fact({ label, value, info }: { label: string; value: string; info?: string }) {
  return (
    <div className="rounded-lg border bg-background/50 p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {info && <InfoTip text={info} />}
      </div>
      <div className="mt-0.5 text-sm font-medium">{value}</div>
    </div>
  )
}

/** Histórico de alterações desta ficha (criação, edições e o que mudou). */
function EntityHistory({ db, entityId }: { db: Db; entityId: string }) {
  const entries = (db.changeLog ?? []).filter((e) => e.entityId === entityId)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          Histórico de alterações
          <InfoTip text="Quando esta ficha foi criada e cada edição feita, com os campos que mudaram (de → para). O histórico completo de toda a app está no menu Dados." />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChangeLogList entries={entries} limit={10} showEntity={false} />
      </CardContent>
    </Card>
  )
}

/** Aviso honesto: as OF ainda não identificam quem/que equipa as produziu. */
function NoProductionNote({ kind }: { kind: 'trabalhador' | 'equipa' }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex items-start gap-3 px-5 py-4">
        <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Produção por {kind}: ainda indisponível.</span>{' '}
          Os registos de OF importados não identificam que {kind === 'equipa' ? 'equipa' : 'pessoa'} os
          produziu. Quando essa informação passar a ser registada, esta ficha mostra automaticamente as
          OF, os RNC e a taxa de cada {kind}.
        </p>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Ficha do trabalhador
// ---------------------------------------------------------------------------

function WorkerProfile({
  db,
  worker,
  onBack,
  onOpen,
  onEdit,
}: {
  db: Db
  worker: Worker
  onBack: () => void
  onOpen: (t: ProfileTarget) => void
  onEdit: () => void
}) {
  const age = ageFromBirth(worker.birthDate)
  const printMonths = printingMonths(worker)
  const roleHist = [...(worker.roleHistory || [])].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  const teamHist = [...(worker.teamHistory || [])].sort((a, b) => (b.start || '').localeCompare(a.start || ''))

  const teamDurations = (worker.teamHistory || [])
    .map((t) => ({ name: teamName(db, t.teamId), months: monthsBetween(t.start, t.end) }))
    .filter((x) => x.months > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <EditInData onClick={onEdit} label={`Editar ${workerLabel(worker)} no menu Dados`} />
      </div>

      <Card className="omp-card-hover">
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-5">
          <Initials name={worker.name} />
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{workerLabel(worker)}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {worker.role && <Badge variant="secondary">{worker.role}</Badge>}
              {worker.teamId ? (
                <button
                  type="button"
                  onClick={() => onOpen({ kind: 'team', id: worker.teamId! })}
                  className="inline-flex items-center"
                  aria-label={`Abrir a ficha da equipa ${teamName(db, worker.teamId)}`}
                >
                  <Badge variant="outline" className="cursor-pointer transition-colors hover:bg-muted">
                    {teamName(db, worker.teamId)} <ChevronRight className="size-3" />
                  </Badge>
                </button>
              ) : (
                <Badge variant="outline">Sem equipa</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          label="Idade"
          value={age !== null ? `${age} anos` : 'Sem data de nascimento'}
          info="Calculada a partir da data de nascimento — nunca fica desatualizada."
        />
        <Fact label="Nacionalidade" value={worker.nationality || '—'} />
        <Fact
          label="Anos na empresa"
          value={worker.yearsCompany !== undefined ? `${worker.yearsCompany} anos` : '—'}
          info="Há quantos anos trabalha na fábrica, em qualquer função."
        />
        <Fact
          label="A imprimir há"
          value={printMonths > 0 ? humanDuration(printMonths) : '—'}
          info="Tempo total em funções de impressão (secções ou máquinas), somado do percurso em baixo."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="omp-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Percurso de funções
              <InfoTip text="Todas as funções que desempenhou na fábrica, onde e durante quanto tempo. Atualiza-se sozinho quando a função muda na Estrutura." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roleHist.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem histórico de funções.</p>
            ) : (
              <ol className="space-y-0">
                {roleHist.map((r, i) => {
                  const months = monthsBetween(r.start, r.end)
                  const current = !r.end
                  return (
                    <li key={r.id} className="relative flex gap-3 pb-4 last:pb-0">
                      {i < roleHist.length - 1 && (
                        <span className="absolute top-4 left-[5px] h-full w-px bg-border" aria-hidden="true" />
                      )}
                      <span
                        className={`relative mt-1.5 size-[11px] shrink-0 rounded-full border-2 ${
                          current ? 'border-primary bg-primary/40' : 'border-muted-foreground/40 bg-background'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          {r.role}
                          {current && (
                            <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              atual
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {placeLabel(db, r.placeKind, r.placeId)}
                          {r.start && (
                            <>
                              {' · '}
                              {fmtMonth(r.start)} — {fmtMonth(r.end)}
                              {months > 0 && ` · ${humanDuration(months)}`}
                            </>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="omp-card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-base">
              Tempo por equipa
              <InfoTip text="Por que equipas passou e quanto tempo esteve em cada uma. O gráfico mostra a proporção do tempo." />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {teamHist.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não passou por nenhuma equipa.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-4">
                {teamDurations.length > 1 && (
                  <ResponsiveContainer width={120} height={120}>
                    <PieChart>
                      <Pie
                        data={teamDurations}
                        dataKey="months"
                        nameKey="name"
                        innerRadius={32}
                        outerRadius={56}
                        paddingAngle={2}
                      >
                        {teamDurations.map((d, i) => (
                          <Cell key={d.name} fill={MACHINE_PALETTE[i % MACHINE_PALETTE.length]} />
                        ))}
                      </Pie>
                      <RTooltip
                        formatter={(value, name) => [humanDuration(Number(value)), name as string]}
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
                )}
                <ul className="min-w-0 flex-1 space-y-1.5">
                  {teamHist.map((t, i) => {
                    const months = monthsBetween(t.start, t.end)
                    return (
                      <li key={t.id} className="flex items-center gap-2 text-sm">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ background: MACHINE_PALETTE[(teamHist.length - 1 - i) % MACHINE_PALETTE.length] }}
                        />
                        <button
                          type="button"
                          className="font-medium hover:underline"
                          onClick={() => onOpen({ kind: 'team', id: t.teamId })}
                        >
                          {teamName(db, t.teamId)}
                        </button>
                        <span className="text-xs text-muted-foreground">
                          {t.start ? `${fmtMonth(t.start)} — ${fmtMonth(t.end)}` : ''}
                          {months > 0 && ` · ${humanDuration(months)}`}
                          {!t.end && ' (atual)'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {worker.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{worker.notes}</p>
          </CardContent>
        </Card>
      )}

      <EntityHistory db={db} entityId={worker.id} />
      <NoProductionNote kind="trabalhador" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ficha da equipa
// ---------------------------------------------------------------------------

function TeamProfile({
  db,
  team,
  onBack,
  onOpen,
  onEdit,
}: {
  db: Db
  team: Team
  onBack: () => void
  onOpen: (t: ProfileTarget) => void
  onEdit: () => void
}) {
  const members = db.workers.filter((w) => w.teamId === team.id)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <EditInData onClick={onEdit} label={`Editar a equipa ${team.name} no menu Dados`} />
      </div>

      <Card className="omp-card-hover">
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-5">
          <span className="omp-mascot flex size-14 shrink-0 items-center justify-center rounded-2xl !text-white">
            <Boxes className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpen({ kind: 'machine', id: team.machineId })}
                aria-label={`Abrir a ficha da máquina ${machineName(db, team.machineId)}`}
              >
                <Badge variant="outline" className="cursor-pointer transition-colors hover:bg-muted">
                  Máquina: {machineName(db, team.machineId)} <ChevronRight className="size-3" />
                </Badge>
              </button>
              <Badge variant="secondary" className="font-normal">
                {teamRegimeLabel(team)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="omp-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Membros ({members.length})
            <InfoTip text="Os trabalhadores cuja equipa atual é esta. Gerem-se na Estrutura, na ficha de cada trabalhador." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem membros de momento.</p>
          ) : (
            <ul className="space-y-1.5">
              {members.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onOpen({ kind: 'worker', id: w.id })}
                    className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <span>
                      <span className="font-medium">{workerLabel(w)}</span>
                      {w.role && <span className="ml-2 text-xs text-muted-foreground">{w.role}</span>}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <EntityHistory db={db} entityId={team.id} />
      <NoProductionNote kind="equipa" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ficha da máquina
// ---------------------------------------------------------------------------

function MachineProfile({
  db,
  machine,
  onBack,
  onOpen,
  onGoProduction,
  onEdit,
  assistantOn,
}: {
  db: Db
  machine: Machine
  onBack: () => void
  onOpen: (t: ProfileTarget) => void
  onGoProduction: () => void
  onEdit: () => void
  assistantOn: boolean
}) {
  const teams = db.teams.filter((t) => t.machineId === machine.id)
  const workersHere = db.workers.filter(
    (w) =>
      (w.teamId && teams.some((t) => t.id === w.teamId)) ||
      (w.placeKind === 'machine' && w.placeId === machine.id),
  )

  // Ano mais recente com registos desta máquina, e a série mensal para o gráfico.
  const machineRecords = db.productionRecords.filter((r) => r.machineId === machine.id)
  const years = [...new Set(machineRecords.map((r) => r.year))].sort((a, b) => b - a)
  const year = years[0]
  const yearRecords = year !== undefined ? recordsFor(db, { machineId: machine.id, year }) : []
  const total = aggregate(yearRecords)
  const series = [...new Set(yearRecords.map((r) => r.month))]
    .sort((a, b) => a - b)
    .map((m) => {
      const a = aggregate(yearRecords.filter((r) => r.month === m))
      return { label: MONTHS[m].slice(0, 3), of: a.of, rnc: a.rnc }
    })

  const color = sectionColor(machine.sectionId)
  const hasSpecs = machine.manufacturer || machine.year || machine.colors || machine.width

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
        <EditInData onClick={onEdit} label={`Editar a máquina ${machine.name} no menu Dados`} />
      </div>

      <Card className="omp-card-hover">
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-5">
          <span
            className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-white"
            style={{ background: `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 55%, black))` }}
          >
            <Factory className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{machine.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{sectionName(db, machine.sectionId)}</Badge>
              {machine.status === 'discontinued' ? (
                <Badge variant="destructive">Descontinuada</Badge>
              ) : (
                <Badge variant="secondary">Ativa</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasSpecs && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {machine.manufacturer && <Fact label="Fabricante" value={machine.manufacturer} />}
          {machine.year && <Fact label="Ano" value={machine.year} />}
          {machine.colors && <Fact label="Nº de cores" value={machine.colors} />}
          {machine.width && <Fact label="Largura" value={machine.width} />}
        </div>
      )}

      {/* Produção da máquina — clicar leva à página Produção */}
      <Card className="omp-card-hover">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="flex flex-wrap items-center gap-1.5 text-base">
              Produção {year !== undefined ? `em ${year}` : ''}
              <InfoTip text="OF (barras) e RNC (linha) por mês. Clica no gráfico para abrir a página Produção com todos os detalhes." />
            </CardTitle>
            <div className="flex items-center gap-2">
              {series.length > 0 && (
                <div className="text-right text-xs leading-tight">
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-semibold tabular-nums">
                    {total.of} OF ·{' '}
                    <span style={{ color: toneVar[taxaTone(total.taxa)] }}>{total.rnc} RNC</span>
                  </div>
                  <div className="tabular-nums text-muted-foreground">{fmt(total.taxa)}</div>
                </div>
              )}
              {assistantOn && year !== undefined && (
                <ChartReview insights={reviewMachineEvolution(db, machine.id, year)} label={`Máquina ${machine.name}`} />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há registos de produção desta máquina.</p>
          ) : (
            <button
              type="button"
              onClick={onGoProduction}
              className="group w-full cursor-pointer rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
              aria-label="Abrir a página Produção"
            >
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={series} margin={{ top: 8, right: 4, left: -4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} width={36} />
                  <Bar dataKey="of" name="OF" fill={color} radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="rnc" name="RNC" stroke="var(--destructive)" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors group-hover:text-foreground">
                Abrir na Produção <ArrowUpRight className="size-3.5" />
              </span>
            </button>
          )}
        </CardContent>
      </Card>

      {/* Equipas e pessoas desta máquina */}
      <Card className="omp-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-1.5 text-base">
            Equipas e pessoas ({teams.length} {teams.length === 1 ? 'equipa' : 'equipas'})
            <InfoTip text="As equipas associadas a esta máquina e os trabalhadores de cada uma. Clica para abrir cada ficha." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.length === 0 && (
            <p className="text-sm text-muted-foreground">Sem equipas associadas a esta máquina.</p>
          )}
          {teams.map((t) => {
            const members = db.workers.filter((w) => w.teamId === t.id)
            return (
              <div key={t.id} className="rounded-lg border p-3">
                <button
                  type="button"
                  onClick={() => onOpen({ kind: 'team', id: t.id })}
                  className="flex w-full items-center justify-between text-left"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium hover:underline">{t.name}</span>
                    <Badge variant="secondary" className="font-normal">
                      {teamRegimeLabel(t)}
                    </Badge>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
                {members.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {members.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => onOpen({ kind: 'worker', id: w.id })}
                        className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                      >
                        {workerLabel(w)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {workersHere.filter((w) => !w.teamId).length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="mb-2 text-xs text-muted-foreground">Sem equipa, mas a trabalhar nesta máquina:</p>
              <div className="flex flex-wrap gap-1.5">
                {workersHere
                  .filter((w) => !w.teamId)
                  .map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() => onOpen({ kind: 'worker', id: w.id })}
                      className="rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-muted"
                    >
                      {workerLabel(w)}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {machine.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{machine.notes}</p>
          </CardContent>
        </Card>
      )}

      <EntityHistory db={db} entityId={machine.id} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ecrã principal das Fichas
// ---------------------------------------------------------------------------

export function Profiles({
  db,
  sel,
  onSelChange,
  onGoProduction,
  onEdit,
  assistantOn,
}: {
  db: Db
  sel: ProfileTarget
  onSelChange: (t: ProfileTarget) => void
  onGoProduction: () => void
  /** Abre a edição desta entidade no menu Dados (toda a edição acontece lá). */
  onEdit: (t: { kind: 'machine' | 'team' | 'worker'; id: string }) => void
  assistantOn: boolean
}) {
  if (sel?.kind === 'worker') {
    const worker = db.workers.find((w) => w.id === sel.id)
    if (worker) {
      return (
        <WorkerProfile
          db={db}
          worker={worker}
          onBack={() => onSelChange(null)}
          onOpen={onSelChange}
          onEdit={() => onEdit({ kind: 'worker', id: worker.id })}
        />
      )
    }
  }
  if (sel?.kind === 'team') {
    const team = db.teams.find((t) => t.id === sel.id)
    if (team) {
      return (
        <TeamProfile
          db={db}
          team={team}
          onBack={() => onSelChange(null)}
          onOpen={onSelChange}
          onEdit={() => onEdit({ kind: 'team', id: team.id })}
        />
      )
    }
  }
  if (sel?.kind === 'machine') {
    const machine = db.machines.find((m) => m.id === sel.id)
    if (machine) {
      return (
        <MachineProfile
          db={db}
          machine={machine}
          onBack={() => onSelChange(null)}
          onOpen={onSelChange}
          onGoProduction={onGoProduction}
          onEdit={() => onEdit({ kind: 'machine', id: machine.id })}
          assistantOn={assistantOn}
        />
      )
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Fichas</h1>
        <p className="text-sm text-muted-foreground">
          A página de cada máquina, trabalhador e equipa: o que é, quem lá trabalha, por onde passou.
          Para estatística e análise — não para culpabilização.
        </p>
      </div>

      <Tabs defaultValue="machines">
        <TabsList className="w-full">
          <TabsTrigger value="machines">
            <Factory className="size-4" /> Máquinas
          </TabsTrigger>
          <TabsTrigger value="workers">
            <IdCard className="size-4" /> Trabalhadores
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Boxes className="size-4" /> Equipas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machines">
          <Card>
            <CardContent className="space-y-1.5 pt-0">
              {db.machines.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelChange({ kind: 'machine', id: m.id })}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: sectionColor(m.sectionId) }} />
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {sectionName(db, m.sectionId)}
                      {m.status === 'discontinued' && ' · descontinuada'}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workers">
          <Card>
            <CardContent className="space-y-1.5 pt-0">
              {db.workers.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda não há trabalhadores registados.</p>
              )}
              {db.workers.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => onSelChange({ kind: 'worker', id: w.id })}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{workerLabel(w)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {[w.role, teamName(db, w.teamId)].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <Card>
            <CardContent className="space-y-1.5 pt-0">
              {db.teams.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda não há equipas registadas.</p>
              )}
              {db.teams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelChange({ kind: 'team', id: t.id })}
                  className="flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  <span className="min-w-0">
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {machineName(db, t.machineId)} · {teamRegimeLabel(t)}
                    </span>
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
