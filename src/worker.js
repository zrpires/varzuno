import assets from 'virtual:assets';
import {json,security,HttpError,sameOrigin,requestBody} from './http.js';
import {actor,sessionInfo,startGuest,registerProfile,updateProfile,claimGuest,logoutGuest} from './auth.js';
import {listLeagues,createLeague,readLeague,saveLeague,deleteLeague,migrateLegacy} from './database.js';

export async function api(request,env){
 const path=new URL(request.url).pathname,method=request.method;
 if(!env.DB)throw new HttpError(503,'O banco de dados está temporariamente indisponível.');
 if(!['GET','HEAD'].includes(method))sameOrigin(request);
 if(path==='/api/health'&&method==='GET'){
  await env.DB.prepare('SELECT id FROM accounts LIMIT 1').first();
  await env.DB.prepare('SELECT id FROM leagues LIMIT 1').first();
  return json(200,{ok:true,storage:'ready',schema:2});
 }
 if(path==='/api/session'&&method==='GET')return json(200,await sessionInfo(request,env.DB));
 if(path==='/api/auth/guest'&&method==='POST'){
  const result=await startGuest(request,env.DB,await requestBody(request));return json(200,{profile:result.profile},result.headers);
 }
 if(path==='/api/auth/register'&&method==='POST'){
  const input=await requestBody(request);const profile=await registerProfile(request,env.DB,input);
  return json(200,{profile});
 }
 if(path==='/api/auth/claim-guest'&&method==='POST'){
  await requestBody(request);const result=await claimGuest(request,env.DB);return json(200,{claimed:result.claimed},result.headers);
 }
 if(path==='/api/auth/logout'&&method==='POST'){
  await requestBody(request);return json(200,{loggedOut:true},await logoutGuest(request,env.DB));
 }
 if(path==='/api/profile'&&method==='PUT')return json(200,{profile:await updateProfile(request,env.DB,await requestBody(request))});
 if(path==='/api/legacy/import'&&method==='POST'){
  const user=await actor(request,env.DB);await requestBody(request);return json(200,await migrateLegacy(env.DB,user));
 }
 if(path==='/api/leagues'){
  const user=await actor(request,env.DB);
  if(method==='GET')return json(200,{leagues:await listLeagues(env.DB,user)});
  if(method==='POST')return json(201,await createLeague(env.DB,user,await requestBody(request)));
  throw new HttpError(405,'Método não permitido.');
 }
 const match=path.match(/^\/api\/leagues\/([^/]+)$/);
 if(match){
  const user=await actor(request,env.DB),key=decodeURIComponent(match[1]);
  if(method==='GET')return json(200,await readLeague(env.DB,user,key));
  if(method==='PUT')return json(200,await saveLeague(env.DB,user,key,await requestBody(request)));
  if(method==='DELETE')return json(200,await deleteLeague(env.DB,user,key,await requestBody(request)));
  throw new HttpError(405,'Método não permitido.');
 }
 if(path==='/api/state')throw new HttpError(410,'Esta versão foi atualizada. Recarregue o aplicativo para acessar suas peladas. Os registros anteriores foram preservados.');
 throw new HttpError(404,'Rota não encontrada.');
}
export default {async fetch(request,env){
 try{
  const url=new URL(request.url);
  if(url.pathname.startsWith('/api/'))return await api(request,env);
  if(!['GET','HEAD'].includes(request.method))throw new HttpError(405,'Método não permitido.');
  const asset=assets[url.pathname==='/index.html'?'/':url.pathname];
  if(!asset)throw new HttpError(404,'Página não encontrada.');
  return new Response(request.method==='HEAD'?null:asset.body,{headers:{...security,'Content-Type':asset.type,'Cache-Control':'no-cache'}});
 }catch(error){if(!error.status)console.error('Varzuno request failed:',error.name);return json(error.status||500,{error:error.status?error.message:'Não foi possível concluir. Nenhum registro existente foi sobrescrito. Tente novamente.'});}
}};
