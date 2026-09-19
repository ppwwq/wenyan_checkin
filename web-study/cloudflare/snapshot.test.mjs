import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createApi} from '../backend/api.mjs';
import {importSnapshot,snapshotTables} from './snapshot.mjs';
function fixture(){const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');createApi({db});return db;}
function sample(){return {format:'wenyan-server-snapshot-v1',tables:{...Object.fromEntries(Object.keys(snapshotTables).map(t=>[t,[]])),users:[{id:'stable-user-id',username:'existing-user',password:'salt:hash',recovery:'hashed-recovery',role:'student'}],events:[{seq:9,user_id:'stable-user-id',id:'old-event',type:'favorite',payload:'{"questionId":"q1","saved":true}',created_at:'2026-09-19',received_at:'2026-09-19'}]}};}
test('server migration preserves identities and payloads without importing sessions or invite secrets',()=>{const db=fixture();try{const input=sample();assert.equal(importSnapshot(db,input).counts.events,1);assert.deepEqual({...db.prepare('SELECT * FROM users').get()},input.tables.users[0]);assert.deepEqual({...db.prepare('SELECT * FROM events').get()},input.tables.events[0]);assert.equal(db.prepare('SELECT count(*) AS n FROM sessions').get().n,0);assert.throws(()=>importSnapshot(db,input),/not empty/);}finally{db.close();}});
test('invalid snapshot rolls back every table and existing cloud data cannot be overwritten',()=>{const db=fixture();try{const input=sample();input.tables.events[0].user_id='missing-user';assert.throws(()=>importSnapshot(db,input));assert.equal(db.prepare('SELECT count(*) AS n FROM users').get().n,0);assert.equal(importSnapshot(db,sample()).ok,true);}finally{db.close();}});
