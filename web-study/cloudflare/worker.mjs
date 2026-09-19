import { DurableObject } from 'cloudflare:workers';
import { createApi } from '../backend/api.mjs';
import { importSnapshot } from './snapshot.mjs';
import { createHash,timingSafeEqual } from 'node:crypto';

const security={
 'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin',
 'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
};
const errorResponse=(status,message)=>Response.json({error:message},{status,headers:{...security,'Cache-Control':'no-store'}});

export class StudyDatabase extends DurableObject {
 constructor(ctx,env){
  super(ctx,env);
  this.env=env;
  const sql=ctx.storage.sql;
  const db={
   exec:statement=>sql.exec(statement),
   prepare:statement=>({
    get:(...args)=>sql.exec(statement,...args).toArray()[0],
    all:(...args)=>sql.exec(statement,...args).toArray(),
    run:(...args)=>{const result=sql.exec(statement,...args);return {changes:result.rowsWritten};}
   }),
   transactionSync:callback=>ctx.storage.transactionSync(callback)
  };
  this.db=db;
  this.api=createApi({db,bootstrapInvite:env.BOOTSTRAP_INVITE,adminInvite:env.ADMIN_INVITE,
   adminUsername:env.ADMIN_USERNAME,publicOrigin:env.PUBLIC_ORIGIN,currentQuestion:async id=>{
    // Only content maintenance needs current versions. Never bundle the full question bank into Worker code.
    if(!this.versions){
     const response=await env.ASSETS.fetch('https://assets.internal/content/bank.json');
     if(!response.ok)throw new Error('Question bank unavailable');
     const bank=await response.json();this.versions=new Map(bank.questions.map(q=>[q.id,{version:q.version}]));
    }
    return this.versions.get(id);
   }});
 }
 async fetch(request){
  const url=new URL(request.url);
  if(request.headers.has('origin')&&request.headers.get('origin')!==url.origin)return errorResponse(403,'不允许跨站请求。');
  if(url.pathname==='/api/internal/import'){
   if(request.method!=='POST'||!this.env.MIGRATION_SECRET)return errorResponse(404,'接口不存在。');
   const digest=s=>createHash('sha256').update(s).digest();
   if(!timingSafeEqual(digest(request.headers.get('Authorization')||''),digest('Bearer '+this.env.MIGRATION_SECRET)))return errorResponse(404,'接口不存在。');
   try{
    const chunks=[];let size=0;
    for await(const chunk of request.body){size+=chunk.byteLength;if(size>8_000_000)return errorResponse(413,'请求过大。');chunks.push(Buffer.from(chunk));}
    const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
    return Response.json(importSnapshot(this.db,payload),{headers:{...security,'Cache-Control':'no-store'}});
   }catch(error){return errorResponse(error.status||400,error.message);}
  }
  const headers=Object.fromEntries(request.headers);headers.host=url.host;
  // The outer handler already validated HTTPS origin; the common API still checks it against this value.
  const req={method:request.method,headers,publicOrigin:url.origin,socket:{remoteAddress:request.headers.get('CF-Connecting-IP')||'local'},
   async *[Symbol.asyncIterator](){if(request.body)for await(const chunk of request.body)yield Buffer.from(chunk);}};
  let status=200,result=null,responseHeaders={...security};
  const res={writeHead(code,h){status=code;Object.assign(responseHeaders,h);},end(body){result=body;}};
  try{await this.api(url.pathname,req,res);return new Response(result,{status,headers:responseHeaders});}
  catch(error){if(!error.status)console.error('Study API failed',error.message);return errorResponse(error.status||500,error.status?error.message:'服务暂时不可用。');}
 }
}
export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/')){
   const stub=env.STUDY_DATABASE.get(env.STUDY_DATABASE.idFromName('study-v1'));
   return stub.fetch(request);
  }
  if(url.pathname==='/content/sources/revision-book.pdf'&&request.headers.has('range')){
   if(!['GET','HEAD'].includes(request.method))return errorResponse(405,'不支持此请求。');
   const upstream=new Request(request.url,{method:'GET',headers:request.headers});upstream.headers.delete('range');
   const asset=await env.ASSETS.fetch(upstream);
   if(!asset.ok)return asset;
   const data=await asset.arrayBuffer(),size=data.byteLength;
   const range=/^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range'));
   if(!range||(!range[1]&&!range[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
   const start=range[1]?Number(range[1]):Math.max(0,size-Number(range[2]));
   const end=range[1]&&range[2]?Math.min(size-1,Number(range[2])):size-1;
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
   const headers=new Headers(asset.headers);headers.set('Content-Range',`bytes ${start}-${end}/${size}`);headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
   return new Response(request.method==='HEAD'?null:data.slice(start,end+1),{status:206,headers});
  }
  return env.ASSETS.fetch(request);
 }
};
