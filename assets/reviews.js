/* Wakems : affichage public des avis parfum (table wakems_reviews). */
(function(){
'use strict';
const URL_=window.WAKEMS_SUPABASE_URL||'',KEY=window.WAKEMS_SUPABASE_KEY||'';
const grid=document.getElementById('reviewsGrid');if(!grid)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null||n===''?'':String(Number(n)).replace('.',',');
const VERD={skip:'Skip',maybe:'Maybe',must:'Must try'};
function verdictOf(r){if(VERD[r.verdict])return r.verdict;const n=r.score==null?null:Number(r.score);if(n==null)return 'maybe';return n<5?'skip':n<7.5?'maybe':'must'}
function levelOf(kind,txt){
  const t=(txt||'').toLowerCase();if(!t.trim())return null;
  let m=t.match(/(\d(?:[.,]\d)?)\s*\/\s*5/);if(m)return Math.max(0,Math.min(5,Math.round(parseFloat(m[1].replace(',','.')))));
  if(kind==='tenue'){
    const nums=(t.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>parseFloat(n.replace(',','.')));
    if(nums.length){const h=Math.max.apply(null,nums);return h<3?1:h<5?2:h<7?3:h<9?4:5}
    if(/longue|forte|excellente/.test(t))return 4;if(/bonne|correcte|moyenne|mod[eé]r/.test(t))return 3;if(/courte|faible/.test(t))return 2;return null;
  }
  if(/[eé]norme|monstre|nucl[eé]aire|bombe/.test(t))return 5;if(/puissant|fort|intense/.test(t))return 4;
  if(/mod[eé]r|moyen|correct|pr[eé]sent/.test(t))return 3;if(/discret|l[eé]ger|peau|intime|faible/.test(t))return 2;return null;
}
const meter=l=>l==null?'':'<span class="meter" aria-hidden="true">'+[0,1,2,3,4].map(i=>'<i'+(i<l?' class="on"':'')+'></i>').join('')+'</span>';
let rows=[],sb=null,debates=new Map(),counts=new Map(),fam='Tous';
/* familles olfactives (même logique que le studio) */
const FAMS=[['Gourmand',/vanill|tonka|gourmand|caramel|pralin|chocolat|cacao|caf[eé]|miel|cr[eè]me|amande|sucr|biscuit|bru?l/],['Ambré',/ambr|benjoin|labdanum|r[eé]sine|[eé]pic|poivre|cannelle|canelle|safran|cardamome|gingembre|girofle/],['Boisé',/bois|c[eè]dre|santal|vetiver|patchouli|oud|cuir|tabac|fum[eé]|encens/],['Floral',/floral|fleur|rose|jasmin|iris|pivoine|tub[eé]reuse|ylang|muguet|violette|poudr/],['Frais',/frais|fra[iî]ch|marin|aquatique|menthe|hesp[eé]rid|citr|bergamot|orange|mandarine|pamplemousse|agrum|yuzu|lavande|aromat|vert|th[eé]/],['Fruité',/fruit|pomme|poire|p[eê]che|framboise|cassis|fraise|cerise|abricot|prune|coco|ananas|mangue/],['Musqué',/musc|musk|coton|propre/]];
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function famOf(r){const acc=(r.accords||[]).map(norm);for(const a of acc){for(const [n,re] of FAMS){if(re.test(a))return n}}const t=norm([r.notes_top,r.notes_heart,r.notes_base].join(' '));for(const [n,re] of FAMS){if(re.test(t))return n}return 'Autres'}
function getSb(){
  if(sb)return sb;
  try{if(typeof window.wakemsSb!=='undefined'&&window.wakemsSb){sb=window.wakemsSb;return sb}}catch(e){}
  if(window.supabase&&window.supabase.createClient&&/^https:\/\//.test(URL_)&&KEY.length>20){sb=window.supabase.createClient(URL_,KEY,{auth:{persistSession:true,storageKey:'wakems-reviews-ro',autoRefreshToken:false,detectSessionInUrl:false}});window.wakemsSb=sb}
  return sb;
}
const FAMADJ={'Gourmand':'gourmand','Ambré':'ambré et épicé','Boisé':'boisé','Floral':'floral','Frais':'frais','Fruité':'fruité','Musqué':'musqué'};
const lc=x=>String(x||'').trim().toLowerCase();
function joinFr(a){a=a.filter(Boolean);return a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' et '+a[a.length-1]}
/* description : celle saisie, sinon une présentation construite à partir des infos de la fiche */
function describe(r){
  if(r.description&&r.description.trim())return r.description.trim();
  const f=famOf(r),adj=FAMADJ[f],acc=(r.accords||[]).map(lc).filter(Boolean);
  let t=(r.name||'Ce parfum')+(r.brand?' de '+r.brand:'')+' est '+(adj?'un parfum '+adj:'un parfum')+(acc.length?', porté par des accords '+joinFr(acc):'')+'.';
  const n=[[r.notes_top,'En tête'],[r.notes_heart,'au cœur'],[r.notes_base,'en fond']].filter(x=>x[0]&&x[0].length<120);
  if(n.length)t+=' '+n.map(x=>x[1]+', '+lc(x[0])).join(' ; ')+'.';
  if(r.tenue||r.sillage)t+=' '+[r.tenue?'Tenue : '+lc(r.tenue):'',r.sillage?'sillage '+lc(r.sillage):''].filter(Boolean).join(', ')+'.';
  return t;
}
function card(r){
  const v=verdictOf(r),bg=r.color||'#E9E1D6';
  return `<article class="rv" data-rv="${esc(r.id)}" tabindex="0" role="button" aria-label="${esc(r.name)}, ${fmt(r.score)} sur 10">
    <div class="rvImg" style="--rv:${esc(bg)}">${(r.slides||[]).length?`<span class="rvSlidesTag">${r.slides.length} diapos</span>`:''}${r.image_url?`<img src="${esc(r.image_url)}" alt="" loading="lazy">`:`<span class="rvPh">${esc((r.name||'?').slice(0,1))}</span>`}</div>
    <div class="rvBody"><span class="rvBrand">${esc(r.brand||'')}</span><h3>${esc(r.name)}</h3>
    <div class="rvMeta">${r.score!=null?`<span class="rvScore">${fmt(r.score)}<small>/10</small></span>`:''}<span class="rvVerdict v-${v}">${VERD[v]}</span></div>
    <p class="rvDesc">${esc(describe(r))}</p>
    ${counts.get(r.id)?`<span class="rvComm">${counts.get(r.id)} avis de la communauté</span>`:''}</div></article>`;
}
function render(){
  const q=(document.getElementById('reviewSearch')||{}).value||'';const term=q.trim().toLocaleLowerCase('fr');
  let list=rows.filter(r=>(fam==='Tous'||(fam==='Must try'?verdictOf(r)==='must':famOf(r)===fam))&&(!term||[r.name,r.brand,(r.accords||[]).join(' '),r.notes_top,r.notes_heart,r.notes_base].join(' ').toLocaleLowerCase('fr').includes(term)));
  const so=(document.getElementById('reviewSort')||{}).value||'recent',sc=r=>r.score==null?-1:Number(r.score);
  if(so==='best')list=list.slice().sort((a,b)=>sc(b)-sc(a));else if(so==='worst')list=list.slice().sort((a,b)=>sc(a)-sc(b));else if(so==='name')list=list.slice().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr'));
  if(!rows.length){grid.innerHTML='<div class="empty"><strong>Les premiers avis arrivent.</strong><p>Les parfums notés par Wakems apparaîtront ici.</p></div>';return}
  if(!list.length){grid.innerHTML='<div class="empty"><strong>Aucun parfum trouvé.</strong><p>Essaie un autre nom ou une autre note.</p></div>';return}
  grid.innerHTML=list.map(card).join('');
  grid.querySelectorAll('[data-rv]').forEach(el=>{const o=()=>openReview(el.dataset.rv);el.addEventListener('click',o);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();o()}})});
}
function openReview(id){
  const r=rows.find(x=>x.id===id);if(!r)return;const m=document.getElementById('reviewModal');if(!m)return;
  const v=verdictOf(r),line=(l,t)=>t?`<div class="rvRow"><span>${l}</span><p>${esc(t)}</p></div>`:'';
  const perf=[['Tenue',r.tenue,levelOf('tenue',r.tenue)],['Sillage',r.sillage,levelOf('sillage',r.sillage)]].filter(x=>x[1]);
  m.querySelector('.rvDetail').innerHTML=`
    <div class="rvDVisual" style="--rv:${esc(r.color||'#E9E1D6')}">${r.image_url?`<img src="${esc(r.image_url)}" alt="Flacon de ${esc(r.name)}">`:''}</div>
    <div class="rvDText">
      <span class="eyebrow">${esc([r.brand,r.concentration,r.release_year].filter(Boolean).join(' · '))}</span>
      <h2 id="reviewTitle">${esc(r.name)}</h2>
      <div class="rvMeta big">${r.score!=null?`<span class="rvScore">${fmt(r.score)}<small>/10</small></span>`:''}<span class="rvVerdict v-${v}">${VERD[v]}</span></div>
      ${(r.accords||[]).length?`<div class="rvAccords">${r.accords.map(a=>`<span>${esc(a)}</span>`).join('')}</div>`:''}
      <div class="rvSection"><span>Le parfum</span><p>${esc(describe(r))}</p></div>
      ${(r.slides||[]).length?`<div class="rvSlides"><span>Les diapos Wakems · glisse →</span><div class="slideRail">${r.slides.map((u,i)=>`<img src="${esc(u)}" alt="Diapo ${i+1} sur ${r.slides.length} : ${esc(r.name)}" loading="lazy" data-zoom="${i}">`).join('')}</div></div>`:''}
      ${r.review?`<div class="rvSection"><span>L'avis Wakems</span></div><blockquote class="rvQuote">${esc(r.review)}</blockquote>`:''}
      ${perf.length?`<div class="rvPerf">${perf.map(p=>`<div><span>${p[0]}</span><b>${esc(p[1])}</b>${meter(p[2])}</div>`).join('')}</div>`:''}
      <div class="rvRows">${line('Tête',r.notes_top)}${line(!r.notes_top&&!r.notes_base?'Notes':'Cœur',r.notes_heart)}${line('Fond',r.notes_base)}${line('Parfumeur',r.perfumer)}${line('Prix',r.price)}</div>
      ${debates.has(r.id)?`<div class="rvDebate"><p>Et toi, tu en penses quoi ?${counts.get(r.id)?` <small>${counts.get(r.id)} avis déjà</small>`:''}</p><button type="button" class="primary" data-debate="${esc(debates.get(r.id))}">Donner mon avis ↗</button></div>`:''}
      <div class="rvShare"><button type="button" class="ghost" data-share="${esc(r.id)}">Partager ce parfum</button><span class="rvShareMsg" aria-live="polite"></span></div>
    </div>`;
  const db_=m.querySelector('[data-debate]');
  if(db_)db_.addEventListener('click',()=>{const pid=db_.dataset.debate;closeReview();let ok=false;try{ok=(0,eval)('typeof openDiscussion==="function"&&posts.some(p=>p.id==="'+pid.replace(/[^a-f0-9-]/gi,'')+'")')}catch(e){}if(ok){(0,eval)('openDiscussion')(pid)}else{const d=document.getElementById('debats');if(d)d.scrollIntoView({behavior:'smooth'})}});
  m.querySelectorAll('[data-zoom]').forEach(im=>im.addEventListener('click',()=>zoomSlides(r.slides,+im.dataset.zoom)));
  const sh=m.querySelector('[data-share]');
  if(sh)sh.addEventListener('click',async()=>{const url=location.origin+'/?parfum='+encodeURIComponent(r.id),txt=r.name+(r.brand?' · '+r.brand:'')+(r.score!=null?' : '+fmt(r.score)+'/10':'')+' sur Wakems';
    try{if(navigator.share){await navigator.share({title:r.name,text:txt,url});return}}catch(e){if(e&&e.name==='AbortError')return}
    try{await navigator.clipboard.writeText(url);m.querySelector('.rvShareMsg').textContent='Lien copié ✓'}catch(e){m.querySelector('.rvShareMsg').textContent=url}});
  m.classList.add('open');document.body.style.overflow='hidden';m.querySelector('.close').focus();
  try{history.replaceState(null,'','?parfum='+encodeURIComponent(r.id)+location.hash)}catch(e){}
}
function zoomSlides(list,i){
  const z=document.createElement('div');z.className='slideZoom';z.setAttribute('role','dialog');z.setAttribute('aria-label','Diapos');
  z.innerHTML='<button type="button" class="szNav szPrev" aria-label="Précédente">‹</button><img alt=""><button type="button" class="szNav szNext" aria-label="Suivante">›</button><button type="button" class="szClose" aria-label="Fermer">×</button><span class="szCount"></span>';
  const img=z.querySelector('img'),show=k=>{i=(k+list.length)%list.length;img.src=list[i];z.querySelector('.szCount').textContent=(i+1)+' / '+list.length};
  const close=()=>{z.remove();document.removeEventListener('keydown',key,true)},key=e=>{if(e.key==='Escape'){e.stopPropagation();close()}else if(e.key==='ArrowRight')show(i+1);else if(e.key==='ArrowLeft')show(i-1)};
  z.querySelector('.szPrev').onclick=e=>{e.stopPropagation();show(i-1)};z.querySelector('.szNext').onclick=e=>{e.stopPropagation();show(i+1)};
  img.onclick=e=>{e.stopPropagation();show(i+1)};z.querySelector('.szClose').onclick=close;z.onclick=close;
  let sx=null;z.addEventListener('touchstart',e=>{sx=e.touches[0].clientX},{passive:true});z.addEventListener('touchend',e=>{if(sx==null)return;const dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40){show(i+(dx<0?1:-1))}sx=null});
  document.addEventListener('keydown',key,true);document.body.appendChild(z);show(i);z.querySelector('.szClose').focus();
}
function closeReview(){const m=document.getElementById('reviewModal');if(!m)return;if(m.classList.contains('open')){try{history.replaceState(null,'',location.pathname+location.hash)}catch(e){}}m.classList.remove('open');document.body.style.overflow=''}
async function load(){
  const c=getSb();if(!c){grid.innerHTML='<div class="empty"><strong>Connexion indisponible.</strong><p>Recharge la page dans un instant.</p></div>';return}
  const {data,error}=await c.from('wakems_reviews').select('*').eq('is_published',true).order('created_at',{ascending:false}).limit(200);
  if(error){console.warn(error);grid.innerHTML='<div class="empty"><strong>Avis indisponibles pour le moment.</strong><p>Réessaie un peu plus tard.</p></div>';return}
  rows=data||[];
  try{const {data:ps}=await c.from('community_posts').select('id,review_id').not('review_id','is',null).limit(500);debates=new Map((ps||[]).map(p=>[p.review_id,p.id]));
    const ids=(ps||[]).map(p=>p.id);
    if(ids.length){const {data:cm}=await c.from('community_comments').select('post_id').eq('is_hidden',false).in('post_id',ids).limit(10000);const byPost={};(cm||[]).forEach(x=>byPost[x.post_id]=(byPost[x.post_id]||0)+1);debates.forEach((pid,rid)=>{if(byPost[pid])counts.set(rid,byPost[pid])})}}catch(e){}
  buildChips();render();featured();stats(c);
  try{window.wakemsOpenReview=openReview;window.dispatchEvent(new CustomEvent('wakems:reviews',{detail:rows}))}catch(e){}
  const deep=new URLSearchParams(location.search).get('parfum');if(deep&&rows.some(r=>r.id===deep))openReview(deep);
  const cnt=document.getElementById('reviewCount');if(cnt)cnt.textContent=rows.length?rows.length+' parfum'+(rows.length>1?'s':'')+' noté'+(rows.length>1?'s':''):'';
}
function buildChips(){
  const box=document.getElementById('famChips');if(!box)return;
  const present=new Set(rows.map(famOf)),opts=['Tous','Must try'].concat(FAMS.map(f=>f[0]).filter(n=>present.has(n)));if(present.has('Autres'))opts.push('Autres');
  box.innerHTML=opts.map(o=>`<button type="button" class="chip${o===fam?' on':''}" data-fam="${esc(o)}">${esc(o)}</button>`).join('');
  box.querySelectorAll('[data-fam]').forEach(b=>b.addEventListener('click',()=>{fam=b.dataset.fam;box.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b));render()}));
}
function featured(){
  const el=document.getElementById('featured');if(!el||!rows.length)return;
  const pick=rows.filter(r=>r.featured_at).sort((a,b)=>new Date(b.featured_at)-new Date(a.featured_at))[0];
  const best=pick||rows.slice().sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)||new Date(b.created_at)-new Date(a.created_at))[0];if(!best)return;
  const v=verdictOf(best);
  el.innerHTML=`<div class="ftVisual" style="--rv:${esc(best.color||'#C9A33A')}">${best.image_url?`<img src="${esc(best.image_url)}" alt="Flacon de ${esc(best.name)}">`:''}</div>
    <div class="ftText"><span class="eyebrow">${pick?"Le coup de cœur de Wakems":"Coup de cœur du moment"}</span><span class="rvBrand">${esc(best.brand||'')}</span><h2>${esc(best.name)}</h2>
    <div class="rvMeta big">${best.score!=null?`<span class="rvScore">${fmt(best.score)}<small>/10</small></span>`:''}<span class="rvVerdict v-${v}">${VERD[v]}</span></div>
    ${(best.accords||[]).length?`<div class="rvAccords">${best.accords.map(a=>`<span>${esc(a)}</span>`).join('')}</div>`:''}
    <button type="button" class="primary" data-feat="${esc(best.id)}">Lire l'avis complet</button></div>`;
  el.hidden=false;el.querySelector('[data-feat]').addEventListener('click',()=>openReview(best.id));
}
async function stats(c){
  const set=(id,n)=>{const e=document.getElementById(id);if(e&&n!=null)e.textContent=String(n)};
  set('stReviews',rows.length);
  try{const r1=await c.from('community_comments').select('id',{count:'exact',head:true}).eq('is_hidden',false);set('stComments',r1.count??'–')}catch(e){}
  try{const r2=await c.from('community_profiles').select('user_id',{count:'exact',head:true});set('stMembers',r2.count??'–')}catch(e){}
}
function boot(){
  const cm=document.getElementById('copyMail');if(cm)cm.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(cm.dataset.mail);const t=cm.textContent;cm.textContent='Adresse copiée ✓';setTimeout(()=>cm.textContent=t,1800)}catch(e){location.href='mailto:'+cm.dataset.mail}});
  const so=document.getElementById('reviewSort');if(so)so.addEventListener('change',render);
  const m=document.getElementById('reviewModal');
  if(m){m.addEventListener('click',e=>{if(e.target===m)closeReview()});m.querySelector('.close').addEventListener('click',closeReview)}
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeReview()});
  const s=document.getElementById('reviewSearch');if(s)s.addEventListener('input',render);
  let tries=0;(function wait(){if(window.supabase&&window.supabase.createClient){load()}else if(tries++<40)setTimeout(wait,150);else load()})();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
