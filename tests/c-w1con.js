// rendered-text contrast audit: fg from computed colour, bg sampled from the screenshot under each text box
const { chromium } = require('playwright'); const L = require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/rlib'); const {PNG}=require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/node_modules/pngjs');
const lum=([r,g,b])=>{const f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const cr=(a,b)=>{const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
(async()=>{const b=await chromium.launch();const W=+(process.env.W||1440),H=+(process.env.H||900);const p=await b.newPage({viewport:{width:W,height:H}});await L.setup(p);await p.goto(L.FILE);await p.waitForTimeout(900);
const MODE=process.env.MODE||'m-light'; await p.evaluate(m=>{SCH.lgAs('Owner');(m.startsWith('p-')?(setTheme(m.slice(2)),setSkin('premium')):setSkin(m));},MODE); if(process.env.LANGX) await p.evaluate(l=>setLang(l),process.env.LANGX);
const steps=(process.env.STEPS||'').split(',').filter(Boolean); let total=0, all=0; const seen={};
for(const st of steps){const [who,pg,act]=st.split(':');
 await p.evaluate(([who,pg,act,m])=>{closeSheet&&closeSheet(); if(who==='login'){SCH.signOut();(m.startsWith('p-')?(setTheme(m.slice(2)),setSkin('premium')):setSkin(m));return;} if(who==='t'&&ST.role!=='Mentor'){SCH.preview=null;SCH.enterTeacherPreview('MEN-01');} if(who==='s'&&ST.role!=='Student'){SCH.preview=null;SCH.openStudent('STU-1001');} const lg=document.getElementById('sc-login'); if(who==='o'&&(ST.role!=='Owner'||SCH.preview||(lg&&lg.getClientRects().length&&getComputedStyle(lg).display!=='none'))){SCH.preview=null;SCH.lgAs('Owner');} (m.startsWith('p-')?(setTheme(m.slice(2)),setSkin('premium')):setSkin(m)); go(pg); if(act==='pay'){payView(PAYMENTS.find(q=>q.status==='Pending').id);} if(act==='theme'){themeSheet();} window.scrollTo(0,0); const t=document.getElementById('toast'); if(t) t.hidden=true;},[who,pg,act,MODE]);
 await p.mouse.move(W-2,H-2); await p.waitForTimeout(act?1200:600);
 // scroll through page in viewport chunks
 const ph=await p.evaluate(()=>Math.min(document.documentElement.scrollHeight,6000)); const isSheet=act&&act!=='';
 for(let y=0;y<(isSheet?1:ph);y+=H){ if(!isSheet) {await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(250);}
  const items=await p.evaluate(()=>{const out=[];const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
   while(n=w.nextNode()){const s=n.textContent.trim(); if(!s) continue; const el=n.parentElement; if(!el||el.closest('.paper,.a4,#printArea,svg:not(.i) text,script,style,[hidden],[aria-hidden="true"]')) continue;
    const cs=getComputedStyle(el); if(cs.visibility!=='visible'||+cs.opacity===0) continue; if(cs.color.includes('0)')&&cs.backgroundClip==='text') continue;
    const r=document.createRange(); r.selectNodeContents(n); const rc=[...r.getClientRects()].filter(q=>q.width>2&&q.height>4); if(!rc.length) continue; const q=rc[0];
    if(q.bottom<0||q.top>innerHeight||q.right<0||q.left>innerWidth) continue;
    const cx=Math.min(innerWidth-1,Math.max(0,q.left+Math.min(q.width/2,10))),cy=Math.min(innerHeight-1,Math.max(0,q.top+q.height/2)); const top=document.elementFromPoint(cx,cy); if(!top||!(top===el||el.contains(top)||top.contains(el))) continue;
    let op=1,e=el; while(e&&e!==document.body){op*=+getComputedStyle(e).opacity; e=e.parentElement;}
    let m=cs.color.match(/[\d.]+/g).map(Number); if(cs.color.startsWith('color(')){m=[m[0]*255,m[1]*255,m[2]*255,m.length>3?m[3]:1];} out.push({t:s.slice(0,50),c:m,op,fs:parseFloat(cs.fontSize),fw:+cs.fontWeight||400,x:Math.max(0,q.left|0),y:Math.max(0,q.top|0),w:Math.min(q.width,innerWidth-q.left)|0,h:q.height|0,sel:el.tagName.toLowerCase()+(el.className&&typeof el.className==='string'?'.'+el.className.split(' ').slice(0,2).join('.'):'')+' < '+(el.parentElement?.className||'').toString().split(' ')[0]});}
   return out;});
  if(process.env.DBG) console.log(pg,y,items.length);
  const img=PNG.sync.read(await p.screenshot());
  for(const it of items){ const cnt={}; const add=(xx,yy)=>{if(xx<0||yy<0||xx>=img.width||yy>=img.height)return;const i=(yy*img.width+xx)*4; const k=(img.data[i]>>2)+','+(img.data[i+1]>>2)+','+(img.data[i+2]>>2); cnt[k]=(cnt[k]||0)+1;};
   for(const d of [2,3]){ for(let xx=it.x-d;xx<=it.x+it.w+d;xx++){add(xx,it.y-d);add(xx,it.y+it.h+d);} for(let yy=it.y-d;yy<=it.y+it.h+d;yy++){add(it.x-d,yy);add(it.x+it.w+d,yy);} }
   const top=Object.entries(cnt).sort((a,b)=>b[1]-a[1])[0]; if(!top) continue; const bg=top[0].split(',').map(v=>v*4+2);
   const a=(it.c[3]??1)*it.op; const fg=[0,1,2].map(k=>it.c[k]*a+bg[k]*(1-a)); const c=cr(fg,bg); all++;
   const large=it.fs>=24||(it.fs>=18.6&&it.fw>=700); const need=4.5;
   if(c<need){const key=pg+'|'+it.t; if(seen[key]) continue; seen[key]=1; total++; console.log(pg, c.toFixed(2), large?'L':'', it.fs+'px', JSON.stringify(it.t), it.sel, 'fg', fg.map(Math.round).join(','), 'bg', bg.join(','));}
  }
 }
}
console.log('CHECKED',all,'FLAGS',total); await b.close();})();
