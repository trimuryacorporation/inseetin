const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const {resources:production}=require('../backend/utils/developerApiResources')
const crud=require('../backend/controllers/crudController')
const {createIntegrationRouter}=require('../backend/routes/developerIntegrationRoutes')
const {generateKey}=require('../backend/utils/developerApiCore')
const recordId='507f1f77bcf86cd799439011',ownerId='507f1f77bcf86cd799439099'
// Exercise real dispatch, schema allowlists, scope checks, and generic CRUD with in-memory records.
// Resource-specific provider/file hooks are covered separately or remain external integration checks.
for(const [id,entry]of Object.entries(production)){
 test(id+' CRM HTTP lifecycle',async t=>{
  const issued=generateKey(),records=new Map(),logs=[]
  const key={_id:'key-'+id,owner:ownerId,expiresAt:new Date(Date.now()+86400000),scopes:entry.actions.map(action=>id+':'+action)}
  const Key={findOne:async q=>q.keyHash===issued.keyHash?key:null,updateOne:async()=>({})}
  const User={findById:id=>({select:async()=>({_id:id,role:id===ownerId?'Admin':'users',status:'Active'})})}
  const Log={create:async value=>{logs.push(value);return {_id:String(logs.length)}},updateOne:async()=>({})}
  const Model={modelName:id,find:()=>({sort:()=>({skip:()=>({limit:async()=>[...records.values()]})})}),countDocuments:async()=>records.size,create:async body=>{const value={_id:recordId,...body};records.set(recordId,value);return value},findById:async id=>records.get(id),findByIdAndUpdate:async(id,body)=>{const current=records.get(id);if(!current)return null;Object.assign(current,body);return current},findByIdAndDelete:async id=>{const value=records.get(id);records.delete(id);return value}}
  const controller=crud(Model)
  if(entry.singleton){records.set(recordId,{_id:recordId});controller.getAll=(req,res)=>res.json({success:true,data:records.get(recordId)});controller.update=(req,res)=>{Object.assign(records.get(recordId),req.body);res.json({success:true,data:records.get(recordId)})}}
  const app=express();app.use(express.json());app.use('/api/integrations/v1',createIntegrationRouter({Key,User,Log,resources:{[id]:{...entry,controller}}}))
  const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
  const base='http://127.0.0.1:'+server.address().port+'/api/integrations/v1/'+id
  const request=async(method='GET',suffix='',body,secret=issued.key)=>{const r=await fetch(base+suffix,{method,headers:{'X-API-Key':secret,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});return {status:r.status,body:await r.json()}}
  const field=entry.fields.find(field=>field.type==='String'&&!['role','password','email'].includes(field.name)&&!field.enum)||entry.fields.find(field=>field.type==='String')
  assert.ok(field,'writable string field exists')
  const value=field.enum?.[0]||'Fixture value',body={[field.name]:value}
  if(id==='users')Object.assign(body,{name:'Fixture User',role:'users',email:'fixture@example.test',password:'FixturePass123!'})
  await t.test('rejects missing key',async()=>assert.equal((await request('GET','',undefined,'')).status,401))
  if(!entry.singleton)await t.test('POST creates a record',async()=>assert.equal((await request('POST','',body)).status,201))
  await t.test('GET returns fixture records',async()=>assert.equal((await request()).status,200))
  const suffix=entry.singleton?'':'/'+recordId
  if(!entry.singleton)await t.test('GET by ID returns the created record',async()=>assert.equal((await request('GET',suffix)).status,200))
  await t.test('PUT and PATCH persist updates',async()=>{for(const method of ['PUT','PATCH']){const r=await request(method,suffix,body);assert.equal(r.status,200);assert.equal(r.body.data[field.name],body[field.name])}})
  await t.test('unknown fields are rejected',async()=>assert.equal((await request('PATCH',suffix,{unknownField:'bad'})).status,400))
  await t.test('read-only keys cannot edit',async()=>{const original=key.scopes;key.scopes=[id+':read'];assert.equal((await request('PATCH',suffix,body)).status,403);key.scopes=original})
  if(!entry.singleton)await t.test('DELETE removes record and GET then returns 404',async()=>{assert.equal((await request('DELETE',suffix)).status,200);assert.equal((await request('GET',suffix)).status,404);assert.equal(records.size,0)})
  else await t.test('singleton cannot be deleted',async()=>assert.equal((await request('DELETE')).status,405))
  assert.ok(logs.length>=(entry.singleton?6:7),'requests are audited')
 })
}
