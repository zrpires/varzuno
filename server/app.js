import {json,security,HttpError,sameOrigin,requestBody} from '../src/http.js';
import {actor,register,login,logout,updateProfile,publicProfile} from './auth.js';
import {listLeagues,createLeague,readLeague,saveLeague,deleteLeague} from './leagues.js';
import {compat} from './compat.js';
export async function handleRequest(request,database){
 try{
  const path=new URL(request.url).pathname,method=request.method;
  if(!['GET','HEAD'].includes(method))sameOrigin(request);
  if(path==='/api/health'){
   if(!database)return json(200,{ok:true,databaseConfigured:false,cloudReady:false});
   await database.query('SELECT id FROM varzuno.accounts LIMIT 1');return json(200,{ok:true,databaseConfigured:true,cloudReady:true});
  }
  if(path==='/api/session'&&method==='GET'){
   if(database)await database.query('SELECT id FROM varzuno.accounts LIMIT 1');
   const user=database?await actor(request,database,true):null;return json(200,{status:user?'authenticated':'anonymous',profile:user?publicProfile(user):null,cloudReady:!!database,guestLeaguesAvailable:0,legacyAvailable:false});
  }
  if(!database)throw new HttpError(503,'O banco ainda não foi conectado. Na Vercel, adicione Neon em Storage e conecte DATABASE_URL; depois faça Redeploy. O modo convidado local continua disponível.');
  if(path==='/api/auth/register'&&method==='POST'){const r=await register(request,database,await requestBody(request));return json(201,{profile:r.profile},r.headers);}
  if(path==='/api/auth/login'&&method==='POST'){const r=await login(request,database,await requestBody(request));return json(200,{profile:r.profile},r.headers);}
  if(path==='/api/auth/logout'&&method==='POST'){await requestBody(request);return json(200,{loggedOut:true},await logout(request,database));}
  if(path==='/api/profile'&&method==='PUT')return json(200,{profile:await updateProfile(request,database,await requestBody(request))});
  const db=compat(database);
  if(path==='/api/leagues'){
   const user=await actor(request,database);
   if(method==='GET')return json(200,{leagues:await listLeagues(db,user)});
   if(method==='POST')return json(201,await createLeague(db,user,await requestBody(request)));
   throw new HttpError(405,'Método não permitido.');
  }
  const match=path.match(/^\/api\/leagues\/([^/]+)$/);
  if(match){const user=await actor(request,database),key=match[1];if(method==='GET')return json(200,await readLeague(db,user,key));if(method==='PUT')return json(200,await saveLeague(db,user,key,await requestBody(request)));if(method==='DELETE')return json(200,await deleteLeague(db,user,key,await requestBody(request)));throw new HttpError(405,'Método não permitido.');}
  throw new HttpError(404,'Rota não encontrada.');
 }catch(error){if(!error.status)console.error('Varzuno API error:',error.code||error.name);if(error.code==='42P01'||error.code==='3F000')return json(503,{error:'O banco precisa ser preparado. Faça Redeploy depois de conectar DATABASE_URL à Vercel.'});return json(error.status||500,{error:error.status?error.message:'Não foi possível concluir. Seus registros existentes não foram substituídos.'});}
}
