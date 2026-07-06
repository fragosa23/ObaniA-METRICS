function sectionTable(rows,section,avg){
  const list=rows.filter(d=>d.s===section);
  const of=list.reduce((a,d)=>a+num(d.of),0),r=list.reduce((a,d)=>a+num(d.rnc),0),tr=of?r/of*100:null;
  let html="<table><tr><th>Máquina</th><th>OF</th><th>RNC</th><th>RNC/100 OF</th></tr>";
  list.forEach(d=>{const v=rate(d);html+=`<tr><td>${d.m}</td><td>${num(d.of)}</td><td>${num(d.rnc)}</td><td class="${rateClass(v,avg)}">${fmt(v)}</td></tr>`;});
  html+=`<tr><th>Total</th><th>${of}</th><th>${r}</th><th>${fmt(tr)}</th></tr></table>`;
  return{html,of,r,tr};
}

function reportHTML(title,rows,extraTrend=""){
  const st=stats(rows),avg=st.avg;
  const flex=sectionTable(rows,"Flexografia",avg),roto=sectionTable(rows,"Rotogravura",avg);
  let best="—";
  if(flex.of>0&&roto.of>0)best=flex.tr<roto.tr?"Flexografia":roto.tr<flex.tr?"Rotogravura":"Equivalente";
  const ranked=[...rows].map(d=>({...d,taxa:rate(d)})).filter(d=>d.taxa!==null).sort((a,b)=>b.taxa-a.taxa);
  const above=ranked.filter(d=>(d.taxa||0)>avg),critical=ranked.filter(d=>(d.taxa||0)>5);
  const msg=st.of===0?["Ainda não há dados suficientes."]:[
    critical.length?`<b>Crítico:</b> ${critical.map(d=>d.m+" ("+fmt(d.taxa)+")").join(", ")}.`:"",
    above.length?`<b>Acima da média:</b> ${above.map(d=>d.m).join(", ")}.`:"Não há máquinas acima da média global.",
    "O volume de trabalhos não justifica, por si só, o número de não conformidades. Recomenda-se análise de causa-raiz.",
    `Melhor desempenho por secção: <b>${best}</b>.`
  ].filter(Boolean);
  return `<div class="card"><h2>${title}</h2><div class="grid"><div class="kpi">Total OF<b>${st.of}</b></div><div class="kpi">Total RNC<b>${st.rnc}</b></div><div class="kpi">Taxa global<b>${fmt(avg)}</b></div><div class="kpi">Melhor secção<b>${best}</b></div></div></div><div class="card"><h2>Ranking — taxa RNC por 100 OF</h2>${barRanking(rows,avg)}<div class="small">Verde só em 0%. Amarelo >0 até média. Laranja acima da média até 5%. Vermelho >5%.</div></div><div class="row"><div class="card"><h2>Flexografia</h2>${flex.html}</div><div class="card"><h2>Rotogravura</h2>${roto.html}</div></div>${extraTrend}<div class="card alert"><h2>Alerta automático</h2><p>${msg.join("</p><p>")}</p></div>`;
}

function trendYearHTML(year){
  const items=[];
  for(let m=0;m<12;m++){
    const rows=loadMonthData(year,m),st=stats(rows);
    if(st.of>0)items.push({m:MONTHS[m],of:st.of,rnc:st.rnc,taxa:st.avg});
  }
  if(!items.length)return `<div class="card"><h2>Evolução mensal</h2><p class="small">Sem meses guardados neste ano.</p></div>`;
  const max=Math.max(...items.map(i=>i.taxa),1);
  const bars=items.map(i=>`<div class="barline"><div class="section-tag">${i.m}</div><div class="barbox"><div class="bar red" style="width:${Math.max(3,i.taxa/max*100)}%;background:var(--azul)">${fmt(i.taxa)}</div></div><div class="small">${i.of} OF / ${i.rnc} RNC</div></div>`).join("");
  return `<div class="card"><h2>Evolução mensal do ano</h2>${bars}</div>`;
}

function sectionMetrics(rows){
  const total=stats(rows);
  return ["Flexografia","Rotogravura"].map(section=>{
    const list=rows.filter(d=>d.s===section);
    const of=list.reduce((a,d)=>a+num(d.of),0);
    const rnc=list.reduce((a,d)=>a+num(d.rnc),0);
    const taxa=of?rnc/of*100:null;
    const ofShare=total.of?of/total.of*100:0;
    const rncShare=total.rnc?rnc/total.rnc*100:0;
    const ofPerRnc=rnc?of/rnc:null;
    const loadDefectIndex=rncShare?ofShare/rncShare:null;
    const qualityScore=taxa===null?0:Math.max(0,100-taxa);
    return{section,of,rnc,taxa,ofShare,rncShare,ofPerRnc,loadDefectIndex,qualityScore};
  });
}

function metricBar(label,value,max,suffix="",invert=false){
  const width=max?Math.max(3,(value/max)*100):3;
  const bg=invert?"var(--vermelho)":"var(--azul)";
  return `<div class="barline"><div class="compare-bar-label">${label}</div><div class="barbox"><div class="bar red" style="width:${width}%;background:${bg}">${value.toFixed(2).replace(".",",")}${suffix}</div></div></div>`;
}

function comparisonHTML(title,rows){
  const total=stats(rows),metrics=sectionMetrics(rows);
  const flex=metrics.find(m=>m.section==="Flexografia"),roto=metrics.find(m=>m.section==="Rotogravura");
  let bestQuality="—",bestProductivity="—",bestRelative="—";
  if(flex.of||roto.of){
    bestQuality=(flex.taxa??Infinity)<(roto.taxa??Infinity)?"Flexografia":(roto.taxa??Infinity)<(flex.taxa??Infinity)?"Rotogravura":"Equivalente";
    bestProductivity=flex.of>roto.of?"Flexografia":roto.of>flex.of?"Rotogravura":"Equivalente";
    bestRelative=(flex.loadDefectIndex??0)>(roto.loadDefectIndex??0)?"Flexografia":(roto.loadDefectIndex??0)>(flex.loadDefectIndex??0)?"Rotogravura":"Equivalente";
  }
  const maxOf=Math.max(...metrics.map(m=>m.of),1),maxRnc=Math.max(...metrics.map(m=>m.rnc),1),maxTaxa=Math.max(...metrics.map(m=>m.taxa||0),1),maxOfRnc=Math.max(...metrics.map(m=>m.ofPerRnc||0),1);
  const table=`<table><tr><th>Secção</th><th>OF</th><th>% OF</th><th>RNC</th><th>% RNC</th><th>Taxa RNC/100 OF</th><th>OF por RNC</th><th>Índice carga/defeitos</th></tr>${metrics.map(m=>`<tr><td>${m.section}</td><td>${m.of}</td><td>${fmt(m.ofShare)}</td><td>${m.rnc}</td><td>${fmt(m.rncShare)}</td><td class="${rateClass(m.taxa,total.avg)}">${fmt(m.taxa)}</td><td>${m.ofPerRnc===null?"Sem RNC":m.ofPerRnc.toFixed(1).replace(".",",")}</td><td>${m.loadDefectIndex===null?"N/A":m.loadDefectIndex.toFixed(2).replace(".",",")}</td></tr>`).join("")}</table>`;
  const cards=`<div class="comparison-grid"><div class="metric-card">Mais trabalhos<br><b>${bestProductivity}</b></div><div class="metric-card">Melhor qualidade<br><b>${bestQuality}</b></div><div class="metric-card">Melhor relação carga/defeitos<br><b>${bestRelative}</b></div><div class="metric-card">Taxa global<br><b>${fmt(total.avg)}</b></div></div>`;
  const charts=`<div class="row"><div class="card"><h2>Trabalhos por secção</h2>${metrics.map(m=>metricBar(m.section,m.of,maxOf,"",false)).join("")}</div><div class="card"><h2>RNC por secção</h2>${metrics.map(m=>metricBar(m.section,m.rnc,maxRnc,"",true)).join("")}</div></div><div class="row"><div class="card"><h2>Taxa RNC por 100 OF</h2>${metrics.map(m=>metricBar(m.section,m.taxa||0,maxTaxa,"%",true)).join("")}</div><div class="card"><h2>OF por RNC</h2>${metrics.map(m=>metricBar(m.section,m.ofPerRnc||0,maxOfRnc,"",false)).join("")}<div class="small">Quanto maior, melhor: significa mais trabalhos por cada RNC.</div></div></div>`;
  const conclusion=`<div class="card"><div class="winner">Conclusão operacional: melhor qualidade = ${bestQuality}. Melhor relação carga/defeitos = ${bestRelative}.</div><p class="note">Atenção: isto ainda não mede rentabilidade real em euros. Para saber qual secção é mais rentável faltam dados como margem por trabalho, metros/kg produzidos, horas gastas, desperdício, paragens, retrabalho e custo médio de cada RNC. Esta página compara desempenho operacional e qualidade com os dados disponíveis.</p></div>`;
  return `<div class="card"><h2>${title}</h2>${cards}</div><div class="card"><h2>Tabela comparativa</h2>${table}</div>${charts}${conclusion}`;
}
