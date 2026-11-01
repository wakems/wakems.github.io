/* Wakems : le vote de la semaine (3 parfums tirés au hasard, un vote par appareil). */
(function(){
'use strict';
const box=document.getElementById('weekVote');if(!box)return;
const URL_=window.WAKEMS_SUPABASE_URL||'',KEY=window.WAKEMS_SUPABASE_KEY||'';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>n==null?'':String(Number(n)).replace('.',',');
const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
function client(){
  if(window.wakemsSb)return window.wakemsSb;
  if(window.supabase&&window.supabase.createClient&&KEY.length>20){window.wakemsSb=window.supabase.createClient(URL_,KEY,{auth:{persistSession:true,storageKey:'wakems-reviews-ro',autoRefreshToken:false,detectSessionInUrl:false}});return window.wakemsSb}
  return null;
}
function voterId(){let v=ls.get('wk-voter');if(!v){v=(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2))+'-wk';ls.set('wk-voter',v)}return v}
function prevWeek(w){const [y,n]=w.split('-').map(Number);const d=new Date(Date.UTC(y,0,4));const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day+(n-1)*7-7);
  const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()+3));const fy=t.getUTCFullYear(),f=new Date(Date.UTC(fy,0,4));const wn=1+Math.round(((t-f)/864e5-3+((f.getUTCDay()+6)%7))/7);return fy+'-'+String(wn).padStart(2,'0')}
function untilMonday(){const now=new Date(),d=new Date(now);d.setDate(now.getDate()+((8-now.getDay())%7||7));d.setHours(0,0,0,0);const h=Math.round((d-now)/36e5);return h>48?Math.round(h/24)+' jours':h+' h'}
let week='',trio=[],counts={},mine=null,c=null;
function render(){
  const total=trio.reduce((s,r)=>s+(counts[r.id]||0),0),voted=!!mine;
  box.querySelector('.wvGrid').innerHTML=trio.map(r=>{const n=counts[r.id]||0,p=total?Math.round(n*100/total):0,me=mine===r.id;
    return `<article class="wv${me?' me':''}"><div class="wvImg" style="--rv:${esc(r.color||'#C9A33A')}">${r.image_url?`<img src="${esc(r.image_url)}" alt="" loading="lazy">`:''}</div>
      <div class="wvBody"><span class="rvBrand">${esc(r.brand||'')}</span><h3>${esc(r.name)}</h3>
      ${voted?`<div class="wvBar"><i style="width:${p}%"></i></div><p class="wvPct"><b>${p} %</b> · ${n} vote${n>1?'s':''}${me?' · ton choix':''}</p>`:`<button type="button" class="primary" data-vote="${esc(r.id)}">Voter pour lui</button>`}
      </div></article>`}).join('');
  box.querySelector('.wvMeta').textContent=(voted?'Merci pour ton vote ! ':'')+total+' vote'+(total>1?'s':'')+' cette semaine · nouveau trio dans '+untilMonday();
  box.querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',()=>vote(b.dataset.vote,b)));
}
async function vote(id,btn){
  btn.disabled=true;btn.textContent='Vote…';
  const {error}=await c.from('wakems_votes').insert({week,review_id:id,voter:voterId()});
  if(error&&error.code!=='23505'){btn.disabled=false;btn.textContent='Voter pour lui';box.querySelector('.wvMeta').textContent='Vote impossible pour le moment, réessaie.';return}
  mine=id;ls.set('wk-voted-'+week,id);await loadCounts();render();
}
async function loadCounts(){const {data}=await c.from('wakems_votes').select('review_id').eq('week',week).limit(20000);counts={};(data||[]).forEach(v=>counts[v.review_id]=(counts[v.review_id]||0)+1)}
async function lastWinner(){
  try{const pw=prevWeek(week);const {data:ids}=await c.rpc('wakems_week_trio',{p_week:pw});if(!ids||!ids.length)return;
    const {data:vs}=await c.from('wakems_votes').select('review_id').eq('week',pw).limit(20000);if(!vs||!vs.length)return;
    const cnt={};vs.forEach(v=>cnt[v.review_id]=(cnt[v.review_id]||0)+1);const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
    const {data:r}=await c.from('wakems_reviews').select('name,brand').eq('id',best).maybeSingle();if(!r)return;
    const el=box.querySelector('.wvLast');el.innerHTML=`Gagnant de la semaine dernière : <b>${esc(r.name)}</b>${r.brand?' · '+esc(r.brand):''} (${cnt[best]} vote${cnt[best]>1?'s':''})`;el.hidden=false}catch(e){}
}
async function load(){
  c=client();if(!c){box.hidden=true;return}
  const {data:w,error}=await c.rpc('wakems_current_week');if(error||!w){box.hidden=true;return}
  week=w;mine=ls.get('wk-voted-'+week);
  const {data:ids}=await c.rpc('wakems_week_trio',{p_week:week});
  if(!ids||ids.length<2){box.hidden=true;return}
  const {data:rows}=await c.from('wakems_reviews').select('id,name,brand,score,image_url,color').in('id',ids);
  trio=ids.map(id=>(rows||[]).find(r=>r.id===id)).filter(Boolean);
  await loadCounts();if(mine&&!trio.some(r=>r.id===mine))mine=null;
  box.hidden=false;render();lastWinner();
}
let n=0;(function wait(){if(window.supabase&&window.supabase.createClient)load();else if(n++<40)setTimeout(wait,150)})();
})();
