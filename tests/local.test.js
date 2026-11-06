import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalStore} from '../dist/local-store.js';
import {demoState,emptyState} from '../src/core.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};};
test('guest local persists several leagues and scores across store recreation',async()=>{const memory=storage(),a=createLocalStore(memory);await a.start('Turma');const id=crypto.randomUUID(),two=crypto.randomUUID();await a.create({id,name:'Uma'});await a.create({id:two,name:'Duas'});await a.save(id,{revision:0,state:demoState('2026-11-06')});const b=createLocalStore(memory);assert.equal((await b.list()).leagues.length,2);assert.equal((await b.get(id)).state.matches.length,1);assert.equal((await b.get(two)).state.matches.length,0);});
test('stale local writes and blocked storage do not claim successful save',async()=>{const a=createLocalStore(storage());await a.start('Turma');const id=crypto.randomUUID();await a.create({id,name:'Uma'});await a.save(id,{revision:0,state:emptyState()});await assert.rejects(a.save(id,{revision:0,state:emptyState()}),/mudou/);const blocked=createLocalStore({getItem:()=>null,setItem:()=>{throw Error('denied');}});await assert.rejects(blocked.start('Turma'),/salvar/);});
