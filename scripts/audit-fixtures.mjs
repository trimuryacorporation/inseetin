import fs from 'node:fs';
import assert from 'node:assert/strict';
const target=await fetch('http://127.0.0.1:9333/json/new?about:blank',{method:'PUT'}).then(r=>r.json());
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let id=0;const pending=new Map(),errors=[],checks=[];let failJobs=false;
const call=(method,params={})=>new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}))});
const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const job={_id:'507f1f77bcf86cd799439011',title:'React Developer',company:'Audit Company',department:'IT & Software',industry:'Technology',skills:['React','SQL'],type:'Full Time',workMode:'Remote',location:'Pune, Maharashtra, India',salary:'4-6 LPA',status:'Active',approval:'Approved',accountDepartmentStatus:'Active',createdAt:'2026-10-01T00:00:00Z',description:'Test-only job listing for isolated browser verification.',responsibilities:[],requirements:[],benefits:[]};
const fixtures={
 'job-listings':[job,{...job,_id:'507f1f77bcf86cd799439012',title:'SQL Developer',skills:['SQL']}],
 jobs:[job],categories:[{_id:'cat1',name:'IT & Software',status:'Active'}],companies:[{_id:'company1',name:'Audit Company',industry:'Technology',location:'Pune',status:'Active'}],
 testimonials:[{_id:'review1',name:'Audit Reviewer',text:'Fixture-only feedback',rating:4,type:'Candidate',status:'Active'}],
 'freelancer-profiles':[{_id:'free1',name:'Audit Freelancer',role:'React Developer',skills:['React'],status:'Active'}],
};
ws.onmessage=async event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p?.reject(m.error):p?.resolve(m.result);return}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);
 if(m.method==='Fetch.requestPaused'){
  const {requestId,request}=m.params;const url=new URL(request.url);const route=url.pathname.replace(/^\/api\/?/,'');let data=[];
  if(route.startsWith('settings/'))data={value:{siteName:'INSEET',heroBrandNames:['Audit Company']}};
  else if(route==='auth/google-config')data={clientId:''};
  else if(route==='auth/me')data={id:'audit',name:'Audit User',email:'audit@example.test',role:'Admin',status:'Active'};
  else if(route==='dashboard/employer')data={metrics:{totalJobs:1},jobs:[job],applications:[],shortlistedApplications:[]};
  else if(route.startsWith('dashboard/'))data={metrics:{},charts:{monthly:[]}};
  else if(route.startsWith('jobs/'))data=job;
  else data=fixtures[route.split('/')[0]]||[];
  const failed=failJobs&&route==='job-listings';const body=JSON.stringify(failed?{message:'Fixture service unavailable'}:{success:true,data,pagination:{pages:1,total:Array.isArray(data)?data.length:1}});
  await call('Fetch.fulfillRequest',{requestId,responseCode:failed?503:200,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'*'},{name:'Access-Control-Allow-Headers',value:'Authorization, Content-Type'},{name:'Access-Control-Allow-Methods',value:'GET, OPTIONS'}],body:Buffer.from(body).toString('base64')});
 }
};
const navigate=async path=>{errors.length=0;await call('Page.navigate',{url:'http://localhost:5173'+path});for(let i=0;i<60;i++){await sleep(200);if(await evaluate("document.body.innerText.length>150 && !document.body.innerText.includes('Loading page...')"))break;}await sleep(300);};
const record=(name,value)=>{checks.push({name,passed:!!value});assert.ok(value,name)};
try{
 await call('Page.enable');await call('Runtime.enable');await call('Fetch.enable',{patterns:[{urlPattern:'*://*/api/*'}]});
 await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('inseetCookieConsent','accepted')"});
 await call('Emulation.setDeviceMetricsOverride',{width:375,height:812,deviceScaleFactor:1,mobile:true});
 await navigate('/');
 for(let i=0;i<40;i++){if(await evaluate("document.body.innerText.includes('SQL Developer')"))break;await sleep(150)}
 record('Live role counts and titles render',await evaluate("document.body.innerText.includes('SQL Developer') && document.body.innerText.includes('Current openings')"));
 await sleep(3300);record('App popup auto-closes',await evaluate("!document.querySelector('[aria-label=\"Close app download popup\"]')"));
 await navigate('/jobs');record('City and job-type inputs visible on mobile',await evaluate("[document.querySelector('[aria-label=City]'),document.querySelector('[aria-label=\"Job type\"]')].every(el=>el&&el.getBoundingClientRect().height>0)"));
 failJobs=true;await navigate('/jobs');for(let i=0;i<30;i++){if(await evaluate("document.body.innerText.includes('Fixture service unavailable')"))break;await sleep(100)}record('API failures show an error rather than empty jobs',await evaluate("document.body.innerText.includes('Fixture service unavailable')"));failJobs=false;
 await call('Emulation.setDeviceMetricsOverride',{width:1024,height:768,deviceScaleFactor:1,mobile:false});await navigate('/');await sleep(3200);
 record('Tablet menu is reachable',await evaluate("(()=>{const b=document.querySelector('[aria-label=\"Open menu\"]');return b&&b.getBoundingClientRect().height>0})()"));
 await evaluate("document.querySelector('[aria-label=\"Open menu\"]').click()");record('Tablet menu opens',await evaluate("document.querySelector('[aria-expanded=true]')!==null"));
 const routes={Admin:['/admin','/admin/users','/admin/jobs','/admin/companies','/admin/employers','/admin/recruiter-documents','/admin/candidates','/admin/applications','/admin/categories','/admin/faqs','/admin/testimonials','/admin/seo-branding','/admin/projects','/admin/hiring-team','/admin/payments/transactions'],Candidate:['/candidate-dashboard','/candidate-profile','/candidate-applied-jobs','/candidate-saved-jobs','/candidate-job-alerts','/candidate-interview-invites'],recruiter:['/recruiter-dashboard','/recruiter-jobs','/recruiter-profile','/recruiter-applications','/recruiter-find-resume','/recruiter-pricing','/post-job']};
 const layout=[];
 for(const width of [375,768,1280]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
  for(const [role,paths] of Object.entries(routes)){
   await call('Page.addScriptToEvaluateOnNewDocument',{source:"localStorage.setItem('authUser',"+JSON.stringify(JSON.stringify({id:'audit',name:'Audit User',email:'audit@example.test',role,status:'Active',recruiterVerificationStatus:'approved'}))+");localStorage.setItem('authToken','test-fixture-only');localStorage.setItem('authExpiresAt','2099-01-01T00:00:00Z');"});
   for(const path of paths){await navigate(path);const result=await evaluate("({path:location.pathname,text:document.body.innerText.length,overflow:[...document.querySelectorAll('main *,section *,header *')].some(el=>{const r=el.getBoundingClientRect();const style=getComputedStyle(el);if(!r.width||!r.height||style.visibility==='hidden'||el.closest('[inert]')||(r.left>=-1&&r.right<=innerWidth+1))return false;let p=el.parentElement;while(p&&p!==document.body&&p.id!=='root'){if(['auto','scroll','hidden','clip'].includes(getComputedStyle(p).overflowX))return false;p=p.parentElement;}return true}),error:document.body.innerText.includes('Unexpected Application Error')})");layout.push({requestedPath:path,width,...result,errors:[...errors]});}
  }
  console.log('Fixture dashboard checks at '+width+'px complete');
 }
 fs.mkdirSync('output/responsive',{recursive:true});const issues=layout.filter(r=>r.error||r.errors.length||r.overflow||r.text<100||r.path!==(r.requestedPath==='/admin'?'/admin-dashboard':r.requestedPath));fs.writeFileSync('output/responsive/fixtures.json',JSON.stringify({checks,layout,issues},null,2));
 console.log(JSON.stringify({checks,layoutChecks:layout.length,issues},null,2));
}finally{ws.close();await fetch('http://127.0.0.1:9333/json/close/'+target.id);}
