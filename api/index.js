import {handleRequest} from '../server/app.js';
import {getDatabase} from '../server/db.js';
export function createHandler(databaseProvider=getDatabase){return async function handler(req,res){
 try{
  const host=req.headers.host||'localhost',protocol=req.headers['x-forwarded-proto']||(process.env.VERCEL?'https':req.socket?.encrypted?'https':'http'),url=new URL(req.url,protocol+'://'+host);
  const route=req.query?.route||url.searchParams.get('route');const path=route?'/api/'+(Array.isArray(route)?route.join('/'):route):url.pathname;
  let body;if(!['GET','HEAD'].includes(req.method)){
   if(req.body!==undefined)body=typeof req.body==='string'?req.body:JSON.stringify(req.body);
   else{let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>2000000){res.statusCode=413;return res.end(JSON.stringify({error:'Limite de 2 MB excedido.'}));}chunks.push(Buffer.from(chunk));}body=Buffer.concat(chunks);}
   if(Buffer.byteLength(body||'')>2000000){res.statusCode=413;return res.end(JSON.stringify({error:'Limite de 2 MB excedido.'}));}
  }
  const headers=new Headers();for(const [key,value] of Object.entries(req.headers))if(value!==undefined)headers.set(key,Array.isArray(value)?value.join(','):value);
  const request=new Request(protocol+'://'+host+path,{method:req.method,headers,...(body===undefined?{}:{body})});
  const response=await handleRequest(request,databaseProvider());res.statusCode=response.status;for(const [key,value] of response.headers)res.setHeader(key,value);res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error('Varzuno function error:',error.code||error.name);res.statusCode=503;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:'API indisponível. Confira a conexão DATABASE_URL e o deploy.'}));}
}

}
export default createHandler();
