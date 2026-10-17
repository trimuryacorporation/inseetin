const assert = require('node:assert/strict')
const path = require('node:path')
require('../backend/node_modules/dotenv').config({path:path.join(__dirname,'../backend/.env'),quiet:true})
process.env.NODE_ENV='production'
const User=require('../backend/models/User')
User.findOne=async()=>null // Fixture credentials never access the database.
const app=require('../backend/server')
const server=app.listen(0,'127.0.0.1',async()=>{
 const base='http://127.0.0.1:'+server.address().port
 let checks=0
 try{
  for(const origin of ['http://localhost:5173','http://127.0.0.1:5173','http://localhost:4173','http://127.0.0.1:4173']){
   let response=await fetch(base+'/api/health',{headers:{Origin:origin}})
   assert.equal(response.status,200);assert.equal(response.headers.get('access-control-allow-origin'),origin);checks++
   response=await fetch(base+'/api/auth/login',{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Method':'POST','Access-Control-Request-Headers':'content-type,authorization'}})
   assert.equal(response.status,204);assert.match(response.headers.get('access-control-allow-methods'),/POST/);checks++
   response=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'fixture@example.test',password:'invalid-fixture-password'})})
   assert.equal(response.status,401);assert.equal(response.headers.get('access-control-allow-origin'),origin);assert.equal((await response.json()).message,'Invalid email or password');checks++
  }
  console.log(checks+' local GET, POST/login and preflight checks passed in production mode')
 }catch(error){console.error(error.message);process.exitCode=1}finally{server.close()}
})
