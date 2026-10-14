import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {transpileModule,ModuleKind,ScriptTarget} from 'typescript';
import assert from 'node:assert/strict';
const database=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(x=>x.endsWith('.sql')))database.exec(readFileSync('drizzle/'+f,'utf8'));
function prepare(sql){return {bind(...args){const statement=database.prepare(sql);return {first:async()=>statement.get(...args)||null,all:async()=>({results:statement.all(...args)}),run:async()=>statement.run(...args),_run:()=>statement.run(...args)}}}}
globalThis.testEnv={DB:{prepare,batch:async statements=>{database.exec('BEGIN');try{const result=statements.map(s=>s._run());database.exec('COMMIT');return result}catch(e){database.exec('ROLLBACK');throw e}}}};
const source=readFileSync('app/api/chat/route.ts','utf8').replace("import { env } from 'cloudflare:workers';","const env = globalThis.testEnv;");
const compiled=transpileModule(source,{compilerOptions:{module:ModuleKind.ESNext,target:ScriptTarget.ES2022}}).outputText;
const {POST}=await import('data:text/javascript;base64,'+Buffer.from(compiled).toString('base64'));
async function call(cookie,body){const response=await POST(new Request('https://oya.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://oya.test',...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)}));return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]}}
async function session(){return (await call(null,{action:'init'})).cookie}
const a=await session(),b=await session(),c=await session();
const prefs={mode:'text',city:'Lagos',interest:'Music',adult:true};
assert.equal((await call(a,{action:'join',...prefs,adult:false})).status,400);
assert.equal((await call(a,{action:'join',...prefs})).data.status,'waiting');
const match=await call(b,{action:'join',...prefs});assert.equal(match.data.status,'matched');
const ap=await call(a,{action:'poll'});assert.equal(ap.data.status,'matched');assert.equal(ap.data.room,match.data.room);
assert.equal((await call(c,{action:'send',room:match.data.room,body:'intruder'})).status,409);
assert.equal((await call(a,{action:'send',room:'old-room',body:'stale'})).status,409);
assert.equal((await call(a,{action:'send',room:ap.data.room,body:'Hello from Lagos!'})).status,200);
const bp=await call(b,{action:'poll'});assert.equal(bp.data.messages[0].body,'Hello from Lagos!');assert.equal(bp.data.messages[0].mine,false);
assert.equal((await call(b,{action:'poll',cursor:bp.data.messages[0].id})).data.messages.length,0);
assert.equal((await call(c,{action:'join',...prefs})).data.status,'waiting');
assert.equal((await call(a,{action:'poll'})).data.room,ap.data.room);
await call(a,{action:'report',reason:'Harassment'});assert.equal((await call(b,{action:'poll'})).data.status,'ended');
await call(c,{action:'leave'});
assert.equal((await call(a,{action:'join',...prefs})).data.status,'waiting');
assert.equal((await call(b,{action:'join',...prefs})).data.status,'waiting');
assert.equal((await call(c,{action:'join',...prefs,interest:'Football'})).data.status,'waiting');
await call(a,{action:'leave'});await call(b,{action:'leave'});await call(c,{action:'leave'});
assert.equal((await call(a,{action:'join',...prefs,mode:'video'})).data.status,'waiting');
assert.equal((await call(c,{action:'join',...prefs,mode:'video'})).data.status,'matched');
const av=await call(a,{action:'poll'});assert.equal((await call(a,{action:'send',room:av.data.room,kind:'signal',body:JSON.stringify({description:{type:'offer',sdp:'test'}})})).status,200);
assert.equal((await call(c,{action:'poll'})).data.messages[0].kind,'signal');
database.prepare('UPDATE sessions SET seen=? WHERE id=?').run(Date.now()-40000,c.split('=')[1]);assert.equal((await call(a,{action:'poll'})).data.status,'ended');
console.log('PASS: age gate, matching, room access, messages, cursors, blocked rematching, interests, video signaling, stale-peer cleanup.');
