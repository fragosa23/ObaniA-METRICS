import type { Db } from './types'

// Cores por secção (identidade visual consistente em toda a app).
export const SECTION_COLORS: Record<string, string> = {
  flexo: 'oklch(0.55 0.18 264)', // azul
  roto: 'oklch(0.58 0.19 300)', // violeta
  offset: 'oklch(0.62 0.15 200)', // ciano/turquesa
}

export function sectionColor(sectionId: string): string {
  return SECTION_COLORS[sectionId] ?? 'var(--muted-foreground)'
}

// Paleta categórica segura para daltonismo (Paul Tol "bright" + laranja),
// legível em modo claro e escuro.
export const MACHINE_PALETTE = [
  '#4477AA', // azul
  '#EE6677', // vermelho-rosa
  '#228833', // verde
  '#CCBB44', // amarelo-mostarda
  '#66CCEE', // ciano
  '#AA3377', // púrpura
  '#EE8866', // laranja
  '#BBBBBB', // cinzento
]

// Padrões de traço distintos: reforçam a distinção sem depender só da cor.
const MACHINE_DASH = ['', '6 4', '2 3', '9 3 2 3', '1 5', '12 4', '5 3 1 3', '8 2']

export function machineColor(db: Db, machineId: string): string {
  const i = db.machines.findIndex((m) => m.id === machineId)
  return MACHINE_PALETTE[(i < 0 ? 0 : i) % MACHINE_PALETTE.length]
}

export function machineDash(db: Db, machineId: string): string {
  const i = db.machines.findIndex((m) => m.id === machineId)
  return MACHINE_DASH[(i < 0 ? 0 : i) % MACHINE_DASH.length]
}
