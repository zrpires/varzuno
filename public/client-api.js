import {createLocalStore} from './local-store.js';
function canonical(value,key=''){if(Array.isArray(value)){const values=value.map(v=>canonical(v));return ['players','matches'].includes(key)&&values.every(v=>v&&typeof v==='object'&&typeof v.id==='string')?values.sort((a,b)=>a.id.localeCompare(b.id)):values;}if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k],k)]));return value;}
export function createApi({storage,fetcher=globalThis.fetch,locks=globalThis.navigator?.locks}={}){
 const store=createLocalStore(storage,work=>locks?locks.request('varzuno-local-v3',work):work());let mode='anonymous';
 async function remote(path,options={}){let response;try{response=await fetcher(path,{...options,credentials:'same-origin',signal:AbortSignal.timeout(25000),headers:{'Content-Type':'application/json',...options.headers}});}catch{throw Error('Não foi possível conectar ao servidor. Confira a conexão e tente novamente.');}let result;try{result=await response.json();}catch{throw Error('A API não respondeu corretamente. Confira o deploy e recarregue.');}if(!response.ok)throw Object.assign(Error(result.error||'Não foi possível concluir.'),{status:response.status});return result;}
 return async function api(path,options={}){
  const data=options.body?JSON.parse(options.body):{},method=options.method||'GET';
  if(path==='/api/session'){
   let session;try{session=await remote(path);}catch(error){session={status:'anonymous',profile:null,cloudReady:false,cloudMessage:error.message};}
   const local=store.read();if(session.profile){mode='member';return {...session,guestLeaguesAvailable:local.leagues.length,legacyAvailable:false};}
   if(local.active&&local.profile){mode='guest';return {...session,status:'guest',profile:local.profile,guestLeaguesAvailable:0,legacyAvailable:false};}
   mode='anonymous';return {...session,guestLeaguesAvailable:0,legacyAvailable:false};
  }
  if(path==='/api/auth/guest'){const result=await store.start(data.name||'Convidado');mode='guest';return result;}
  if(path==='/api/auth/logout'){if(mode==='member')await remote(path,options);await store.logout();mode='anonymous';return {loggedOut:true};}
  if(path==='/api/auth/login'||path==='/api/auth/register'){const result=await remote(path,options);mode='member';return result;}
  if(path==='/api/auth/claim-guest'){
   const account=await remote('/api/session');if(!account.profile)throw Error('Entre na conta para transferir as peladas.');
   const local=store.read();let claimed=0;
   for(const league of local.leagues){const target=await store.transferId(account.profile.id,league.id);let current=await remote('/api/leagues',{method:'POST',body:JSON.stringify({id:target,name:league.state.groupName})});
    if(current.revision===0)current=await remote('/api/leagues/'+target,{method:'PUT',body:JSON.stringify({revision:0,state:league.state})});
    if(JSON.stringify(canonical(current.state))!==JSON.stringify(canonical(league.state)))throw Error('A cópia na nuvem mudou. O backup local foi preservado; revise antes de transferir novamente.');
    await store.removeTransferred(league.id,league.revision);claimed++;
   }
   return {claimed};
  }
  if(mode==='guest'){
   if(path==='/api/profile')return store.updateProfile(data);
   if(path==='/api/leagues')return method==='POST'?store.create(data):store.list();
   const match=path.match(/^\/api\/leagues\/([^/]+)$/);if(match){if(method==='PUT')return store.save(match[1],data);if(method==='DELETE')return store.remove(match[1],data);return store.get(match[1]);}
  }
  return remote(path,options);
 };
}
