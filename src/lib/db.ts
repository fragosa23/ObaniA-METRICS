import type {
  Aggregate,
  Archive,
  Db,
  Machine,
  PlaceKind,
  ProductionRecord,
  Section,
  ShiftRegime,
  Team,
  WorkArea,
  Worker,
} from './types'

const DB_KEY = 'rnc_impressao_v3'
const ARCHIVE_KEY = 'rnc_impressao_v3_archives'
const APP_DATA_REVISION = 9

export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
export const SHIFTS = ['Manhã', 'Tarde', 'Noite'] as const

// Horários predefinidos de cada turno (podem ser substituídos por "Outro").
export const SHIFT_HOURS: Record<string, string> = {
  'Manhã': '06:00–14:00',
  'Tarde': '14:00–22:00',
  'Noite': '22:00–06:00',
}
export const SCHEDULE_OPTIONS = ['06:00–14:00', '14:00–22:00', '22:00–06:00'] as const

// Rótulos legíveis dos regimes de turno.
export const REGIME_LABEL: Record<ShiftRegime, string> = {
  rot3: 'Rotativo M/T/N',
  rot2: 'Rotativo M/T',
  fixo: 'Fixo',
}
/** Descrição completa do regime de uma equipa (ex.: "Fixo · Tarde · 14:00–22:00"). */
export function teamRegimeLabel(t: Team): string {
  const regime = t.regime || (t.shift ? 'fixo' : 'rot3')
  if (regime !== 'fixo') return REGIME_LABEL[regime]
  const parts = ['Fixo']
  if (t.shift) parts.push(t.shift)
  if (t.schedule) parts.push(t.schedule)
  return parts.join(' · ')
}

// ---- utilitários numéricos / formatação ----
export function uid(prefix: string): string {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}
export function n(v: unknown): number {
  return v === '' || v === null || v === undefined ? 0 : Number(v)
}
export function rate(rnc: number, of: number): number | null {
  return n(of) > 0 ? (n(rnc) / n(of)) * 100 : null
}
export function fmt(v: number | null): string {
  return v === null || Number.isNaN(v) ? 'N/A' : v.toFixed(2).replace('.', ',') + '%'
}
function clone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// ---- dados semeados (importados das fotografias fev–maio 2026) ----
const SEEDED_RECORDS: ProductionRecord[] = [
  { id: 'seed_2026_02_IF1', year: 2026, month: 2, sectionId: 'flexo', machineId: 'IF1', teamId: '', shift: '', workerIds: [], jobs: 124, rnc: 2, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IF2', year: 2026, month: 2, sectionId: 'flexo', machineId: 'IF2', teamId: '', shift: '', workerIds: [], jobs: 119, rnc: 1, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IF3', year: 2026, month: 2, sectionId: 'flexo', machineId: 'IF3', teamId: '', shift: '', workerIds: [], jobs: 188, rnc: 1, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IF4', year: 2026, month: 2, sectionId: 'flexo', machineId: 'IF4', teamId: '', shift: '', workerIds: [], jobs: 170, rnc: 3, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IR1', year: 2026, month: 2, sectionId: 'roto', machineId: 'IR1', teamId: '', shift: '', workerIds: [], jobs: 15, rnc: 3, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IR3', year: 2026, month: 2, sectionId: 'roto', machineId: 'IR3', teamId: '', shift: '', workerIds: [], jobs: 82, rnc: 3, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IR4', year: 2026, month: 2, sectionId: 'roto', machineId: 'IR4', teamId: '', shift: '', workerIds: [], jobs: 157, rnc: 7, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_02_IR5', year: 2026, month: 2, sectionId: 'roto', machineId: 'IR5', teamId: '', shift: '', workerIds: [], jobs: 144, rnc: 6, cause: '', notes: 'Importado da fotografia de março 2026' },
  { id: 'seed_2026_03_IF1', year: 2026, month: 3, sectionId: 'flexo', machineId: 'IF1', teamId: '', shift: '', workerIds: [], jobs: 162, rnc: 5, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IF2', year: 2026, month: 3, sectionId: 'flexo', machineId: 'IF2', teamId: '', shift: '', workerIds: [], jobs: 112, rnc: 4, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IF3', year: 2026, month: 3, sectionId: 'flexo', machineId: 'IF3', teamId: '', shift: '', workerIds: [], jobs: 199, rnc: 1, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IF4', year: 2026, month: 3, sectionId: 'flexo', machineId: 'IF4', teamId: '', shift: '', workerIds: [], jobs: 187, rnc: 3, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IR1', year: 2026, month: 3, sectionId: 'roto', machineId: 'IR1', teamId: '', shift: '', workerIds: [], jobs: 13, rnc: 0, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IR3', year: 2026, month: 3, sectionId: 'roto', machineId: 'IR3', teamId: '', shift: '', workerIds: [], jobs: 82, rnc: 2, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IR4', year: 2026, month: 3, sectionId: 'roto', machineId: 'IR4', teamId: '', shift: '', workerIds: [], jobs: 135, rnc: 3, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_03_IR5', year: 2026, month: 3, sectionId: 'roto', machineId: 'IR5', teamId: '', shift: '', workerIds: [], jobs: 151, rnc: 2, cause: '', notes: 'Importado da fotografia de abril 2026' },
  { id: 'seed_2026_04_IF1', year: 2026, month: 4, sectionId: 'flexo', machineId: 'IF1', teamId: '', shift: '', workerIds: [], jobs: 150, rnc: 5, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IF2', year: 2026, month: 4, sectionId: 'flexo', machineId: 'IF2', teamId: '', shift: '', workerIds: [], jobs: 110, rnc: 3, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IF3', year: 2026, month: 4, sectionId: 'flexo', machineId: 'IF3', teamId: '', shift: '', workerIds: [], jobs: 180, rnc: 1, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IF4', year: 2026, month: 4, sectionId: 'flexo', machineId: 'IF4', teamId: '', shift: '', workerIds: [], jobs: 165, rnc: 9, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IR1', year: 2026, month: 4, sectionId: 'roto', machineId: 'IR1', teamId: '', shift: '', workerIds: [], jobs: 10, rnc: 2, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IR3', year: 2026, month: 4, sectionId: 'roto', machineId: 'IR3', teamId: '', shift: '', workerIds: [], jobs: 110, rnc: 3, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IR4', year: 2026, month: 4, sectionId: 'roto', machineId: 'IR4', teamId: '', shift: '', workerIds: [], jobs: 120, rnc: 2, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_04_IR5', year: 2026, month: 4, sectionId: 'roto', machineId: 'IR5', teamId: '', shift: '', workerIds: [], jobs: 155, rnc: 6, cause: '', notes: 'Importado da fotografia de maio 2026' },
  { id: 'seed_2026_05_IF1', year: 2026, month: 5, sectionId: 'flexo', machineId: 'IF1', teamId: '', shift: '', workerIds: [], jobs: 128, rnc: 4, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IF2', year: 2026, month: 5, sectionId: 'flexo', machineId: 'IF2', teamId: '', shift: '', workerIds: [], jobs: 135, rnc: 6, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IF3', year: 2026, month: 5, sectionId: 'flexo', machineId: 'IF3', teamId: '', shift: '', workerIds: [], jobs: 200, rnc: 4, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IF4', year: 2026, month: 5, sectionId: 'flexo', machineId: 'IF4', teamId: '', shift: '', workerIds: [], jobs: 171, rnc: 2, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IR1', year: 2026, month: 5, sectionId: 'roto', machineId: 'IR1', teamId: '', shift: '', workerIds: [], jobs: 0, rnc: 2, cause: '', notes: 'Importado da fotografia de junho 2026. IR1 descontinuada.' },
  { id: 'seed_2026_05_IR3', year: 2026, month: 5, sectionId: 'roto', machineId: 'IR3', teamId: '', shift: '', workerIds: [], jobs: 79, rnc: 3, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IR4', year: 2026, month: 5, sectionId: 'roto', machineId: 'IR4', teamId: '', shift: '', workerIds: [], jobs: 120, rnc: 4, cause: '', notes: 'Importado da fotografia de junho 2026' },
  { id: 'seed_2026_05_IR5', year: 2026, month: 5, sectionId: 'roto', machineId: 'IR5', teamId: '', shift: '', workerIds: [], jobs: 152, rnc: 2, cause: '', notes: 'Importado da fotografia de junho 2026' },
]

// ---- bases da fábrica (secções, áreas, equipas, trabalhadores semeados) ----
function baseSections(): Section[] {
  return [
    { id: 'flexo', name: 'Flexografia' },
    { id: 'roto', name: 'Rotogravura' },
    { id: 'offset', name: 'Offset' },
  ]
}

function baseWorkAreas(): WorkArea[] {
  return [
    { id: 'mont_cilindros', name: 'Montagem de Cilindros', notes: '' },
    { id: 'mont_cliches', name: 'Montagem de Clichês', notes: '' },
    { id: 'limpeza', name: 'Limpeza', notes: '' },
  ]
}

function baseTeams(): Team[] {
  return [
    { id: 'E1-IF3', name: 'E1 · IF3', sectionId: 'flexo', machineId: 'IF3', regime: 'rot3', shift: '', schedule: '', members: ['trab-1904'] },
    { id: 'E1-IF4', name: 'E1 · IF4', sectionId: 'flexo', machineId: 'IF4', regime: 'rot3', shift: '', schedule: '', members: ['trab-1940'] },
    { id: 'E1-IR3', name: 'E1 · IR3', sectionId: 'roto', machineId: 'IR3', regime: 'rot3', shift: '', schedule: '', members: ['trab-1964'] },
    { id: 'E2-IR3', name: 'E2 · IR3', sectionId: 'roto', machineId: 'IR3', regime: 'rot2', shift: '', schedule: '', members: [] },
    { id: 'E1-IR4', name: 'E1 · IR4', sectionId: 'roto', machineId: 'IR4', regime: 'fixo', shift: 'Tarde', schedule: '14:00–22:00', members: ['trab-2558'] },
  ]
}

function baseWorkers(): Worker[] {
  return [
    {
      id: 'trab-2558', number: '2558', name: 'Saulo Ferreira', teamId: 'E1-IR4', shift: 'Tarde',
      nationality: 'Portuguesa', birthDate: '1985-04-12', yearsCompany: 14,
      role: 'Impressor', placeKind: 'machine', placeId: 'IR4',
      roleHistory: [
        { id: 'rh-2558-1', role: 'Impressor', placeKind: 'machine', placeId: 'IR3', start: '2012-03', end: '2018-06' },
        { id: 'rh-2558-2', role: 'Impressor', placeKind: 'machine', placeId: 'IR4', start: '2018-06', end: '' },
      ],
      teamHistory: [
        { id: 'th-2558-1', teamId: 'E1-IR3', start: '2012-03', end: '2015-01' },
        { id: 'th-2558-2', teamId: 'E2-IR3', start: '2015-01', end: '2018-06' },
        { id: 'th-2558-3', teamId: 'E1-IR4', start: '2018-06', end: '' },
      ],
      notes: '',
    },
    {
      id: 'trab-1904', number: '1904', name: 'Fábio Ferreira', teamId: 'E1-IF3', shift: 'Manhã',
      nationality: 'Portuguesa', birthDate: '1990-09-03', yearsCompany: 8,
      role: 'Impressor', placeKind: 'machine', placeId: 'IF3',
      roleHistory: [
        { id: 'rh-1904-1', role: 'Ajudante de Impressão', placeKind: 'section', placeId: 'flexo', start: '2017-05', end: '2020-02' },
        { id: 'rh-1904-2', role: 'Impressor', placeKind: 'machine', placeId: 'IF3', start: '2020-02', end: '' },
      ],
      teamHistory: [{ id: 'th-1904-1', teamId: 'E1-IF3', start: '2017-05', end: '' }],
      notes: '',
    },
    {
      id: 'trab-1964', number: '1964', name: 'João Silva', teamId: 'E1-IR3', shift: 'Manhã',
      nationality: 'Portuguesa', birthDate: '1978-01-22', yearsCompany: 22,
      role: 'Chefe de Equipa', placeKind: 'machine', placeId: 'IR3',
      roleHistory: [
        { id: 'rh-1964-1', role: 'Montador', placeKind: 'area', placeId: 'mont_cilindros', start: '2003-09', end: '2009-04' },
        { id: 'rh-1964-2', role: 'Impressor', placeKind: 'machine', placeId: 'IR3', start: '2009-04', end: '2019-11' },
        { id: 'rh-1964-3', role: 'Chefe de Equipa', placeKind: 'machine', placeId: 'IR3', start: '2019-11', end: '' },
      ],
      teamHistory: [{ id: 'th-1964-1', teamId: 'E1-IR3', start: '2009-04', end: '' }],
      notes: '',
    },
    {
      id: 'trab-1940', number: '1940', name: 'Tiago Carvalho', teamId: 'E1-IF4', shift: 'Tarde',
      nationality: 'Brasileira', birthDate: '1994-11-30', yearsCompany: 5,
      role: 'Impressor', placeKind: 'machine', placeId: 'IF4',
      roleHistory: [
        { id: 'rh-1940-1', role: 'Limpeza', placeKind: 'area', placeId: 'limpeza', start: '2020-07', end: '2021-10' },
        { id: 'rh-1940-2', role: 'Ajudante de Impressão', placeKind: 'machine', placeId: 'IF4', start: '2021-10', end: '2023-05' },
        { id: 'rh-1940-3', role: 'Impressor', placeKind: 'machine', placeId: 'IF4', start: '2023-05', end: '' },
      ],
      teamHistory: [{ id: 'th-1940-1', teamId: 'E1-IF4', start: '2021-10', end: '' }],
      notes: '',
    },
    {
      id: 'trab-2210', number: '2210', name: 'Ana Marques', teamId: '', shift: 'Noite',
      nationality: 'Portuguesa', birthDate: '1996-06-15', yearsCompany: 3,
      role: 'Montadora de Clichês', placeKind: 'area', placeId: 'mont_cliches',
      roleHistory: [
        { id: 'rh-2210-1', role: 'Montadora de Clichês', placeKind: 'area', placeId: 'mont_cliches', start: '2022-02', end: '' },
      ],
      teamHistory: [],
      notes: '',
    },
  ]
}

function baseMachines(): Machine[] {
  return [
    { id: 'IF1', name: 'IF1', sectionId: 'flexo', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IF2', name: 'IF2', sectionId: 'flexo', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IF3', name: 'IF3', sectionId: 'flexo', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IF4', name: 'IF4', sectionId: 'flexo', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IR1', name: 'IR1', sectionId: 'roto', manufacturer: '', year: '', colors: '', width: '', status: 'discontinued', statusNote: 'Máquina descontinuada', notes: '' },
    { id: 'IR3', name: 'IR3', sectionId: 'roto', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IR4', name: 'IR4', sectionId: 'roto', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
    { id: 'IR5', name: 'IR5', sectionId: 'roto', manufacturer: '', year: '', colors: '', width: '', status: 'active', statusNote: '', notes: '' },
  ]
}

export function defaultSettings(): NonNullable<Db['settings']> {
  return { schedules: [...SCHEDULE_OPTIONS], targetTaxa: 2 }
}

function seedDb(): Db {
  return {
    app: 'RNC Impressão', version: 3, dataRevision: APP_DATA_REVISION,
    updatedAt: new Date().toISOString(),
    sections: baseSections(), workAreas: baseWorkAreas(),
    machines: baseMachines(), teams: baseTeams(), workers: baseWorkers(),
    productionRecords: clone(SEEDED_RECORDS),
    rncCauses: [], trainingRecords: [], archives: [],
    settings: defaultSettings(),
  }
}

function archiveSnapshot(reason: string, db: Db): void {
  const archives: Archive[] = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  archives.unshift({ id: uid('archive'), createdAt: new Date().toISOString(), reason, db: clone(db) })
  localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives.slice(0, 20)))
}

function migrateDb(db: Db): { db: Db; changed: boolean } {
  let changed = false
  db.sections = db.sections && db.sections.length ? db.sections : baseSections()
  // Garante a secção Offset em bases antigas (só tinham Flexo e Roto).
  if (!db.sections.some((s) => s.id === 'offset')) {
    db.sections.push({ id: 'offset', name: 'Offset' }); changed = true
  }
  if (!db.workAreas || !db.workAreas.length) { db.workAreas = baseWorkAreas(); changed = true }
  db.machines = db.machines && db.machines.length ? db.machines : baseMachines()
  db.teams = db.teams && db.teams.length ? db.teams : baseTeams()
  db.workers = db.workers && db.workers.length ? db.workers : baseWorkers()
  db.productionRecords = db.productionRecords || []
  db.rncCauses = db.rncCauses || []
  db.trainingRecords = db.trainingRecords || []
  db.archives = db.archives || []
  db.machines.forEach((m) => {
    const base = baseMachines().find((b) => b.id === m.id)
    if (m.status === undefined) { m.status = base?.status || 'active'; changed = true }
    if (m.statusNote === undefined) { m.statusNote = base?.statusNote || ''; changed = true }
    if (m.id === 'IR1' && (m.status !== 'discontinued' || m.statusNote !== 'Máquina descontinuada')) {
      m.status = 'discontinued'; m.statusNote = 'Máquina descontinuada'; changed = true
    }
  })
  db.productionRecords.forEach((r) => {
    if (r.shift === undefined) { r.shift = ''; changed = true }
    if (!r.workerIds) { r.workerIds = []; changed = true }
  })
  db.teams.forEach((t) => {
    if (t.shift === undefined) { t.shift = ''; changed = true }
    if (t.machineId === undefined) { t.machineId = ''; changed = true }
    // Regime em falta: equipas antigas com turno passam a "fixo" com esse turno.
    if (t.regime === undefined) {
      t.regime = t.shift ? 'fixo' : 'rot3'
      changed = true
    }
    if (t.schedule === undefined) {
      t.schedule = t.regime === 'fixo' && t.shift ? (SHIFT_HOURS[t.shift] || '') : ''
      changed = true
    }
  })
  db.workers.forEach((w) => {
    if (w.shift === undefined) { w.shift = ''; changed = true }
    if (w.roleHistory === undefined) {
      // Constrói um histórico mínimo a partir da função/local atual, se existirem.
      w.roleHistory = w.role
        ? [{ id: uid('rh'), role: w.role, placeKind: (w.placeKind || 'section'), placeId: w.placeId || '', start: '', end: '' }]
        : []
      changed = true
    }
    if (w.teamHistory === undefined) {
      w.teamHistory = w.teamId ? [{ id: uid('th'), teamId: w.teamId, start: '', end: '' }] : []
      changed = true
    }
  })
  const ids = new Set(db.productionRecords.map((r) => r.id))
  SEEDED_RECORDS.forEach((r) => {
    if (!ids.has(r.id)) { db.productionRecords.push(clone(r)); changed = true }
  })
  // Honestidade dos dados: as OF importadas das fotografias NÃO identificam
  // que equipa/turno as produziu — remove qualquer atribuição fictícia antiga.
  db.productionRecords.forEach((r) => {
    if (r.id.startsWith('seed_') && (r.teamId || r.shift)) {
      r.teamId = ''; r.shift = ''; changed = true
    }
  })
  // Definições da app (meta da taxa, horários disponíveis).
  if (!db.settings) { db.settings = defaultSettings(); changed = true }
  if (!db.settings.schedules || !db.settings.schedules.length) { db.settings.schedules = [...SCHEDULE_OPTIONS]; changed = true }
  if (db.settings.targetTaxa === undefined) { db.settings.targetTaxa = 2; changed = true }
  if ((db.dataRevision || 0) < APP_DATA_REVISION) { db.dataRevision = APP_DATA_REVISION; changed = true }
  return { db, changed }
}

export function loadDb(): Db {
  const raw = localStorage.getItem(DB_KEY)
  if (!raw) {
    const fresh = seedDb()
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
    return fresh
  }
  const db: Db = JSON.parse(raw)
  const before = clone(db)
  const migrated = migrateDb(db)
  if (migrated.changed) {
    archiveSnapshot('Arquivo automático antes da atualização da app', before)
    saveDb(migrated.db, false)
  }
  return migrated.db
}

export function saveDb(db: Db, archive = true): void {
  const oldRaw = localStorage.getItem(DB_KEY)
  if (archive && oldRaw) archiveSnapshot('Arquivo automático antes de guardar alterações', JSON.parse(oldRaw))
  db.updatedAt = new Date().toISOString()
  db.dataRevision = APP_DATA_REVISION
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function exportDb(): Db {
  const db = loadDb()
  db.archives = JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
  return db
}

export function importDb(payload: Db): void {
  if (!payload || payload.version < 3) throw new Error('Ficheiro inválido ou antigo.')
  const oldRaw = localStorage.getItem(DB_KEY)
  if (oldRaw) archiveSnapshot('Arquivo automático antes de importar ficheiro', JSON.parse(oldRaw))
  const archives = payload.archives || []
  delete (payload as { archives?: unknown }).archives
  localStorage.setItem(DB_KEY, JSON.stringify(payload))
  if (archives.length) localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archives))
  loadDb()
}

// ---- helpers de nome ----
export function sectionName(db: Db, id: string): string {
  return db.sections.find((x) => x.id === id)?.name || id
}
export function machineName(db: Db, id: string): string {
  return db.machines.find((x) => x.id === id)?.name || id
}
export function teamName(db: Db, id?: string): string {
  return db.teams.find((x) => x.id === id)?.name || 'Sem equipa'
}
export function workerLabel(w: { number?: string; name: string }): string {
  return w.number ? `${w.number} - ${w.name}` : w.name
}
export function workerName(db: Db, id: string): string {
  const w = db.workers.find((x) => x.id === id)
  return w ? workerLabel(w) : id
}
export function teamAutoName(db: Db, machineId: string): string {
  const machine = db.machines.find((x) => x.id === machineId)
  if (!machine) return ''
  const count = db.teams.filter((t) => t.machineId === machineId).length + 1
  return `E${count} · ${machine.name}`
}
export function workAreaName(db: Db, id: string): string {
  return db.workAreas.find((x) => x.id === id)?.name || id
}

/** Nome legível de um local (secção de impressão, máquina ou área de apoio). */
export function placeLabel(db: Db, kind: PlaceKind, id: string): string {
  if (kind === 'machine') return machineName(db, id)
  if (kind === 'area') return workAreaName(db, id)
  return sectionName(db, id)
}
/** Um local é "de impressão" (conta para o tempo a imprimir) se for secção de impressão ou máquina. */
export function placeIsPrinting(kind: PlaceKind): boolean {
  return kind === 'section' || kind === 'machine'
}

// ---- datas / durações (meses no formato 'AAAA-MM') ----
/** Meses entre dois 'AAAA-MM' (fim vazio = até hoje). Devolve 0 se início inválido. */
export function monthsBetween(start?: string, end?: string): number {
  const s = parseMonth(start)
  if (s === null) return 0
  const e = end ? parseMonth(end) : thisMonthIndex()
  if (e === null) return 0
  return Math.max(0, e - s)
}
function parseMonth(v?: string): number | null {
  if (!v) return null
  const m = /^(\d{4})-(\d{1,2})$/.exec(v)
  if (!m) return null
  return Number(m[1]) * 12 + (Number(m[2]) - 1)
}
function thisMonthIndex(): number {
  const d = new Date()
  return d.getFullYear() * 12 + d.getMonth()
}
/** Duração legível: "3 anos e 4 meses", "8 meses", "menos de 1 mês". */
export function humanDuration(months: number): string {
  if (months <= 0) return 'menos de 1 mês'
  const y = Math.floor(months / 12)
  const m = months % 12
  const parts: string[] = []
  if (y) parts.push(`${y} ${y === 1 ? 'ano' : 'anos'}`)
  if (m) parts.push(`${m} ${m === 1 ? 'mês' : 'meses'}`)
  return parts.join(' e ')
}
/** Idade em anos a partir de 'AAAA-MM-DD'; null se ausente/inválida. */
export function ageFromBirth(birthDate?: string): number | null {
  if (!birthDate) return null
  const d = new Date(birthDate)
  if (Number.isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const before = now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())
  if (before) age--
  return age >= 0 && age < 130 ? age : null
}
/** Tempo total a imprimir (em meses), somando as passagens por secções de impressão / máquinas. */
export function printingMonths(w: Worker): number {
  return (w.roleHistory || [])
    .filter((r) => placeIsPrinting(r.placeKind))
    .reduce((a, r) => a + monthsBetween(r.start, r.end), 0)
}
/** Tempo na equipa atual (em meses), a partir da entrada em aberto do histórico. */
export function currentTeamMonths(w: Worker): number {
  const open = (w.teamHistory || []).find((t) => !t.end)
  return open ? monthsBetween(open.start, open.end) : 0
}
/** Mês atual em 'AAAA-MM'. */
export function currentMonthStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** Ao gravar, fecha a passagem anterior e abre uma nova sempre que muda de equipa ou de função/local.
 *  É isto que mantém o histórico do trabalhador atualizado sem o utilizador o escrever à mão. */
export function reconcileWorkerHistory(prev: Worker | undefined, next: Worker): Worker {
  const now = currentMonthStr()
  const w = clone(next)
  w.roleHistory = w.roleHistory || []
  w.teamHistory = w.teamHistory || []

  if ((w.teamId || '') !== (prev?.teamId || '')) {
    const open = w.teamHistory.find((t) => !t.end)
    if (open) open.end = now
    if (w.teamId) w.teamHistory.push({ id: uid('th'), teamId: w.teamId, start: now, end: '' })
  }

  const roleChanged =
    (prev?.role || '') !== (w.role || '') ||
    (prev?.placeKind || '') !== (w.placeKind || '') ||
    (prev?.placeId || '') !== (w.placeId || '')
  if (roleChanged) {
    const open = w.roleHistory.find((r) => !r.end)
    if (open) open.end = now
    if (w.role) {
      w.roleHistory.push({ id: uid('rh'), role: w.role, placeKind: w.placeKind || 'section', placeId: w.placeId || '', start: now, end: '' })
    }
  }
  return w
}

// ---- filtros e agregações ----
export interface RecordFilter {
  year?: number
  month?: number
  sectionId?: string
  machineId?: string
  teamId?: string
  workerId?: string
}
export function recordsFor(db: Db, filter: RecordFilter = {}): ProductionRecord[] {
  return db.productionRecords.filter((r) =>
    (!filter.year || r.year == filter.year) &&
    ((filter.month === undefined) || r.month == filter.month) &&
    (!filter.sectionId || r.sectionId === filter.sectionId) &&
    (!filter.machineId || r.machineId === filter.machineId) &&
    (!filter.teamId || r.teamId === filter.teamId) &&
    (!filter.workerId || (r.workerIds || []).includes(filter.workerId)),
  )
}
export function aggregate(records: ProductionRecord[]): Aggregate {
  const of = records.reduce((a, r) => a + n(r.jobs), 0)
  const rnc = records.reduce((a, r) => a + n(r.rnc), 0)
  return { of, rnc, taxa: rate(rnc, of), ofRnc: rnc ? of / rnc : null }
}
export function recordShift(db: Db, r: ProductionRecord): string {
  if (r.shift) return r.shift
  const t = db.teams.find((x) => x.id === r.teamId)
  return t?.shift || 'Não definido'
}

// ---- arquivos ----
export function getArchives(): Archive[] {
  return JSON.parse(localStorage.getItem(ARCHIVE_KEY) || '[]')
}
export function restoreArchive(id: string): void {
  const archives = getArchives()
  const found = archives.find((a) => a.id === id)
  if (!found) throw new Error('Arquivo não encontrado')
  const current = localStorage.getItem(DB_KEY)
  if (current) archiveSnapshot('Arquivo automático antes de restaurar versão antiga', JSON.parse(current))
  localStorage.setItem(DB_KEY, JSON.stringify(found.db))
}

/** OF por RNC formatado (ex.: "18,4" ou "Sem RNC"). */
export function fmtOfRnc(a: Aggregate): string {
  return a.ofRnc ? a.ofRnc.toFixed(1).replace('.', ',') : 'Sem RNC'
}
