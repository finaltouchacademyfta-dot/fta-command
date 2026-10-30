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
tcss = rd('prod-theme.css').replace('$M', M)
head_inject = f'<script>window.FTA_MODE = {MODE!r};</script>\n'
# installable app: name, FTA logo icons, colours (paths are relative, so the demo file still opens from disk)
head_inject += ('<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#08090B">\n'
  '<link rel="icon" href="icons/favicon.ico" sizes="any">\n<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">\n'
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="FTA">\n<meta name="application-name" content="Final Touch Academy">\n'
  '<meta name="description" content="Final Touch Academy · Command Centre">\n<meta name="format-detection" content="telephone=no">\n')
if MODE != 'demo':
    t0 = '<title>FTA Command Centre Preview</title>'
    assert src.count(t0) >= 1
    src = src.replace(t0, '<title>Final Touch Academy · FTA</title>', 1)
if MODE != 'demo': head_inject += '<script src="config.js"></script>\n<script src="vendor/supabase.js"></script>\n'
src = src.replace('<head>', '<head>\n' + head_inject, 1) if '<head>' in src else head_inject + src
end = '\n<style id="prod-theme">\n' + tcss + '\n</style>\n<script>\n' + rd('prod-fix.js') + '\n;\n' + rd('prod-theme.js') + '\n</script>\n'
if MODE != 'demo': end += '<script>\n' + rd('prod-data.js') + '\n</script>\n<style id="prod-push">\n' + rd('prod-push.css') + '\n</style>\n<script>\n' + rd('prod-push.js') + '\n</script>\n'
i = src.rfind('</body>'); src = src[:i] + end + src[i:]
if os.path.isdir(OUT): shutil.rmtree(OUT)
os.makedirs(OUT); open(os.path.join(OUT, 'index.html'), 'w', encoding='utf8').write(src)
pub = os.path.join(ROOT, 'public')
if os.path.isdir(pub): shutil.copytree(pub, OUT, dirs_exist_ok=True)
# the background worker gets this build's fingerprint, so every deploy refreshes the installed app
sw = os.path.join(OUT, 'sw.js')
if os.path.exists(sw):
    swsrc = open(sw, encoding='utf8').read().replace('__FTA_BUILD__', hashlib.sha256(src.encode()).hexdigest()[:12])
    open(sw, 'w', encoding='utf8').write(swsrc)
if MODE == 'mock': open(os.path.join(OUT, 'config.js'), 'w').write("window.FTA_CONFIG = { mock: true, ownerEmail: 'owner@gmail.com' };\n")
print(OUT, len(src))
