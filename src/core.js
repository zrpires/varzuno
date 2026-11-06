export const POSITIONS = { GOL: 'Goleiro', ZAG: 'Zagueiro', LAT: 'Lateral', VOL: 'Volante', MEI: 'Meia', ATA: 'Atacante' };
export const COLORS = ['#b8ed57', '#ffb16a', '#8bbcff', '#c5a0fa'];
export const TEAM_NAMES = ['Time Lima', 'Time Laranja', 'Time Azul', 'Time Violeta'];
export const emptyState = () => ({ version: 1, groupName: 'Minha pelada', players: [], matches: [], draw: null });
export const id = () => crypto.randomUUID();
export function quality(overall) { return overall >= 90 ? 'Elite' : overall >= 75 ? 'Ouro' : overall >= 60 ? 'Prata' : 'Base'; }
export function bucket(position) { return position === 'GOL' ? 'GOL' : ['ZAG', 'LAT'].includes(position) ? 'DEF' : ['VOL', 'MEI'].includes(position) ? 'MEI' : 'ATA'; }
function ensure(condition, message) { if (!condition) throw Error(message); }
function str(value, max, min = 0) { ensure(typeof value === 'string' && value.trim().length >= min && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Texto inválido.'); return value.trim(); }
function ident(value) { ensure(typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value), 'Identificador inválido.'); return value; }
function integer(value, min, max) { ensure(Number.isInteger(value) && value >= min && value <= max, 'Número fora do intervalo permitido.'); return value; }
export function validDate(value) { ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T12:00:00Z')) && new Date(value + 'T12:00:00Z').toISOString().slice(0,10) === value, 'Data inválida.'); return value; }
function timestamp(value) { ensure(typeof value === 'string' && value.length <= 30 && Number.isFinite(Date.parse(value)), 'Horário inválido.'); return value; }
function position(value) { ensure(Object.hasOwn(POSITIONS, value), 'Posição inválida.'); return value; }
function rating(value) { if (value === null) return null; ensure(typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 10 && Math.abs(value * 10 - Math.round(value * 10)) < 1e-8, 'A nota deve estar entre 0 e 10, com uma casa decimal.'); return value; }
function unique(list, name) { ensure(new Set(list).size === list.length, `${name} duplicados.`); }
function list(value, max) { ensure(Array.isArray(value) && value.length <= max, 'Lista inválida ou muito grande.'); return value; }
function color(value) { ensure(COLORS.includes(value), 'Cor de time inválida.'); return value; }
export function score(match) { return match.teams.map((team, i) => team.players.reduce((sum, p) => sum + (p.played ? p.goals : 0), 0) + match.extraGoals[i]); }
export function validateState(value) {
  ensure(value && value.version === 1, 'Formato de dados incompatível.');
  const state = { version: 1, groupName: str(value.groupName, 60, 2), players: list(value.players, 300).map(p => {
    ensure(p && typeof p.active === 'boolean', 'Atleta inválido.');
    return { id: ident(p.id), name: str(p.name, 50, 2), position: position(p.position), overall: integer(p.overall, 1, 99), active: p.active, createdAt: timestamp(p.createdAt) };
  }), matches: [], draw: null };
  unique(state.players.map(p => p.id), 'Atletas');
  const known = new Set(state.players.map(p => p.id));
  state.matches = list(value.matches, 1000).map(m => {
    ensure(m && Array.isArray(m.teams) && m.teams.length === 2 && Array.isArray(m.extraGoals) && m.extraGoals.length === 2, 'Partida inválida.');
    const match = { id: ident(m.id), date: validDate(m.date), location: str(m.location, 100), notes: str(m.notes, 500), createdAt: timestamp(m.createdAt), updatedAt: timestamp(m.updatedAt), extraGoals: m.extraGoals.map(n => integer(n, 0, 30)), teams: m.teams.map(t => ({ id: ident(t.id), name: str(t.name, 40, 2), color: color(t.color), players: list(t.players, 60).map(p => {
      ensure(p && known.has(p.playerId) && typeof p.played === 'boolean', 'Atleta da partida não encontrado.');
      const row = { playerId: ident(p.playerId), name: str(p.name, 50, 2), position: position(p.position), overall: integer(p.overall, 1, 99), played: p.played, goals: integer(p.goals, 0, 30), assists: integer(p.assists, 0, 30), rating: rating(p.rating) };
      ensure(row.played || (row.goals === 0 && row.assists === 0 && row.rating === null), 'Quem não jogou não pode receber gols, assistências ou nota.');
      return row;
    }) })) };
    unique(match.teams.map(t => t.id), 'Times');
    unique(match.teams.flatMap(t => t.players.map(p => p.playerId)), 'Participantes');
    for (const team of match.teams) {
      ensure(team.players.some(p => p.played), 'Cada time precisa de pelo menos um participante.');
      const goals = team.players.reduce((n, p) => n + p.goals, 0), assists = team.players.reduce((n, p) => n + p.assists, 0);
      ensure(assists <= goals, 'O total de assistências não pode superar os gols com autoria do time.');
      for (const p of team.players) ensure(p.goals + p.assists <= goals, `${p.name}: não é possível dar assistência para o próprio gol.`);
    }
    return match;
  });
  unique(state.matches.map(m => m.id), 'Partidas');
  if (value.draw !== null) {
    const draw = value.draw;
    ensure(draw && Array.isArray(draw.teams) && draw.teams.length >= 2 && draw.teams.length <= 4, 'Sorteio inválido.');
    state.draw = { id: ident(draw.id), createdAt: timestamp(draw.createdAt), teams: draw.teams.map(t => ({ id: ident(t.id), name: str(t.name,40,2), color: color(t.color), playerIds: list(t.playerIds,60).map(p => { ensure(known.has(p), 'Atleta do sorteio não encontrado.'); return ident(p); }) })) };
    unique(state.draw.teams.map(t => t.id), 'Times');
    unique(state.draw.teams.flatMap(t => t.playerIds), 'Atletas sorteados');
    ensure(state.draw.teams.every(t => t.playerIds.length > 0), 'Todos os times precisam de atletas.');
    ensure(state.draw.teams.flatMap(t => t.playerIds).length <= 60, 'O sorteio aceita até 60 atletas.');
  }
  return state;
}

export function summarize(state, { from = '', minRated = 0 } = {}) {
  const rows = new Map(state.players.map(p => [p.id, { ...p, appearances: 0, goals: 0, assists: 0, wins: 0, draws: 0, losses: 0, points: 0, rated: 0, ratingSum: 0, average: null, contributions: 0 }]));
  for (const match of state.matches) {
    if (from && match.date < from) continue;
    const totals = score(match);
    match.teams.forEach((team, i) => team.players.filter(p => p.played).forEach(p => {
      const row = rows.get(p.playerId); if (!row) return;
      row.appearances++; row.goals += p.goals; row.assists += p.assists;
      if (p.rating !== null) { row.rated++; row.ratingSum += p.rating; }
      if (totals[i] > totals[1-i]) { row.wins++; row.points += 3; }
      else if (totals[i] === totals[1-i]) { row.draws++; row.points++; }
      else row.losses++;
    }));
  }
  return Array.from(rows.values()).map(r => ({ ...r, average: r.rated ? r.ratingSum / r.rated : null, contributions: r.goals + r.assists })).filter(r => !minRated || r.rated >= minRated);
}

function shuffle(values, rng) { const a = [...values]; for (let i = a.length-1; i > 0; i--) { const j = Math.floor(rng() * (i+1)); [a[i],a[j]] = [a[j],a[i]]; } return a; }
function teamCost(teams, roster) {
  const avgs = teams.map(t => t.reduce((sum, p) => sum + p.overall,0) / t.length);
  const mean = avgs.reduce((a,b)=>a+b,0)/teams.length;
  const ratingCost = avgs.reduce((sum,n)=>sum+(n-mean)**2,0);
  let roles = 0;
  for (const role of ['DEF','MEI','ATA']) {
    const total = roster.filter(p=>bucket(p.position)===role).length / roster.length;
    roles += teams.reduce((sum,t)=>sum+(t.filter(p=>bucket(p.position)===role).length-t.length*total)**2,0);
  }
  return ratingCost + roles * 7;
}
export function balancedDraw(players, count = 2, rng = Math.random) {
  integer(count,2,4); ensure(players.length >= count * 2, `Selecione ao menos ${count*2} atletas para ${count} times.`);
  ensure(players.length <= 60, 'Selecione no máximo 60 atletas.'); unique(players.map(p=>p.id),'Atletas');
  let best, bestCost = Infinity;
  for (let attempt=0; attempt<70; attempt++) {
    const offsets = shuffle(Array.from({length:count},(_,i)=>i),rng);
    const caps = Array.from({length:count},(_,i)=>Math.floor(players.length/count)+(offsets.indexOf(i)<players.length%count?1:0));
    const teams=Array.from({length:count},()=>[]);
    const keepers=shuffle(players.filter(p=>p.position==='GOL'),rng).sort((a,b)=>b.overall-a.overall);
    for(const p of keepers) {
      const choices=shuffle(Array.from({length:count},(_,i)=>i),rng).filter(i=>teams[i].length<caps[i]);
      choices.sort((a,b)=>teams[a].filter(p=>p.position==='GOL').length-teams[b].filter(p=>p.position==='GOL').length || teams[a].reduce((s,p)=>s+p.overall,0)/caps[a]-teams[b].reduce((s,p)=>s+p.overall,0)/caps[b]);
      teams[choices[0]].push(p);
    }
    const field=shuffle(players.filter(p=>p.position!=='GOL'),rng).map(p=>({p,key:p.overall+rng()*8})).sort((a,b)=>b.key-a.key).map(x=>x.p);
    for(const p of field) {
      const choices=shuffle(Array.from({length:count},(_,i)=>i),rng).filter(i=>teams[i].length<caps[i]);
      choices.sort((a,b)=>{
        const cost=i=>teams[i].reduce((s,x)=>s+x.overall,0)/caps[i]+teams[i].filter(x=>bucket(x.position)===bucket(p.position)).length*4;
        return cost(a)-cost(b);
      });
      teams[choices[0]].push(p);
    }
    let cost=teamCost(teams,players);
    for(let step=0;step<100;step++) {
      const a=Math.floor(rng()*count),b=Math.floor(rng()*count);if(a===b)continue;
      const x=Math.floor(rng()*teams[a].length),y=Math.floor(rng()*teams[b].length);
      if((teams[a][x].position==='GOL')!==(teams[b][y].position==='GOL'))continue;
      [teams[a][x],teams[b][y]]=[teams[b][y],teams[a][x]];
      const next=teamCost(teams,players);
      if(next<=cost)cost=next;else [teams[a][x],teams[b][y]]=[teams[b][y],teams[a][x]];
    }
    if(cost<bestCost) { bestCost=cost; best=teams.map(t=>[...t]); }
  }
  const teams=shuffle(best,rng).map((players,i)=>({id:id(),name:TEAM_NAMES[i],color:COLORS[i],playerIds:players.sort((a,b)=>['GOL','DEF','MEI','ATA'].indexOf(bucket(a.position))-['GOL','DEF','MEI','ATA'].indexOf(bucket(b.position))||b.overall-a.overall).map(p=>p.id)}));
  return {id:id(),createdAt:new Date().toISOString(),teams};
}
export function swapPlayers(draw, a, b) {
  ensure(a!==b,'Escolha dois atletas diferentes.');
  const copy=structuredClone(draw),ta=copy.teams.find(t=>t.playerIds.includes(a)),tb=copy.teams.find(t=>t.playerIds.includes(b));
  ensure(ta&&tb&&ta.id!==tb.id,'Escolha atletas de times diferentes.');
  const ai=ta.playerIds.indexOf(a),bi=tb.playerIds.indexOf(b);ta.playerIds[ai]=b;tb.playerIds[bi]=a;return copy;
}
export function fromDraw(state,a,b,date) {
  ensure(state.draw&&a!==b,'Escolha dois times diferentes.');
  const teams=[a,b].map(teamId=>state.draw.teams.find(t=>t.id===teamId));ensure(teams.every(Boolean),'Time não encontrado.');
  return { id:id(),date:validDate(date),location:'',notes:'',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),extraGoals:[0,0],teams:teams.map(t=>({id:t.id,name:t.name,color:t.color,players:t.playerIds.map(playerId=>{const p=state.players.find(p=>p.id===playerId);ensure(p&&p.active,'Há atleta arquivado no sorteio. Sorteie novamente.');return {playerId:p.id,name:p.name,position:p.position,overall:p.overall,played:true,goals:0,assists:0,rating:null};})})) };
}
export function teamSummary(team,players) { const roster=team.playerIds.map(id=>players.find(p=>p.id===id)).filter(Boolean);return {count:roster.length,average:roster.length?roster.reduce((s,p)=>s+p.overall,0)/roster.length:0,keepers:roster.filter(p=>p.position==='GOL').length}; }
export function demoState(today) {
  const now=new Date().toISOString();
  const seed=[['Breno','GOL',82],['Caio','GOL',79],['Davi','ZAG',78],['Gui','ZAG',74],['Léo','LAT',83],['Rafa','LAT',76],['Nando','VOL',81],['Pedro','VOL',72],['Vini','MEI',86],['Iago','MEI',80],['Lucas','ATA',87],['Theo','ATA',77]];
  const state={...emptyState(),groupName:'Pelada de exemplo',players:seed.map(([name,position,overall],i)=>({id:'demo-'+i,name,position,overall,active:true,createdAt:now}))};
  state.draw=balancedDraw(state.players,2);
  const match=fromDraw(state,state.draw.teams[0].id,state.draw.teams[1].id,today);
  for(const [i,team] of match.teams.entries()) { const scorer=team.players.find(p=>p.position==='ATA')||team.players.at(-1),helper=team.players.find(p=>p.playerId!==scorer.playerId&&p.position!=='GOL')||team.players[0];scorer.goals=i===0?3:2;helper.assists=i===0?2:1;for(const p of team.players)p.rating=Math.min(10,6.5+(p.goals?1.5:0)+(p.assists?1:0)); }
  state.matches=[match];return validateState(state);
}
