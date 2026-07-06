function initQuickAdd(){
  const chips=[...document.querySelectorAll("#quickAddChips .chip")];
  chips.forEach(c=>c.onclick=()=>{chips.forEach(x=>x.classList.toggle("active",x===c));renderQuickAddForm(c.dataset.type)});
}

function renderQuickAddForm(type){
  const box=$("quickAddForm");
  if(type==="worker")box.innerHTML=workerQuickFormHtml();
  else if(type==="team")box.innerHTML=teamQuickFormHtml();
  else if(type==="machine")box.innerHTML=machineQuickFormHtml();
  else if(type==="rnc")box.innerHTML=rncQuickFormHtml();
  bindQuickAddForm(type);
}

function workerQuickFormHtml(){return `<div class="grid">
  <input id="qaWName" placeholder="Nome">
  <input id="qaWNumber" placeholder="Nº mecanográfico">
  <input id="qaWNationality" placeholder="Nacionalidade">
  <input id="qaWBirth" type="date">
  <input id="qaWCompanyYears" type="number" placeholder="Anos na empresa">
  <input id="qaWPrintYears" type="number" placeholder="Anos na impressão">
  <select id="qaWTeam">${selectOptions(db.teams,"","Sem equipa")}</select>
  <select id="qaWShift">${shiftOptions()}</select>
  <input id="qaWRole" placeholder="Função">
</div>
<label>Notas / formação / competências</label><textarea id="qaWNotes"></textarea>
<button class="btn" id="qaSave">Guardar trabalhador</button>
<p class="small" id="qaMsg"></p>`}

function teamQuickFormHtml(){return `<div class="grid">
  <input id="qaTName" placeholder="Nome (opcional, gerado automaticamente)">
  <select id="qaTMachine">${selectOptions(db.machines,"","Escolher máquina")}</select>
  <select id="qaTShift">${shiftOptions()}</select>
</div>
<p class="small" id="qaTSuggested"></p>
<button class="btn" id="qaSave">Guardar equipa</button>
<p class="small" id="qaMsg"></p>`}

function machineQuickFormHtml(){return `<div class="grid">
  <input id="qaMName" placeholder="Ex: IF5">
  <select id="qaMSection">${selectOptions(db.sections)}</select>
  <input id="qaMMaker" placeholder="Fabricante">
  <input id="qaMYear" placeholder="Ano">
</div>
<button class="btn" id="qaSave">Guardar máquina</button>
<p class="small" id="qaMsg"></p>`}

function rncQuickFormHtml(){
  const years=db.productionRecords.map(r=>r.year);
  const year=years.length?Math.max(...years):new Date().getFullYear();
  return `<div class="grid">
  <select id="qaRMachine">${selectOptions(db.machines,"","Escolher máquina")}</select>
  <select id="qaRMonth">${MONTHS.map((m,i)=>`<option value="${i}">${m}</option>`).join("")}</select>
  <input id="qaRYear" type="number" value="${year}">
  <input id="qaRJobs" type="number" min="0" placeholder="OF/trabalhos">
  <input id="qaRRnc" type="number" min="0" placeholder="RNC">
</div>
<p class="small">Se já existir um registo desta máquina neste mês, os valores são atualizados em vez de duplicados.</p>
<button class="btn" id="qaSave">Guardar registo</button>
<p class="small" id="qaMsg"></p>`}

function bindQuickAddForm(type){
  if(type==="worker"){
    $("qaSave").onclick=()=>{
      const name=$("qaWName").value.trim();
      if(!name)return alert("Indica o nome.");
      const w=createWorker({name,number:$("qaWNumber").value.trim(),nationality:$("qaWNationality").value.trim(),birthDate:$("qaWBirth").value,yearsCompany:$("qaWCompanyYears").value,yearsPrinting:$("qaWPrintYears").value,teamId:$("qaWTeam").value,shift:$("qaWShift").value,role:$("qaWRole").value.trim(),notes:$("qaWNotes").value.trim()});
      renderQuickAddForm("worker");
      $("qaMsg").textContent=`Trabalhador "${workerLabel(w)}" adicionado.`;
    };
  } else if(type==="team"){
    const updateSuggestion=()=>{const mid=$("qaTMachine").value;$("qaTSuggested").textContent=mid?`Nome sugerido: ${teamAutoName(db,mid)}`:""};
    $("qaTMachine").onchange=updateSuggestion;
    updateSuggestion();
    $("qaSave").onclick=()=>{
      const machineId=$("qaTMachine").value;
      if(!machineId)return alert("Escolhe uma máquina.");
      const t=createTeam({name:$("qaTName").value.trim(),machineId,shift:$("qaTShift").value});
      renderQuickAddForm("team");
      $("qaMsg").textContent=`Equipa "${t.name}" adicionada.`;
    };
  } else if(type==="machine"){
    $("qaSave").onclick=()=>{
      const name=$("qaMName").value.trim();
      if(!name)return alert("Indica o nome/código da máquina.");
      const m=createMachine({name,sectionId:$("qaMSection").value,manufacturer:$("qaMMaker").value.trim(),year:$("qaMYear").value.trim()});
      renderQuickAddForm("machine");
      $("qaMsg").textContent=`Máquina "${m.name}" adicionada.`;
    };
  } else if(type==="rnc"){
    $("qaSave").onclick=()=>{
      const machineId=$("qaRMachine").value;
      if(!machineId)return alert("Escolhe uma máquina.");
      const year=n($("qaRYear").value),month=n($("qaRMonth").value),jobs=n($("qaRJobs").value),rnc=n($("qaRRnc").value);
      const result=upsertRncQuick({machineId,year,month,jobs,rnc});
      renderQuickAddForm("rnc");
      $("qaMsg").textContent=`Registo ${result.created?"criado":"atualizado"} para ${machineName(db,machineId)} em ${MONTHS[month]} ${year}.`;
    };
  }
}
