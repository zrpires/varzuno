import {HttpError,name} from './http.js';
export const COOKIE='__Host-varzuno-guest';
const TTL=30*24*60*60;
export const now=()=>new Date().toISOString();
export async function digest(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),x=>x.toString(16).padStart(2,'0')).join('');}
function token(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join('');}
export function cookie(value,age=TTL){return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
export const clearCookie=()=>cookie('',0);
export function providerSubject(request){const subject=request.headers.get('oai-authenticated-user-id');if(!subject)return null;if(subject.length>512)throw new HttpError(401,'Identidade de login inválida.');return subject;}
export async function guestSession(request,db){const raw=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;return db.prepare('SELECT a.id,a.kind,a.display_name,a.created_at,s.expires_at,s.token_hash FROM guest_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.kind=?').bind(await digest(raw),now(),'guest').first();}
export async function actor(request,db){const subject=providerSubject(request);if(subject){const account=await db.prepare('SELECT id,kind,display_name,created_at FROM accounts WHERE provider_subject=? AND kind=?').bind(subject,'chatgpt').first();if(!account)throw new HttpError(428,'Conclua seu cadastro de perfil antes de criar peladas.');return {...account,subject};}const guest=await guestSession(request,db);if(!guest)throw new HttpError(401,'Entre na sua conta ou inicie uma sessão como convidado.');return guest;}
export function publicProfile(account){return {id:account.id,name:account.display_name,kind:account.kind,...(account.expires_at?{expiresAt:account.expires_at}:{})};}
export async function sessionInfo(request,db){
 const subject=providerSubject(request),guest=await guestSession(request,db);
 const guestCount=guest?(await db.prepare('SELECT count(*) AS count FROM leagues WHERE owner_id=?').bind(guest.id).first()).count:0;
 if(subject){
  const account=await db.prepare('SELECT id,kind,display_name,created_at FROM accounts WHERE provider_subject=? AND kind=?').bind(subject,'chatgpt').first();
  const legacy=await db.prepare('SELECT 1 AS available FROM peladas WHERE owner_id=? AND NOT EXISTS (SELECT 1 FROM leagues WHERE legacy_subject=? AND revision>0)').bind(subject,subject).first();
  let suggested=request.headers.get('oai-authenticated-user-full-name')||'';if(request.headers.get('oai-authenticated-user-full-name-encoding')==='percent-encoded-utf-8'){try{suggested=decodeURIComponent(suggested);}catch{suggested='';}}
  return {status:account?'authenticated':'registration_required',profile:account?publicProfile(account):null,suggestedName:suggested.slice(0,50),guestLeaguesAvailable:guestCount,legacyAvailable:!!legacy};
 }
 return guest?{status:'guest',profile:publicProfile(guest),guestLeaguesAvailable:0,legacyAvailable:false}:{status:'anonymous',profile:null,guestLeaguesAvailable:0,legacyAvailable:false};
}
export async function startGuest(request,db,input){
 if(providerSubject(request))throw new HttpError(409,'Você está conectado ao ChatGPT neste site. Saia primeiro para usar o modo convidado.');
 const existing=await guestSession(request,db);if(existing)return {profile:publicProfile(existing),headers:{}};
 const hour=Math.floor(Date.now()/3600000),ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const maxAttempts=ip==='unknown'?100:10;
 const key=await digest('guest:'+ip+':'+hour),expires=new Date((hour+2)*3600000).toISOString();
 const limit=await db.prepare('INSERT INTO auth_limits (key,attempts,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 WHERE attempts<? RETURNING attempts').bind(key,expires,maxAttempts).first();
 if(!limit)throw new HttpError(429,'Muitas sessões criadas nesta conexão. Tente novamente na próxima hora.');
 const raw=token(),hash=await digest(raw),account={id:crypto.randomUUID(),display_name:name(input.name||'Convidado'),kind:'guest',created_at:now()},expiry=new Date(Date.now()+TTL*1000).toISOString();
 await db.batch([db.prepare('INSERT INTO accounts (id,kind,provider_subject,display_name,created_at) VALUES (?, ?, NULL, ?, ?)').bind(account.id,'guest',account.display_name,account.created_at),db.prepare('INSERT INTO guest_sessions (token_hash,account_id,created_at,expires_at) VALUES (?,?,?,?)').bind(hash,account.id,account.created_at,expiry)]);
 return {profile:publicProfile({...account,expires_at:expiry}),headers:{'Set-Cookie':cookie(raw)}};
}
export async function registerProfile(request,db,input){
 const subject=providerSubject(request);if(!subject)throw new HttpError(401,'Entre com ChatGPT antes de concluir o cadastro.');
 const display=name(input.name),accountId=crypto.randomUUID();
 await db.prepare('INSERT INTO accounts (id,kind,provider_subject,display_name,created_at) VALUES (?,?,?,?,?) ON CONFLICT(provider_subject) DO NOTHING').bind(accountId,'chatgpt',subject,display,now()).run();
 const account=await db.prepare('SELECT id,kind,display_name,created_at FROM accounts WHERE provider_subject=?').bind(subject).first();
 return publicProfile(account);
}
export async function updateProfile(request,db,input){const user=await actor(request,db);const display=name(input.name);await db.prepare('UPDATE accounts SET display_name=? WHERE id=?').bind(display,user.id).run();return publicProfile({...user,display_name:display});}
export async function claimGuest(request,db){
 const user=await actor(request,db);if(user.kind!=='chatgpt')throw new HttpError(403,'Entre com ChatGPT para guardar as peladas em sua conta.');
 const guest=await guestSession(request,db);if(!guest)return {claimed:0,headers:{'Set-Cookie':clearCookie()}};
 const current=(await db.prepare('SELECT count(*) AS count FROM leagues WHERE owner_id=?').bind(guest.id).first()).count;
 const result=await db.batch([
  db.prepare('UPDATE leagues SET owner_id=? WHERE owner_id=? AND (SELECT count(*) FROM leagues WHERE owner_id IN (?,?))<=50').bind(user.id,guest.id,user.id,guest.id),
  db.prepare('DELETE FROM guest_sessions WHERE account_id=? AND NOT EXISTS (SELECT 1 FROM leagues WHERE owner_id=?)').bind(guest.id,guest.id),
  db.prepare('DELETE FROM accounts WHERE id=? AND kind=? AND NOT EXISTS (SELECT 1 FROM leagues WHERE owner_id=?)').bind(guest.id,'guest',guest.id),
 ]);
 if(current>0&&result[0].meta.changes!==current)throw new HttpError(409,'A conta comporta até 50 peladas. Libere espaço antes de transferir.');
 return {claimed:current,headers:{'Set-Cookie':clearCookie()}};
}
export async function logoutGuest(request,db){const guest=await guestSession(request,db);if(guest)await db.batch([db.prepare('DELETE FROM guest_sessions WHERE token_hash=?').bind(guest.token_hash),db.prepare('DELETE FROM accounts WHERE id=? AND kind=? AND NOT EXISTS (SELECT 1 FROM leagues WHERE owner_id=?) AND NOT EXISTS (SELECT 1 FROM guest_sessions WHERE account_id=?)').bind(guest.id,'guest',guest.id,guest.id)]);return {'Set-Cookie':clearCookie()};}
