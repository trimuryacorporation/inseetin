const fs=require('node:fs')
const express=require('node:module').createRequire(require.resolve('../backend/server'))('express')
const originalRouter=express.Router
function auditRouter(...args){
 const router=originalRouter(...args),use=router.use
 router.use=function(...args){const start=this.stack.length;const prefix=typeof args[0]==='string'?args[0]:'';const result=use.apply(this,args);for(const layer of this.stack.slice(start))layer.auditMountPath=prefix;return result}
 return router
}
Object.defineProperty(express,'Router',{value:auditRouter,configurable:true,writable:true})
const router=require('../backend/routes')
const inventory=[]
function walk(router,prefix){for(const layer of router.stack){if(layer.route){for(const method of Object.keys(layer.route.methods))inventory.push({method:method.toUpperCase(),path:(prefix+layer.route.path).replace(/\/+/g,'/')})}else if(layer.handle?.stack)walk(layer.handle,prefix+(layer.auditMountPath||''))}}
walk(router,'/api')
require('node:assert/strict').ok(inventory.some(row=>row.path==='/api/developer/keys'),'Developer route must include its mount prefix')
fs.mkdirSync('output/api-audit',{recursive:true});fs.writeFileSync('output/api-audit/route-inventory.json',JSON.stringify(inventory,null,2))
const publicPaths=['health','auth/google-config','recruiter-page','company-profiles','job-listings','portal-summary','jobs','companies','content-pages','faqs','freelancer-profiles','career-jobs','categories','locations','pricing-packages','press-news','testimonials','video-testimonials','settings/public/site-branding','settings/public/social-links']
const protectedPaths=['users','employers','candidates','applications','newsletter-subscribers','newsletter-updates','payments','recruiter-documents','resumes','settings','settings/site-branding','support-messages','dashboard/admin','dashboard/employer','campaigns','campaigns/follow-ups','user-locations/current','user-locations/history','user-locations/active','auth/me','developer/keys','developer/catalog','developer/logs?page=1','developer/openapi.json','integrations/v1/jobs']
const endpoints=[...publicPaths.map(path=>({path:'/api/'+path,expected:200})),...protectedPaths.map(path=>({path:'/api/'+path,expected:401}))]
const bases=['https://www.inseet.in','https://inseet.in','https://inseet.onrender.com']
async function audit(){
 const results=[]
 for(const base of bases){
  let cursor=0
  await Promise.all(Array.from({length:3},async()=>{while(cursor<endpoints.length){const endpoint=endpoints[cursor++];const started=Date.now();try{const r=await fetch(base+endpoint.path,{headers:{Origin:'https://www.inseet.in'},signal:AbortSignal.timeout(20000)});const type=r.headers.get('content-type')||'';const row={base,...endpoint,status:r.status,json:type.includes('application/json'),durationMs:Date.now()-started};row.passed=row.status===row.expected&&row.json;results.push(row);await r.body?.cancel()}catch(e){results.push({base,...endpoint,passed:false,error:e.message,durationMs:Date.now()-started})}}}))
 }
 const summary=bases.map(base=>({base,total:results.filter(r=>r.base===base).length,passed:results.filter(r=>r.base===base&&r.passed).length,failed:results.filter(r=>r.base===base&&!r.passed).length}))
 const report={checkedAt:new Date().toISOString(),registeredRoutes:inventory.length,scope:'Unauthenticated, read-only smoke checks. 401 is expected for protected endpoints; no live records or credentials are changed.',summary,results}
 if(results.some(row=>!row.passed))process.exitCode=1
 fs.writeFileSync('output/api-audit/live-results.json',JSON.stringify(report,null,2));console.log(JSON.stringify({registeredRoutes:inventory.length,summary,failures:results.filter(r=>!r.passed).map(({base,path,status,error})=>({base,path,status,error}))},null,2))
}
if(process.argv.includes('--inventory'))console.log(JSON.stringify({registeredRoutes:inventory.length,developerPaths:inventory.filter(row=>row.path.startsWith('/api/developer'))},null,2))
else audit().catch(e=>{console.error(e.message);process.exitCode=1})
