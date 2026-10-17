const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const core=require('../backend/utils/developerApiCore')
const KeyModel=require('../backend/models/DeveloperApiKey')
const LogModel=require('../backend/models/DeveloperApiLog')
const {removeHistoryExpiry}=require('../backend/utils/developerApiRetention')
const {createIntegrationRouter}=require('../backend/routes/developerIntegrationRoutes')
const registry={jobs:{actions:['read'],fields:[{name:'title',type:'String'}]}}

test('permanent keys have no expiry and retain revoke/owner protections',()=>{
 const owner={role:'Admin',status:'Active'},key={expiresAt:null}
 assert.equal(core.validateKeyInput({name:'Permanent CRM',scopes:['jobs:read']},registry).expiresAt,null)
 assert.equal(core.validateKeyInput({name:'Permanent CRM',scopes:['jobs:read'],expiresAt:null},registry).expiresAt,null)
 assert.equal(core.isUsableKey(key,owner,Date.now()+10*365*86400000),true)
 assert.equal(core.isUsableKey({...key,revokedAt:new Date()},owner),false)
 assert.equal(core.isUsableKey(key,{...owner,status:'Inactive'}),false)
 assert.equal(core.isUsableKey(key,{...owner,role:'users'}),false)
 assert.equal(new KeyModel({name:'CRM',owner:'507f1f77bcf86cd799439099',keyHash:'hash',prefix:'prefix',scopes:['jobs:read']}).validateSync(),undefined)
})
test('history schema has no automatic deletion index',()=>assert.ok(LogModel.schema.indexes().every(([,options])=>options.expireAfterSeconds===undefined)))
test('retention migration drops only the old createdAt TTL index',async()=>{
 const dropped=[]
 const indexes=[{name:'_id_',key:{_id:1}},{name:'createdAt_1',key:{createdAt:1},expireAfterSeconds:7776000},{name:'owner_1',key:{owner:1}},{name:'other_ttl',key:{other:1},expireAfterSeconds:100}]
 const Log={collection:{indexes:async()=>indexes,dropIndex:async name=>dropped.push(name)}}
 assert.deepEqual(await removeHistoryExpiry(Log),['createdAt_1']);assert.deepEqual(dropped,['createdAt_1'])
 assert.deepEqual(await removeHistoryExpiry({collection:{indexes:async()=>{throw {code:26}}}}),[])
})
test('more than 120 requests per minute succeed for one permanent key',async t=>{
 const issued=core.generateKey(),owner={_id:'507f1f77bcf86cd799439099',role:'Admin',status:'Active'},key={_id:'permanent-key',owner:owner._id,expiresAt:null,scopes:['jobs:read']}
 let count=0
 const Key={findOne:async()=>key,updateOne:async()=>({})},User={findById:()=>({select:async()=>owner})},Log={create:async()=>({_id:String(++count)}),updateOne:async()=>({})}
 const app=express();app.use('/api/integrations/v1',createIntegrationRouter({Key,User,Log,resources:{jobs:{...registry.jobs,controller:{getAll:(req,res)=>res.json({success:true,data:[]})}}}}))
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
 for(let i=0;i<130;i++){const r=await fetch('http://127.0.0.1:'+server.address().port+'/api/integrations/v1/jobs',{headers:{'X-API-Key':issued.key}});assert.equal(r.status,200,'Request '+(i+1));await r.body.cancel()}
 assert.equal(count,130)
})
test('CRM integration is exempt from the general server request limit',async t=>{
 process.env.NODE_ENV='production';process.env.RATE_LIMIT='1';process.env.JWT_SECRET='fixture-secret-for-global-limit-check'
 const app=require('../backend/server'),server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port
 assert.equal((await fetch(base+'/api/health')).status,200)
 assert.equal((await fetch(base+'/api/health')).status,429)
 for(let i=0;i<3;i++)assert.equal((await fetch(base+'/api/integrations/v1/jobs')).status,401)
})

test('production rollout converts old active keys only once; local startup preserves live compatibility',async()=>{
 const {applyPermanentDeveloperPolicy}=require('../backend/utils/developerApiRetention')
 let complete=null,updates=0,lastFilter
 const Log={collection:{indexes:async()=>[]}}
 const Key={updateMany:async(filter,update)=>{updates++;lastFilter=filter;assert.deepEqual(update,{$set:{expiresAt:null}});return {modifiedCount:1}}}
 const Setting={findOne:()=>({lean:async()=>complete}),findOneAndUpdate:async(filter,update)=>{complete=update.$set}}
 assert.equal((await applyPermanentDeveloperPolicy({Log,Key,Setting})).convertedKeys,0);assert.equal(updates,0)
 assert.equal((await applyPermanentDeveloperPolicy({Log,Key,Setting,convertActiveKeys:true})).convertedKeys,1)
 assert.equal(lastFilter.revokedAt,null);assert.ok(lastFilter.expiresAt.$gt instanceof Date);assert.ok(lastFilter.createdAt.$lte instanceof Date)
 assert.equal((await applyPermanentDeveloperPolicy({Log,Key,Setting,convertActiveKeys:true})).convertedKeys,0);assert.equal(updates,1)
})
