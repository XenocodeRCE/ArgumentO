/* ══════════════════════════════
   DATA MODEL
   ══════════════════════════════ */
let uid=0,tree=null,openModalId=null,modalView='edit',modalStepIndex=0;
const QUALIFIERS=['toujours','necessairement','dans la plupart des cas','souvent','probablement','possible','rarement'];

// Aide contextuelle pour chaque étape
const STEP_HELP = {
  claim: {
    title: "Aide : formuler le claim",
    intro: "Le claim est l'affirmation principale que tu veux défendre.",
    examples: [
      '<strong>Formule directe :</strong> <em>Je soutiens que ...</em> <br><span class="whelp-exp">Ex : Je soutiens que la liberté d\'expression doit être encadrée.</span>',
      '<strong>Formule de renforcement :</strong> <em>On peut défendre que ...</em> <br><span class="whelp-exp">Ex : On peut défendre que l\'école devrait commencer plus tard.</span>',
      '<strong>Formule d\'objection :</strong> <em>À l\'inverse, on pourrait objecter que ...</em> <br><span class="whelp-exp">Ex : À l\'inverse, on pourrait objecter que toute limitation est dangereuse.</span>'
    ]
  },
  data: {
    title: "Aide : donner les données",
    intro: "Les données sont les faits, observations ou exemples qui soutiennent ton claim.",
    examples: [
      '<strong>Fait social :</strong> <em>Parce que ...</em> <br><span class="whelp-exp">Ex : Parce que la plupart des pays ont des lois sur la diffamation.</span>',
      '<strong>Observation :</strong> <em>On observe que ...</em> <br><span class="whelp-exp">Ex : On observe que les élèves sont moins fatigués quand l\'école commence plus tard.</span>',
      '<strong>Appui empirique :</strong> <em>Des études montrent que ...</em> <br><span class="whelp-exp">Ex : Des études montrent que la censure précède souvent l\'autoritarisme.</span>'
    ]
  },
  warrant: {
    title: "Aide : structurer le warrant",
    intro: "Le warrant relie les données à la conclusion. Voici des structures types et leur usage :",
    examples: [
      '<strong>Si ... alors ...</strong> <br><span class="whelp-exp">Ex : <em>Si une mesure réduit les accidents, alors elle améliore la sécurité publique.</em></span>',
      '<strong>En général, quand ... , ...</strong> <br><span class="whelp-exp">Ex : <em>En général, quand on limite la vitesse, les accidents diminuent.</em></span>',
      '<strong>Parce que ... , on peut en déduire que ...</strong> <br><span class="whelp-exp">Ex : <em>Parce que la fatigue réduit l’attention, on peut en déduire que commencer plus tard améliore la concentration.</em></span>',
      '<strong>Dans ce contexte, ... implique ...</strong> <br><span class="whelp-exp">Ex : <em>Dans ce contexte, protéger la liberté d’expression implique d’accepter la critique.</em></span>'
    ]
  },
  backing: {
    title: "Aide : appuyer le raisonnement",
    intro: "Le backing est une source, une autorité ou une référence qui renforce ton warrant.",
    examples: [
      '<strong>Référence théorique :</strong> <em>Selon ...</em> <br><span class="whelp-exp">Ex : Selon John Stuart Mill, la liberté s\'arrête où commence le dommage à autrui.</span>',
      '<strong>Référence scientifique :</strong> <em>Des études montrent que ...</em> <br><span class="whelp-exp">Ex : Des études montrent que l\'exposition à la haine a des effets mesurables.</span>',
      '<strong>Référence juridique :</strong> <em>La jurisprudence ...</em> <br><span class="whelp-exp">Ex : La jurisprudence internationale va dans ce sens.</span>'
    ]
  },
  qualifier: {
    title: "Aide : choisir un modalisateur",
    intro: "Le qualifier nuance la portée de ton argument.",
    examples: [
      '<strong>Fort :</strong> <em>Toujours</em>, <em>Nécessairement</em> <br><span class="whelp-exp">À utiliser seulement si tes preuves sont très solides.</span>',
      '<strong>Moyen :</strong> <em>Souvent</em>, <em>Dans la plupart des cas</em> <br><span class="whelp-exp">Utile pour des tendances générales.</span>',
      '<strong>Prudent :</strong> <em>Probablement</em>, <em>Possible</em>, <em>Rarement</em> <br><span class="whelp-exp">Idéal quand il existe des exceptions.</span>'
    ]
  },
  rebuttal: {
    title: "Aide : comprendre le rebuttal",
    intro: "Le rebuttal anticipe une objection ou une limite à ton argument.",
    examples: [
      '<strong>Objection de principe :</strong> <em>Cependant, on pourrait objecter que ...</em> <br><span class="whelp-exp">Ex : Cependant, on pourrait objecter que la liberté d\'expression protège aussi les idées impopulaires.</span>',
      '<strong>Objection de limite :</strong> <em>Mais cela ignore ...</em> <br><span class="whelp-exp">Ex : Mais cela ignore les cas où l\'expression ne cause aucun préjudice.</span>',
      '<strong>Objection de complexité :</strong> <em>Toutefois, ...</em> <br><span class="whelp-exp">Ex : Toutefois, certains discours sont difficiles à distinguer de simples opinions.</span>'
    ]
  }
};
const API_FILE='api.php';
let verifyRequestSeq=0;
const DEBUG = true;
const DBG_PREFIX = '[ArgumentO DEBUG]';
function dbg(...args){if(DEBUG)console.log(DBG_PREFIX,...args)}
function dbgWarn(...args){if(DEBUG)console.warn(DBG_PREFIX,...args)}
function dbgErr(...args){if(DEBUG)console.error(DBG_PREFIX,...args)}

dbg('script.js charge', { href: window.location.href, readyState: document.readyState, ts: new Date().toISOString() });
window.addEventListener('error', e => dbgErr('window.error', e.message, { source: e.filename, line: e.lineno, col: e.colno }));
window.addEventListener('unhandledrejection', e => dbgErr('unhandledrejection', e.reason));
function mk(t,c=''){return{id:'n'+(++uid),type:t,claim:c,data:'',warrant:'',backing:'',source:'',qualifier:'probablement',rebuttal:'',children:[]}}
function find(n,id){if(!n)return null;if(n.id===id)return n;for(const c of n.children){const r=find(c,id);if(r)return r}return null}
function findParent(n,id,p=null){if(!n)return null;if(n.id===id)return p;for(const c of n.children){const r=findParent(c,id,n);if(r)return r}return null}
function depth(n,id,d=0){if(n.id===id)return d;for(const c of n.children){const r=depth(c,id,d+1);if(r>=0)return r}return-1}
function nodeNum(n,id,num='1'){if(!n)return'';if(n.id===id)return num;for(let i=0;i<n.children.length;i++){const r=nodeNum(n.children[i],id,num+'.'+(i+1));if(r)return r}return''}
function rm(n,id){n.children=n.children.filter(c=>c.id!==id);n.children.forEach(c=>rm(c,id))}
function allNodes(n){let a=[n];n.children.forEach(c=>{a=a.concat(allNodes(c))});return a}
function tr(s,n=40){if(!s)return'';s=s.trim();return s.length>n?s.slice(0,n)+'…':s}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function filled(s){return(s||'').trim().length>=2}
function derivedRebuttal(nd){
  const contraClaims=nd.children.filter(c=>c.type==='contra'&&filled(c.claim)).map(c=>c.claim.trim());
  return contraClaims.join(' ; ');
}
function modalSteps(nd){return steps(nd).filter(st=>!st.auto)}
function stepVisibility(nd,idx){return vis(nd,idx,steps(nd))}
function stepCanAdvance(nd,st){
  if(st.isQ||st.f==='backing')return true;
  return filled(nd[st.f]);
}
function maxReachableStep(nd){
  const ss=modalSteps(nd);
  let mx=0;
  ss.forEach((st,i)=>{if(stepVisibility(nd,i)!=='hide')mx=i;});
  return mx;
}
function firstSuggestedStep(nd){
  const ss=modalSteps(nd);
  for(let i=0;i<ss.length;i++){
    if(stepVisibility(nd,i)==='show'&&!stepCanAdvance(nd,ss[i]))return i;
  }
  return maxReachableStep(nd);
}

/* ══════════════════════════════
   TOULMIN STEPS
   ══════════════════════════════ */
function steps(nd){return[
  {f:'claim',icon:'📌',concept:'Claim',prompt:({thesis:'Je soutiens que :',pro:'Pour renforcer cette idée, j\'affirme que :',contra:'À l\'inverse, on pourrait objecter que :'})[nd.type]},
  {f:'data',icon:'📊',concept:'Data',prompt:({thesis:'En effet, on peut affirmer cela car :',pro:'En effet, on peut affirmer cela car :',contra:'Cette objection se fonde sur le fait que :'})[nd.type]},
  {f:'warrant',icon:'🔗',concept:'Warrant',dynamic:true},
  {f:'backing',icon:'📚',concept:'Backing',prompt:'Ce raisonnement est appuyé par :'},
  {f:'qualifier',icon:'🎚️',concept:'Qualifier',isQ:true,prompt:'Choisis un modalisateur (toujours, probablement, nécessairement, dans la plupart des cas...) :'},
  {f:'rebuttal',icon:'⚠️',concept:'Rebuttal',auto:true,prompt:'Le rebuttal est automatiquement déduit des arguments CONTRE ajoutés sous ce nœud.'}
]}
function warrantPrompt(nd){const dr=nd.data?'« '+tr(nd.data,32)+' »':'…';const cr=nd.claim?'« '+tr(nd.claim,32)+' »':'…';return dr+(nd.type==='contra'?' remet en cause ':' permet de soutenir ')+cr+' puisque :'}
function vis(nd,i,ss){if(i===0)return'show';if(i<=2)return filled(nd[ss[i-1].f])?'show':'tease';return filled(nd.warrant)?'show':'hide'}
function done(nd){let c=1;if(filled(nd.claim))c++;if(filled(nd.data))c++;if(filled(nd.warrant))c++;if(filled(nd.backing))c++;if(filled(derivedRebuttal(nd)))c++;return c}

/* ══════════════════════════════
   SUMMARY
   ══════════════════════════════ */
function summary(nd){
  const c=nd.claim.trim(),d=nd.data.trim(),w=nd.warrant.trim(),b=nd.backing.trim(),s=(nd.source||'').trim(),q=nd.qualifier,r=derivedRebuttal(nd);
  if(!c||!d||!w)return null;
  let t=({thesis:'Je soutiens que ',pro:'De plus, on peut affirmer que ',contra:'Cependant, on pourrait objecter que '})[nd.type];
  t+='<span class="hl">'+esc(c)+'</span>. En effet, <span class="hl">'+esc(d)+'</span>. ';
  t+='Cela '+(nd.type==='contra'?'remet en cause la position':'soutient cette position')+' puisque <span class="hl">'+esc(w)+'</span>';
  if(b)t+=', comme le confirme <span class="hl">'+esc(b)+'</span>';
  if(s)t+=' (source : <span class="hl">'+esc(s)+'</span>)';
  t+='. Cette affirmation est <strong>'+q+'</strong>. ';
  if(r)t+='Cependant, on pourrait objecter que <span class="hl">'+esc(r)+'</span>.';return t;
}
function summaryPlain(nd){
  const c=nd.claim.trim(),d=nd.data.trim(),w=nd.warrant.trim(),b=nd.backing.trim(),s=(nd.source||'').trim(),q=nd.qualifier,r=derivedRebuttal(nd);
  if(!c||!d||!w)return'';
  let t=({thesis:'Je soutiens que ',pro:'De plus, ',contra:'Cependant, '})[nd.type]+c+'. En effet, '+d+'. ';
  t+='Cela '+(nd.type==='contra'?'remet en cause la position':'soutient cette position')+' puisque '+w;
  if(b)t+=', comme le confirme '+b;
  if(s)t+=' (source: '+s+')';
  t+='. ('+q+'). ';
  if(r)t+='On pourrait objecter que '+r+'.';
  return t;
}
function progressiveSummary(nd,showQualifier=false){
  const c=nd.claim.trim(),d=nd.data.trim(),w=nd.warrant.trim(),b=nd.backing.trim(),s=(nd.source||'').trim(),q=nd.qualifier,r=derivedRebuttal(nd);
  const intro=({thesis:'Je soutiens que ',pro:'De plus, on peut affirmer que ',contra:'Cependant, on pourrait objecter que '})[nd.type];
  const parts=[];
  if(c)parts.push(intro+'<span class="hl">'+esc(c)+'</span>.');
  if(d)parts.push('En effet, <span class="hl">'+esc(d)+'</span>.');
  if(w)parts.push('Cela '+(nd.type==='contra'?'remet en cause la position':'soutient cette position')+' puisque <span class="hl">'+esc(w)+'</span>.');
  if(b)parts.push('Ce raisonnement s\'appuie sur <span class="hl">'+esc(b)+'</span>.');
  if(s)parts.push('Source indiquée : <span class="hl">'+esc(s)+'</span>.');
  if(showQualifier&&q&&parts.length)parts.push('La portée de cet argument est <strong>'+esc(q)+'</strong>.');
  if(r)parts.push('Un contre-argument déjà identifié est <span class="hl">'+esc(r)+'</span>.');
  return parts.join(' ');
}

function normalizeForFlags(text){
  return (text||'')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ')
    .replace(/\s+/g,' ')
    .trim();
}

function jaccardForFlags(a,b){
  const toSet=t=>new Set(normalizeForFlags(t).split(/\s+/).filter(w=>w.length>2));
  const sa=toSet(a),sb=toSet(b);
  if(!sa.size||!sb.size)return 0;
  const inter=[...sa].filter(x=>sb.has(x)).length;
  const uni=new Set([...sa,...sb]).size;
  return uni?inter/uni:0;
}

function localFlagCounts(){
  if(!tree)return{high:0,medium:0,low:0};
  const nodes=allNodes(tree);
  const thesisClaim=(tree.claim||'').trim();
  let high=0,medium=0,low=0;

  const inc=s=>{if(s==='high')high++;else if(s==='medium')medium++;else low++;};

  nodes.forEach(nd=>{
    const claim=(nd.claim||'').trim();
    const data=(nd.data||'').trim();
    const warrant=(nd.warrant||'').trim();
    const backing=(nd.backing||'').trim();
    const source=(nd.source||'').trim();
    const qualifier=normalizeForFlags(nd.qualifier||'');

    const sim=jaccardForFlags(data,warrant);
    if(sim>0.6)inc(sim>0.8?'high':'medium');

    const mins={claim:5,data:10,warrant:10,backing:5};
    Object.entries(mins).forEach(([f,m])=>{
      const v=((nd[f]||'').trim());
      if(!v)return;
      if(v.length<m)inc('low');
    });

    if(backing&&!source)inc('medium');

    if(nd.type!=='thesis'){
      const dup=jaccardForFlags(claim,thesisClaim);
      if(dup>0.7)inc(dup>0.9?'high':'medium');
    }

    if(!qualifier)inc('low');

    const strong=['certain','certainement','assurement','necessaire','necessairement','garanti','toujours'];
    if(strong.includes(qualifier)&&!backing)inc('high');
  });

  return{high,medium,low};
}

/* ══════════════════════════════
   SCORE
   ══════════════════════════════ */
function calcScore(){
  if(!tree)return{total:0,label:'',emoji:'🌱',color:'#dee2e6'};
  const ns=allNodes(tree),n=ns.length;
  const comp=ns.reduce((s,nd)=>s+done(nd),0)/(n*6)*50;
  const mx=Math.max(...ns.map(nd=>depth(tree,nd.id)));
  const dep=Math.min(15,mx*7.5);
  let bal=0;if(tree.children.length){const hp=tree.children.some(c=>c.type==='pro'),hc=tree.children.some(c=>c.type==='contra');if(hp&&hc)bal=20;else if(hp||hc)bal=10}
  const rc=ns.filter(nd=>filled(derivedRebuttal(nd))).length;const reb=n>0?(rc/n)*15:0;
  const sc=ns.filter(nd=>filled(nd.source||'')).length;const src=n>0?(sc/n)*8:0;
  const fc=localFlagCounts();
  const penalty=Math.min(38,fc.high*8+fc.medium*3+fc.low*1.2);
  const total=Math.min(100,Math.max(0,Math.round(comp+dep+bal+reb+src-penalty)));
  let label,emoji,color;
  if(total<25){label='Début';emoji='🌱';color='#ef476f'}
  else if(total<45){label='En construction';emoji='🌿';color='#ff9f43'}
  else if(total<65){label='Solide';emoji='🌳';color='#feca57'}
  else if(total<82){label='Convaincant';emoji='🏆';color='#06d6a0'}
  else{label='Maîtrisé';emoji='💎';color='#4361ee'}
  return{total,label,emoji,color};
}
function updateScore(){
  const s=calcScore();
  document.getElementById('sfill').style.width=s.total+'%';
  document.getElementById('sfill').style.background=s.color;
  document.getElementById('sval').textContent=s.emoji+' '+s.total+'/100 · '+s.label;
}

/* ══════════════════════════════
   KIALO TREE (main view)
   ══════════════════════════════ */
function renderTree(){
  const el=document.getElementById('ktree');
  if(!el||!tree){
    dbgWarn('renderTree interrompu', { hasTree: !!tree, hasKtree: !!el });
    return;
  }
  el.innerHTML=buildKNode(tree,'');
  updateScore();
}

function buildKNode(nd,num){
  const icons={thesis:'📌',pro:'🟢',contra:'🔴'},labels={thesis:'Thèse',pro:'Pour',contra:'Contre'};
  const text=nd.claim.trim()?tr(nd.claim,50):'(cliquer pour éditer…)';
  const cls=nd.claim.trim()?'':' empty';
  const dn=done(nd);
  const isActive=openModalId===nd.id;

  let h='<div class="knode k'+nd.type+'">';
  h+='<div class="kcard '+nd.type+(isActive?' active':'')+'" data-edit="'+nd.id+'">';
  if(nd.type!=='thesis')h+='<button class="kdel" data-delcard="'+nd.id+'" title="Supprimer cet argument">✕</button>';
  h+='<div class="kc-head"><span class="kc-icon">'+icons[nd.type]+'</span><span class="kc-label">'+labels[nd.type]+'</span>';
  if(num)h+='<span class="kc-num">'+num+'</span>';
  h+='</div>';
  h+='<div class="kc-text'+cls+'">'+esc(text)+'</div>';
  h+='<div class="kc-bar"><div class="kc-fill '+nd.type+'" style="width:'+Math.round(dn/6*100)+'%"></div></div>';
  h+='</div>';

  h+='<div class="kadd-row">';
  h+='<button class="kadd pro" data-addpro="'+nd.id+'" title="Ajouter un argument POUR">+</button>';
  h+='<button class="kadd contra" data-addcontra="'+nd.id+'" title="Ajouter un argument CONTRE">+</button>';
  h+='</div>';

  if(nd.children.length){
    h+='<div class="kchildren">';
    nd.children.forEach((c,i)=>{
      const cn=num?(num+'.'+(i+1)):''+(i+1);
      h+=buildKNode(c,cn);
    });
    h+='</div>';
  }
  h+='</div>';
  return h;
}

/* ══════════════════════════════
   EDIT MODAL
   ══════════════════════════════ */
function openModal(nid){
  dbg('openModal', { nid });
  modalView='edit';
  openModalId=nid;
  const nd=find(tree,nid);
  modalStepIndex=nd?firstSuggestedStep(nd):0;
  renderModal();
  renderTree();
}
function closeModal(){
  dbg('closeModal');
  openModalId=null;
  modalView='edit';
  modalStepIndex=0;
  const modalOverlay = document.getElementById('modal-overlay');
  if(!modalOverlay){
    dbgWarn('modal-overlay introuvable lors de closeModal');
    return;
  }
  modalOverlay.style.display='none';
  renderTree();
}

function setStepHelpOpen(open){
  const ov=document.getElementById('modal-overlay');
  if(!ov)return;
  const help=ov.querySelector('.whelp-overlay');
  if(!help)return;
  help.classList.toggle('open',!!open);
  help.setAttribute('aria-hidden',open?'false':'true');
}

function ensureNoticeOverlay(){
  let ov=document.getElementById('notice-overlay');
  if(!ov){
    ov=document.createElement('div');
    ov.id='notice-overlay';
    ov.className='modal-overlay';
    ov.style.display='none';
    document.body.appendChild(ov);
  }
  return ov;
}

function buildNoticeModal(title,message,tone='info'){
  const badge=tone==='error'?'contra':(tone==='success'?'pro':'thesis');
  const safeTitle=esc(title||'Information');
  const safeMsg=esc(message||'').replace(/\n/g,'<br>');
  let h='<div class="modal" role="dialog" aria-modal="true" aria-label="Notification">';
  h+='<div class="modal-head">';
  h+='<span class="badge '+badge+'">'+safeTitle+'</span>';
  h+='<span class="spacer"></span>';
  h+='<button class="close-modal" type="button" data-action="close-notice">✕</button>';
  h+='</div>';
  h+='<div class="sum-empty" style="margin-top:.35rem">'+safeMsg+'</div>';
  h+='<div class="modal-acts">';
  h+='<button class="abtn av" type="button" data-action="close-notice">OK</button>';
  h+='</div>';
  h+='</div>';
  return h;
}

function openNoticeModal(title,message,tone='info'){
  const ov=ensureNoticeOverlay();
  modalView='notice';
  ov.style.display='flex';
  ov.innerHTML=buildNoticeModal(title,message,tone);
}

function closeNoticeModal(){
  const ov=document.getElementById('notice-overlay');
  if(!ov)return;
  ov.style.display='none';
  ov.innerHTML='';
  if(modalView==='notice')modalView='edit';
}

function refreshStepHelpContent(stepField){
  const ov=document.getElementById('modal-overlay');
  if(!ov)return;
  const help=STEP_HELP[stepField]||STEP_HELP.claim;
  const titleEl=ov.querySelector('.whelp-title');
  const introEl=ov.querySelector('.whelp-intro');
  const listEl=ov.querySelector('.whelp-list');
  if(titleEl)titleEl.textContent=help.title;
  if(introEl)introEl.textContent=help.intro;
  if(listEl){
    listEl.innerHTML='';
    help.examples.forEach(ex=>{
      const li=document.createElement('li');
      li.innerHTML=ex;
      listEl.appendChild(li);
    });
  }
}

function renderModal(){
  modalView='edit';
  const nd=find(tree,openModalId);
  if(!nd){dbgWarn('renderModal: noeud introuvable', { openModalId });closeModal();return}
  const ov=document.getElementById('modal-overlay');
  if(!ov){dbgWarn('renderModal: modal-overlay introuvable');return}
  ov.style.display='flex';
  ov.innerHTML=buildModal(nd);
  ov.querySelectorAll('textarea').forEach(autoEl);
}

function buildModal(nd){
  const ss=modalSteps(nd);
  const dn=done(nd);
  const sm=summary(nd);
  const names={thesis:'Thèse',pro:'Pour',contra:'Contre'};
  const fc={thesis:'tf',pro:'pf',contra:'cf'};
  const parent=findParent(tree,nd.id);
  const parentRef=parent?((nodeNum(tree,parent.id)||'')+'. '+names[parent.type]):'';
  const maxIdx=maxReachableStep(nd);
  const stepIdx=Math.min(modalStepIndex,maxIdx);
  const cur=ss[stepIdx];
  const qualifierIdx=ss.findIndex(st=>st.isQ);
  const psm=progressiveSummary(nd,qualifierIdx>=0&&stepIdx>=qualifierIdx);
  const canPrev=stepIdx>0;
  const canNext=stepIdx<maxIdx&&stepCanAdvance(nd,cur);

  let h='<div class="modal">';
  h+='<div class="modal-head">';
  h+='<span class="badge '+nd.type+'">'+names[nd.type]+'</span>';
  h+='<span class="spacer"></span>';
  h+='<span class="cnt">'+dn+'/6</span>';
  h+='<button class="close-modal" data-close>✕</button>';
  h+='</div>';
  if(parent){
    h+='<div class="reply-context"><span class="rc-tag">Contexte</span><span class="rc-text">Réponse à '+esc(parentRef)+' '+esc(tr(parent.claim||'(sans texte)',110))+'</span></div>';
  }
  h+='<div class="summary-panel'+(psm?'':' summary-panel-empty')+'">';
  h+='<div class="summary-panel-head">✨ Ton argument en résumé</div>';
  h+='<p class="summary-panel-body">'+(psm||'Complète les étapes ci-dessous. Le résumé se construira automatiquement au fil de ta réflexion.')+'</p>';
  h+='</div>';
  h+='<div class="pbar"><div class="fill '+fc[nd.type]+'" style="width:'+Math.round(dn/6*100)+'%"></div></div>';
  h+='<div class="step-shell">';
  h+='<div class="step-meta"><span class="step-count">Étape '+(stepIdx+1)+' / '+ss.length+'</span><span class="step-help">Avance pas à pas, tu peux revenir en arrière à tout moment.</span></div>';
  h+='<div class="step-track">';
  ss.forEach((st,i)=>{h+='<span class="step-dot'+(i===stepIdx?' active':'')+(i<stepIdx?' done':'')+'"></span>';});
  h+='</div>';
  h+='<div class="step" data-step-index="'+stepIdx+'">';
  h+='<div class="step-head"><span class="step-icon">'+cur.icon+'</span><span class="step-concept">'+cur.concept+'</span>';
  if(cur.f&&STEP_HELP[cur.f]) h+='<button class="step-help-btn" type="button" data-action="open-step-help">Aide</button>';
  h+='</div>';
  if(cur.dynamic)h+='<div class="step-prompt">'+esc(warrantPrompt(nd))+'</div>';
  else h+='<div class="step-prompt">'+esc(cur.prompt)+'</div>';
  if(cur.isQ){
    h+='<div class="qrow">';
    QUALIFIERS.forEach(q=>{
      h+='<button class="qbtn'+(nd.qualifier===q?' on':'')+'" data-nid="'+nd.id+'" data-q="'+q+'">'+q[0].toUpperCase()+q.slice(1)+'</button>';
    });
    h+='</div>';
  } else {
    h+='<textarea class="fi ar" data-nid="'+nd.id+'" data-f="'+cur.f+'">'+esc(nd[cur.f])+'</textarea>';
    if(cur.f==='backing')h+='<textarea class="fi ar source-field" data-nid="'+nd.id+'" data-f="source" placeholder="Source (optionnel) : URL, auteur, article...">'+esc(nd.source||'')+'</textarea>';
  }
  h+='</div>';
  h+='</div>';

  // Actions
  h+='<div class="modal-acts">';
  h+='<button class="abtn an" data-action="prev-step"'+(canPrev?'':' disabled')+'>← Précédent</button>';
  if(stepIdx<maxIdx)h+='<button class="abtn an" data-action="next-step"'+(canNext?'':' disabled')+'>Suivant →</button>';
  else h+='<button class="abtn av" data-nid="'+nd.id+'" data-action="validate">✅ Valider</button>';
  if(sm)h+='<button class="abtn as" data-nid="'+nd.id+'" data-action="copy">📋 Copier le résumé</button>';
  if(nd.type!=='thesis')h+='<button class="abtn ad" data-nid="'+nd.id+'" data-action="del">🗑️ Supprimer</button>';
  h+='</div>';

  const help = STEP_HELP[cur.f] || STEP_HELP['claim'];
  h+='<div class="whelp-overlay" aria-hidden="true">';
  h+='<div class="whelp-box" role="dialog" aria-modal="true" aria-label="Aide">';
  h+='<div class="whelp-head"><span class="whelp-title">'+esc(help.title)+'</span><button class="whelp-close" type="button" data-action="close-step-help">✕</button></div>';
  h+='<p class="whelp-intro">'+esc(help.intro)+'</p>';
  h+='<ul class="whelp-list">';
  // Contenu HTML contrôlé (constant locale STEP_HELP)
  help.examples.forEach(ex=>{ h+='<li>'+ex+'</li>'; });
  h+='</ul>';
  h+='</div>';
  h+='</div>';

  h+='</div>';
  return h;
}

/* Soft re-render modal without losing focus */
function softModal(){
  if(modalView!=='edit')return;
  const nd=find(tree,openModalId);if(!nd)return;
  const ov=document.getElementById('modal-overlay');
  const ss=modalSteps(nd);
  const stepIdx=Math.min(modalStepIndex,maxReachableStep(nd));
  const cur=ss[stepIdx];

  // update counter + bar
  const dn=done(nd);
  const cnt=ov.querySelector('.cnt');if(cnt)cnt.textContent=dn+'/6';
  const pb=ov.querySelector('.pbar .fill');if(pb)pb.style.width=Math.round(dn/6*100)+'%';

  // update summary
  const sm=summary(nd);
  const qualifierIdx=ss.findIndex(st=>st.isQ);
  const psm=progressiveSummary(nd,qualifierIdx>=0&&stepIdx>=qualifierIdx);
  const sp=ov.querySelector('.summary-panel');
  if(sp){
    sp.classList.toggle('summary-panel-empty',!psm);
    const body=sp.querySelector('.summary-panel-body');
    if(body)body.innerHTML=psm||'Complète les étapes ci-dessous. Le résumé se construira automatiquement au fil de ta réflexion.';
  }

  // update step header and content
  const stepEl=ov.querySelector('.step');
  if(stepEl){
    const concept=stepEl.querySelector('.step-concept');if(concept)concept.textContent=cur.concept;
    const icon=stepEl.querySelector('.step-icon');if(icon)icon.textContent=cur.icon;
    refreshStepHelpContent(cur.f);
    const head=stepEl.querySelector('.step-head');
    if(head){
      const helpBtn=head.querySelector('.step-help-btn');
      if(cur.f&&STEP_HELP[cur.f]){
        if(!helpBtn){
          const hb=document.createElement('button');
          hb.className='step-help-btn';
          hb.type='button';
          hb.dataset.action='open-step-help';
          hb.textContent='Aide';
          head.appendChild(hb);
        }
      }else{
        if(helpBtn)helpBtn.remove();
        setStepHelpOpen(false);
      }
    }
    const prompt=stepEl.querySelector('.step-prompt');if(prompt)prompt.textContent=cur.dynamic?warrantPrompt(nd):cur.prompt;
    const stepCount=ov.querySelector('.step-count');if(stepCount)stepCount.textContent='Étape '+(stepIdx+1)+' / '+ss.length;
    ov.querySelectorAll('.step-dot').forEach((dot,i)=>{
      dot.classList.toggle('active',i===stepIdx);
      dot.classList.toggle('done',i<stepIdx);
    });
    const area=stepEl.querySelector('textarea');
    const srcArea=stepEl.querySelector('textarea[data-f="source"]');
    const qrow=stepEl.querySelector('.qrow');
    if(cur.isQ){
      if(area)area.remove();
      if(srcArea)srcArea.remove();
      if(!qrow){
        const row=document.createElement('div');
        row.className='qrow';
        row.innerHTML=QUALIFIERS.map(q=>'<button class="qbtn'+(nd.qualifier===q?' on':'')+'" data-nid="'+nd.id+'" data-q="'+q+'">'+q[0].toUpperCase()+q.slice(1)+'</button>').join('');
        stepEl.appendChild(row);
      } else {
        qrow.innerHTML=QUALIFIERS.map(q=>'<button class="qbtn'+(nd.qualifier===q?' on':'')+'" data-nid="'+nd.id+'" data-q="'+q+'">'+q[0].toUpperCase()+q.slice(1)+'</button>').join('');
      }
    } else {
      if(qrow)qrow.remove();
      if(area){
        area.dataset.f=cur.f;
        if(area.value!==nd[cur.f])area.value=nd[cur.f];
        autoEl(area);
      } else {
        const ta=document.createElement('textarea');
        ta.className='fi ar';
        ta.dataset.nid=nd.id;
        ta.dataset.f=cur.f;
        ta.value=nd[cur.f];
        stepEl.appendChild(ta);
        autoEl(ta);
      }

      const sourceNow=stepEl.querySelector('textarea[data-f="source"]');
      if(cur.f==='backing'){
        if(sourceNow){
          if(sourceNow.value!==(nd.source||''))sourceNow.value=nd.source||'';
          autoEl(sourceNow);
        } else {
          const st=document.createElement('textarea');
          st.className='fi ar source-field';
          st.dataset.nid=nd.id;
          st.dataset.f='source';
          st.placeholder='Source (optionnel) : URL, auteur, article...';
          st.value=nd.source||'';
          stepEl.appendChild(st);
          autoEl(st);
        }
      } else if(sourceNow){
        sourceNow.remove();
      }
    }
  }

  // update actions
  const actBox=ov.querySelector('.modal-acts');
  if(actBox){
    let ah='';
    const canPrev=stepIdx>0;
    const canNext=stepIdx<maxReachableStep(nd)&&stepCanAdvance(nd,cur);
    const maxIdx=maxReachableStep(nd);
    ah+='<button class="abtn an" data-action="prev-step"'+(canPrev?'':' disabled')+'>← Précédent</button>';
    if(stepIdx<maxIdx)ah+='<button class="abtn an" data-action="next-step"'+(canNext?'':' disabled')+'>Suivant →</button>';
    else ah+='<button class="abtn av" data-nid="'+nd.id+'" data-action="validate">✅ Valider</button>';
    if(sm)ah+='<button class="abtn as" data-nid="'+nd.id+'" data-action="copy">📋 Copier le résumé</button>';
    if(nd.type!=='thesis')ah+='<button class="abtn ad" data-nid="'+nd.id+'" data-action="del">🗑️ Supprimer</button>';
    actBox.innerHTML=ah;
  }

  // update tree behind
  renderTree();
  updateScore();
}

/* ══════════════════════════════
   TEXTAREA AUTO-RESIZE
   ══════════════════════════════ */
function autoEl(el){el.style.height='auto';el.style.height=Math.max(44,el.scrollHeight)+'px'}

/* ══════════════════════════════
   EVENTS
   ══════════════════════════════ */
document.addEventListener('input',function(e){
  if(!e.target.matches('.fi'))return;
  const nid=e.target.dataset.nid,f=e.target.dataset.f;
  const nd=find(tree,nid);if(!nd)return;
  nd[f]=e.target.value;autoEl(e.target);
  softModal();
});

document.addEventListener('click',function(e){
  // Close modal
  if(e.target.closest('[data-close]')){closeModal();return}
  if(e.target.id==='modal-overlay'){closeModal();return}
  if(e.target.id==='notice-overlay'){closeNoticeModal();return}
  if(e.target.classList&&e.target.classList.contains('whelp-overlay')){setStepHelpOpen(false);return}

  // Quick delete from card
  const kdel=e.target.closest('[data-delcard]');
  if(kdel){del(kdel.dataset.delcard,false);return}

  // Tree node click → open modal
  const kc=e.target.closest('.kcard[data-edit]');
  if(kc){openModal(kc.dataset.edit);return}

  // Tree + buttons
  const addPro=e.target.closest('[data-addpro]');
  if(addPro){addKid(addPro.dataset.addpro,'pro');return}
  const addContra=e.target.closest('[data-addcontra]');
  if(addContra){addKid(addContra.dataset.addcontra,'contra');return}

  // Qualifier
  const qb=e.target.closest('.qbtn');
  if(qb){
    const nid=qb.dataset.nid,q=qb.dataset.q;
    const nd=find(tree,nid);if(!nd)return;
    nd.qualifier=q;
    qb.closest('.qrow').querySelectorAll('.qbtn').forEach(b=>b.classList.toggle('on',b.dataset.q===q));
    softModal();
    return;
  }

  // Actions in modal
  const ab=e.target.closest('[data-action]');
  if(ab){
    const nid=ab.dataset.nid,act=ab.dataset.action;
    if(act==='close-notice'){closeNoticeModal();return}
    if(act==='open-step-help'){
      const nd=find(tree,openModalId);if(!nd)return;
      const ss=modalSteps(nd);
      const stepIdx=Math.min(modalStepIndex,maxReachableStep(nd));
      const cur=ss[stepIdx];
      refreshStepHelpContent(cur&&cur.f);
      setStepHelpOpen(true);
      return;
    }
    if(act==='close-step-help'){setStepHelpOpen(false);return}
    if(act==='prev-step'){if(modalStepIndex>0){modalStepIndex--;softModal();}return}
    if(act==='next-step'){
      const nd=find(tree,openModalId);if(!nd)return;
      const mx=maxReachableStep(nd);
      const cur=modalSteps(nd)[modalStepIndex];
      if(modalStepIndex<mx&&stepCanAdvance(nd,cur)){modalStepIndex++;softModal();}
      return;
    }
    if(act==='validate'){closeModal();autoVerifyMap();return}
    if(act==='del'){del(nid);return}
    if(act==='copy'){copySum(nid,ab);return}
  }

  const openSums=e.target.closest('#open-summaries-btn');
  if(openSums){openSummariesModal();return}
});

document.addEventListener('keydown',function(e){
  if(e.key!=='Escape')return;
  const nov=document.getElementById('notice-overlay');
  const noticeOpen=!!(nov&&nov.style.display!=='none');
  if(noticeOpen){closeNoticeModal();return;}
  const ov=document.getElementById('modal-overlay');
  const helpOpen=!!(ov&&ov.querySelector('.whelp-overlay.open'));
  if(helpOpen){setStepHelpOpen(false);return;}
  if(openModalId||modalView==='summary')closeModal();
});

document.addEventListener('keydown',function(e){
  if(e.key!=='Enter')return;
  const ta=e.target.closest('textarea.fi');
  if(!ta||modalView!=='edit'||!openModalId)return;

  e.preventDefault();
  const nd=find(tree,openModalId);if(!nd)return;
  const ss=modalSteps(nd);
  const stepIdx=Math.min(modalStepIndex,maxReachableStep(nd));
  const cur=ss[stepIdx];
  const maxIdx=maxReachableStep(nd);

  if(stepIdx<maxIdx&&stepCanAdvance(nd,cur)){
    modalStepIndex++;
    softModal();
    return;
  }

  if(stepIdx>=maxIdx){
    closeModal();
    autoVerifyMap();
  }
});

function addKid(pid,type){
  const p=find(tree,pid);if(!p)return;
  const c=mk(type);p.children.push(c);
  closeModal();
  renderTree();
  autoVerifyMap();
  // auto-open new node
  setTimeout(()=>openModal(c.id),150);
}
function del(nid,close=true){
  if(!tree||nid===tree.id)return;
  rm(tree,nid);
  if(close)closeModal();
  else renderTree();
  autoVerifyMap();
}
function copySum(nid,btn){
  const nd=find(tree,nid);if(!nd)return;
  navigator.clipboard.writeText(summaryPlain(nd)).then(()=>{
    btn.textContent='✅ Copié !';btn.classList.add('done');
    setTimeout(()=>{btn.textContent='📋 Copier';btn.classList.remove('done')},1500);
  });
}

async function shareMap(){
  if(!tree){
    openNoticeModal('Action impossible','Crée d\'abord une map avant de la partager.','error');
    return;
  }

  const shareBtn=document.getElementById('share-map-btn');
  const oldLabel=shareBtn?shareBtn.textContent:'Partager';
  if(shareBtn){shareBtn.disabled=true;shareBtn.textContent='Partage...';}

  try{
    const serializablePayload=await buildSerializableMapPayload();
    const res=await fetch(API_FILE+'?action=save',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tree:serializablePayload.tree})
    });
    const payload=await res.json();
    if(!res.ok||!payload.ok)throw new Error(payload.error||'Erreur serveur');

    const link=payload.url||('view.html?uid='+encodeURIComponent(payload.uid));
    if(navigator.share){
      await navigator.share({
        title:'Ma map ArgumentO',
        text:'Voici ma map ArgumentO (UID: '+payload.uid+')',
        url:link
      });
    } else if(navigator.clipboard&&navigator.clipboard.writeText){
      await navigator.clipboard.writeText(link);
      openNoticeModal('Partage prêt','Lien copié : '+link+'\nUID: '+payload.uid,'success');
    } else {
      window.prompt('Copie ce lien de partage :',link);
    }
  }catch(err){
    openNoticeModal('Partage impossible','Impossible de partager la map : '+(err.message||String(err)),'error');
  }finally{
    if(shareBtn){shareBtn.disabled=false;shareBtn.textContent=oldLabel;}
  }
}

function severityBadge(sev){
  const s=(sev||'low').toLowerCase();
  const lbl=s==='high'?'Élevé':(s==='medium'?'Moyen':'Faible');
  return '<span class="vsev '+s+'">'+lbl+'</span>';
}

function cloneTreeWithFlags(node,flagsById){
  if(!node)return null;
  const flags=flagsById.get(node.id)||[];
  return {
    ...node,
    flags:flags.map(flag=>({ ...flag })),
    children:(node.children||[]).map(child=>cloneTreeWithFlags(child,flagsById))
  };
}

async function requestVerifySnapshot(){
  const res=await fetch(API_FILE+'?action=verify',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({tree})
  });
  const raw=await res.text();
  if(!raw||!raw.trim())throw new Error('Réponse serveur vide (action verify).');
  let payload;
  try{
    payload=JSON.parse(raw);
  }catch(parseErr){
    const preview=raw.slice(0,180).replace(/\s+/g,' ');
    throw new Error('Réponse verify non-JSON: '+preview);
  }
  if(!res.ok||!payload.ok)throw new Error(payload.error||'Erreur serveur');
  return payload;
}

async function buildSerializableMapPayload(){
  const report=await requestVerifySnapshot();
  const flagsById=new Map((report.nodes||[]).map(node=>[node.id,node.flags||[]]));
  return {
    version:2,
    exportedAt:new Date().toISOString(),
    verificationSummary:report.summary||{},
    flagsGeneratedAt:report.generatedAt||null,
    tree:cloneTreeWithFlags(tree,flagsById)
  };
}

function buildVerifyModal(report){
  const sm=report.summary||{};
  const nodes=Array.isArray(report.nodes)?report.nodes:[];
  let h='<div class="modal sum-modal verify-modal">';
  h+='<div class="modal-head">';
  h+='<span class="badge thesis">Vérification</span>';
  h+='<span class="mnum">'+(sm.totalFlags||0)+' signalement(s)</span>';
  h+='<span class="spacer"></span>';
  h+='<button class="close-modal" data-close>✕</button>';
  h+='</div>';

  h+='<div class="verify-summary">';
  h+='<span class="vstat">Nœuds: <strong>'+(sm.totalNodes||0)+'</strong></span>';
  h+='<span class="vstat">Avec alertes: <strong>'+(sm.nodesWithFlags||0)+'</strong></span>';
  h+='<span class="vstat high">Élevé: <strong>'+(sm.high||0)+'</strong></span>';
  h+='<span class="vstat med">Moyen: <strong>'+(sm.medium||0)+'</strong></span>';
  h+='<span class="vstat low">Faible: <strong>'+(sm.low||0)+'</strong></span>';
  h+='</div>';

  if(!nodes.length){
    h+='<div class="sum-empty">Aucune alerte détectée. Structure globalement cohérente.</div>';
  }else{
    h+='<div class="verify-list">';
    nodes.forEach(n=>{
      h+='<div class="verify-node">';
      h+='<div class="verify-head"><span class="sum-num">'+esc(n.path||'?')+'</span><span class="sum-title '+(n.type||'pro')+'">'+esc((n.type||'').toUpperCase())+'</span></div>';
      h+='<p class="verify-claim">'+esc(n.claimPreview||'(sans claim)')+'</p>';
      h+='<ul class="verify-flags">';
      (n.flags||[]).forEach(f=>{
        h+='<li>'+severityBadge(f.severity)+' <strong>'+esc(f.type||'flag')+'</strong> · '+esc(f.hint||'')+'</li>';
      });
      h+='</ul>';
      h+='</div>';
    });
    h+='</div>';
  }

  h+='</div>';
  return h;
}

function setVerifyCounts(summary){
  const lowEl=document.getElementById('verify-count-low');
  const medEl=document.getElementById('verify-count-medium');
  const highEl=document.getElementById('verify-count-high');
  if(lowEl)lowEl.textContent=String((summary&&summary.low)||0);
  if(medEl)medEl.textContent=String((summary&&summary.medium)||0);
  if(highEl)highEl.textContent=String((summary&&summary.high)||0);
}

async function requestVerifyReport(showAlertOnError=true){
  const reqSeq=++verifyRequestSeq;
  try{
    const res=await fetch(API_FILE+'?action=verify',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tree})
    });
    const raw=await res.text();
    if(!raw||!raw.trim()){
      throw new Error('Réponse serveur vide (action verify).');
    }
    let payload;
    try{
      payload=JSON.parse(raw);
    }catch(parseErr){
      const preview=raw.slice(0,180).replace(/\s+/g,' ');
      throw new Error('Réponse verify non-JSON: '+preview);
    }
    if(!res.ok||!payload.ok)throw new Error(payload.error||'Erreur serveur');
    if(reqSeq!==verifyRequestSeq)return null;
    setVerifyCounts(payload.summary||{});
    return payload;
  }catch(err){
    if(showAlertOnError){
      openNoticeModal('Vérification impossible','Impossible d\'exécuter la vérification : '+(err.message||String(err)),'error');
    } else {
      dbgWarn('verify auto failed', err.message||String(err));
    }
    return null;
  }
}

function autoVerifyMap(){
  if(!tree){
    setVerifyCounts({low:0,medium:0,high:0});
    return;
  }
  requestVerifyReport(false);
}

async function verifyMap(){
  if(!tree){
    openNoticeModal('Action impossible','Crée d\'abord une map avant de lancer la vérification.','error');
    return;
  }

  const verifyBtn=document.getElementById('verify-map-btn');
  const oldLabel=verifyBtn?verifyBtn.textContent:'Vérifier';
  if(verifyBtn){verifyBtn.disabled=true;verifyBtn.textContent='Vérification...';}

  try{
    const payload=await requestVerifyReport(false);
    if(!payload)return;

    modalView='summary';
    const ov=document.getElementById('modal-overlay');
    if(!ov)return;
    ov.style.display='flex';
    ov.innerHTML=buildVerifyModal(payload);
  }catch(err){
    openNoticeModal('Vérification impossible','Impossible d\'exécuter la vérification : '+(err.message||String(err)),'error');
  }finally{
    if(verifyBtn){verifyBtn.disabled=false;verifyBtn.textContent=oldLabel;}
  }
}

async function exportMap(){
  if(!tree){
    openNoticeModal('Export impossible','Aucune map à exporter pour le moment.','error');
    return;
  }

  const payload=await buildSerializableMapPayload();
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  a.href=url;
  a.download='argumentO-'+stamp+'.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function normalizeImportedNode(raw){
  if(!raw||typeof raw!=='object')return mk('pro','');
  const type=(raw.type==='thesis'||raw.type==='pro'||raw.type==='contra')?raw.type:'pro';
  const node={
    id:typeof raw.id==='string'&&raw.id?raw.id:'n'+(++uid),
    type,
    claim:typeof raw.claim==='string'?raw.claim:'',
    data:typeof raw.data==='string'?raw.data:'',
    warrant:typeof raw.warrant==='string'?raw.warrant:'',
    backing:typeof raw.backing==='string'?raw.backing:'',
    source:typeof raw.source==='string'?raw.source:'',
    qualifier:typeof raw.qualifier==='string'&&raw.qualifier?raw.qualifier:'probablement',
    rebuttal:typeof raw.rebuttal==='string'?raw.rebuttal:'',
    children:Array.isArray(raw.children)?raw.children.map(normalizeImportedNode):[]
  };
  return node;
}

function maxUidInTree(n){
  let m=0;
  if(!n)return 0;
  if(typeof n.id==='string'&&/^n\d+$/.test(n.id))m=Math.max(m,parseInt(n.id.slice(1),10)||0);
  (n.children||[]).forEach(c=>{m=Math.max(m,maxUidInTree(c));});
  return m;
}

async function importMapFromFile(file){
  if(!file)return;
  try{
    const text=await file.text();
    const parsed=JSON.parse(text);
    const rawTree=(parsed&&parsed.tree)?parsed.tree:parsed;
    if(!rawTree||typeof rawTree!=='object')throw new Error('Format JSON invalide.');

    uid=0;
    const imported=normalizeImportedNode(rawTree);
    if(imported.type!=='thesis')imported.type='thesis';
    tree=imported;
    uid=Math.max(uid,maxUidInTree(tree));
    openModalId=null;
    modalStepIndex=0;

    const startEl=document.getElementById('start');
    const appEl=document.getElementById('app');
    if(startEl&&appEl){
      startEl.style.display='none';
      appEl.style.display='block';
    }
    renderTree();
    autoVerifyMap();
    openNoticeModal('Import réussi','Ta map est chargée.','success');
  }catch(err){
    openNoticeModal('Import impossible',(err.message||String(err)),'error');
  }
}

function collectNodesWithNum(n,num='',a=[]){
  a.push({nd:n,num:num||'1'});
  n.children.forEach((c,i)=>collectNodesWithNum(c,(num?num+'.':'')+(i+1),a));
  return a;
}

function openSummariesModal(){
  if(!tree)return;
  modalView='summary';
  const ov=document.getElementById('modal-overlay');
  if(!ov)return;
  ov.style.display='flex';
  ov.innerHTML=buildSummariesModal();
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

  let h='<div class="modal sum-modal global-summaries-modal">';
  h+='<div class="modal-head">';
  h+='<span class="badge thesis">Résumés globaux</span>';
  h+='<span class="mnum">'+ready.length+' / '+list.length+' complets</span>';
  h+='<span class="spacer"></span>';
  h+='<button class="close-modal" data-close>✕</button>';
  h+='</div>';

  if(!ready.length){
    h+='<div class="sum-empty">Complète au moins Claim + Data + Warrant pour générer des résumés.</div>';
  } else {
    h+='<div class="sum-essay">';
    ready.forEach(it=>{
      h+='<p class="sum-para"><span class="sum-para-label '+it.type+'">'+it.num+' · '+it.title+'</span> '+it.sum+'</p>';
    });
    h+='</div>';
  }

  h+='</div>';
  return h;
}

/* ══════════════════════════════
   LIFECYCLE
   ══════════════════════════════ */
function go(){
  dbg('go() appelee');
  const thesisInput=document.getElementById('thesis-in');
  if(!thesisInput){
    dbgErr('go: #thesis-in introuvable');
    return;
  }
  const v=thesisInput.value.trim();
  dbg('go: valeur detectee', { length: v.length, preview: v.slice(0, 60) });
  if(!v){
    dbgWarn('go: thèse vide, demarrage annule');
    thesisInput.classList.add('invalid');
    thesisInput.focus();
    return;
  }
  const startEl = document.getElementById('start');
  const appEl = document.getElementById('app');
  if(!startEl || !appEl){
    dbgErr('go: element start/app manquant', { hasStart: !!startEl, hasApp: !!appEl });
    return;
  }
  thesisInput.classList.remove('invalid');
  tree=mk('thesis',v);
  dbg('go: arbre initialise', tree);
  startEl.style.display='none';
  appEl.style.display='block';
  renderTree();
  autoVerifyMap();
  dbg('go: rendu principal termine, ouverture modal dans 200ms');
  setTimeout(()=>openModal(tree.id),200);
}
function reset(){
  dbg('reset() appelee');
  const startEl = document.getElementById('start');
  const appEl = document.getElementById('app');
  const thesisInput = document.getElementById('thesis-in');
  if(!startEl || !appEl || !thesisInput){
    dbgWarn('reset: element(s) manquant(s)', { hasStart: !!startEl, hasApp: !!appEl, hasInput: !!thesisInput });
    return;
  }
  tree=null;uid=0;openModalId=null;
  startEl.style.display='';
  appEl.style.display='none';
  thesisInput.value='';
  autoVerifyMap();
}
const thesisInputEl = document.getElementById('thesis-in');
if(thesisInputEl){
  dbg('binding events sur #thesis-in');
  thesisInputEl.addEventListener('keydown',e=>{
    dbg('keydown sur #thesis-in', { key: e.key, shiftKey: e.shiftKey });
    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();go()}
  });
  thesisInputEl.addEventListener('input',e=>{
    dbg('input sur #thesis-in', { length: e.currentTarget.value.length });
    e.currentTarget.classList.remove('invalid')
  });
} else {
  dbgErr('boot: #thesis-in introuvable au chargement');
}

const startBtn=document.getElementById('start-go-btn');
if(startBtn){
  dbg('binding click sur #start-go-btn');
  startBtn.addEventListener('click',e=>{
    dbg('click sur #start-go-btn', { trusted: e.isTrusted });
    go();
  });
} else {
  dbgErr('boot: #start-go-btn introuvable au chargement');
}

const shareMapBtn=document.getElementById('share-map-btn');
if(shareMapBtn){
  shareMapBtn.addEventListener('click',()=>shareMap());
}

const verifyMapBtn=document.getElementById('verify-map-btn');
if(verifyMapBtn){
  verifyMapBtn.addEventListener('click',()=>verifyMap());
}

setVerifyCounts({low:0,medium:0,high:0});

const exportMapBtn=document.getElementById('export-map-btn');
if(exportMapBtn){
  exportMapBtn.addEventListener('click',()=>exportMap());
}

const startImportBtn=document.getElementById('start-import-btn');
const importMapBtn=document.getElementById('import-map-btn');
const importMapFile=document.getElementById('import-map-file');
if(importMapFile){
  if(importMapBtn){
    importMapBtn.addEventListener('click',()=>importMapFile.click());
  }
  if(startImportBtn){
    startImportBtn.addEventListener('click',()=>importMapFile.click());
  }
  importMapFile.addEventListener('change',async e=>{
    const file=e.target.files&&e.target.files[0];
    await importMapFromFile(file);
    importMapFile.value='';
  });
}

window.go=go;
window.reset=reset;
dbg('fonctions globales exposees', { hasGo: typeof window.go === 'function', hasReset: typeof window.reset === 'function' });
