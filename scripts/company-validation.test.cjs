const test = require('node:test')
const assert = require('node:assert/strict')
const Company = require('../backend/models/Company')
test('new companies accept omitted, empty, null and whitespace document statuses', () => {
 for (const value of [undefined, '', null, '   ']) {
  const company = new Company({ name:'Company validation test', ...(value === undefined ? {} : { documents:value }) })
  assert.equal(company.documents,'Review')
  assert.equal(company.validateSync(),undefined)
 }
})
test('document verification choices are preserved and invalid values still fail', () => {
 for (const documents of ['Missing','Review','Verified']) {
  const company = new Company({ documents })
  assert.equal(company.documents,documents)
  assert.equal(company.validateSync(),undefined)
 }
 assert.ok(new Company({documents:'Unrecognised'}).validateSync()?.errors.documents)
})
test('editing a legacy company with blank document status is valid', () => {
 const company=Company.hydrate({_id:'507f1f77bcf86cd799439011',name:'Existing Company',documents:''})
 company.set({documents:'',name:'Updated Company'})
 assert.equal(company.documents,'Review')
 assert.equal(company.validateSync(),undefined)
})
test('company account statuses match Pending, Active and Blocked', () => {
 for(const status of ['Pending','Active','Blocked']) assert.equal(new Company({status}).validateSync(),undefined)
 for(const status of ['Inactive','Closed']) assert.ok(new Company({status}).validateSync()?.errors.status)
})
