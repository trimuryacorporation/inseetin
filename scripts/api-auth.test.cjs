const test=require('node:test')
const assert=require('node:assert/strict')
const express=require('express')
const jwt=require('jsonwebtoken')
const bcrypt=require('bcryptjs')
process.env.JWT_SECRET='fixture-only-signing-secret-for-api-tests'
process.env.NODE_ENV='production'
const User=require('../backend/models/User')
require('../backend/models/Employer').findOne=async()=>null
const {protect,optionalProtect,authorize}=require('../backend/middleware/authMiddleware')
const {errorHandler}=require('../backend/middleware/errorMiddleware')
const auth=require('../backend/controllers/authController')
const id='507f1f77bcf86cd799439099'
let reads=0,creates=0,fixture
User.findOne=async()=>{reads++;return fixture}
User.findById=()=>({select:async()=>fixture})
User.create=async()=>{creates++;throw new Error('Registration must not write in this test')}

test('real auth handlers and middleware',async t=>{
 const hash=await bcrypt.hash('FixturePass123!',4)
 fixture={_id:id,name:'Fixture User',email:'fixture@example.test',role:'users',status:'Active',password:hash,matchPassword:password=>bcrypt.compare(password,hash)}
 const app=express();app.use(express.json());app.post('/login',auth.login);app.post('/register',auth.register);app.post('/google',auth.googleAuth)
 app.get('/optional',optionalProtect,(req,res)=>res.json({role:req.user?.role||'public'}))
 app.get('/protected',protect,(req,res)=>res.json({role:req.user.role}))
 app.get('/admin',protect,authorize('Admin'),(req,res)=>res.json({success:true}));app.use(errorHandler)
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)))
 const base='http://127.0.0.1:'+server.address().port
 const request=async(path,{method='GET',body,token}={})=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()}}
 await t.test('successful login signs a usable token and excludes password',async()=>{const r=await request('/login',{method:'POST',body:{email:fixture.email,password:'FixturePass123!'}});assert.equal(r.status,200);assert.equal(r.body.data.password,undefined);assert.equal(jwt.verify(r.body.token,process.env.JWT_SECRET).id,id);assert.equal((await request('/protected',{token:r.body.token})).status,200)})
 await t.test('missing name and invalid email are rejected before database access',async()=>{for(const body of [{name:'',email:'fixture@example.test',password:'FixturePass123!',role:'Candidate'},{name:'Fixture',email:'bad-email',password:'FixturePass123!',role:'Candidate'}]){const before=reads;assert.equal((await request('/register',{method:'POST',body})).status,400);assert.equal(reads,before)}})
 await t.test('wrong credentials return 401',async()=>assert.equal((await request('/login',{method:'POST',body:{email:fixture.email,password:'incorrect'}})).status,401))
 await t.test('missing login password returns 400 without a database lookup',async()=>{const before=reads;assert.equal((await request('/login',{method:'POST',body:{email:fixture.email}})).status,400);assert.equal(reads,before)})
 await t.test('public reads accept no bearer token',async()=>assert.equal((await request('/optional')).status,200))
 await t.test('invalid tokens return 401 on optional and required routes',async()=>{for(const path of ['/optional','/protected'])assert.equal((await request(path,{token:'invalid'})).status,401)})
 await t.test('expired tokens return 401',async()=>{const token=jwt.sign({id},process.env.JWT_SECRET,{expiresIn:-1});assert.equal((await request('/optional',{token})).status,401)})
 await t.test('users cannot access admin routes',async()=>assert.equal((await request('/admin',{token:jwt.sign({id},process.env.JWT_SECRET)})).status,403))
 await t.test('public registration rejects privileged roles without DB access',async()=>{for(const role of ['Admin','Super Admin','staff','hiring','account team']){const before=reads;assert.equal((await request('/register',{method:'POST',body:{name:'Fixture',email:'fixture@example.test',password:'FixturePass123!',role}})).status,403);assert.equal(reads,before)}assert.equal(creates,0)})
 await t.test('Google signup rejects privileged roles before external services',async()=>{const before=reads;assert.equal((await request('/google',{method:'POST',body:{mode:'register',role:'Admin',credential:'fixture'}})).status,403);assert.equal(reads,before)})
 await t.test('valid public account roles remain available',async()=>{
  const saved=fixture;fixture=null
  User.create=async body=>{creates++;return {_id:id,...body}}
  for(const role of ['Candidate','users','freelancer','recruiter']){const r=await request('/register',{method:'POST',body:{name:'Fixture',email:'fixture@example.test',password:'FixturePass123!',role}});assert.equal(r.status,201);assert.equal(r.body.data.role,role);assert.equal(r.body.data.password,undefined)}
  fixture=saved
 })
})
