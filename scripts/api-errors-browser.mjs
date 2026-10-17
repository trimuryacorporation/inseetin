import fs from 'node:fs'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const catalog = require('../backend/utils/developerApiResources').catalog()
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json())
const ws=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject})
let sequence=0;const pending=new Map(),errors=[],checks=[]
const keys=[];let createdBody=null,updatedBody=null,revoked=false;let fail=true
const secret='ins_live_'+'x'.repeat(43),keyId='507f1f77bcf86cd799439001'
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})
const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))
ws.onmessage=async event=>{
 const message=JSON.parse(event.data)
 if(message.id){const p=pending.get(message.id);pending.delete(message.id);message.error?p?.reject(message.error):p?.resolve(message.result);return}
 if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text)
 if(message.method!=='Fetch.requestPaused')return
 const {requestId,request}=message.params;
 if(fail && request.method==='GET' && new URL(request.url).pathname==='/api/developer/keys'){
  await send('Fetch.fulfillRequest',{requestId,responseCode:404,responseHeaders:[{name:'Content-Type',value:'text/plain'},{name:'Access-Control-Allow-Origin',value:'*'}],body:Buffer.from('The page could not be found\nNOT_FOUND').toString('base64')});return
 }
const route=new URL(request.url).pathname.replace(/^\/api\//,'');let data=[],extra={}
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
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('authUser',JSON.stringify({_id:'507f1f77bcf86cd799439099',name:'API Test Admin',role:'Admin',status:'Active'}));localStorage.setItem('authToken','test-fixture-only');localStorage.setItem('authExpiresAt','2099-01-01');"});
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'http://localhost:5173/admin/api-developer'});
 await waitFor("document.body.innerText.includes('The API route is unavailable')");
 check('Hosting 404 displays a routing error instead of generic failure',await evaluate("!document.body.innerText.includes('API request failed')"));
 check('Failure leaves the application usable',await evaluate("document.querySelector('nav[aria-label=\"Panel navigation\"]')!==null"));
 fail=false;await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='Refresh').click()");
 await waitFor("document.querySelector('[aria-label=\"Jobs: Delete\"]')!==null");
 check('Refresh recovers after the API returns',await evaluate("!document.body.innerText.includes('The API route is unavailable')"));
 check('No browser runtime errors',errors.length===0);console.log(JSON.stringify({checks,errors},null,2));fs.writeFileSync('output/api-audit/error-browser.json',JSON.stringify({checks,errors},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id)}
