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

// ---------------------------------------------------------------------------
// Análises por gráfico (página Produção e ficha da máquina)
// ---------------------------------------------------------------------------

function monthlyOf(records: ProductionRecord[]): { month: number; of: number; rnc: number }[] {
  const keys = [...new Set(records.map((r) => r.month))].sort((a, b) => a - b)
  return keys.map((m) => {
    const a = aggregate(records.filter((r) => r.month === m))
    return { month: m, of: a.of, rnc: a.rnc }
  })
}

function ins(id: string, tone: Tone, title: string, text: string): Insight {
  return { id, tone, title, text }
}

/** Análise do gráfico "Trabalhos e defeitos por máquina" (todas as máquinas do ano). */
export function reviewMachinesChart(db: Db, year: number): Insight[] {
  const recs = db.productionRecords.filter((r) => r.year === year)
  if (!recs.length) return [ins(`rmc-${year}`, 'neutral', 'Sem dados', `Ainda não há registos em ${year}.`)]
  const out: Insight[] = []
  const total = aggregate(recs)
  out.push(
    ins(`rmc-tot-${year}`, 'neutral', `Ano ${year} em resumo`, `${total.of.toLocaleString('pt-PT')} OF e ${total.rnc} RNC no total — taxa média de ${fmt(total.taxa)}.`),
  )
  const active = db.machines
    .filter((m) => m.status !== 'discontinued')
    .map((m) => ({ m, a: aggregate(recs.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.a.of > 0)
  const sorted = [...active].sort((x, y) => (x.a.taxa || 0) - (y.a.taxa || 0))
  const best = sorted[0]
  const worst = sorted[sorted.length - 1]
  if (best && worst && best.m.id !== worst.m.id) {
    out.push(
      ins(`rmc-best-${year}`, 'success', `${best.m.name} é a melhor máquina`, `Taxa de ${fmt(best.a.taxa)} em ${best.a.of} OF — a média mais baixa de defeitos entre as ${sorted.length} ativas.`),
      ins(`rmc-worst-${year}`, (worst.a.taxa || 0) > 5 ? 'danger' : 'warning', `${worst.m.name} é a que mais preocupa`, `Taxa de ${fmt(worst.a.taxa)} (${worst.a.rnc} RNC em ${worst.a.of} OF). É onde uma melhoria teria mais impacto.`),
    )
  }
  const secs = db.sections
    .map((s) => ({ s, a: aggregate(recs.filter((r) => r.sectionId === s.id)) }))
    .filter((x) => x.a.of > 0)
  if (secs.length > 1) {
    const bySec = [...secs].sort((x, y) => (x.a.taxa || 0) - (y.a.taxa || 0))
    out.push(
      ins(`rmc-sec-${year}`, 'neutral', 'Comparação entre secções', `${bySec[0].s.name} está melhor (${fmt(bySec[0].a.taxa)}) do que ${bySec[bySec.length - 1].s.name} (${fmt(bySec[bySec.length - 1].a.taxa)}).`),
    )
  }
  return out
}

/** Análise do gráfico "Tendência ao longo dos meses". */
export function reviewTrendChart(db: Db, year: number): Insight[] {
  const recs = db.productionRecords.filter((r) => r.year === year)
  if (!recs.length) return [ins(`rtc-${year}`, 'neutral', 'Sem dados', `Ainda não há registos em ${year}.`)]
  const out: Insight[] = []
  const perMachine = db.machines
    .map((m) => ({ m, series: monthlyOf(recs.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.series.length >= 2 && x.m.status !== 'discontinued')
  if (!perMachine.length) return [ins(`rtc2-${year}`, 'neutral', 'Poucos meses', 'Ainda não há meses suficientes para ver tendências.')]

  const withDelta = perMachine.map((x) => {
    const first = x.series[0]
    const last = x.series[x.series.length - 1]
    return { ...x, delta: last.of - first.of, firstOf: first.of, lastOf: last.of, firstM: first.month, lastM: last.month }
  })
  const up = [...withDelta].sort((a, b) => b.delta - a.delta)[0]
  const down = [...withDelta].sort((a, b) => a.delta - b.delta)[0]
  if (up && up.delta > 0) {
    out.push(
      ins(`rtc-up-${year}`, 'success', `${up.m.name} é a que mais cresce`, `Passou de ${up.firstOf} OF em ${MONTHS[up.firstM]} para ${up.lastOf} em ${MONTHS[up.lastM]}.`),
    )
  }
  if (down && down.delta < 0 && down.m.id !== up?.m.id) {
    out.push(
      ins(`rtc-down-${year}`, 'warning', `${down.m.name} está a produzir menos`, `Desceu de ${down.firstOf} OF em ${MONTHS[down.firstM]} para ${down.lastOf} em ${MONTHS[down.lastM]}. Vale a pena perceber porquê (menos encomendas? paragens?).`),
    )
  }
  // Máquina mais estável (menor variação relativa entre meses).
  const steadiest = [...withDelta].sort(
    (a, b) => Math.abs(a.delta) / Math.max(a.firstOf, 1) - Math.abs(b.delta) / Math.max(b.firstOf, 1),
  )[0]
  if (steadiest) {
    out.push(
      ins(`rtc-steady-${year}`, 'neutral', `${steadiest.m.name} é a mais estável`, 'Produção quase constante ao longo dos meses — bom sinal de previsibilidade.'),
    )
  }
  return out.slice(0, 3)
}

/** Análise de um cartão de evolução — máquina individual. */
export function reviewMachineEvolution(db: Db, machineId: string, year: number): Insight[] {
  const machine = db.machines.find((m) => m.id === machineId)
  const name = machine?.name ?? machineId
  const recs = db.productionRecords.filter((r) => r.machineId === machineId && r.year === year)
  if (!recs.length) return [ins(`rme-${machineId}-${year}`, 'neutral', 'Sem dados', `A ${name} não tem registos em ${year}.`)]
  const out: Insight[] = []
  const a = aggregate(recs)

  if (machine?.status === 'discontinued') {
    out.push(ins(`rme-disc-${machineId}`, 'neutral', 'Máquina descontinuada', 'Já não está em produção — estes dados ficam como histórico.'))
  }

  // Posição no ranking de taxa entre as ativas do ano.
  const peers = db.machines
    .filter((m) => m.status !== 'discontinued')
    .map((m) => ({ m, a: aggregate(db.productionRecords.filter((r) => r.machineId === m.id && r.year === year)) }))
    .filter((x) => x.a.of > 0)
    .sort((x, y) => (x.a.taxa || 0) - (y.a.taxa || 0))
  const pos = peers.findIndex((x) => x.m.id === machineId)
  const others = aggregate(db.productionRecords.filter((r) => r.machineId !== machineId && r.year === year))
  if (pos === 0 && peers.length > 1) {
    out.push(
      ins(`rme-best-${machineId}-${year}`, 'success', `Melhor prestação do ano`, `Taxa de ${fmt(a.taxa)} — a mais baixa das ${peers.length} máquinas ativas (média das outras: ${fmt(others.taxa)}).`),
    )
  } else if (pos === peers.length - 1 && peers.length > 1 && machine?.status !== 'discontinued') {
    out.push(
      ins(`rme-worst-${machineId}-${year}`, (a.taxa || 0) > 5 ? 'danger' : 'warning', 'Pior taxa entre as ativas', `${fmt(a.taxa)} contra ${fmt(others.taxa)} das restantes. É a candidata nº 1 a investigação.`),
    )
  } else if (pos > 0) {
    const better = (a.taxa || 0) <= (others.taxa || 0)
    out.push(
      ins(`rme-pos-${machineId}-${year}`, better ? 'success' : 'neutral', `${pos + 1}ª melhor taxa (em ${peers.length})`, `Média de ${fmt(a.taxa)}, ${better ? 'melhor' : 'pior'} que a média das outras (${fmt(others.taxa)}).`),
    )
  }

  // Mês em que os RNC mais subiram + mês de melhor produção.
  const series = monthlyOf(recs)
  let jumpIdx = -1
  let jump = 0
  series.forEach((s, i) => {
    if (i > 0) {
      const d = s.rnc - series[i - 1].rnc
      if (d > jump) { jump = d; jumpIdx = i }
    }
  })
  if (jumpIdx > 0) {
    const stillBetter = (a.taxa || 0) <= (others.taxa || 0)
    out.push(
      ins(`rme-jump-${machineId}-${year}`, 'warning', `RNC subiram em ${MONTHS[series[jumpIdx].month]}`, `De ${series[jumpIdx - 1].rnc} para ${series[jumpIdx].rnc}${stillBetter ? ' — mas mesmo assim a média do ano continua melhor que a das outras máquinas' : ''}.`),
    )
  }
  const bestMonth = [...series].sort((x, y) => y.of - x.of)[0]
  if (bestMonth && series.length > 1) {
    out.push(
      ins(`rme-peak-${machineId}-${year}`, 'neutral', `Melhor mês: ${MONTHS[bestMonth.month]}`, `${bestMonth.of} OF produzidas — o pico do ano desta máquina.`),
    )
  }
  return out.slice(0, 4)
}

/** Análise de um cartão de evolução — secção inteira. */
export function reviewSectionEvolution(db: Db, sectionId: string, year: number): Insight[] {
  const section = db.sections.find((s) => s.id === sectionId)
  const name = section?.name ?? sectionId
  const recs = db.productionRecords.filter((r) => r.sectionId === sectionId && r.year === year)
  if (!recs.length) return [ins(`rse-${sectionId}-${year}`, 'neutral', 'Sem dados', `A secção ${name} não tem registos em ${year}.`)]
  const out: Insight[] = []
  const a = aggregate(recs)
  out.push(ins(`rse-tot-${sectionId}-${year}`, 'neutral', `${name} em ${year}`, `${a.of.toLocaleString('pt-PT')} OF, ${a.rnc} RNC — taxa de ${fmt(a.taxa)}.`))

  const machines = db.machines
    .filter((m) => m.sectionId === sectionId && m.status !== 'discontinued')
    .map((m) => ({ m, a: aggregate(recs.filter((r) => r.machineId === m.id)) }))
    .filter((x) => x.a.of > 0)
    .sort((x, y) => (x.a.taxa || 0) - (y.a.taxa || 0))
  if (machines.length > 1) {
    const best = machines[0]
    const worst = machines[machines.length - 1]
    out.push(
      ins(`rse-best-${sectionId}-${year}`, 'success', `${best.m.name} puxa pela secção`, `Melhor taxa da ${name}: ${fmt(best.a.taxa)}.`),
      ins(`rse-worst-${sectionId}-${year}`, (worst.a.taxa || 0) > 5 ? 'danger' : 'warning', `${worst.m.name} é o ponto fraco`, `Pior taxa da secção: ${fmt(worst.a.taxa)} (${worst.a.rnc} RNC).`),
    )
  }
  // Último mês vs anterior.
  const series = monthlyOf(recs)
  if (series.length >= 2) {
    const last = series[series.length - 1]
    const prev = series[series.length - 2]
    if (last.rnc < prev.rnc) {
      out.push(ins(`rse-last-${sectionId}-${year}`, 'success', `${MONTHS[last.month]} melhorou`, `Os RNC desceram de ${prev.rnc} para ${last.rnc} face a ${MONTHS[prev.month]}.`))
    } else if (last.rnc > prev.rnc) {
      out.push(ins(`rse-last-${sectionId}-${year}`, 'warning', `${MONTHS[last.month]} piorou`, `Os RNC subiram de ${prev.rnc} para ${last.rnc} face a ${MONTHS[prev.month]}.`))
    }
  }
  return out.slice(0, 4)
}
