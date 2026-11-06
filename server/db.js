import {neon} from '@neondatabase/serverless';
export function databaseUrl(){return process.env.DATABASE_URL||process.env.POSTGRES_URL||'';}
let cached,cachedUrl;
export function getDatabase(){const url=databaseUrl();if(!url)return null;if(cached&&url===cachedUrl)return cached;const sql=neon(url);cachedUrl=url;cached={async query(text,params=[]){const r=await sql.query(text,params,{fullResults:true});return {rows:r.rows,rowCount:r.rowCount};},async transaction(statements){const results=await sql.transaction(statements.map(s=>sql.query(s.text,s.params||[])),{fullResults:true,isolationLevel:'RepeatableRead'});return results.map(r=>({rows:r.rows,rowCount:r.rowCount}));}};return cached;}
