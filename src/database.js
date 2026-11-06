import {emptyState,validateState} from './core.js';
import {HttpError,name,leagueId,revision} from './http.js';
import {now} from './auth.js';
const rows=result=>result.results||[];
const guard='EXISTS (SELECT 1 FROM leagues WHERE id=? AND owner_id=? AND write_token=?)';
function prepared(db,query,...params){return db.prepare(query).bind(...params);}
export async function listLeagues(db,user){return (await db.prepare(`SELECT l.id,l.name,l.revision,l.created_at,l.updated_at,
 (SELECT count(*) FROM athletes a WHERE a.league_id=l.id AND a.active=1) AS active_players,
 (SELECT count(*) FROM matches m WHERE m.league_id=l.id) AS match_count
 FROM leagues l WHERE l.owner_id=? AND (l.legacy_subject IS NULL OR l.revision>0) ORDER BY l.updated_at DESC,l.id`).bind(user.id).all()).results;}
export async function createLeague(db,user,input){
 const key=leagueId(input.id),title=name(input.name,60),limit=user.kind==='guest'?5:50,time=now();
 const existing=await db.prepare('SELECT id,owner_id FROM leagues WHERE id=?').bind(key).first();
 if(existing){if(existing.owner_id!==user.id)throw new HttpError(409,'Identificador de criação já utilizado.');return readLeague(db,user,key);}
 const result=await db.prepare('INSERT INTO leagues (id,owner_id,name,revision,write_token,created_at,updated_at) SELECT ?,?,?,0,?,?,? WHERE (SELECT count(*) FROM leagues WHERE owner_id=?)<? ON CONFLICT(id) DO NOTHING RETURNING id').bind(key,user.id,title,'',time,time,user.id,limit).first();
 if(!result)throw new HttpError(409,`Limite de ${limit} peladas atingido ou criação já em andamento. Recarregue a lista.`);
 return readLeague(db,user,key);
}
export async function readLeague(db,user,key){
 leagueId(key);
 const access='EXISTS (SELECT 1 FROM leagues l WHERE l.id=? AND l.owner_id=?)';
 const result=await db.batch([
  prepared(db,'SELECT * FROM leagues WHERE id=? AND owner_id=?',key,user.id),
  prepared(db,`SELECT * FROM athletes WHERE league_id=? AND ${access} ORDER BY created_at,id`,key,key,user.id),
  prepared(db,`SELECT * FROM matches WHERE league_id=? AND ${access} ORDER BY created_at,id`,key,key,user.id),
  prepared(db,`SELECT * FROM match_teams WHERE league_id=? AND ${access} ORDER BY match_id,slot`,key,key,user.id),
  prepared(db,`SELECT * FROM performances WHERE league_id=? AND ${access} ORDER BY match_id,team_slot,ordinal`,key,key,user.id),
  prepared(db,`SELECT * FROM draws WHERE league_id=? AND ${access}`,key,key,user.id),
  prepared(db,`SELECT * FROM draw_teams WHERE league_id=? AND ${access} ORDER BY slot`,key,key,user.id),
  prepared(db,`SELECT * FROM draw_players WHERE league_id=? AND ${access} ORDER BY team_slot,ordinal`,key,key,user.id),
 ]);
 const league=rows(result[0])[0];if(!league)throw new HttpError(404,'Pelada não encontrada nesta conta.');
 const state={...emptyState(),groupName:league.name,players:rows(result[1]).map(p=>({id:p.id,name:p.name,position:p.position,overall:p.overall,active:p.active===1,createdAt:p.created_at})),matches:[]};
 const perf=new Map();for(const p of rows(result[4])){const k=p.match_id+':'+p.team_slot;if(!perf.has(k))perf.set(k,[]);perf.get(k).push({playerId:p.player_id,name:p.snapshot_name,position:p.snapshot_position,overall:p.snapshot_overall,played:p.played===1,goals:p.goals,assists:p.assists,rating:p.rating});}
 const teams=new Map();for(const t of rows(result[3])){if(!teams.has(t.match_id))teams.set(t.match_id,[]);teams.get(t.match_id).push({id:t.id,name:t.name,color:t.color,players:perf.get(t.match_id+':'+t.slot)||[]});}
 state.matches=rows(result[2]).map(m=>({id:m.id,date:m.date,location:m.location,notes:m.notes,createdAt:m.created_at,updatedAt:m.updated_at,extraGoals:[m.extra_a,m.extra_b],teams:teams.get(m.id)||[]}));
 const draw=rows(result[5])[0];if(draw)state.draw={id:draw.id,createdAt:draw.created_at,teams:rows(result[6]).map(t=>({id:t.id,name:t.name,color:t.color,playerIds:rows(result[7]).filter(p=>p.team_slot===t.slot).map(p=>p.player_id)}))};
 return {id:key,state:validateState(state),revision:league.revision};
}
export async function saveLeague(db,user,key,input){
 leagueId(key);const expected=revision(input.revision);let clean;try{clean=validateState(input.state);}catch(e){throw new HttpError(400,e.message);}
 const token=crypto.randomUUID(),args=[key,user.id,token],players=JSON.stringify(clean.players),matches=JSON.stringify(clean.matches),draw=JSON.stringify(clean.draw),time=now();
 const batch=[
  prepared(db,'UPDATE leagues SET name=?,revision=revision+1,write_token=?,updated_at=? WHERE id=? AND owner_id=? AND revision=?',clean.groupName,token,time,key,user.id,expected),
  prepared(db,`DELETE FROM draws WHERE league_id=? AND ${guard}`,key,...args),
  prepared(db,`DELETE FROM matches WHERE league_id=? AND ${guard}`,key,...args),
  prepared(db,`DELETE FROM athletes WHERE league_id=? AND ${guard}`,key,...args),
  prepared(db,`INSERT INTO athletes (league_id,id,name,position,overall,active,created_at) SELECT ?,json_extract(p.value,'$.id'),json_extract(p.value,'$.name'),json_extract(p.value,'$.position'),json_extract(p.value,'$.overall'),json_extract(p.value,'$.active'),json_extract(p.value,'$.createdAt') FROM json_each(?) p WHERE ${guard}`,key,players,...args),
  prepared(db,`INSERT INTO matches (league_id,id,date,location,notes,extra_a,extra_b,created_at,updated_at) SELECT ?,json_extract(m.value,'$.id'),json_extract(m.value,'$.date'),json_extract(m.value,'$.location'),json_extract(m.value,'$.notes'),json_extract(m.value,'$.extraGoals[0]'),json_extract(m.value,'$.extraGoals[1]'),json_extract(m.value,'$.createdAt'),json_extract(m.value,'$.updatedAt') FROM json_each(?) m WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO match_teams (league_id,match_id,slot,id,name,color) SELECT ?,json_extract(m.value,'$.id'),CAST(t.key AS INTEGER),json_extract(t.value,'$.id'),json_extract(t.value,'$.name'),json_extract(t.value,'$.color') FROM json_each(?) m,json_each(m.value,'$.teams') t WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO performances (league_id,match_id,team_slot,player_id,ordinal,snapshot_name,snapshot_position,snapshot_overall,played,goals,assists,rating) SELECT ?,json_extract(m.value,'$.id'),CAST(t.key AS INTEGER),json_extract(p.value,'$.playerId'),CAST(p.key AS INTEGER),json_extract(p.value,'$.name'),json_extract(p.value,'$.position'),json_extract(p.value,'$.overall'),json_extract(p.value,'$.played'),json_extract(p.value,'$.goals'),json_extract(p.value,'$.assists'),json_extract(p.value,'$.rating') FROM json_each(?) m,json_each(m.value,'$.teams') t,json_each(t.value,'$.players') p WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO draws (league_id,id,created_at) SELECT ?,json_extract(?,'$.id'),json_extract(?,'$.createdAt') WHERE json_type(?)='object' AND ${guard}`,key,draw,draw,draw,...args),
  prepared(db,`INSERT INTO draw_teams (league_id,slot,id,name,color) SELECT ?,CAST(t.key AS INTEGER),json_extract(t.value,'$.id'),json_extract(t.value,'$.name'),json_extract(t.value,'$.color') FROM json_each(?,'$.teams') t WHERE ${guard}`,key,draw,...args),
  prepared(db,`INSERT INTO draw_players (league_id,team_slot,player_id,ordinal) SELECT ?,CAST(t.key AS INTEGER),p.value,CAST(p.key AS INTEGER) FROM json_each(?,'$.teams') t,json_each(t.value,'$.playerIds') p WHERE ${guard}`,key,draw,...args),
 ];
 const result=await db.batch(batch);
 if(!result[0].meta.changes){const exists=await db.prepare('SELECT id FROM leagues WHERE id=? AND owner_id=?').bind(key,user.id).first();throw new HttpError(exists?409:404,exists?'Os registros mudaram em outra aba ou dispositivo. Recarregue antes de salvar.':'Pelada não encontrada nesta conta.');}
 return {id:key,state:clean,revision:expected+1};
}
export async function deleteLeague(db,user,key,input){leagueId(key);const expected=revision(input.revision);const result=await db.prepare('DELETE FROM leagues WHERE id=? AND owner_id=? AND revision=? RETURNING id').bind(key,user.id,expected).first();if(!result){const row=await db.prepare('SELECT id FROM leagues WHERE id=? AND owner_id=?').bind(key,user.id).first();throw new HttpError(row?409:404,row?'A pelada mudou. Recarregue a lista antes de excluir.':'Pelada não encontrada nesta conta.');}return {deleted:true};}
export async function migrateLegacy(db,user){
 if(user.kind!=='chatgpt'||!user.subject)throw new HttpError(403,'Entre com ChatGPT para recuperar a pelada da versão anterior.');
 let existing=await db.prepare('SELECT id,revision FROM leagues WHERE legacy_subject=? AND owner_id=?').bind(user.subject,user.id).first();
 if(existing&&existing.revision>0)return {migrated:true,league:await readLeague(db,user,existing.id)};
 const legacy=await db.prepare('SELECT data FROM peladas WHERE owner_id=?').bind(user.subject).first();if(!legacy)throw new HttpError(404,'Não há registros da versão anterior nesta conta.');
 let clean;try{clean=validateState(JSON.parse(legacy.data));}catch{throw new HttpError(422,'O registro antigo precisa ser revisado antes da importação. A cópia original foi preservada.');}
 if(!existing){
  const key=crypto.randomUUID(),time=now();
  await db.prepare('INSERT INTO leagues (id,owner_id,name,revision,write_token,created_at,updated_at,legacy_subject) SELECT ?,?,?,0,?,?,?,? WHERE (SELECT count(*) FROM leagues WHERE owner_id=?)<50 ON CONFLICT(legacy_subject) DO NOTHING').bind(key,user.id,clean.groupName,'',time,time,user.subject,user.id).run();
  existing=await db.prepare('SELECT id,revision FROM leagues WHERE legacy_subject=? AND owner_id=?').bind(user.subject,user.id).first();
 }
 if(!existing)throw new HttpError(409,'Não foi possível reservar a importação. Confira o limite de 50 peladas.');
 if(existing.revision>0)return {migrated:true,league:await readLeague(db,user,existing.id)};
 try{return {migrated:true,league:await saveLeague(db,user,existing.id,{revision:0,state:clean})};}
 catch(error){if(error.status===409){const saved=await readLeague(db,user,existing.id);if(saved.revision>0)return {migrated:true,league:saved};}throw error;}
}
