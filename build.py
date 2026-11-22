"""FTA Command Centre production build.
   python3 build.py            -> site/ (production: Supabase, empty data)
   MODE=demo python3 build.py  -> site-demo/ (sample data, no backend; used by the regression tests)
   MODE=mock python3 build.py  -> site-mock/ (production code + in-browser mock backend; used by the tests)
"""
import base64, os, sys, re, shutil, importlib.util, hashlib
ROOT = os.path.dirname(os.path.abspath(__file__)); V8 = os.path.join(ROOT, 'layers') + '/' if os.path.isdir(os.path.join(ROOT, 'layers')) else '/home/claude/work/v8/'
MODE = os.environ.get('MODE', 'prod'); OUT = os.path.join(ROOT, {'prod': 'site', 'demo': 'site-demo', 'mock': 'site-mock'}[MODE])
M = 'html:root:is([data-skin="midnight"],[data-skin="emerald"])'
def load(p):
    spec = importlib.util.spec_from_file_location('m' + hashlib.md5(p.encode()).hexdigest()[:6], p); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m.PATCHES
src = open(V8 + 'v8-original.html', encoding='utf8').read()
cssL = ['v9.css', 'money1.css', 'money2.css', 'fix.css', 'v9s.css', 'v9f.css', 'v9g.css', 'v9h.css', 'v9i.css', 'v9j.css', 'v9k.css', 'v9l.css', 'v9m.css', 'v9p.css', 'v9a.css', 'v9t.css', 'v9u.css', 'v9q.css']
jsL = ['v9.js', 'money1.js', 'money2.js', 'fix.js', 'v9s.js', 'v9f.js', 'v9g.js', 'v9h.js', 'v9i.js', 'v9j.js', 'v9k.js', 'v9l.js', 'v9m.js', 'v9p.js', 'v9a.js', 'v9r.js', 'v9t.js', 'v9u.js', 'v9q.js']
css = '\n'.join(open(V8 + f, encoding='utf8').read() for f in cssL).replace('$M', M)
js = '\n;\n'.join(open(V8 + f, encoding='utf8').read() for f in jsL)
tail = "<script>document.addEventListener('visibilitychange'"
assert src.count(tail) == 1
src = src.replace(tail, '<style id="v9-css">\n' + css + '\n</style>\n<script>\n' + js + '\n</script>\n' + tail)
# source patches (exact, each must match exactly once)
for name in ['patches.py', 'theme_patches.py']:
    for old, new in load(os.path.join(ROOT, 'src', name)):
        n = src.count(old)
        if n != 1: sys.exit(f'{name}: patch matched {n} times: {old[:100]!r}')
        src = src.replace(old, new)
rd = lambda f: open(os.path.join(ROOT, 'src', f), encoding='utf8').read()
# ---------- speed: nothing in <head> waits for the internet ----------
# Google Fonts load in the background (text shows at once in the system font, then swaps)
FONT_RE = re.compile(r'<link( id="[^"]+")? rel="stylesheet" href="(https://fonts\.googleapis\.com/css2\?[^"]+)">')
# only the page's own first link: the print / receipt windows keep theirs, because they wait for its onload
src, nf = FONT_RE.subn(lambda m: f'<link{m.group(1) or ""} rel="stylesheet" href="{m.group(2)}" media="print" onload="this.media=\'all\'">', src, count=1)
assert nf == 1, 'font link not found'
src = src.replace('<link rel="preconnect" href="https://fonts.googleapis.com">', '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>', 1)
# the picture-export library is only needed when someone presses "Save picture"
H2C = '<script src="vendor/html2canvas.min.js"></script>'
if src.count(H2C) == 1: src = src.replace(H2C, '<script src="vendor/html2canvas.min.js" defer></script>')
# the first thing painted: gold dust gathers into the FTA emblem, the name opens in gold foil, a light keeps travelling (all modes)
EMB = 'data:image/png;base64,' + base64.b64encode(open(os.path.join(ROOT, 'public/brand/emblem.png'), 'rb').read()).decode()
BOOT = ('<div id="fta-boot" aria-hidden="true"><div class="fb-mark"><b class="fb-halo"></b><canvas class="fb-pc" id="fb-pc"></canvas><img class="fb-img" id="fb-img" alt="" width="256" height="256"><span class="fb-shine"></span></div>'
        '<div class="fb-brand"><div class="fb-nm">FINAL TOUCH</div><div class="fb-rule"><i></i><b></b></div><div class="fb-tag">Learning made easy</div></div></div>')
BOOT_JS = r"""<script>(function(){var E=window.__ftaEmb,I=document.getElementById('fb-img'),C=document.getElementById('fb-pc'),M=I&&I.parentNode;if(!E||!I)return;
I.src=E;document.documentElement.style.setProperty('--fta-emb','url('+E+')');try{document.fonts&&document.fonts.load('600 30px "Cormorant Garamond"')}catch(e){}
var rm=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(rm){I.style.opacity=1;return}
var im=new Image();im.onload=function(){var c=document.createElement('canvas');c.width=c.height=256;var x=c.getContext('2d');x.drawImage(im,0,0,256,256);var d=x.getImageData(0,0,256,256).data,P=[];
for(var y=0;y<256;y+=2)for(var q=0;q<256;q+=2){var i=(y*256+q)*4;if(d[i+3]>120){var a=Math.random()*6.283,r=100+Math.random()*130;P.push({tx:q,ty:y,sx:128+Math.cos(a)*r,sy:128+Math.sin(a)*r*.8,c:'rgb('+d[i]+','+d[i+1]+','+d[i+2]+')',d:Math.random()*.85+(y/256)*.35,s:1.5+Math.random()*1.1})}}
var dpr=Math.min(2,window.devicePixelRatio||1),W=M.clientWidth||200,g=C.getContext('2d');C.width=C.height=W*1.8*dpr;g.setTransform(dpr*W/256,0,0,dpr*W/256,dpr*W*.4,dpr*W*.4);var t0=performance.now();
(function f(now){if(!document.getElementById('fb-pc'))return;var t=(now-t0)/1000;g.save();g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,C.width,C.height);g.restore();
for(var i=0;i<P.length;i++){var p=P[i],u=Math.min(1,Math.max(0,(t-p.d*.9)/1.5)),e=1-Math.pow(1-u,3);g.globalAlpha=.25+.75*e;g.fillStyle=u<1?'#F3DFA2':p.c;g.fillRect(p.sx+(p.tx-p.sx)*e,p.sy+(p.ty-p.sy)*e,p.s*(1-.35*e),p.s*(1-.35*e))}
if(t<2.7)requestAnimationFrame(f)})(t0)};im.src=E})();</script>"""
BOOT_CSS = (
  '#fta-boot{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(120% 90% at 50% 40%,#17130B 0%,#0B0A07 60%,#08090B 100%);opacity:1;transition:opacity .6s ease}'
  '.fb-mark{position:relative;width:min(46vw,210px);aspect-ratio:1;flex:none}.fb-mark>*{position:absolute;inset:0;width:100%;height:100%}'
  '.fb-halo{border-radius:50%;background:radial-gradient(circle,rgba(201,162,77,.30) 0%,rgba(201,162,77,.07) 50%,transparent 70%);opacity:0;transform:scale(.8);animation:fbhalo 1.8s ease-out 1s forwards,fbbreathe 3s ease-in-out 2.9s infinite}'
  '.fb-mark>.fb-pc{inset:-40%;width:180%;height:180%;opacity:0;animation:fbpin .25s ease forwards,fbpout .7s ease 2.35s forwards}'
  '.fb-img{object-fit:contain;opacity:0;filter:drop-shadow(0 8px 26px rgba(201,162,77,.32));animation:fbimg .9s ease 2.2s forwards}'
  '.fb-shine{-webkit-mask:var(--fta-emb) center/contain no-repeat;mask:var(--fta-emb) center/contain no-repeat;background:linear-gradient(105deg,transparent 40%,rgba(255,248,214,.95) 50%,transparent 60%) 170% 0/280% 100% no-repeat;opacity:0;animation:fbshine 1.6s ease-in-out 2.95s 1 forwards,fbshine 1.6s ease-in-out 5.4s infinite}'
  '.fb-brand{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:10px;width:100%}'
  '.fb-nm{font:600 clamp(24px,7vw,38px)/1 "Cormorant Garamond",Georgia,"Times New Roman",serif;letter-spacing:.3em;text-indent:.3em;white-space:pre;color:transparent;-webkit-text-fill-color:transparent;background:linear-gradient(100deg,#8F6B1E 0%,#E9CE86 22%,#FFF3C4 34%,#C9A24D 48%,#8F6B1E 62%,#E9CE86 80%,#B58A2C 100%) 0 0/260% 100%;-webkit-background-clip:text;background-clip:text;opacity:0;animation:fbspread 1.9s cubic-bezier(.2,.7,.2,1) 2.4s both,fbnm 1.5s cubic-bezier(.3,.7,.2,1) 2.4s both,fbfoil 3.4s ease-in-out 3.9s 1 forwards,fbfoil 3.4s ease-in-out 9s infinite}'
  '.fb-rule{position:relative;width:min(62%,300px);height:1px;display:flex;align-items:center;justify-content:center;opacity:0;animation:fbfade .4s ease 3.1s forwards}'
  '.fb-rule::before,.fb-rule::after{content:"";position:absolute;top:0;height:1px;width:50%;background:linear-gradient(90deg,transparent,#C9A24D 70%,transparent 100%);animation:fbgrow 1.1s cubic-bezier(.3,.7,.2,1) 3.1s forwards;transform:scaleX(0)}'
  '.fb-rule::before{left:0;transform-origin:100% 50%}.fb-rule::after{right:0;transform-origin:0 50%}'
  '.fb-rule i{position:relative;z-index:2;width:7px;height:7px;background:#F3DFA2;transform:rotate(45deg) scale(0);box-shadow:0 0 12px 2px rgba(243,223,162,.55);animation:fbgem .7s cubic-bezier(.3,1.4,.4,1) 3.35s forwards}'
  '.fb-rule b{position:absolute;left:0;top:-1px;width:64px;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,#F3DFA2,transparent);opacity:0;animation:fbrun 1.7s ease-in-out 4.4s infinite}'
  '.fb-tag{font:500 clamp(10px,2.9vw,12px)/1 system-ui,-apple-system,"Segoe UI",sans-serif;letter-spacing:.6em;text-indent:.6em;text-transform:uppercase;color:#9C8A63;opacity:0;animation:fbtag 1.2s ease 3.6s forwards}'
  '@keyframes fbpin{to{opacity:1}}@keyframes fbpout{to{opacity:0}}@keyframes fbimg{from{opacity:0;transform:scale(.985)}to{opacity:1;transform:none}}'
  '@keyframes fbhalo{to{opacity:1;transform:scale(1)}}@keyframes fbbreathe{0%,100%{transform:scale(.96);opacity:.75}50%{transform:scale(1.06);opacity:1}}'
  '@keyframes fbshine{0%{opacity:1;background-position:170% 0}60%{opacity:1}100%{opacity:0;background-position:-70% 0}}'
  '@keyframes fbnm{from{opacity:0;clip-path:inset(-20% 100% -20% 0);filter:blur(6px) drop-shadow(0 2px 10px rgba(201,162,77,.25))}to{opacity:1;clip-path:inset(-20% -5% -20% -5%);filter:blur(0) drop-shadow(0 2px 10px rgba(201,162,77,.25))}}'
  '@keyframes fbspread{from{letter-spacing:.62em;text-indent:.62em}to{letter-spacing:.3em;text-indent:.3em}}@keyframes fbfoil{0%{background-position:0 0}100%{background-position:100% 0}}'
  '@keyframes fbfade{to{opacity:1}}@keyframes fbgrow{to{transform:scaleX(1)}}@keyframes fbgem{to{transform:rotate(45deg) scale(1)}}'
  '@keyframes fbrun{0%{left:0;opacity:0}15%{opacity:1}85%{opacity:1}100%{left:calc(100% - 64px);opacity:0}}'
  '@keyframes fbtag{from{opacity:0;letter-spacing:.9em;text-indent:.9em}to{opacity:1;letter-spacing:.6em;text-indent:.6em}}'
  'html.fta-on #fta-boot,html.fb-done #fta-boot{opacity:0;pointer-events:none}'
  '#fta-gate .fb-mark{margin:0 auto}#fta-gate .fb-img{opacity:1;animation:none}#fta-gate .fb-halo{opacity:1;transform:none;animation:fbbreathe 3s ease-in-out infinite}'
  '@media (prefers-reduced-motion:reduce){#fta-boot *{animation-duration:.01s!important;animation-delay:0s!important}}')
src = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + BOOT + BOOT_JS, src, count=1)
assert BOOT in src, 'body tag not found'
if MODE == 'demo':
    # the sample build has nothing to wait for: show the splash briefly, then fade it away
    _i = src.rfind('</body>'); src = src[:_i] + '<script>(function(){var t0=Date.now();function d(){var w=Math.max(0,4300-(Date.now()-t0));setTimeout(function(){document.documentElement.classList.add("fb-done");setTimeout(function(){var b=document.getElementById("fta-boot");if(b)b.remove()},650)},w)}d()})()</script>' + src[_i:]
tcss = rd('prod-theme.css').replace('$M', M)
head_inject = f'<script>window.FTA_MODE = {MODE!r};</script>\n'
# installable app: name, FTA logo icons, colours (paths are relative, so the demo file still opens from disk)
head_inject += ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#08090B">\n'
  '<link rel="icon" href="icons/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">\n'
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="FTA">\n<meta name="application-name" content="Final Touch Academy">\n'
  '<meta name="description" content="Final Touch Academy · Command Centre">\n<meta name="format-detection" content="telephone=no">\n')
head_inject += '<script>window.__ftaEmb="' + EMB + '";</script><style id="fta-boot-css">' + BOOT_CSS + '</style>\n'
if MODE != 'demo':
    # nothing of the app shows until the sign-in screen is up (no flash of the sample screen while the page loads)
    head_inject += ('<script>window.__ftaT0=Date.now();</script><style id="fta-pre">html:not(.fta-on){background:#08090B}html:not(.fta-on) body>*:not(#fta-gate):not(#fta-boot):not(script):not(style){visibility:hidden!important}</style>\n')
    t0 = '<title>FTA Command Centre Preview</title>'
    assert src.count(t0) >= 1
    src = src.replace(t0, '<title>Final Touch Academy · FTA</title>', 1)
if MODE != 'demo': head_inject += '<script src="config.js"></script>\n<script src="vendor/supabase.js"></script>\n'
VP = 'width=device-width,initial-scale=1,viewport-fit=cover'
src = src.replace('content="' + VP + '"', 'content="' + VP + ',maximum-scale=1,minimum-scale=1,user-scalable=no"').replace('content=' + VP, 'content="' + VP + ',maximum-scale=1,minimum-scale=1,user-scalable=no"')
src = src.replace('<head>', '<head>\n' + head_inject, 1) if '<head>' in src else head_inject + src
end = '\n<style id="prod-theme">\n' + tcss + '\n</style>\n<script>\n' + rd('prod-fix.js') + '\n;\n' + rd('prod-theme.js') + '\n</script>\n'
if MODE != 'demo': end += '<script>\n' + rd('prod-data.js') + '\n</script>\n<style id="prod-push">\n' + rd('prod-push.css') + '\n</style>\n<script>\n' + rd('prod-push.js') + '\n</script>\n' + '<style id="prod-agent">\n' + rd('prod-agent.css') + '\n</style>\n<script>\n' + rd('prod-agent.js') + '\n</script>\n'
# ---------- the approved design (Onyx & Gold), Profiles / My Profile, Profile Tree and Receipt Maker ----------
# same files and order as the owner-approved preview (9 Nov 2026); Class status + Messages are classroom.js (no paid video service); Watch / Recordings are not included
UI = os.path.join(ROOT, 'src', 'ui')
UI_CSS = ['portal.css', 'profile-tree.css', 'ui-luxe.css', 'zz1-visual.css', 'zz2-light.css', 'zz3-connect.css', 'zz4-royal-light.css', 'zz5-clear-ink.css',
          'zz6-restore-slider.css', 'zz7-onyx-gold.css', 'zz8-a-finance.css', 'zz8-b-academics.css', 'zz8-c-connect.css', 'receipt-maker.css', 'classroom.css', 'student-times.css', 'zz9-fit.css', 'zzB-lang.css', 'zzC-fixes.css','zzE-drawer.css']
UI_JS = ['portal.js', 'profile-tree.js', 'ui-luxe.js', 'zz1-visual.js', 'zz2-light.js', 'receipt-maker.js', 'classroom.js', 'student-times.js', 'zz9-english.js', 'zz9-fit.js', 'zzB-lang.js', 'zzD-fixes.js','zzE-drawer.js']
import glob
UI_JS += sorted(os.path.basename(x) for x in glob.glob(os.path.join(UI, 'zzB-bn-*.js')))
ui_rd = lambda f: open(os.path.join(UI, f), encoding='utf8').read()
end += ''.join(f'<style data-ui="{f}">\n{ui_rd(f)}\n</style>\n' for f in UI_CSS)
end += ''.join(f'<script data-ui="{f}">\n{ui_rd(f).replace("</script", "<\\/script")}\n</script>\n' for f in UI_JS)
i = src.rfind('</body>'); src = src[:i] + end + src[i:]
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT); open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(src)
pub = os.path.join(ROOT, 'public')
if os.path.isdir(pub): shutil.copytree(pub, OUT, dirs_exist_ok=True)
# the background worker gets this build's fingerprint, so every deploy refreshes the installed app
sw = os.path.join(OUT, 'sw.js')
if os.path.exists(sw):
    swsrc = open(sw, encoding='utf8').read().replace('__FTA_BUILD__', hashlib.sha256((src + ''.join(open(os.path.join(ROOT, 'public', 'vendor', f), encoding='utf8', errors='ignore').read() for f in sorted(os.listdir(os.path.join(ROOT, 'public', 'vendor'))) if f.endswith('.js'))).encode()).hexdigest()[:12])
    open(sw, 'w', encoding='utf8').write(swsrc)
if MODE == 'mock': open(os.path.join(OUT, 'config.js'), 'w').write("window.FTA_CONFIG = { mock: true, ownerEmail: 'owner@gmail.com' };\n")
print(OUT, len(src))
