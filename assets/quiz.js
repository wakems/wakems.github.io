/* Wakems : quiz « Trouve ton parfum » (4 questions, recommandation parmi les parfums notés). */
(function(){
'use strict';
const band=document.getElementById('quiz'),modal=document.getElementById('quizModal');if(!band||!modal)return;
const body=modal.querySelector('.qzBody');
let rows=[];band.hidden=true;
window.addEventListener('wakems:reviews',e=>{rows=(e.detail||[]).slice();band.hidden=rows.length<3});

const Q=[
  {q:'Tu cherches plutôt…',k:'style',o:[
    ['Sucré, gourmand','gourmand',{Gourmand:3,Ambré:1}],
    ['Frais, lumineux','frais',{Frais:3,Fruité:1}],
    ['Boisé, intense','bois',{Boisé:3,Ambré:2}],
    ['Fleuri, délicat','fleur',{Floral:3,Musqué:2}],
    ['Fruité, pétillant','fruit',{Fruité:3,Frais:1}]]},
  {q:'Pour quelle saison ?',k:'saison',o:[
    ['L’hiver','hiver',{Gourmand:1.5,Ambré:1.5,Boisé:1.5}],
    ['L’été','ete',{Frais:1.5,Fruité:1.5,Floral:1}],
    ['Toute l’année','tout',{}]]},
  {q:'Tu veux qu’on le sente…',k:'force',o:[
    ['Juste de près','doux',null],
    ['Un peu autour de toi','moyen',null],
    ['Dans toute la pièce','fort',null]]},
  {q:'Tu le portes surtout…',k:'moment',o:[
    ['Au quotidien','jour',{Frais:1.5,Musqué:1.5,Floral:1}],
    ['En soirée','soir',{Ambré:1.5,Boisé:1.5,Gourmand:1}],
    ['En rendez-vous','rdv',{Gourmand:1.5,Floral:1,Ambré:1,Musqué:1}]]}
];
const WHY={gourmand:'gourmand',frais:'frais',bois:'boisé',fleur:'floral',fruit:'fruité',hiver:'parfait l’hiver',ete:'idéal l’été',doux:'discret',moyen:'bien présent',fort:'qui se remarque',jour:'facile à porter',soir:'pour le soir',rdv:'pour séduire'};
let step=0,ans={};

function famsOf(r){
  const H=window.wakemsHelpers;if(!H)return new Set();
  const out=new Set([H.famOf(r)]);
  (r.accords||[]).forEach(a=>{const t=H.norm(a);for(const [n,re] of H.FAMS){if(re.test(t)){out.add(n);break}}});
  return out;
}
function scoreOf(r){
  const H=window.wakemsHelpers,F=famsOf(r);let s=0;
  Q.forEach(q=>{const a=ans[q.k];if(!a)return;const o=q.o.find(x=>x[1]===a);if(!o)return;
    if(o[2])Object.keys(o[2]).forEach(f=>{if(F.has(f))s+=o[2][f]});
    if(q.k==='force'&&H){const l=H.levelOf('sillage',r.sillage);if(l!=null){const want=a==='doux'?2:a==='moyen'?3:4.5;s+=1.5-Math.min(1.5,Math.abs(l-want)*.6)}}
  });
  return s+(Number(r.score)||0)/10*1.6;
}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const fmt=n=>n==null?'':String(Number(n)).replace('.',',');

function render(){
  if(step<Q.length){
    const q=Q[step];
    body.innerHTML=`<div class="qzStep" key="${step}"><div class="qzProg"><i style="width:${(step/Q.length)*100}%"></i></div>
      <span class="qzCount">Question ${step+1} sur ${Q.length}</span><h3 id="qzTitle">${q.q}</h3>
      <div class="qzOpts">${q.o.map(o=>`<button type="button" data-a="${o[1]}"${ans[q.k]===o[1]?' class="on"':''}>${o[0]}</button>`).join('')}</div>
      ${step?'<button type="button" class="qzBack">← Retour</button>':''}</div>`;
    body.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',()=>{ans[q.k]=b.dataset.a;b.classList.add('on');setTimeout(()=>{step++;render()},180)}));
    const bk=body.querySelector('.qzBack');if(bk)bk.addEventListener('click',()=>{step--;render()});
    const f=body.querySelector('[data-a]');if(f)f.focus({preventScroll:true});
    return;
  }
  const list=rows.map(r=>({r,s:scoreOf(r)})).sort((a,b)=>b.s-a.s);
  const best=list[0]&&list[0].r,alt=list.slice(1,3).map(o=>o.r);if(!best){body.innerHTML='<p>Aucun parfum pour le moment.</p>';return}
  const why=Q.map(q=>WHY[ans[q.k]]).filter(Boolean).filter(w=>w!=='Toute l’année').slice(0,3).join(' · ');
  body.innerHTML=`<div class="qzResult"><div class="qzProg"><i style="width:100%"></i></div>
    <span class="qzCount">Ton parfum</span>
    <div class="qzBest"><div class="qzImg" style="--rv:${esc(best.color||'#C9A33A')}">${best.image_url?`<img src="${esc(best.image_url)}" alt="">`:''}</div>
      <div><span class="rvBrand">${esc(best.brand||'')}</span><h3 id="qzTitle">${esc(best.name)}</h3>
      ${best.score!=null?`<p class="qzScore"><b>${fmt(best.score)}</b>/10 selon Wakems</p>`:''}<p class="qzWhy">${esc(why)}</p>
      <button type="button" class="primary" data-open="${esc(best.id)}">Voir l’avis</button></div></div>
    ${alt.length?`<span class="qzCount">Tu pourrais aussi aimer</span><div class="qzAlt">${alt.map(x=>`<button type="button" data-open="${esc(x.id)}"><span class="qzMini" style="--rv:${esc(x.color||'#E9E1D6')}">${x.image_url?`<img src="${esc(x.image_url)}" alt="" loading="lazy">`:''}</span><b>${esc(x.name)}</b><small>${esc(x.brand||'')}</small></button>`).join('')}</div>`:''}
    <button type="button" class="qzBack qzAgain">Recommencer</button></div>`;
  body.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>{close();if(window.wakemsOpenReview)window.wakemsOpenReview(b.dataset.open)}));
  body.querySelector('.qzAgain').addEventListener('click',()=>{step=0;ans={};render()});
}
let last=null;
function open(){last=document.activeElement;step=0;ans={};render();modal.classList.add('open');document.body.style.overflow='hidden'}
function close(){modal.classList.remove('open');document.body.style.overflow='';if(last&&last.focus)try{last.focus({preventScroll:true})}catch(e){}}
document.getElementById('quizStart').addEventListener('click',open);
modal.querySelector('.close').addEventListener('click',close);
modal.addEventListener('click',e=>{if(e.target===modal)close()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('open'))close()});
})();
