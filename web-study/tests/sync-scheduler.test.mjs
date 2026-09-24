import test from 'node:test';
import assert from 'node:assert/strict';
import {SyncScheduler} from '../src/sync/scheduler.mjs';

test('new events coalesce and transient failures retry without another user action',async()=>{
 let calls=0,finish;
 const done=new Promise(resolve=>finish=resolve);
 const scheduler=new SyncScheduler(async()=>{calls++;if(calls===1)throw new Error('offline');finish();},{delay:5,retryDelays:[5]});
 scheduler.notify();scheduler.notify();scheduler.notify();
 await done;scheduler.stop();assert.equal(calls,2);
});
test('events added during an in-flight sync trigger a follow-up and stopped accounts never restart',async()=>{
 let calls=0,release;
 const gate=new Promise(resolve=>release=resolve);
 const scheduler=new SyncScheduler(async()=>{calls++;if(calls===1)await gate;},{delay:5});
 const running=scheduler.flush();scheduler.notify();release();await running;
 assert.equal(calls,2);
 scheduler.notify();scheduler.stop();await scheduler.flush();assert.equal(calls,2);
});
test('expired sessions do not automatically retry until an explicit trigger',async()=>{
 let calls=0;const scheduler=new SyncScheduler(async()=>{calls++;throw Object.assign(new Error('expired'),{status:401});},{delay:5,retryDelays:[5]});
 await scheduler.flush();await new Promise(resolve=>setTimeout(resolve,20));scheduler.stop();assert.equal(calls,1);
});
