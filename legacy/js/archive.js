function renderData(){
  const archives=getArchives();
  $("data").innerHTML=`
    <div class="card">
      <h2>+ Novo</h2>
      <p class="small">Escolhe o tipo de dado que queres criar.</p>
      <div class="chips" id="quickAddChips">
        <button class="chip" data-type="worker">Trabalhador</button>
        <button class="chip" data-type="team">Equipa</button>
        <button class="chip" data-type="machine">Máquina</button>
        <button class="chip" data-type="rnc">Registo RNC rápido</button>
      </div>
      <div id="quickAddForm"></div>
    </div>
    <div class="card">
      <h2>Dados</h2>
      <button class="btn" id="exportBtn">Exportar JSON</button>
      <label class="import-label" for="importFile">Importar JSON</label>
      <input id="importFile" type="file" accept="application/json,.json">
      <p class="small">O ficheiro guarda secções, máquinas, equipas, trabalhadores, turnos, produção, causas de RNC, arquivos e futuras formações.</p>
    </div>
    <div class="card">
      <h2>Arquivo automático</h2>
      <p class="small">Sempre que a app atualiza os dados ou guardas alterações, a versão anterior fica aqui. Isto permite voltar atrás caso acrescentes algum dado errado.</p>
      <div id="archiveList"></div>
    </div>`;
  $("exportBtn").onclick=downloadJson;
  $("importFile").onchange=importJson;
  $("archiveList").innerHTML=archives.length?`<table><tr><th>Data</th><th>Motivo</th><th>Registos</th><th>Ação</th></tr>${archives.map(a=>`<tr><td>${new Date(a.createdAt).toLocaleString("pt-PT")}</td><td>${a.reason}</td><td>${(a.db.productionRecords||[]).length}</td><td><button class="btn secondary" onclick="restoreArchiveAndRender('${a.id}')">Restaurar</button></td></tr>`).join("")}</table>`:"<p class='small'>Ainda não há arquivos.</p>";
  initQuickAdd();
}

function restoreArchiveAndRender(id){
  if(!confirm("Restaurar esta versão antiga? A versão atual será arquivada antes da restauração.")) return;
  restoreArchive(id);
  db=loadDb();
  alert("Versão antiga restaurada.");
  renderData();
}
