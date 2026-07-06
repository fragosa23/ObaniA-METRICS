function monthKey(year,month){return year*12+month}
function monthLabel(year,month){return `${MONTHS[month].slice(0,3)} ${year}`}
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
function renderDashboard(){
  const records=recordsFor(db,{});
  const years=records.map(r=>r.year);
  const thisYear=years.length?Math.max(...years):new Date().getFullYear();
  const yearRecords=recordsFor(db,{year:thisYear});
  const topOf=topMachines(yearRecords,"of",3,true);
  const worstRnc=topMachines(yearRecords,"rnc",3,true);
  $("dashboard").innerHTML=`<div class="card"><h2>Dashboard — ${thisYear}</h2>${kpis(yearRecords)}<p class="small">Clica em OF/RNC para ir à produção. Clica numa secção ou máquina para abrir a ficha respetiva.</p></div>${healthCard(yearRecords,records)}<div class="row">${pieChart("RNC por secção", "rnc", yearRecords)}${pieChart("OF por secção", "of", yearRecords)}</div><div class="row">${machineRankingCard("Top 3 máquinas com mais trabalho",topOf,"of")}${machineRankingCard("Piores 3 máquinas com mais RNC",worstRnc,"rnc")}</div><div class="card"><h2>Alertas</h2>${alerts(records)}</div>`;
}
