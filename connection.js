(() => {
 'use strict';
 const channel='mu-procurement-overview-v1',timeoutMs=16000;
 let active=null;
 const nonce=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 function checkedGoogle(origin){
  let u;try{u=new URL(origin);}catch{return false;}
  return u.protocol==='https:'&&!u.port&&(u.hostname==='script.google.com'||u.hostname==='script.googleusercontent.com'||/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(u.hostname));
 }
 function isBelow(source,root){
  if(!source||!root)return false;
  try{for(let n=0;n<7;n++){if(source===root)return true;const parent=source.parent;if(!parent||parent===source)return false;source=parent;}}catch{return false;}
  return false;
 }
 function disconnect(error){
  const a=active;if(!a)return; active=null;
  clearTimeout(a.timer);window.removeEventListener('message',a.listener);a.frame.remove();
  a.reject(Error(error));for(const p of a.pending.values()){clearTimeout(p.timer);p.reject(Error(error));}a.pending.clear();
 }
 function connect(){
  if(active)return active;
  let u;try{u=new URL(window.PROCUREMENT_DASHBOARD?.webAppUrl||'');}catch{throw Error('standalone');}
  if(location.protocol!=='https:'||u.origin!=='https://script.google.com'||u.search||u.hash||u.username||u.password||
     !/^\/(?:macros\/s|a\/macros\/mahidol\.ac\.th\/s)\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname))throw Error('standalone');
  const token=nonce();u.searchParams.set('mode','overview-bridge');u.searchParams.set('origin',location.origin);u.searchParams.set('nonce',token);
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='อ่านข้อมูล Mahidol แบบอ่านอย่างเดียว';frame.referrerPolicy='no-referrer';frame.src=u.href;
  const a={token,frame,peer:null,origin:null,pending:new Map()};
  a.ready=new Promise((resolve,reject)=>{a.resolve=resolve;a.reject=reject;});
  a.listener=event=>{
   const m=event.data;if(active!==a||!m||m.channel!==channel||m.nonce!==token||!checkedGoogle(event.origin))return;
   if(m.type==='ready'&&!a.peer&&isBelow(event.source,frame.contentWindow)){
    a.peer=event.source;a.origin=event.origin;clearTimeout(a.timer);a.resolve();return;
   }
   if(m.type!=='result'||event.source!==a.peer||event.origin!==a.origin)return;
   const p=a.pending.get(m.requestId);if(!p)return;clearTimeout(p.timer);a.pending.delete(m.requestId);p.resolve(m.result);
  };
  active=a;window.addEventListener('message',a.listener);document.body.append(frame);
  a.timer=setTimeout(()=>{if(active===a)disconnect('timeout');},timeoutMs);return a;
 }
 async function read(filters){
  const a=connect();await a.ready;if(active!==a)throw Error('connection');
  const requestId=nonce();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{if(active===a)disconnect('timeout');},timeoutMs);
   a.pending.set(requestId,{timer,resolve,reject});
   a.peer.postMessage({channel,nonce:a.token,type:'read',filters,requestId},a.origin);
  });
 }
 window.ProcurementConnection={read};
})();
