import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './server.mjs';

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'wenyan-api-'));
  const app = createApp({ databasePath: path.join(dir, 'test.sqlite'), bootstrapInvite: 'test-invite', adminInvite: 'admin-secret', adminUsername: 'teacher' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => app.server.close(resolve)); app.close(); await rm(dir, { recursive: true }); });
  return async (route, body, token, method = body ? 'POST' : 'GET') => {
    const result = await fetch(`http://127.0.0.1:${app.server.address().port}${route}`, {
      method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: result.status, ...(await result.json()) };
  };
}

test('invitation registration, independent accounts, recovery invalidates old sessions and recovery code', async t => {
  const api = await fixture(t);
  assert.equal((await api('/api/auth/register', { username: 'student', password: 'password-123', inviteCode: 'wrong' })).status, 403);
  const a = await api('/api/auth/register', { username: 'student', password: 'password-123', inviteCode: 'test-invite' });
  assert.equal(a.status, 201);
  assert.ok(a.recoveryCode);
  assert.equal((await api('/api/auth/login', { username: 'student', password: 'wrong' })).status, 401);
  assert.equal((await api('/api/me', null, a.token)).user.username, 'student');
  const recovered = await api('/api/auth/recover', { username: 'student', recoveryCode: a.recoveryCode, newPassword: 'new-password-123' });
  assert.equal(recovered.status, 200);
  assert.notEqual(recovered.recoveryCode, a.recoveryCode);
  assert.equal((await api('/api/me', null, a.token)).status, 401);
  assert.equal((await api('/api/auth/recover', { username: 'student', recoveryCode: a.recoveryCode, newPassword: 'new-password-456' })).status, 401);
  assert.equal((await api('/api/auth/login', { username: 'student', password: 'new-password-123' })).status, 200);
});

test('sync is account isolated and idempotent, and reserves Hong Kong first submission before typing assessment', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'student-a', password: 'password-123', inviteCode: 'test-invite' });
  const b = await api('/api/auth/register', { username: 'student-b', password: 'password-123', inviteCode: 'test-invite' });
  const attempt = { id: 'session-1/q1', type: 'attempt', createdAt: '2026-09-19T15:58:00Z', payload: { memoryId: 'm1', questionId: 'q1', questionVersion: 1, question: { id: 'q1', answer: 'B' }, submittedAt: '2026-09-19T15:58:00Z', day: '2026-09-19', mode: 'typing', answer: '草稿', correct: null, sessionId: 'session-1', userId: b.user.id } };
  const repeated = { ...attempt, id: 'session-2/q1', payload: { ...attempt.payload, mode: 'choice', correct: true } };
  let result = await api('/api/sync', { events: [attempt, repeated] }, a.token);
  assert.equal(result.status, 200); assert.equal(result.events.length, 2);
  assert.equal(result.firstObservations.length, 1);
  assert.equal(result.firstObservations[0].attemptId, attempt.id);
  assert.equal(result.firstObservations[0].correct, null);
  result = await api('/api/sync', { events: [attempt] }, a.token);
  assert.equal(result.events.length, 2);
  assert.equal((await api('/api/sync', { events: [{ ...attempt, payload: { ...attempt.payload, answer: 'tampered' } }] }, a.token)).status, 409);
  assert.equal((await api('/api/sync', { events: [] }, b.token)).events.length, 0);
  const assessment = { id: 'assessment-1', type: 'assessment', createdAt: '2026-09-20T01:00:00Z', payload: { attemptId: attempt.id, correct: false } };
  assert.equal((await api('/api/sync', { events: [assessment] }, b.token)).status, 400);
  result = await api('/api/sync', { events: [assessment] }, a.token);
  assert.equal(result.firstObservations[0].day, '2026-09-19');
  assert.equal(result.firstObservations[0].correct, false);
  assert.equal((await api('/api/sync', { events: [{ ...assessment, id: 'assessment-2', payload: { ...assessment.payload, correct: true } }] }, a.token)).status, 409);
  const tomorrow = { ...repeated, id: 'session-3/q1', createdAt: '2026-09-19T16:01:00Z', payload: { ...repeated.payload, submittedAt: '2026-09-19T16:01:00Z', day: '2026-09-20' } };
  result = await api('/api/sync', { events: [tomorrow] }, a.token);
  assert.equal(result.firstObservations.length, 2);
  assert.equal(result.events[0].payload.question.answer, 'B');
});

test('reports are private, admin can revise content without rewriting attempts, and no private server files are served', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'reporter', password: 'password-123', inviteCode: 'test-invite' });
  const b = await api('/api/auth/register', { username: 'other', password: 'password-123', inviteCode: 'test-invite' });
  assert.equal((await api('/api/auth/register', { username: 'teacher', password: 'password-123', inviteCode: 'test-invite' })).status, 403);
  const admin = await api('/api/auth/register', { username: 'teacher', password: 'password-123', inviteCode: 'admin-secret' });
  assert.equal(admin.user.role, 'admin');
  const report = { id: 'report-1', type: 'report', createdAt: new Date().toISOString(), payload: { questionId: 'q1', questionVersion: 1, category: 'answer', detail: '两个选项均成立。', source: { pdfPage: 6 } } };
  await api('/api/sync', { events: [report] }, a.token);
  await api('/api/sync', { events: [report] }, a.token);
  assert.equal((await api('/api/reports', null, b.token)).reports.length, 0);
  assert.equal((await api('/api/admin/reports', null, a.token)).status, 403);
  const reports = (await api('/api/admin/reports', null, admin.token)).reports;
  assert.equal(reports.length, 1);
  assert.equal((await api(`/api/admin/reports/${reports[0].id}`, { status: 'processing', reply: '正在核对原书。' }, admin.token, 'PATCH')).status, 200);
  assert.equal((await api('/api/reports', null, a.token)).reports[0].status, 'processing');
  const revision = { id: 'q1', version: 2, memoryId: 'm1', essayIds: ['essay-01'], ability: 'vocabulary', quote: '原文', stem: '题干', choices: [{ id: 'a', text: '甲', explanation: '解释甲' }, { id: 'b', text: '乙', explanation: '解释乙' }], answerId: 'b', explanation: '解释', source: { pdfPage: 6, blockPath: '$[0]' }, status: 'reviewed', active: true };
  assert.equal((await api('/api/admin/questions/q1', { status: 'reviewed', revision, reason: '重新核对来源' }, a.token)).status, 403);
  assert.equal((await api('/api/admin/questions/q1', { status: 'reviewed', revision, reason: '重新核对来源' }, admin.token)).status, 200);
  assert.equal((await api('/api/admin/questions/q1', { status: 'reviewed', revision, reason: '重复版本' }, admin.token)).status, 409);
  const inStem = { ...revision, version: 3, quote: '', stem: '「君子求諸己」的「諸」如何理解？', responseFormat: 'single-choice' };
  assert.equal((await api('/api/admin/questions/q1', { status: 'reviewed', revision: inStem, reason: '引文已在題幹內' }, admin.token)).status, 200);
  const missingMaterial = { ...inStem, version: 4 }; delete missingMaterial.quote;
  assert.equal((await api('/api/admin/questions/q1', { status: 'reviewed', revision: missingMaterial, reason: '漏交欄位' }, admin.token)).status, 400);
  assert.equal((await api('/api/admin/questions/q1', { status: 'withdrawn', reason: '存在多解，暂下架' }, admin.token)).status, 200);
  assert.equal((await api('/api/content/overrides', null, a.token)).overrides.at(-1).status, 'withdrawn');
  assert.equal((await api('/backend/server.mjs')).status, 404);
  assert.equal((await api('/src/..%2fbackend/server.mjs')).status, 404);
});

test('explicit score correction is isolated, leaves the original answer intact, and is shown in first observations', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'affected', password: 'password-123', inviteCode: 'test-invite' });
  const b = await api('/api/auth/register', { username: 'unaffected', password: 'password-123', inviteCode: 'test-invite' });
  const admin = await api('/api/auth/register', { username: 'teacher', password: 'password-123', inviteCode: 'admin-secret' });
  const attempt = { id: 'answer-1', type: 'attempt', createdAt: '2026-09-18T12:00:00Z', payload: { memoryId: 'm1', questionId: 'q1', questionVersion: 1, question: { id: 'q1', answerId: 'b' }, mode: 'choice', answer: 'a', correct: false, submittedAt: '2026-09-18T12:00:00Z' } };
  const report = { id: 'report-correction', type: 'report', createdAt: '2026-09-18T12:01:00Z', payload: { questionId: 'q1', questionVersion: 1, category: 'answer', detail: '原答案有误。' } };
  await api('/api/sync', { events: [attempt, report] }, a.token);
  await api('/api/sync', { events: [attempt] }, b.token);
  const reportId = (await api('/api/admin/reports', null, admin.token)).reports[0].id;
  const correction = { reportId, attemptId: 'answer-1', correct: true, reason: '已对照原书，该答案亦成立。' };
  assert.equal((await api('/api/admin/corrections', correction, a.token)).status, 403);
  assert.equal((await api('/api/admin/corrections', correction, admin.token)).status, 201);
  const after = await api('/api/sync', { events: [] }, a.token);
  assert.equal(after.events.find(e => e.id === 'answer-1').payload.correct, false);
  assert.equal(after.firstObservations[0].correct, true);
  assert.equal(after.corrections[0].reason, correction.reason);
  assert.equal((await api('/api/sync', { events: [] }, b.token)).firstObservations[0].correct, false);
  assert.equal((await api('/api/sync', { events: [] }, b.token)).corrections.length, 0);
});

test('Chinese usernames work and punctuation is rejected', async t => {
  const api = await fixture(t);
  assert.equal((await api('/api/auth/register', { username: '香港同学', password: 'password-123', inviteCode: 'test-invite' })).status, 201);
  assert.equal((await api('/api/auth/register', { username: 'bad\\name', password: 'password-123', inviteCode: 'test-invite' })).status, 400);
  assert.equal((await api('/api/auth/register', { username: 'bad/name', password: 'password-123', inviteCode: 'test-invite' })).status, 400);
});

test('offline batches accept assessment before its attempt and equal submission times have deterministic first IDs', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'offline', password: 'password-123', inviteCode: 'test-invite' });
  const at = '2026-09-18T12:00:00Z';
  const attempt = id => ({ id, type: 'attempt', createdAt: at, payload: { memoryId: 'm1', questionId: 'q1', questionVersion: 1, question: { id: 'q1' }, mode: 'typing', answer: '回答', correct: null, submittedAt: at } });
  const assessment = { id: 'selfcheck', type: 'assessment', createdAt: '2026-09-19T12:00:00Z', payload: { attemptId: 'a', correct: false } };
  const response = await api('/api/sync', { events: [assessment, attempt('z'), attempt('a')] }, a.token);
  assert.equal(response.status, 200);
  assert.equal(response.firstObservations[0].attemptId, 'a');
  assert.equal(response.firstObservations[0].correct, false);
});


test('source PDFs support byte ranges and private backend files remain outside static roots', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'wenyan-static-'));
  await mkdir(path.join(dir, 'content'));
  await writeFile(path.join(dir, 'content', 'source.pdf'), '%PDF-1.7\nexample');
  const app = createApp({ databasePath: path.join(dir, 'study.sqlite'), staticRoot: dir });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { await new Promise(resolve => app.server.close(resolve)); app.close(); await rm(dir, { recursive: true }); });
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  const response = await fetch(origin + '/content/source.pdf', { headers: { Range: 'bytes=0-4' } });
  assert.equal(response.status, 206); assert.equal(response.headers.get('content-type'), 'application/pdf');
  assert.equal(response.headers.get('content-range'), 'bytes 0-4/16');
  assert.equal(await response.text(), '%PDF-');
  assert.equal((await fetch(origin + '/content/source.pdf', { headers: { Range: 'bytes=999-1000' } })).status, 416);
  assert.equal((await fetch(origin + '/api/health', { headers: { Origin: 'https://untrusted.example' } })).status, 403);
});
