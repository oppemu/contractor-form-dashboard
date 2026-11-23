(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const statusNames={all:'รายการทั้งหมด',done:'แล้วเสร็จ',ongoing:'ยังไม่แล้วเสร็จ / กำลังดำเนินการ',other:'อื่น ๆ / ไม่ระบุ'};
 const keys=Object.keys(statusNames), cards=Array.from(document.querySelectorAll('[data-status]'));
 const controls=['from','to','apply','reset','first','second','clearCompare'];
 const groupPattern=/^(OPPE-\d{2}|unclassified)$/;
 const count=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('th-TH'):'—';
 const pct=n=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString('th-TH',{style:'percent',maximumFractionDigits:1}):'—';
 const base='ที่มา: แท็บ OPPE ของฟอร์มจ้างเหมา • นับรายการตามวันที่บันทึก';
 const errors={'not-configured':'ยังไม่ได้เชื่อมข้อมูลของหน่วยงาน',auth:'บัญชีนี้ไม่มีสิทธิ์ดูข้อมูล ลองเชื่อมด้วยบัญชีมหิดลที่ได้รับอนุญาต',popup:'เบราว์เซอร์ไม่อนุญาตให้เปิดหน้าต่างลงชื่อเข้าใช้',timeout:'ยังเชื่อมข้อมูลไม่ได้ ลองกด “เชื่อมบัญชีมหิดล”',source:'ยังอ่านข้อมูลจากชีตต้นทางไม่ได้',filter:'ตรวจช่วงวันและเลือกคนละกลุ่มงาน',connection:'ยังเชื่อมข้อมูลไม่ได้ กรุณาลองใหม่'};
 let seq=0,authorized=false,status='all';
 const element=(tag,text,cls)=>{const e=document.createElement(tag);if(typeof text==='string')e.textContent=text;if(cls)e.className=cls;return e;};
 const note=(id,text)=>$(id).replaceChildren(element('p',text,'empty'));
 const selected=()=>({from:$('from').value||'',to:$('to').value||'',status,first:$('first').value||'',second:$('second').value||''});
 const disable=arg=>{for(const id of controls)$(id).disabled=arg;for(const card of cards)card.disabled=arg;};
 function mark(s){for(const card of cards)card.setAttribute('aria-pressed',String(card.dataset.status===s));}
 function clear(){
  for(const key of keys)$(key+'Count').textContent='—';
  for(const id of ['first','second'])$(id).replaceChildren(new Option('เลือกกลุ่มงาน',''));
  note('groupChart','จะแสดงเมื่ออ่านข้อมูลที่ได้รับอนุญาต');
  note('comparison','จะแสดงเมื่อยืนยันสิทธิ์และเลือกครบ 2 กลุ่ม');
  $('source').textContent=base+' • ยังไม่มีข้อมูลที่ยืนยันให้แสดง';$('groupScope').textContent='ตามสถานะที่เลือก';mark('all');
 }
 function track(n,max){
  const bar=element('div',null,'track'), fill=element('span',null,'fill');
  fill.style.width=(Math.min(Math.max(0,n/max),1)*100)+'%';bar.append(fill);return bar;
 }
 function draw(id,rows,label){
  const data=rows.filter(row=>Array.isArray(row)&&typeof row[0]==='string'&&Number.isFinite(row[1])&&row[1]>0), box=$(id);
  box.replaceChildren();
  if(!data.length){note(id,'ไม่มีรายการตามช่วงและสถานะที่เลือก');return;}
  const max=Math.max(1,...data.map(row=>row[1]));
  for(const [key,n] of data){
   const line=element('div',null,'bar'), row=element('div',null,'bar-top');
   row.append(element('span',label(key)),element('strong',count(n)));line.append(row,track(n,max));box.append(line);
  }
 }
 function options(snapshot,labels){
  const {first,second}=snapshot.filters;
  for(const [id,mine,other] of [['first',first,second],['second',second,first]]){
   const select=$(id);
   const all=Array.from(labels,([key,name])=>{const option=new Option(name,key);option.disabled=key===other;return option;});
   select.replaceChildren(new Option('เลือกกลุ่มงาน',''),...all);
   select.value=labels.has(mine)?mine:'';
  }
 }
 function compare(snapshot,labels){
  $('compareHint').textContent='ช่วงเวลาเดียวกัน • '+statusNames[snapshot.filters.status];
  if(snapshot.comparison.length!==2){note('comparison','เลือกให้ครบ 2 กลุ่มงาน');return;}
  const max=Math.max(1,...snapshot.comparison.map(item=>item.selected)), pair=element('div',null,'pair');
  for(const item of snapshot.comparison){
   const side=element('article',null,'side');
   side.append(element('h3',labels.get(item.group)||'กลุ่มงาน'),element('strong',count(item.selected)),element('small',statusNames[snapshot.filters.status]+' · รายการ'),track(item.selected,max),element('small','ทุกสถานะ '+count(item.total)+' รายการ'),element('small','สัดส่วนแล้วเสร็จจากทุกสถานะ '+pct(item.completionRate)));
   pair.append(side);
  }
  const d=Math.abs(snapshot.comparison[0].selected-snapshot.comparison[1].selected);
  $('comparison').replaceChildren(pair,element('p',d?'จำนวนต่างกัน '+count(d)+' รายการ':'จำนวนเท่ากัน','difference'));
 }
 function show(snapshot,time){
  const labels=new Map(snapshot.options.filter(p=>Array.isArray(p)&&groupPattern.test(p[0])&&typeof p[1]==='string'));
  for(const key of keys)$(key+'Count').textContent=count(snapshot.totals[key]);
  status=snapshot.filters.status;mark(status);options(snapshot,labels);
  $('groupScope').textContent=statusNames[status];
  draw('groupChart',snapshot.groups,key=>labels.get(key)||'ไม่ระบุหมวด');
  compare(snapshot,labels);
  const d=new Date(time), readAt=Number.isFinite(d.getTime())?d.toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'—';
  $('source').textContent=base+' • ไม่ระบุวันที่ '+count(snapshot.undated)+' รายการ (ไม่รวมเมื่อกรองวัน) • อ่านข้อมูล '+readAt;
  $('notice').textContent=snapshot.totals[status]?'แสดงข้อมูลตามตัวกรองแล้ว':'ไม่พบรายการตามช่วงและสถานะที่เลือก';
 }
 async function run(mode='iframe'){
  const filters=selected();
  if((filters.from&&filters.to&&filters.from>filters.to)||(filters.first&&filters.first===filters.second)){$('notice').textContent=errors.filter;return;}
  const serial=++seq;$('connect').disabled=true;
  $('notice').textContent=mode==='popup'?'ลงชื่อเข้าใช้ในหน้าต่าง Google ที่เปิดขึ้น…':'กำลังตรวจสิทธิ์และอัปเดตข้อมูล…';
  try{
   const reply=await ContractorConnection.read(filters,mode);
   if(serial!==seq)return;
   if(!reply?.ok)throw Error(reply?.reason||'connection');
   const s=reply.snapshot;
   if(!s||s.schemaVersion!==3||!keys.includes(s.filters?.status)||!s.totals||
      ['options','groups','comparison'].some(key=>!Array.isArray(s[key])))throw Error('source');
   show(s,reply.readAt);authorized=true;
  }catch(e){
   if(serial!==seq)return;
   if(e.message!=='filter'){authorized=false;status='all';clear();ContractorConnection.disconnect();}
   $('notice').textContent=errors[e.message]||errors.connection;
  }finally{
   if(serial===seq){disable(!authorized);$('connect').hidden=authorized||!window.CONTRACT_DASHBOARD?.webAppUrl;$('connect').disabled=false;}
  }
 }
 for(const card of cards)card.addEventListener('click',()=>{status=card.dataset.status;void run();});
 for(const field of ['first','second'])$(field).addEventListener('change',()=>void run());
 $('connect').addEventListener('click',()=>void run('popup'));$('apply').addEventListener('click',()=>void run());
 $('reset').addEventListener('click',()=>{$('from').value=$('to').value=$('first').value=$('second').value='';status='all';void run();});
 $('clearCompare').addEventListener('click',()=>{$('first').value=$('second').value='';void run();});
 disable(true);void run();
})();
