// Modelo de dados v3 — mantém compatibilidade total com a app antiga (legacy/).

export type Shift = 'Manhã' | 'Tarde' | 'Noite'
export type MachineStatus = 'active' | 'discontinued'

/** Regime de turno de uma equipa:
 *  - 'rot3' → rotativo Manhã/Tarde/Noite
 *  - 'rot2' → rotativo Manhã/Tarde
 *  - 'fixo' → turno fixo (com turno e horário definidos) */
export type ShiftRegime = 'rot3' | 'rot2' | 'fixo'

/** Secção de impressão (Flexografia, Rotogravura, Offset). Produz OF e RNC. */
export interface Section {
  id: string
  name: string
}

/** Área de apoio (Montagem de Cilindros, Montagem de Clichês, Limpeza).
 *  Sítio onde um trabalhador pode ter passado; NÃO produz OF nem RNC. */
export interface WorkArea {
  id: string
  name: string
  notes?: string
}

/** Onde um trabalhador desempenhou uma função: secção de impressão, máquina ou área de apoio. */
export type PlaceKind = 'section' | 'machine' | 'area'

/** Uma passagem por uma função (com local e período). Alimenta o histórico e o "tempo a imprimir". */
export interface RoleAssignment {
  id: string
  role: string
  placeKind: PlaceKind
  placeId: string
  /** Mês de início no formato 'AAAA-MM'. */
  start: string
  /** Mês de fim 'AAAA-MM'; vazio/ausente = ainda em curso. */
  end?: string
}

/** Uma passagem por uma equipa (com período). Alimenta o histórico e o "tempo na equipa". */
export interface TeamAssignment {
  id: string
  teamId: string
  start: string
  end?: string
}

export interface Machine {
  id: string
  name: string
  sectionId: string
  manufacturer?: string
  year?: string
  colors?: string
  width?: string
  status: MachineStatus
  statusNote?: string
  notes?: string
}

export interface Team {
  id: string
  name: string
  sectionId: string
  machineId: string
  /** Turno fixo (Manhã/Tarde/Noite) — usado quando regime === 'fixo'. */
  shift: string
  /** Regime de turno: rotativo M/T/N, rotativo M/T, ou fixo. */
  regime?: ShiftRegime
  /** Horário (ex.: '14:00–22:00') — usado quando regime === 'fixo'. */
  schedule?: string
  members: string[]
}

export interface Worker {
  id: string
  number?: string
  name: string
  teamId?: string
  shift?: string
  nationality?: string
  birthDate?: string
  yearsCompany?: number
  /** @deprecated substituído por roleHistory; mantido só para compatibilidade de ficheiros antigos. */
  yearsPrinting?: number
  /** Função/categoria profissional atual. */
  role?: string
  /** Onde desempenha a função atual (secção, máquina ou área de apoio). */
  placeKind?: PlaceKind
  placeId?: string
  /** Histórico de funções (função + local + período). */
  roleHistory?: RoleAssignment[]
  /** Histórico de equipas (equipa + período). */
  teamHistory?: TeamAssignment[]
  notes?: string
}

export interface ProductionRecord {
  id: string
  year: number
  month: number
  sectionId: string
  machineId: string
  teamId?: string
  shift?: string
  workerIds: string[]
  jobs: number
  rnc: number
  cause?: string
  notes?: string
}

export interface Db {
  app: string
  version: number
  dataRevision: number
  updatedAt: string
  sections: Section[]
  workAreas: WorkArea[]
  machines: Machine[]
  teams: Team[]
  workers: Worker[]
  productionRecords: ProductionRecord[]
  rncCauses: unknown[]
  trainingRecords: unknown[]
  archives: Archive[]
  /** Definições da app (viajam com a exportação/importação dos dados). */
  settings?: {
    /** Horários disponíveis para turnos fixos (geríveis em Configurações). */
    schedules: string[]
    /** Meta da taxa de RNC por 100 OF (ex.: 2 = 2%). */
    targetTaxa: number
  }
}

export interface Archive {
  id: string
  createdAt: string
  reason: string
  db: Db
}

/** Resultado agregado de um conjunto de registos. */
export interface Aggregate {
  of: number
  rnc: number
  /** Taxa RNC por 100 OF; null quando não há OF. */
  taxa: number | null
  /** OF por RNC; null quando não há RNC. */
  ofRnc: number | null
}
