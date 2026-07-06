function applyMachineStatusMarkers(){
  const machine=db?.machines?.find(m=>m.id==="IR1");
  if(!machine || machine.status!=="discontinued") return;
  const root=document.querySelector(".view.active");
  if(!root) return;
  const note=machine.statusNote||"Máquina descontinuada";
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode(node){
    if(!node.nodeValue.includes("IR1")) return NodeFilter.FILTER_REJECT;
    const parent=node.parentElement;
    if(!parent || parent.closest(".info-icon") || parent.tagName==="OPTION" || parent.dataset.ir1Marked) return NodeFilter.FILTER_REJECT;
    return NodeFilter.FILTER_ACCEPT;
  }});
  const nodes=[];
  while(walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node=>{
    const span=document.createElement("span");
    span.innerHTML=node.nodeValue.replace(/IR1/g,`IR1 <span class="info-icon" title="${note}">i</span>`);
    node.parentNode.replaceChild(span,node);
    span.dataset.ir1Marked="1";
  });
}

const originalRender=render;
render=function(){originalRender();setTimeout(applyMachineStatusMarkers,0)};
const originalShow=show;
show=function(view){originalShow(view);setTimeout(applyMachineStatusMarkers,0)};
