/* Wakems : animations douces (apparitions au défilement, bande de diapos qui défile). */
(function(){
'use strict';
const calm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
document.documentElement.classList.add('motion');
const SEL='.trailer,.featured,.weekVote .blockHead,.wv,.howItem,.slideBand .blockHead,.block .blockHead,.rv,.contact,.tiktokBand,.panel';
let io=null;
if(!calm&&'IntersectionObserver' in window){
  io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px',threshold:.08});
}
function arm(root){
  if(!io)return;
  (root||document).querySelectorAll(SEL).forEach(el=>{
    if(el.dataset.rev)return;el.dataset.rev='1';el.classList.add('rev');
    const sib=el.parentElement?[...el.parentElement.children].filter(x=>x.matches(SEL)):[];const k=sib.indexOf(el);
    if(k>0)el.style.transitionDelay=Math.min(k%4,3)*70+'ms';
    io.observe(el);
  });
}
arm();
new MutationObserver(ms=>{if(ms.some(m=>m.addedNodes.length))arm()}).observe(document.querySelector('main')||document.body,{childList:true,subtree:true});
/* bande de diapos */
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.addEventListener('wakems:reviews',e=>{
  const band=document.getElementById('slideBand');if(!band)return;
  const items=[];(e.detail||[]).forEach((r,i)=>{const s=r.slides||[];if(!s.length)return;const pick=s[i%2?s.length-1:0];items.push({id:r.id,src:pick,name:r.name})});
  if(items.length<3){band.hidden=true;return}
  const html=items.map(it=>`<button type="button" class="sbItem" data-id="${esc(it.id)}" aria-label="${esc(it.name)}"><img src="${esc(it.src)}" alt="" loading="lazy"></button>`).join('');
  const tr=band.querySelector('.sbTrack');tr.innerHTML=html+html.replace(/<button /g,'<button tabindex="-1" aria-hidden="true" ');
  tr.style.setProperty('--sbDur',Math.max(40,items.length*5)+'s');
  tr.querySelectorAll('.sbItem').forEach(b=>b.addEventListener('click',()=>{if(window.wakemsOpenReview)window.wakemsOpenReview(b.dataset.id)}));
  band.hidden=false;arm(band);
});
})();
