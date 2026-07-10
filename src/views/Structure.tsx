// Estrutura — ecrã INFORMATIVO da fábrica (mapa, equipas, trabalhadores).
// Toda a criação/edição faz-se no ecrã Dados; daqui só se navega para as fichas.
import { useMemo, useState } from 'react'
import { Boxes, ChevronRight, Factory, Pencil, SprayCan, Users } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { InfoTip } from '@/components/InfoTip'
import type { ProfileTarget } from '@/views/Profiles'
import type { EditTarget } from '@/views/Data'
import type { Db, Machine, WorkArea } from '@/lib/types'
import {
  ageFromBirth,
  currentTeamMonths,
  humanDuration,
  machineName,
  placeLabel,
  printingMonths,
  sectionName,
  teamName,
  teamRegimeLabel,
  workerLabel,
} from '@/lib/db'
import { SECTION_COLORS, sectionColor } from '@/lib/colors'

const NONE = '__none__'

function SectionDot({ id }: { id: string }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: SECTION_COLORS[id] ?? 'var(--muted-foreground)' }}
    />
  )
}

/** "Unidade" de máquina no mapa da fábrica: nome por cima, máquina desenhada, luz de estado. */
function MachineSprite({
  machine,
  onClick,
  big = false,
}: {
  machine: Machine
  onClick?: () => void
  big?: boolean
}) {
  const color = sectionColor(machine.sectionId)
  const active = machine.status !== 'discontinued'
  const body = (
    <>
      <span className="rounded-md border bg-background/85 px-2 py-0.5 text-xs font-semibold shadow-sm">
        {machine.name}
      </span>
      <svg
        width={big ? 110 : 78}
        height={big ? 78 : 56}
        viewBox="0 0 64 46"
        aria-hidden="true"
        className="omp-unit-svg"
      >
        {/* rolos de impressão */}
        <circle cx="16" cy="11" r="7" fill={`color-mix(in srgb, ${color} 55%, white)`} />
        <circle cx="32" cy="11" r="7" fill={`color-mix(in srgb, ${color} 40%, white)`} />
        <circle cx="48" cy="11" r="7" fill={`color-mix(in srgb, ${color} 55%, white)`} />
        {/* corpo da máquina */}
        <rect x="4" y="15" width="56" height="21" rx="3.5" fill={color} />
        {/* papel a sair */}
        <rect x="9" y="30" width="22" height="12" rx="1.5" fill="white" opacity="0.9" />
        {/* base */}
        <rect x="6" y="41" width="52" height="4" rx="2" fill={`color-mix(in srgb, ${color} 45%, black)`} />
        {/* luz de estado: verde a pulsar = ativa; vermelha = descontinuada */}
        <circle
          cx="53"
          cy="21"
          r="3.2"
          fill={active ? 'var(--success)' : 'var(--destructive)'}
          className={active ? 'omp-led' : ''}
        />
      </svg>
      {!active && <span className="text-[10px] font-medium text-destructive/80">descontinuada</span>}
    </>
  )
  if (!onClick) return <span className="flex flex-col items-center gap-1">{body}</span>
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Abrir a máquina ${machine.name}`}
      className="omp-unit flex flex-col items-center gap-1 rounded-xl p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      {body}
    </button>
  )
}

/** "Unidade" de área de apoio no mapa. */
function AreaSprite({ area, onClick }: { area: WorkArea; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Abrir a área ${area.name}`}
      className="omp-unit flex flex-col items-center gap-1 rounded-xl p-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
    >
      <span className="max-w-[130px] truncate rounded-md border bg-background/85 px-2 py-0.5 text-xs font-semibold shadow-sm">
        {area.name}
      </span>
      <span className="omp-unit-svg flex size-12 items-center justify-center rounded-lg border bg-muted">
        <SprayCan className="size-5 text-muted-foreground" />
      </span>
    </button>
  )
}

export function Structure({
  db,
  onOpenProfile,
  onOpenEditor,
}: {
  db: Db
  onOpenProfile: (t: ProfileTarget) => void
  onOpenEditor: (t: EditTarget) => void
}) {
  // Unidade "focada" no mapa (zoom sobre uma máquina ou área).
  const [focus, setFocus] = useState<{ kind: 'machine' | 'area'; id: string } | null>(null)
  // Pesquisa e filtro no separador Trabalhadores.
  const [workerQuery, setWorkerQuery] = useState('')
  const [workerTeamFilter, setWorkerTeamFilter] = useState<string>('all')

  const filteredWorkers = useMemo(() => {
    const q = workerQuery.trim().toLowerCase()
    return db.workers.filter((w) => {
      if (workerTeamFilter === NONE && w.teamId) return false
      if (workerTeamFilter !== 'all' && workerTeamFilter !== NONE && w.teamId !== workerTeamFilter) return false
      if (!q) return true
      return w.name.toLowerCase().includes(q) || (w.number || '').toLowerCase().includes(q)
    })
  }, [db.workers, workerQuery, workerTeamFilter])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Estrutura</h1>
        <p className="text-sm text-muted-foreground">
          A fábrica em consulta: mapa, equipas e trabalhadores. Clica em qualquer coisa para abrir a
          ficha. Para criar ou editar, usa o menu{' '}
          <span className="font-medium text-foreground">Dados</span>
          <span className="ml-1 inline-flex align-middle">
            <InfoTip text="Este ecrã é só de consulta — assim ninguém altera nada por engano. Todas as criações e edições fazem-se no menu Dados." />
          </span>
        </p>
      </div>

      <Tabs defaultValue="machines">
        <TabsList className="w-full">
          <TabsTrigger value="machines">
            <Factory className="size-4" /> Máquinas e Áreas
          </TabsTrigger>
          <TabsTrigger value="teams">
            <Boxes className="size-4" /> Equipas
          </TabsTrigger>
          <TabsTrigger value="workers">
            <Users className="size-4" /> Trabalhadores
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------ Mapa da fábrica */}
        <TabsContent value="machines" className="space-y-4">
          <div className="flex items-center gap-2">
            <Factory className="size-4.5 text-muted-foreground" />
            <h2 className="font-semibold">Mapa da fábrica</h2>
            <InfoTip text="A fábrica vista de cima: cada máquina é uma unidade no mapa, com a luz verde a pulsar quando está ativa (vermelha = descontinuada). Clica numa máquina ou área para fazer zoom e ver as equipas, turnos e detalhes." />
          </div>

          {db.sections
            .filter((s) => db.machines.some((m) => m.sectionId === s.id))
            .map((s) => (
              <div key={s.id} className="omp-zone p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <SectionDot id={s.id} />
                  {s.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({db.machines.filter((m) => m.sectionId === s.id).length}{' '}
                    {db.machines.filter((m) => m.sectionId === s.id).length === 1 ? 'máquina' : 'máquinas'})
                  </span>
                  <InfoTip text={`Secção de impressão ${s.name}. Clica numa máquina para ver quem lá trabalha.`} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {db.machines
                    .filter((m) => m.sectionId === s.id)
                    .map((m) => (
                      <MachineSprite key={m.id} machine={m} onClick={() => setFocus({ kind: 'machine', id: m.id })} />
                    ))}
                </div>
              </div>
            ))}

          <div className="omp-zone p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <SprayCan className="size-4 text-muted-foreground" />
              Áreas de apoio
              <span className="text-xs font-normal text-muted-foreground">({db.workAreas.length})</span>
              <InfoTip text="Sítios sem OF nem RNC (ex.: Montagem de Cilindros, Limpeza). Servem para o histórico de funções dos trabalhadores — não entram nos gráficos de produção." />
            </div>
            <div className="flex flex-wrap gap-2">
              {db.workAreas.map((a) => (
                <AreaSprite key={a.id} area={a} onClick={() => setFocus({ kind: 'area', id: a.id })} />
              ))}
              {db.workAreas.length === 0 && (
                <p className="text-sm text-muted-foreground">Sem áreas de apoio — cria uma no menu Dados.</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------ Equipas */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Boxes className="size-4.5 text-muted-foreground" />
                <h2 className="font-semibold">Equipas</h2>
                <span className="text-sm text-muted-foreground">({db.teams.length})</span>
                <InfoTip text="Cada equipa está associada a uma máquina, com o seu regime de turno. Clica para abrir a ficha da equipa. Criar/editar faz-se no menu Dados." />
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {db.teams.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda não há equipas — cria uma no menu Dados.</p>
              )}
              {db.teams.map((t) => {
                const members = db.workers.filter((w) => w.teamId === t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onOpenProfile({ kind: 'team', id: t.id })}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{t.name}</span>
                        <Badge variant="outline" className="gap-1">
                          <SectionDot id={t.sectionId} />
                          {machineName(db, t.machineId)}
                        </Badge>
                        <Badge variant="secondary" className="font-normal">
                          {teamRegimeLabel(t)}
                        </Badge>
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="size-3.5" />
                        {members.length === 0
                          ? 'Sem membros'
                          : members.map((mem) => workerLabel(mem)).join(', ')}
                      </p>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Trabalhadores */}
        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="size-4.5 text-muted-foreground" />
                <h2 className="font-semibold">Trabalhadores</h2>
                <span className="text-sm text-muted-foreground">({db.workers.length})</span>
                <InfoTip text="Todas as pessoas da secção de impressão. Clica para abrir a ficha. Criar/editar faz-se no menu Dados." />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {db.workers.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  <Input
                    value={workerQuery}
                    onChange={(e) => setWorkerQuery(e.target.value)}
                    placeholder="Pesquisar por nº ou nome…"
                    aria-label="Pesquisar trabalhadores"
                    className="max-w-xs"
                  />
                  <Select value={workerTeamFilter} onValueChange={setWorkerTeamFilter}>
                    <SelectTrigger className="w-[170px]" aria-label="Filtrar por equipa">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as equipas</SelectItem>
                      <SelectItem value={NONE}>Sem equipa</SelectItem>
                      {db.teams.map((tm) => (
                        <SelectItem key={tm.id} value={tm.id}>
                          {tm.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {db.workers.length === 0 && (
                <p className="text-sm text-muted-foreground">Ainda não há trabalhadores — cria um no menu Dados.</p>
              )}
              {filteredWorkers.length === 0 && db.workers.length > 0 && (
                <p className="text-sm text-muted-foreground">Nenhum trabalhador corresponde à pesquisa.</p>
              )}
              {filteredWorkers.length > 0 && filteredWorkers.length < db.workers.length && (
                <p className="text-xs text-muted-foreground">
                  A mostrar {filteredWorkers.length} de {db.workers.length}.
                </p>
              )}
              {filteredWorkers.map((wk) => {
                const age = ageFromBirth(wk.birthDate)
                const printMonths = printingMonths(wk)
                const teamMonths = currentTeamMonths(wk)
                return (
                  <button
                    key={wk.id}
                    type="button"
                    onClick={() => onOpenProfile({ kind: 'worker', id: wk.id })}
                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{workerLabel(wk)}</span>
                        {wk.role && (
                          <Badge variant="secondary" className="font-normal">
                            {wk.role}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                        <span>
                          Equipa: <span className="text-foreground">{teamName(db, wk.teamId)}</span>
                          {teamMonths > 0 && ` · há ${humanDuration(teamMonths)}`}
                        </span>
                        {wk.placeId && (
                          <span>
                            Local:{' '}
                            <span className="text-foreground">
                              {placeLabel(db, wk.placeKind ?? 'section', wk.placeId)}
                            </span>
                          </span>
                        )}
                        {age !== null && <span>{age} anos</span>}
                        {printMonths > 0 && <span>A imprimir há {humanDuration(printMonths)}</span>}
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zoom sobre uma unidade do mapa (informativo; edição no menu Dados) */}
      <Dialog open={focus !== null} onOpenChange={(o) => !o && setFocus(null)}>
        <DialogContent className="max-w-md">
          {focus?.kind === 'machine' &&
            (() => {
              const m = db.machines.find((x) => x.id === focus.id)
              if (!m) return null
              const teams = db.teams.filter((t) => t.machineId === m.id)
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <MachineSprite machine={m} big />
                      <div className="min-w-0">
                        <DialogTitle className="text-xl">{m.name}</DialogTitle>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="gap-1">
                            <SectionDot id={m.sectionId} />
                            {sectionName(db, m.sectionId)}
                          </Badge>
                          {m.status === 'discontinued' ? (
                            <Badge variant="destructive">Descontinuada</Badge>
                          ) : (
                            <Badge variant="secondary">Ativa</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <DialogDescription className="sr-only">
                      Detalhe da máquina {m.name}: equipas, turnos e ações.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      Equipas nesta máquina ({teams.length})
                      <InfoTip text="Clica numa equipa ou num trabalhador para abrir a ficha respetiva." />
                    </div>
                    {teams.length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem equipas associadas.</p>
                    )}
                    {teams.map((t) => {
                      const members = db.workers.filter((w) => w.teamId === t.id)
                      return (
                        <div key={t.id} className="rounded-lg border p-2.5">
                          <button
                            type="button"
                            className="flex w-full flex-wrap items-center gap-2 text-left"
                            onClick={() => {
                              setFocus(null)
                              onOpenProfile({ kind: 'team', id: t.id })
                            }}
                          >
                            <span className="text-sm font-medium hover:underline">{t.name}</span>
                            <Badge variant="secondary" className="font-normal">
                              {teamRegimeLabel(t)}
                            </Badge>
                          </button>
                          {members.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {members.map((w) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  className="rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted"
                                  onClick={() => {
                                    setFocus(null)
                                    onOpenProfile({ kind: 'worker', id: w.id })
                                  }}
                                >
                                  {workerLabel(w)}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <DialogFooter className="sm:justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFocus(null)
                        onOpenEditor({ kind: 'machine', id: m.id })
                      }}
                    >
                      <Pencil className="size-4" /> Editar nos Dados
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFocus(null)
                        onOpenProfile({ kind: 'machine', id: m.id })
                      }}
                    >
                      Ficha completa
                    </Button>
                  </DialogFooter>
                </>
              )
            })()}

          {focus?.kind === 'area' &&
            (() => {
              const a = db.workAreas.find((x) => x.id === focus.id)
              if (!a) return null
              const people = db.workers.filter((w) => w.placeKind === 'area' && w.placeId === a.id)
              return (
                <>
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <span className="flex size-14 items-center justify-center rounded-xl border bg-muted">
                        <SprayCan className="size-6 text-muted-foreground" />
                      </span>
                      <div>
                        <DialogTitle className="text-xl">{a.name}</DialogTitle>
                        <div className="mt-1.5">
                          <Badge variant="outline">Área de apoio · sem OF/RNC</Badge>
                        </div>
                      </div>
                    </div>
                    <DialogDescription>
                      {a.notes || 'Área de apoio à produção — serve para o histórico de funções dos trabalhadores.'}
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">A trabalhar aqui ({people.length})</div>
                    {people.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Ninguém com função atual nesta área.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {people.map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            className="rounded-full border px-2 py-0.5 text-xs transition-colors hover:bg-muted"
                            onClick={() => {
                              setFocus(null)
                              onOpenProfile({ kind: 'worker', id: w.id })
                            }}
                          >
                            {workerLabel(w)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFocus(null)
                        onOpenEditor({ kind: 'area', id: a.id })
                      }}
                    >
                      <Pencil className="size-4" /> Editar nos Dados
                    </Button>
                  </DialogFooter>
                </>
              )
            })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
