import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const catalog = require('../backend/utils/developerApiResources').catalog()
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json())
const ws=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
let sequence=0;const pending=new Map(),errors=[],checks=[]
const keys=[];let createdBody=null,updatedBody=null,revoked=false
const secret='ins_live_'+'x'.repeat(43),keyId='507f1f77bcf86cd799439001'
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
ws.onmessage=async event=>{
 const message=JSON.parse(event.data)
 if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p?.reject(message.error):p?.resolve(message.result);return}
 if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text)
 if(message.method!=='Fetch.requestPaused')return
 const {requestId,request}=message.params;const route=new URL(request.url).pathname.replace(/^\/api\//,'');let data=[],extra={}
 if(route==='testimonials')data=Array.from({length:56},(_,i)=>({_id:'review-'+i,name:'Reviewer '+i,text:'A premium job portal experience with filters and dashboards our recruiters actually enjoy using.',role:'Growth Lead',company:'Talentora',rating:5,featured:i<4,type:'Recruiter'}))
 else if(route==='company-profiles')data=[{_id:'company-1',name:'Trusted Test Company',industry:'IT & Software',location:'India',status:'Active',jobs:2}]
 else if(route==='portal-summary')data={counts:{jobs:2,candidates:10,companies:1,recruiters:1}}
 else if(route==='developer/catalog')data={resources:catalog,basePath:'/api/integrations/v1'}
 else if(route==='developer/keys'&&request.method==='POST'){
  createdBody=JSON.parse(request.postData);const record={_id:keyId,...createdBody,prefix:secret.slice(0,17),revokedAt:null,createdAt:new Date().toISOString()};keys.push(record);data={...record,key:secret}
 }else if(route==='developer/keys')data=keys
 else if(route.startsWith('developer/keys/')&&request.method==='PUT'){updatedBody=JSON.parse(request.postData);Object.assign(keys[0],updatedBody);data=keys[0]}
 else if(route.startsWith('developer/keys/')&&request.method==='DELETE'){revoked=true;keys[0].revokedAt=new Date().toISOString();data=keys[0]}
 else if(route==='developer/logs'){extra.pagination={pages:1,total:0}}
 else if(route.startsWith('settings/'))data={value:{siteName:'INSEET'}}
 else if(route.startsWith('dashboard/'))data={metrics:{},charts:{monthly:[]}}
 else if(route==='auth/me')data={_id:'507f1f77bcf86cd799439099',name:'API Test Admin',email:'api-test@example.test',role:'Admin',status:'Active'}
 await send('Fetch.fulfillRequest',{requestId,responseCode:request.method==='POST'?201:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Headers',value:'Authorization, Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET, POST, PUT, DELETE, OPTIONS'}],body:Buffer.from(JSON.stringify({success:true,data,...extra})).toString('base64')})
}
const waitFor=async expression=>{for(let i=0;i<80;i++){if(await evaluate(expression))return;await delay(100)}throw new Error('Timed out: '+expression)}
const check=(name,value)=>{assert.ok(value,name);checks.push({name,passed:true})}
try{
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.clear();localStorage.setItem('inseetCookieConsent','accepted');"});
 fs.mkdirSync('output/home-local',{recursive:true});
 for(const width of [1440,375,768]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  await send('Page.navigate',{url:'http://localhost:5173/'});
  await waitFor("document.querySelector('[aria-label=\"Next testimonial\"]')!==null");await delay(3300);
  check('Latest Jobs above trusted companies at '+width,await evaluate("(()=>{const headings=[...document.querySelectorAll('h2')].filter(e=>e.getBoundingClientRect().height>0);return headings.findIndex(e=>e.textContent==='Latest Jobs')<headings.findIndex(e=>e.textContent==='Trusted companies hiring on INSEET')})()"));
  check('Screenshot testimonial design uses live count and rating at '+width,await evaluate("[...document.querySelectorAll('p')].some(e=>e.textContent==='56')&&[...document.querySelectorAll('p')].some(e=>e.textContent==='5.0')"));
  check('Navigation stays compact with 56 reviews at '+width,await evaluate("document.querySelectorAll('[aria-label^=\"Show testimonial from\"]').length===7"));
  check('Page fits screen at '+width,await evaluate("document.documentElement.scrollWidth<=innerWidth"));
  await evaluate("document.querySelector('[aria-label=\"Next testimonial\"]').click()");await delay(600);
  check('Next review works at '+width,await evaluate("document.querySelector('[aria-current=true][aria-label^=\"Show testimonial\"]').getAttribute('aria-label').includes('Reviewer 1')"));
  await evaluate("document.querySelector('[aria-label=\"Previous testimonial\"]').click()");await delay(600);
  await evaluate("document.querySelector('[aria-label=\"Testimonial navigation\"]').closest('section').scrollIntoView({behavior:'instant'})");await delay(200);
  const shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('output/home-local/testimonials-'+width+'.png',Buffer.from(shot.data,'base64'));
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await evaluate("document.querySelector('footer a[href=\"/jobs\"]').scrollIntoView({behavior:'instant',block:'center'})");await delay(200);
 const point=await evaluate("(()=>{const a=document.querySelector('footer a[href=\"/jobs\"]');const r=a.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,bg:getComputedStyle(a).backgroundColor}})()");
 await send('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x,y:point.y});await delay(250);
 check('Footer CTA changes appearance on hover',await evaluate("getComputedStyle(document.querySelector('footer a[href=\"/jobs\"]')).backgroundColor")!==point.bg);
 check('No browser runtime errors',errors.length===0);console.log(JSON.stringify({checks,errors},null,2));fs.writeFileSync('output/home-local/checks.json',JSON.stringify({checks,errors},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id)}
