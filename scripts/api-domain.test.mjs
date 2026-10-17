import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { resolveApiBaseUrl } from '../frontend/src/utils/apiBaseUrl.js'

for (const hostname of ['inseet.in','www.inseet.in']) {
 test(hostname+' ignores stale Render build environment',()=>{
  assert.equal(resolveApiBaseUrl({hostname,origin:'https://'+hostname,configuredUrl:'https://cromgerozgar.onrender.com'}),'https://'+hostname)
 })
}
for (const hostname of ['localhost','127.0.0.1','[::1]']) {
 test(hostname+' uses local backend with production environment present',()=>{
  assert.equal(resolveApiBaseUrl({hostname,origin:'http://'+hostname+':5173',configuredUrl:'https://inseet.in'}),'http://localhost:5050')
 })
}
test('explicit local backend port is preserved',()=>{
 assert.equal(resolveApiBaseUrl({hostname:'localhost',localUrl:'http://127.0.0.1:5151'}),'http://127.0.0.1:5151')
})
test('public fallback is INSEET',()=>assert.equal(resolveApiBaseUrl(),'https://inseet.in'))
test('Vercel forwards nested API routes before the SPA and keeps query filters',()=>{
 const config=JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url)))
 const rule=config.rewrites[0]
 assert.equal(rule.source,'/api/(.*)')
 for(const route of ['developer/keys','developer/openapi.json','integrations/v1/jobs','auth/login']){
  const incoming=new URL('https://inseet.in/api/'+route+'?page=2&limit=10')
  const suffix=incoming.pathname.match(/^\/api\/(.*)$/)[1]
  const destination=rule.destination.replace('$1',suffix)+incoming.search
  assert.equal(destination,'https://cromgerozgar.onrender.com/api/'+route+'?page=2&limit=10')
 }
 assert.equal(config.rewrites[1].destination,'/index.html')
})
