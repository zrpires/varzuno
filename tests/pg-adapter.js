import {PGlite} from '@electric-sql/pglite';
import {migrate} from '../scripts/migrate.mjs';
export async function database(){const pg=new PGlite();await pg.waitReady;const db={async query(text,params=[]){const r=await pg.query(text,params);return {rows:r.rows,rowCount:r.affectedRows??r.rows.length};},transaction:statements=>pg.transaction(async tx=>{const results=[];for(const s of statements){const r=await tx.query(s.text,s.params||[]);results.push({rows:r.rows,rowCount:r.affectedRows??r.rows.length});}return results;})};await migrate(db);return {...db,close:()=>pg.close()};}
