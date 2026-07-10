import { useMemo, useState } from 'react'
import {
  Boxes,
  Factory,
  Pencil,
  Plus,
  SprayCan,
  Trash2,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { ProfileTarget } from '@/views/Profiles'
import type {
  Db,
  Machine,
  PlaceKind,
  ShiftRegime,
  Team,
  WorkArea,
  Worker,
} from '@/lib/types'
import {
  ageFromBirth,
  currentTeamMonths,
  humanDuration,
  machineName,
  placeLabel,
  printingMonths,
  reconcileWorkerHistory,
  recordShift,
  SCHEDULE_OPTIONS,
  sectionName,
  SHIFT_HOURS,
  SHIFTS,
  teamAutoName,
  teamName,
  teamRegimeLabel,
  uid,
  workerLabel,
} from '@/lib/db'
import { SECTION_COLORS, sectionColor } from '@/lib/colors'

const NONE = '__none__'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

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

/** Linha de formulário: rótulo (com info opcional) + campo. */
function Field({
  label,
  info,
  children,
  hint,
}: {
  label: string
  info?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label}
        {info && <InfoTip text={info} />}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Cabeçalho de uma lista dentro de um separador. */
function ListHead({
  icon: Icon,
  title,
  info,
  count,
  onAdd,
  addLabel,
}: {
  icon: typeof Factory
  title: string
  info: string
  count: number
  onAdd: () => void
  addLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon className="size-4.5 text-muted-foreground" />
        <h2 className="font-semibold">{title}</h2>
        <span className="text-sm text-muted-foreground">({count})</span>
        <InfoTip text={info} />
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="size-4" /> {addLabel}
      </Button>
    </div>
  )
}

/** Botões de editar/apagar reutilizados em cada linha. */
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button variant="ghost" size="icon-sm" aria-label="Editar" onClick={onEdit}>
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Apagar"
        onClick={onDelete}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Formulários
// ---------------------------------------------------------------------------

function MachineForm({
  db,
  initial,
  onSave,
  onCancel,
}: {
  db: Db
  initial: Machine | null
  onSave: (m: Machine) => void
  onCancel: () => void
}) {
  const [m, setM] = useState<Machine>(
    initial
      ? clone(initial)
      : {
          id: '',
          name: '',
          sectionId: 'flexo',
          manufacturer: '',
          year: '',
          colors: '',
          width: '',
          status: 'active',
          statusNote: '',
          notes: '',
        },
  )
  const set = (patch: Partial<Machine>) => setM((prev) => ({ ...prev, ...patch }))
  const valid = m.name.trim().length > 0

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? 'Editar máquina' : 'Nova máquina'}</DialogTitle>
        <DialogDescription>
          Uma máquina de impressão produz trabalhos (OF) e defeitos (RNC).
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nome / código" info="Como a máquina é conhecida na fábrica (ex.: IF3, IR4).">
          <Input value={m.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: IF3" />
        </Field>
        <Field
          label="Tipo de impressão"
          info="A secção a que a máquina pertence: Flexografia, Rotogravura ou Offset."
        >
          <Select value={m.sectionId} onValueChange={(v) => set({ sectionId: v })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {db.sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Estado" info="Ativa = em uso. Descontinuada = já não produz, mas fica no histórico.">
          <Select value={m.status} onValueChange={(v) => set({ status: v as Machine['status'] })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="discontinued">Descontinuada</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {m.status === 'discontinued' && (
          <Field label="Nota do estado" info="Motivo ou observação sobre a descontinuação.">
            <Input
              value={m.statusNote ?? ''}
              onChange={(e) => set({ statusNote: e.target.value })}
              placeholder="Ex.: Máquina descontinuada"
            />
          </Field>
        )}
        <Field label="Fabricante">
          <Input value={m.manufacturer ?? ''} onChange={(e) => set({ manufacturer: e.target.value })} />
        </Field>
        <Field label="Ano">
          <Input value={m.year ?? ''} onChange={(e) => set({ year: e.target.value })} />
        </Field>
        <Field label="Nº de cores" info="Quantas cores a máquina consegue imprimir.">
          <Input value={m.colors ?? ''} onChange={(e) => set({ colors: e.target.value })} />
        </Field>
        <Field label="Largura" info="Largura máxima de impressão.">
          <Input value={m.width ?? ''} onChange={(e) => set({ width: e.target.value })} />
        </Field>
      </div>
      <Field label="Notas">
        <Textarea value={m.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!valid}
          onClick={() => onSave({ ...m, id: m.id || uid('maq'), name: m.name.trim() })}
        >
          Guardar
        </Button>
      </DialogFooter>
    </>
  )
}

function AreaForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: WorkArea | null
  onSave: (a: WorkArea) => void
  onCancel: () => void
}) {
  const [a, setA] = useState<WorkArea>(initial ? clone(initial) : { id: '', name: '', notes: '' })
  const valid = a.name.trim().length > 0
  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? 'Editar área de apoio' : 'Nova área de apoio'}</DialogTitle>
        <DialogDescription>
          Uma área de apoio (ex.: Montagem de Cilindros, Limpeza) não produz OF nem RNC — serve para
          o histórico de funções dos trabalhadores.
        </DialogDescription>
      </DialogHeader>
      <Field label="Nome">
        <Input value={a.name} onChange={(e) => setA({ ...a, name: e.target.value })} placeholder="Ex.: Montagem de Clichês" />
      </Field>
      <Field label="Notas">
        <Textarea value={a.notes ?? ''} onChange={(e) => setA({ ...a, notes: e.target.value })} />
      </Field>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={!valid} onClick={() => onSave({ ...a, id: a.id || uid('area'), name: a.name.trim() })}>
          Guardar
        </Button>
      </DialogFooter>
    </>
  )
}

function TeamForm({
  db,
  initial,
  onSave,
  onCancel,
}: {
  db: Db
  initial: Team | null
  onSave: (t: Team) => void
  onCancel: () => void
}) {
  const [t, setT] = useState<Team>(
    initial
      ? clone(initial)
      : { id: '', name: '', sectionId: '', machineId: '', regime: 'rot3', shift: '', schedule: '', members: [] },
  )
  // Horários disponíveis (geríveis em Configurações › Horários e Turnos).
  const scheduleOptions = db.settings?.schedules ?? [...SCHEDULE_OPTIONS]
  // Guarda se o horário está em modo "Outro" (escrito à mão).
  const [customSchedule, setCustomSchedule] = useState<boolean>(
    !!initial?.schedule && !scheduleOptions.includes(initial.schedule),
  )
  const set = (patch: Partial<Team>) => setT((prev) => ({ ...prev, ...patch }))

  // Ao escolher a máquina, deriva secção e sugere o nome automático.
  const onMachine = (machineId: string) => {
    const machine = db.machines.find((x) => x.id === machineId)
    const auto = teamAutoName(db, machineId)
    set({
      machineId,
      sectionId: machine?.sectionId ?? '',
      name: t.name.trim() ? t.name : auto,
    })
  }

  // Ao mudar o regime: se não é fixo, limpa turno e horário.
  const onRegime = (regime: ShiftRegime) => {
    if (regime === 'fixo') {
      const shift = t.shift || 'Manhã'
      set({ regime, shift, schedule: t.schedule || SHIFT_HOURS[shift] || '' })
    } else {
      set({ regime, shift: '', schedule: '' })
    }
  }
  // Ao escolher o turno fixo, sugere o horário correspondente (se ainda não for personalizado).
  const onFixedShift = (shift: string) => {
    if (customSchedule) set({ shift })
    else set({ shift, schedule: SHIFT_HOURS[shift] || '' })
  }

  const regime = t.regime || 'rot3'
  const valid = t.machineId !== '' && t.name.trim().length > 0

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? 'Editar equipa' : 'Nova equipa'}</DialogTitle>
        <DialogDescription>
          Uma equipa está associada a uma máquina. Os membros definem-se na ficha de cada trabalhador.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Máquina" info="A máquina onde esta equipa trabalha. Define também a secção.">
          <Select value={t.machineId || undefined} onValueChange={onMachine}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolher máquina" />
            </SelectTrigger>
            <SelectContent>
              {db.machines.map((mac) => (
                <SelectItem key={mac.id} value={mac.id}>
                  {mac.name} · {sectionName(db, mac.sectionId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Regime de turno"
          info="Como funciona o turno da equipa: rotativo pelos três turnos (M/T/N), rotativo por dois (M/T), ou fixo num turno só."
        >
          <Select value={regime} onValueChange={(v) => onRegime(v as ShiftRegime)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rot3">Rotativo M/T/N</SelectItem>
              <SelectItem value="rot2">Rotativo M/T</SelectItem>
              <SelectItem value="fixo">Fixo</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {regime === 'fixo' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Turno fixo" info="Qual o turno em que esta equipa trabalha sempre.">
            <Select value={t.shift || undefined} onValueChange={onFixedShift}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher turno" />
              </SelectTrigger>
              <SelectContent>
                {SHIFTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Horário" info="As horas do turno. Escolhe um horário da lista ou 'Outro' para escrever um diferente. Podes acrescentar ou editar os horários e turnos disponíveis em Configurações › Horários e Turnos.">
            <Select
              value={customSchedule ? '__custom__' : t.schedule || undefined}
              onValueChange={(v) => {
                if (v === '__custom__') {
                  setCustomSchedule(true)
                } else {
                  setCustomSchedule(false)
                  set({ schedule: v })
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher horário" />
              </SelectTrigger>
              <SelectContent>
                {scheduleOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value="__custom__">Outro…</SelectItem>
              </SelectContent>
            </Select>
            {customSchedule && (
              <Input
                className="mt-2"
                value={t.schedule ?? ''}
                onChange={(e) => set({ schedule: e.target.value })}
                placeholder="Ex.: 08:00–16:00"
              />
            )}
          </Field>
        </div>
      )}

      <Field label="Nome da equipa" info="Sugerido automaticamente a partir da máquina (ex.: E1 · IF4), mas podes mudar.">
        <Input value={t.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: E1 · IF4" />
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={!valid} onClick={() => onSave({ ...t, id: t.id || uid('eq'), name: t.name.trim() })}>
          Guardar
        </Button>
      </DialogFooter>
    </>
  )
}

function WorkerForm({
  db,
  initial,
  onSave,
  onCancel,
}: {
  db: Db
  initial: Worker | null
  onSave: (w: Worker) => void
  onCancel: () => void
}) {
  const [w, setW] = useState<Worker>(
    initial
      ? clone(initial)
      : {
          id: '',
          number: '',
          name: '',
          teamId: '',
          shift: 'Manhã',
          nationality: '',
          birthDate: '',
          yearsCompany: undefined,
          role: '',
          placeKind: 'section',
          placeId: 'flexo',
          roleHistory: [],
          teamHistory: [],
          notes: '',
        },
  )
  const set = (patch: Partial<Worker>) => setW((prev) => ({ ...prev, ...patch }))
  const valid = w.name.trim().length > 0

  const placeOptions =
    w.placeKind === 'machine'
      ? db.machines.map((x) => ({ id: x.id, label: x.name }))
      : w.placeKind === 'area'
        ? db.workAreas.map((x) => ({ id: x.id, label: x.name }))
        : db.sections.map((x) => ({ id: x.id, label: x.name }))

  const onPlaceKind = (kind: PlaceKind) => {
    const first =
      kind === 'machine' ? db.machines[0]?.id : kind === 'area' ? db.workAreas[0]?.id : db.sections[0]?.id
    set({ placeKind: kind, placeId: first ?? '' })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? 'Editar trabalhador' : 'Novo trabalhador'}</DialogTitle>
        <DialogDescription>
          Ao mudar a equipa ou a função, o histórico do trabalhador é atualizado automaticamente.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nº mecanográfico" info="O número de identificação do trabalhador na fábrica.">
          <Input value={w.number ?? ''} onChange={(e) => set({ number: e.target.value })} placeholder="Ex.: 2558" />
        </Field>
        <Field label="Nome">
          <Input value={w.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ex.: Saulo Ferreira" />
        </Field>
        <Field label="Data de nascimento" info="A idade é calculada a partir daqui — não precisa de ser atualizada todos os anos.">
          <Input type="date" value={w.birthDate ?? ''} onChange={(e) => set({ birthDate: e.target.value })} />
        </Field>
        <Field label="Nacionalidade">
          <Input value={w.nationality ?? ''} onChange={(e) => set({ nationality: e.target.value })} />
        </Field>
        <Field label="Anos na empresa" info="Há quantos anos trabalha na fábrica (em qualquer função).">
          <Input
            type="number"
            min={0}
            value={w.yearsCompany ?? ''}
            onChange={(e) => set({ yearsCompany: e.target.value === '' ? undefined : Number(e.target.value) })}
          />
        </Field>
        <Field label="Equipa atual" info="A equipa onde está agora. Mudar aqui fecha a anterior e abre uma nova no histórico.">
          <Select
            value={w.teamId || NONE}
            onValueChange={(v) => set({ teamId: v === NONE ? '' : v })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sem equipa</SelectItem>
              {db.teams.map((tm) => (
                <SelectItem key={tm.id} value={tm.id}>
                  {tm.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Turno" info="Manhã, Tarde ou Noite.">
          <Select value={w.shift || undefined} onValueChange={(v) => set({ shift: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolher turno" />
            </SelectTrigger>
            <SelectContent>
              {SHIFTS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Função / categoria" info="A função que desempenha (ex.: Impressor, Chefe de Equipa, Montador).">
          <Input value={w.role ?? ''} onChange={(e) => set({ role: e.target.value })} placeholder="Ex.: Impressor" />
        </Field>
        <Field label="Onde (tipo)" info="Onde desempenha a função: numa secção de impressão, numa máquina específica, ou numa área de apoio.">
          <Select value={w.placeKind ?? 'section'} onValueChange={(v) => onPlaceKind(v as PlaceKind)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="section">Secção de impressão</SelectItem>
              <SelectItem value="machine">Máquina</SelectItem>
              <SelectItem value="area">Área de apoio</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="Onde (local)">
          <Select value={w.placeId || undefined} onValueChange={(v) => set({ placeId: v })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Escolher" />
            </SelectTrigger>
            <SelectContent>
              {placeOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Notas">
        <Textarea value={w.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </Field>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!valid}
          onClick={() => {
            const base: Worker = { ...w, id: w.id || uid('trab'), name: w.name.trim() }
            onSave(reconcileWorkerHistory(initial ?? undefined, base))
          }}
        >
          Guardar
        </Button>
      </DialogFooter>
    </>
  )
}

// ---------------------------------------------------------------------------
// Ecrã principal
// ---------------------------------------------------------------------------

type Editing =
  | { kind: 'machine'; value: Machine | null }
  | { kind: 'area'; value: WorkArea | null }
  | { kind: 'team'; value: Team | null }
  | { kind: 'worker'; value: Worker | null }
  | null

interface PendingDelete {
  title: string
  description: string
  action: () => void
}

export function Structure({
  db,
  onChange,
  onOpenProfile,
}: {
  db: Db
  onChange: (db: Db) => void
  onOpenProfile: (t: ProfileTarget) => void
}) {
  const [editing, setEditing] = useState<Editing>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  // Unidade "focada" no mapa (zoom sobre uma máquina ou área).
  const [focus, setFocus] = useState<{ kind: 'machine' | 'area'; id: string } | null>(null)
  // Pesquisa e filtro no separador Trabalhadores (essenciais com centenas de fichas).
  const [workerQuery, setWorkerQuery] = useState('')
  const [workerTeamFilter, setWorkerTeamFilter] = useState<string>('all')

  const mutate = (fn: (d: Db) => void) => {
    const next = clone(db)
    fn(next)
    onChange(next)
  }

  const membersOf = (teamId: string) => db.workers.filter((x) => x.teamId === teamId)

  const filteredWorkers = useMemo(() => {
    const q = workerQuery.trim().toLowerCase()
    return db.workers.filter((w) => {
      if (workerTeamFilter === NONE && w.teamId) return false
      if (workerTeamFilter !== 'all' && workerTeamFilter !== NONE && w.teamId !== workerTeamFilter) return false
      if (!q) return true
      return w.name.toLowerCase().includes(q) || (w.number || '').toLowerCase().includes(q)
    })
  }, [db.workers, workerQuery, workerTeamFilter])

  // Distribuição de turnos de uma equipa, a partir dos registos de produção.
  const teamShiftCounts = useMemo(() => {
    return (teamId: string) => {
      const counts: Record<string, number> = {}
      db.productionRecords
        .filter((r) => r.teamId === teamId)
        .forEach((r) => {
          const s = recordShift(db, r)
          counts[s] = (counts[s] ?? 0) + 1
        })
      return counts
    }
  }, [db])

  const close = () => setEditing(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Estrutura</h1>
        <p className="text-sm text-muted-foreground">
          As bases da fábrica: máquinas e áreas, equipas e trabalhadores. Passa o cursor sobre o ícone{' '}
          <span className="inline-flex align-middle">
            <InfoTip text="Cada dado explica-se a si próprio ao passares o cursor por cima." />
          </span>{' '}
          para perceber cada campo.
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

        {/* ------------------------------------------------ Máquinas e Áreas (mapa) */}
        <TabsContent value="machines" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Factory className="size-4.5 text-muted-foreground" />
              <h2 className="font-semibold">Mapa da fábrica</h2>
              <InfoTip text="A fábrica vista de cima: cada máquina é uma unidade no mapa, com a luz verde a pulsar quando está ativa (vermelha = descontinuada). Clica numa máquina ou área para fazer zoom e ver as equipas, turnos e detalhes." />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing({ kind: 'area', value: null })}>
                <Plus className="size-4" /> Nova área
              </Button>
              <Button size="sm" onClick={() => setEditing({ kind: 'machine', value: null })}>
                <Plus className="size-4" /> Nova máquina
              </Button>
            </div>
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
                <p className="text-sm text-muted-foreground">Sem áreas de apoio — cria uma em "Nova área".</p>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ------------------------------------------------ Equipas */}
        <TabsContent value="teams">
          <Card>
            <CardHeader>
              <ListHead
                icon={Boxes}
                title="Equipas"
                info="Cada equipa está associada a uma máquina. Os membros vêm da ficha de cada trabalhador. A distribuição de turnos mostra quantas vezes a equipa esteve em cada turno (a partir dos registos de produção)."
                count={db.teams.length}
                addLabel="Nova equipa"
                onAdd={() => setEditing({ kind: 'team', value: null })}
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {db.teams.map((t) => {
                const members = membersOf(t.id)
                const counts = teamShiftCounts(t.id)
                const totalShifts = SHIFTS.reduce((a, s) => a + (counts[s] ?? 0), 0)
                return (
                  <div key={t.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="outline" className="gap-1">
                            <SectionDot id={t.sectionId} />
                            {machineName(db, t.machineId)}
                          </Badge>
                          <Badge
                            variant={(t.regime || 'rot3') === 'fixo' ? 'secondary' : 'outline'}
                            className="gap-1 font-normal"
                          >
                            {teamRegimeLabel(t)}
                            <InfoTip
                              text={
                                (t.regime || 'rot3') === 'fixo'
                                  ? 'Esta equipa trabalha sempre no mesmo turno e horário.'
                                  : 'Turno rotativo: a equipa vai passando pelos turnos. A distribuição em baixo mostra quantas vezes esteve em cada um.'
                              }
                            />
                          </Badge>
                        </div>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="size-3.5" />
                          {members.length === 0
                            ? 'Sem membros'
                            : members.map((mem) => workerLabel(mem)).join(', ')}
                        </p>
                      </div>
                      <RowActions
                        onEdit={() => setEditing({ kind: 'team', value: t })}
                        onDelete={() =>
                          setPendingDelete({
                            title: `Apagar a equipa ${t.name}?`,
                            description: 'Os trabalhadores desta equipa ficam sem equipa (o histórico deles mantém-se).',
                            action: () =>
                              mutate((d) => {
                                d.teams = d.teams.filter((x) => x.id !== t.id)
                                d.workers.forEach((wk) => {
                                  if (wk.teamId === t.id) wk.teamId = ''
                                })
                              }),
                          })
                        }
                      />
                    </div>

                    {/* distribuição de turnos */}
                    <div className="mt-3">
                      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        Turnos já cumpridos
                        <InfoTip text="Quantos meses de produção esta equipa registou em cada turno. Os turnos rodam, por isso mostra o histórico real, não só o turno base." />
                      </div>
                      {totalShifts === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Ainda sem registos de produção associados a esta equipa.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {SHIFTS.map((s) => {
                            const c = counts[s] ?? 0
                            return (
                              <span
                                key={s}
                                className={`rounded-md border px-2 py-1 text-xs tabular-nums ${
                                  c === 0 ? 'text-muted-foreground' : 'font-medium'
                                }`}
                              >
                                {s}: {c}
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------ Trabalhadores */}
        <TabsContent value="workers">
          <Card>
            <CardHeader>
              <ListHead
                icon={Users}
                title="Trabalhadores"
                info="Todas as pessoas da secção de impressão. Cada uma tem equipa, função e um histórico que se atualiza sozinho quando muda de equipa ou função."
                count={db.workers.length}
                addLabel="Novo trabalhador"
                onAdd={() => setEditing({ kind: 'worker', value: null })}
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Pesquisa + filtro por equipa */}
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
                <p className="text-sm text-muted-foreground">Ainda não há trabalhadores.</p>
              )}
              {filteredWorkers.length === 0 && db.workers.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum trabalhador corresponde à pesquisa.
                </p>
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
                  <div key={wk.id} className="rounded-lg border p-3">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{workerLabel(wk)}</span>
                          {wk.role && (
                            <Badge variant="secondary" className="font-normal">
                              {wk.role}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            Equipa: <span className="text-foreground">{teamName(db, wk.teamId)}</span>
                            {teamMonths > 0 && (
                              <span className="text-xs">· há {humanDuration(teamMonths)}</span>
                            )}
                          </span>
                          {wk.placeId && (
                            <span>
                              Local:{' '}
                              <span className="text-foreground">
                                {placeLabel(db, wk.placeKind ?? 'section', wk.placeId)}
                              </span>
                            </span>
                          )}
                          {age !== null && (
                            <span className="flex items-center gap-1">
                              {age} anos
                              <InfoTip text="Idade calculada a partir da data de nascimento." />
                            </span>
                          )}
                          {printMonths > 0 && (
                            <span className="flex items-center gap-1">
                              A imprimir há {humanDuration(printMonths)}
                              <InfoTip text="Tempo total em funções de impressão (secções ou máquinas), somando o histórico." />
                            </span>
                          )}
                        </div>
                      </div>
                      <RowActions
                        onEdit={() => setEditing({ kind: 'worker', value: wk })}
                        onDelete={() =>
                          setPendingDelete({
                            title: `Apagar ${workerLabel(wk)}?`,
                            description: 'A ficha e o histórico deste trabalhador são apagados deste dispositivo.',
                            action: () =>
                              mutate((d) => {
                                d.workers = d.workers.filter((x) => x.id !== wk.id)
                                d.teams.forEach((tm) => {
                                  tm.members = (tm.members || []).filter((id) => id !== wk.id)
                                })
                              }),
                          })
                        }
                      />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Zoom sobre uma unidade do mapa (máquina ou área) */}
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
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setFocus(null)
                          setEditing({ kind: 'machine', value: m })
                        }}
                      >
                        <Pencil className="size-4" /> Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setFocus(null)
                          setPendingDelete({
                            title: `Apagar a máquina ${m.name}?`,
                            description:
                              'Os registos de produção desta máquina não são apagados — só a ficha da máquina.',
                            action: () => mutate((d) => { d.machines = d.machines.filter((x) => x.id !== m.id) }),
                          })
                        }}
                      >
                        <Trash2 className="size-4" /> Apagar
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setFocus(null)
                        onOpenProfile({ kind: 'machine', id: m.id })
                      }}
                    >
                      Detalhes — ficha completa
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
                      <p className="text-sm text-muted-foreground">
                        Ninguém com função atual nesta área.
                      </p>
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
                        setEditing({ kind: 'area', value: a })
                      }}
                    >
                      <Pencil className="size-4" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setFocus(null)
                        setPendingDelete({
                          title: `Apagar a área ${a.name}?`,
                          description: 'O histórico de funções dos trabalhadores que lá passaram mantém-se.',
                          action: () => mutate((d) => { d.workAreas = d.workAreas.filter((x) => x.id !== a.id) }),
                        })
                      }}
                    >
                      <Trash2 className="size-4" /> Apagar
                    </Button>
                  </DialogFooter>
                </>
              )
            })()}
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição/criação */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          {editing?.kind === 'machine' && (
            <MachineForm
              db={db}
              initial={editing.value}
              onCancel={close}
              onSave={(m) => {
                mutate((d) => {
                  const i = d.machines.findIndex((x) => x.id === m.id)
                  if (i >= 0) d.machines[i] = m
                  else d.machines.push(m)
                })
                close()
              }}
            />
          )}
          {editing?.kind === 'area' && (
            <AreaForm
              initial={editing.value}
              onCancel={close}
              onSave={(a) => {
                mutate((d) => {
                  const i = d.workAreas.findIndex((x) => x.id === a.id)
                  if (i >= 0) d.workAreas[i] = a
                  else d.workAreas.push(a)
                })
                close()
              }}
            />
          )}
          {editing?.kind === 'team' && (
            <TeamForm
              db={db}
              initial={editing.value}
              onCancel={close}
              onSave={(t) => {
                mutate((d) => {
                  const i = d.teams.findIndex((x) => x.id === t.id)
                  if (i >= 0) d.teams[i] = t
                  else d.teams.push(t)
                })
                close()
              }}
            />
          )}
          {editing?.kind === 'worker' && (
            <WorkerForm
              db={db}
              initial={editing.value}
              onCancel={close}
              onSave={(w) => {
                mutate((d) => {
                  const i = d.workers.findIndex((x) => x.id === w.id)
                  if (i >= 0) d.workers[i] = w
                  else d.workers.push(w)
                })
                close()
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title ?? ''}
        description={pendingDelete?.description ?? ''}
        confirmLabel="Apagar"
        destructive
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          pendingDelete?.action()
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
