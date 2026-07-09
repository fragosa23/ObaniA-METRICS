// Motor de sugestões do assistente ObaniA.
// Regras simples sobre os dados locais — nunca inventa valores:
// cada sugestão cita os números em que se baseia.

import type { Db, ProductionRecord } from './types'
import { aggregate, fmt, MONTHS, n } from './db'
import type { Tone } from './severity'

export interface Insight {
  id: string
  tone: Tone
  title: string
  text: string
}

const TONE_ORDER: Record<Tone, number> = { danger: 0, warning: 1, neutral: 2, success: 3 }

export interface InsightContext {
  isYear: boolean
  year: number
  month?: number
  periodLabel: string
  targetTaxa: number
}

export function dashboardInsights(
  db: Db,
  records: ProductionRecord[],
  allRecords: ProductionRecord[],
  ctx: InsightContext,
): Insight[] {
  const out: Insight[] = []

  if (!records.length) {
    return [
      {
        id: `no-data-${ctx.periodLabel}`,
        tone: 'neutral',
        title: 'Ainda sem dados',
        text: `Não há registos de produção para ${ctx.periodLabel}. Quando importares o relatório, eu comento o que vir aqui.`,
      },
    ]
  }

  const active = db.machines.filter((m) => m.status !== 'discontinued')
  const rated = active
    .map((m) => ({ m, a: aggregate(records.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.a.of > 0)

  // 1) Pior máquina ativa acima da meta.
  const worst = [...rated].sort((x, y) => (y.a.taxa || 0) - (x.a.taxa || 0))[0]
  if (worst && (worst.a.taxa || 0) > ctx.targetTaxa) {
    const t = worst.a.taxa || 0
    out.push({
      id: `worst-${worst.m.id}-${ctx.periodLabel}`,
      tone: t > 5 ? 'danger' : 'warning',
      title: `${worst.m.name} acima da meta`,
      text: `A ${worst.m.name} tem ${worst.a.rnc} RNC em ${worst.a.of} OF (${fmt(worst.a.taxa)}), acima da meta de ${String(ctx.targetTaxa).replace('.', ',')}%. Vale a pena investigar esse período na página Produção.`,
    })
  }

  // 2) Tendência da taxa: mês selecionado vs mês anterior com dados
  //    (ou, no ano inteiro, os dois últimos meses com dados).
  const monthKeys = [...new Set(allRecords.map((r) => r.year * 12 + r.month))].sort((a, b) => a - b)
  let currKey: number | undefined
  let prevKey: number | undefined
  if (!ctx.isYear && ctx.month !== undefined) {
    currKey = ctx.year * 12 + ctx.month
    const i = monthKeys.indexOf(currKey)
    prevKey = i > 0 ? monthKeys[i - 1] : undefined
  } else {
    currKey = monthKeys[monthKeys.length - 1]
    prevKey = monthKeys[monthKeys.length - 2]
  }
  if (currKey !== undefined && prevKey !== undefined) {
    const monthAgg = (k: number) => aggregate(allRecords.filter((r) => r.year * 12 + r.month === k))
    const label = (k: number) => MONTHS[((k % 12) + 12) % 12]
    const c = monthAgg(currKey)
    const p = monthAgg(prevKey)
    if (c.taxa !== null && p.taxa !== null && p.taxa > 0) {
      const rel = (c.taxa - p.taxa) / p.taxa
      if (rel > 0.3) {
        out.push({
          id: `taxa-up-${currKey}`,
          tone: 'warning',
          title: 'Taxa de RNC a subir',
          text: `A taxa subiu de ${fmt(p.taxa)} em ${label(prevKey)} para ${fmt(c.taxa)} em ${label(currKey)}. Sugiro investigar o que mudou: tipo de trabalhos, material, manutenção?`,
        })
      } else if (rel < -0.2) {
        out.push({
          id: `taxa-down-${currKey}`,
          tone: 'success',
          title: 'Taxa de RNC a descer',
          text: `Boa notícia: a taxa desceu de ${fmt(p.taxa)} em ${label(prevKey)} para ${fmt(c.taxa)} em ${label(currKey)}. O que quer que tenham mudado, está a funcionar.`,
        })
      }
    }
  }

  // 3) Num mês específico: máquinas ativas sem registos (relatório em falta?).
  if (!ctx.isYear) {
    const missing = active.filter((m) => !records.some((r) => r.machineId === m.id))
    if (missing.length > 0 && missing.length < active.length) {
      out.push({
        id: `missing-${ctx.periodLabel}`,
        tone: 'neutral',
        title: `Sem registos: ${missing.map((m) => m.name).join(', ')}`,
        text: `Em ${ctx.periodLabel} não há registos destas máquinas. Falta importar o relatório, ou estiveram paradas?`,
      })
    }
  }

  // 4) RNC sem causa registada — impede a futura análise de causas.
  const semCausa = records
    .filter((r) => n(r.rnc) > 0 && !r.cause)
    .reduce((acc, r) => acc + n(r.rnc), 0)
  if (semCausa > 0) {
    out.push({
      id: `causes-${ctx.periodLabel}`,
      tone: 'neutral',
      title: `${semCausa} RNC sem causa registada`,
      text: 'Quando as causas forem registadas, consigo mostrar que problemas geram mais defeitos (análise de Pareto) — é o passo que mais ajuda a decidir onde atacar.',
    })
  }

  // 5) Nota positiva: máquinas sem nenhum defeito no período.
  const perfect = rated.filter((x) => x.a.taxa === 0)
  if (perfect.length > 0) {
    out.push({
      id: `perfect-${ctx.periodLabel}`,
      tone: 'success',
      title: `Sem RNC: ${perfect.map((x) => x.m.name).join(', ')}`,
      text: `Zero defeitos em ${ctx.periodLabel}. Vale a pena perceber o que estas máquinas/trabalhos têm de diferente.`,
    })
  }

  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]).slice(0, 3)
}
