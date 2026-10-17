const test=require('node:test')
const assert=require('node:assert/strict')
process.env.NODE_ENV='production'
process.env.JWT_SECRET='isolated-api-permissions-signing-secret'
const app=require('../backend/server')
const publicReads=new Set(['jobs','companies','content-pages','contentpages','faqs','freelancer-profiles','career-jobs','categories','locations','pricing-packages','press-news','testimonials','video-testimonials'])
const publicCreates=new Set(['employers','recruiter-documents','newsletter-subscribers','newslettersubscribers','support-messages'])
const resources=[...publicReads,'users','employers','candidates','applications','newsletter-subscribers','newslettersubscribers','payments','recruiter-documents','resumes','settings','support-messages']
test('actual resource routers reject unauthenticated protected operations',async t=>{
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port+'/api/'
 for(const resource of resources){
  await t.test(resource+' permissions',async()=>{
   const operations=[['PUT','/507f1f77bcf86cd799439011'],['DELETE','/507f1f77bcf86cd799439011']]
   if(!publicReads.has(resource))operations.push(['GET',''])
   if(!publicCreates.has(resource))operations.push(['POST',''])
   for(const [method,suffix]of operations){const r=await fetch(base+resource+suffix,{method,headers:{'Content-Type':'application/json'},...(['POST','PUT'].includes(method)?{body:'{}'}:{})});assert.equal(r.status,401,method+' '+resource+suffix);assert.equal((await r.json()).success,false)}
  })
 }
 for(const path of ['developer/keys','developer/catalog','developer/logs','developer/openapi.json','dashboard/admin','dashboard/employer','campaigns','campaigns/follow-ups','auth/me','user-locations/current','user-locations/history','user-locations/active','settings/site-branding']){
  await t.test(path+' requires authentication',async()=>{const r=await fetch(base+path);assert.equal(r.status,401)})
 }
})
