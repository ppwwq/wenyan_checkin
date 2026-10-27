import {createApp} from './backend/server.mjs';
import {fileURLToPath} from 'node:url';
const app=createApp({databasePath:':memory:',bootstrapInvite:'local-design-preview',staticRoot:fileURLToPath(new URL('./app/',import.meta.url))});
const port=Number(process.env.PORT||43135);
app.server.listen(port,'127.0.0.1',()=>console.log(`Local design preview: http://127.0.0.1:${port} (temporary database)`));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>app.server.close(()=>{app.close();process.exit(0);}));
