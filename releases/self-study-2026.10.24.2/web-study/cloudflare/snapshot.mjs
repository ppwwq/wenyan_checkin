import {atomic} from '../backend/transaction.mjs';
export const snapshotTables={
 users:['id','username','password','recovery','role'],
 events:['seq','user_id','id','type','payload','created_at','received_at'],
 assessments:['user_id','attempt_id','event_id','correct'],
 reports:['id','user_id','event_id','payload','status','reply','updated_at'],
 revisions:['seq','question_id','status','revision','reason','admin_id','created_at'],
 corrections:['seq','id','user_id','attempt_id','correct','reason','report_id','admin_id','created_at'],
 admin_audit:['seq','admin_id','action','payload','created_at']
};
export function importSnapshot(db,snapshot){
 if(snapshot?.format!=='wenyan-server-snapshot-v1'||!snapshot.tables)throw new Error('Invalid snapshot format');
 const counts={};
 atomic(db,()=>{
  for(const table of Object.keys(snapshotTables)){
   if(db.prepare('SELECT count(*) AS n FROM '+table).get().n){const error=new Error('Cloud database is not empty; import refused');error.status=409;throw error;}
  }
  for(const [table,columns] of Object.entries(snapshotTables)){
   const rows=snapshot.tables[table];if(!Array.isArray(rows))throw new Error('Missing snapshot table '+table);
   const statement=db.prepare('INSERT INTO '+table+' ('+columns.join(',')+') VALUES ('+columns.map(()=>'?').join(',')+')');
   for(const row of rows){if(columns.some(c=>!(c in row)))throw new Error('Missing column in '+table);statement.run(...columns.map(c=>row[c]));}
   counts[table]=rows.length;
  }
 });
 return {ok:true,counts};
}
