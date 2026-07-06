let inputData=baseRows();
let monthlyMonth=4,monthlyYear=2026,annualYear=2026,comparisonMonth=4,comparisonYear=2026;

function go(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  if(id==="monthly")renderMonthly();
  if(id==="annual")renderAnnual();
  if(id==="comparison")renderComparison();
  if(id==="input")renderInputs();
}

function init(){
  document.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>go(btn.dataset.go)));
  document.getElementById("inMes").innerHTML=MONTHS.map((m,i)=>`<option value="${i}" ${i===4?"selected":""}>${m}</option>`).join("");
  document.getElementById("saveMonth").addEventListener("click",saveCurrentMonth);
  document.getElementById("loadMonth").addEventListener("click",loadInputMonth);
  document.getElementById("loadExample").addEventListener("click",loadExample);
  document.getElementById("clearInputs").addEventListener("click",clearInputs);
  document.getElementById("deleteMonth").addEventListener("click",deleteCurrentMonth);
  document.getElementById("prevMonth").addEventListener("click",()=>changeMonth(-1));
  document.getElementById("nextMonth").addEventListener("click",()=>changeMonth(1));
  document.getElementById("prevYear").addEventListener("click",()=>changeYear(-1));
  document.getElementById("nextYear").addEventListener("click",()=>changeYear(1));
  document.getElementById("prevCompMonth").addEventListener("click",()=>changeComparisonMonth(-1));
  document.getElementById("nextCompMonth").addEventListener("click",()=>changeComparisonMonth(1));
  setupSwipe("monthly",changeMonth);
  setupSwipe("annual",changeYear);
  setupSwipe("comparison",changeComparisonMonth);
  loadInputMonth();
}

function setupSwipe(id,callback){
  let startX=null;
  document.getElementById(id).addEventListener("touchstart",e=>{startX=e.touches[0].clientX},{passive:true});
  document.getElementById(id).addEventListener("touchend",e=>{
    if(startX===null)return;
    const dx=e.changedTouches[0].clientX-startX;
    if(Math.abs(dx)>60)callback(dx<0?1:-1);
    startX=null;
  },{passive:true});
}

function renderInputs(){
  document.getElementById("inputRows").innerHTML=inputData.map((d,i)=>`<tr><td class="sec">${d.s}</td><td class="left">${d.m}</td><td><input class="data-input" type="number" min="0" value="${d.of}" placeholder="0" oninput="inputData[${i}].of=this.value"></td><td><input class="data-input" type="number" min="0" value="${d.rnc}" placeholder="0" oninput="inputData[${i}].rnc=this.value"></td></tr>`).join("");
}

function saveCurrentMonth(){
  const year=Number(document.getElementById("inAno").value),month=Number(document.getElementById("inMes").value);
  saveMonthData(year,month,inputData);
  monthlyYear=year;monthlyMonth=month;annualYear=year;comparisonYear=year;comparisonMonth=month;
  document.getElementById("saveStatus").innerHTML=`Guardado: <b>${MONTHS[month]} ${year}</b>.`;
}

function loadInputMonth(){
  const year=Number(document.getElementById("inAno").value),month=Number(document.getElementById("inMes").value);
  inputData=loadMonthData(year,month);
  renderInputs();
  document.getElementById("saveStatus").innerHTML=`Carregado/novo: <b>${MONTHS[month]} ${year}</b>.`;
}

function deleteCurrentMonth(){
  const year=Number(document.getElementById("inAno").value),month=Number(document.getElementById("inMes").value);
  if(confirm(`Apagar ${MONTHS[month]} ${year}?`)){
    deleteMonthData(year,month);
    clearInputs();
    document.getElementById("saveStatus").innerHTML=`Apagado: <b>${MONTHS[month]} ${year}</b>.`;
  }
}

function clearInputs(){inputData=baseRows();renderInputs();}

function loadExample(){
  const ex={IF1:[150,5],IF2:[110,3],IF3:[180,1],IF4:[165,9],IR1:[10,2],IR3:[110,3],IR4:[120,2],IR5:[155,6]};
  inputData=baseRows();
  inputData.forEach(d=>{d.of=ex[d.m][0];d.rnc=ex[d.m][1];});
  renderInputs();
}

function changeMonth(delta){
  monthlyMonth+=delta;
  if(monthlyMonth<0){monthlyMonth=11;monthlyYear--;}
  if(monthlyMonth>11){monthlyMonth=0;monthlyYear++;}
  renderMonthly();
}
function changeYear(delta){annualYear+=delta;renderAnnual();}
function changeComparisonMonth(delta){
  comparisonMonth+=delta;
  if(comparisonMonth<0){comparisonMonth=11;comparisonYear--;}
  if(comparisonMonth>11){comparisonMonth=0;comparisonYear++;}
  renderComparison();
}
function renderMonthly(){
  document.getElementById("monthlyTitle").textContent=`${MONTHS[monthlyMonth]} ${monthlyYear}`;
  document.getElementById("monthlyReport").innerHTML=reportHTML(`Impressão — ${MONTHS[monthlyMonth]} ${monthlyYear}`,loadMonthData(monthlyYear,monthlyMonth));
}
function renderAnnual(){
  document.getElementById("annualTitle").textContent=annualYear;
  document.getElementById("annualReport").innerHTML=reportHTML(`Impressão — acumulado anual ${annualYear}`,yearRows(annualYear),trendYearHTML(annualYear));
}
function renderComparison(){
  document.getElementById("comparisonTitle").textContent=`${MONTHS[comparisonMonth]} ${comparisonYear}`;
  document.getElementById("comparisonReport").innerHTML=comparisonHTML(`Comparação mensal — ${MONTHS[comparisonMonth]} ${comparisonYear}`,loadMonthData(comparisonYear,comparisonMonth))+comparisonHTML(`Comparação acumulada do ano — ${comparisonYear}`,yearRows(comparisonYear));
}

document.addEventListener("DOMContentLoaded",init);
