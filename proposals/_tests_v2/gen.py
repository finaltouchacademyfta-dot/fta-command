# zz2.src.css -> ../zz2-light.css ; @A = every midnight theme (clipping fixes only), @L = Premium Light
import re,os
D=os.path.dirname(os.path.abspath(__file__))
A='html[data-skin="midnight"][data-skin][data-skin]:root:root:root body:not(#z1):not(#z2):not(#z3)'
L='html[data-skin="midnight"][data-theme="light"][data-skin]:root:root:root body:not(#z1):not(#z2):not(#z3)'
LR='html[data-skin="midnight"][data-theme="light"][data-skin][data-theme]:root:root'
s=open(D+'/zz2.src.css').read()
LH='html[data-skin="midnight"][data-theme="light"][data-skin]:root:root:root:is([data-lx-page="dashboard"],[data-lx-page="tp-home"],[data-lx-page="sp-home"]) body:not(#z1):not(#z2):not(#z3)'
s=s.replace('@LHOME',LH).replace('@LROOT',LR).replace('@A',A).replace('@L',L)
open(D+'/../zz2-light.css','w').write(s)
print(len(s))
