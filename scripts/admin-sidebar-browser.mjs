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
 if(route==='developer/catalog')data={resources:catalog,basePath:'/api/integrations/v1'}
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
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('authUser',JSON.stringify({_id:'507f1f77bcf86cd799439099',name:'Test Admin',role:'Admin',status:'Active'}));localStorage.setItem('authToken','test-fixture-only');localStorage.setItem('authExpiresAt','2099-01-01');"});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5173/admin/companies'});
 await waitFor("document.querySelector('nav[aria-label=\"Panel navigation\"] h2')!==null");
 const visibleNav="[...document.querySelectorAll('nav[aria-label=\"Panel navigation\"]')].find(n=>n.getBoundingClientRect().width>0)";
 check('Six clearly labeled navigation sections',await evaluate(visibleNav+".querySelectorAll('h2').length===6"));
 check('Only Company is marked current',await evaluate(visibleNav+".querySelectorAll('[aria-current=page]').length===1 && "+visibleNav+".querySelector('[aria-current=page]').textContent.trim()==='Companies'"));
 check('API Developer is in Settings & Integrations',await evaluate(visibleNav+".querySelector('a[href=\"/admin/api-developer\"]').closest('section').getAttribute('aria-label')==='Settings & Integrations'"));
 check('Industry and project icons match their destinations',await evaluate(visibleNav+".querySelector('a[href=\"/admin/categories\"] svg').classList.contains('lucide-factory') && [...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Projects').querySelector('svg').classList.contains('lucide-folder-kanban')"));
 await evaluate("[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Campaigns').click()");await delay(150);
 check('Campaigns submenu opens without missing-icon crash',await evaluate(visibleNav+".querySelector('a[href=\"/admin/campaigns\"] svg').classList.contains('lucide-megaphone')"));
 await evaluate("[...document.querySelectorAll('nav button')].find(b=>b.textContent.trim()==='Users').click()");
 await evaluate("document.querySelector('nav a[href=\"/admin/users?q=staff\"]').click()");
 await waitFor("location.search==='?q=staff'");await delay(200);
 check('User filter highlights Staff only',await evaluate(visibleNav+".querySelectorAll('[aria-current=page]').length===1 && "+visibleNav+".querySelector('[aria-current=page]').textContent.trim()==='Staff'"));
 fs.mkdirSync('output/sidebar',{recursive:true});
 let shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('output/sidebar/desktop.png',Buffer.from(shot.data,'base64'));
 await send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true});await delay(200);
 await evaluate("document.querySelector('[aria-label=\"Toggle sidebar menu\"]').click()");await delay(200);
 check('Mobile drawer displays all sections',await evaluate(visibleNav+".querySelectorAll('h2').length===6"));
 shot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('output/sidebar/mobile.png',Buffer.from(shot.data,'base64'));
 await evaluate(visibleNav+".querySelector('a[href=\"/admin/companies\"]').click()");await delay(200);
 check('Selecting a page closes mobile navigation',await evaluate("document.querySelector('[aria-label=\"Close navigation\"]')===null"));
 check('No runtime exceptions',errors.length===0);console.log(JSON.stringify({checks,errors},null,2));fs.writeFileSync('output/sidebar/checks.json',JSON.stringify({checks,errors},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id)}
