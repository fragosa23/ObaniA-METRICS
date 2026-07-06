import type { Db } from './types'

// Cores por secção (identidade visual consistente em toda a app).
export const SECTION_COLORS: Record<string, string> = {
  flexo: 'oklch(0.55 0.18 264)', // azul
  roto: 'oklch(0.58 0.19 300)', // violeta
}

export function sectionColor(sectionId: string): string {
  return SECTION_COLORS[sectionId] ?? 'var(--muted-foreground)'
}

// Paleta categórica para distinguir máquinas num gráfico de várias linhas.
const MACHINE_PALETTE = [
  'oklch(0.60 0.18 250)',
  'oklch(0.62 0.15 200)',
  'oklch(0.55 0.18 264)',
  'oklch(0.64 0.14 160)',
  'oklch(0.62 0.20 25)',
  'oklch(0.58 0.19 300)',
  'oklch(0.60 0.18 330)',
  'oklch(0.66 0.14 65)',
]

export function machineColor(db: Db, machineId: string): string {
  const i = db.machines.findIndex((m) => m.id === machineId)
  return MACHINE_PALETTE[(i < 0 ? 0 : i) % MACHINE_PALETTE.length]
}
