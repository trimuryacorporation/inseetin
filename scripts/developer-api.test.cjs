const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const core = require('../backend/utils/developerApiCore')
const { createIntegrationRouter } = require('../backend/routes/developerIntegrationRoutes')

const registry = { jobs: { actions: ['read','create','update','delete'], fields: [{ name:'title' },{ name:'status' }] } }
test('keys are high entropy, hashed at rest and independently generated', () => {
 const first=core.generateKey(), second=core.generateKey()
 assert.match(first.key,/^ins_live_[A-Za-z0-9_-]{43}$/)
 assert.notEqual(first.key,second.key)
 assert.equal(first.keyHash,core.hashKey(first.key))
 assert.equal(first.keyHash.length,64)
 assert.ok(!first.keyHash.includes(first.key))
})
test('scopes reject unknown resources, wildcards and invalid actions', () => {
 for(const scopes of [[],['jobs:*'],['settings:read'],['jobs:read:delete'],[null],['__proto__:read']]) assert.throws(()=>core.validateScopes(scopes,registry),{statusCode:400})
 assert.deepEqual(core.validateScopes(['jobs:read','jobs:read'],registry),['jobs:read'])
})
test('expiry and active ownership are enforced', () => {
 const now=Date.now(), key={expiresAt:new Date(now+10000)}, owner={role:'Admin',status:'Active'}
 assert.ok(core.isUsableKey(key,owner,now))
 for(const invalid of [{...key,revokedAt:new Date()},{...key,expiresAt:new Date(now-1)}]) assert.equal(core.isUsableKey(invalid,owner,now),false)
 for(const invalid of [null,{role:'staff',status:'Active'},{role:'Admin',status:'Suspend'}]) assert.equal(core.isUsableKey(key,invalid,now),false)
 assert.throws(()=>core.validateKeyInput({name:'CRM',scopes:['jobs:read'],expiresAt:new Date(now-1)},registry,now),{statusCode:400})
 assert.throws(()=>core.validateKeyInput({name:'CRM',scopes:['jobs:read'],expiresAt:new Date(now+400*86400000)},registry,now),{statusCode:400})
})
test('query and payload validation block operators and immutable fields', () => {
 const entry=registry.jobs
 for(const body of [[],{},{$set:{title:'x'}},{_id:'x'},{title:{'$ne':null}},JSON.parse('{"__proto__":{"polluted":true}}')]) assert.throws(()=>core.validateBody(body,entry),{statusCode:400})
 for(const query of [{limit:'101'},{page:'0'},{status:{$ne:'x'}},{'$where':'true'},{sort:'$natural'},{updatedSince:'invalid'}]) assert.throws(()=>core.validateQuery(query,entry),{statusCode:400})
 assert.deepEqual(core.validateBody({title:'Example'},entry),{title:'Example'})
 const query=core.validateQuery({search:'a.*(b)',updatedSince:'2026-01-01T00:00:00Z'},entry)
 assert.equal(query.search,'a\\.\\*\\(b\\)')
 assert.ok(query.updatedAt.$gte instanceof Date)
})
test('response redaction handles nested credentials', () => {
 assert.deepEqual(core.redact({data:[{name:'CRM',password:'hidden',resumeJson:{apiToken:'hidden',title:'visible'},googleId:'hidden'}]}),{data:[{name:'CRM',resumeJson:{title:'visible'}}]})
})

test('HTTP integration CRUD, scopes, revocation and audits', async t => {
 const issued=core.generateKey(), recordId='507f1f77bcf86cd799439011', adminId='507f1f77bcf86cd799439099'
 const state={key:{_id:'507f1f77bcf86cd799439001',owner:adminId,expiresAt:new Date(Date.now()+86400000),scopes:['jobs:read','jobs:create','jobs:update','jobs:delete','users:update','users:create','users:delete']},owner:{_id:adminId,role:'Admin',status:'Active'},calls:0,logs:[],records:new Map()}
 const Key={findOne:async query=>query.keyHash===issued.keyHash?state.key:null,updateOne:async()=>({})}
 const User={findById:id=>({select:async()=>id===adminId?state.owner:null})}
 const Log={create:async value=>{const log={_id:String(state.logs.length+1),...value};state.logs.push(log);return log},updateOne:async(filter,value)=>{Object.assign(state.logs.find(row=>row._id===filter._id),value.$set)}}
 let lastQuery
 const controller={
  getAll:(req,res)=>{state.calls++;lastQuery=req.query;res.json({success:true,data:[...state.records.values()],pagination:{page:1,total:state.records.size,pages:1}})},
  getById:(req,res)=>{state.calls++;const value=state.records.get(req.params.id);res.status(value?200:404).json({success:!!value,data:value})},
  create:(req,res)=>{state.calls++;const value={_id:recordId,...req.body,password:'must-not-leak',nested:{accessToken:'must-not-leak'}};state.records.set(recordId,value);res.status(201).json({success:true,data:value})},
  update:(req,res)=>{state.calls++;Object.assign(state.records.get(req.params.id),req.body);res.json({success:true,data:state.records.get(req.params.id)})},
  remove:(req,res)=>{state.calls++;state.records.delete(req.params.id);res.json({success:true,data:{_id:req.params.id}})},
 }
 const resources={jobs:{...registry.jobs,controller},users:{actions:['read','create','update','delete'],fields:[{name:'role'},{name:'name'}],controller}}
 const app=express();app.use(express.json());app.use('/api/integrations/v1',createIntegrationRouter({Key,User,Log,resources}));
 const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port+'/api/integrations/v1'
 const request=async(path,method='GET',body,key=issued.key)=>{const response=await fetch(base+path,{method,headers:{'X-API-Key':key,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:response.status,body:await response.json(),headers:response.headers}}
 await t.test('missing and incorrect keys cannot read records',async()=>{assert.equal((await request('/jobs','GET',undefined,'')).status,401);assert.equal((await request('/jobs','GET',undefined,core.generateKey().key)).status,401);assert.equal(state.calls,0)})
 await t.test('create and read return data without credentials',async()=>{const created=await request('/jobs','POST',{title:'CRM Test',status:'Active'});assert.equal(created.status,201);assert.equal(created.body.data.title,'CRM Test');assert.equal(created.body.data.password,undefined);assert.equal(created.body.data.nested.accessToken,undefined);assert.ok(created.headers.get('x-request-id'));assert.equal((await request('/jobs/'+recordId)).status,200)})
 await t.test('list filters support paging and modified-since without injection',async()=>{assert.equal((await request('/jobs?limit=20&updatedSince=2026-01-01T00:00:00Z')).status,200);assert.ok(lastQuery.updatedAt.$gte instanceof Date);assert.equal((await request('/jobs?status%5B%24ne%5D=Blocked')).status,400)})
 await t.test('PUT and PATCH edit the same record',async()=>{assert.equal((await request('/jobs/'+recordId,'PUT',{title:'Updated'})).status,200);assert.equal((await request('/jobs/'+recordId,'PATCH',{status:'Pending'})).body.data.title,'Updated')})
 await t.test('unknown resources, operators, unknown fields and invalid IDs are rejected',async()=>{assert.equal((await request('/settings')).status,404);assert.equal((await request('/jobs/invalid')).status,400);assert.equal((await request('/jobs/'+recordId,'PATCH',{$set:{title:'bad'}})).status,400);assert.equal((await request('/jobs','POST',{keyHash:'bad'})).status,400);assert.equal((await request('/jobs','DELETE')).status,405)})
 await t.test('write permissions are checked before executing a controller',async()=>{const previous=state.key.scopes;state.key.scopes=['jobs:read'];const before=state.calls;assert.equal((await request('/jobs/'+recordId,'DELETE')).status,403);assert.equal((await request('/jobs','POST',{title:'blocked'})).status,403);assert.equal(state.calls,before);state.key.scopes=previous})
 await t.test('admin accounts cannot be created, altered or removed by CRM keys',async()=>{assert.equal((await request('/users','POST',{name:'Admin',role:'Admin'})).status,403);assert.equal((await request('/users/'+adminId,'PATCH',{name:'Changed'})).status,403);assert.equal((await request('/users/'+adminId,'DELETE')).status,403)})
 await t.test('DELETE removes a record and logs final HTTP status without payloads',async()=>{assert.equal((await request('/jobs/'+recordId,'DELETE')).status,200);assert.equal(state.records.size,0);await new Promise(resolve=>setImmediate(resolve));const log=state.logs.at(-1);assert.equal(log.statusCode,200);assert.equal(log.resource,'jobs');assert.equal(log.recordId,recordId);assert.equal(log.body,undefined);assert.equal(log.key,undefined)})
 await t.test('revoked, expired and disabled-owner keys lose access',async()=>{state.key.revokedAt=new Date();assert.equal((await request('/jobs')).status,401);state.key.revokedAt=null;const expiry=state.key.expiresAt;state.key.expiresAt=new Date(0);assert.equal((await request('/jobs')).status,401);state.key.expiresAt=expiry;state.owner.status='Suspend';assert.equal((await request('/jobs')).status,401)})
})
