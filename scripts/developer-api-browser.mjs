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
 await send('Page.enable');await send('Runtime.enable');await send('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]})
 await send('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('authUser',JSON.stringify({_id:'507f1f77bcf86cd799439099',name:'API Test Admin',email:'api-test@example.test',role:'Admin',status:'Active'}));localStorage.setItem('authToken','test-fixture-only');localStorage.setItem('authExpiresAt','2099-01-01');localStorage.setItem('inseetCookieConsent','accepted');"})
 await send('Emulation.setDeviceMetricsOverride',{width:375,height:900,deviceScaleFactor:1,mobile:true})
 await send('Page.navigate',{url:'http://localhost:5173/admin/api-developer'})
 await waitFor("document.querySelector('[aria-label=\"Jobs: Delete\"]')!==null")
 check('Never expires is the default',await evaluate("document.querySelector('[aria-label=\"Never expires\"]').checked"))
 check('Old limit and 90-day history message is removed',await evaluate("!document.body.innerText.includes('120 requests/minute')&&!document.body.innerText.includes('History: 90 days')"))
 check('API Developer page loads for Admin',await evaluate("document.querySelector('h1').textContent.includes('API Developer')"))
 await evaluate("document.querySelector('[aria-label=\"Jobs: Delete\"]').click()")
 await delay(100)
 await evaluate("[...document.querySelectorAll('form')].find(form=>form.textContent.includes('Create CRM API key')).requestSubmit()")
 await waitFor("document.querySelector('[aria-label=\"New CRM API key\"]')!==null")
 check('Key creation submits chosen scopes',createdBody?.scopes.includes('jobs:delete'))
 check('New keys are permanent',createdBody?.expiresAt===null)
 check('Secret stays masked by default',await evaluate("document.querySelector('[aria-label=\"New CRM API key\"]').type==='password'"))
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Dismiss').click()")
 check('Dismiss removes secret from the page',await evaluate("document.querySelector('[aria-label=\"New CRM API key\"]')===null"))
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Edit access').click()")
 await delay(100)
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Read only').click()")
 await delay(100)
 await evaluate("[...document.querySelectorAll('form')].find(form=>form.textContent.includes('Edit CRM access')).requestSubmit()")
 for(let i=0;i<30&&!updatedBody;i++)await delay(100)
 check('Editing can remove all write permissions',updatedBody?.scopes.every(scope=>scope.endsWith(':read')))
 check('Editing preserves permanent key expiry',updatedBody?.expiresAt===null)
 await waitFor("[...document.querySelectorAll('button')].some(button=>button.textContent==='Revoke'&&!button.disabled)")
 await evaluate("window.confirm=()=>true;[...document.querySelectorAll('button')].find(button=>button.textContent==='Revoke').click()")
 for(let i=0;i<30&&!revoked;i++)await delay(100)
 check('Revoke calls the revoke endpoint',revoked)
 fs.mkdirSync('output/developer-api',{recursive:true})
 for(const width of [375,768,1440]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});await delay(300)
  const overflow=await evaluate("[...document.querySelectorAll('main *,header *')].filter(el=>{const r=el.getBoundingClientRect();if(!r.width||!r.height||el.closest('[inert]')||(r.left>=-1&&r.right<=innerWidth+1))return false;let parent=el.parentElement;while(parent&&parent!==document.body&&parent.id!=='root'){if(['auto','scroll','hidden','clip'].includes(getComputedStyle(parent).overflowX))return false;parent=parent.parentElement}return true}).map(el=>el.tagName+':'+el.textContent.slice(0,50))")
  check('Responsive API workspace at '+width+'px',overflow.length===0)
  const screenshot=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync('output/developer-api/admin-'+width+'.png',Buffer.from(screenshot.data,'base64'))
 }
 check('No browser runtime exceptions',errors.length===0)
 fs.writeFileSync('output/developer-api/browser-checks.json',JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors},null,2))
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id)}
