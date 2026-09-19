import {DatabaseSync} from 'node:sqlite';
import {randomBytes} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {snapshotTables} from './snapshot.mjs';
const folder=new URL('../backend/data/',import.meta.url);await mkdir(folder,{recursive:true});
let secrets;
try{secrets=JSON.parse(await readFile(new URL('cloud-secrets.json',folder),'utf8'));}
catch(error){if(error.code!=='ENOENT')throw error;secrets={BOOTSTRAP_INVITE:randomBytes(24).toString('base64url'),ADMIN_INVITE:randomBytes(32).toString('base64url'),MIGRATION_SECRET:randomBytes(32).toString('base64url')};await writeFile(new URL('cloud-secrets.json',folder),JSON.stringify(secrets,null,2));}
const db=new DatabaseSync(fileURLToPath(new URL('study.sqlite',folder)),{readOnly:true});
const tables={};
db.exec('BEGIN');try{for(const [table,columns] of Object.entries(snapshotTables))tables[table]=db.prepare('SELECT '+columns.join(',')+' FROM '+table).all();db.exec('COMMIT');}finally{db.close();}
await writeFile(new URL('cloud-snapshot.json',folder),JSON.stringify({format:'wenyan-server-snapshot-v1',tables}));
await writeFile(new URL('cloud-access.txt',folder),'中文甲雲端私密交接（不要上傳GitHub）\n學生註冊邀請碼：'+secrets.BOOTSTRAP_INVITE+'\n維護者帳號：teacher\n維護者一次性邀請碼：'+secrets.ADMIN_INVITE+'\n已有本地帳號遷移後繼續使用原帳號和密碼；需在新網址重新登入。\n');
console.log(JSON.stringify({prepared:true,privateFolder:fileURLToPath(folder),counts:Object.fromEntries(Object.entries(tables).map(([t,rows])=>[t,rows.length]))}));
