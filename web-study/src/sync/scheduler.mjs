// One scheduler owns debounce, backoff and cancellation for the current account.
export class SyncScheduler {
 constructor(task,{delay=1200,retryDelays=[5000,15000,60000]}={}){
  this.task=task;this.delay=delay;this.retryDelays=retryDelays;
  this.timer=null;this.running=null;this.dirty=false;this.stopped=false;this.blocked=false;this.failures=0;
 }
 notify(){
  if(this.stopped)return;this.dirty=true;
  if(!this.running&&!this.blocked&&!this.timer)this.arm(this.failures?this.retryDelays[Math.min(this.failures-1,this.retryDelays.length-1)]:this.delay);
 }
 arm(delay){clearTimeout(this.timer);this.timer=setTimeout(()=>{this.timer=null;void this.flush(false);},delay);}
 stop(){this.stopped=true;clearTimeout(this.timer);this.timer=null;}
 async flush(explicit=true){
  if(this.stopped)return false;
  if(this.running)return this.running;
  if(explicit)this.blocked=false;
  if(this.blocked)return false;
  clearTimeout(this.timer);this.timer=null;this.dirty=true;
  this.running=(async()=>{
   try{
    do{this.dirty=false;await this.task();}while(this.dirty&&!this.stopped);
    this.failures=0;return true;
   }catch(error){
    this.dirty=true;
    this.blocked=!!error.status&&error.status<500&&![408,429].includes(error.status);
    if(!this.stopped&&!this.blocked)this.arm(this.retryDelays[Math.min(this.failures++,this.retryDelays.length-1)]);
    return false;
   }
  })();
  try{return await this.running;}finally{this.running=null;}
 }
}
