import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
export function database(){
 const sql=new DatabaseSync(':memory:');sql.exec('PRAGMA foreign_keys=ON');for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+file,'utf8'));
 const execute=(query,args,mode)=>{const statement=sql.prepare(query);if(mode==='first')return statement.get(...args)??null;if(mode==='all')return {results:statement.all(...args)};return {meta:{changes:Number(statement.run(...args).changes)}};};
 const prepare=(query,args=[])=>({query,args,bind(...values){return prepare(query,values);},async first(){return execute(query,args,'first');},async all(){return execute(query,args,'all');},async run(){return execute(query,args,'run');}});
 const DB={prepare,async batch(statements){sql.exec('BEGIN');try{const result=statements.map(s=>{const statement=sql.prepare(s.query);let records=[];if(statement.columns().length)records=statement.all(...s.args);else statement.run(...s.args);return {results:records,meta:{changes:sql.prepare('SELECT changes() AS n').get().n}};});sql.exec('COMMIT');return result;}catch(error){sql.exec('ROLLBACK');throw error;}}};
 return {DB,sql,close:()=>sql.close()};
}
