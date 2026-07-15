import fs from 'node:fs'

const path = 'src/views/Dashboard.tsx'
let source = fs.readFileSync(path, 'utf8')

function replaceOnce(search, replacement, label) {
  if (!source.includes(search)) {
    throw new Error(`Não foi encontrado o bloco: ${label}`)
  }
  source = source.replace(search, replacement)
}

replaceOnce(
`  const pts = values
    .map((v, i) => \`${'${'}((i / (values.length - 1)) * w).toFixed(1)},${'${'}(h - ((v - min) / range) * (h - 6) - 3).toFixed(1)}\`)
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden="true">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className="omp-spark"
        opacity={0.9}
      />
    </svg>
  )`,
`  const points = values.map((v, i) => ({
    x: (i / (values.length - 1)) * w,
    y: h - ((v - min) / range) * (h - 6) - 3,
  }))
  const pts = points.map((p) => \`${'${'}p.x.toFixed(1)},${'${'}p.y.toFixed(1)}\`).join(' ')
  const last = points.at(-1)!
  return (
    <svg width={w} height={h} className="overflow-visible" role="img" aria-label="Evolução mensal do indicador">
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={100}
        className="omp-spark"
        opacity={0.9}
      />
      <circle cx={last.x} cy={last.y} r="3" fill={color} stroke="var(--card)" strokeWidth="1.5" />
    </svg>
  )`,
  'sparkline com ponto final',
)

replaceOnce(
`  // Período anterior (mês com dados imediatamente antes, ou ano anterior com dados).
  const { prevAgg, prevLabel } = useMemo(() => {
    if (isYear) {
      const years = [...new Set(allRecords.map((r) => r.year))].sort((x, y) => x - y)
      const i = years.indexOf(year)
      if (i <= 0) return { prevAgg: null, prevLabel: '' }
      const py = years[i - 1]
      return { prevAgg: aggregate(allRecords.filter((r) => r.year === py)), prevLabel: \`vs ${'${'}py}\` }
    }
    const keys = [...new Set(allRecords.map((r) => r.year * 12 + r.month))].sort((x, y) => x - y)
    const i = keys.indexOf(year * 12 + (month ?? 0))
    if (i <= 0) return { prevAgg: null, prevLabel: '' }
    const pk = keys[i - 1]
    const pm = ((pk % 12) + 12) % 12
    return {
      prevAgg: aggregate(allRecords.filter((r) => r.year * 12 + r.month === pk)),
      prevLabel: \`vs ${'${'}MONTHS[pm]}\`,
    }
  }, [allRecords, isYear, year, month])`,
`  // Tendência mensal: compara sempre o último mês visível com o mês anterior.
  // No ano inteiro usa os dois últimos meses com dados; num mês específico usa até esse mês.
  const { trendCurrent, trendPrevious, prevLabel } = useMemo(() => {
    const yearRecords = recordsFor(db, { year })
    const visibleMonths = [...new Set(yearRecords.map((r) => r.month))]
      .filter((m) => isYear || m <= (month ?? 11))
      .sort((x, y) => x - y)
    if (visibleMonths.length < 2) {
      return { trendCurrent: null, trendPrevious: null, prevLabel: '' }
    }
    const currentMonth = visibleMonths.at(-1)!
    const previousMonth = visibleMonths.at(-2)!
    return {
      trendCurrent: aggregate(yearRecords.filter((r) => r.month === currentMonth)),
      trendPrevious: aggregate(yearRecords.filter((r) => r.month === previousMonth)),
      prevLabel: \`${'${'}MONTHS[currentMonth]} vs ${'${'}MONTHS[previousMonth]}\`,
    }
  }, [db, isYear, year, month])`,
  'comparação mensal dos KPI',
)

replaceOnce(
`    const keys = [...new Set(yearRecords.map((r) => r.month))].sort((x, y) => x - y)`,
`    const keys = [...new Set(yearRecords.map((r) => r.month))]
      .filter((m) => isYear || m <= (month ?? 11))
      .sort((x, y) => x - y)`,
  'filtro temporal das sparklines',
)

source = source.replace('  }, [db, year])', '  }, [db, isYear, year, month])')

replaceOnce(
`  const taxaOk = a.taxa !== null && a.taxa <= targetTaxa

`,
``,
  'estado visual da meta de taxa',
)

source = source
  .replace('delta={deltaOf(a.of, prevAgg ? prevAgg.of : null, true)}', 'delta={deltaOf(trendCurrent?.of ?? 0, trendPrevious?.of ?? null, true)}')
  .replace('delta={deltaOf(a.rnc, prevAgg ? prevAgg.rnc : null, false)}', 'delta={deltaOf(trendCurrent?.rnc ?? 0, trendPrevious?.rnc ?? null, false)}')
  .replace(
    'delta={deltaOf(a.taxa ?? 0, prevAgg && prevAgg.taxa !== null ? prevAgg.taxa : null, false, true)}',
    'delta={deltaOf(trendCurrent?.taxa ?? 0, trendPrevious?.taxa ?? null, false, true)}',
  )
  .replace(
    'delta={deltaOf(a.ofRnc ?? 0, prevAgg && prevAgg.ofRnc !== null ? prevAgg.ofRnc : null, true)}',
    'delta={deltaOf(trendCurrent?.ofRnc ?? 0, trendPrevious?.ofRnc ?? null, true)}',
  )

replaceOnce(
`          extra={
            <span
              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap"
              style={{
                color: taxaOk ? 'var(--success)' : 'var(--destructive)',
                borderColor: \`color-mix(in srgb, ${'${'}taxaOk ? 'var(--success)' : 'var(--destructive)'} 40%, transparent)\`,
              }}
              title="Meta definida em Configurações"
            >
              Meta ≤ {String(targetTaxa).replace('.', ',')}%
            </span>
          }
`,
``,
  'badge de meta de taxa',
)

fs.writeFileSync(path, source)
console.log('Dashboard KPI atualizado com sparklines progressivas, ponto final e variação mensal.')
