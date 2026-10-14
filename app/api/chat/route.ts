import { env } from 'cloudflare:workers';
export const dynamic = 'force-dynamic';
const json=(data:any,status=200,cookie?:string)=>Response.json(data,{status,headers:{'Cache-Control':'no-store',...(cookie?{'Set-Cookie':cookie}:{})}});
const cities=['Anywhere in Nigeria','Lagos','Ibadan','Oyo','Abuja','Port Harcourt','Other cities'];
const interests=['Anything','Music','Tech & design','Football','Movies','Campus life','Just vibes'];
export async function POST(req:Request){
 try {
 const db=env.DB!; const now=Date.now();
 if(req.headers.get('origin') && req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Please use Oya directly.'},403);
 let body:any;try{body=await req.json()}catch{return json({error:'Invalid request.'},400)}
 const id=req.headers.get('cookie')?.match(/(?:^|;\s*)oya_session=([a-f0-9-]{36})(?:;|$)/)?.[1];
 if(body.action==='init'){
 if(id && await db.prepare('SELECT id FROM sessions WHERE id=?').bind(id).first())return json({ready:true});
 const token=crypto.randomUUID(); await db.prepare('INSERT INTO sessions(id,seen) VALUES(?,?)').bind(token,now).run();
 return json({ready:true},200,`oya_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`);
 }
 if(!id)return json({error:'Refresh the page to start your session.'},401);
 let me:any=await db.prepare('SELECT * FROM sessions WHERE id=?').bind(id).first();
 if(!me)return json({error:'Session expired. Refresh and try again.'},401);
 const stop=async()=>{await db.batch([db.prepare("UPDATE sessions SET status='ended',peer=NULL WHERE peer=?").bind(id),db.prepare("UPDATE sessions SET status='idle',peer=NULL,room=NULL,seen=? WHERE id=?").bind(now,id)]);};
 if(body.action==='leave'){await stop();return json({status:'idle'})}
 if(body.action==='report'){
 if(!me.peer)return json({error:'There is no active person to report.'},400);
 if(!['Inappropriate content','Harassment','Spam or scam','Under 18','Block only'].includes(body.reason))return json({error:'Choose a reason.'},400);
 await db.prepare('INSERT INTO reports(id,reporter,target,reason,created) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),id,me.peer,body.reason,now).run();await stop();return json({status:'idle',reported:true});
 }
 if(body.action==='join'){
 if(body.adult!==true)return json({error:'Oya is for adults aged 18 and over.'},400);
 if(!['text','video'].includes(body.mode)||!cities.includes(body.city)||!interests.includes(body.interest))return json({error:'Choose valid chat preferences.'},400);
 await stop();
 await db.batch([db.prepare("UPDATE sessions SET status='waiting',mode=?,city=?,interest=?,seen=? WHERE id=?").bind(body.mode,body.city,body.interest,now,id),db.prepare('DELETE FROM messages WHERE created < ?').bind(now-86400000),db.prepare("UPDATE sessions SET status='idle',peer=NULL,room=NULL WHERE seen < ?").bind(now-45000)]);
 me=await db.prepare('SELECT * FROM sessions WHERE id=?').bind(id).first();
 }
 if(body.action==='poll'||body.action==='join'){
 await db.prepare('UPDATE sessions SET seen=? WHERE id=?').bind(now,id).run();
 if(me.status==='waiting'){
 const room=crypto.randomUUID();
 await db.batch([
 db.prepare("UPDATE sessions SET status='matched',peer=?,room=? WHERE id=(SELECT s.id FROM sessions s WHERE s.id!=? AND s.status='waiting' AND s.mode=? AND s.seen>? AND (?='Anything' OR s.interest='Anything' OR s.interest=?) AND NOT EXISTS(SELECT 1 FROM reports r WHERE (r.reporter=? AND r.target=s.id) OR (r.target=? AND r.reporter=s.id)) AND EXISTS(SELECT 1 FROM sessions mine WHERE mine.id=? AND mine.status='waiting') ORDER BY s.seen ASC LIMIT 1)").bind(id,room,id,me.mode,now-15000,me.interest,me.interest,id,id,id),
 db.prepare("UPDATE sessions SET status='matched',room=?,peer=(SELECT id FROM sessions WHERE peer=? AND room=? LIMIT 1) WHERE id=? AND status='waiting' AND EXISTS(SELECT 1 FROM sessions WHERE peer=? AND room=?)").bind(room,id,room,id,id,room)
 ]);
 }
 me=await db.prepare('SELECT * FROM sessions WHERE id=?').bind(id).first();
 let peer:any=null;
 if(me.status==='matched'){
 peer=await db.prepare('SELECT city,interest,seen,status,room,id FROM sessions WHERE id=?').bind(me.peer).first();
 if(!peer||peer.seen<now-30000||peer.status!=='matched'||peer.room!==me.room){await db.prepare("UPDATE sessions SET status='ended',peer=NULL WHERE id=?").bind(id).run();me.status='ended';peer=null;}
 }
 const cursor=Math.max(0,Number(body.cursor)||0);
 const rows=me.room?(await db.prepare('SELECT id,sender,kind,body FROM messages WHERE room=? AND id>? ORDER BY id LIMIT 100').bind(me.room,cursor).all()).results:[];
 return json({status:me.status,room:me.room,peer:peer?{city:peer.city,interest:peer.interest}:null,initiator:peer?id<peer.id:false,messages:rows.map((m:any)=>({id:m.id,kind:m.kind,body:m.body,mine:m.sender===id}))});
 }
 if(body.action==='send'){
 if(me.status!=='matched'||body.room!==me.room)return json({error:'Connect with someone first.'},409);
 const peer:any=await db.prepare('SELECT status,room,seen FROM sessions WHERE id=?').bind(me.peer).first();
 if(!peer||peer.status!=='matched'||peer.room!==me.room||peer.seen<now-30000)return json({error:'This conversation has ended.'},409);
 const kind=body.kind==='signal'?'signal':'text';const message=String(body.body??'').trim();
 if(!message||message.length>(kind==='signal'?30000:1000))return json({error:'Message is empty or too long.'},400);
 if(kind==='text' && now-me.last_sent<700)return json({error:'Please wait a moment before sending again.'},429);
 if(kind==='signal'&&me.mode!=='video')return json({error:'Video is not active.'},400);
 await db.batch([db.prepare('INSERT INTO messages(room,sender,kind,body,created) VALUES(?,?,?,?,?)').bind(me.room,id,kind,message,now),db.prepare('UPDATE sessions SET last_sent=? WHERE id=?').bind(now,id)]);
 return json({sent:true});
 }
 return json({error:'Unknown action.'},400);
 }catch(e){console.error('Chat request failed',e);return json({error:'Connection interrupted. Please try again.'},500)}
}
