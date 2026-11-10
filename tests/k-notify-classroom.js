/* Worker K · who gets a phone / laptop notification for Messages, Class status and slot requests
   (the same server code: public/vendor/fta-notify.js + fta-policy.js).   node tests/k-notify-classroom.js */
const N = require('../public/vendor/fta-notify.js'), P = require('../public/vendor/fta-policy.js');
let pass = 0, fail = 0; const ok = (c, m) => { if (c) { pass++; console.log('  ✓ ' + m); } else { fail++; console.log('  ✗ ' + m); } };
const D = { students: [{ id: 'STU-1', name: 'Ayaan' }, { id: 'STU-2', name: 'Rafi' }], mentors: [{ id: 'MEN-1', name: 'Nusrat' }, { id: 'MEN-2', name: 'Tanvir' }], groups: [{ id: 'G1', name: 'IGCSE English', mentor: 'MEN-1', stu: ['STU-1'] }, { id: 'G2', name: 'Maths', mentor: 'MEN-2', stu: ['STU-2'] }], circles: [], exams: [], ox: [], enrol: [] };
const X = N.helper(D);
const M = [{ email: 'o@x', role: 'Owner', active: true }, { email: 'a@x', role: 'Admin', active: true }, { email: 'ja@x', role: 'Junior Admin', active: true }, { email: 'fm@x', role: 'Finance Manager', active: true },
  { email: 't1@x', role: 'Mentor', mentor_id: 'MEN-1', active: true }, { email: 't2@x', role: 'Mentor', mentor_id: 'MEN-2', active: true }, { email: 's1@x', role: 'Student', student_id: 'STU-1', active: true }, { email: 's2@x', role: 'Student', student_id: 'STU-2', active: true }];
const ctx = { get: (c, id) => (D[c] || []).find(x => x.id === id) || null, all: c => D[c] || [] };
function who(c, id, prev, next, actor) {
  const tg = P.tags(c, id, next, ctx), row = { collection: c, id, data: next, deleted: false, mentor_ids: tg.mentor_ids, student_ids: tg.student_ids };
  const evs = N.events(c, id, prev, next, actor, tg, X);
  return { evs, to: [...new Set(evs.flatMap(ev => N.resolve(M, ev, row, actor.email).map(m => m.email)))].sort().join(','), url: evs[0] && N.urlFor(evs[0], 'Student') };
}
const T1 = { email: 't1@x', role: 'Mentor', mentor_id: 'MEN-1' }, S1 = { email: 's1@x', role: 'Student', student_id: 'STU-1' }, O = { email: 'o@x', role: 'Owner' };
let r = who('msg', 'm1', null, { id: 'm1', room: 'g:G1', gid: 'G1', by: 'MEN-1', text: 'Homework p12' }, T1);
ok(r.to === 's1@x', 'class-group message → the students of that class only (' + r.to + ')');
ok(/Nusrat · IGCSE English/.test(r.evs[0].title) && r.evs[0].cat === 'messages', 'title names the sender and class');
r = who('msg', 'm2', null, { id: 'm2', room: 'dm:MEN-1|STU-1', by: 'STU-1', text: 'Miss?' }, S1);
ok(r.to === 't1@x', 'student → mentor: only that mentor (' + r.to + ')');
r = who('msg', 'm3', null, { id: 'm3', room: 'dm:MEN-1|U:office', by: 'MEN-1', text: 'Marks ready' }, T1);
ok(r.to === 'a@x,o@x', 'mentor → office: Owner and Admin (' + r.to + ')');
r = who('msg', 'm4', null, { id: 'm4', room: 'dm:STU-1|U:office', by: 'U:office', text: 'Fees' }, O);
ok(r.to === 's1@x', 'office → student: that student');
r = who('clslive', 'G1|x', null, { id: 'G1|x', gid: 'G1', mentor: 'MEN-1', status: 'On', link: 'https://meet.google.com/x' }, T1);
ok(r.to === 's1@x' && r.evs[0].urgency === 'high' && /sp-live/.test(r.url), 'class started → its students, opening Class status (' + r.to + ')');
r = who('clslive', 'G1|x', { status: 'On', gid: 'G1' }, { id: 'G1|x', gid: 'G1', mentor: 'MEN-1', status: 'Off' }, T1);
ok(r.to === '', 'class ended → nobody is disturbed');
r = who('slotreq', 'SR1', null, { id: 'SR1', mentor: 'MEN-1', stu: '', when: 'Sun 5 pm', status: 'Pending' }, T1);
ok(r.to === 'a@x,ja@x,o@x', 'slot request → Owner, Admin, Junior Admin (' + r.to + ')');
r = who('slotreq', 'SR1', { status: 'Pending', mentor: 'MEN-1' }, { id: 'SR1', mentor: 'MEN-1', when: 'Sun 5 pm', status: 'Approved' }, O);
ok(r.to === 't1@x' && /approved/.test(r.evs[0].title), 'answer → the mentor (' + r.to + ')');
/* routine reminders (scheduled every 5 minutes on the server) */
(async () => {
  const day = new Date(Date.now() + 6 * 3600e3).toISOString().slice(0, 10), dw = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(day + 'T12:00:00Z').getUTCDay()];
  const at = Date.parse(day + 'T10:00:00+06:00');
  const mk = (live, now) => { const sent = new Set(), q = []; return { q, store: {
    enqueue: async rows => q.push(...rows), sentOnce: async k => sent.has(k) ? false : (sent.add(k), true), listMembers: async () => M,
    allRecords: async c => c === 'rt' ? [{ collection: 'rt', id: 'RT1', data: { id: 'RT1', day: dw, start: '10:00', end: '10:45', gid: 'G1', mentor: 'MEN-1' }, mentor_ids: ['MEN-1'], student_ids: ['STU-1'] }] : c === 'groups' ? [{ id: 'G1', data: D.groups[0] }] : c === 'clslive' ? live.map(d => ({ id: d.id, data: d })) : [] } }; };
  let t = mk([]); await N.remind(t.store, at - 5 * 60e3);
  ok(t.q.length === 1 && t.q[0].email === 't1@x' && /Class at 10:00 am/.test(t.q[0].payload.t), '10 minutes before: the mentor is reminded to press Start');
  t = mk([]); await N.remind(t.store, at + 12 * 60e3);
  ok(t.q.map(x => x.email).sort().join(',') === 'a@x,ja@x,o@x,t1@x' && /not started/.test(t.q[0].payload.t), 'not started 10 minutes after: mentor and office are told');
  t = mk([{ id: 'G1|a', gid: 'G1', status: 'On', start: new Date(at + 2 * 60e3).toISOString() }]); await N.remind(t.store, at + 12 * 60e3);
  ok(t.q.length === 0, 'class already started: nobody is disturbed');
  console.log(`\n${pass}/${pass + fail} passed`); process.exit(fail ? 1 : 0);
})();
