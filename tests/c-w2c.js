const { chromium } = require('playwright'); const L = require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/rlib');
const PAGES=(process.env.PAGES||'dashboard,students,payments,payments:pay,payroll,settings,ac-teachers,ac-overview,tp-home,tp-att,tp-routine,sp-home,login').split(',');
(async () => { const b = await chromium.launch(); const W=+(process.env.W||1440),H=+(process.env.H||900), mode=process.env.MODE||'m-dark';
const p = await b.newPage({viewport:{width:W,height:H}}); await L.setup(p); await p.goto(L.FILE); await p.waitForTimeout(900);
await p.evaluate(m=>(m.startsWith('p-')?(setTheme(m.slice(2)),setSkin('premium')):setSkin(m)),mode); await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
await p.addStyleTag({content:'[data-ccx] *{visibility:hidden!important}[data-ccx]::before,[data-ccx]::after{visibility:hidden!important}'}); let total=0; const all={};
for (const st of PAGES){ const [pg,act]=st.split(':');
 await p.evaluate(([pg,act])=>{ if(pg==='login'){SCH.signOut();return;} if(!ST.user||ST.role==null||document.querySelector('.lg-card')) SCH.lgAs('Owner'); closeSheet(); if(pg.startsWith('tp-')) SCH.enterTeacherPreview('MEN-01'); else if(pg.startsWith('sp-')) SCH.openStudent('STU-1001'); else if(ST.role!=='Owner'){SCH.preview=null;ST.role='Owner';} go(pg); if(act==='pay'){payView(PAYMENTS.find(q=>q.status==='Pending').id);} },[pg,act]).catch(e=>console.log('nav',pg,e.message));
 await p.waitForTimeout(450); await p.mouse.move(W-2,H-2);
 const r = await p.evaluate(()=>{
  const P=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[ ,\/]+/).filter(Boolean).map(Number);return [a[0],a[1],a[2],a[3]==null?1:a[3]];};
  const cols=s=>(s.match(/rgba?\([^)]+\)/g)||[]).map(P);
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};
  const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
  const over=(top,bot)=>{const a=top[3];return [top[0]*a+bot[0]*(1-a),top[1]*a+bot[1]*(1-a),top[2]*a+bot[2]*(1-a),1]};
  const ov=document.querySelector('#ov'),sh=document.querySelector('#sheet');const sheetOpen=ov&&sh&&getComputedStyle(ov).display!=='none'&&sh.getBoundingClientRect().width>0;const lg=document.querySelector('.lg-card');
  const root=lg&&lg.getBoundingClientRect().width>0?(lg.closest('[class*=lg]')||lg).parentElement:(sheetOpen?sh:document.body); const out=[];
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const seen=new Set();
  while(w.nextNode()){const t=w.currentNode; if(!t.nodeValue.trim())continue; const el=t.parentElement; if(seen.has(el))continue; seen.add(el);
   const rc=el.getBoundingClientRect(); if(rc.width<2||rc.height<2||rc.bottom<0||rc.top>innerHeight||rc.right<0||rc.left>innerWidth)continue;
   {const hx=Math.min(innerWidth-1,Math.max(0,rc.left+Math.min(rc.width/2,10))),hy=Math.min(innerHeight-1,Math.max(0,rc.top+rc.height/2));const hit=document.elementFromPoint(hx,hy);if(hit&&!el.contains(hit)&&!hit.contains(el)&&!(hit.closest&&hit.closest('label')===el.closest('label')&&el.closest('label')))continue;}
   const cs=getComputedStyle(el); if(cs.visibility==='hidden'||+cs.opacity===0)continue;
   if(el.closest('[disabled],.pm-atmo,svg,#toast,[aria-hidden="true"]'))continue;
   const chain=[];let e=el,op=1,hidden=false;while(e&&e.nodeType===1){const c=getComputedStyle(e);op*=+c.opacity;if(c.display==='none')hidden=true;chain.unshift(c);e=e.parentElement;}
   if(hidden||op<.98)continue;
   let bg=[11,16,32,1];let worst=null;let grad=false;
   for(const c of chain){const bc=P(c.backgroundColor);if(bc&&bc[3]>0)bg=over(bc,bg);const gi=c.backgroundImage;if(gi&&gi.includes('gradient')){grad=true;const cs2=cols(gi).filter(Boolean);if(cs2.length){const opaque=cs2.filter(x=>x[3]>.5);if(opaque.length){worst=opaque.map(x=>over(x,bg));bg=worst[Math.floor(worst.length/2)];}else{bg=over(cs2[0],bg);}}}}
   let fg=P(cs.color); if(!fg)continue; if(fg[3]<1)fg=over(fg,bg);
   const cands=worst||[bg]; let ratio=Math.min(...cands.map(x=>cr(fg,x)));
   const fs=parseFloat(cs.fontSize),fw=+cs.fontWeight; const need=(fs>=24||(fs>=18.66&&fw>=700))?3:4.5;
   const transparentText=fg[3]===0||cs.webkitTextFillColor==='rgba(0, 0, 0, 0)'; if(transparentText)continue;
   if(ratio<need||grad){const id=out.length;el.dataset.cc=id; out.push({id,grad,txt:t.nodeValue.trim().slice(0,40),cls:(el.tagName+'.'+[...el.classList].join('.')).slice(0,50),par:(el.parentElement&&el.parentElement.className||'').toString().slice(0,30),ratio:+ratio.toFixed(2),need,fg:cs.color,bg:'rgb('+bg.slice(0,3).map(Math.round)+')',fgv:fg.slice(0,3),x:rc.left,y:rc.top,w:rc.width,h:rc.height});}}
  return out;});
 const fails=[];
 for(const c of r){ const ix=Math.max(3,c.w*.18),iy=Math.max(3,c.h*.2);const x=Math.max(0,Math.floor(c.x+ix)),y=Math.max(0,Math.floor(c.y+iy)),w=Math.min(W-x,Math.ceil(c.w-2*ix)),h=Math.min(H-y,Math.ceil(c.h-2*iy)); if(w<2||h<2)continue;
  await p.evaluate(id=>{const e=document.querySelector('[data-cc="'+id+'"]');e.style.setProperty('color','transparent','important');e.style.setProperty('-webkit-text-fill-color','transparent','important');e.style.setProperty('text-shadow','none','important');e.setAttribute('data-ccx','');},c.id);
  const buf=await p.screenshot({clip:{x,y,width:w,height:h}});
  await p.evaluate(id=>{const e=document.querySelector('[data-cc="'+id+'"]');e.style.removeProperty('color');e.style.removeProperty('-webkit-text-fill-color');e.style.removeProperty('text-shadow');e.removeAttribute('data-ccx');},c.id);
  const ratio=await p.evaluate(async([b64,fg])=>{const im=new Image();im.src='data:image/png;base64,'+b64;await im.decode();const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;const g=cv.getContext('2d');g.drawImage(im,0,0);const d=g.getImageData(0,0,im.width,im.height).data;
   const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c[0])+.7152*f(c[1])+.0722*f(c[2])};const L=lum(fg);const rs=[];
   for(let i=0;i<d.length;i+=4){const l=lum([d[i],d[i+1],d[i+2]]);rs.push((Math.max(l,L)+.05)/(Math.min(l,L)+.05));} rs.sort((a,b)=>a-b); return rs[Math.floor(rs.length*.1)];},[buf.toString('base64'),c.fgv]);
  if(ratio<c.need){c.px=+ratio.toFixed(2);fails.push(c);} }
 await p.evaluate(()=>document.querySelectorAll('[data-cc]').forEach(e=>e.removeAttribute('data-cc')));
 const r2=fails; total+=r2.length; console.log(st,r2.length); r2.slice(0,+(process.env.N||8)).forEach(x=>{delete x.fgv;console.log('   ',JSON.stringify(x))}); continue; console.log(st, r.length); r.slice(0,+(process.env.N||8)).forEach(x=>console.log('   ',JSON.stringify(x)));
}
console.log('TOTAL',total); await b.close(); })();
