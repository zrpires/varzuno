import {mkdir,rm,readdir,cp,writeFile} from 'node:fs/promises';
import {getDatabase} from '../server/db.js';
import {migrate} from './migrate.mjs';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of await readdir('public'))await cp('public/'+file,'dist/'+file);
await cp('src/core.js','dist/core.js');
let db;try{db=getDatabase();}catch{console.error('DATABASE_URL inválida. Confira a integração do banco na Vercel.');process.exit(1);}if(db){try{await migrate(db);console.log('Banco PostgreSQL pronto para cadastro e login.');}catch(error){console.error('A migração do banco falhou. Confira DATABASE_URL. Código:',error.code||error.name);process.exit(1);}}else console.log('Build concluído em modo convidado local. Conecte Neon/DATABASE_URL na Vercel para ativar contas.');
await writeFile('dist/health.json',JSON.stringify({ok:true,version:3,cloudConfigured:!!db}));
console.log('Saída Vercel em dist: HTML, JavaScript, core.js e CSS. Sem scripts nativos de instalação.');
