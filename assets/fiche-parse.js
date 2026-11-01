/* Wakems : lecture d'une page produit (partagé avec le studio) */
window.WKP=(function(){
'use strict';
/* ================= DESSIN : thèmes et slides ================= */
const W=1080,H=1350,DEFAULT_BG='#D4872A';
const SANS='Arial, "Helvetica Neue", sans-serif';

function hex2rgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16)||0;return [(n>>16)&255,(n>>8)&255,n&255]}
function rgb2hex(r,g,b){return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')}
function mix(a,b,t){const x=hex2rgb(a),y=hex2rgb(b);return rgb2hex(x[0]+(y[0]-x[0])*t,x[1]+(y[1]-x[1])*t,x[2]+(y[2]-x[2])*t)}
function rgba(h,a){const c=hex2rgb(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'}
function lum(h){const c=hex2rgb(h).map(v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function norm(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function fmtNote(v){const n=parseFloat(String(v==null?'':v).replace(',','.'));if(isNaN(n))return '';const c=Math.max(0,Math.min(10,n));return (Math.round(c*10)/10).toString()+'/10'}
function noteNum(v){const n=parseFloat(String(v==null?'':v).replace(',','.'));return isNaN(n)?null:Math.max(0,Math.min(10,n))}
function verdictOf(note,manual){if(manual==='skip'||manual==='maybe'||manual==='must')return manual;const n=noteNum(note);if(n==null)return 'maybe';return n<5?'skip':n<7.5?'maybe':'must'}

function rr(x,px,py,w,h,r){r=Math.min(r,w/2,h/2);x.beginPath();x.moveTo(px+r,py);x.arcTo(px+w,py,px+w,py+h,r);x.arcTo(px+w,py+h,px,py+h,r);x.arcTo(px,py+h,px,py,r);x.arcTo(px,py,px+w,py,r);x.closePath()}
function newCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));return c}

/* ---------- détourage du flacon ---------- */
function cutout(img,tol){
  const s=Math.min(1,1400/Math.max(img.naturalWidth,img.naturalHeight));
  const w=Math.max(1,Math.round(img.naturalWidth*s)),h=Math.max(1,Math.round(img.naturalHeight*s));
  const c=newCanvas(w,h),x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,w,h);
  const d=x.getImageData(0,0,w,h),p=d.data;
  const corners=[0,w-1,(h-1)*w,(h-1)*w+w-1];let r=0,g=0,b=0,n=0;
  corners.forEach(i=>{if(p[i*4+3]>200){r+=p[i*4];g+=p[i*4+1];b+=p[i*4+2];n++}});
  const hasRef=n>0;if(n){r/=n;g/=n;b/=n}
  const dist=i=>{const k=i*4,dr=p[k]-r,dg=p[k+1]-g,db=p[k+2]-b;return Math.sqrt(dr*dr+dg*dg+db*db)};
  const isBg=i=>p[i*4+3]<16||(hasRef&&dist(i)<tol);
  const seen=new Uint8Array(w*h),stack=[];
  const push=i=>{if(!seen[i]&&isBg(i)){seen[i]=1;stack.push(i)}};
  let xx,yy;
  for(xx=0;xx<w;xx++){push(xx);push((h-1)*w+xx)}
  for(yy=0;yy<h;yy++){push(yy*w);push(yy*w+w-1)}
  while(stack.length){const i=stack.pop();xx=i%w;yy=(i-xx)/w;
    if(xx>0)push(i-1);if(xx<w-1)push(i+1);if(yy>0)push(i-w);if(yy<h-1)push(i+w)}
  const fringe=[];
  for(yy=1;yy<h-1;yy++)for(xx=1;xx<w-1;xx++){const j=yy*w+xx;
    if(!seen[j]&&(seen[j-1]||seen[j+1]||seen[j-w]||seen[j+w])&&hasRef&&dist(j)<tol*1.9)fringe.push(j)}
  fringe.forEach(j=>{seen[j]=1});
  for(let k=0;k<w*h;k++)if(seen[k])p[k*4+3]=0;
  x.putImageData(d,0,0);
  let minX=w,minY=h,maxX=-1,maxY=-1;
  for(yy=0;yy<h;yy++)for(xx=0;xx<w;xx++){if(p[(yy*w+xx)*4+3]>16){if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy}}
  if(maxX<0)return c;
  const t=newCanvas(maxX-minX+1,maxY-minY+1);
  t.getContext('2d').drawImage(c,minX,minY,t.width,t.height,0,0,t.width,t.height);
  return t;
}
const cutMemo=new WeakMap();
function cutFor(img,tol){let m=cutMemo.get(img);if(!m){m={};cutMemo.set(img,m)}if(!m[tol])m[tol]=cutout(img,tol);return m[tol]}
function fit(src,maxW,maxH){
  const sc=Math.min(maxW/src.width,maxH/src.height),c=newCanvas(src.width*sc,src.height*sc),x=c.getContext('2d');
  x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);return c;
}
function outlined(fig,rad){
  const pad=rad+3,c=newCanvas(fig.width+pad*2,fig.height+pad*2);
  const s=newCanvas(fig.width,fig.height),sx=s.getContext('2d');
  sx.drawImage(fig,0,0);sx.globalCompositeOperation='source-in';sx.fillStyle='#fff';sx.fillRect(0,0,s.width,s.height);
  const x=c.getContext('2d');
  for(let a=0;a<36;a++){const t=a/36*Math.PI*2;x.drawImage(s,pad+Math.cos(t)*rad,pad+Math.sin(t)*rad)}
  for(let a=0;a<18;a++){const u=a/18*Math.PI*2;x.drawImage(s,pad+Math.cos(u)*rad*.55,pad+Math.sin(u)*rad*.55)}
  x.drawImage(fig,pad,pad);return c;
}
function placeholder(name,brand,jus){
  const c=newCanvas(300,520),x=c.getContext('2d');
  x.fillStyle='#D5D5D9';rr(x,100,0,100,92,10);x.fill();
  x.fillStyle='#A4A4AB';x.fillRect(100,76,100,16);
  x.fillStyle='#EDEDF0';x.fillRect(122,92,56,34);
  const g=x.createLinearGradient(0,0,300,0);g.addColorStop(0,mix(jus,'#ffffff',.5));g.addColorStop(.55,mix(jus,'#ffffff',.25));g.addColorStop(1,jus);
  x.fillStyle=g;rr(x,0,122,300,398,28);x.fill();
  x.fillStyle='#fff';rr(x,40,236,220,206,6);x.fill();
  x.fillStyle='#111';x.textAlign='center';x.textBaseline='middle';
  x.font='800 20px Poppins, '+SANS;x.fillText((brand||'').toUpperCase().slice(0,22),150,276);
  let s=26;const t=(name||'').toUpperCase();
  do{x.font='800 '+s+'px Poppins, '+SANS;s-=1}while(x.measureText(t).width>200&&s>10);
  x.fillText(t,150,340);x.fillStyle='#8a8a8a';x.fillRect(80,386,140,2);
  return c;
}

/* ---------- accords ---------- */
const ACCORDS=[
 ['vanill','#F3D58A'],['ambr','#B9692A'],['gourmand','#7A3E22'],['bois','#7A4A1E'],['flor','#F29BB5'],['fleur','#F29BB5'],
 ['frais','#7CC6E8'],['aquat','#7CC6E8'],['marin','#7CC6E8'],['citrus','#F5E04D'],['agrume','#F5E04D'],['hesper','#F5E04D'],
 ['fruit','#FF7B6B'],['epic','#C0392B'],['spic','#C0392B'],['musc','#D9D0C7'],['cuir','#5B3A29'],['leather','#5B3A29'],
 ['vert','#6DBE6B'],['green','#6DBE6B'],['tropic','#F2A900'],['sucr','#F7A8C4'],['sweet','#F7A8C4'],['orient','#A0522D'],
 ['poudr','#E8CFE0'],['powder','#E8CFE0'],['amande','#D8B48A'],['cara','#C27A2C'],['caf','#5A3825'],['coco','#EFE6D6'],
 ['rose','#E9759B'],['oud','#4A2E22'],['fum','#6D6A68'],['smok','#6D6A68'],['sal','#9FD3D9'],['fresh','#7CC6E8'],['woody','#7A4A1E'],
 ['fruity','#FF7B6B'],['vanilla','#F3D58A'],['amber','#B9692A'],['aromat','#8FB07A']
];
function accordColor(s){const n=norm(s);for(const a of ACCORDS){if(n.indexOf(a[0])!==-1)return a[1]}return '#FFFFFF'}

/* ---------- thèmes ---------- */
const THEMES=[
 {id:'jus',label:'Couleur du jus'},
 {id:'edito',label:'Édito'},
 {id:'clair',label:'Clair'},
 {id:'nuit',label:'Nuit'},
 {id:'luxe',label:'Luxe'}
];
function makeTheme(id,base){
  base=base||DEFAULT_BG;
  const T={id,base,tr:.12,outline:false,shadow:false,vignette:false,glow:null,glowA:.5,titleMax:170,topDisp:null,brandCaps:false,
    disp:s=>'400 '+s+'px Anton, Impact, '+SANS,
    lab:s=>'800 '+s+'px Archivo, '+SANS,
    txt:s=>'600 '+s+'px Archivo, '+SANS,
    brand:s=>'600 '+s+'px "Cormorant Garamond", Georgia, serif'};
  const poppins=w=>s=>w+' '+s+'px Poppins, '+SANS;
  if(id==='edito'){
    T.bg=mix(base,'#40342b',.64);T.ink=mix(base,'#ffffff',.84);T.sub=mix(T.ink,T.bg,.34);
    T.accent=T.ink;T.accentInk=T.bg;T.glow=mix(T.bg,'#ffffff',.2);T.glowA=.7;T.cardBg=mix(T.bg,'#000000',.14);
    T.topBg=T.bg;T.topInk=T.ink;T.grad=[T.ink,mix(T.ink,T.bg,.45),T.ink];T.titleMax=250;
    T.brandCaps=true;T.brand=s=>'800 '+s+'px Archivo, '+SANS;
  }else if(id==='clair'){
    T.bg='#E4E4E4';T.ink='#151515';T.sub='#6d6d6d';T.accent=mix(base,'#2b2118',.5);T.accentInk='#FFFFFF';
    T.cardBg=T.accent;T.topBg=T.bg;T.topInk=T.ink;T.grad=[T.accent,mix(T.accent,base,.45),T.accent];
    T.disp=poppins('900');T.lab=poppins('800');T.txt=poppins('600');T.titleMax=160;
    T.brandCaps=true;T.brand=poppins('700');
  }else if(id==='nuit'){
    T.bg='#0B0A12';T.ink='#FFFFFF';T.sub='#A7A3B8';
    let a=mix(base,'#ffffff',.12);if(lum(a)<.22)a=mix(base,'#ffffff',.55);
    T.accent=a;T.accentInk='#0B0A12';T.glow=a;T.glowA=.3;T.cardBg=mix('#0B0A12',a,.28);
    T.topBg=T.bg;T.topInk=T.ink;T.grad=[a,mix(a,'#ff4fd8',.55),'#FFFFFF'];
    T.disp=poppins('italic 900');T.lab=s=>'800 '+s+'px Archivo, '+SANS;T.txt=s=>'600 '+s+'px Archivo, '+SANS;T.titleMax=160;
    T.brandCaps=true;T.brand=poppins('italic 700');
  }else if(id==='luxe'){
    T.bg='#110F0B';T.ink='#EBDDB0';T.sub='#A0926C';T.accent='#C9A24B';T.accentInk='#110F0B';
    T.cardBg='#1C1812';T.topBg=T.bg;T.topInk=T.ink;T.grad=['#F2E3B0','#C9A24B','#F2E3B0'];
    T.disp=s=>'700 '+s+'px "Cormorant Garamond", Georgia, serif';T.titleMax=190;
    T.glow='#C9A24B';T.glowA=.16;
  }else{
    T.id='jus';T.bg=base;T.ink=lum(base)>.6?'#121212':'#FFFFFF';T.sub=mix(T.ink,T.bg,.22);T.accent=T.ink;T.accentInk=T.bg;
    T.disp=poppins('800');T.lab=poppins('800');T.txt=poppins('600');T.outline=true;T.shadow=true;T.vignette=true;T.titleMax=170;
    T.cardBg=mix(base,'#000000',.18);T.topBg='#FFFFFF';T.topInk='#0B0B0B';T.grad=['#1B4DB4','#5E50CC','#B572E0'];
    T.topDisp=poppins('italic 900');
  }
  if(!T.topDisp)T.topDisp=T.disp;
  T.line=mix(T.ink,T.bg,.45);
  return T;
}

/* ---------- aides de texte ---------- */
function capH(x,font,size){x.font=font(size);const m=x.measureText('H');return m.actualBoundingBoxAscent||size*.72}
function textW(x,t,tr){if(!tr)return x.measureText(t).width;let w=0;for(const c of t)w+=x.measureText(c).width+tr;return w-tr}
function put(x,text,px,base,tr,align,color){
  x.fillStyle=color;x.textBaseline='alphabetic';
  if(!tr){x.textAlign=align;x.fillText(text,px,base);return}
  const cs=[...text],ws=cs.map(c=>x.measureText(c).width),tot=ws.reduce((a,b)=>a+b,0)+tr*(cs.length-1);
  let cx=align==='center'?px-tot/2:align==='right'?px-tot:px;x.textAlign='left';
  cs.forEach((c,i)=>{x.fillText(c,cx,base);cx+=ws[i]+tr});
}
function fitBox(x,text,font,maxW,maxCap,trEm,start,min){
  let s=start||700;min=min||24;
  for(;s>min;s-=4){x.font=font(s);const ch=x.measureText('H').actualBoundingBoxAscent||s*.72;if(ch<=maxCap&&textW(x,text,(trEm||0)*s)<=maxW)break}
  return Math.max(s,min);
}
function fitLine(x,text,font,maxW,start,min,trEm){
  let s=start;for(;s>min;s-=2){x.font=font(s);if(textW(x,text,trEm*s)<=maxW)break}return Math.max(s,min);
}
function wrapLines(x,text,maxW){
  const words=text.split(/\s+/).filter(Boolean),lines=[];let cur='';
  words.forEach(w=>{const t=cur?cur+' '+w:w;if(x.measureText(t).width>maxW&&cur){lines.push(cur);cur=w}else cur=t});
  if(cur)lines.push(cur);return lines;
}
function wrapTxt(x,text,maxW,maxLines){
  const lines=wrapLines(x,text,maxW);
  if(lines.length<=maxLines)return lines;
  const out=lines.slice(0,maxLines);let last=out[maxLines-1];
  while(last.length>1&&x.measureText(last+'…').width>maxW)last=last.slice(0,-1);
  out[maxLines-1]=last.replace(/[\s,;:]+$/,'')+'…';return out;
}
function balanced(words){
  if(words.length<2)return [words.join(' ')];
  let best=1,bd=1e9;
  for(let i=1;i<words.length;i++){const a=words.slice(0,i).join(' ').length,b=words.slice(i).join(' ').length,d=Math.abs(a-b);if(d<bd){bd=d;best=i}}
  return [words.slice(0,best).join(' '),words.slice(best).join(' ')];
}

/* ---------- éléments communs ---------- */
function paintBg(x,th,color){
  x.clearRect(0,0,W,H);x.fillStyle=color||th.bg;x.fillRect(0,0,W,H);
  if(th.vignette&&!color){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,255,255,.06)');g.addColorStop(1,'rgba(0,0,0,.10)');x.fillStyle=g;x.fillRect(0,0,W,H)}
}
function glow(x,th,cx,cy,r){
  if(!th.glow)return;
  const g=x.createRadialGradient(cx,cy,0,cx,cy,r);g.addColorStop(0,rgba(th.glow,th.glowA));g.addColorStop(1,rgba(th.glow,0));
  x.fillStyle=g;x.fillRect(cx-r,cy-r,r*2,r*2);
}
function header(x,th,st,color,y){
  if(!st.handle)return;
  x.font=th.lab(40);put(x,st.handle.toUpperCase(),W/2,y||112,40*.12,'center',color||th.ink);
}
function bottle(x,th,st,img,o){
  const fig=img?cutFor(img,st.tol||40):placeholder(st.name,st.brand,mix(th.base,'#ffffff',.3));
  const f=fit(fig,o.maxW,o.h),out=th.outline?outlined(f,9):f;
  const left=Math.round(o.cx-out.width/2);
  const top=o.bottom!=null?Math.round(o.bottom-out.height+9):o.top;
  if(o.floor&&th.shadow){
    const sg=x.createRadialGradient(0,0,0,0,0,1);sg.addColorStop(0,'rgba(0,0,0,.42)');sg.addColorStop(1,'rgba(0,0,0,0)');
    x.save();x.translate(o.cx,o.bottom+34);x.scale(290,34);x.fillStyle=sg;x.beginPath();x.arc(0,0,1,0,Math.PI*2);x.fill();x.restore();
  }
  x.drawImage(out,left,top);
  return {left,top,w:out.width,h:out.height};
}
function brandLine(x,th,brand,cx,y,maxW){
  if(!brand)return;
  if(th.brandCaps){
    const t=brand.toUpperCase(),s=fitLine(x,t,th.brand,maxW,58,24,.14);
    x.font=th.brand(s);put(x,t,cx,y,s*.14,'center',th.ink);
  }else{
    let s=84;do{x.font=th.brand(s);s-=2}while(x.measureText(brand).width>maxW&&s>30);
    x.fillStyle=th.ink;x.textAlign='center';x.textBaseline='middle';x.fillText(brand,cx,y);
  }
}

/* ---------- 1. Fiche classique (note + accords) ---------- */
function drawFiche(x,st,img,th){
  paintBg(x,th);
  const name=(st.name||'NOM DU PARFUM').toUpperCase();
  let lines,size;
  for(size=th.titleMax;size>=56;size-=4){
    x.font=th.disp(size);lines=wrapLines(x,name,W-110);
    if(lines.length<=2&&lines.every(l=>x.measureText(l).width<=W-110)&&lines.length*size<=345)break;
  }
  const lh=size*(th.id==='jus'?.98:1.02);
  x.fillStyle=th.ink;x.textAlign='center';x.textBaseline='middle';x.font=th.disp(size);
  lines.forEach((l,k)=>x.fillText(l,W/2,250+(k-(lines.length-1)/2)*lh));
  brandLine(x,th,st.brand,W/2,470,W-160);
  bottle(x,th,st,img,{cx:W/2,bottom:1035,maxW:330,h:520,floor:true});
  const acc=st.accords.slice(0,3);
  if(acc.length){
    const px=60,pw=262,ph=58,gap=14,top=720-((acc.length-1)*(ph+gap))/2;
    if(th.id==='jus'){x.font='italic 800 48px Poppins, '+SANS;x.fillStyle=th.ink;x.textAlign='center';x.textBaseline='middle';x.fillText('Accords',px+pw/2,top-62)}
    else{x.font=th.lab(32);put(x,'ACCORDS',px+pw/2,top-48,4,'center',th.ink)}
    acc.forEach((a,k)=>{
      const col=accordColor(a),y=top+k*(ph+gap);
      x.fillStyle=col;rr(x,px,y,pw,ph,ph/2);x.fill();
      x.fillStyle=lum(col)>.38?'#0E0E0E':'#FFFFFF';
      let fs=30;do{x.font=th.lab(fs);fs-=1}while(x.measureText(a).width>pw-36&&fs>14);
      x.textAlign='center';x.textBaseline='middle';x.fillText(a,px+pw/2,y+ph/2+2);
    });
  }
  if(st.note){
    const ns=fitBox(x,st.note,th.disp,290,120,0,300,40);
    x.font=th.disp(ns);x.fillStyle=th.ink;x.textAlign='center';x.textBaseline='middle';x.fillText(st.note,880,770);
  }
  if(st.handle){x.font=th.lab(52);put(x,st.handle.toUpperCase(),W/2,1262,52*.06,'center',th.ink)}
  return th.bg;
}

/* ---------- 2. Couverture "NEW" ---------- */
function drawCoverNew(x,st,img,th){
  paintBg(x,th);
  glow(x,th,W/2,880,600);
  header(x,th,st);
  const label=((st.brand||'')+(st.brand&&st.name?' · ':'')+(st.name||'')).toUpperCase();
  const ls=fitLine(x,label,th.lab,960,44,24,.16);
  x.font=th.lab(ls);put(x,label,W/2,222,ls*.16,'center',th.sub);
  const word=(st.cWord||st.word||'NEW').toUpperCase();
  const ws=fitBox(x,word,th.disp,900,470,0,720,100);
  const ch=capH(x,th.disp,ws);x.font=th.disp(ws);
  const top=292;put(x,word,W/2,top+ch,0,'center',th.ink);
  const bt=Math.max(500,Math.round(top+ch*.55));
  bottle(x,th,st,img,{cx:W/2,top:bt,maxW:340,h:1000});
  return th.bg;
}

/* ---------- 3. Fiche technique / notes (colonne de lignes) ---------- */
function drawRowsSlide(x,st,img,th,o){
  paintBg(x,th);
  glow(x,th,820,980,560);
  header(x,th,st);
  const L=90,RW=620;
  const ks=fitLine(x,o.kicker,th.lab,RW+150,42,22,.16);
  x.font=th.lab(ks);put(x,o.kicker,L,222,ks*.16,'left',th.sub);
  const lines=balanced(o.title.toUpperCase().split(/\s+/).filter(Boolean));
  let size=400;lines.forEach(l=>{size=Math.min(size,fitBox(x,l,th.disp,RW,190,0,400,70))});
  const ch=capH(x,th.disp,size),gap=Math.round(ch*.2);
  x.font=th.disp(size);
  let base=262+ch;
  lines.forEach((l,k)=>{put(x,l,L,base+k*(ch+gap),0,'left',th.ink)});
  const y0=base+(lines.length-1)*(ch+gap)+54;
  const avail=1290-y0,rows=o.rows;
  function layout(vs){
    x.font=th.txt(vs);
    const items=rows.map(r=>({r,lines:wrapTxt(x,r.value,RW,r.maxLines||3)}));
    let h=12+30;
    items.forEach((it,i)=>{h+=(it.r.label?44:0)+it.lines.length*vs*1.2+18+(it.r.level!=null?44:0)+(i<items.length-1?4+30:0)});
    return {h:h+10+12,items};
  }
  let vs=52,lay=layout(vs);
  while(lay.h>avail&&vs>28){vs-=2;lay=layout(vs)}
  let y=y0;
  x.fillStyle=th.ink;x.fillRect(L,y,RW,12);y+=12+30;
  lay.items.forEach((it,i)=>{
    if(it.r.label){x.font=th.lab(38);put(x,it.r.label,L,y+30,38*.1,'left',th.ink);y+=30+14}
    x.font=th.txt(vs);x.fillStyle=th.ink;x.textAlign='left';x.textBaseline='alphabetic';
    it.lines.forEach(l=>{x.fillText(l,L,y+vs*.95);y+=vs*1.2});
    y+=18;
    if(it.r.level!=null){const sw=(RW-4*10)/5;for(let k=0;k<5;k++){x.fillStyle=k<it.r.level?th.ink:th.line;rr(x,L+k*(sw+10),y+6,sw,16,8);x.fill()}y+=44}
    if(i<lay.items.length-1){x.fillStyle=th.line;x.fillRect(L,y,RW,4);y+=4+30}
  });
  x.fillStyle=th.ink;x.fillRect(L,y+10,RW,12);
  bottle(x,th,st,img,{cx:930,top:610,maxW:380,h:1000});
  return th.bg;
}
function levelOf(kind,txt){
  const t=(txt||'').toLowerCase();if(!t.trim())return null;
  let m=t.match(/(\d(?:[.,]\d)?)\s*\/\s*5/);if(m)return Math.max(0,Math.min(5,Math.round(parseFloat(m[1].replace(',','.')))));
  if(kind==='tenue'){
    const nums=(t.match(/\d+(?:[.,]\d+)?/g)||[]).map(n=>parseFloat(n.replace(',','.')));
    if(nums.length){const h=Math.max.apply(null,nums);return h<3?1:h<5?2:h<7?3:h<9?4:5}
    if(/tr[eè]s\s+(longue|bonne)|monstre|exceptionnel/.test(t))return 5;
    if(/longue|forte|excellente/.test(t))return 4;if(/bonne|correcte|moyenne|mod[eé]r/.test(t))return 3;
    if(/courte|faible|moyen.?faible/.test(t))return 2;if(/tr[eè]s\s+(courte|faible)|ephem|éphém/.test(t))return 1;
    return null;
  }
  if(/[eé]norme|monstre|nucl[eé]aire|bombe/.test(t))return 5;
  if(/puissant|fort|intense|tr[eè]s\s+pr[eé]sent/.test(t))return 4;
  if(/mod[eé]r|moyen|correct|pr[eé]sent/.test(t))return 3;
  if(/discret|l[eé]ger|peau|intime|faible/.test(t))return /tr[eè]s|peau|intime/.test(t)?1:2;
  return null;
}
function infoRows(st){
  const rows=[];
  const notes=[st.notesTop,st.notesHeart,st.notesBase].filter(Boolean).join(', ');
  if(st.year)rows.push({label:'SORTIE',value:String(st.year)});
  if(st.conc)rows.push({label:'CONCENTRATION',value:st.conc});
  if(st.tenue)rows.push({label:'TENUE',value:st.tenue});
  if(st.sillage)rows.push({label:'SILLAGE',value:st.sillage});
  if(st.perfumer)rows.push({label:'PARFUMEUR',value:st.perfumer});
  if(st.price)rows.push({label:'PRIX',value:st.price});
  if(rows.length<3&&notes)rows.push({label:'NOTES',value:notes});
  if(rows.length<3&&st.accords.length)rows.push({label:'ACCORDS',value:st.accords.join(' · ')});
  if(!rows.length)rows.push({label:'NOTES',value:'Non publiées'});
  return rows.slice(0,4);
}
function rowsToText(rows){return rows.map(r=>(r.label?r.label+' : ':'')+r.value).join('\n')}
function textToRows(t){
  return String(t||'').split(/\n+/).map(l=>l.trim()).filter(Boolean).slice(0,5).map(l=>{
    const m=l.match(/^([^:]{1,24}?)\s*:\s*(.+)$/);
    return m?{label:m[1].toUpperCase(),value:m[2]}:{label:'',value:l};
  });
}
function drawInfo(x,st,img,th){
  return drawRowsSlide(x,st,img,th,{kicker:((st.word||'NEW')+(st.brand?' · '+st.brand:'')).toUpperCase(),title:st.tInfo||st.name||'Parfum',rows:(st.infoText&&textToRows(st.infoText).length)?textToRows(st.infoText):infoRows(st)});
}
function noteRows(st){
  const r=[];
  if(st.notesTop)r.push({label:'TÊTE',value:st.notesTop});
  if(st.notesHeart)r.push({label:'CŒUR',value:st.notesHeart});
  if(st.notesBase)r.push({label:'FOND',value:st.notesBase});
  return r;
}
function drawNotes(x,st,img,th){
  const rows=(st.notesText&&textToRows(st.notesText).length)?textToRows(st.notesText):noteRows(st);
  return drawRowsSlide(x,st,img,th,{kicker:((st.brand||'')+(st.brand&&st.name?' · ':'')+(st.name||'')).toUpperCase(),title:st.tNotes||'Notes',rows:rows.length?rows:[{label:'TÊTE',value:'—'},{label:'CŒUR',value:'—'},{label:'FOND',value:'—'}]});
}

function perfRows(st){
  const r=[];
  r.push({label:'TENUE',value:st.tenue||'—',level:levelOf('tenue',st.tenue)});
  r.push({label:'SILLAGE',value:st.sillage||'—',level:levelOf('sillage',st.sillage)});
  return r;
}
function drawPerf(x,st,img,th){
  return drawRowsSlide(x,st,img,th,{kicker:((st.brand||'')+(st.brand&&st.name?' · ':'')+(st.name||'')).toUpperCase(),title:st.tPerf||'Tenue et sillage',rows:perfRows(st)});
}
function drawAvis(x,st,img,th){
  return drawRowsSlide(x,st,img,th,{kicker:((st.brand||'')+(st.brand&&st.name?' · ':'')+(st.name||'')).toUpperCase(),title:st.tAvis||'Mon avis',rows:[{label:'',value:st.avis||'Écris ton avis dans la fiche.',maxLines:9}]});
}

/* ---------- 4. Verdict ---------- */
function drawVerdict(x,st,img,th){
  paintBg(x,th);
  glow(x,th,W/2,1000,620);
  header(x,th,st);
  const label=((st.word||'NEW')+(st.brand?' · '+st.brand:'')+(st.name?' · '+st.name:'')).toUpperCase();
  const ls=fitLine(x,label,th.lab,960,42,20,.16);
  x.font=th.lab(ls);put(x,label,W/2,222,ls*.16,'center',th.sub);
  const key=st.verdict||'maybe',word=(st.vWord||{skip:'SKIP',maybe:'MAYBE',must:'MUST TRY'}[key]).toUpperCase();
  const ws=fitBox(x,word,th.disp,920,320,0,640,100);
  const ch=capH(x,th.disp,ws);x.font=th.disp(ws);
  const base=270+ch;put(x,word,W/2,base,0,'center',th.ink);
  const ys=base+78,segW=(960-2*16)/3,names=['SKIP','MAYBE','MUST TRY'],keys=['skip','maybe','must'];
  keys.forEach((k,i)=>{
    const sx=60+i*(segW+16),on=k===key,t=on?22:8;
    x.fillStyle=on?th.ink:th.line;rr(x,sx,ys-t/2+(on?0:7),segW,t,t/2);x.fill();
    x.font=th.lab(on?46:42);put(x,names[i],sx+segW/2,ys+78,(on?46:42)*.1,'center',on?th.ink:th.sub);
  });
  bottle(x,th,st,img,{cx:W/2,top:Math.round(ys+130),maxW:400,h:1000});
  return th.bg;
}

/* ---------- 5. Suivre ---------- */
function drawCta(x,st,img,th){
  paintBg(x,th);
  header(x,th,st);
  const cw=640,cx0=(W-cw)/2,cy0=170;
  x.save();rr(x,cx0,cy0,cw,cw,44);x.fillStyle=th.cardBg;x.fill();x.clip();
  if(th.glow)glow(x,th,W/2,cy0+cw*.45,cw*.7);
  bottle(x,th,st,img,{cx:W/2,top:cy0+36,maxW:330,h:900});
  x.restore();
  const c=st.cta||{};
  const title=c.title||'Toutes les sorties',ts=fitLine(x,title,th.lab,900,92,40,0);
  x.font=th.lab(ts);put(x,title,W/2,cy0+cw+118,0,'center',th.ink);
  if(st.handle){x.font=th.lab(50);put(x,'@'+st.handle.toLowerCase(),W/2,cy0+cw+190,0,'center',lum(th.accent)>.12||th.id==='clair'?th.accent:th.sub)}
  const bw=470,bh=96,by=cy0+cw+232;
  x.fillStyle=th.accent;rr(x,(W-bw)/2,by,bw,bh,bh/2);x.fill();
  x.font=th.lab(48);put(x,c.btn||'+ Suivre',W/2,by+bh/2+17,0,'center',th.accentInk);
  if(c.tag){x.font=th.txt(38);const ls2=wrapTxt(x,c.tag,880,2);ls2.forEach((l,i)=>put(x,l,W/2,by+bh+82+i*50,0,'center',th.sub))}
  return th.bg;
}

/* ---------- 6. Couverture du classement ---------- */
function drawTopCover(x,t,handle,figs,th){
  x.clearRect(0,0,W,H);x.fillStyle=th.topBg;x.fillRect(0,0,W,H);
  if(figs.length){
    const n=figs.length;
    figs.forEach((f,i)=>{
      const fg=fit(f,300,600),cx=(i+.5)*W/n,top=790+(i%2)*50;
      x.save();try{x.filter='blur(10px)'}catch(e){}
      x.drawImage(fg,Math.round(cx-fg.width/2),top);x.restore();
    });
  }
  const fade=x.createLinearGradient(0,740,0,1200);fade.addColorStop(0,rgba(th.topBg,.92));fade.addColorStop(1,rgba(th.topBg,0));
  x.fillStyle=fade;x.fillRect(0,740,W,460);
  if(handle){x.font=th.lab(50);put(x,handle.toUpperCase(),W/2,150,50*.1,'center',th.topInk)}
  const l=[(t[0]||'').toUpperCase(),(t[1]||'').toUpperCase(),(t[2]||'').toUpperCase()];
  const slots=[{cy:340,cap:118,w:940},{cy:548,cap:200,w:940},{cy:770,cap:150,w:980}];
  l.forEach((txt,i)=>{
    if(!txt)return;
    const s=fitBox(x,txt,th.topDisp,slots[i].w,slots[i].cap,0,600,40),ch=capH(x,th.topDisp,s);
    x.font=th.topDisp(s);
    const base=slots[i].cy+ch/2;
    if(i===0){put(x,txt,W/2,base,0,'center',th.topInk);return}
    const w=x.measureText(txt).width,g=x.createLinearGradient(W/2-w/2,0,W/2+w/2,0);
    const gc=i===1?[th.grad[0],th.grad[1]]:[th.grad[1],th.grad[2]];
    g.addColorStop(0,gc[0]);g.addColorStop(1,gc[1]);
    x.fillStyle=g;x.textAlign='center';x.textBaseline='alphabetic';x.fillText(txt,W/2,base);
  });
  return th.topBg;
}

const SLIDE_DEFS=[
 {id:'cover',label:'Couverture',draw:drawCoverNew},
 {id:'info',label:'Infos',draw:drawInfo},
 {id:'notes',label:'Notes',draw:drawNotes},
 {id:'perf',label:'Tenue et sillage',draw:drawPerf},
 {id:'avis',label:'Mon avis',draw:drawAvis},
 {id:'verdict',label:'Verdict',draw:drawVerdict},
 {id:'fiche',label:'Fiche',draw:drawFiche},
 {id:'cta',label:'Suivre',draw:drawCta}
];
const SLIDES={};SLIDE_DEFS.forEach(d=>{SLIDES[d.id]=d});

/* ================= IMPORT : lecture d'une page parfum ================= */
const CATS=[
 ['Vanillé',['vanill','tonka']],
 ['Ambré',['ambr','benjoin','labdanum','ambroxan','resine']],
 ['Gourmand',['gourmand','caramel','pralin','chocolat','cacao','cafe','miel\\b','creme','amande','noisette','sucre','popcorn','guimauve','chamallow','biscuit','gateau','brule']],
 ['Boisé',['bois','cedre','santal','vetiver','patchouli','oud\\b','cashmeran','cypres','sandal','cedar','woody']],
 ['Floral',['floral','fleur','rose\\b','roses\\b','jasmin','iris\\b','pivoine','tubereuse','ylang','muguet','gardenia','magnolia','heliotrope','lilas','flower','peony','orchid']],
 ['Frais',['frais','fraich','marin','aquatique','ozon','menthe','embruns','iode','fresh','mint','aquatic']],
 ['Hespéridé',['hesperid','citr','bergamot','orange','mandarine','pamplemousse','agrum','yuzu','lemon','lime\\b']],
 ['Fruité',['fruit','pomme','poire','peche','framboise','cassis','fraise','cerise','abricot','prune','mure\\b','groseille','pear\\b','apple','peach','berry']],
 ['Épicé',['epic','poivre','cannelle','cardamome','safran','gingembre','girofle','muscade','pepper','cinnamon','spice']],
 ['Musqué',['musc','musk']],
 ['Cuiré',['cuir','leather','daim','suede']],
 ['Vert',['vert(?:es?|s)?\\b','feuille','herbe','figuier','gazon','galbanum']],
 ['Poudré',['poudr','violette','powder','talc']],
 ['Fumé',['fume','encens','tabac','smok','incense','tobacco']],
 ['Tropical',['tropic','coco','ananas','mangue','monoi','tiare','mango','pineapple']],
 ['Aromatique',['lavande','sauge','romarin','thym','basilic','aromat','lavender','sage\\b']]
];
const BG_BY_ACCORD={'Vanillé':'#D4872A','Ambré':'#D4872A','Gourmand':'#D4872A','Boisé':'#7A5230','Floral':'#E58AA8','Frais':'#2F6FD6','Hespéridé':'#E3C34A','Fruité':'#E4572E','Épicé':'#C23B4E','Musqué':'#C8B8A0','Cuiré':'#5B3A29','Vert':'#5FA84A','Poudré':'#C9B3D9','Fumé':'#1D1D1F','Tropical':'#2A9D8F','Aromatique':'#5FA84A'};
function countRe(text,alts){const m=text.match(new RegExp('\\b(?:'+alts.join('|')+')','g'));return m?m.length:0}
function pickAccords(primary,body){
  const pr=norm(primary),bo=norm(body),sc=[];
  CATS.forEach((c,i)=>{const v=countRe(pr,c[1])*3+Math.min(countRe(bo,c[1]),4);if(v>0)sc.push({n:c[0],v,i})});
  sc.sort((x,y)=>y.v-x.v||x.i-y.i);
  return sc.slice(0,3).map(x=>x.n);
}
function bgFor(acc,fallback){return (acc.length&&BG_BY_ACCORD[acc[0]])||fallback}
function stripTags(t){return String(t||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#0?39;|&rsquo;/g,"'").replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()}
function titleCase(t){return t.toLowerCase().replace(/(^|[\s'’\-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase())}
function cleanName(t,brand){
  const orig=stripTags(t);t=orig.split('|')[0];
  if(brand){const b=brand.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    t=t.replace(new RegExp('\\b(?:de|by|par|from)\\s+'+b,'ig'),' ').replace(new RegExp(b,'ig'),' ')}
  t=t.replace(/\b(?:eau\s+de\s+(?:parfum|toilette|cologne)|extrait\s+de\s+parfum|parfum|edp|edt|edc|vaporisateur|spray)\b/ig,' ')
     .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|oz|fl\.?\s*oz)\b/ig,' ')
     .replace(/\s+/g,' ').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g,'');
  if(!t)t=orig.split('|')[0].trim();
  if(t&&t===t.toUpperCase())t=titleCase(t);
  return t;
}
function detectConc(t){
  const n=norm(t);
  if(/extrait de parfum|\bextrait\b/.test(n))return 'Extrait de Parfum';
  if(/eau de parfum|\bedp\b/.test(n))return 'Eau de Parfum';
  if(/eau de toilette|\bedt\b/.test(n))return 'Eau de Toilette';
  if(/eau de cologne|\bcologne\b/.test(n))return 'Eau de Cologne';
  if(/\belixir\b/.test(n))return 'Elixir';
  if(/\bparfum\b/.test(n))return 'Parfum';
  return '';
}
function cleanNotes(s){
  s=String(s||'').replace(/\s+/g,' ').replace(/\b(?:etc|\.\.\.)\.?$/i,'').replace(/^[\s:,;–—-]+|[\s,;:–—-]+$/g,'').trim();
  if(s.length>110)s=s.slice(0,110).replace(/[,;]?\s*[^,;]*$/,'');
  return s?s.charAt(0).toUpperCase()+s.slice(1):'';
}
const NOTE_LABELS={
  top:'notes? de (?:t[êe]te|d[ée]part)|top notes?|head notes?|t[êe]te',
  heart:'notes? de c(?:œ|oe)ur|heart notes?|middle notes?|c(?:œ|oe)ur|heart',
  base:'notes? de fond|base notes?|fond|base'
};
function parseNotes(text){
  const t=String(text||'').replace(/\s+/g,' '),out={};
  const all='(?:'+NOTE_LABELS.top+'|'+NOTE_LABELS.heart+'|'+NOTE_LABELS.base+')';
  ['top','heart','base'].forEach(k=>{
    let re=new RegExp('(?:^|[\\s.;|,(])(?:'+NOTE_LABELS[k]+')\\s*[:：]\\s*(.{3,220}?)(?=\\s*'+all+'\\s*[:：]|[.;|]|$)','i'),m=t.match(re);
    if(!m){
      const multi={top:'notes? de (?:t[êe]te|d[ée]part)|top notes?|head notes?',heart:'notes? de c(?:œ|oe)ur|heart notes?|middle notes?',base:'notes? de fond|base notes?'}[k];
      const allMulti='(?:notes? de (?:t[êe]te|d[ée]part|c(?:œ|oe)ur|fond)|top notes?|head notes?|heart notes?|middle notes?|base notes?)';
      re=new RegExp('(?:^|[\\s.;|,(])(?:'+multi+')\\s+(.{3,160}?)(?=\\s+'+allMulti+'|[.;|]|$)','i');m=t.match(re);
    }
    if(m){const v=cleanNotes(m[1]);if(v&&v.length>2)out[k]=v}
  });
  return out;
}
function parseYear(text){
  const m=String(text||'').match(/(?:sorti(?:e)?\s+en|lanc[ée](?:e)?\s+en|ann[ée]e\s+(?:de\s+)?(?:sortie|lancement)\s*[:：]?|launched\s+in|released\s+in|release\s+date\s*[:：]?|date\s+de\s+sortie\s*[:：]?|since|depuis)\s*(?:le\s*)?(?:\d{1,2}\s+\p{L}+\s+)?((?:19|20)\d{2})/iu);
  if(!m)return '';
  const y=parseInt(m[1],10);return y<=new Date().getFullYear()+1?String(y):'';
}
function parsePerfumer(text){
  const m=String(text||'').match(/(?:[Pp]arfumeur(?:s|euse)?|[Pp]erfumer|[Nn]ez|[Nn]ose|[Cc]ompos[ée]e?\s+par|[Cc]r[ée][ée]e?\s+par|[Cc]reated\s+by)\s*[:：]?\s+((?:[A-ZÀ-Ý][\p{L}'’-]+)(?:\s+(?:de|di|du|von|van|le|la)?\s*[A-ZÀ-Ý][\p{L}'’-]+){0,2})/u);
  return m?m[1].trim():'';
}
function findProduct(doc){
  const nodes=[];
  const walk=x=>{
    if(!x||typeof x!=='object')return;
    if(Array.isArray(x)){x.forEach(walk);return}
    const t=x['@type'];if(t&&[].concat(t).indexOf('Product')>-1)nodes.push(x);
    if(x['@graph'])walk(x['@graph']);
  };
  doc.querySelectorAll('script[type="application/ld+json"]').forEach(sc=>{try{walk(JSON.parse(sc.textContent))}catch(e){}});
  return nodes[0]||null;
}
function bodyText(doc){
  doc.querySelectorAll('script,style,noscript,nav,header,footer,aside,form,svg,iframe').forEach(n=>n.remove());
  const root=doc.querySelector('main')||doc.body;
  return ((root&&root.textContent)||'').replace(/\s+/g,' ').slice(0,6000);
}
function priceOf(p){
  try{
    let o=p&&p.offers;if(Array.isArray(o))o=o[0];if(!o)return '';
    const v=parseFloat(o.price!=null?o.price:o.lowPrice);if(isNaN(v))return '';
    const cur=o.priceCurrency==='EUR'?'€':(o.priceCurrency||'');
    return v.toLocaleString('fr-FR',{maximumFractionDigits:2})+(cur?' '+cur:'');
  }catch(e){return ''}
}
function fromText(title,desc,body){
  const primary=[desc,title].filter(Boolean).join(' ');
  const notes=parseNotes(primary+' '+body);
  const noteTxt=[notes.top,notes.heart,notes.base].filter(Boolean).join(' ');
  return {
    accords:pickAccords(noteTxt?noteTxt+' '+primary:primary,body),
    notesTop:notes.top||'',notesHeart:notes.heart||'',notesBase:notes.base||'',
    year:parseYear(primary+' '+body),perfumer:parsePerfumer(body),
    tenue:parseTenue(body),sillage:parseSillage(body),conc:detectConc(title)||detectConc(desc)||detectConc(body.slice(0,400))
  };
}
function parseTenue(t){const m=String(t||'').match(/(?:tenue|long[eé]vit[eé])\s*[:\-–]?\s*((?:tr[eè]s\s+)?(?:\d+\s*(?:[àa\-–]\s*\d+)?\s*h(?:eures?)?|longue|courte|moyenne|bonne|excellente|faible)[^.\n]{0,16})/i);return m?m[1].trim().replace(/[,;\s]+$/,''):''}
function parseSillage(t){const m=String(t||'').match(/sillage\s*[:\-–]?\s*((?:tr[eè]s\s+)?(?:discret|l[eé]ger|mod[eé]r[eé]e?|moyen(?:ne)?|puissant|fort|[eé]norme|intense|pr[eé]sent)[^.\n]{0,12})/i);return m?m[1].trim().replace(/[,;\s]+$/,''):''}
function parseHtml(html,pageUrl){
  const doc=new DOMParser().parseFromString(html,'text/html');
  const meta=sel=>{const m=doc.querySelector(sel);return (m&&m.getAttribute('content'))||''};
  const p=findProduct(doc);
  let brand='';
  if(p&&p.brand)brand=typeof p.brand==='string'?p.brand:(Array.isArray(p.brand)?(p.brand[0]&&(p.brand[0].name||p.brand[0])):p.brand.name)||'';
  brand=stripTags(brand)||meta('meta[property="product:brand"]')||meta('meta[property="og:brand"]')||meta('meta[itemprop="brand"]');
  const title=(p&&p.name)||meta('meta[property="og:title"]')||doc.title||'';
  if(!brand){const sn=meta('meta[property="og:site_name"]');if(sn&&sn.length<40)brand=sn.replace(/\s*(?:beauty|parfums?|official|store|boutique|shop|fr|france)\s*$/i,'').trim()}
  if(!brand){const m=stripTags(title).match(/\b(?:de|by|par)\s+([A-ZÀ-Ý][^,|–—]*?)(?:,|\s+eau\b|\s+\d|$)/);if(m)brand=m[1].trim()}
  const desc=[p&&p.description,meta('meta[name="description"]'),meta('meta[property="og:description"]')].filter(Boolean).map(stripTags).join(' ');
  let img='';
  if(p&&p.image){const i=Array.isArray(p.image)?p.image[0]:p.image;img=typeof i==='string'?i:(i&&(i.url||i.contentUrl))||''}
  if(!img)img=meta('meta[property="og:image"]')||meta('meta[name="twitter:image"]');
  try{if(img)img=new URL(img,pageUrl||undefined).href}catch(e){}
  const price=priceOf(p);
  const body=bodyText(doc);
  const t=fromText(stripTags(title),desc,body);
  return Object.assign({name:cleanName(title,brand),brand:stripTags(brand),image:img,price},t);
}
/* boutiques Shopify : la fiche produit JSON donne la marque et la description complète (souvent avec les notes) */
async function enrichShopify(url,r){
  let u;try{u=new URL(url)}catch(e){return r}
  if(!/\/products\/[^/]+/.test(u.pathname))return r;
  if(r.brand&&(r.notesTop||r.notesHeart||r.notesBase))return r;
  const j=u.origin+u.pathname.replace(/\/$/,'')+'.js';
  for(const p of proxies(j)){
    try{
      const t=await fetchTimeout(p,false);if(!t||t[0]!=='{')continue;
      const o=JSON.parse(t),desc=stripTags(o.description||'');
      if(!r.brand&&o.vendor)r.brand=stripTags(o.vendor);
      const n=parseNotes(desc);
      if(!r.notesTop&&n.top)r.notesTop=n.top;if(!r.notesHeart&&n.heart)r.notesHeart=n.heart;if(!r.notesBase&&n.base)r.notesBase=n.base;
      if(!r.tenue)r.tenue=parseTenue(desc);if(!r.sillage)r.sillage=parseSillage(desc);
      if(!r.perfumer)r.perfumer=parsePerfumer(desc);
      if(!r.conc)r.conc=detectConc(o.title||'')||detectConc(desc.slice(0,300));
      if(n.top||n.heart||n.base){const nt=[n.top,n.heart,n.base].filter(Boolean).join(' ');const a=pickAccords(nt,desc);if(a&&a.length)r.accords=a}
      if(!r.image&&o.featured_image)r.image=String(o.featured_image).replace(/^\/\//,'https://');
      return r;
    }catch(e){}
  }
  return r;
}
/* base de parfums (Parfumo) : complète notes, parfumeur, année, accords, tenue et sillage */
async function enrichDb(r){
  const base=typeof window!=='undefined'&&window.WK_INFO_URL;if(!base||!r||!r.name)return r;
  try{
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),20000);
    const res=await fetch(base+'&name='+encodeURIComponent(r.name)+'&brand='+encodeURIComponent(r.brand||''),{signal:ctl.signal});clearTimeout(tm);
    if(!res.ok)return r;const d=await res.json();if(!d||!d.found)return r;
    const cap=x=>x?x.charAt(0).toUpperCase()+x.slice(1):'';
    if(!r.brand&&d.brand)r.brand=d.brand;
    if(!(r.notesTop||r.notesHeart||r.notesBase)){
      if(d.top||d.heart||d.base){r.notesTop=cap(d.top);r.notesHeart=cap(d.heart);r.notesBase=cap(d.base)}
      else if(d.flat){r.notesHeart=cap(d.flat);r.notesFlat=true}
    }
    if(!r.perfumer&&d.perfumer)r.perfumer=d.perfumer;
    if(!r.year&&d.year)r.year=d.year;
    if(!r.tenue&&d.tenue)r.tenue=d.tenue;
    if(!r.sillage&&d.sillage)r.sillage=d.sillage;
    if(d.accords&&d.accords.length)r.accords=d.accords;
    r.dbSource=d.source||'';
  }catch(e){}
  return r;
}
function parsePastedText(text){
  const body=String(text||'').replace(/\s+/g,' ').slice(0,6000);
  return Object.assign({name:'',brand:'',image:'',price:''},fromText('','',body));
}

/* ---------- réseau ---------- */
async function fetchTimeout(u,asBlob){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),15000);
  try{const r=await fetch(u,{signal:ctl.signal});if(!r.ok)throw new Error('http');return asBlob?await r.blob():await r.text()}
  finally{clearTimeout(t)}
}
function proxies(url){const e=encodeURIComponent(url),l=[url,'https://api.allorigins.win/raw?url='+e,'https://corsproxy.io/?url='+e];if(typeof window!=='undefined'&&window.WK_PAGE_PROXY)l.unshift(window.WK_PAGE_PROXY+e);return l}
async function fetchHtml(url){
  for(const u of proxies(url)){try{const h=await fetchTimeout(u,false);if(h&&h.length>120)return h}catch(e){}}
  throw new Error('fetch');
}
async function fetchImageBlob(url){
  for(const u of proxies(url)){try{const b=await fetchTimeout(u,true);if(b&&b.size>2000&&/^image\//.test(b.type))return b}catch(e){}}
  throw new Error('image');
}
function normalizeBlob(blob){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(blob),im=new Image();
    im.onload=()=>{
      const s=Math.min(1,1400/Math.max(im.naturalWidth,im.naturalHeight)),c=newCanvas(im.naturalWidth*s,im.naturalHeight*s);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);
      const alpha=/png|webp|gif/.test(blob.type);
      c.toBlob(b=>b?res(b):rej(new Error('blob')),alpha?'image/png':'image/jpeg',.92);
    };
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('img'))};
    im.src=url;
  });
}

return {parseHtml,enrichShopify,enrichDb,fetchHtml,fetchImageBlob,normalizeBlob,cutout,pickAccords,BG_BY_ACCORD,CATS};
})();
