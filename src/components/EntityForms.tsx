// Formulários de criação/edição das entidades da fábrica.
// Usados APENAS no ecrã Dados — os outros ecrãs são informativos.
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
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
  reconcileWorkerHistory,
  SCHEDULE_OPTIONS,
  sectionName,
  SHIFT_HOURS,
  SHIFTS,
  teamAutoName,
  uid,
} from '@/lib/db'

const NONE = '__none__'

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/** Linha de formulário: rótulo (com info opcional) + campo. */
export function Field({
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
export function MachineForm({
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

export function AreaForm({
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

export function TeamForm({
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

export function WorkerForm({
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
