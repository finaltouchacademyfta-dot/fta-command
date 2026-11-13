import re,sys,subprocess,os
D=os.path.dirname(os.path.abspath(__file__))
P={'$M':'html[data-skin="midnight"][data-skin]:root:root body',
   '$D':'html[data-skin="midnight"]:not([data-theme="light"])[data-skin]:root body',
   '$L':'html[data-skin="midnight"][data-theme="light"][data-skin]:root body',
   '$HM':'html[data-skin="midnight"][data-skin]:root:root',
   '$HD':'html[data-skin="midnight"]:not([data-theme="light"])[data-skin]:root',
   '$HL':'html[data-skin="midnight"][data-theme="light"][data-skin]:root'}
def split(sel):
    out=[];d=0;cur=''
    for ch in sel:
        if ch in '([':d+=1
        if ch in ')]':d-=1
        if ch==',' and d==0: out.append(cur);cur=''
        else: cur+=ch
    out.append(cur);return out
src=open(D+'/src/luxe.src.css').read()
def rep(m):
    whole=m.group(1); head=''
    if '*/' in whole: head,whole=whole.rsplit('*/',1); head+='*/'
    sel=whole
    st=sel.lstrip()
    mm=re.match(r'(\$H?[MDL])\b',st)
    if not mm: return head+sel+'{'
    key=mm.group(1); pre=P[key]
    parts=split(st)
    res=[]
    for p in parts:
        p=p.strip()
        if p.startswith('$'):
            k=re.match(r'(\$H?[MDL])\b',p).group(1); res.append(P[k]+p[len(k):])
        else: res.append(pre+' '+p)
    return head+sel[:len(sel)-len(st)]+','.join(res)+'{'
out=re.sub(r'([^{}]*?)\{',rep,src)
# strip /* */ comments longer lines? keep
assert '$M' not in out and '$D' not in out and '$L ' not in out, [l for l in out.split('\n') if '$' in l][:5]
open('/home/claude/prod/proposals/ui-luxe.css','w').write(out)
print('css bytes',len(out))
if '-b' in sys.argv:
    cmd='cd '+D+' && rm -rf site && cp -r /home/claude/prod/site-mock site && python3 inject.py >/dev/null && PROPOSALS=1 python3 single.py >/dev/null && mkdir -p two && cp FTA-Proposals-Demo.html two/'
    subprocess.check_call(cmd,shell=True); print('built')
