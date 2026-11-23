(() => {
 'use strict';
 const channel='mu-contractor-dashboard-v2';
 let transport=null;
 const timeoutMs=18000;
 const nonce=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
 function trustedOrigin(value){
  let url;try{url=new URL(value);}catch{return false;}
  return url.protocol==='https:'&&(!url.port)&&(url.hostname==='script.google.com'||url.hostname==='script.googleusercontent.com'||/^[a-z0-9-]+-script\.googleusercontent\.com$/.test(url.hostname));
 }
 function isDescendant(source,expectedRoot){
  if(!source||!expectedRoot)return false;
  try{for(let i=0;i<7;i++){if(source===expectedRoot)return true;const next=source.parent;if(!next||next===source)return false;source=next;}}catch{}
  return false;
 }
 function connectionUrl(token,mode){
  const value=window.CONTRACT_DASHBOARD?.webAppUrl;
  if(!value)throw Error('not-configured');
  let u;try{u=new URL(value);}catch{throw Error('not-configured');}
  if(u.origin!=='https://script.google.com'||u.username||u.password||u.search||u.hash||
     !/^\/(?:macros\/s|a\/macros\/mahidol\.ac\.th\/s)\/[A-Za-z0-9_-]+\/exec$/.test(u.pathname)) throw Error('not-configured');
  if(location.protocol!=='https:'&&!(location.protocol==='http:'&&['127.0.0.1','localhost'].includes(location.hostname)))throw Error('not-configured');
  u.searchParams.set('mode','bridge');u.searchParams.set('origin',location.origin);u.searchParams.set('nonce',token);
  u.searchParams.set('transport',mode);
  return u;
 }
 function disconnect(message='disconnected'){
  if(!transport)return;
  let a=transport;transport=null;window.removeEventListener('message',a.listener);clearTimeout(a.readyTimer);
  if(a.frame)a.frame.remove();
  try{if(a.popup&&!a.popup.closed)a.popup.close();}catch{}
  a.readyReject(Error(message));
  for(const req of a.pending.values()){clearTimeout(req.timer);req.reject(Error(message));}
  a.pending.clear();
 }
 function connect(mode){
  if(mode==='popup')disconnect();
  if(transport)return transport;
  const token=nonce(),url=connectionUrl(token,mode);
  const a={token,pending:new Map(),root:null,peer:null,origin:null};
  a.ready=new Promise((resolve,reject)=>{a.readyResolve=resolve;a.readyReject=reject;});
  // State retained only in this tab's memory.
  a.listener=event=>{
   const m=event.data;
   if(transport!==a||!m||m.channel!==channel||m.nonce!==token||!trustedOrigin(event.origin))return;
   if(m.type==='ready'&&!a.peer&&isDescendant(event.source,a.root)){
    a.peer=event.source;a.origin=event.origin;clearTimeout(a.readyTimer);a.readyResolve();return;
   }
   if(m.type!=='result'||event.source!==a.peer||event.origin!==a.origin)return;
   const req=a.pending.get(m.requestId);if(!req)return;
   clearTimeout(req.timer);a.pending.delete(m.requestId);req.resolve(m.result);
  };
  transport=a;window.addEventListener('message',a.listener);
  if(mode==='popup'){
   a.popup=window.open(url.href,'_blank','popup,width=620,height=690');
   if(!a.popup){disconnect('popup');return a;}
   a.root=a.popup;
  }else{
   const frame=document.createElement('iframe');frame.hidden=true;frame.title='เชื่อมข้อมูลมหิดล';frame.referrerPolicy='no-referrer';frame.src=url.href;
   a.frame=frame;document.body.append(frame);a.root=frame.contentWindow;
  }
  a.readyTimer=setTimeout(()=>{if(transport===a)disconnect('timeout');},mode==='popup'?120000:timeoutMs);
  return a;
 }
 async function read(filters,mode='iframe'){
  const a=connect(mode);await a.ready;
  if(transport!==a)throw Error('disconnected');
  const requestId=nonce();
  return new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{a.pending.delete(requestId);reject(Error('timeout'));if(transport===a)disconnect('timeout');},timeoutMs);
   a.pending.set(requestId,{resolve,reject,timer});
   a.peer.postMessage({channel,nonce:a.token,type:'read',requestId,filters},a.origin);
  });
 }
 window.ContractorConnection={read,disconnect};
})();
