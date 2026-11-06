import {createPreviewServer} from './dev-server.mjs';
import {getDatabase} from '../server/db.js';
const server=createPreviewServer(getDatabase());server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log(`Várzuno: http://127.0.0.1:${server.address().port}`));
