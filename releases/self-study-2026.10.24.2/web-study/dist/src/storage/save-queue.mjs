// Failed writes stay at the head; a retry never skips an unsaved operation.
export class SaveQueue {
 constructor(){this.jobs=[];this.tail=Promise.resolve();}
 get pending(){return this.jobs.length;}
 add(write){this.jobs.push(write);return this.flush();}
 flush(){
  const result=this.tail.catch(()=>{}).then(async()=>{
   while(this.jobs.length){await this.jobs[0]();this.jobs.shift();}
  });
  this.tail=result;
  return result;
 }
}
