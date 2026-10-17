import test from 'node:test'
import assert from 'node:assert/strict'
import {requestJson,ApiRequestError} from '../frontend/src/utils/apiTransport.js'
const url='https://inseet.in/api/jobs'
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}})
test('successful JSON data and OpenAPI documents are preserved',async()=>{for(const value of [{success:true,data:[{name:'Fixture'}]},{openapi:'3.0.3',servers:[]}])assert.deepEqual(await requestJson(url,{},async()=>json(value)),value)})
for(const [status,expected]of [[401,/log in/],[403,/permission/],[404,/routing or deployment/],[429,/Too many/],[500,/server/],[502,/server/],[503,/server/]]){
 test('non-JSON '+status+' has a specific error without leaking HTML',async()=>{await assert.rejects(requestJson(url,{},async()=>new Response('<html>Hosting error with private diagnostic</html>',{status})),error=>error instanceof ApiRequestError&&error.status===status&&expected.test(error.message)&&!error.message.includes('private diagnostic'))})
}
test('server validation messages are preserved',async()=>{await assert.rejects(requestJson(url,{},async()=>new Response(JSON.stringify({message:'Email is required'}),{status:400})),/Email is required/)})
test('an HTML SPA response is never treated as API success',async()=>{await assert.rejects(requestJson(url,{},async()=>new Response('<html>App shell</html>')),/invalid API response/)})
test('malformed JSON and empty responses are rejected',async()=>{for(const body of ['{broken','', 'null'])await assert.rejects(requestJson(url,{},async()=>new Response(body)),/invalid API response/)})
test('success:false is rejected even on HTTP 200',async()=>{await assert.rejects(requestJson(url,{},async()=>json({success:false,message:'Operation declined'})),/Operation declined/)})
test('network failures produce useful feedback without retrying a write',async()=>{let calls=0;await assert.rejects(requestJson(url,{method:'POST'},async()=>{calls++;throw new TypeError('Failed to fetch')}),/Unable to reach the server/);assert.equal(calls,1)})
test('abort errors remain abort errors',async()=>{const error=new DOMException('Aborted','AbortError');await assert.rejects(requestJson(url,{},async()=>{throw error}),actual=>actual===error)})
