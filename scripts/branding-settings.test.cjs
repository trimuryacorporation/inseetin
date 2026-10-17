const test = require('node:test')
const assert = require('node:assert/strict')
const { normalizeSiteBrandingValue } = require('../backend/controllers/settingsController')

test('existing branding records retain default course configuration', () => {
  const value = normalizeSiteBrandingValue({ siteName: 'INSEET' })
  assert.equal(value.coursePrice, '999')
  assert.equal(value.courseTitle, 'Internship Video Course')
  assert.equal(value.coursePreviewUrl, '')
})

test('admin course fields survive normalization including zero price', () => {
  const value = normalizeSiteBrandingValue({ courseTitle: 'Career Essentials', coursePrice: 0, courseHours: '8', courseAccess: '6 months', coursePreviewUrl: 'https://example.test/preview.mp4' })
  assert.equal(value.courseTitle, 'Career Essentials')
  assert.equal(value.coursePrice, '0')
  assert.equal(value.courseHours, '8')
  assert.equal(value.courseAccess, '6 months')
  assert.equal(value.coursePreviewUrl, 'https://example.test/preview.mp4')
})

test('invalid prices cannot turn into negative or nonnumeric course prices', () => {
  for (const coursePrice of [-100, 'NaN', 'free', '999.999', '']) {
    assert.equal(normalizeSiteBrandingValue({ coursePrice }).coursePrice, '999')
  }
  assert.equal(normalizeSiteBrandingValue({ coursePrice: '249.50' }).coursePrice, '249.50')
})

test('preview rejects executable and non-web URL schemes', () => {
  for (const coursePreviewUrl of ['javascript:alert(1)', 'data:text/html,test', 'file:///test.mp4']) {
    assert.equal(normalizeSiteBrandingValue({ coursePreviewUrl }).coursePreviewUrl, '')
  }
})
