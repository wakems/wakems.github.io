/* Wakems : gestion des avis parfum, réservée au compte créateur (protégé aussi côté base par RLS). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const root=$('reviewsAdmin');if(!root)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=v=>{const n=parseFloat(String(v??'').replace(',','.'));return isNaN(n)?null:Math.round(Math.max(0,Math.min(10,n))*10)/10};
const fmt=n=>n==null?'–':String(n).replace('.',',');
const VERD={skip:'Skip',maybe:'Maybe',must:'Must try'};
let rows=[],editing=null,ready=false;
function client(){try{return (0,eval)('typeof sb!=="undefined"?sb:null')}catch(e){return null}}
function user(){try{return (0,eval)('typeof currentUser!=="undefined"?currentUser:null')}catch(e){return null}}
const F=['rName','rBrand','rScore','rVerdict','rA1','rA2','rA3','rConc','rYear','rTop','rHeart','rBase','rTenue','rSillage','rPerfumer','rPrice','rReview','rColor','rPub'];
function setMsg(t){$('rStatus').textContent=t||''}
function formData(){
  return {name:$('rName').value.trim(),brand:$('rBrand').value.trim(),score:num($('rScore').value),verdict:$('rVerdict').value||null,
    accords:[$('rA1').value,$('rA2').value,$('rA3').value].map(s=>s.trim()).filter(Boolean),
    concentration:$('rConc').value.trim(),release_year:$('rYear').value.trim(),notes_top:$('rTop').value.trim(),notes_heart:$('rHeart').value.trim(),notes_base:$('rBase').value.trim(),
    tenue:$('rTenue').value.trim(),sillage:$('rSillage').value.trim(),perfumer:$('rPerfumer').value.trim(),price:$('rPrice').value.trim(),review:$('rReview').value.trim(),description:($('rDesc')?$('rDesc').value.trim():''),
    color:/^#[0-9a-f]{6}$/i.test($('rColor').value)?$('rColor').value:'',is_published:$('rPub').checked};
}
function fill(r){
  r=r||{};$('rName').value=r.name||'';$('rBrand').value=r.brand||'';$('rScore').value=r.score==null?'':String(r.score).replace('.',',');$('rVerdict').value=r.verdict||'';
  const a=r.accords||[];$('rA1').value=a[0]||'';$('rA2').value=a[1]||'';$('rA3').value=a[2]||'';
  $('rConc').value=r.concentration||'';$('rYear').value=r.release_year||'';$('rTop').value=r.notes_top||'';$('rHeart').value=r.notes_heart||'';$('rBase').value=r.notes_base||'';
  $('rTenue').value=r.tenue||'';$('rSillage').value=r.sillage||'';$('rPerfumer').value=r.perfumer||'';$('rPrice').value=r.price||'';$('rReview').value=r.review||'';if($('rDesc'))$('rDesc').value=r.description||'';
  $('rColor').value=r.color||'#D4872A';$('rPub').checked=r.is_published!==false;$('rImage').value='';
  $('rFormTitle').textContent=r.id?'Modifier : '+r.name:'Nouvel avis parfum';$('rCancel').classList.toggle('hidden',!r.id);
  $('rImgNow').innerHTML=r.image_url?`<img src="${esc(r.image_url)}" alt="">`:'';
}
async function upload(blob,name){
  const c=client();const type=blob.type||'image/png';
  if(!['image/jpeg','image/png','image/webp'].includes(type))throw new Error('Format d’image non accepté (JPG, PNG ou WebP).');
  if(blob.size>8*1024*1024)throw new Error('Image trop lourde : 8 Mo maximum.');
  const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[type];
  const safe=String(name||'parfum').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,40)||'parfum';
  const path='reviews/'+crypto.randomUUID()+'-'+safe+'.'+ext;
  const up=await c.storage.from('notes-images').upload(path,blob,{cacheControl:'31536000',upsert:false,contentType:type});
  if(up.error)throw up.error;
  return c.storage.from('notes-images').getPublicUrl(path).data.publicUrl;
}
async function load(){
  const c=client();if(!c)return;
  const {data,error}=await c.from('wakems_reviews').select('*').order('created_at',{ascending:false}).limit(500);
  if(error){$('rList').innerHTML='<p class="noteWarn">Impossible de charger tes avis : '+esc(error.message)+'</p>';return}
  rows=data||[];renderList();
}
function renderList(){
  if(!rows.length){$('rList').innerHTML='<p class="noteWarn">Aucun avis pour l’instant. Ajoute ton premier parfum, ou importe ta sauvegarde de fiches.</p>';return}
  $('rList').innerHTML=rows.map(r=>`<div class="rItem"><div class="rThumb" style="background:${esc(r.color||'#E9E1D6')}">${r.image_url?`<img src="${esc(r.image_url)}" alt="">`:''}</div>
    <div class="rInfo"><strong>${esc(r.name)}</strong><small>${esc(r.brand||'')} · ${fmt(r.score)}/10${r.is_published?'':' · masqué'}</small></div>
    <div class="rActs"><button type="button" class="subtleBtn" data-edit="${esc(r.id)}">Modifier</button><button type="button" class="subtleBtn" data-toggle="${esc(r.id)}">${r.is_published?'Masquer':'Publier'}</button><button type="button" class="subtleBtn danger" data-del="${esc(r.id)}">Supprimer</button></div></div>`).join('');
  $('rList').querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>{editing=rows.find(r=>r.id===b.dataset.edit);fill(editing);$('rForm').scrollIntoView({behavior:'smooth',block:'start'})}));
  $('rList').querySelectorAll('[data-toggle]').forEach(b=>b.addEventListener('click',async()=>{const r=rows.find(x=>x.id===b.dataset.toggle);const {error}=await client().from('wakems_reviews').update({is_published:!r.is_published}).eq('id',r.id);if(error){setMsg('Modification impossible : '+error.message);return}load()}));
  $('rList').querySelectorAll('[data-del]').forEach(b=>armDelete(b,async()=>{
    const r=rows.find(x=>x.id===b.dataset.del);if(!r)return;
    const c=client();
    const p=await c.from('community_posts').delete().eq('review_id',r.id);if(p.error){setMsg('Suppression du débat impossible : '+p.error.message);return}
    const {error}=await c.from('wakems_reviews').delete().eq('id',r.id);if(error){setMsg('Suppression impossible : '+error.message);return}
    if(editing&&editing.id===r.id){editing=null;fill(null)}
    setMsg('« '+r.name+' » supprimé du site (avis et débat).');load();loadPosts();
  }));
}
async function save(e){
  e.preventDefault();const c=client();if(!c||!user()){setMsg('Connecte-toi avec ton compte créateur.');return}
  const d=formData();if(!d.name){setMsg('Ajoute au moins le nom du parfum.');return}
  const btn=$('rSave');btn.disabled=true;setMsg('Enregistrement…');
  try{
    const f=$('rImage').files[0];if(f)d.image_url=await upload(f,d.name);
    const res=editing?await c.from('wakems_reviews').update(d).eq('id',editing.id).select('id,name,brand,image_url,score').single():await c.from('wakems_reviews').insert(d).select('id,name,brand,image_url,score').single();
    if(res.error)throw res.error;
    if($('rDebate')&&$('rDebate').checked)await openDebate(res.data);
    setMsg(editing?'Avis mis à jour ✓':'Avis publié sur Wakems ✓');editing=null;fill(null);await load();
  }catch(err){setMsg('Enregistrement impossible : '+(err.message||err))}
  finally{btn.disabled=false}
}
async function openDebate(rv){
  const c=client();if(!rv||!rv.image_url)return;
  const {data:post,error}=await c.from('community_posts').select('id').eq('review_id',rv.id).maybeSingle();if(error)throw error;
  const score=rv.score==null?'':' · '+String(rv.score).replace('.',',')+'/10';
  const p={title:(rv.name||'').slice(0,70),perfume_name:(rv.name||'').slice(0,90),brand:(rv.brand||'').slice(0,70),note_category:'Avis Wakems'+score,caption:'Tu l’as déjà senti ? Donne ton avis et ta note.',image_url:rv.image_url};
  const r=post?await c.from('community_posts').update(p).eq('id',post.id):await c.from('community_posts').insert(Object.assign({created_by:user().id,review_id:rv.id},p));
  if(r.error)throw r.error;
}
/* suppression en deux touches (pas de fenêtre de confirmation, fiable sur iPhone) */
function armDelete(btn,action){
  let armed=false,timer=null;const label=btn.textContent;
  btn.addEventListener('click',async()=>{
    if(!armed){armed=true;btn.textContent='Confirmer ?';btn.classList.add('armed');timer=setTimeout(()=>{armed=false;btn.textContent=label;btn.classList.remove('armed')},4000);return}
    clearTimeout(timer);btn.disabled=true;btn.textContent='Suppression…';
    try{await action()}finally{btn.disabled=false;armed=false;btn.textContent=label;btn.classList.remove('armed')}
  });
}
/* mes publications dans « Les notes à débattre » */
let posts=[];
async function loadPosts(){
  const c=client();if(!c||!$('pList'))return;
  const {data,error}=await c.from('community_posts').select('id,title,perfume_name,brand,note_category,image_url,review_id,created_at').order('created_at',{ascending:false}).limit(300);
  if(error){$('pList').innerHTML='<p class="noteWarn">Impossible de charger tes publications : '+esc(error.message)+'</p>';return}
  posts=data||[];
  if(!posts.length){$('pList').innerHTML='<p class="noteWarn">Aucune publication pour le moment.</p>';return}
  $('pList').innerHTML=posts.map(p=>`<div class="rItem"><div class="rThumb" style="background:#E9E1D6">${p.image_url?`<img src="${esc(p.image_url)}" alt="">`:''}</div>
    <div class="rInfo"><strong>${esc(p.title)}</strong><small>${esc([p.note_category,p.perfume_name,p.brand].filter(Boolean).join(' · '))}</small></div>
    <div class="rActs"><button type="button" class="subtleBtn danger" data-pdel="${esc(p.id)}">Supprimer</button></div></div>`).join('');
  $('pList').querySelectorAll('[data-pdel]').forEach(b=>armDelete(b,async()=>{
    const p=posts.find(x=>x.id===b.dataset.pdel);if(!p)return;
    const {error}=await client().from('community_posts').delete().eq('id',p.id);
    if(error){$('pMsg').textContent='Suppression impossible : '+error.message;return}
    $('pMsg').textContent='« '+p.title+' » supprimé, avec ses commentaires et ses likes.';loadPosts();
  }));
}
/* ---------- remplir la fiche à partir d'un lien ---------- */
const FAMTXT=[['Gourmand',/vanill|tonka|gourmand|caramel|pralin|chocolat|cacao|miel|amande|sucr/],['Ambré',/ambr|benjoin|labdanum|r[eé]sine|[eé]pic|poivre|cannelle|safran|cardamome/],['Boisé',/bois|c[eè]dre|santal|vetiver|patchouli|oud|cuir|tabac|fum[eé]|encens/],['Floral',/floral|fleur|rose|jasmin|iris|pivoine|tub[eé]reuse|ylang|muguet|violette|poudr/],['Frais',/frais|fra[iî]ch|marin|aquatique|menthe|hesp[eé]rid|citr|bergamot|orange|mandarine|pamplemousse|agrum|lavande|aromat|vert/],['Fruité',/fruit|pomme|poire|p[eê]che|framboise|cassis|fraise|cerise|abricot|prune|coco|ananas/],['Musqué',/musc|musk/]];
const ADJ={'Gourmand':'gourmand','Ambré':'ambré et épicé','Boisé':'boisé','Floral':'floral','Frais':'frais','Fruité':'fruité','Musqué':'musqué'};
const n0=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
function joinFr(a){a=a.filter(Boolean);return a.length<2?(a[0]||''):a.slice(0,-1).join(', ')+' et '+a[a.length-1]}
function autoDescription(d){
  const acc=d.accords.map(a=>a.toLowerCase());let fam='';
  for(const a of acc){const f=FAMTXT.find(F=>F[1].test(n0(a)));if(f){fam=f[0];break}}
  const tiers=[[d.notes_top,'en tête'],[d.notes_heart,'au cœur'],[d.notes_base,'en fond']].filter(x=>x[0]);
  let t=(fam?'Un parfum '+ADJ[fam]:'Un parfum')+(d.perfumer?' signé '+d.perfumer:'');
  if(tiers.length>1)t+=' : '+tiers.map(x=>x[1]+', '+x[0].toLowerCase()).join(' ; ')+'.';
  else if(tiers.length===1)t+=' aux notes de '+tiers[0][0].toLowerCase()+'.';
  else if(acc.length)t+=' aux accords '+joinFr(acc)+'.';
  else t+='.';
  return t.charAt(0).toUpperCase()+t.slice(1);
}
async function fillFromLink(){
  const url=$('rLink').value.trim(),msg=$('rFillMsg');
  if(!/^https?:\/\//i.test(url)){msg.textContent='Colle un lien complet qui commence par https://';return}
  if(!window.WKP){msg.textContent='Outil de lecture indisponible, recharge la page.';return}
  const c=client();const {data:{session}}=await c.auth.getSession();
  if(session)window.WK_PAGE_PROXY='https://ntuwsxrrsyukacmodppu.supabase.co/functions/v1/fetch-page?t='+encodeURIComponent(session.access_token)+'&url=';
  const btn=$('rFill');btn.disabled=true;msg.textContent='Lecture de la page…';
  try{
    const html=await WKP.fetchHtml(url);const r=WKP.parseHtml(html,url);
    if(!r.name){msg.textContent='Je n’ai pas trouvé le parfum sur cette page. Essaie la page produit exacte.';return}
    editing=null;fill(null);
    const set=(id,v)=>{if(v&&$(id))$(id).value=v};
    set('rName',r.name);set('rBrand',r.brand);set('rConc',r.conc);set('rYear',r.year?String(r.year):'');set('rPerfumer',r.perfumer);set('rPrice',r.price);
    set('rTop',r.notesTop);set('rHeart',r.notesHeart);set('rBase',r.notesBase);set('rTenue',r.tenue);set('rSillage',r.sillage);
    const acc=(r.accords||[]).slice(0,3);['rA1','rA2','rA3'].forEach((id,i)=>{$(id).value=acc[i]||''});
    const bg=acc.map(a=>WKP.BG_BY_ACCORD[a]).find(Boolean);if(bg)$('rColor').value=bg;
    const d={accords:acc,notes_top:r.notesTop||'',notes_heart:r.notesHeart||'',notes_base:r.notesBase||'',perfumer:r.perfumer||''};
    if($('rDesc'))$('rDesc').value=autoDescription(d);
    if(r.notesTop||r.notesHeart||r.notesBase){const m=document.querySelector('.raMore');if(m)m.open=true}
    let photo='';
    if(r.image){
      msg.textContent='Fiche remplie, récupération de la photo…';
      try{
        const raw=await WKP.fetchImageBlob(r.image),blob=await WKP.normalizeBlob(raw);
        /* détourage automatique du flacon (fond uni retiré) */
        let out=blob;
        try{const im=new Image();im.src=URL.createObjectURL(blob);await im.decode();const cv=WKP.cutout(im,40);out=await new Promise(res=>cv.toBlob(b=>res(b||blob),'image/png'))}catch(e){}
        const file=new File([out],'flacon.png',{type:out.type||'image/png'}),dt=new DataTransfer();dt.items.add(file);$('rImage').files=dt.files;
        $('rImgNow').innerHTML='<img src="'+URL.createObjectURL(out)+'" alt="">';photo=' et la photo';
      }catch(e){photo=' (photo introuvable, ajoute-la à la main)'}
    }
    msg.textContent='Fiche remplie'+photo+' ✓ Vérifie, mets ta note sur 10, puis Publier.';
    $('rScore').focus();
  }catch(e){msg.textContent='Impossible de lire cette page ('+(e.message||'erreur')+'). Certaines boutiques bloquent la lecture : essaie le site de la marque ou une autre boutique.'}
  finally{btn.disabled=false}
}
function dataUrlToBlob(u){const m=/^data:([^;,]+)?(;base64)?,(.*)$/.exec(u||'');if(!m)return null;const bin=m[2]?atob(m[3]):decodeURIComponent(m[3]);const a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return new Blob([a],{type:m[1]||'image/png'})}
async function importBackup(file){
  const c=client();if(!c||!user()){setMsg('Connecte-toi avec ton compte créateur.');return}
  let j;try{j=JSON.parse(await file.text())}catch(e){$('rImportMsg').textContent='Fichier illisible. Choisis le fichier « fiches-parfum-sauvegarde.json ».';return}
  const fiches=Array.isArray(j)?j:(j.fiches||[]);if(!fiches.length){$('rImportMsg').textContent='Aucune fiche trouvée dans ce fichier.';return}
  const photos=new Map((j.photos||[]).map(p=>[p.id,p.data]));
  const existing=new Map(rows.filter(r=>r.source_id).map(r=>[r.source_id,r]));
  let ok=0,fail=0;
  for(let i=0;i<fiches.length;i++){
    const v=fiches[i];if(!v||!(v.name||'').trim())continue;
    $('rImportMsg').textContent='Import '+(i+1)+' / '+fiches.length+' : '+v.name+'…';
    const sid='fiche-'+String(v.id||v.name).slice(0,80);
    const d={source_id:sid,name:String(v.name).trim().slice(0,90),brand:String(v.brand||'').slice(0,70),score:num(v.note),verdict:['skip','maybe','must'].includes(v.verdict)?v.verdict:null,
      accords:(v.accords||[]).map(s=>String(s||'').trim()).filter(Boolean).slice(0,3),concentration:v.conc||'',release_year:String(v.year||''),
      notes_top:v.notesTop||'',notes_heart:v.notesHeart||'',notes_base:v.notesBase||'',tenue:v.tenue||'',sillage:v.sillage||'',perfumer:v.perfumer||'',price:v.price||'',
      review:String(v.avis||'').slice(0,2000),color:/^#[0-9a-f]{6}$/i.test(v.bg||'')?v.bg:''};
    try{
      const old=existing.get(sid);
      if(v.photoId&&photos.has(v.photoId)&&!(old&&old.image_url)){const b=dataUrlToBlob(photos.get(v.photoId));if(b)d.image_url=await upload(b,d.name)}
      const res=old?await c.from('wakems_reviews').update(d).eq('id',old.id):await c.from('wakems_reviews').insert(d);
      if(res.error)throw res.error;ok++;
    }catch(err){fail++;console.warn(v.name,err)}
  }
  $('rImportMsg').textContent=ok+' fiche'+(ok>1?'s':'')+' importée'+(ok>1?'s':'')+(fail?' · '+fail+' en échec':'')+'. Elles sont visibles sur le site.';
  await load();
}
function boot(){
  if(ready)return;ready=true;
  $('rForm').addEventListener('submit',save);
  $('rCancel').addEventListener('click',()=>{editing=null;fill(null)});
  $('rFill').addEventListener('click',fillFromLink);$('rLink').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();fillFromLink()}});
  $('rImport').addEventListener('change',e=>{const f=e.target.files[0];if(f)importBackup(f);e.target.value=''});
  fill(null);load();loadPosts();
}
/* N'apparaît que lorsque le panneau créateur est déverrouillé (compte présent dans community_admins). */
const box=$('adminBox');
let shown=false;
function check(){const on=!!(box&&!box.classList.contains('hidden')&&client());root.classList.toggle('hidden',!on);if(on&&!shown){if(ready){load();loadPosts()}else boot()}shown=on}
if(box)new MutationObserver(check).observe(box,{attributes:true,attributeFilter:['class']});
check();
})();
