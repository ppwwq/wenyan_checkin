import test from 'node:test';
import assert from 'node:assert/strict';
import {SaveQueue} from '../src/storage/save-queue.mjs';

test('a failed local save can be retried in order without losing later writes',async()=>{
 const queue=new SaveQueue(),saved=[];let unavailable=true;
 const first=queue.add(async()=>{if(unavailable)throw new Error('quota');saved.push('first');});
 await assert.rejects(first,/quota/);
 assert.equal(queue.pending,1);
 unavailable=false;
 await queue.add(async()=>saved.push('second'));
 assert.deepEqual(saved,['first','second']);assert.equal(queue.pending,0);
 await queue.flush();assert.deepEqual(saved,['first','second']);
});
