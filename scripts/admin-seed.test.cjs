const test=require('node:test')
const assert=require('node:assert/strict')
const bcrypt=require('bcryptjs')
const User=require('../backend/models/User')
const {createAdminAccounts}=require('../backend/seeders/createAdminAccounts')

test('both administrator roles pass the actual user schema',()=>{
 for(const role of ['Admin','Super Admin'])assert.equal(new User({name:'Fixture',email:'fixture@example.test',password:'FixturePass123!',role,status:'Active'}).validateSync(),undefined)
})
test('CRM account catalog excludes both privileged roles',()=>{
 const role=require('../backend/utils/developerApiResources').catalog().find(entry=>entry.id==='users').fields.find(field=>field.name==='role')
 assert.ok(!role.enum.includes('Admin'));assert.ok(!role.enum.includes('Super Admin'))
})
test('admin seed preserves existing accounts and verifies new password hashes',async()=>{
 const existing={_id:'existing',email:'admin@inseet.in',role:'users',password:'untouched'},rows=[existing]
 const Model={findOne:async({email})=>rows.find(row=>row.email===email),create:async input=>{const hash=await bcrypt.hash(input.password,4);const row={...input,_id:String(rows.length+1),password:hash,matchPassword:password=>bcrypt.compare(password,hash)};rows.push(row);return row},findById:async id=>rows.find(row=>row._id===id)}
 const credentials=await createAdminAccounts({Model,passwordFactory:()=> 'FixturePass123!'})
 assert.equal(credentials.length,2);assert.match(credentials[0].email,/^admin\.access-/);assert.equal(credentials[1].email,'superadmin@inseet.in')
 assert.equal(existing.password,'untouched');assert.equal(existing.role,'users')
 for(const account of credentials){const row=await Model.findById(account.id);assert.notEqual(row.password,account.password);assert.ok(await row.matchPassword(account.password));assert.equal(row.role,account.role);assert.equal(row.status,'Active')}
})
