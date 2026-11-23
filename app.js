(()=>{'use strict';
const $=id=>document.getElementById(id), keys=['site','category','fiscalYear','operationYear','from','to'];
const messages={auth:'เปิดลิงก์นี้ด้วยบัญชีมหิดลที่ได้รับสิทธิ์',source:'ยังอ่านข้อมูลต้นทางไม่ได้',filter:'ตรวจสอบช่วงวันที่และตัวกรอง',standalone:'ยังไม่ได้ตั้งค่าหลังบ้าน Apps Script', timeout:'ยังยืนยันบัญชีมหิดลไม่ได้ เปิดด้วยบัญชีที่ได้รับสิทธิ์ใน Chrome แล้วโหลดหน้าใหม่ หากเบราว์เซอร์บล็อก ให้ตรวจการอนุญาตคุกกี้ของ Google สำหรับหน้านี้', connection:'เชื่อมข้อมูลไม่ได้ โปรดลองโหลดหน้าใหม่'};
const fmt=new Intl.NumberFormat('th-TH'), amount=new Intl.NumberFormat('th-TH',{minimumFractionDigits:1,maximumFractionDigits:1});
const color=['#2563eb','#0ca578','#e69918','#e64b51','#8154dc','#059ab4','#ef74ab','#536c9b','#559154'];
const months=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const val=n=>Number.isFinite(n)?fmt.format(n):'—', money=n=>Number.isFinite(n)?amount.format(n/1000000)+' ล้านบาท':'—';
let generation=0, state=null, showAll=false;
function make(tag,label='',className=''){const e=document.createElement(tag);if(label)e.textContent=label;if(className)e.className=className;return e;}
function clearVisual(){
 for(const id of ['entries','entities','value','contractsValue','paid','paidRate','categoryCount','training','trainingMeta','health','healthMeta','screen','screenMeta','permit','permitMeta','filterCount'])$(id).textContent='—';
 $('undated').textContent='';$('sheInfo').hidden=true;
 for(const id of ['donut','monthly','categories','categoryBreakdown','siteBreakdown'])$(id).replaceChildren(make('p','แสดงเมื่ออ่านข้อมูลที่ได้รับอนุญาต','blank'));
}
function enable(on){for(const id of [...keys,'apply','reset','siteDisplay','showAll'])$(id).disabled=!on;}
function chartBlank(root){root.replaceChildren(make('p','ไม่มีรายการตามตัวกรองนี้','blank'));}
function addOptions(id,items){
 const sel=$(id), old=sel.value;sel.replaceChildren(new Option('ทั้งหมด',''),...items.map(a=>new Option(a,a)));
 sel.value=items.includes(old)?old:'';
}
function renderDonut(){
 const dest=$('donut'), list=$('siteDisplay').value==='category'?state.categories:state.sites, total=state.summary.entries;
 if(!list.length||!total)return chartBlank(dest);
 const top=list.slice(0,8), more=list.slice(8).reduce((s,k)=>s+k.count,0);
 if(more)top.push({label:'อื่น ๆ',count:more});
 let current=0;const wheel=make('div','','donut');wheel.setAttribute('role','img');wheel.setAttribute('aria-label','สัดส่วนรายการตามหมวดที่เลือก');
 wheel.style.background='conic-gradient('+top.map((r,i)=>{const start=current;current+=r.count*100/total;return color[i]+' '+start+'% '+current+'%';}).join(',')+')';
 wheel.append(make('span',val(total)));
 const legend=make('ul','','legend');top.forEach((r,i)=>{const dot=make('i','','dot');dot.style.background=color[i];const item=make('li');item.append(dot,make('span',r.label+' · '+val(r.count)));legend.append(item);});
 dest.replaceChildren(wheel,legend);
}
function renderMonths(){
 const dest=$('monthly');const max=Math.max(1,...state.months);const wrap=make('div','','month-grid');
 state.months.forEach((n,i)=>{const item=make('div','','month'), box=make('div','','month-box');
  const bar=make('span','','month-bar');bar.style.height=(n/max*106)+'px';item.title=months[i]+' '+val(n)+' รายการ';
  box.append(make('span',val(n),'month-value'),bar);item.append(box,make('span',months[i],'month-label'));wrap.append(item);
 });dest.replaceChildren(wrap);
 $('undated').textContent=state.summary.undated?'ไม่ระบุวันที่เข้าดำเนินการ '+val(state.summary.undated)+' รายการ':'นับตามวันที่เข้าดำเนินการ';
}
function renderBars(){
 const dest=$('categories'), rows=showAll?state.categories:state.categories.slice(0,7), max=Math.max(1,...rows.map(a=>a.count));
 if(!rows.length)return chartBlank(dest);
 const wrap=make('div','','bar-list');rows.forEach((r,i)=>{
  const item=make('button','','bar-item');item.type='button';item.setAttribute('aria-label',r.label+' '+val(r.count)+' รายการ, เลือกหมวดนี้');
  const rail=make('span','','touch-bar'), mark=make('i');rail.setAttribute('aria-hidden','true');
  mark.style.width=(r.count/max*100)+'%';mark.style.background=color[i%color.length];rail.append(mark);
  item.append(make('span',r.label,'label'),rail,make('strong',val(r.count)));
  item.addEventListener('click',()=>{$('category').value=r.label;read();});wrap.append(item);
 });dest.replaceChildren(wrap);$('showAll').textContent=showAll?'ย่อรายการ':'แสดงทั้งหมด';
}
function renderTable(id,rows){
 const dest=$(id);if(!rows.length)return chartBlank(dest);
 const table=make('table'), head=make('thead'), header=make('tr'), label=make('th','กลุ่มข้อมูล'), count=make('th','รายการ');
 label.scope='col';count.scope='col';header.append(label,count);head.append(header);table.append(head);
 const body=make('tbody');rows.forEach(r=>{const tr=make('tr');tr.append(make('td',r.label),make('td',val(r.count)));body.append(tr);});table.append(body);dest.replaceChildren(table);
}
function paint(next){
 state=next;const s=state.summary, she=state.she;
 for(const k of ['site','category','operationYear','fiscalYear'])addOptions(k,state.options[k]);
 $('entries').textContent=val(s.entries)+' รายการ';$('entities').textContent=val(s.contracts)+' สัญญา | '+val(s.companies)+' บริษัท';
 $('value').textContent=money(s.contractValue);$('contractsValue').textContent=val(s.contractsWithValue)+' สัญญามีระบุมูลค่า';
 $('paid').textContent=money(s.cumulativePaid);$('paidRate').textContent=Number.isFinite(s.paymentPercent)?'คิดเป็น '+s.paymentPercent.toFixed(1)+'% ของมูลค่าสัญญารวม':'ยังคำนวณสัดส่วนไม่ได้';
 $('categoryCount').textContent=val(s.categories)+' หมวด';$('filterCount').textContent=val(s.entries)+' รายการ';
 if(she){
  $('training').textContent=val(she.trained)+' รายการ';$('trainingMeta').textContent=val(she.trainingApplicable)+' รายการที่เกี่ยวข้อง · ไม่เกี่ยวข้อง '+val(she.trainingNotApplicable)+' · ไม่ระบุ '+val(she.trainingUnspecified);
  $('health').textContent=val(she.ready)+' รายการพร้อมปฏิบัติงาน';$('healthMeta').textContent='ปฏิบัติงานจริง '+val(she.attendance)+' คน-ครั้ง · ไม่ระบุจำนวน '+val(she.attendanceMissing)+' รายการ';
  $('screen').textContent=val(she.screeningPassed)+' รายการ';$('screenMeta').textContent='ผ่านอย่างน้อยหนึ่งการคัดกรอง จาก '+val(she.screeningApplicable)+' รายการที่เกี่ยวข้อง';
  $('permit').textContent=val(she.permitRecorded)+' รายการมีประเภทใบอนุญาต';$('permitMeta').textContent='อนุมัติสารเคมีและมี SDS '+val(she.sdsApproved)+' รายการ';
  $('sheInfo').hidden=true;
 }else{
  for(const id of ['training','trainingMeta','health','healthMeta','screen','screenMeta','permit','permitMeta'])$(id).textContent='—';
  $('sheInfo').hidden=false;$('sheInfo').textContent='ไม่แสดงตัวเลข SHE เมื่อรายการตามตัวกรองต่ำกว่า '+val(state.sheMinimum)+' รายการ';
 }
 renderDonut();renderMonths();renderBars();renderTable('categoryBreakdown',state.categories);renderTable('siteBreakdown',state.sites);
}
function fail(reason){state=null;clearVisual();enable(false);$('notice').textContent=messages[reason]||messages.source;}
function read(){
 const n=++generation;const filters=Object.fromEntries(keys.map(id=>[id,$(id).value]));
 if(filters.from&&filters.to&&filters.from>filters.to){$('notice').textContent=messages.filter;return;}
 if(!window.ProcurementConnection){fail('standalone');return;}
 $('notice').textContent='กำลังอ่านข้อมูลตามตัวกรอง…';
 window.ProcurementConnection.read(filters).then(reply=>{
  if(n!==generation)return;
  if(!reply?.ok||reply.overview?.schema!==1){fail(reply?.reason);return;}
  const data=reply.overview;
  if(!data.summary||!data.options||!Array.isArray(data.months)||data.months.length!==12||
    !Array.isArray(data.sites)||!Array.isArray(data.categories)){fail('source');return;}
  paint(data);enable(true);
  $('notice').textContent='แสดงข้อมูลภาพรวม'+(reply.readAt?' · อ่านข้อมูล '+new Date(reply.readAt).toLocaleString('th-TH',{timeZone:'Asia/Bangkok'}):'');
 }).catch(e=>{if(n===generation)fail(e?.message||'connection');});
}
$('filters').addEventListener('submit',e=>{e.preventDefault();read();});
for(const k of ['site','category','fiscalYear','operationYear'])$(k).addEventListener('change',read);
$('reset').addEventListener('click',()=>{keys.forEach(id=>{$(id).value='';});showAll=false;read();});
$('siteDisplay').addEventListener('change',()=>{if(state)renderDonut();});
$('showAll').addEventListener('click',()=>{if(state){showAll=!showAll;renderBars();}});
clearVisual();enable(false);read();
})();
