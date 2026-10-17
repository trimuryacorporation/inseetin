const asyncHandler = require('../middleware/asyncHandler')
const Setting = require('../models/Setting')

const PUBLIC_BRANDING_KEY = 'siteSeoBranding'
const PUBLIC_SOCIAL_LINKS_KEY = 'socialMediaLinks'

function migrateLegacyBrandingUrl(value, fallback) {
  const next = String(value || '').trim()
  if (!next) return fallback
  return next
    .replace(/cromgen-rozgar-logo\.png/gi, 'inseet-logo.png')
    .replace(/cromgen-rozgar-favicon\.png/gi, 'inseet-favicon.png')
}

function normalizeSiteBrandingValue(body = {}) {
  const heroBrandNames = Array.isArray(body.heroBrandNames)
    ? body.heroBrandNames
    : String(body.heroBrandNames || '')
      .split(/\r?\n|,/)

  return {
    siteName: String(body.siteName || 'INSEET').trim() || 'INSEET',
    adminName: String(body.adminName || 'INSEET Admin').trim() || 'INSEET Admin',
    recruiterName: String(body.recruiterName || 'INSEET Recruiter').trim() || 'INSEET Recruiter',
    logoUrl: migrateLegacyBrandingUrl(body.logoUrl, '/inseet-logo.png'),
    faviconUrl: migrateLegacyBrandingUrl(body.faviconUrl, '/inseet-favicon.png'),
    tollFreeNumber: String(body.tollFreeNumber || '').trim(),
    recruiterEmail: String(body.recruiterEmail || 'support@inseet.in').trim() || 'support@inseet.in',
    recruiterFooterLocation: String(body.recruiterFooterLocation || 'New Delhi, India').trim() || 'New Delhi, India',
    showRecruiterFooterLocation: body.showRecruiterFooterLocation !== false,
    heroBrandNames: [...new Set(heroBrandNames.map((item) => String(item || '').trim()).filter(Boolean))],
    seoTitle: String(body.seoTitle || body.siteName || 'INSEET').trim() || 'INSEET',
    seoDescription: String(body.seoDescription || '').trim(),
    seoKeywords: String(body.seoKeywords || '').trim(),
    appDownloadTitle: String(body.appDownloadTitle || 'Download the INSEET App').trim() || 'Download the INSEET App',
    playStoreLink: String(body.playStoreLink || '').trim(),
    appStoreLink: String(body.appStoreLink || '').trim(),
    appRating: String(body.appRating || '4.4').trim() || '4.4',
    appReviews: String(body.appReviews || '42K Reviews').trim() || '42K Reviews',
    appDownloads: String(body.appDownloads || '50L+').trim() || '50L+',
    courseTitle: String(body.courseTitle || 'Internship Video Course').trim(),
    coursePrice: /^\d+(\.\d{1,2})?$/.test(String(body.coursePrice ?? '999')) ? String(body.coursePrice ?? '999') : '999',
    courseHours: String(body.courseHours || '12+').trim(),
    courseAccess: String(body.courseAccess || 'Lifetime').trim(),
    coursePreviewUrl: /^https?:\/\//i.test(String(body.coursePreviewUrl || '')) ? String(body.coursePreviewUrl).trim() : '',
  }
}

function formatSetting(setting) {
  return setting
    ? {
      _id: setting._id,
      key: setting.key,
      group: setting.group,
      value: normalizeSiteBrandingValue(setting.value || {}),
      updatedAt: setting.updatedAt,
    }
    : null
}

const getPublicSiteBranding = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: PUBLIC_BRANDING_KEY }).lean()

  res.set('Cache-Control', 'no-store, max-age=0')
  res.json({
    success: true,
    data: formatSetting(setting),
  })
})

const getSiteBranding = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: PUBLIC_BRANDING_KEY }).lean()
  res.json({ success: true, data: formatSetting(setting) })
})

const updateSiteBranding = asyncHandler(async (req, res) => {
  const value = normalizeSiteBrandingValue(req.body || {})
  const setting = await Setting.findOneAndUpdate(
    { key: PUBLIC_BRANDING_KEY },
    { $set: { key: PUBLIC_BRANDING_KEY, group: 'website', value } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ).lean()

  res.json({ success: true, data: formatSetting(setting), message: 'SEO branding saved successfully.' })
})

const getPublicSocialLinks = asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: PUBLIC_SOCIAL_LINKS_KEY }).lean()
  const links = Array.isArray(setting?.value?.links) ? setting.value.links : []

  res.json({
    success: true,
    data: links
      .filter((item) => item?.enabled !== false && item?.url)
      .map((item) => ({
        platform: item.platform || 'Website',
        url: item.url,
        label: item.label || item.platform || 'Social',
      })),
  })
})

module.exports = { getPublicSiteBranding, getPublicSocialLinks, getSiteBranding, updateSiteBranding, normalizeSiteBrandingValue }
