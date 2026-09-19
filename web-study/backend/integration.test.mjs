import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from './server.mjs';
import { SyncClient } from '../src/sync/client.mjs';
import { project } from '../src/domain/review.mjs';

// Storage seam adapter deliberately returns ID order, like IndexedDB getAll.
// This verifies the real HTTP/client/domain integration, not the browser engine.
class QueueStore {
  constructor(userId) { this.userId = userId; this.rows = new Map(); this.meta = new Map(); }
  async append(event) { this.rows.set(event.id, { ...structuredClone(event), pending: true }); }
  async events() { return [...this.rows.values()].map(({ pending, ...event }) => structuredClone(event)); }
  async pending() { return [...this.rows.values()].filter(e => e.pending).sort((a, b) => a.id.localeCompare(b.id)).map(({ pending, ...event }) => structuredClone(event)); }
  async merge(events, ids) { for (const e of events) this.rows.set(e.id, { ...structuredClone(e), pending: false }); for (const id of ids) this.rows.get(id).pending = false; }
  async set(key, value) { this.meta.set(key, structuredClone(value)); }
  async get(key) { return structuredClone(this.meta.get(key)); }
}
async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'wenyan-integration-'));
  const app = createApp({ databasePath: path.join(dir, 'study.sqlite'), bootstrapInvite: 'students', adminUsername: 'teacher', adminInvite: 'admin' });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${app.server.address().port}`;
  const nativeFetch = globalThis.fetch;
  const onlineDescriptor = Object.getOwnPropertyDescriptor(navigator, 'onLine');
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  globalThis.fetch = (url, options) => nativeFetch(new URL(url, origin), options);
  t.after(async () => {
    globalThis.fetch = nativeFetch;
    if (onlineDescriptor) Object.defineProperty(navigator, 'onLine', onlineDescriptor); else delete navigator.onLine;
    await new Promise(resolve => app.server.close(resolve)); app.close(); await rm(dir, { recursive: true });
  });
  return async (route, body, token) => {
    const response = await fetch(route, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json(); assert.ok(response.ok, `${route}: ${data.error}`); return data;
  };
}
const answer = (id = 'zzz-first') => ({ id, type: 'attempt', createdAt: '2026-09-18T15:59:00Z', payload: { memoryId: 'm1', questionId: 'q1', questionVersion: 1, question: { id: 'q1', answerId: 'b' }, mode: 'typing', answer: '首次草稿', correct: null, submittedAt: '2026-09-18T15:59:00Z', day: '2026-09-18' } });

test('real sync drains more than one ID-ordered batch, acknowledges retries, and keeps switched accounts isolated', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'student-a', password: 'password-123', inviteCode: 'students' });
  const b = await api('/api/auth/register', { username: 'student-b', password: 'password-123', inviteCode: 'students' });
  const repo = new QueueStore(a.user.id);
  for (let i = 0; i < 105; i++) await repo.append({ id: `mid-${String(i).padStart(3, '0')}`, type: 'favorite', createdAt: '2026-09-18T15:58:00Z', payload: { questionId: `q${i}`, version: 1, saved: true } });
  await repo.append(answer());
  await repo.append({ id: 'aaa-assessment', type: 'assessment', createdAt: '2026-09-19T01:00:00Z', payload: { attemptId: 'zzz-first', correct: false } });
  const sync = new SyncClient(repo, a.token);
  await sync.sync(); await sync.sync();
  assert.equal((await repo.pending()).length, 0);
  assert.equal((await repo.events()).length, 107);
  const state = project(await repo.events(), '2026-09-19');
  assert.equal(state.firsts[0].day, '2026-09-18');
  assert.equal(state.firsts[0].correct, false);
  assert.equal(state.memories.m1.due, '2026-09-19');
  sync.stop();
  const otherRepo = new QueueStore(b.user.id); await new SyncClient(otherRepo, b.token).sync();
  assert.equal((await otherRepo.events()).length, 0);
  assert.equal(Object.keys(project(await otherRepo.events()).favorites).length, 0);
  const restored = new QueueStore(a.user.id); await new SyncClient(restored, a.token).sync();
  assert.equal((await restored.events()).length, 107);
});

test('server correction is saved by sync and frontend projection repairs effective result without changing historical snapshot', async t => {
  const api = await fixture(t);
  const a = await api('/api/auth/register', { username: 'student', password: 'password-123', inviteCode: 'students' });
  const admin = await api('/api/auth/register', { username: 'teacher', password: 'password-123', inviteCode: 'admin' });
  const repo = new QueueStore(a.user.id);
  const original = answer('answer'); original.payload.mode = 'choice'; original.payload.correct = false;
  await repo.append(original);
  await repo.append({ id: 'report', type: 'report', createdAt: '2026-09-18T16:00:00Z', payload: { questionId: 'q1', questionVersion: 1, category: 'answer', detail: '复核' } });
  const sync = new SyncClient(repo, a.token); await sync.sync();
  const reports = (await api('/api/admin/reports', null, admin.token)).reports;
  await api('/api/admin/corrections', { reportId: reports[0].id, attemptId: 'answer', correct: true, reason: '已核对原文，接受此答案。' }, admin.token);
  await sync.sync();
  const corrections = await repo.get('corrections');
  assert.equal(corrections.length, 1);
  const state = project(await repo.events(), '2026-09-19', corrections);
  assert.equal(state.firsts[0].correct, true);
  assert.equal(state.memories.m1.due, undefined);
  assert.equal((await repo.events()).find(e => e.id === 'answer').payload.correct, false);
  assert.equal((await repo.events()).find(e => e.id === 'answer').payload.question.answerId, 'b');
});
