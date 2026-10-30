const { chromium } = require('playwright'); const L = require('/tmp/claude-0/-home-claude/bc87f3e9-52ed-5ca8-bcaf-b3feca830d7e/scratchpad/t/rlib');
const O='/home/claude/prod/tests/shots/c/'+(process.env.TAG||'')+'/'; require('fs').mkdirSync(O,{recursive:true});
(async()=>{const b=await chromium.launch();const errs=[];
for(const th of ['light','dark']) for(const [w,h] of [[1440,900],[390,844]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));await L.setup(p);await p.goto(L.FILE);await p.waitForTimeout(800);
 await p.evaluate(t=>{SCH.lgAs('Owner');setSkin('premium');setTheme(t);document.getElementById('toast')&&(document.getElementById('toast').style.display='none')},th);
 for(const pg of (process.env.PG||'dashboard,students,payments').split(',')){await p.evaluate(pg=>go(pg),pg);await p.waitForTimeout(700);await p.screenshot({path:`${O}${th}-${w}-${pg}.png`});}
 if(w===1440){await p.evaluate(()=>SCH.stu360&&SCH.stu360('STU-1001'));await p.waitForTimeout(500);await p.screenshot({path:`${O}${th}-${w}-stucard.png`});}
 await p.close();}
console.log('errors',errs);await b.close();})();
