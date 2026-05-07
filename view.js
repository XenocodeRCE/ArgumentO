const viewMeta=document.getElementById('view-meta');
const treeRoot=document.getElementById('view-ktree');
const overlay=document.getElementById('view-modal-overlay');
const openSummariesBtn=document.getElementById('view-open-summaries-btn');
const scoreFill=document.getElementById('view-sfill');
const scoreVal=document.getElementById('view-sval');

let tree=null;
let openNodeId=null;

function esc(s){const d=document.createElement('div');d.textContent=s||'';return d.innerHTML;}
function tr(s,n=60){if(!s)return'';s=String(s).trim();return s.length>n?s.slice(0,n)+'…':s;}
function filled(s){return (s||'').trim().length>=2;}
function find(n,id){if(!n)return null;if(n.id===id)return n;for(const c of (n.children||[])){const r=find(c,id);if(r)return r;}return null;}
function depth(n,id,d=0){if(n.id===id)return d;for(const c of (n.children||[])){const r=depth(c,id,d+1);if(r>=0)return r;}return-1;}
function allNodes(n){let a=[n];(n.children||[]).forEach(c=>{a=a.concat(allNodes(c));});return a;}
function derivedRebuttal(nd){
  const contraClaims=(nd.children||[]).filter(c=>c.type==='contra'&&filled(c.claim)).map(c=>c.claim.trim());
  return contraClaims.join(' ; ');
}
function done(nd){
  let c=1;
  if(filled(nd.claim))c++;
  if(filled(nd.data))c++;
  if(filled(nd.warrant))c++;
  if(filled(nd.backing))c++;
  if(filled(derivedRebuttal(nd)))c++;
  return c;
}
function summary(nd){
  const c=(nd.claim||'').trim(),d=(nd.data||'').trim(),w=(nd.warrant||'').trim(),b=(nd.backing||'').trim(),s=(nd.source||'').trim(),q=nd.qualifier||'probablement',r=derivedRebuttal(nd);
  if(!c||!d||!w)return null;
  let t=({thesis:'Je soutiens que ',pro:'De plus, on peut affirmer que ',contra:'Cependant, on pourrait objecter que '})[nd.type];
  t+='<span class="hl">'+esc(c)+'</span>. En effet, <span class="hl">'+esc(d)+'</span>. ';
  t+='Cela '+(nd.type==='contra'?'remet en cause la position':'soutient cette position')+' puisque <span class="hl">'+esc(w)+'</span>';
  if(b)t+=', comme le confirme <span class="hl">'+esc(b)+'</span>';
  if(s)t+=' (source : <span class="hl">'+esc(s)+'</span>)';
  t+='. Cette affirmation est <strong>'+esc(q)+'</strong>. ';
  if(r)t+='Cependant, on pourrait objecter que <span class="hl">'+esc(r)+'</span>.';
  return t;
}
function calcScore(){
  if(!tree)return{total:0,label:'',emoji:'🌱',color:'#dee2e6'};
  const ns=allNodes(tree),n=ns.length;
  const comp=ns.reduce((s,nd)=>s+done(nd),0)/(n*6)*50;
  const mx=Math.max(...ns.map(nd=>depth(tree,nd.id)));
  const dep=Math.min(15,mx*7.5);
  let bal=0;
  if((tree.children||[]).length){
    const hp=(tree.children||[]).some(c=>c.type==='pro');
    const hc=(tree.children||[]).some(c=>c.type==='contra');
    if(hp&&hc)bal=20;
    else if(hp||hc)bal=10;
  }
  const rc=ns.filter(nd=>filled(derivedRebuttal(nd))).length;
  const reb=n>0?(rc/n)*15:0;
  const sc=ns.filter(nd=>filled(nd.source||'')).length;
  const src=n>0?(sc/n)*8:0;
  const total=Math.min(100,Math.round(comp+dep+bal+reb+src));
  if(total<25)return{total,label:'Début',emoji:'🌱',color:'#ef476f'};
  if(total<45)return{total,label:'En construction',emoji:'🌿',color:'#ff9f43'};
  if(total<65)return{total,label:'Solide',emoji:'🌳',color:'#feca57'};
  if(total<82)return{total,label:'Convaincant',emoji:'🏆',color:'#06d6a0'};
  return{total,label:'Maîtrisé',emoji:'💎',color:'#4361ee'};
}
function updateScore(){
  const s=calcScore();
  scoreFill.style.width=s.total+'%';
  scoreFill.style.background=s.color;
  scoreVal.textContent=s.emoji+' '+s.total+'/100 · '+s.label;
}

function renderNode(nd,num=''){
  const icons={thesis:'📌',pro:'🟢',contra:'🔴'};
  const labels={thesis:'Thèse',pro:'Pour',contra:'Contre'};
  const text=filled(nd.claim)?tr(nd.claim,70):'(argument non renseigné)';
  const cls=filled(nd.claim)?'':' empty';
  const dn=done(nd);
  const isActive=openNodeId===nd.id;

  let h='<div class="knode k'+nd.type+'">';
  h+='<div class="kcard '+nd.type+' readonly'+(isActive?' active':'')+'" data-view="'+nd.id+'">';
  h+='<div class="kc-head"><span class="kc-icon">'+icons[nd.type]+'</span><span class="kc-label">'+labels[nd.type]+'</span>';
  if(num)h+='<span class="kc-num">'+num+'</span>';
  h+='</div>';
  h+='<div class="kc-text'+cls+'">'+esc(text)+'</div>';
  h+='<div class="kc-bar"><div class="kc-fill '+nd.type+'" style="width:'+Math.round(dn/6*100)+'%"></div></div>';
  h+='</div>';

  if((nd.children||[]).length){
    h+='<div class="kchildren">';
    nd.children.forEach((c,i)=>{
      const cn=num?(num+'.'+(i+1)):''+(i+1);
      h+=renderNode(c,cn);
    });
    h+='</div>';
  }

  h+='</div>';
  return h;
}

function renderTree(){
  if(!tree)return;
  treeRoot.innerHTML=renderNode(tree,'1');
  updateScore();
}

function openOverlay(html){
  overlay.style.display='flex';
  overlay.innerHTML=html;
}
function closeOverlay(){
  overlay.style.display='none';
  overlay.innerHTML='';
  openNodeId=null;
  renderTree();
}

function buildDetailsModal(nd){
  const names={thesis:'Thèse',pro:'Pour',contra:'Contre'};
  const rb=derivedRebuttal(nd);
  const sm=summary(nd);
  const sections=[
    ['Claim',nd.claim],
    ['Data',nd.data],
    ['Warrant',nd.warrant],
    ['Backing',nd.backing],
    ['Source',nd.source],
    ['Qualifier',nd.qualifier],
    ['Rebuttal (dérivé)',rb]
  ];

  let h='<div class="modal">';
  h+='<div class="modal-head">';
  h+='<span class="badge '+nd.type+'">'+names[nd.type]+'</span>';
  h+='<span class="cnt">'+done(nd)+'/6</span>';
  h+='<span class="spacer"></span>';
  h+='<button class="close-modal" data-close>✕</button>';
  h+='</div>';

  if(sm){
    h+='<div class="summary-panel"><div class="summary-panel-head">✨ Ton argument en résumé</div><p class="summary-panel-body">'+sm+'</p></div>';
  }

  sections.forEach(([k,v])=>{
    h+='<div class="step">';
    h+='<div class="step-head"><span class="step-concept">'+esc(k)+'</span></div>';
    h+='<div class="step-prompt">'+(filled(v)?esc(v):'<em>Non renseigné</em>')+'</div>';
    h+='</div>';
  });

  h+='</div>';
  return h;
}

function collectNodesWithNum(n,num='',a=[]){
  a.push({nd:n,num:num||'1'});
  (n.children||[]).forEach((c,i)=>collectNodesWithNum(c,(num?num+'.':'')+(i+1),a));
  return a;
}

function buildSummariesModal(){
  const names={thesis:'Thèse',pro:'Pour',contra:'Contre'};
  const list=collectNodesWithNum(tree).map(({nd,num})=>({num,type:nd.type,title:names[nd.type],sum:summary(nd)}));
  const ready=list.filter(it=>!!it.sum).sort((a,b)=>{
    const as=a.num.split('.').map(Number);
    const bs=b.num.split('.').map(Number);
    const ln=Math.max(as.length,bs.length);
    for(let i=0;i<ln;i++){
      const av=as[i]??0;
      const bv=bs[i]??0;
      if(av!==bv)return av-bv;
    }
    return 0;
  });

  let h='<div class="modal sum-modal">';
  h+='<div class="modal-head">';
  h+='<span class="badge thesis">Résumés globaux</span>';
  h+='<span class="mnum">'+ready.length+' / '+list.length+' complets</span>';
  h+='<span class="spacer"></span>';
  h+='<button class="close-modal" data-close>✕</button>';
  h+='</div>';

  if(!ready.length){
    h+='<div class="sum-empty">Aucun résumé complet pour le moment.</div>';
  }else{
    h+='<div class="sum-essay">';
    ready.forEach(it=>{h+='<p class="sum-para"><span class="sum-para-label '+it.type+'">'+it.num+' · '+it.title+'</span> '+it.sum+'</p>';});
    h+='</div>';
  }

  h+='</div>';
  return h;
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-close]')){closeOverlay();return;}
  if(e.target.id==='view-modal-overlay'){closeOverlay();return;}

  const card=e.target.closest('.kcard[data-view]');
  if(card&&tree){
    const nd=find(tree,card.dataset.view);
    if(!nd)return;
    openNodeId=nd.id;
    renderTree();
    openOverlay(buildDetailsModal(nd));
    return;
  }

  const sums=e.target.closest('#view-open-summaries-btn');
  if(sums&&tree){openOverlay(buildSummariesModal());return;}
});

document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay.style.display==='flex')closeOverlay();});

async function loadSharedMap(){
  const uid=new URLSearchParams(window.location.search).get('uid');
  if(!uid){
    viewMeta.textContent='UID manquant dans l\'URL.';
    return;
  }

  try{
    const res=await fetch('api.php?action=get&uid='+encodeURIComponent(uid));
    const data=await res.json();
    if(!res.ok||!data.ok)throw new Error(data.error||'Erreur de chargement');
    tree=data.tree;
    viewMeta.textContent='UID: '+data.uid+(data.createdAt?' · Créée le '+new Date(data.createdAt).toLocaleString():'');
    renderTree();
  }catch(err){
    viewMeta.textContent='Impossible de charger la map: '+(err.message||String(err));
  }
}

if(openSummariesBtn){
  openSummariesBtn.addEventListener('click',()=>{if(tree)openOverlay(buildSummariesModal());});
}

loadSharedMap();
