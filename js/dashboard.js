function monthKey(year,month){return year*12+month}
function monthLabel(year,month){return `${MONTHS[month].slice(0,3)} ${year}`}
function monthlySeries(records,monthsBack=12){
  if(!records.length)return [];
  const maxKey=Math.max(...records.map(r=>monthKey(r.year,r.month)));
  const out=[];
  for(let k=maxKey-monthsBack+1;k<=maxKey;k++){
    const year=Math.floor(k/12),month=k%12;
    const recs=records.filter(r=>monthKey(r.year,r.month)===k);
    const a=aggregate(recs);
    out.push({year,month,label:monthLabel(year,month),...a,health:healthIndex(recs,records).score});
  }
  return out;
}
function healthIndex(currentRecords,allRecords){
  const a=aggregate(currentRecords);
  let score=100;
  const taxa=a.taxa||0;
  score-=Math.min(45,taxa*7);
  const machineAlerts=db.machines.filter(m=>{const ma=aggregate(currentRecords.filter(r=>r.machineId===m.id));return ma.of>0 && (ma.taxa||0)>5}).length;
  score-=Math.min(20,machineAlerts*5);
  const sections=sectionTotals(currentRecords).filter(s=>s.of>0);
  if(sections.length>1){const rates=sections.map(s=>s.taxa||0);score-=Math.min(10,Math.abs(rates[0]-rates[1])*2)}
  const series=monthlySeriesBase(allRecords,3);
  if(series.length>=2){const last=series[series.length-1].taxa||0,prev=series[series.length-2].taxa||0;if(last>prev)score-=Math.min(15,(last-prev)*4);else score+=Math.min(5,(prev-last)*2)}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const label=score>=90?"Excelente":score>=80?"Bom":score>=70?"Atenção":score>=60?"Mau":"Crítico";
  return{score,label};
}
function monthlySeriesBase(records,monthsBack=12){
  if(!records.length)return [];
  const maxKey=Math.max(...records.map(r=>monthKey(r.year,r.month)));
  const out=[];
  for(let k=maxKey-monthsBack+1;k<=maxKey;k++){
    const year=Math.floor(k/12),month=k%12;
    const recs=records.filter(r=>monthKey(r.year,r.month)===k);
    const a=aggregate(recs);
    out.push({year,month,label:monthLabel(year,month),...a});
  }
  return out;
}
function healthCard(records,allRecords){
  const h=healthIndex(records,allRecords);
  const cls=h.score>=80?"health-good":h.score>=70?"health-warn":h.score>=60?"health-bad":"health-critical";
  return `<div class="card click-card" onclick="show('stats')"><h2>Índice de Saúde da Produção</h2><div class="health ${cls}"><div class="health-score">${h.score}</div><div><b>${h.label}</b><p class="small">0 a 100. Clica para abrir estatísticas.</p></div></div><div class="healthbar"><span style="width:${h.score}%"></span></div></div>`;
}
function trendChart(records){
  const s=monthlySeriesBase(records,12);
  if(!s.length)return `<div class="card"><h2>Tendência</h2><p class="small">Sem dados suficientes.</p></div>`;
  const maxOf=Math.max(...s.map(x=>x.of),1),maxRnc=Math.max(...s.map(x=>x.rnc),1),maxTaxa=Math.max(...s.map(x=>x.taxa||0),1);
  return `<div class="card"><h2>Tendência últimos 12 meses</h2><div class="trend-grid">${s.map(x=>`<div class="trend-col" title="${x.label}: ${x.of} OF / ${x.rnc} RNC / ${fmt(x.taxa)}"><div class="trend-bars"><span class="of" style="height:${Math.max(4,x.of/maxOf*100)}%"></span><span class="rnc" style="height:${Math.max(4,x.rnc/maxRnc*100)}%"></span><span class="taxa" style="height:${Math.max(4,(x.taxa||0)/maxTaxa*100)}%"></span></div><small>${x.label}</small></div>`).join("")}</div><div class="small"><b>Azul:</b> OF · <b>Laranja:</b> RNC · <b>Vermelho:</b> taxa</div></div>`;
}
function forecastCard(records){
  const year=Math.max(...records.map(r=>r.year));
  const yearRecords=records.filter(r=>r.year===year);
  const months=[...new Set(yearRecords.map(r=>r.month))].length||1;
  const a=aggregate(yearRecords);
  const projectedRnc=Math.round(a.rnc/months*12);
  const projectedOf=Math.round(a.of/months*12);
  return `<div class="card"><h2>Previsão automática</h2><p>Se a média atual continuar, ${year} pode terminar com aproximadamente:</p><div class="grid"><div class="kpi">OF previstos<b>${projectedOf}</b></div><div class="kpi">RNC previstas<b>${projectedRnc}</b></div><div class="kpi">Taxa atual<b>${fmt(a.taxa)}</b></div></div><p class="small">Previsão simples baseada na média mensal dos dados registados no ano.</p></div>`;
}
function renderDashboard(){
  const records=recordsFor(db,{});
  const years=records.map(r=>r.year);
  const thisYear=years.length?Math.max(...years):new Date().getFullYear();
  const yearRecords=recordsFor(db,{year:thisYear});
  const topOf=topMachines(yearRecords,"of",3,true);
  const worstRnc=topMachines(yearRecords,"rnc",3,true);
  $("dashboard").innerHTML=`<div class="card"><h2>Dashboard — ${thisYear}</h2>${kpis(yearRecords)}<p class="small">Clica em OF/RNC para ir à produção. Clica numa secção ou máquina para abrir a ficha respetiva.</p></div>${healthCard(yearRecords,records)}<div class="row">${pieChart("RNC por secção", "rnc", yearRecords)}${pieChart("OF por secção", "of", yearRecords)}</div><div class="row">${machineRankingCard("Top 3 máquinas com mais trabalho",topOf,"of")}${machineRankingCard("Piores 3 máquinas com mais RNC",worstRnc,"rnc")}</div>${trendChart(records)}${forecastCard(records)}<div class="card"><h2>Alertas</h2>${alerts(records)}</div>`;
}
