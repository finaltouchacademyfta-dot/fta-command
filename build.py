"""FTA Command Centre production build.
   python3 build.py            -> site/ (production: Supabase, empty data)
   MODE=demo python3 build.py  -> site-demo/ (sample data, no backend; used by the regression tests)
   MODE=mock python3 build.py  -> site-mock/ (production code + in-browser mock backend; used by the tests)
"""
import os, sys, re, shutil, importlib.util, hashlib
ROOT = os.path.dirname(os.path.abspath(__file__)); V8 = os.path.join(ROOT, 'layers') + '/' if os.path.isdir(os.path.join(ROOT, 'layers')) else '/home/claude/work/v8/'
MODE = os.environ.get('MODE', 'prod'); OUT = os.path.join(ROOT, {'prod': 'site', 'demo': 'site-demo', 'mock': 'site-mock'}[MODE])
M = 'html:root:is([data-skin="midnight"],[data-skin="emerald"])'
def load(p):
    spec = importlib.util.spec_from_file_location('m' + hashlib.md5(p.encode()).hexdigest()[:6], p); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m.PATCHES
src = open(V8 + 'v8-original.html', encoding='utf8').read()
cssL = ['v9.css', 'money1.css', 'money2.css', 'fix.css', 'v9s.css', 'v9f.css', 'v9g.css', 'v9h.css', 'v9i.css', 'v9j.css', 'v9k.css', 'v9l.css', 'v9m.css']
jsL = ['v9.js', 'money1.js', 'money2.js', 'fix.js', 'v9s.js', 'v9f.js', 'v9g.js', 'v9h.js', 'v9i.js', 'v9j.js', 'v9k.js', 'v9l.js', 'v9m.js']
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
if MODE != 'demo':
    # the first thing painted: a small branded splash, shown until the sign-in screen or the app is ready
    BOOT = '<div id="fta-boot" aria-hidden="true"><img src="icons/apple-touch-icon.png" alt="" width="76" height="76"><span>FINAL TOUCH ACADEMY</span><i></i></div>'
    src = re.sub(r'(<body[^>]*>)', lambda m: m.group(1) + '\n' + BOOT, src, count=1)
    assert BOOT in src, 'body tag not found'
tcss = rd('prod-theme.css').replace('$M', M)
head_inject = f'<script>window.FTA_MODE = {MODE!r};</script>\n'
# installable app: name, FTA logo icons, colours (paths are relative, so the demo file still opens from disk)
head_inject += ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#08090B">\n'
  '<link rel="icon" href="icons/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">\n'
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="FTA">\n<meta name="application-name" content="Final Touch Academy">\n'
  '<meta name="description" content="Final Touch Academy · Command Centre">\n<meta name="format-detection" content="telephone=no">\n')
if MODE != 'demo':
    # nothing of the app shows until the sign-in screen is up (no flash of the sample screen while the page loads)
    head_inject += ('<style id="fta-pre">html:not(.fta-on){background:#08090B}html:not(.fta-on) body>*:not(#fta-gate):not(#fta-boot):not(script):not(style){visibility:hidden!important}'
      '#fta-boot{position:fixed;inset:0;z-index:2147482000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#08090B;color:#C9A24D;font:700 11px/1 system-ui,sans-serif;letter-spacing:.26em}'
      '#fta-boot img{width:76px;height:76px;border-radius:20px;box-shadow:0 10px 40px rgba(201,162,77,.18)}'
      '#fta-boot i{width:120px;height:3px;border-radius:3px;background:rgba(201,162,77,.18);overflow:hidden;position:relative}'
      '#fta-boot i::after{content:"";position:absolute;inset:0;width:40%;background:#C9A24D;border-radius:3px;animation:ftab 1.1s ease-in-out infinite}'
      '@keyframes ftab{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}'
      'html.fta-on #fta-boot{display:none}</style>\n')
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
          'zz6-restore-slider.css', 'zz7-onyx-gold.css', 'zz8-a-finance.css', 'zz8-b-academics.css', 'zz8-c-connect.css', 'receipt-maker.css', 'classroom.css', 'student-times.css', 'zz9-fit.css', 'zzA-brand.css', 'zzB-lang.css', 'zzC-premium.css']
UI_JS = ['portal.js', 'profile-tree.js', 'ui-luxe.js', 'zz1-visual.js', 'zz2-light.js', 'receipt-maker.js', 'classroom.js', 'student-times.js', 'zz9-english.js', 'zz9-fit.js', 'zzA-brand.js', 'zzB-lang.js', 'zzD-motion.js']
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
