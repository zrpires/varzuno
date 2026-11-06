import {emptyState,validateState} from '../src/core.js';
import {HttpError,name,leagueId,revision} from '../src/http.js';
const now=()=>new Date().toISOString();
const rows=result=>result.results||[];
const guard='EXISTS (SELECT 1 FROM leagues WHERE id=? AND owner_id=? AND write_token=?)';
function prepared(db,query,...params){return db.prepare(query).bind(...params);}
export async function listLeagues(db,user){return (await db.prepare(`SELECT l.id,l.name,l.revision,l.created_at,l.updated_at,
 (SELECT count(*) FROM athletes a WHERE a.league_id=l.id AND a.active=true) AS active_players,
 (SELECT count(*) FROM matches m WHERE m.league_id=l.id) AS match_count
 FROM leagues l WHERE l.owner_id=? ORDER BY l.updated_at DESC,l.id`).bind(user.id).all()).results;}
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
 const state={...emptyState(),groupName:league.name,players:rows(result[1]).map(p=>({id:p.id,name:p.name,position:p.position,overall:p.overall,active:p.active===true,createdAt:p.created_at})),matches:[]};
 const perf=new Map();for(const p of rows(result[4])){const k=p.match_id+':'+p.team_slot;if(!perf.has(k))perf.set(k,[]);perf.get(k).push({playerId:p.player_id,name:p.snapshot_name,position:p.snapshot_position,overall:p.snapshot_overall,played:p.played===true,goals:p.goals,assists:p.assists,rating:p.rating});}
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
  prepared(db,`INSERT INTO athletes(league_id,id,name,position,overall,active,created_at) SELECT ?,p.value->>'id',p.value->>'name',p.value->>'position',(p.value->>'overall')::integer,(p.value->>'active')::boolean,p.value->>'createdAt' FROM jsonb_array_elements(?::jsonb) p(value) WHERE ${guard}`,key,players,...args),
  prepared(db,`INSERT INTO matches(league_id,id,date,location,notes,extra_a,extra_b,created_at,updated_at) SELECT ?,m.value->>'id',m.value->>'date',m.value->>'location',m.value->>'notes',(m.value->'extraGoals'->>0)::integer,(m.value->'extraGoals'->>1)::integer,m.value->>'createdAt',m.value->>'updatedAt' FROM jsonb_array_elements(?::jsonb) m(value) WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO match_teams(league_id,match_id,slot,id,name,color) SELECT ?,m.value->>'id',(t.ord-1)::integer,t.value->>'id',t.value->>'name',t.value->>'color' FROM jsonb_array_elements(?::jsonb) m(value),LATERAL jsonb_array_elements(m.value->'teams') WITH ORDINALITY t(value,ord) WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO performances(league_id,match_id,team_slot,player_id,ordinal,snapshot_name,snapshot_position,snapshot_overall,played,goals,assists,rating) SELECT ?,m.value->>'id',(t.ord-1)::integer,p.value->>'playerId',(p.ord-1)::integer,p.value->>'name',p.value->>'position',(p.value->>'overall')::integer,(p.value->>'played')::boolean,(p.value->>'goals')::integer,(p.value->>'assists')::integer,(p.value->>'rating')::double precision FROM jsonb_array_elements(?::jsonb) m(value),LATERAL jsonb_array_elements(m.value->'teams') WITH ORDINALITY t(value,ord),LATERAL jsonb_array_elements(t.value->'players') WITH ORDINALITY p(value,ord) WHERE ${guard}`,key,matches,...args),
  prepared(db,`INSERT INTO draws(league_id,id,created_at) SELECT ?,?::jsonb->>'id',?::jsonb->>'createdAt' WHERE jsonb_typeof(?::jsonb)='object' AND ${guard}`,key,draw,draw,draw,...args),
  prepared(db,`INSERT INTO draw_teams(league_id,slot,id,name,color) SELECT ?,(t.ord-1)::integer,t.value->>'id',t.value->>'name',t.value->>'color' FROM jsonb_array_elements(?::jsonb->'teams') WITH ORDINALITY t(value,ord) WHERE ${guard}`,key,draw,...args),
  prepared(db,`INSERT INTO draw_players(league_id,team_slot,player_id,ordinal) SELECT ?,(t.ord-1)::integer,p.value#>>'{}',(p.ord-1)::integer FROM jsonb_array_elements(?::jsonb->'teams') WITH ORDINALITY t(value,ord),LATERAL jsonb_array_elements(t.value->'playerIds') WITH ORDINALITY p(value,ord) WHERE ${guard}`,key,draw,...args),
 ];
 let result;try{result=await db.batch(batch);}catch(error){if(error.code==='40001')throw new HttpError(409,'Alteração concorrente detectada. Recarregue antes de salvar.');throw error;}
 if(!result[0].meta.changes){const exists=await db.prepare('SELECT id FROM leagues WHERE id=? AND owner_id=?').bind(key,user.id).first();throw new HttpError(exists?409:404,exists?'Os registros mudaram em outra aba ou dispositivo. Recarregue antes de salvar.':'Pelada não encontrada nesta conta.');}
 return {id:key,state:clean,revision:expected+1};
}
export async function deleteLeague(db,user,key,input){leagueId(key);const expected=revision(input.revision);const result=await db.prepare('DELETE FROM leagues WHERE id=? AND owner_id=? AND revision=? RETURNING id').bind(key,user.id,expected).first();if(!result){const row=await db.prepare('SELECT id FROM leagues WHERE id=? AND owner_id=?').bind(key,user.id).first();throw new HttpError(row?409:404,row?'A pelada mudou. Recarregue a lista antes de excluir.':'Pelada não encontrada nesta conta.');}return {deleted:true};}
