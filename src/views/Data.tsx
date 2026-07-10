import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive as ArchiveIcon,
  Boxes,
  ClipboardList,
  Download,
  Factory,
  History,
  Pencil,
  Plus,
  SprayCan,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { ChangeLogList } from '@/components/ChangeLogList'
import { AreaForm, MachineForm, TeamForm, WorkerForm } from '@/components/EntityForms'
import type { Db, Machine, ProductionRecord, Team, WorkArea, Worker } from '@/lib/types'
import {
  areaFieldSpecs,
  diffFields,
  exportDb,
  fmtDateTime,
  getArchives,
  importDb,
  logChange,
  machineFieldSpecs,
  machineName,
  MONTHS,
  n,
  recordFieldSpecs,
  restoreArchive,
  sectionName,
  teamFieldSpecs,
  teamName,
  teamRegimeLabel,
  uid,
  workerFieldSpecs,
  workerLabel,
} from '@/lib/db'
import { sectionColor } from '@/lib/colors'

/** Pedido de edição vindo de outro ecrã (ex.: botão "Editar" numa ficha). id null = criar novo. */
export type EditTarget = {
  kind: 'machine' | 'area' | 'team' | 'worker' | 'record'
  id: string | null
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v))
}

/** Rótulo de um registo para o histórico (ex.: "IF3 · Junho 2026"). */
function recordLabel(db: Db, r: ProductionRecord): string {
  return `${machineName(db, r.machineId)} · ${MONTHS[r.month]} ${r.year}`
}

// ---------------------------------------------------------------------------
// Relatório mensal (o papel que costumam fornecer: OF + RNC por máquina)
// ---------------------------------------------------------------------------

function MonthlyReport({ db, onChange }: { db: Db; onChange: (db: Db) => void }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [saved, setSaved] = useState<string | null>(null)

  // Valores da grelha: texto para permitir campos vazios ("não mexer").
  const init = useMemo(() => {
    const vals: Record<string, { of: string; rnc: string }> = {}
    db.machines.forEach((m) => {
      const existing = db.productionRecords.filter(
        (r) => r.machineId === m.id && r.year === year && r.month === month,
      )
      if (existing.length === 1) {
        vals[m.id] = { of: String(existing[0].jobs), rnc: String(existing[0].rnc) }
      } else {
        vals[m.id] = { of: '', rnc: '' }
      }
    })
    return vals
  }, [db, year, month])
  const [vals, setVals] = useState(init)
  // Reinicia a grelha quando o mês/ano muda (via key no render, mais simples: sync manual)
  const [lastKey, setLastKey] = useState(`${year}-${month}`)
  if (lastKey !== `${year}-${month}`) {
    setLastKey(`${year}-${month}`)
    setVals(init)
    setSaved(null)
  }

  const multiRecord = (machineId: string) =>
    db.productionRecords.filter((r) => r.machineId === machineId && r.year === year && r.month === month)
      .length > 1

  const save = () => {
    const next = clone(db)
    let created = 0
    let edited = 0
    db.machines.forEach((m) => {
      const v = vals[m.id]
      if (!v) return
      const ofStr = v.of.trim()
      const rncStr = v.rnc.trim()
      if (ofStr === '' && rncStr === '') return
      if (multiRecord(m.id)) return
      const jobs = Math.max(0, n(ofStr))
      const rnc = Math.max(0, n(rncStr))
      const existing = next.productionRecords.find(
        (r) => r.machineId === m.id && r.year === year && r.month === month,
      )
      if (existing) {
        const changes = diffFields(existing as unknown as Record<string, unknown>, { ...existing, jobs, rnc }, recordFieldSpecs())
        if (changes.length === 0) return
        existing.jobs = jobs
        existing.rnc = rnc
        logChange(next, {
          entity: 'record', entityId: existing.id,
          entityLabel: recordLabel(db, existing), action: 'edit', changes,
        })
        edited++
      } else {
        const rec: ProductionRecord = {
          id: uid('reg'), year, month, sectionId: m.sectionId, machineId: m.id,
          teamId: '', shift: '', workerIds: [], jobs, rnc, cause: '',
          notes: 'Lançado pelo relatório mensal',
        }
        next.productionRecords.push(rec)
        logChange(next, {
          entity: 'record', entityId: rec.id,
          entityLabel: recordLabel(db, rec), action: 'create',
          changes: [
            { field: 'OF', from: '—', to: String(jobs) },
            { field: 'RNC', from: '—', to: String(rnc) },
          ],
        })
        created++
      }
    })
    if (created === 0 && edited === 0) {
      setSaved('Nada para guardar — nenhum valor novo ou alterado.')
      return
    }
    onChange(next)
    setSaved(
      `Guardado: ${created ? `${created} ${created === 1 ? 'registo novo' : 'registos novos'}` : ''}${created && edited ? ' e ' : ''}${edited ? `${edited} ${edited === 1 ? 'registo atualizado' : 'registos atualizados'}` : ''} em ${MONTHS[month]} ${year}.`,
    )
  }

  const years = [...new Set([...db.productionRecords.map((r) => r.year), now.getFullYear()])].sort(
    (a, b) => b - a,
  )

  return (
    <Card className="omp-card-hover">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <ClipboardList className="size-4.5 text-muted-foreground" />
          Lançar relatório mensal
          <InfoTip text="O relatório que costumam fornecer: nº de OF e de RNC do mês, por máquina. Preenche a grelha e guarda tudo de uma vez. Campos vazios ficam como estão. Se o mês já tiver valores, aparecem pré-preenchidos e podes corrigi-los." />
        </CardTitle>
        <div className="flex flex-wrap gap-2 pt-1">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-[140px]" aria-label="Mês do relatório">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={m} value={String(i)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-[100px]" aria-label="Ano do relatório">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[430px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2 font-medium">Máquina</th>
                <th className="w-28 py-2 pr-2 font-medium">
                  <span className="flex items-center gap-1">
                    OF <InfoTip text="Ordens de Fabrico: trabalhos produzidos nesse mês por esta máquina." />
                  </span>
                </th>
                <th className="w-28 py-2 font-medium">
                  <span className="flex items-center gap-1">
                    RNC <InfoTip text="Registos de Não Conformidade: defeitos desse mês nesta máquina." />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {db.machines.map((m) => {
                const multi = multiRecord(m.id)
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 shrink-0 rounded-full" style={{ background: sectionColor(m.sectionId) }} />
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-muted-foreground">{sectionName(db, m.sectionId)}</span>
                        {m.status === 'discontinued' && (
                          <Badge variant="destructive" className="text-[9px]">descontinuada</Badge>
                        )}
                      </span>
                    </td>
                    {multi ? (
                      <td colSpan={2} className="py-2 text-xs text-muted-foreground">
                        Este mês tem vários registos — edita-os na lista em baixo.
                      </td>
                    ) : (
                      <>
                        <td className="py-2 pr-2">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={vals[m.id]?.of ?? ''}
                            onChange={(e) =>
                              setVals((prev) => ({ ...prev, [m.id]: { ...prev[m.id], of: e.target.value } }))
                            }
                            aria-label={`OF de ${m.name}`}
                            className="h-8"
                          />
                        </td>
                        <td className="py-2">
                          <Input
                            type="number"
                            min={0}
                            inputMode="numeric"
                            value={vals[m.id]?.rnc ?? ''}
                            onChange={(e) =>
                              setVals((prev) => ({ ...prev, [m.id]: { ...prev[m.id], rnc: e.target.value } }))
                            }
                            aria-label={`RNC de ${m.name}`}
                            className="h-8"
                          />
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save}>Guardar relatório de {MONTHS[month]}</Button>
          {saved && <p className="text-sm text-muted-foreground">{saved}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Registos individuais
// ---------------------------------------------------------------------------

function RecordForm({
  db,
  initial,
  onSave,
  onCancel,
}: {
  db: Db
  initial: ProductionRecord | null
  onSave: (r: ProductionRecord) => void
  onCancel: () => void
}) {
  const now = new Date()
  const [r, setR] = useState<ProductionRecord>(
    initial
      ? clone(initial)
      : {
          id: '', year: now.getFullYear(), month: now.getMonth(),
          sectionId: db.machines[0]?.sectionId ?? 'flexo', machineId: db.machines[0]?.id ?? '',
          teamId: '', shift: '', workerIds: [], jobs: 0, rnc: 0, cause: '', notes: '',
        },
  )
  const set = (patch: Partial<ProductionRecord>) => setR((prev) => ({ ...prev, ...patch }))
  const valid = r.machineId !== ''

  return (
    <>
      <DialogHeader>
        <DialogTitle>{initial ? 'Editar registo' : 'Novo registo de produção'}</DialogTitle>
        <DialogDescription>
          {initial
            ? `${machineName(db, r.machineId)} · ${MONTHS[r.month]} ${r.year}`
            : 'Um registo = uma máquina num mês, com as OF e os RNC.'}
        </DialogDescription>
      </DialogHeader>

      {!initial && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Máquina</Label>
            <Select
              value={r.machineId || undefined}
              onValueChange={(v) => {
                const m = db.machines.find((x) => x.id === v)
                set({ machineId: v, sectionId: m?.sectionId ?? r.sectionId })
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolher" />
              </SelectTrigger>
              <SelectContent>
                {db.machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mês</Label>
            <Select value={String(r.month)} onValueChange={(v) => set({ month: Number(v) })}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input
              type="number"
              value={r.year}
              onChange={(e) => set({ year: Number(e.target.value) || r.year })}
            />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>
            OF / trabalhos <InfoTip text="Ordens de Fabrico produzidas." />
          </Label>
          <Input type="number" min={0} value={r.jobs} onChange={(e) => set({ jobs: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
        <div className="space-y-1.5">
          <Label>
            RNC / defeitos <InfoTip text="Registos de Não Conformidade." />
          </Label>
          <Input type="number" min={0} value={r.rnc} onChange={(e) => set({ rnc: Math.max(0, Number(e.target.value) || 0) })} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>
          Causa <InfoTip text="A causa principal dos RNC (ex.: Limpeza, Cor, Registo). Registar causas permite no futuro a análise de Pareto." />
        </Label>
        <Input value={r.cause ?? ''} onChange={(e) => set({ cause: e.target.value })} placeholder="Ex.: Limpeza" />
      </div>
      <div className="space-y-1.5">
        <Label>Observações</Label>
        <Textarea value={r.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button disabled={!valid} onClick={() => onSave({ ...r, id: r.id || uid('reg') })}>
          Guardar
        </Button>
      </DialogFooter>
    </>
  )
}

// ---------------------------------------------------------------------------
// Ecrã Dados
// ---------------------------------------------------------------------------

type EditingEntity =
  | { kind: 'machine'; value: Machine | null }
  | { kind: 'area'; value: WorkArea | null }
  | { kind: 'team'; value: Team | null }
  | { kind: 'worker'; value: Worker | null }
  | null

export function Data({
  db,
  onChange,
  onReload,
  editTarget,
  onConsumeEdit,
}: {
  db: Db
  onChange: (db: Db) => void
  onReload: () => void
  /** Pedido de edição vindo de outro ecrã (botão "Editar" numa ficha). */
  editTarget: EditTarget | null
  onConsumeEdit: () => void
}) {
  const [editingRecord, setEditingRecord] = useState<ProductionRecord | null | 'new'>(null)
  const [editingEntity, setEditingEntity] = useState<EditingEntity>(null)
  const [pendingDelete, setPendingDelete] = useState<{ title: string; description: string; action: () => void } | null>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const archives = getArchives()

  const mutate = (fn: (d: Db) => void) => {
    const next = clone(db)
    fn(next)
    onChange(next)
  }

  // Abre o formulário certo quando outro ecrã pede uma edição (ex.: "Editar" numa ficha).
  useEffect(() => {
    if (!editTarget) return
    if (editTarget.kind === 'record') {
      const r = editTarget.id ? db.productionRecords.find((x) => x.id === editTarget.id) : null
      setEditingRecord(r ?? 'new')
    } else if (editTarget.kind === 'machine') {
      setEditingEntity({ kind: 'machine', value: editTarget.id ? db.machines.find((x) => x.id === editTarget.id) ?? null : null })
    } else if (editTarget.kind === 'area') {
      setEditingEntity({ kind: 'area', value: editTarget.id ? db.workAreas.find((x) => x.id === editTarget.id) ?? null : null })
    } else if (editTarget.kind === 'team') {
      setEditingEntity({ kind: 'team', value: editTarget.id ? db.teams.find((x) => x.id === editTarget.id) ?? null : null })
    } else if (editTarget.kind === 'worker') {
      setEditingEntity({ kind: 'worker', value: editTarget.id ? db.workers.find((x) => x.id === editTarget.id) ?? null : null })
    }
    onConsumeEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTarget])

  // Registos agrupados por mês (mais recente primeiro).
  const groups = useMemo(() => {
    const map = new Map<number, ProductionRecord[]>()
    db.productionRecords.forEach((r) => {
      const k = r.year * 12 + r.month
      map.set(k, [...(map.get(k) ?? []), r])
    })
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([k, recs]) => ({
        key: k,
        label: `${MONTHS[((k % 12) + 12) % 12]} ${Math.floor(k / 12)}`,
        recs: recs.sort((a, b) => a.machineId.localeCompare(b.machineId)),
      }))
  }, [db.productionRecords])

  const doExport = () => {
    const data = exportDb()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const d = new Date()
    a.download = `obania-metrics-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const doImport = async (file: File) => {
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      importDb(payload)
      onReload()
      setImportMsg(`Importado com sucesso: ${file.name}. A versão anterior ficou nos arquivos automáticos.`)
    } catch (err) {
      setImportMsg(`Não consegui importar: ${err instanceof Error ? err.message : 'ficheiro inválido'}.`)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Dados</h1>
        <p className="text-sm text-muted-foreground">
          Tudo o que entra e sai da app: o relatório mensal, os registos individuais, as cópias de
          segurança e o histórico de quem mudou o quê.
        </p>
      </div>

      <MonthlyReport db={db} onChange={onChange} />

      {/* Registos individuais */}
      <Card className="omp-card-hover">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Factory className="size-4.5 text-muted-foreground" />
              Registos de não conformidade ({db.productionRecords.length})
              <InfoTip text="Os registos de OF e RNC já colocados no sistema, mês a mês. Clica num registo para ver e editar (OF, RNC, causa, observações), ou cria um novo." />
            </CardTitle>
            <Button size="sm" onClick={() => setEditingRecord('new')}>
              <Plus className="size-4" /> Novo registo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 && <p className="text-sm text-muted-foreground">Ainda não há registos.</p>}
          {groups.map((g) => (
            <div key={g.key}>
              <div className="mb-1.5 text-sm font-medium">{g.label}</div>
              <div className="space-y-1.5">
                {g.recs.map((r) => (
                  <div
                    key={r.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingRecord(r)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingRecord(r)}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors hover:bg-muted"
                    aria-label={`Ver ou editar o registo ${machineName(db, r.machineId)} de ${MONTHS[r.month]} ${r.year}`}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: sectionColor(r.sectionId) }} />
                    <span className="w-12 font-medium">{machineName(db, r.machineId)}</span>
                    <span className="tabular-nums">{r.jobs} OF</span>
                    <span className="tabular-nums text-muted-foreground">·</span>
                    <span className="tabular-nums">{r.rnc} RNC</span>
                    {r.cause && <Badge variant="outline" className="font-normal">{r.cause}</Badge>}
                    <span className="ml-auto flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon-sm" aria-label="Editar registo" onClick={() => setEditingRecord(r)}>
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Apagar registo"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setPendingDelete({
                            title: `Apagar o registo ${recordLabel(db, r)}?`,
                            description: `${r.jobs} OF e ${r.rnc} RNC deixam de contar nos gráficos. Fica registado no histórico.`,
                            action: () =>
                              mutate((d) => {
                                d.productionRecords = d.productionRecords.filter((x) => x.id !== r.id)
                                logChange(d, {
                                  entity: 'record', entityId: r.id,
                                  entityLabel: recordLabel(db, r), action: 'delete',
                                })
                              }),
                          })
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fichas: criar e editar máquinas, áreas, equipas e trabalhadores */}
      <Card className="omp-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Pencil className="size-4.5 text-muted-foreground" />
            Fichas — criar e editar
            <InfoTip text="O único sítio onde se criam e editam máquinas, áreas, equipas e trabalhadores. Os outros ecrãs (Estrutura, Fichas) são de consulta e atualizam-se automaticamente com o que fizeres aqui. Cada alteração fica no histórico." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="machines">
            <TabsList className="w-full">
              <TabsTrigger value="machines">
                <Factory className="size-4" /> Máquinas
              </TabsTrigger>
              <TabsTrigger value="areas">
                <SprayCan className="size-4" /> Áreas
              </TabsTrigger>
              <TabsTrigger value="teams">
                <Boxes className="size-4" /> Equipas
              </TabsTrigger>
              <TabsTrigger value="workers">
                <Users className="size-4" /> Trabalhadores
              </TabsTrigger>
            </TabsList>

            <TabsContent value="machines" className="space-y-1.5">
              <Button size="sm" className="mb-1" onClick={() => setEditingEntity({ kind: 'machine', value: null })}>
                <Plus className="size-4" /> Nova máquina
              </Button>
              {db.machines.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: sectionColor(m.sectionId) }} />
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-muted-foreground">{sectionName(db, m.sectionId)}</span>
                  {m.status === 'discontinued' && (
                    <Badge variant="destructive" className="text-[9px]">descontinuada</Badge>
                  )}
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${m.name}`} onClick={() => setEditingEntity({ kind: 'machine', value: m })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" aria-label={`Apagar ${m.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingDelete({
                          title: `Apagar a máquina ${m.name}?`,
                          description: 'Os registos de produção desta máquina não são apagados — só a ficha da máquina.',
                          action: () =>
                            mutate((d) => {
                              d.machines = d.machines.filter((x) => x.id !== m.id)
                              logChange(d, { entity: 'machine', entityId: m.id, entityLabel: m.name, action: 'delete' })
                            }),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="areas" className="space-y-1.5">
              <Button size="sm" className="mb-1" onClick={() => setEditingEntity({ kind: 'area', value: null })}>
                <Plus className="size-4" /> Nova área
              </Button>
              {db.workAreas.map((a) => (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <SprayCan className="size-4 shrink-0 text-muted-foreground" />
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="outline" className="text-[9px]">Apoio</Badge>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${a.name}`} onClick={() => setEditingEntity({ kind: 'area', value: a })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" aria-label={`Apagar ${a.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingDelete({
                          title: `Apagar a área ${a.name}?`,
                          description: 'O histórico de funções dos trabalhadores que lá passaram mantém-se.',
                          action: () =>
                            mutate((d) => {
                              d.workAreas = d.workAreas.filter((x) => x.id !== a.id)
                              logChange(d, { entity: 'area', entityId: a.id, entityLabel: a.name, action: 'delete' })
                            }),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="teams" className="space-y-1.5">
              <Button size="sm" className="mb-1" onClick={() => setEditingEntity({ kind: 'team', value: null })}>
                <Plus className="size-4" /> Nova equipa
              </Button>
              {db.teams.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {machineName(db, t.machineId)} · {teamRegimeLabel(t)}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${t.name}`} onClick={() => setEditingEntity({ kind: 'team', value: t })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" aria-label={`Apagar ${t.name}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingDelete({
                          title: `Apagar a equipa ${t.name}?`,
                          description: 'Os trabalhadores desta equipa ficam sem equipa (o histórico deles mantém-se).',
                          action: () =>
                            mutate((d) => {
                              d.teams = d.teams.filter((x) => x.id !== t.id)
                              d.workers.forEach((wk) => {
                                if (wk.teamId === t.id) wk.teamId = ''
                              })
                              logChange(d, { entity: 'team', entityId: t.id, entityLabel: t.name, action: 'delete' })
                            }),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="workers" className="space-y-1.5">
              <Button size="sm" className="mb-1" onClick={() => setEditingEntity({ kind: 'worker', value: null })}>
                <Plus className="size-4" /> Novo trabalhador
              </Button>
              {db.workers.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                  <span className="font-medium">{workerLabel(w)}</span>
                  <span className="text-xs text-muted-foreground">
                    {[w.role, teamName(db, w.teamId)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1">
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${workerLabel(w)}`} onClick={() => setEditingEntity({ kind: 'worker', value: w })}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm" aria-label={`Apagar ${workerLabel(w)}`}
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setPendingDelete({
                          title: `Apagar ${workerLabel(w)}?`,
                          description: 'A ficha e o histórico deste trabalhador são apagados deste dispositivo.',
                          action: () =>
                            mutate((d) => {
                              d.workers = d.workers.filter((x) => x.id !== w.id)
                              d.teams.forEach((tm) => {
                                tm.members = (tm.members || []).filter((id) => id !== w.id)
                              })
                              logChange(d, { entity: 'worker', entityId: w.id, entityLabel: workerLabel(w), action: 'delete' })
                            }),
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </span>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Cópia de segurança */}
      <Card className="omp-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ArchiveIcon className="size-4.5 text-muted-foreground" />
            Cópia de segurança
            <InfoTip text="Exporta todos os dados num ficheiro JSON (para guardar noutro sítio ou passar para outro dispositivo) e importa um ficheiro exportado antes. Antes de qualquer importação, a versão atual fica guardada nos arquivos automáticos." />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={doExport}>
              <Download className="size-4" /> Exportar dados (JSON)
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Importar dados
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) doImport(f)
                e.target.value = ''
              }}
            />
          </div>
          {importMsg && <p className="text-sm text-muted-foreground">{importMsg}</p>}

          {archives.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium">
                Arquivos automáticos ({archives.length})
                <InfoTip text="Antes de cada alteração ou importação, a app guarda a versão anterior. Restaurar volta a esse momento (a versão atual também fica arquivada primeiro)." />
              </div>
              <div className="space-y-1.5">
                {archives.slice(0, 8).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground tabular-nums">{fmtDateTime(a.createdAt)}</span>
                      <span className="ml-2 text-xs">{a.reason}</span>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPendingDelete({
                          title: 'Restaurar esta versão?',
                          description: `Volta aos dados de ${fmtDateTime(a.createdAt)}. A versão atual fica guardada nos arquivos antes de restaurar.`,
                          action: () => {
                            restoreArchive(a.id)
                            onReload()
                          },
                        })
                      }
                    >
                      Restaurar
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de alterações */}
      <Card className="omp-card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4.5 text-muted-foreground" />
            Histórico de alterações
            <InfoTip text="Tudo o que foi criado, editado ou apagado na app, do mais recente para o mais antigo, com os campos que mudaram. Cada ficha (máquina, equipa, trabalhador) mostra também o seu próprio histórico." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeLogList entries={db.changeLog ?? []} limit={30} />
        </CardContent>
      </Card>

      {/* Diálogo de ficha (máquina/área/equipa/trabalhador) */}
      <Dialog open={editingEntity !== null} onOpenChange={(o) => !o && setEditingEntity(null)}>
        <DialogContent>
          {editingEntity?.kind === 'machine' && (
            <MachineForm
              db={db}
              initial={editingEntity.value}
              onCancel={() => setEditingEntity(null)}
              onSave={(m) => {
                const prev = editingEntity.value
                mutate((d) => {
                  const i = d.machines.findIndex((x) => x.id === m.id)
                  if (i >= 0) d.machines[i] = m
                  else d.machines.push(m)
                  const changes = diffFields(
                    prev as unknown as Record<string, unknown> | null,
                    m as unknown as Record<string, unknown>,
                    machineFieldSpecs(d),
                  )
                  if (!prev || changes.length) {
                    logChange(d, {
                      entity: 'machine', entityId: m.id, entityLabel: m.name,
                      action: prev ? 'edit' : 'create', changes: prev ? changes : undefined,
                    })
                  }
                })
                setEditingEntity(null)
              }}
            />
          )}
          {editingEntity?.kind === 'area' && (
            <AreaForm
              initial={editingEntity.value}
              onCancel={() => setEditingEntity(null)}
              onSave={(a) => {
                const prev = editingEntity.value
                mutate((d) => {
                  const i = d.workAreas.findIndex((x) => x.id === a.id)
                  if (i >= 0) d.workAreas[i] = a
                  else d.workAreas.push(a)
                  const changes = diffFields(
                    prev as unknown as Record<string, unknown> | null,
                    a as unknown as Record<string, unknown>,
                    areaFieldSpecs(),
                  )
                  if (!prev || changes.length) {
                    logChange(d, {
                      entity: 'area', entityId: a.id, entityLabel: a.name,
                      action: prev ? 'edit' : 'create', changes: prev ? changes : undefined,
                    })
                  }
                })
                setEditingEntity(null)
              }}
            />
          )}
          {editingEntity?.kind === 'team' && (
            <TeamForm
              db={db}
              initial={editingEntity.value}
              onCancel={() => setEditingEntity(null)}
              onSave={(t) => {
                const prev = editingEntity.value
                mutate((d) => {
                  const i = d.teams.findIndex((x) => x.id === t.id)
                  if (i >= 0) d.teams[i] = t
                  else d.teams.push(t)
                  const changes = diffFields(
                    prev as unknown as Record<string, unknown> | null,
                    t as unknown as Record<string, unknown>,
                    teamFieldSpecs(d),
                  )
                  if (!prev || changes.length) {
                    logChange(d, {
                      entity: 'team', entityId: t.id, entityLabel: t.name,
                      action: prev ? 'edit' : 'create', changes: prev ? changes : undefined,
                    })
                  }
                })
                setEditingEntity(null)
              }}
            />
          )}
          {editingEntity?.kind === 'worker' && (
            <WorkerForm
              db={db}
              initial={editingEntity.value}
              onCancel={() => setEditingEntity(null)}
              onSave={(w) => {
                const prev = editingEntity.value
                mutate((d) => {
                  const i = d.workers.findIndex((x) => x.id === w.id)
                  if (i >= 0) d.workers[i] = w
                  else d.workers.push(w)
                  const changes = diffFields(
                    prev as unknown as Record<string, unknown> | null,
                    w as unknown as Record<string, unknown>,
                    workerFieldSpecs(d),
                  )
                  if (!prev || changes.length) {
                    logChange(d, {
                      entity: 'worker', entityId: w.id, entityLabel: workerLabel(w),
                      action: prev ? 'edit' : 'create', changes: prev ? changes : undefined,
                    })
                  }
                })
                setEditingEntity(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de registo */}
      <Dialog open={editingRecord !== null} onOpenChange={(o) => !o && setEditingRecord(null)}>
        <DialogContent>
          {editingRecord !== null && (
            <RecordForm
              db={db}
              initial={editingRecord === 'new' ? null : editingRecord}
              onCancel={() => setEditingRecord(null)}
              onSave={(r) => {
                const prev = editingRecord === 'new' ? null : editingRecord
                mutate((d) => {
                  const i = d.productionRecords.findIndex((x) => x.id === r.id)
                  if (i >= 0) {
                    const changes = diffFields(
                      prev as unknown as Record<string, unknown>,
                      r as unknown as Record<string, unknown>,
                      recordFieldSpecs(),
                    )
                    d.productionRecords[i] = r
                    if (changes.length) {
                      logChange(d, {
                        entity: 'record', entityId: r.id,
                        entityLabel: recordLabel(db, r), action: 'edit', changes,
                      })
                    }
                  } else {
                    d.productionRecords.push(r)
                    logChange(d, {
                      entity: 'record', entityId: r.id,
                      entityLabel: recordLabel(db, r), action: 'create',
                      changes: [
                        { field: 'OF', from: '—', to: String(r.jobs) },
                        { field: 'RNC', from: '—', to: String(r.rnc) },
                      ],
                    })
                  }
                })
                setEditingRecord(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete !== null}
        title={pendingDelete?.title ?? ''}
        description={pendingDelete?.description ?? ''}
        confirmLabel={pendingDelete?.title.startsWith('Restaurar') ? 'Restaurar' : 'Apagar'}
        destructive={!pendingDelete?.title.startsWith('Restaurar')}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          pendingDelete?.action()
          setPendingDelete(null)
        }}
      />
    </div>
  )
}
