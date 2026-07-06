const DB_KEY="rnc_impressao_v3";
const ARCHIVE_KEY="rnc_impressao_v3_archives";
const APP_DATA_REVISION=5;
const MONTHS=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function uid(prefix){return prefix+"_"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function n(v){return v===""||v===null||v===undefined?0:Number(v)}
function rate(rnc,of){return n(of)>0?n(rnc)/n(of)*100:null}
function fmt(v){return v===null||Number.isNaN(v)?"N/A":v.toFixed(2).replace(".",",")+"%"}
function cls(v,avg){if(v===null)return"";if(v===0)return"green";if(v<=avg)return"yellow";if(v<=5)return"orange";return"red"}
function clone(obj){return JSON.parse(JSON.stringify(obj))}

const SEEDED_RECORDS=[
  {id:"seed_2026_02_IF1",year:2026,month:2,sectionId:"flexo",machineId:"IF1",teamId:"",shift:"",workerIds:[],jobs:124,rnc:2,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IF2",year:2026,month:2,sectionId:"flexo",machineId:"IF2",teamId:"",shift:"",workerIds:[],jobs:119,rnc:1,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IF3",year:2026,month:2,sectionId:"flexo",machineId:"IF3",teamId:"",shift:"",workerIds:[],jobs:188,rnc:1,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IF4",year:2026,month:2,sectionId:"flexo",machineId:"IF4",teamId:"",shift:"",workerIds:[],jobs:170,rnc:3,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IR1",year:2026,month:2,sectionId:"roto",machineId:"IR1",teamId:"",shift:"",workerIds:[],jobs:15,rnc:3,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IR3",year:2026,month:2,sectionId:"roto",machineId:"IR3",teamId:"",shift:"",workerIds:[],jobs:82,rnc:3,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IR4",year:2026,month:2,sectionId:"roto",machineId:"IR4",teamId:"",shift:"",workerIds:[],jobs:157,rnc:7,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_02_IR5",year:2026,month:2,sectionId:"roto",machineId:"IR5",teamId:"",shift:"",workerIds:[],jobs:144,rnc:6,cause:"",notes:"Importado da fotografia de março 2026"},
  {id:"seed_2026_03_IF1",year:2026,month:3,sectionId:"flexo",machineId:"IF1",teamId:"",shift:"",workerIds:[],jobs:162,rnc:5,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IF2",year:2026,month:3,sectionId:"flexo",machineId:"IF2",teamId:"",shift:"",workerIds:[],jobs:112,rnc:4,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IF3",year:2026,month:3,sectionId:"flexo",machineId:"IF3",teamId:"",shift:"",workerIds:[],jobs:199,rnc:1,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IF4",year:2026,month:3,sectionId:"flexo",machineId:"IF4",teamId:"",shift:"",workerIds:[],jobs:187,rnc:3,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IR1",year:2026,month:3,sectionId:"roto",machineId:"IR1",teamId:"",shift:"",workerIds:[],jobs:13,rnc:0,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IR3",year:2026,month:3,sectionId:"roto",machineId:"IR3",teamId:"",shift:"",workerIds:[],jobs:82,rnc:2,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IR4",year:2026,month:3,sectionId:"roto",machineId:"IR4",teamId:"",shift:"",workerIds:[],jobs:135,rnc:3,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_03_IR5",year:2026,month:3,sectionId:"roto",machineId:"IR5",teamId:"",shift:"",workerIds:[],jobs:151,rnc:2,cause:"",notes:"Importado da fotografia de abril 2026"},
  {id:"seed_2026_04_IF1",year:2026,month:4,sectionId:"flexo",machineId:"IF1",teamId:"",shift:"",workerIds:[],jobs:150,rnc:5,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IF2",year:2026,month:4,sectionId:"flexo",machineId:"IF2",teamId:"",shift:"",workerIds:[],jobs:110,rnc:3,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IF3",year:2026,month:4,sectionId:"flexo",machineId:"IF3",teamId:"",shift:"",workerIds:[],jobs:180,rnc:1,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IF4",year:2026,month:4,sectionId:"flexo",machineId:"IF4",teamId:"",shift:"",workerIds:[],jobs:165,rnc:9,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IR1",year:2026,month:4,sectionId:"roto",machineId:"IR1",teamId:"",shift:"",workerIds:[],jobs:10,rnc:2,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IR3",year:2026,month:4,sectionId:"roto",machineId:"IR3",teamId:"",shift:"",workerIds:[],jobs:110,rnc:3,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IR4",year:2026,month:4,sectionId:"roto",machineId:"IR4",teamId:"",shift:"",workerIds:[],jobs:120,rnc:2,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_04_IR5",year:2026,month:4,sectionId:"roto",machineId:"IR5",teamId:"",shift:"",workerIds:[],jobs:155,rnc:6,cause:"",notes:"Importado da fotografia de maio 2026"},
  {id:"seed_2026_05_IF1",year:2026,month:5,sectionId:"flexo",machineId:"IF1",teamId:"",shift:"",workerIds:[],jobs:128,rnc:4,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IF2",year:2026,month:5,sectionId:"flexo",machineId:"IF2",teamId:"",shift:"",workerIds:[],jobs:135,rnc:6,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IF3",year:2026,month:5,sectionId:"flexo",machineId:"IF3",teamId:"",shift:"",workerIds:[],jobs:200,rnc:4,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IF4",year:2026,month:5,sectionId:"flexo",machineId:"IF4",teamId:"",shift:"",workerIds:[],jobs:171,rnc:2,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IR1",year:2026,month:5,sectionId:"roto",machineId:"IR1",teamId:"",shift:"",workerIds:[],jobs:0,rnc:2,cause:"",notes:"Importado da fotografia de junho 2026. IR1 descontinuada."},
  {id:"seed_2026_05_IR3",year:2026,month:5,sectionId:"roto",machineId:"IR3",teamId:"",shift:"",workerIds:[],jobs:79,rnc:3,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IR4",year:2026,month:5,sectionId:"roto",machineId:"IR4",teamId:"",shift:"",workerIds:[],jobs:120,rnc:4,cause:"",notes:"Importado da fotografia de junho 2026"},
  {id:"seed_2026_05_IR5",year:2026,month:5,sectionId:"roto",machineId:"IR5",teamId:"",shift:"",workerIds:[],jobs:152,rnc:2,cause:"",notes:"Importado da fotografia de junho 2026"}
];

function baseMachines(){return[
  {id:"IF1",name:"IF1",sectionId:"flexo",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IF2",name:"IF2",sectionId:"flexo",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IF3",name:"IF3",sectionId:"flexo",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IF4",name:"IF4",sectionId:"flexo",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IR1",name:"IR1",sectionId:"roto",manufacturer:"",year:"",colors:"",width:"",status:"discontinued",statusNote:"Máquina descontinuada",notes:""},
  {id:"IR3",name:"IR3",sectionId:"roto",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IR4",name:"IR4",sectionId:"roto",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""},
  {id:"IR5",name:"IR5",sectionId:"roto",manufacturer:"",year:"",colors:"",width:"",status:"active",statusNote:"",notes:""}
]}
function seedDb(){return{app:"RNC Impressão",version:3,dataRevision:APP_DATA_REVISION,updatedAt:new Date().toISOString(),sections:[{id:"flexo",name:"Flexografia"},{id:"roto",name:"Rotogravura"}],machines:baseMachines(),teams:[],workers:[],productionRecords:clone(SEEDED_RECORDS),rncCauses:[],trainingRecords:[],archives:[]}}
function archiveSnapshot(reason,db){const archives=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||"[]");archives.unshift({id:uid("archive"),createdAt:new Date().toISOString(),reason,db:clone(db)});localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archives.slice(0,20)))}
function migrateDb(db){let changed=false;db.sections=db.sections||[{id:"flexo",name:"Flexografia"},{id:"roto",name:"Rotogravura"}];db.machines=db.machines&&db.machines.length?db.machines:baseMachines();db.teams=db.teams||[];db.workers=db.workers||[];db.productionRecords=db.productionRecords||[];db.rncCauses=db.rncCauses||[];db.trainingRecords=db.trainingRecords||[];db.archives=db.archives||[];db.machines.forEach(m=>{const base=baseMachines().find(b=>b.id===m.id);if(m.status===undefined){m.status=base?.status||"active";changed=true}if(m.statusNote===undefined){m.statusNote=base?.statusNote||"";changed=true}if(m.id==="IR1"&&(m.status!=="discontinued"||m.statusNote!=="Máquina descontinuada")){m.status="discontinued";m.statusNote="Máquina descontinuada";changed=true}});db.productionRecords.forEach(r=>{if(r.shift===undefined){r.shift="";changed=true}if(!r.workerIds){r.workerIds=[];changed=true}});db.teams.forEach(t=>{if(t.shift===undefined){t.shift="";changed=true}});db.workers.forEach(w=>{if(w.shift===undefined){w.shift="";changed=true}});const ids=new Set(db.productionRecords.map(r=>r.id));SEEDED_RECORDS.forEach(r=>{if(!ids.has(r.id)){db.productionRecords.push(clone(r));changed=true}});if((db.dataRevision||0)<APP_DATA_REVISION){db.dataRevision=APP_DATA_REVISION;changed=true}return{db,changed}}
function loadDb(){const raw=localStorage.getItem(DB_KEY);if(!raw){const fresh=seedDb();localStorage.setItem(DB_KEY,JSON.stringify(fresh));return fresh}let db=JSON.parse(raw);const before=clone(db);const migrated=migrateDb(db);if(migrated.changed){archiveSnapshot("Arquivo automático antes da atualização da app",before);saveDb(migrated.db,false)}return migrated.db}
function saveDb(db,archive=true){const oldRaw=localStorage.getItem(DB_KEY);if(archive&&oldRaw)archiveSnapshot("Arquivo automático antes de guardar alterações",JSON.parse(oldRaw));db.updatedAt=new Date().toISOString();db.dataRevision=APP_DATA_REVISION;localStorage.setItem(DB_KEY,JSON.stringify(db))}
function exportDb(){const db=loadDb();db.archives=JSON.parse(localStorage.getItem(ARCHIVE_KEY)||"[]");return db}
function importDb(payload){if(!payload||payload.version<3)throw new Error("Ficheiro inválido ou antigo.");const oldRaw=localStorage.getItem(DB_KEY);if(oldRaw)archiveSnapshot("Arquivo automático antes de importar ficheiro",JSON.parse(oldRaw));const archives=payload.archives||[];delete payload.archives;localStorage.setItem(DB_KEY,JSON.stringify(payload));if(archives.length)localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archives));loadDb()}
function sectionName(db,id){return (db.sections.find(x=>x.id===id)||{}).name||id}
function machineName(db,id){return (db.machines.find(x=>x.id===id)||{}).name||id}
function machineInfoIcon(db,id){const m=db.machines.find(x=>x.id===id);return m&&m.status==="discontinued"?` <span class="info-icon" title="${m.statusNote||"Máquina descontinuada"}">i</span>`:""}
function machineLabel(db,id){return `${machineName(db,id)}${machineInfoIcon(db,id)}`}
function teamName(db,id){return (db.teams.find(x=>x.id===id)||{}).name||"Sem equipa"}
function workerName(db,id){return (db.workers.find(x=>x.id===id)||{}).name||id}
function recordsFor(db,filter={}){return db.productionRecords.filter(r=>(!filter.year||r.year==filter.year)&&(!filter.month&&filter.month!==0||r.month==filter.month)&&(!filter.sectionId||r.sectionId===filter.sectionId)&&(!filter.machineId||r.machineId===filter.machineId)&&(!filter.teamId||r.teamId===filter.teamId)&&(!filter.workerId||((r.workerIds||[]).includes(filter.workerId))))}
function aggregate(records){const of=records.reduce((a,r)=>a+n(r.jobs),0),rnc=records.reduce((a,r)=>a+n(r.rnc),0);return{of,rnc,taxa:rate(rnc,of),ofRnc:rnc?of/rnc:null}}
function getArchives(){return JSON.parse(localStorage.getItem(ARCHIVE_KEY)||"[]")}
function restoreArchive(id){const archives=getArchives();const found=archives.find(a=>a.id===id);if(!found)throw new Error("Arquivo não encontrado");const current=localStorage.getItem(DB_KEY);if(current)archiveSnapshot("Arquivo automático antes de restaurar versão antiga",JSON.parse(current));localStorage.setItem(DB_KEY,JSON.stringify(found.db))}
