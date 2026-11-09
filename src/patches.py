"""Worker A source patches (exact replacements, each matching exactly once, applied in order by build.py).

Why each patch exists is listed in the comment block at the top of src/prod-fix.js.
Everything here keeps the demo build (FTA_MODE === 'demo') behaving exactly as before:
every changed expression gives the same value when the demo clock (17 Oct 2026) is used.
Repeated needles (receipt prefix, id generators) are expanded to a unique context
programmatically, against the same assembled source build.py patches.
"""
import os

V8 = '/home/claude/work/v8/'


def _assembled():
    """Rebuild the exact text build.py patches (v8-original + v9 layers) so contexts can be computed."""
    src = open(V8 + 'v8-original.html', encoding='utf8').read()
    M = 'html:root:is([data-skin="midnight"],[data-skin="emerald"])'
    cssL = ['v9.css', 'money1.css', 'money2.css', 'fix.css', 'v9s.css', 'v9f.css', 'v9g.css', 'v9h.css', 'v9i.css', 'v9j.css', 'v9k.css', 'v9l.css', 'v9m.css']
    jsL = ['v9.js', 'money1.js', 'money2.js', 'fix.js', 'v9s.js', 'v9f.js', 'v9g.js', 'v9h.js', 'v9i.js', 'v9j.js', 'v9k.js', 'v9l.js', 'v9m.js']
    css = '\n'.join(open(V8 + f, encoding='utf8').read() for f in cssL).replace('$M', M)
    js = '\n;\n'.join(open(V8 + f, encoding='utf8').read() for f in jsL)
    tail = "<script>document.addEventListener('visibilitychange'"
    return src.replace(tail, '<style id="v9-css">\n' + css + '\n</style>\n<script>\n' + js + '\n</script>\n' + tail)


W = _assembled()          # working copy, kept in step with the patches below
PATCHES = []


def rep(old, new):
    global W
    n = W.count(old)
    if n != 1:
        raise SystemExit('patches.py: %d matches for %r' % (n, old[:90]))
    PATCHES.append((old, new)); W = W.replace(old, new)


def every(old, new, expect=None):
    """Replace every occurrence of `old`, each through its own unique context."""
    global W
    n = W.count(old)
    if expect is not None and n != expect:
        raise SystemExit('patches.py: expected %d of %r, found %d' % (expect, old[:90], n))
    pos = 0
    for _ in range(n):
        i = W.find(old, pos); a, b = i, i + len(old)
        while W.count(W[a:b]) != 1:
            a = max(0, a - 12); b = min(len(W), b + 12)
        ctx = W[a:b]; nctx = W[a:i] + new + W[i + len(old):b]
        PATCHES.append((ctx, nctx)); W = W[:a] + nctx + W[b:]
        pos = i + len(new)


# ---------------------------------------------------------------- 1. real clock (Asia/Dhaka)
rep("""const TODAY = '2026-10-17', START = '2026-05-01', CUR = '2026-10';
const MONTHS = ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];""",
"""/* FTA core (worker A): real Dhaka clock in production, fixed demo clock in the demo build */
window.FTA = window.FTA || {};
FTA.demo = window.FTA_MODE === 'demo';
FTA.today = () => (typeof window.FTA_TODAY === 'string' && /^\\d{4}-\\d{2}-\\d{2}$/.test(window.FTA_TODAY)) ? window.FTA_TODAY : new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10);
FTA.addM = (m, k) => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7) - 1 + k, 1)).toISOString().slice(0, 7);
FTA.prevM = m => FTA.addM(m, -1);
FTA.nextM = m => FTA.addM(m, 1);
FTA.mEnd = m => new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
FTA.lbl = (demoText, liveText) => FTA.demo ? demoText : liveText;
FTA.mName = m => MF[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
FTA.draftM = () => { const d = INVOICES.filter(i => i.status === 'Draft').map(i => i.month).sort(); return d[0] || FTA.nextM(CUR); };
FTA.syncText = () => { if (FTA.demo) return 'শেষ sync: ' + fdate(TODAY) + ', 10:42'; const t = FTA.lastSync; if (!t) return ''; const d = new Date(+t + 6 * 3600e3).toISOString(); return 'শেষ sync: ' + fdate(d.slice(0, 10)) + ', ' + d.slice(11, 16); };
FTA.ACT = FTA.ACT || {};
FTA.act = (k, a, b) => { const f = FTA.ACT[k]; if (f) return f(a, b); };
/* next free number for ids built as PREFIX + (base + n): never reuses a number that exists (or sits in the recycle bin) */
FTA.n = (list, pre, base) => {
  base = base == null ? 1 : base; let mx = list ? list.length : 0;
  const scan = x => { const id = x && (x.id != null ? x.id : x.tid); if (typeof id === 'string' && id.startsWith(pre)) { const k = id.slice(pre.length); if (/^\\d+$/.test(k)) mx = Math.max(mx, +k - base + 1); } };
  (list || []).forEach(scan);
  try { (SCH.BIN || []).forEach(b => { if (!b) return; scan(b.item); [].concat(b.items || []).forEach(scan); }); } catch (e) { }
  return mx;
};
const TODAY = FTA.demo ? '2026-10-17' : FTA.today(), CUR = TODAY.slice(0, 7);
let START = FTA.demo ? '2026-05-01' : CUR + '-01';
const MONTHS = FTA.demo ? ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'] : [CUR];
/* stand-in while no exam exists yet (never stored: SCH.mk does not save marks for it) */
FTA.noEx = { id: '__none', name: 'No exam yet', term: '', from: TODAY, to: TODAY, due: TODAY, max: 100, status: 'Scheduled' };""")

# ---------------------------------------------------------------- 2. date logic that assumed Oct 2026
rep("""  if (p === 'lm') return { from: '2026-09-01', to: '2026-09-30', months: ['2026-09'], label: mlab('2026-09'), prev: 'lm2' };
  if (p === 'lm2') return { from: '2026-08-01', to: '2026-08-31', months: ['2026-08'], label: mlab('2026-08') };
  if (p === 'ty') return { from: '2026-01-01', to: TODAY, months: MONTHS.slice(), label: 'Year ' + dg(2026) + ' (এ পর্যন্ত)' };
  if (p === 'custom') { const f = ST.cf || '2026-08-01',""",
"""  if (p === 'lm') { const a = FTA.prevM(CUR); return { from: a + '-01', to: FTA.mEnd(a), months: [a], label: mlab(a), prev: 'lm2' }; }
  if (p === 'lm2') { const a = FTA.addM(CUR, -2); return { from: a + '-01', to: FTA.mEnd(a), months: [a], label: mlab(a) }; }
  if (p === 'ty') return { from: CUR.slice(0, 4) + '-01-01', to: TODAY, months: MONTHS.filter(m => m.slice(0, 4) === CUR.slice(0, 4)), label: 'Year ' + dg(+CUR.slice(0, 4)) + ' (এ পর্যন্ত)' };
  if (p === 'custom') { const f = ST.cf || FTA.addM(CUR, -2) + '-01',""")
rep("const ST = { page: 'dashboard', per: 'tm', cf: '2026-08-01', ct: TODAY,",
    "const ST = { page: 'dashboard', per: 'tm', cf: FTA.addM(CUR, -2) + '-01', ct: TODAY,")
rep("""approvals.push(['Invoice draft review', 'November 2026 · ' + dg(nDraft) + ' টি', `ST.invTab='inv';ST.invM='2026-11';ST.invS='All';go('invoices')`]);""",
    """approvals.push(['Invoice draft review', FTA.mName(FTA.draftM()) + ' · ' + dg(nDraft) + ' টি', `ST.invTab='inv';ST.invM='${FTA.draftM()}';ST.invS='All';go('invoices')`]);""")
rep("concat([...MONTHS, '2026-11'].reverse()", "concat([...MONTHS, FTA.nextM(CUR)].reverse()")
rep("""if (CLOSE['2026-09'].status === 'Closing') N.push({ k: 'info', i: 'lock', t: 'September closing বাকি', d: dg(CLOSE['2026-09'].checks.filter(x => !x).length) + ' টি কাজ বাকি', go: `closeView('2026-09')` });""",
    """{ const pm = FTA.prevM(CUR), pc = CLOSE[pm]; if (pc && pc.status === 'Closing') N.push({ k: 'info', i: 'lock', t: MF[+pm.slice(5) - 1] + ' closing বাকি', d: dg((pc.checks || []).filter(x => !x).length) + ' টি কাজ বাকি', go: `closeView('${pm}')` }); }""")
rep("""s.joined.slice(0, 7) === '2026-09').length), 'নতুন ভর্তি (Sep–Oct)'""",
    """s.joined.slice(0, 7) === FTA.prevM(CUR)).length), 'নতুন ভর্তি (' + mshort(FTA.prevM(CUR)) + '–' + mshort(CUR) + ')'""")
rep("মাস · ${dg(2026)} (একসাথে", "মাস · ${dg(+CUR.slice(0, 4))} (একসাথে")
rep("MONTHS.concat(['2026-11', '2026-12'])", "MONTHS.concat([FTA.nextM(CUR), FTA.addM(CUR, 2)])")
rep("<h2>Recurring খরচের draft · November</h2>", "<h2>Recurring খরচের draft · ${MF[+FTA.nextM(CUR).slice(5) - 1]}</h2>")
rep("<small>${esc(p)} · November ${dg(2026)}</small>", "<small>${esc(p)} · ${MF[+FTA.nextM(CUR).slice(5) - 1]} ${dg(+FTA.nextM(CUR).slice(0, 4))}</small>")
rep("if (men.model === 'fixed' && m <= '2026-08') lines.push(",
    "if (men.model === 'fixed' && (FTA.demo ? m <= '2026-08' : men.status !== 'Inactive' && men.rate > 0)) lines.push(")
rep("ytd: 'Year-to-Date Summary · 2026'", "ytd: 'Year-to-Date Summary · ' + CUR.slice(0, 4)")
every("'RCP-2026-' +", "'RCP-' + TODAY.slice(0, 4) + '-' +", expect=4)

# ---------------------------------------------------------------- 3. ids never reuse a number (deletes, recycle bin, several devices)
for lst, pre, pad in [('TRANSFERS', 'TRF-', 4), ('PRPAY', 'PRP-', 4), ('REFUNDS', 'RFD-', 4), ('MENTORS', 'MEN-', 2), ('SCH.LOGINS', 'FTA-T', 2),
                      ('PAYMENTS', 'PAY-', 4), ('PROGS', 'PRG-', 2), ('BATCHES', 'BAT-', 2), ('V8.OX', 'OX-', 2), ('V8.QB', 'Q-', 4), ('OTHERS', 'OTH-', 4)]:
    every("'%s' + String(%s.length + 1).padStart(%d, '0')" % (pre, lst, pad),
          "'%s' + String(FTA.n(%s, '%s') + 1).padStart(%d, '0')" % (pre, lst, pre, pad))
for lst, pre in [('NOTES', 'N'), ('SCH.GROUPS', 'G'), ('USERS', 'U'), ('SCH.CLASSES', 'C'), ('SCH.EXAMS', 'EX'), ('SCH.RT', 'RT'), ('V8.SREQ', 'SR-')]:
    every("'%s' + (%s.length + 1)" % (pre, lst), "'%s' + (FTA.n(%s, '%s') + 1)" % (pre, lst, pre))
every("'STU-' + String(1001 + STUDENTS.length)", "'STU-' + String(1001 + FTA.n(STUDENTS, 'STU-', 1001))")
every("'ENR-' + String(2001 + ENROL.length)", "'ENR-' + String(2001 + FTA.n(ENROL, 'ENR-', 2001))")
every("let n = 2001 + ENROL.length;", "let n = 2001 + FTA.n(ENROL, 'ENR-', 2001);")
every("'HW-' + (100 + SCH.HW.length)", "'HW-' + (100 + FTA.n(SCH.HW, 'HW-', 100))")
every("'HW-' + (200 + SCH.HW.length)", "'HW-' + (200 + FTA.n(SCH.HW, 'HW-', 200))")

# ---------------------------------------------------------------- 4. demo-only leftovers (same text in the demo build)
rep('<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>',
    '<script src="vendor/html2canvas.min.js"></script>')
rep("'. Demo code: ' + SCH.lgOtp", "(FTA.demo ? '. Demo code: ' + SCH.lgOtp : '.')")
rep("'. Demo code: ' + SCH.lgG[who].code", "(FTA.demo ? '. Demo code: ' + SCH.lgG[who].code : '.')")
rep("""<span class="demo">${ic('info')}Demo · sample data</span><div style="margin-top:8px">শেষ sync: ${fdate(TODAY)}, 10:42</div>""",
    """<span class="demo">${ic('info')}${FTA.lbl('Demo · sample data', 'Live · cloud sync')}</span><div style="margin-top:8px">${FTA.syncText()}</div>""")
rep("${live ? 'Live · Google Sheet এর সাথে যুক্ত' : 'Demo · sample data'}", "${live ? 'Live · Google Sheet এর সাথে যুক্ত' : FTA.lbl('Demo · sample data', 'Live · cloud sync')}")
rep("${live ? 'Google Sheet · Live' : 'Demo data'}", "${live ? 'Google Sheet · Live' : FTA.lbl('Demo data', 'Live · cloud sync')}")
rep("""<span class="demo">${ic('info')}Demo: আজ ${fdate(TODAY)} ধরে sample data</span>""",
    """${FTA.demo ? `<span class="demo">${ic('info')}Demo: আজ ${fdate(TODAY)} ধরে sample data</span>` : `<span class="demo">${ic('clock')}${fdate(TODAY)}</span>`}""")
rep("""onclick="toast('Demo: আসল app এ Excel file download হবে')\"""", """onclick="FTA.act('xls','${k}',${J(arg || '')})\"""")
rep("""onclick="toast('Demo: আসল app এ FTA branding সহ PDF হবে')\"""", """onclick="FTA.act('pdf','${k}',${J(arg || '')})\"""")
rep("""onclick="toast('Demo: user যোগের form আসল app এ থাকবে')\"""", """onclick="FTA.act('userAdd')\"""")
rep(""""toast('Demo: আসল app এ sign out হবে')"]""", """"FTA.act('signOut')"]""")
rep("""${note('আসল app এ এই বদল Settings sheet এ জমা হবে, তাই সব user এর জন্য একই থাকবে। Demo তে শুধু এই browser এ।', 'info')}""",
    """${FTA.demo ? note('আসল app এ এই বদল Settings sheet এ জমা হবে, তাই সব user এর জন্য একই থাকবে। Demo তে শুধু এই browser এ।', 'info') : ''}""")

# ---------------------------------------------------------------- 5. seed blocks that only make sense on the demo clock
rep("(function extras() {\n  const sam = STUDENTS.find(s => s.name === 'Samiha Karim')", "FTA.demo && (function extras() {\n  const sam = STUDENTS.find(s => s.name === 'Samiha Karim')")

# ---------------------------------------------------------------- 6. empty start: code that assumed the sample records exist
rep("loans: [ins(money(Math.max(0, OTHERS[0].orig - OTHERS[0].done))", "loans: [ins(money(Math.max(0, OTHERS[0] ? OTHERS[0].orig - OTHERS[0].done : 0))")
rep("if (acct === 'FUND-QIT') OTHERS[0].orig += a;", "if (acct === 'FUND-QIT' && OTHERS[0]) OTHERS[0].orig += a;")
every("SCH.EXAMS[1]", "(SCH.EXAMS[1] || SCH.EXAMS[0] || FTA.noEx)", expect=3)
every("MENTORS[0].id", "(MENTORS[0] || {}).id", expect=4)
rep("else if (k === 'ledger') { const s = stuOf(arg || STUDENTS[0].id);", "else if (k === 'ledger') { const s = stuOf(arg || (STUDENTS[0] || {}).id) || { id: '', name: '—' };")
rep("duesRows()[0].s.id : STUDENTS[0].id)", "duesRows()[0].s.id : (STUDENTS[0] || {}).id)")
rep("'November draft', 'Review এর অপেক্ষায়'", "MF[+FTA.draftM().slice(5, 7) - 1] + ' draft', 'Review এর অপেক্ষায়'")
rep('<input id="nf-s" type="date" value="2026-11-01">', '<input id="nf-s" type="date" value="${FTA.nextM(CUR)}-01">')
rep("সবচেয়ে বেশি বাকি <b>${esc(top.name)}</b>", "সবচেয়ে বেশি বাকি <b>${esc((top || {}).name || '—')}</b>")
rep("const mine = G.map(g => SCH.mk(ex.id, g.id)), entered = sum(G, g => Object.values(SCH.mk(ex.id, g.id).m).filter(v => v != null).length), total",
    "const mine = ex ? G.map(g => SCH.mk(ex.id, g.id)) : [], entered = ex ? sum(G, g => Object.values(SCH.mk(ex.id, g.id).m).filter(v => v != null).length) : 0, total")
rep("ins(dg(SCH.GROUPS.filter(g => ['Submitted'].includes(SCH.mk(ex.id, g.id).status)).length), 'Marks waiting for review', ex.name + ' · due ' + SCH.fmtD(ex.due))",
    "(ex ? ins(dg(SCH.GROUPS.filter(g => ['Submitted'].includes(SCH.mk(ex.id, g.id).status)).length), 'Marks waiting for review', ex.name + ' · due ' + SCH.fmtD(ex.due)) : ins(dg(0), 'Marks waiting for review', 'No exam yet'))")
rep("const top = STUDENTS.slice().sort((a, b) => studentDue(b.id) - studentDue(a.id))[0]", "const top = STUDENTS.slice().sort((a, b) => studentDue(b.id) - studentDue(a.id))[0] || { id: '', name: '—' }")
rep("const ex = SCH.EXAMS.find(e => e.id === SCH.TS.ex) || EX[0], g = SCH.grp(SCH.TS.gid)", "const ex = SCH.EXAMS.find(e => e.id === SCH.TS.ex) || EX[0] || FTA.noEx, g = SCH.grp(SCH.TS.gid)")
rep("t1 = SCH.mk('EX1', g.id), avg = Math.round(sum(g.stu, id => t1.m[id] || 0) / g.stu.length / SCH.EXAMS[0].max * 100);",
    "t1 = SCH.mk((SCH.EXAMS[0] || FTA.noEx).id, g.id), avg = Math.round(sum(g.stu, id => t1.m[id] || 0) / g.stu.length / (SCH.EXAMS[0] || FTA.noEx).max * 100);")
rep("X = i => pl + (W - pl - pr2) * i / (ms.length - 1)", "X = i => pl + (W - pl - pr2) * (ms.length < 2 ? .5 : i / (ms.length - 1))")
rep("const pts = s.v.map((v, i) => v == null ? null : [X(i), Y(v), v])", "const pts = s.v.map((v, i) => v == null || isNaN(v) ? null : [X(i), Y(v), v])")
# new student with no subject yet (an empty academy has no programmes): save the student, skip the enrolment, never crash
rep("  ENROL.push({ id: 'ENR-' + String(2001 + FTA.n(ENROL, 'ENR-', 2001)), stu: id, prog, mentor: $('#nf-m').value, type: PROGS.find(p => p.id === prog).type,",
    "  if (PROGS.find(p => p.id === prog)) ENROL.push({ id: 'ENR-' + String(2001 + FTA.n(ENROL, 'ENR-', 2001)), stu: id, prog, mentor: $('#nf-m').value, type: PROGS.find(p => p.id === prog).type,")
# empty academy: average subjects per active student is 0, not NaN
rep("'Active student প্রতি গড়ে ' + dg((enr.length / act.length).toFixed(1))", "'Active student প্রতি গড়ে ' + dg((act.length ? enr.length / act.length : 0).toFixed(1))")
# live app: teachers sign in with Google (not a one-time code)
rep("The teacher signs in with this Gmail and a one-time code. No separate mentor code is needed.", "The teacher signs in with Google using this Gmail and sees the students you link to them. No separate mentor code is needed.")
# staff form note: one text block (it was split into narrow flex columns) and the live sign-in wording
rep("<p class=\"v9g-n\">${ic('info')}They sign in on the Office tab with this Gmail and open the portal of the role you choose. Teachers are added from <b>Teacher Dashboards → Add teacher</b> with their Gmail; students get a Gmail at entry.</p>",
    "<p class=\"v9g-n\">${ic('info')}<span>They sign in with Google using this Gmail and see only what their role allows. Teachers are added from <b>Mentors → New mentor</b> with their Gmail; students get a Gmail when they are added.</span></p>")
# demo / sample data only: the advertising sample had no amount for months after October 2026 (NaN in the charts)
rep("desc: 'Page boost', amt: ADV[m],", "desc: 'Page boost', amt: ADV[m] || 8000,")
# 9 Nov 2026: Bangla words were left on the English payroll card ("তৈরি: … · রিভিউ: … · অনুমোদন: …"); English in English, Bangla in Bangla
rep("<p>তৈরি: ${esc(r.preparedBy)}${r.reviewedBy ? ' · রিভিউ: ' + esc(r.reviewedBy) : ''}${r.approvedBy ? ' · অনুমোদন: ' + esc(r.approvedBy) : ''}</p>",
    "<p>${LANG === 'bn' ? 'তৈরি' : 'Prepared by'}: ${esc(r.preparedBy)}${r.reviewedBy ? ' · ' + (LANG === 'bn' ? 'রিভিউ' : 'Reviewed by') + ': ' + esc(r.reviewedBy) : ''}${r.approvedBy ? ' · ' + (LANG === 'bn' ? 'অনুমোদন' : 'Approved by') + ': ' + esc(r.approvedBy) : ''}</p>")
# the report header showed a fixed sample time (10:42) and a Bangla word in English: now the real time it was made
rep("<span class=\"sub\">${R.period} · তৈরি: ${fdate(TODAY)} 10:42 · ${esc(ME().name)}</span>",
    "<span class=\"sub\">${R.period} · ${LANG === 'bn' ? 'তৈরি' : 'Made'}: ${fdate(TODAY)} ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · ${esc(ME().name)}</span>")
