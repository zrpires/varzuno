import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHandler} from '../api/index.js';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url)));
export function createPreviewServer(database=null){const api=createHandler(()=>database);return http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname.startsWith('/api/'))return api(req,res);
 const file=url.pathname==='/'?'index.html':decodeURIComponent(url.pathname.slice(1)),path=resolve(root,file);
 if(!path.startsWith(root+'/')){res.writeHead(403);return res.end();}
 try{const body=await readFile(path);res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'}[extname(path)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}
 });}
