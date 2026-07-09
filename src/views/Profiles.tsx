import { useState } from 'react'
import { ArrowLeft, Boxes, ChevronRight, IdCard, Info, Users } from 'lucide-react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { InfoTip } from '@/components/InfoTip'
import type { Db, Team, Worker } from '@/lib/types'
import {
  ageFromBirth,
  humanDuration,
  machineName,
  MONTHS,
  monthsBetween,
  placeLabel,
  printingMonths,
  teamName,
  teamRegimeLabel,
  workerLabel,
} from '@/lib/db'
import { MACHINE_PALETTE } from '@/lib/colors'

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

function WorkerProfile({ db, worker, onBack, onOpenTeam }: {
  db: Db
  worker: Worker
  onBack: () => void
  onOpenTeam: (teamId: string) => void
}) {
  const age = ageFromBirth(worker.birthDate)
  const printMonths = printingMonths(worker)
  const roleHist = [...(worker.roleHistory || [])].sort((a, b) => (b.start || '').localeCompare(a.start || ''))
  const teamHist = [...(worker.teamHistory || [])].sort((a, b) => (b.start || '').localeCompare(a.start || ''))

  // Tempo por equipa (para o gráfico circular do esboço).
  const teamDurations = (worker.teamHistory || [])
    .map((t) => ({ name: teamName(db, t.teamId), months: monthsBetween(t.start, t.end) }))
    .filter((x) => x.months > 0)

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" /> Voltar
      </Button>

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
                  onClick={() => onOpenTeam(worker.teamId!)}
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
                      {/* linha vertical da cronologia */}
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
                        <span className="font-medium">{teamName(db, t.teamId)}</span>
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

      <NoProductionNote kind="trabalhador" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ficha da equipa
// ---------------------------------------------------------------------------

function TeamProfile({ db, team, onBack, onOpenWorker }: {
  db: Db
  team: Team
  onBack: () => void
  onOpenWorker: (workerId: string) => void
}) {
  const members = db.workers.filter((w) => w.teamId === team.id)

  return (
    <div className="space-y-4">
      <Button variant="outline" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4" /> Voltar
      </Button>

      <Card className="omp-card-hover">
        <CardContent className="flex flex-wrap items-center gap-4 px-6 py-5">
          <span className="omp-mascot flex size-14 shrink-0 items-center justify-center rounded-2xl !text-white">
            <Boxes className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">{team.name}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline">Máquina: {machineName(db, team.machineId)}</Badge>
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
            <Users className="size-4 text-muted-foreground" />
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
                    onClick={() => onOpenWorker(w.id)}
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

      <NoProductionNote kind="equipa" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ecrã principal das Fichas
// ---------------------------------------------------------------------------

type Selection = { kind: 'worker'; id: string } | { kind: 'team'; id: string } | null

export function Profiles({ db }: { db: Db }) {
  const [sel, setSel] = useState<Selection>(null)

  if (sel?.kind === 'worker') {
    const worker = db.workers.find((w) => w.id === sel.id)
    if (worker) {
      return (
        <WorkerProfile
          db={db}
          worker={worker}
          onBack={() => setSel(null)}
          onOpenTeam={(teamId) => setSel({ kind: 'team', id: teamId })}
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
          onBack={() => setSel(null)}
          onOpenWorker={(workerId) => setSel({ kind: 'worker', id: workerId })}
        />
      )
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Fichas</h1>
        <p className="text-sm text-muted-foreground">
          A página de cada trabalhador e de cada equipa: quem é, por onde passou e durante quanto
          tempo. Para estatística e análise — não para culpabilização.
        </p>
      </div>

      <Tabs defaultValue="workers">
        <TabsList className="w-full">
          <TabsTrigger value="workers">
            <IdCard className="size-4" /> Trabalhadores
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Boxes className="size-4" /> Equipas
          </TabsTrigger>
        </TabsList>

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
                  onClick={() => setSel({ kind: 'worker', id: w.id })}
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
                  onClick={() => setSel({ kind: 'team', id: t.id })}
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
