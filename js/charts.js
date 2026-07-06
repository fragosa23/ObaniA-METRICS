function rate(row){const of=num(row.of),rnc=num(row.rnc);return of>0?(rnc/of*100):null;}
function fmt(value){return value===null||Number.isNaN(value)?"N/A":value.toFixed(2).replace(".",",")+"%";}
function rateClass(value,avg){if(value===null)return"";if(value===0)return"rate0";if(value<=avg)return"rate-low";if(value<=5)return"rate-mid";return"rate-high";}
function rateColor(value,avg){if(value===0)return"var(--verde)";if(value<=avg)return"var(--amarelo)";if(value<=5)return"var(--laranja)";return"var(--vermelho)";}
function stats(rows){const of=rows.reduce((a,d)=>a+num(d.of),0),rnc=rows.reduce((a,d)=>a+num(d.rnc),0);return{of,rnc,avg:of?rnc/of*100:0};}
function barRanking(rows,avg){
  const ranked=[...rows].map(d=>({...d,taxa:rate(d)})).filter(d=>d.taxa!==null).sort((a,b)=>b.taxa-a.taxa);
  if(!ranked.length)return"<p class='small'>Sem dados guardados.</p>";
  const max=Math.max(...ranked.map(d=>d.taxa||0),1);
  return ranked.map(d=>{
    const v=d.taxa||0,w=Math.max(4,v/max*100),red=v>5?" red":"";
    return `<div class="barline"><div class="name">${d.m}</div><div class="section-tag">${d.s}</div><div class="barbox"><div class="bar${red}" style="width:${w}%;background:${rateColor(v,avg)}">${fmt(v)}</div></div><div class="small">${num(d.of)} OF / ${num(d.rnc)} RNC</div></div>`;
  }).join("");
}
