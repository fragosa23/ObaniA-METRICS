/* Assistente local: responde apenas com base nos dados do JSON local.
   Tolera erros ortográficos via normalização + distância de Levenshtein. */

function normTxt(s){return String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim()}
function levDist(a,b){
  const m=a.length,n=b.length;
  if(!m)return n;if(!n)return m;
  let prev=Array.from({length:n+1},(_,i)=>i);
  for(let i=1;i<=m;i++){
    const cur=[i];
    for(let j=1;j<=n;j++)cur[j]=Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));
    prev=cur;
  }
  return prev[n];
}
function fuzzyEq(word,target){
  if(word===target)return true;
  if(Math.abs(word.length-target.length)>2)return false;
  const maxD=target.length>=6?2:target.length>=4?1:0;
  return maxD>0&&levDist(word,target)<=maxD;
}
function hasKw(tokens,kws){return kws.some(k=>{const nk=normTxt(k);return nk.includes(" ")?normTxt(tokens.join(" ")).includes(nk):tokens.some(t=>fuzzyEq(t,nk))})}

function findMachineIn(tokens){return db.machines.find(m=>tokens.some(t=>fuzzyEq(t,normTxt(m.name))||t===normTxt(m.id)))}
function findSectionIn(tokens){
  if(hasKw(tokens,["flexografia","flexo"]))return db.sections.find(s=>s.id==="flexo");
  if(hasKw(tokens,["rotogravura","roto"]))return db.sections.find(s=>s.id==="roto");
  return null;
}
function findMonthIn(tokens){for(let i=0;i<MONTHS.length;i++){if(tokens.some(t=>t.length>=4&&fuzzyEq(t,normTxt(MONTHS[i]))))return i}return null}
function findShiftIn(tokens){for(const s of SHIFTS){if(tokens.some(t=>fuzzyEq(t,normTxt(s))))return s}return null}
function findByName(list,nq){return list.find(x=>x.name&&nq.includes(normTxt(x.name)))||null}

function scopeText(f,shift){
  const parts=[];
  if(f.month!==undefined)parts.push(`em ${MONTHS[f.month]}${f.year?" de "+f.year:""}`);
  else if(f.year)parts.push(`em ${f.year}`);
  if(f.machineId)parts.push(`na máquina ${machineName(db,f.machineId)}`);
  if(f.sectionId)parts.push(`na ${sectionName(db,f.sectionId)}`);
  if(f.teamId)parts.push(`na ${teamName(db,f.teamId)}`);
  if(f.workerId)parts.push(`com ${workerName(db,f.workerId)} presente`);
  if(shift)parts.push(`no turno da ${shift.toLowerCase()}`);
  return parts.length?" "+parts.join(", "):" no total dos dados registados";
}
function fmtOfRnc(a){return a.ofRnc?a.ofRnc.toFixed(1).replace(".",","):"sem RNC"}
function taxaLine(a){return `${a.of} OF, ${a.rnc} RNC, taxa ${fmt(a.taxa)}`}

function machineRankingFor(f){
  const recs=recordsFor(db,f);
  return db.machines
    .map(m=>({m,a:aggregate(recs.filter(r=>r.machineId===m.id))}))
    .filter(x=>x.a.of>0);
}
function discontinuedNote(m){return m.status==="discontinued"?` (atenção: ${m.statusNote||"máquina descontinuada"})`:""}

function answerQuestion(q){
  const nq=normTxt(q);
  if(!nq)return "Escreve uma pergunta sobre os dados de produção.";
  const tokens=nq.split(" ");

  // filtros detetados na pergunta
  const f={};
  const machine=findMachineIn(tokens);if(machine)f.machineId=machine.id;
  const section=findSectionIn(tokens);if(section&&!machine)f.sectionId=section.id;
  const team=findByName(db.teams,nq);if(team)f.teamId=team.id;
  const worker=findByName(db.workers,nq);if(worker)f.workerId=worker.id;
  const month=findMonthIn(tokens);if(month!==null)f.month=month;
  const yearMatch=nq.match(/\b(20\d{2})\b/);if(yearMatch)f.year=+yearMatch[1];
  const shift=findShiftIn(tokens);
  let recs=recordsFor(db,f);
  if(shift)recs=recs.filter(r=>recordShift(r)===shift);
  const hasFilters=Object.keys(f).length>0||shift;

  // ajuda
  if(hasKw(tokens,["ajuda","help","exemplo","exemplos","podes fazer","sabes fazer"]))
    return "Posso responder a perguntas como:\n• Qual a pior máquina?\n• Quantas RNC em maio?\n• Taxa da flexografia em 2026\n• Compara flexo e roto\n• Como está o turno da noite?\n• Qual o índice de saúde?\n• Que dados tens?\nAceito erros de escrita — não precisas de escrever perfeito.";

  // dados disponíveis
  if(hasKw(tokens,["que dados","que meses","periodo","dados tens","disponivel","disponiveis"])||(hasKw(tokens,["dados"])&&hasKw(tokens,["tens","existem","registados","quais"]))){
    const all=db.productionRecords;
    if(!all.length)return "Ainda não há registos de produção.";
    const keys=[...new Set(all.map(r=>`${r.year}-${r.month}`))].sort();
    const meses=keys.map(k=>{const[y,m]=k.split("-");return `${MONTHS[+m]} ${y}`});
    return `Tenho ${all.length} registos de produção, cobrindo: ${meses.join(", ")}. Máquinas: ${db.machines.map(m=>m.name).join(", ")}. ${db.teams.length} equipas e ${db.workers.length} trabalhadores registados.`;
  }

  // índice de saúde
  if(hasKw(tokens,["saude","indice","health"])){
    const all=recordsFor(db,{});
    const base=hasFilters?recs:recordsFor(db,{year:Math.max(...all.map(r=>r.year))});
    const h=healthIndex(base,all);
    return `O índice de saúde da produção${scopeText(f,shift)} está em ${h.score}/100 — ${h.label}. É calculado a partir da taxa de RNC, alertas de máquinas, equilíbrio entre secções e evolução recente.`;
  }

  // comparação de secções
  const mentionsBoth=hasKw(tokens,["flexografia","flexo"])&&hasKw(tokens,["rotogravura","roto"]);
  if(mentionsBoth||hasKw(tokens,["compara","comparar","comparacao","versus","vs"])||(hasKw(tokens,["seccao","seccoes"])&&hasKw(tokens,["melhor","pior","mais","menos"]))){
    const base={...f};delete base.sectionId;delete base.machineId;
    let baseRecs=recordsFor(db,base);
    if(shift)baseRecs=baseRecs.filter(r=>recordShift(r)===shift);
    const flex=aggregate(baseRecs.filter(r=>r.sectionId==="flexo"));
    const roto=aggregate(baseRecs.filter(r=>r.sectionId==="roto"));
    if(!flex.of&&!roto.of)return "Não tenho dados suficientes para comparar as secções"+scopeText(base,shift)+".";
    const melhor=(flex.taxa??Infinity)<(roto.taxa??Infinity)?"Flexografia":"Rotogravura";
    return `Comparação${scopeText(base,shift)}:\n• Flexografia: ${taxaLine(flex)}\n• Rotogravura: ${taxaLine(roto)}\nMelhor taxa (menor): ${melhor}. Mais OF: ${flex.of>=roto.of?"Flexografia":"Rotogravura"}.`;
  }

  // pior / melhor máquina
  const asksMachine=hasKw(tokens,["maquina","maquinas"]);
  const asksWorst=hasKw(tokens,["pior","piores","problema","problematica","mais rnc"]);
  const asksBest=hasKw(tokens,["melhor","melhores","menos rnc"]);
  if((asksMachine||!machine)&&(asksWorst||asksBest)&&!team&&!worker){
    const scopeF={...f};delete scopeF.machineId;
    const ranked=machineRankingFor(scopeF).sort((a,b)=>(b.a.taxa||0)-(a.a.taxa||0));
    if(!ranked.length)return "Não tenho dados de máquinas"+scopeText(scopeF,shift)+".";
    const x=asksWorst?ranked[0]:ranked[ranked.length-1];
    return `A ${asksWorst?"pior":"melhor"} máquina por taxa de RNC${scopeText(scopeF,shift)} é a ${x.m.name}${discontinuedNote(x.m)}, com ${taxaLine(x.a)}.`;
  }

  // máquina com mais trabalho
  if(hasKw(tokens,["mais trabalho","mais of","mais producao","mais trabalhos"])){
    const scopeF={...f};delete scopeF.machineId;
    const ranked=machineRankingFor(scopeF).sort((a,b)=>b.a.of-a.a.of);
    if(!ranked.length)return "Não tenho dados de produção"+scopeText(scopeF,shift)+".";
    return `A máquina com mais trabalho${scopeText(scopeF,shift)} é a ${ranked[0].m.name}, com ${taxaLine(ranked[0].a)}.`;
  }

  // turnos
  if(hasKw(tokens,["turno","turnos"])||shift){
    if(shift){
      const a=aggregate(recs);
      if(!a.of)return `Não tenho registos no turno da ${shift.toLowerCase()}${scopeText(f,null)}. Muitos registos importados não têm turno definido.`;
      return `Turno da ${shift.toLowerCase()}${scopeText(f,null)}: ${taxaLine(a)}, OF por RNC: ${fmtOfRnc(a)}.`;
    }
    const rows=SHIFTS.map(s=>{const r=recordsFor(db,f).filter(x=>recordShift(x)===s);return{s,a:aggregate(r)}}).filter(x=>x.a.of>0);
    if(!rows.length)return "Ainda não há registos com turno definido — os dados importados das fotografias não têm turno associado.";
    return "Por turno"+scopeText(f,null)+":\n"+rows.map(x=>`• ${x.s}: ${taxaLine(x.a)}`).join("\n");
  }

  // estatísticas de trabalhadores
  if(hasKw(tokens,["experiencia","nacionalidade","nacionalidades","idade"])||(hasKw(tokens,["trabalhadores","trabalhador"])&&hasKw(tokens,["quantos","media","estatistica"]))){
    if(!db.workers.length)return "Ainda não há trabalhadores registados na Estrutura.";
    const avgExp=db.workers.reduce((a,w)=>a+n(w.yearsPrinting),0)/db.workers.length;
    const nat={};db.workers.forEach(w=>nat[w.nationality||"Não indicado"]=(nat[w.nationality||"Não indicado"]||0)+1);
    return `Há ${db.workers.length} trabalhadores registados. Experiência média em impressão: ${avgExp.toFixed(1).replace(".",",")} anos. Nacionalidades: ${Object.entries(nat).map(([k,v])=>`${k} (${v})`).join(", ")}.`;
  }

  // taxa
  if(hasKw(tokens,["taxa","percentagem"])){
    const a=aggregate(recs);
    if(!a.of)return "Não tenho registos"+scopeText(f,shift)+".";
    return `Taxa de RNC por 100 OF${scopeText(f,shift)}: ${fmt(a.taxa)} (${a.of} OF, ${a.rnc} RNC). OF por RNC: ${fmtOfRnc(a)}. Lembra-te: quanto menor a taxa, melhor.`;
  }

  // totais de RNC
  if(hasKw(tokens,["rnc","nao conformidade","nao conformidades"])){
    const a=aggregate(recs);
    if(!a.of&&!a.rnc)return "Não tenho registos"+scopeText(f,shift)+".";
    return `Registei ${a.rnc} RNC${scopeText(f,shift)}, em ${a.of} OF (taxa ${fmt(a.taxa)}).`;
  }

  // totais de OF
  if(hasKw(tokens,["of","trabalhos","producao","ordens"])){
    const a=aggregate(recs);
    if(!a.of)return "Não tenho registos"+scopeText(f,shift)+".";
    return `Registei ${a.of} OF/trabalhos${scopeText(f,shift)}, com ${a.rnc} RNC (taxa ${fmt(a.taxa)}).`;
  }

  // entidade mencionada sem intenção clara → resumo
  if(hasFilters){
    const a=aggregate(recs);
    if(!a.of&&!a.rnc)return "Não tenho registos"+scopeText(f,shift)+".";
    return `Resumo${scopeText(f,shift)}: ${taxaLine(a)}. OF por RNC: ${fmtOfRnc(a)}.`;
  }

  return "Não consegui perceber a pergunta. Experimenta algo como: \"qual a pior máquina?\", \"quantas RNC em maio?\", \"taxa da flexografia\" ou escreve \"ajuda\" para veres exemplos.";
}

/* ===== UI do chat ===== */
let chatHistory=[];
function escHtml(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function appendMsg(role,text,remember=true){
  if(remember)chatHistory.push({role,text});
  const log=$("chatLog");if(!log)return;
  const div=document.createElement("div");
  div.className="msg "+role;
  div.innerHTML=escHtml(text);
  log.appendChild(div);
  log.scrollTop=log.scrollHeight;
}
function sendChat(preset){
  const input=$("chatInput");
  const q=(preset||input.value).trim();
  if(!q)return;
  appendMsg("user",q);
  input.value="";
  appendMsg("bot",answerQuestion(q));
  input.focus();
}
function initChat(){
  chatHistory.forEach(m=>appendMsg(m.role,m.text,false));
  if(!chatHistory.length)appendMsg("bot","Olá! Pergunta-me o que quiseres sobre os dados de produção — máquinas, RNC, taxas, secções, turnos ou trabalhadores. Escreve \"ajuda\" para veres exemplos.");
  const chips=["Qual a pior máquina?","Quantas RNC em maio?","Taxa da flexografia","Compara flexo e roto","Que dados tens?"];
  $("chatChips").innerHTML=chips.map(c=>`<button class="chip">${c}</button>`).join("");
  document.querySelectorAll("#chatChips .chip").forEach(b=>b.onclick=()=>sendChat(b.textContent));
  $("chatSend").onclick=()=>sendChat();
  $("chatInput").onkeydown=e=>{if(e.key==="Enter")sendChat()};
}
