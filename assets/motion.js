/* Wakems : animations douces (titre mot à mot, apparitions, compteurs, inclinaison des cartes). */
(function(){
'use strict';
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('motion');
if(calm)document.documentElement.classList.add('calm');
/* titre : mot par mot */
const h1=document.querySelector('.hero h1');
if(h1&&!calm){
  const walk=(node,out)=>{node.childNodes.forEach(n=>{if(n.nodeType===3){n.textContent.split(/(\s+)/).forEach(w=>{if(!w)return;if(/^\s+$/.test(w)){out.push(document.createTextNode(w));return}const s=document.createElement('span');s.className='w';s.innerHTML='<span></span>';s.firstChild.textContent=w;out.push(s)})}else{const c=n.cloneNode(false);const sub=[];walk(n,sub);sub.forEach(x=>c.appendChild(x));out.push(c)}})};
  const out=[];walk(h1,out);h1.textContent='';out.forEach(x=>h1.appendChild(x));
  h1.querySelectorAll('.w>span').forEach((s,i)=>s.style.animationDelay=(.08+i*.07)+'s');h1.classList.add('split');setTimeout(()=>h1.classList.add('done'),2600);
}
/* apparitions au défilement */
const SEL='.trailer,.featured,.weekVote .blockHead,.wv,.howItem,.block .blockHead,.rv,.contact,.tiktokBand';
let io=null;
if(!calm&&'IntersectionObserver' in window)io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
function arm(){
  if(!io)return;
  document.querySelectorAll(SEL).forEach(el=>{
    if(el.dataset.rev)return;el.dataset.rev='1';el.classList.add('rev');
    const sib=el.parentElement?[...el.parentElement.children].filter(x=>x.matches(SEL)):[];const k=sib.indexOf(el);
    if(k>0)el.style.transitionDelay=Math.min(k%4,3)*70+'ms';
    io.observe(el);
  });
}
arm();
new MutationObserver(ms=>{if(ms.some(m=>m.addedNodes.length))arm()}).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
/* compteurs qui défilent */
function countUp(el){
  const t=el.textContent.trim();if(!/^\d+$/.test(t)||el.dataset.counted===t)return;el.dataset.counted=t;
  const n=+t;if(calm||n<2)return;const t0=performance.now(),d=1400;
  const step=now=>{const k=Math.min(1,(now-t0)/d),e=1-Math.pow(1-k,3),v=String(Math.round(n*e));el.dataset.counted=v===t?t:el.dataset.counted;el.textContent=v;if(k<1)requestAnimationFrame(step);else el.dataset.counted=t};
  el.textContent='0';requestAnimationFrame(step);
}
['stReviews','stComments','stMembers'].forEach(id=>{const el=document.getElementById(id);if(!el)return;new MutationObserver(()=>{if(el.dataset.counted!==el.textContent.trim()&&!el._run){el._run=1;countUp(el);setTimeout(()=>el._run=0,1500)}}).observe(el,{childList:true,characterData:true,subtree:true})});
/* inclinaison 3D légère des cartes (souris uniquement) */
if(!calm&&window.matchMedia&&matchMedia('(hover:hover) and (pointer:fine)').matches){
  document.addEventListener('pointermove',e=>{
    const c=e.target.closest&&e.target.closest('.rv,.wv');
    document.querySelectorAll('.tilt').forEach(x=>{if(x!==c){x.classList.remove('tilt');x.style.transform=''}});
    if(!c)return;const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
    c.classList.add('tilt');c.style.transform=`perspective(900px) rotateX(${(-y*5).toFixed(2)}deg) rotateY(${(x*6).toFixed(2)}deg) translateY(-4px)`;
  },{passive:true});
}
/* barre de progression de lecture */
if(!calm){const bar=document.createElement('div');bar.className='readBar';bar.setAttribute('aria-hidden','true');document.body.appendChild(bar);
  let tk=false;const upd=()=>{tk=false;const h=document.documentElement.scrollHeight-innerHeight;bar.style.transform='scaleX('+(h>0?Math.min(1,scrollY/h):0)+')'};
  addEventListener('scroll',()=>{if(!tk){tk=true;requestAnimationFrame(upd)}},{passive:true});upd()}
/* notes qui défilent jusqu'à leur valeur quand la carte apparaît */
function scoreUp(card){
  const s=card.querySelector('.rvScore');if(!s||s.dataset.up)return;s.dataset.up='1';
  const t=s.firstChild;if(!t||t.nodeType!==3)return;const target=parseFloat(t.textContent.replace(',','.'));if(isNaN(target))return;
  const dec=/[,.]/.test(t.textContent),t0=performance.now(),d=1100;
  const step=now=>{const k=Math.min(1,(now-t0)/d),e=1-Math.pow(1-k,3),v=target*e;t.textContent=(dec?v.toFixed(1):String(Math.round(v))).replace('.',',');if(k<1)requestAnimationFrame(step)};
  t.textContent=dec?'0,0':'0';requestAnimationFrame(step);
}
if(io){const io2=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io2.unobserve(e.target);scoreUp(e.target)}}),{threshold:.3});
  const watch=()=>document.querySelectorAll('.rv:not([data-sw]),.featured:not([data-sw])').forEach(c=>{c.dataset.sw='1';io2.observe(c)});watch();
  new MutationObserver(watch).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});}
/* particules dorées qui montent autour du coup de cœur */
const feat=document.getElementById('featured');
if(feat&&!calm){new MutationObserver(()=>{const v=feat.querySelector('.ftVisual');if(!v||v.querySelector('.sparks'))return;
  const sp=document.createElement('div');sp.className='sparks';sp.setAttribute('aria-hidden','true');
  for(let i=0;i<14;i++){const d=document.createElement('i');d.style.left=(8+Math.random()*84)+'%';d.style.animationDelay=(-Math.random()*9).toFixed(2)+'s';d.style.animationDuration=(7+Math.random()*5).toFixed(2)+'s';d.style.setProperty('--s',(.5+Math.random()).toFixed(2));sp.appendChild(d)}
  v.appendChild(sp);v.insertAdjacentHTML('beforeend','<span class="shine" aria-hidden="true"></span>')}).observe(feat,{childList:true,subtree:true})}
/* brume qui suit doucement la souris */
const heroEl=document.querySelector('.hero');
if(heroEl&&!calm&&matchMedia('(pointer:fine)').matches){heroEl.addEventListener('pointermove',e=>{const r=heroEl.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;heroEl.style.setProperty('--mx',(x*40).toFixed(1)+'px');heroEl.style.setProperty('--my',(y*30).toFixed(1)+'px')})}
/* léger parallaxe de la brume */
const mist=document.querySelector('.mist');
if(mist&&!calm)addEventListener('scroll',()=>{const y=scrollY;if(y<900)mist.style.transform=`translateY(${y*.25}px)`},{passive:true});
})();
