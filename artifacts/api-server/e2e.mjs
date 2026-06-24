import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
const BASE = 'http://127.0.0.1:5096';
const SECRET = process.env.JWT_SECRET || '9gX/chZeKeQRMa8sOV+W/XyAas5xsD+xedNgesYbjZU=';
const sign = (p) => jwt.sign(p, SECRET, { expiresIn: '1h' });
const tokFor = (p, role = 'applicant') => sign({ id: p._id.toString(), email: p.email || 'x@test', role });
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { (c ? pass++ : fail++); console.log(`${c ? '✓' : '✗ FAIL'}  ${n}${x ? ' — ' + x : ''}`); };
async function api(method, path, token, body) {
  const res = await fetch(BASE + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

const run = async () => {
  const c = new MongoClient('mongodb://127.0.0.1:27017');
  await c.connect();
  const db = c.db('intikhab_dev');
  const profiles = db.collection('profiles');
  const completed = await profiles.find({ profileCompletion: { $gte: 100 } }).toArray();
  const males = completed.filter(p => p.gender === 'male');
  const females = completed.filter(p => p.gender === 'female');
  const staff = await profiles.findOne({ role: { $in: ['staff', 'admin'] } });
  const staffToken = sign({ id: (staff?._id || new ObjectId()).toString(), email: staff?.email || 's@test', role: staff?.role || 'staff' });

  // find a passing self-male + (forced) staff-female pair
  let M, F, pid;
  for (const m of males) {
    for (const f of females) {
      const r = await api('POST', '/api/proposals', tokFor(m), { type: 'USER_PROPOSAL', initiatorId: m._id.toString(), recipientId: f._id.toString(), message: 'probe' });
      if (r.status === 201) { M = m; F = f; pid = r.data.proposalId; break; }
    }
    if (pid) break;
  }
  ok('passing pair found', !!pid);
  if (!pid) { await c.close(); return done(); }
  await db.collection('proposals').deleteMany({ _id: new ObjectId(pid) });

  const origM = M.registeredBy, origF = F.registeredBy;
  await profiles.updateOne({ _id: M._id }, { $set: { registeredBy: 'self' } });
  await profiles.updateOne({ _id: F._id }, { $set: { registeredBy: 'staff' } });   // F = staff-managed (Samaha)
  const created = [];
  try {
    // ── ISSUE 1: self↔staff match shows in staff-view ──
    await db.collection('matches').deleteMany({ userId: M._id });
    await api('POST', `/api/matches/generate/${M._id.toString()}`, tokFor(M), { genderHint: M.gender });
    const sv = await api('GET', '/api/staff/matches/staff-view', staffToken);
    const found = (sv.data.matches || []).some(mm =>
      [mm.userId?.toString?.() || mm.userId, mm.candidateId?.toString?.() || mm.candidateId].includes(F._id.toString()) &&
      [mm.userId?.toString?.() || mm.userId, mm.candidateId?.toString?.() || mm.candidateId].includes(M._id.toString()));
    ok('ISSUE1: self↔staff match appears in staff-view', found, `${(sv.data.matches||[]).length} staff matches`);

    // ── ISSUE 2: staff can read + relay messages ──
    let r = await api('POST', '/api/proposals', tokFor(M), { type: 'USER_PROPOSAL', initiatorId: M._id.toString(), recipientId: F._id.toString(), message: 'C' });
    created.push(r.data.proposalId);
    await api('PATCH', `/api/staff/proposals/${r.data.proposalId}/review`, staffToken, { action: 'approve', reason: 'ok' });
    // self sends
    const um = await api('POST', `/api/proposals/${r.data.proposalId}/messages`, tokFor(M), { text: 'Assalamu Alaikum, tell me about yourself.' });
    ok('ISSUE2: applicant message sent', um.status === 201);
    // staff relays on behalf of staff-managed F
    const sm = await api('POST', `/api/proposals/${r.data.proposalId}/messages`, staffToken, { text: 'Wa Alaikum Assalam — replying on behalf of the family.' });
    ok('ISSUE2: staff relay message sent (201)', sm.status === 201, `senderRole=${sm.data?.message?.senderRole}`);
    const list = await api('GET', `/api/proposals/${r.data.proposalId}/messages`, staffToken);
    ok('ISSUE2: thread has both messages', list.data.total === 2, `total=${list.data.total}`);
    const hasStaffMsg = (list.data.messages || []).some(m => m.senderRole === 'staff');
    ok('ISSUE2: a message is senderRole=staff (relay)', hasStaffMsg);
  } finally {
    await db.collection('proposals').deleteMany({ _id: { $in: created.filter(Boolean).map(x => new ObjectId(x)) } });
    await db.collection('matches').deleteMany({ userId: M._id });
    await profiles.updateOne({ _id: M._id }, origM === undefined ? { $unset: { registeredBy: '' } } : { $set: { registeredBy: origM } });
    await profiles.updateOne({ _id: F._id }, origF === undefined ? { $unset: { registeredBy: '' } } : { $set: { registeredBy: origF } });
  }
  await c.close();
  done();
};
const done = () => { console.log(`\nRESULT: ${pass} pass / ${fail} fail`); process.exit(fail ? 1 : 0); };
run().catch(e => { console.error('crashed:', e); process.exit(1); });
