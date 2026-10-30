const { chromium } = require('playwright'); const L = require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/rlib');
const SIZES=[[1440,900],[820,1180],[390,844]]; const LANGS=(process.env.LANGS||'en,bn').split(','); const MODE=process.env.MODE||'m-light';
(async () => { const b = await chromium.launch(); const sum={}, det={};
for (const [w,h] of SIZES) for (const lg of LANGS) {
 const p = await b.newPage({viewport:{width:w,height:h}}); await L.setup(p); await p.goto(L.FILE); await p.addStyleTag({content:'*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important}#toast{display:none!important}'}); await p.waitForTimeout(800);
 const r = await p.evaluate(async ([lg,MODE])=>{ const tick=()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>setTimeout(r,20))));
  SCH.lgAs('Owner'); setSkin('midnight'); setTheme(MODE==='m-dark'||MODE==='p-dark'?'dark':'light'); if(MODE.startsWith('p-'))setSkin('premium'); setLang(lg);
  const out={clip:[],over:[],small:[],hscroll:[]};
  const vis=e=>{const r=e.getBoundingClientRect(); if(r.width<1||r.height<1) return false; const cs=getComputedStyle(e); if(e.checkVisibility&&!e.checkVisibility({opacityProperty:true,visibilityProperty:true})) return false; let a=e; while(a&&a!==document.body){ if(+getComputedStyle(a).opacity<0.05) return false; a=a.parentElement;} return cs.visibility!=='hidden'&&cs.display!=='none';};
  const check=(tag)=>{
   if(document.documentElement.scrollWidth>innerWidth+1) out.hscroll.push(tag+':'+document.documentElement.scrollWidth);
   const els=[...document.querySelectorAll('#view *, #top *, #bnav *, #side .nav, #sheet *')].filter(e=>!e.closest('svg')&&e.offsetParent!==null);
   const txtEls=els.filter(e=>[...e.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim().length>0));
   txtEls.forEach(e=>{ if(!vis(e)) return; const cs=getComputedStyle(e); const t=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();
     const fs=parseFloat(cs.fontSize); const up=cs.textTransform==='uppercase'&&parseFloat(cs.letterSpacing)>0;
     const min = up?11:12; if(fs>0 && fs<min-0.01 && !e.closest('.rs-tab .n') ) out.small.push(tag+' '+fs+'px '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+': '+t.slice(0,30));
     const clipX = e.scrollWidth>e.clientWidth+2 && ['hidden','clip'].includes(cs.overflowX) && cs.textOverflow!=='ellipsis' && !e.closest('.sc-scroll,.tw:not(.cards)');
     const clipY = e.scrollHeight>e.clientHeight+3 && ['hidden','clip'].includes(cs.overflowY) && !(cs.webkitLineClamp && cs.webkitLineClamp!=='none');
     if(/^(BDT|৳)\s?[\d,.]+[A-Za-z]?$/.test(t) && cs.display!=='none'){ const lines=new Set(); [...e.childNodes].filter(n=>n.nodeType===3&&n.nodeValue.trim()).forEach(n=>{const rg=document.createRange(); rg.selectNodeContents(n); [...rg.getClientRects()].forEach(q=>lines.add(Math.round(q.top)));}); if(lines.size>1) out.clip.push(tag+' WRAP '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+' <'+(e.parentElement.className||e.parentElement.tagName)+' <'+(e.parentElement.parentElement.className||e.parentElement.parentElement.tagName)+': '+t); }
     if(cs.textOverflow==='ellipsis' && e.scrollWidth>e.clientWidth+1) out.ell=(out.ell||[]), out.ell.push(tag+' '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+' <'+(e.parentElement.className||e.parentElement.tagName)+': '+t.slice(0,30));
     { const box=e.parentElement&&e.parentElement.closest('.card,.kpi,.qc,.cck,.sc-tile,.li,.btn,.qbx,.ts-n,.pill,.tag,.rt-it,.cal-d,#bnav button,.sh,.person'); if(box && !e.closest('.sc-scroll,.tw:not(.cards),.rt-wk,.seg,.stabs,.chips')){ const br=box.getBoundingClientRect(), er=e.getBoundingClientRect(); const rr=document.createRange(); let mx=-1e9,mn=1e9; [...e.childNodes].filter(n=>n.nodeType===3&&n.nodeValue.trim()).forEach(n=>{rr.selectNodeContents(n); [...rr.getClientRects()].forEach(q=>{mx=Math.max(mx,q.right); mn=Math.min(mn,q.left);});}); if(mx>br.right+2||mn<br.left-2) out.clip.push(tag+' SPILL '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+' in '+box.className.split(' ')[0]+': '+t.slice(0,30)); } }
     const r=e.getBoundingClientRect(); const sc=e.closest('.sc-scroll,.tw,.rt-wk,.seg,.stabs,.chips,#sheet,.cal');
     const off = !sc && (r.right>innerWidth+1 || r.left< -1);
     if(clipX||clipY||off) out.clip.push(tag+' '+(clipX?'X':clipY?'Y':'off')+' '+e.tagName+'.'+(typeof e.className==='string'?e.className.split(' ')[0]:'')+': '+t.slice(0,30));
   });
   // overlap between text elements sharing a parent
   const par=new Map(); txtEls.forEach(e=>{ if(!vis(e)) return; const k=e.parentElement; if(!par.has(k)) par.set(k,[]); par.get(k).push(e); });
   par.forEach(list=>{ for(let i=0;i<list.length;i++) for(let j=i+1;j<list.length;j++){ const hit=[...list[i].getClientRects()].some(a=>[...list[j].getClientRects()].some(c=>{const ix=Math.min(a.right,c.right)-Math.max(a.left,c.left), iy=Math.min(a.bottom,c.bottom)-Math.max(a.top,c.top); return ix>3&&iy>3;})); if(hit){ const pa=getComputedStyle(list[i]).position, pc=getComputedStyle(list[j]).position; if(pa==='absolute'||pc==='absolute'||pa==='fixed'||pc==='fixed') continue; out.over.push(tag+' '+list[i].textContent.trim().slice(0,20)+' ⟂ '+list[j].textContent.trim().slice(0,20)); } } });
  };
  const roles=[['Owner',null],['Mentor','MEN-01'],['Student','STU-1001']];
  for(const [role,x] of roles){ if(role==='Mentor') SCH.enterTeacherPreview(x); else if(role==='Student') SCH.openStudent(x); else { SCH.preview=null; ST.role='Owner'; } for(const pg of R_().pages){ try{ go(pg); await tick(); check(role[0]+':'+pg);}catch(e){out.clip.push(pg+' ERROR '+e.message)} } }
  if(!out.ell) out.ell=[];
  SCH.preview=null; SCH.lgAs('Owner'); setSkin('midnight'); setTheme(MODE==='m-dark'||MODE==='p-dark'?'dark':'light'); if(MODE.startsWith('p-'))setSkin('premium'); setLang(lg);
  const P1=(typeof PAYMENTS!=='undefined'&&PAYMENTS[0])?PAYMENTS[0].id:null;
  const SHS=[['stuView',()=>stuView('STU-1001')],['payForm',()=>payForm('STU-1001')],['payView',()=>P1&&payView(P1)],['theme',()=>themeSheet()]]; for(const [n,f] of SHS){ try{ go('dashboard'); f(); await tick(); check('O:sheet-'+n); closeSheet&&closeSheet(); }catch(e){ out.clip.push('sheet '+n+' ERROR '+e.message);} }
  return out; },[lg,MODE]);
 const k=w+'/'+lg; sum[k]=Object.fromEntries(Object.entries(r).map(([a,v])=>[a,v.length])); det[k]=r; await p.close(); }
console.log(JSON.stringify(sum,null,0));
require('fs').writeFileSync('/home/claude/prod/tests/shots/c/audit-'+(process.env.OUTN||'last')+'.json', JSON.stringify(det,null,1));
await b.close(); })();
