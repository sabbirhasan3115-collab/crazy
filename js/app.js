/* DATA */
const TOTAL_DAYS=7;
const DAILY_MCQ=[
  {id:'mcq-phy1',subject:'Physics I',   label:'Daily MCQ practice',questions:75, targetMin:45},
  {id:'mcq-phy2',subject:'Physics II',  label:'Daily MCQ practice',questions:75, targetMin:45},
  {id:'mcq-che1',subject:'Chemistry I', label:'Daily MCQ practice',questions:75, targetMin:45},
  {id:'mcq-che2',subject:'Chemistry II',label:'Daily MCQ practice',questions:75, targetMin:45},
  {id:'mcq-mat1',subject:'Math I',      label:'Daily MCQ practice',questions:75, targetMin:60},
  {id:'mcq-mat2',subject:'Math II',     label:'Daily MCQ practice',questions:75, targetMin:60},
  {id:'mcq-bio1',subject:'Biology I',   label:'Daily MCQ practice',questions:75, targetMin:30},
  {id:'mcq-bio2',subject:'Biology II',  label:'Daily MCQ practice',questions:75, targetMin:30},
  {id:'mcq-ban1',subject:'Bangla I',    label:'Daily MCQ practice',questions:100,targetMin:50},
];
const TOPIC=[
  {id:'top-ban1',subject:'Bangla I',  label:'3 gadya / 3 padya / Upanyas / Natak \u2014 pick one',targetMin:50},
  {id:'top-ban2',subject:'Bangla II', label:'10-mark topic coverage',targetMin:50},
  {id:'top-eng1',subject:'English I', label:'10-mark topic coverage',targetMin:50},
  {id:'top-eng2',subject:'English II',label:'10-mark topic coverage',targetMin:50},
];
const CQ_SUB=[
  {id:'cq-phy1',name:'Physics I',   ch:[9]},
  {id:'cq-phy2',name:'Physics II',  ch:[1,4,5,6,7,8,9,10]},
  {id:'cq-che1',name:'Chemistry I', ch:[4]},
  {id:'cq-che2',name:'Chemistry II',ch:[2,3,4]},
  {id:'cq-mat1',name:'Math I',      ch:[3,4,5,7,9,10]},
  {id:'cq-mat2',name:'Math II',     ch:[4,7,8,9,10]},
  {id:'cq-bio1',name:'Biology I',   ch:[1,2,3,4,5,6,7,8,9,10,11]},
  {id:'cq-bio2',name:'Biology II',  ch:[1,2,3,4,5,6,7,8,9,10,11]},
];
const PERIODS=[
  {id:'cq',   label:'CQ Written',     sH:4, sM:45,eH:8, eM:30,type:'cq'},
  {id:'mcq',  label:'Daily MCQs',     sH:9, sM:0, eH:16,eM:0, type:'mcq'},
  {id:'topic',label:'Topicwise Study',sH:17,sM:15,eH:22,eM:0, type:'topic'},
];
const TI={};
DAILY_MCQ.forEach(t=>TI[t.id]={name:t.subject+' \u2014 Daily MCQ',targetMin:t.targetMin,group:'Daily MCQ'});
TOPIC.forEach(t=>TI[t.id]={name:t.subject+' \u2014 Topicwise',targetMin:t.targetMin,group:'Topicwise'});
CQ_SUB.forEach(s=>s.ch.forEach(c=>TI[s.id+'-ch'+c]={name:s.name+' \u2014 Chapter '+c,targetMin:0,group:'CQ Written'}));

/* STATE */
const SK='studyTracker7Day_v3';
function def(){return{currentDay:1,dayData:{},cq:{},logs:[],ui:{openSubjects:{}},firedAlarms:{},soundOn:true};}
function loadS(){let s=null;try{s=JSON.parse(localStorage.getItem(SK));}catch(e){s=null;}
  if(!s)return def();
  s.dayData=s.dayData||{};s.cq=s.cq||{};s.logs=s.logs||[];s.ui=s.ui||{openSubjects:{}};
  s.currentDay=s.currentDay||1;s.firedAlarms=s.firedAlarms||{};s.soundOn=s.soundOn!==undefined?s.soundOn:true;return s;}
let S=loadS();
function save(){localStorage.setItem(SK,JSON.stringify(S));}
function getDR(day,id){const k=''+day;if(!S.dayData[k])S.dayData[k]={};
  if(!S.dayData[k][id])S.dayData[k][id]={completed:false,totalSeconds:0,running:false,startTs:null,alarmFired:false};
  return S.dayData[k][id];}
function getCR(id){if(!S.cq[id])S.cq[id]={completed:false,totalSeconds:0,running:false,startTs:null,alarmFired:false};return S.cq[id];}
function getRec(id,scope){return scope==='cq'?getCR(id):getDR(S.currentDay,id);}

/* AUDIO */
let _ctx=null;
function ac(){if(!_ctx)_ctx=new(window.AudioContext||window.webkitAudioContext)();if(_ctx.state==='suspended')_ctx.resume();return _ctx;}
function tone(f,t,dur,g,tp){const c=ac(),o=c.createOscillator(),gn=c.createGain();
  o.connect(gn);gn.connect(c.destination);o.type=tp||'sine';o.frequency.value=f;
  gn.gain.setValueAtTime(0.0001,t);gn.gain.exponentialRampToValueAtTime(g,t+0.02);
  gn.gain.exponentialRampToValueAtTime(0.0001,t+dur);o.start(t);o.stop(t+dur+0.05);}
function playDone(){if(!S.soundOn)return;const t=ac().currentTime;
  [[523,0],[659,.12],[784,.24],[1047,.38]].forEach(function(p){tone(p[0],t+p[1],.55,.22);});
  buzz([80]);}
function playEnd(){if(!S.soundOn)return;const t=ac().currentTime;tone(880,t,.35,.24);tone(660,t+.4,.45,.2);}
/* Loud, lengthy siren alarm for period boundaries \u2014 alternates two tones for ~7s, plus device vibration */
function playAlarm(){if(!S.soundOn)return;
  const c=ac(),t0=c.currentTime,freqs=[880,1318],step=.42,cycles=16;
  for(let i=0;i<cycles;i++)tone(freqs[i%2],t0+i*step,step*0.9,0.32,'square');
  buzz([450,150,450,150,450,150,450,150,450,150,450]);}
function playWarn(){if(!S.soundOn)return;const t=ac().currentTime;
  tone(740,t,.2,.2);tone(740,t+.28,.2,.2);tone(740,t+.56,.2,.2);
  buzz([200,100,200]);}
function buzz(pattern){try{if(navigator.vibrate)navigator.vibrate(pattern);}catch(e){}}

/* TOASTS */
let _tid=0;
function toast(type,icon,title,msg,dur){
  const id='t'+(++_tid),el=document.createElement('div');
  el.className='toast '+type;el.id=id;
  el.innerHTML='<div class="t-icon">'+icon+'</div><div class="t-body"><div class="t-title">'+title+'</div><div class="t-msg">'+msg+'</div></div><div class="t-close" onclick="dismissToast(\''+id+'\')">&#x2715;</div>';
  document.getElementById('toastStack').prepend(el);if(dur>0)setTimeout(function(){dismissToast(id);},dur);}
function dismissToast(id){const e=document.getElementById(id);if(e)e.remove();}

/* BACKGROUND (SYSTEM) NOTIFICATIONS */
let _swReg=null;
function notifSupported(){return 'Notification' in window;}
function registerSW(){
  if(!('serviceWorker' in navigator))return;
  navigator.serviceWorker.register('sw.js').then(function(reg){_swReg=reg;}).catch(function(){});}
function updateNotifUI(){
  const btn=document.getElementById('notifToggle');if(!btn)return;
  if(!notifSupported()){btn.style.display='none';return;}
  const icon=btn.querySelector('.icon'),label=document.getElementById('notifLabel'),perm=Notification.permission;
  btn.classList.toggle('on',perm==='granted');
  icon.textContent=perm==='granted'?'\uD83D\uDD14':'\uD83D\uDD15';
  label.textContent=perm==='granted'?'Background alerts on':(perm==='denied'?'Blocked \u2014 tap for help':'Enable background alerts');}
function toggleNotif(){
  if(!notifSupported()){toast('alarm','&#x26A0;&#xFE0F;','Not supported here','This browser doesn\u2019t support system notifications \u2014 in-page sound/toast alerts will still work while the tab is open.',8000);return;}
  if(Notification.permission==='granted'){
    notify('Background alerts are on','You\u2019ll get a system notification banner for period and target alerts, even on another tab.','test-on');return;}
  if(Notification.permission==='denied'){
    toast('alarm','&#x1F515;','Notifications blocked','You\u2019ve blocked notifications for this page. Enable them in your browser\u2019s site settings (click the lock icon in the address bar), then reload.',9000);return;}
  Notification.requestPermission().then(function(p){
    updateNotifUI();
    if(p==='granted')notify('Background alerts enabled','You\u2019ll be notified here even when this tab isn\u2019t focused.','test-on');
  });}
/* Routes through the Service Worker when available \u2014 this is what makes a real,
   persistent system banner (with icon + vibration) instead of a flaky page notification,
   and is required for this to work at all on Android Chrome. */
function notify(title,body,tag,requireInteraction){
  if(!notifSupported()||Notification.permission!=='granted')return;
  const opts={body:body,tag:tag,icon:'icons/icon-192.png',badge:'icons/icon-192.png',
    vibrate:[200,100,200],requireInteraction:!!requireInteraction,renotify:true};
  if(_swReg){_swReg.showNotification(title,opts).catch(function(){fallbackNotify(title,opts);});}
  else if(navigator.serviceWorker&&navigator.serviceWorker.ready){
    navigator.serviceWorker.ready.then(function(reg){_swReg=reg;reg.showNotification(title,opts);}).catch(function(){fallbackNotify(title,opts);});}
  else fallbackNotify(title,opts);}
function fallbackNotify(title,opts){
  try{const n=new Notification(title,opts);n.onclick=function(){window.focus();n.close();};}catch(e){}}

/* SOUND + NOTIFICATION TEST */
function testAlert(){
  try{ac();}catch(e){}
  playAlarm();
  toast('alarm','&#x1F9EA;','Test alarm','This is what a period-end alarm sounds and looks like.',9000);
  if(Notification.permission==='granted')notify('Test alarm \u2014 Seven-Day Sprint','If you can see this banner, background alerts are working.','test-alarm',true);
  else if(notifSupported())toast('alarm','&#x1F515;','Background alerts are off','Tap "Enable background alerts" first if you also want a system banner.',7000);}

/* SOUND TOGGLE */
function toggleSound(){
  try{ac();}catch(e){}
  S.soundOn=!S.soundOn;save();
  const btn=document.getElementById('soundToggle');
  btn.classList.toggle('on',S.soundOn);
  btn.querySelector('.icon').textContent=S.soundOn?'\uD83D\uDD14':'\uD83D\uDD15';
  document.getElementById('soundLabel').textContent=S.soundOn?'Alerts on':'Alerts off';
  if(S.soundOn)playWarn();}

/* CLOCK */
let _lastMin=-1;
function hhmm(h,m){return (''+h).padStart(2,'0')+':'+(''+m).padStart(2,'0');}
function getActivePeriod(h,m){
  return PERIODS.find(function(p){var s=p.sH*60+p.sM,e=p.eH*60+p.eM,n=h*60+m;return n>=s&&n<e;})||null;}
function checkAlarms(){
  const now=new Date(),h=now.getHours(),m=now.getMinutes(),ds=now.toDateString(),nm=h*60+m;
  PERIODS.forEach(function(p){
    const e=p.eH*60+p.eM,wk=ds+'_'+p.id+'_w5',ek=ds+'_'+p.id+'_end';
    if(nm===e-5&&!S.firedAlarms[wk]){S.firedAlarms[wk]=true;playWarn();
      toast('alarm','&#x23F0;',p.label+' ends in 5 min','Wrap up before '+hhmm(p.eH,p.eM)+'.',10000);
      notify(p.label+' ends in 5 min','Wrap up before '+hhmm(p.eH,p.eM)+'.','period-'+p.id+'-warn',false);}
    if(nm===e&&!S.firedAlarms[ek]){S.firedAlarms[ek]=true;playAlarm();
      toast('alarm','&#x1F6A8;',p.label+' period ended','Window '+hhmm(p.sH,p.sM)+'\u2013'+hhmm(p.eH,p.eM)+' is over. Switch to the next block!',15000);
      notify(p.label+' period ended','Window '+hhmm(p.sH,p.sM)+'\u2013'+hhmm(p.eH,p.eM)+' is over. Switch to the next block!','period-'+p.id+'-end',true);}
  });save();}
function updateClock(){
  const now=new Date(),h=now.getHours(),m=now.getMinutes(),s=now.getSeconds();
  const el=document.getElementById('liveClock');
  if(el)el.textContent=hhmm(h,m)+':'+(''+s).padStart(2,'0');
  periodBanner();
  if(m!==_lastMin){_lastMin=m;checkAlarms();}}
function periodBanner(){
  const el=document.getElementById('missionPeriod');if(!el)return;
  const now=new Date(),h=now.getHours(),m=now.getMinutes(),nowMin=h*60+m+now.getSeconds()/60;
  const p=getActivePeriod(h,m);
  if(!p){
    const next=PERIODS.find(function(pp){return pp.sH*60+pp.sM>nowMin;});
    const sub=next?(next.label+' starts at '+hhmm(next.sH,next.sM)+' \u2014 in '+fmtMin((next.sH*60+next.sM-nowMin)*60)):
      ('Next up: '+PERIODS[0].label+' at '+hhmm(PERIODS[0].sH,PERIODS[0].sM)+' tomorrow');
    el.className='mission-period idle';
    el.innerHTML='<div class="mp-name">No block active right now</div><div class="mp-sub">'+sub+'</div>';
    return;}
  const sMin=p.sH*60+p.sM,eMin=p.eH*60+p.eM;
  const pct=Math.max(0,Math.min(100,((nowMin-sMin)/(eMin-sMin))*100));
  const remain=Math.max(0,eMin-nowMin);
  el.className='mission-period active-'+p.type;
  el.innerHTML='<div class="mp-top"><span class="mp-name">'+p.label+' &mdash; in progress</span><span class="mp-range">'+hhmm(p.sH,p.sM)+'\u2013'+hhmm(p.eH,p.eM)+'</span></div>'+
    '<div class="mp-bar"><div class="mp-fill" style="width:'+pct.toFixed(1)+'%"></div></div>'+
    '<div class="mp-sub">'+Math.round(pct)+'% through the window \u00b7 '+fmtMin(remain*60)+' left</div>';}

/* HELPERS */
function genId(){return 'id_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);}
function fmtHMS(sec){sec=Math.max(0,Math.round(sec));var h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;return[h,m,s].map(function(n){return(''+n).padStart(2,'0');}).join(':');}
function fmtMin(sec){return Math.max(1,Math.round(sec/60))+'m';}
function fmtHM(sec){var t=Math.round(sec/60),h=Math.floor(t/60),m=t%60;return h>0?h+'h '+m+'m':m+'m';}
function fmtClock(ts){return new Date(ts).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}
function fmtDate(ts){return new Date(ts).toLocaleDateString([],{month:'short',day:'numeric'});}

/* ACTIONS */
function startTask(id,scope){var r=getRec(id,scope);if(r.running)return;try{ac();}catch(e){}r.running=true;r.startTs=Date.now();save();render();}
function endTask(id,scope){
  var r=getRec(id,scope);if(!r.running)return;
  var st=r.startTs,now=Date.now(),sec=Math.max(0,(now-st)/1000);
  r.totalSeconds+=sec;r.running=false;r.startTs=null;r.completed=true;
  var m=TI[id],tgt=(m.targetMin||0)*60;
  S.logs.push({id:genId(),taskId:id,scope:scope,name:m.name,group:m.group,
    day:scope==='day'?S.currentDay:null,startTime:st,endTime:now,
    targetSeconds:tgt,actualSeconds:sec,overtimeSeconds:tgt>0?Math.max(0,sec-tgt):0});
  playEnd();save();render();}
function toggleComplete(id,scope){var r=getRec(id,scope);r.completed=!r.completed;save();render();}
function goToDay(n){S.currentDay=n;save();render();}
function toggleSubject(id){S.ui.openSubjects[id]=!S.ui.openSubjects[id];save();render();}
function resetDay(n){if(!confirm('Reset Day '+n+'? Logs stay intact.'))return;delete S.dayData[''+n];save();render();}
function resetCQ(){if(!confirm('Reset all CQ progress? Logs stay.'))return;S.cq={};save();render();}
function clearLogs(){if(!confirm('Delete all logs? Cannot be undone.'))return;S.logs=[];save();render();}
function resetAll(){if(!confirm('Reset EVERYTHING?'))return;S=def();save();render();}

/* STATS */
function dayStats(day){var r=S.dayData[''+day]||{},all=DAILY_MCQ.concat(TOPIC),d=0;
  all.forEach(function(t){if(r[t.id]&&r[t.id].completed)d++;});
  return{done:d,total:all.length,pct:all.length?Math.round(d/all.length*100):0};}
function grpStats(day,list){var r=S.dayData[''+day]||{},d=0;
  list.forEach(function(t){if(r[t.id]&&r[t.id].completed)d++;});
  return{done:d,total:list.length,pct:list.length?Math.round(d/list.length*100):0};}
function cqStats(){var d=0,t=0;
  CQ_SUB.forEach(function(s){s.ch.forEach(function(c){t++;var r=S.cq[s.id+'-ch'+c];if(r&&r.completed)d++;});});
  return{done:d,total:t,pct:t?Math.round(d/t*100):0};}
function subCqSt(s){var d=0;s.ch.forEach(function(c){var r=S.cq[s.id+'-ch'+c];if(r&&r.completed)d++;});
  return{done:d,total:s.ch.length,pct:Math.round(d/s.ch.length*100)};}
function cumSec(){return S.logs.reduce(function(a,l){return a+l.actualSeconds;},0);}
function todaySec(){var t=new Date().toDateString();return S.logs.filter(function(l){return new Date(l.startTime).toDateString()===t;}).reduce(function(a,l){return a+l.actualSeconds;},0);}
function byDate(){var m={};S.logs.forEach(function(l){var d=new Date(l.startTime).toDateString();if(!m[d])m[d]={date:d,seconds:0,sessions:0,ts:l.startTime};m[d].seconds+=l.actualSeconds;m[d].sessions+=1;if(l.startTime<m[d].ts)m[d].ts=l.startTime;});return Object.values(m).sort(function(a,b){return b.ts-a.ts;});}
function gCls(g){if(g==='Daily MCQ')return 'mcq';if(g==='Topicwise')return 'topic';return 'cq';}

/* TASK ROW */
function taskRow(t,scope,compact){
  var r=getRec(t.id,scope),tgt=(t.targetMin||0)*60,live=r.running?(Date.now()-r.startTs)/1000:0;
  var tot=r.totalSeconds+live,pct=tgt>0?Math.min(100,(tot/tgt)*100):0;
  var over=tgt>0?Math.max(0,tot-tgt):0,hit=tgt>0&&tot>=tgt;
  var mp=[];if(t.questions)mp.push(t.questions+' Qs');if(t.targetMin)mp.push('Target '+t.targetMin+'m');
  var rc='task-row';if(compact)rc+=' compact';if(r.completed&&!r.running)rc+=' done';if(r.running)rc+=' running';if(r.running&&hit&&!r.completed)rc+=' target-hit';
  var progressHtml=tgt>0?('<div class="bar"><div class="fill'+(pct>=100?' overtime':'')+'" id="fill-'+t.id+'" style="width:'+pct+'%"></div></div><span class="overtime-label" id="ot-'+t.id+'">'+(over>0?'+'+fmtMin(over)+' over':hit?'\u2713 Target reached':'')+'</span>'):'<span class="meta-faint">no fixed target</span>';
  return '<div class="'+rc+'"><label class="task-check"><input type="checkbox" '+(r.completed?'checked':'')+' onchange="toggleComplete(\''+t.id+'\',\''+scope+'\')"></label><div class="task-info"><div class="task-subject">'+(t.subject?t.subject:t.label)+'</div>'+(t.subject?'<div class="task-label">'+t.label+'</div>':'')+(mp.length?'<div class="task-meta">'+mp.join(' &middot; ')+'</div>':'')+'</div><div class="task-timer" id="timer-'+t.id+'">'+fmtHMS(tot)+'</div><div class="task-progress">'+progressHtml+'</div><div class="task-actions"><button class="btn start" onclick="startTask(\''+t.id+'\',\''+scope+'\')" '+(r.running?'disabled':'')+'>Start</button><button class="btn end" onclick="endTask(\''+t.id+'\',\''+scope+'\')" '+(!r.running?'disabled':'')+'>End</button></div></div>';}

/* RENDERS */
function renderHeader(){
  var ds=dayStats(S.currentDay),cq=cqStats();
  var chips='<div class="head-chip">Day <span class="v">'+S.currentDay+'</span>/'+TOTAL_DAYS+'</div><div class="head-chip">Today <span class="v">'+ds.done+'/'+ds.total+'</span> tasks</div><div class="head-chip">CQ <span class="v">'+cq.pct+'%</span></div><div class="head-chip">Studied <span class="v">'+fmtHM(cumSec())+'</span></div>';
  document.getElementById('headerStats').innerHTML=chips;}

function renderDaily(){
  var ds=dayStats(S.currentDay),mcq=grpStats(S.currentDay,DAILY_MCQ),tp=grpStats(S.currentDay,TOPIC);
  var ladder='';for(var n=1;n<=TOTAL_DAYS;n++){var st=dayStats(n);ladder+='<div class="rung '+(n===S.currentDay?'active':'')+'" onclick="goToDay('+n+')" title="Day '+n+': '+st.done+'/'+st.total+'"><div class="fill" style="height:'+st.pct+'%"></div><div class="num">'+n+'</div></div>';}
  document.getElementById('tab-daily').innerHTML='<div class="panel-head"><div class="grow"><h2>Day '+S.currentDay+' <span class="meta-faint">of '+TOTAL_DAYS+'</span></h2><div class="meta-faint">'+ds.done+'/'+ds.total+' tasks &middot; '+ds.pct+'%</div></div><button class="btn ghost" onclick="resetDay('+S.currentDay+')">Reset Day '+S.currentDay+'</button></div><div class="ladder">'+ladder+'</div><div class="section-head"><h3>Daily MCQs</h3><span class="meta-faint">9:00 AM &ndash; 4:00 PM &middot; '+mcq.done+'/'+mcq.total+' done</span></div><div class="bar section-bar"><div class="fill" style="width:'+mcq.pct+'%"></div></div>'+DAILY_MCQ.map(function(t){return taskRow(t,'day');}).join('')+'<div class="section-head"><h3>Topicwise Study</h3><span class="meta-faint">5:15 PM &ndash; 10:00 PM &middot; '+tp.done+'/'+tp.total+' done</span></div><div class="bar section-bar"><div class="fill" style="width:'+tp.pct+'%"></div></div>'+TOPIC.map(function(t){return taskRow(t,'day');}).join('');}

function renderCQ(){
  var ov=cqStats();
  var cards=CQ_SUB.map(function(s){
    var st=subCqSt(s),open=!!S.ui.openSubjects[s.id];
    var chips=s.ch.map(function(c){var id=s.id+'-ch'+c,r=getCR(id);return '<div class="chip '+(r.completed?'done':'')+'" onclick="toggleComplete(\''+id+'\',\'cq\')" title="Ch '+c+'">'+c+'</div>';}).join('');
    var drows=s.ch.map(function(c){return taskRow({id:s.id+'-ch'+c,subject:null,label:'Chapter '+c,targetMin:0},'cq',true);}).join('');
    return '<div class="subject-card '+(open?'open':'')+'"><div class="subject-head" onclick="toggleSubject(\''+s.id+'\')"><div><div class="subject-name">'+s.name+'</div><div class="subject-pct">'+st.done+'/'+st.total+' &middot; '+st.pct+'%</div></div><svg class="chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"></polyline></svg></div><div class="bar subject-bar"><div class="fill" style="width:'+st.pct+'%"></div></div><div class="chip-grid">'+chips+'</div><div class="subject-detail">'+drows+'</div></div>';
  }).join('');
  document.getElementById('tab-cq').innerHTML='<div class="panel-head"><div class="ring" style="--pct:'+ov.pct+'"><span>'+ov.pct+'%</span></div><div class="grow"><h2>CQ &mdash; Written Tracker</h2><div class="meta-faint">4:45 AM &ndash; 8:30 AM &middot; '+ov.done+'/'+ov.total+' chapters</div></div><button class="btn ghost" onclick="resetCQ()">Reset CQ</button></div><div class="meta-faint" style="margin-bottom:14px">Tap a chapter square to mark done, or expand to start a timer.</div>'+cards;}

function renderAcc(){
  var c=cumSec(),td=todaySec(),n=S.logs.length,av=n?c/n:0;
  var bd=byDate(),best=bd.reduce(function(a,b){return b.seconds>(a?a.seconds:-1)?b:a;},null);
  var dr=bd.length?bd.map(function(d){return '<tr><td>'+new Date(d.ts).toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'})+'</td><td>'+d.sessions+'</td><td>'+fmtHM(d.seconds)+'</td></tr>';}).join(''):'<tr><td class="empty" colspan="3">No study days logged yet.</td></tr>';
  var sorted=[].concat(S.logs).sort(function(a,b){return b.startTime-a.startTime;});
  var lr=sorted.length?sorted.map(function(l){return '<tr><td><span class="group-chip '+gCls(l.group)+'">'+l.group+'</span>'+l.name+'</td><td>'+(l.day?'Day '+l.day:'&mdash;')+'</td><td>'+fmtDate(l.startTime)+'</td><td>'+fmtClock(l.startTime)+'</td><td>'+fmtClock(l.endTime)+'</td><td>'+(l.targetSeconds?fmtMin(l.targetSeconds):'&mdash;')+'</td><td>'+fmtHMS(l.actualSeconds)+'</td><td class="'+(l.overtimeSeconds>0?'over':'')+'">'+(l.overtimeSeconds>0?'+'+fmtMin(l.overtimeSeconds):'&mdash;')+'</td></tr>';}).join(''):'<tr><td class="empty" colspan="8">No sessions yet &mdash; start a timer.</td></tr>';
  document.getElementById('tab-acc').innerHTML='<div class="panel-head"><div class="grow"><h2>Accountability</h2><div class="meta-faint">Every started-and-ended session is logged here.</div></div></div><div class="stat-grid"><div class="stat-card"><div class="label">Total studied</div><div class="value">'+fmtHM(c)+'</div></div><div class="stat-card"><div class="label">Today</div><div class="value">'+fmtHM(td)+'</div></div><div class="stat-card"><div class="label">Sessions</div><div class="value">'+n+'</div></div><div class="stat-card"><div class="label">Avg session</div><div class="value">'+fmtHM(av)+'</div></div><div class="stat-card"><div class="label">Best day</div><div class="value" style="font-size:1.05rem">'+(best?fmtHM(best.seconds):'&mdash;')+'</div></div></div><div class="section-head"><h3>Daily totals</h3></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Sessions</th><th>Time</th></tr></thead><tbody>'+dr+'</tbody></table></div><div class="section-head"><h3>Session log</h3><span class="meta-faint">'+n+' total</span></div><div class="table-wrap"><table><thead><tr><th>Task</th><th>Day</th><th>Date</th><th>Start</th><th>End</th><th>Target</th><th>Actual</th><th>Overtime</th></tr></thead><tbody>'+lr+'</tbody></table></div><div class="footer-actions"><button class="btn danger" onclick="clearLogs()">Clear all logs</button><button class="btn danger" onclick="resetAll()">Reset everything</button></div>';}

function render(){renderHeader();renderDaily();renderCQ();renderAcc();periodBanner();}
function switchTab(name){
  document.querySelectorAll('.tab-panel').forEach(function(p){p.classList.remove('active');});
  document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.toggle('active',b.dataset.tab===name);});
  document.getElementById('tab-'+name).classList.add('active');}

/* TICK */
function tick(){
  updateClock();
  var upd=[];
  var dr=S.dayData[''+S.currentDay]||{};
  Object.keys(dr).forEach(function(id){if(dr[id].running)upd.push({id:id,rec:dr[id],scope:'day'});});
  Object.keys(S.cq).forEach(function(id){if(S.cq[id].running)upd.push({id:id,rec:S.cq[id],scope:'cq'});});
  upd.forEach(function(u){
    var m=TI[u.id];if(!m)return;
    var tgt=(m.targetMin||0)*60,el=u.rec.totalSeconds+(Date.now()-u.rec.startTs)/1000;
    if(tgt>0&&el>=tgt&&!u.rec.alarmFired){
      u.rec.alarmFired=true;playDone();
      toast('done','&#x2705;','Target reached &mdash; '+m.name,'You hit the '+m.targetMin+'m goal. Keep going or end the session.',9000);
      notify('Target reached \u2014 '+m.name,'You hit the '+m.targetMin+'m goal. Keep going or end the session.','target-'+u.id,false);save();}
    var te=document.getElementById('timer-'+u.id);if(te)te.textContent=fmtHMS(el);
    if(tgt>0){var pct=Math.min(100,(el/tgt)*100);
      var fe=document.getElementById('fill-'+u.id);if(fe){fe.style.width=pct+'%';fe.classList.toggle('overtime',el>tgt);}
      var oe=document.getElementById('ot-'+u.id);
      if(oe){var ov=Math.max(0,el-tgt);oe.textContent=ov>0?'+'+fmtMin(ov)+' over':el>=tgt?'\u2713 Target reached':'';}}}); }

document.addEventListener('DOMContentLoaded',function(){
  registerSW();
  var btn=document.getElementById('soundToggle');
  btn.classList.toggle('on',S.soundOn);
  btn.querySelector('.icon').textContent=S.soundOn?'\uD83D\uDD14':'\uD83D\uDD15';
  document.getElementById('soundLabel').textContent=S.soundOn?'Alerts on':'Alerts off';
  updateNotifUI();
  render();updateClock();setInterval(tick,1000);});
