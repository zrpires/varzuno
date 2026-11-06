import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {getDatabase} from '../server/db.js';
export async function migrate(database){
 for(const file of (await readdir(new URL('../migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
  const version=Number(file.split('_')[0]),sql=(await readFile(new URL('../migrations/'+file,import.meta.url),'utf8')).replace(/-- statement-breakpoint/g,'');
  await database.transaction([{text:'SELECT pg_advisory_xact_lock(2200611)',params:[]},{text:'CREATE SCHEMA IF NOT EXISTS varzuno',params:[]},{text:'CREATE TABLE IF NOT EXISTS varzuno.schema_migrations(version integer PRIMARY KEY,applied_at text NOT NULL)',params:[]},{text:`DO $varzuno_migration$ BEGIN IF NOT EXISTS(SELECT 1 FROM varzuno.schema_migrations WHERE version=${version}) THEN ${sql} INSERT INTO varzuno.schema_migrations VALUES(${version},'${new Date().toISOString()}'); END IF; END $varzuno_migration$;`,params:[]}]);
 }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const db=getDatabase();if(!db){console.log('DATABASE_URL ausente: conecte o banco Neon à Vercel para ativar cadastros.');process.exitCode=1;}else try{await migrate(db);console.log('Banco PostgreSQL preparado.');}catch(error){console.error('Falha ao preparar o banco. Confira DATABASE_URL. Código:',error.code||error.name);process.exitCode=1;}}
