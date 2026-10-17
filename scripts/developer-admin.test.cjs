const test = require('node:test')
const assert = require('node:assert/strict')
const express = require('express')
const http = require('node:http')
const jwt = require('jsonwebtoken')
const User = require('../backend/models/User')
const Key = require('../backend/models/DeveloperApiKey')
const Log = require('../backend/models/DeveloperApiLog')
const { router, buildOpenApi } = require('../backend/routes/developerAdminRoutes')
const { errorHandler } = require('../backend/middleware/errorMiddleware')

test('OpenAPI describes documented resources, security, and operation scopes', () => {
 const doc=buildOpenApi()
 assert.equal(doc.openapi,'3.0.3')
 assert.equal(doc.components.securitySchemes.CrmApiKey.name,'X-API-Key')
 assert.ok(doc.paths['/jobs'].get)
 assert.ok(doc.paths['/jobs/{id}'].delete)
 assert.equal(doc.paths['/site-branding'].delete,undefined)
 assert.equal(doc.paths['/settings'],undefined)
 assert.equal(doc.components.schemas.users.properties.password.writeOnly,true)
 assert.ok(!doc.components.schemas.users.properties.role.enum.includes('Admin'))
 assert.ok(doc.paths['/jobs'].post.requestBody.content['application/json'].schema.required.includes('title'))
})

test('Admin key management is owner-scoped and never returns stored key hashes', async t => {
 const secretBefore=process.env.JWT_SECRET;process.env.JWT_SECRET='isolated-crm-admin-test-secret'
 const ownerId='507f1f77bcf86cd799439099', otherId='507f1f77bcf86cd799439098', keyId='507f1f77bcf86cd799439001'
 const original={user:User.findById,find:Key.find,create:Key.create,update:Key.findOneAndUpdate,logs:Log.find,count:Log.countDocuments}
 let role='Admin';const records=[]
 User.findById=id=>({select:async()=>({_id:id,role,status:'Active'})})
 const safe=row=>{if(!row)return row;const {keyHash,...result}=row;return result}
 const query=value=>({select(){return this},sort(){return this},skip(){return this},limit(){return this},lean:async()=>value})
 Key.create=async value=>{const record={_id:keyId,revokedAt:null,...value};records.push(record);return record}
 Key.find=filter=>query(records.filter(row=>row.owner===filter.owner).map(safe))
 Key.findOneAndUpdate=(filter,update)=>{const record=records.find(row=>row._id===filter._id&&row.owner===filter.owner&&(!Object.hasOwn(filter,'revokedAt')||row.revokedAt===filter.revokedAt));if(record)Object.assign(record,update.$set);return query(safe(record))}
 Log.find=()=>query([]);Log.countDocuments=async()=>0
 const app=express();app.use(express.json());app.use('/api/developer',router);app.use(errorHandler)
 const server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
 t.after(async()=>{User.findById=original.user;Key.find=original.find;Key.create=original.create;Key.findOneAndUpdate=original.update;Log.find=original.logs;Log.countDocuments=original.count;if(secretBefore===undefined)delete process.env.JWT_SECRET;else process.env.JWT_SECRET=secretBefore;await new Promise(resolve=>server.close(resolve))})
 const url='http://127.0.0.1:'+server.address().port+'/api/developer'
 const request=async(path,method='GET',body,owner=ownerId,tokenOverride)=>{const token=tokenOverride===undefined?jwt.sign({id:owner},process.env.JWT_SECRET):tokenOverride;const r=await fetch(url+path,{method,headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()}}
 const payload={name:'Test CRM',scopes:['jobs:read','jobs:create'],expiresAt:new Date(Date.now()+86400000).toISOString()}
 await t.test('anonymous and non-admin users cannot manage API keys',async()=>{assert.equal((await request('/keys','GET',undefined,ownerId,'invalid')).status,401);role='staff';assert.equal((await request('/keys')).status,403);role='Admin'})
 await t.test('creation returns a secret once and persists only its hash',async()=>{const result=await request('/keys','POST',payload);assert.equal(result.status,201);assert.match(result.body.data.key,/^ins_live_/);assert.equal(records[0].key,undefined);assert.notEqual(records[0].keyHash,result.body.data.key);assert.equal(result.body.data.keyHash,undefined);assert.equal(records[0].owner,ownerId)})
 await t.test('listing never retrieves the original secret',async()=>{const result=await request('/keys');assert.equal(result.body.data.length,1);assert.equal(result.body.data[0].key,undefined);assert.equal(result.body.data[0].keyHash,undefined)})
 await t.test('other admins cannot see or change this owners key',async()=>{assert.equal((await request('/keys','GET',undefined,otherId)).body.data.length,0);assert.equal((await request('/keys/'+keyId,'PUT',payload,otherId)).status,404);assert.equal((await request('/keys/'+keyId,'DELETE',undefined,otherId)).status,404)})
 await t.test('permissions can be changed and invalid scopes are rejected',async()=>{assert.equal((await request('/keys/'+keyId,'PUT',{...payload,scopes:['jobs:read']})).status,200);assert.deepEqual(records[0].scopes,['jobs:read']);assert.equal((await request('/keys','POST',{...payload,scopes:['settings:read']})).status,400)})
 await t.test('revocation is persistent and a revoked key cannot be edited',async()=>{assert.equal((await request('/keys/'+keyId,'DELETE')).status,200);assert.ok(records[0].revokedAt);assert.equal((await request('/keys/'+keyId,'PUT',payload)).status,404)})
})
