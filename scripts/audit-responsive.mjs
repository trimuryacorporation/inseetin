import fs from 'node:fs';
const base = process.env.AUDIT_BASE_URL || 'http://localhost:5173';
const target = await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
let sequence=0; const pending=new Map(); const errors=[];
socket.onmessage=event=>{const data=JSON.parse(event.data);if(data.id){const p=pending.get(data.id);pending.delete(data.id);data.error?p?.reject(data.error):p?.resolve(data.result)}if(data.method==='Runtime.exceptionThrown')errors.push(data.params.exceptionDetails.exception?.description||data.params.exceptionDetails.text)};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))});
const evaluate=async expression=>(await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true})).result.value;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const results=[];
try {
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"['authUser','authToken','authExpiresAt'].forEach(key=>localStorage.removeItem(key));localStorage.setItem('inseetCookieConsent','accepted')"});
 const paths=['/','/jobs','/companies','/industries','/about','/contact','/faqs','/career-resources','/press-news','/candidate-reviews','/internship-course','/freelancer','/freelancer/projects','/recruiter','/auth','/recruiter-login','/recruiter-register','/freelancer-login','/freelancer-register'];
 for(const width of [320,375,768,1024,1280,1440]) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  for(const path of paths) {
   errors.length=0;await send('Page.navigate',{url:base+path});await delay(700);
   for(let attempt=0; attempt<30; attempt++){if(await evaluate('document.body.innerText.length > 100'))break;await delay(250);}
   const result=await evaluate('('+function(){
    const visible=el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!el.closest('[inert]')};
    const overflow=[...document.querySelectorAll('main *,section *,header *')].filter(el=>{
     if(!visible(el))return false;const r=el.getBoundingClientRect();if(r.left>=-1&&r.right<=innerWidth+1)return false;
     let p=el.parentElement;while(p&&p!==document.body&&p.id!=='root'){const s=getComputedStyle(p);if(['auto','scroll','hidden','clip'].includes(s.overflowX))return false;p=p.parentElement}return true;
    }).slice(0,8).map(el=>({tag:el.tagName,text:el.textContent.slice(0,70),class:el.className}));
    const menu=[...document.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')==='Open menu'&&visible(el));
    return {title:document.querySelector('h1')?.textContent||'',bodyWidth:document.body.scrollWidth,viewport:innerWidth,overflow,menuAvailable:!!menu,textLength:document.body.innerText.length};
   }.toString()+')()');
   results.push({path,width,...result,errors:[...errors]});
   if(path==='/'&&[375,1024,1440].includes(width)){await delay(3500);const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.mkdirSync('output/responsive',{recursive:true});fs.writeFileSync('output/responsive/home-'+width+'.png',Buffer.from(shot.data,'base64'));}
  }
  console.log('Checked '+paths.length+' routes at '+width+'px');
 }
 fs.mkdirSync('output/responsive',{recursive:true});fs.writeFileSync('output/responsive/audit.json',JSON.stringify(results,null,2));
 console.log(JSON.stringify({checks:results.length,issues:results.filter(r=>r.overflow?.length||r.errors.length||r.textLength<100).map(r=>({path:r.path,width:r.width,overflow:r.overflow,errors:r.errors}))},null,2));
} finally {socket.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id);}
