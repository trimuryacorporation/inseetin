const controllers = require('../controllers/resourceControllers')
const crud = require('../controllers/crudController')
const users = require('../controllers/userController')
const videos = require('../controllers/videoTestimonialController')
const branding = require('../controllers/settingsController')
const definitions = [
 ['jobs', 'Jobs', 'Job', 'jobs'], ['candidates', 'Candidates', 'Candidate', 'candidates'],
 ['applications', 'Applications and freelance proposals', 'Application', 'applications'],
 ['companies', 'Companies', 'Company', 'companies'], ['employers', 'Recruiters', 'Employer', 'employers'],
 ['freelancer-profiles', 'Freelancer profiles', 'FreelancerProfile', 'freelancerProfiles'],
 ['resumes', 'Resume records', 'Resume', 'resumes'], ['recruiter-documents', 'Recruiter documents', 'RecruiterDocument', 'recruiterDocuments'],
 ['categories', 'Industries / categories', 'Category', 'categories'], ['locations', 'Locations', 'Location', 'locations'],
 ['payments', 'Payment records', 'Payment', 'payments'], ['pricing-packages', 'Pricing packages', 'PricingPackage', 'pricingPackages'],
 ['career-jobs', 'Career jobs', 'CareerJob', 'careerJobs'], ['press-news', 'Press / news', 'PressNews', 'pressNews'],
 ['content-pages', 'Policies and pages', 'ContentPage', 'contentPages'], ['faqs', 'FAQs', 'Faq', 'faqs'],
 ['testimonials', 'Testimonials', 'Testimonial', 'testimonials'], ['support-messages', 'Support tickets', 'SupportMessage', 'supportMessages'],
 ['newsletter-subscribers', 'Newsletter subscribers', 'NewsletterSubscriber', 'newsletterSubscribers'],
]
function fieldsFor(Model) {
 return Object.entries(Model.schema.paths).filter(([name]) => !['_id', '__v', 'createdAt', 'updatedAt'].includes(name)).map(([name, path]) => ({ name, type: path.instance, required: Boolean(path.isRequired), ...(path.enumValues?.length ? { enum: path.enumValues } : {}) }))
}
const resources = Object.fromEntries(definitions.map(([id, label, model, controller]) => {
 const Model = require('../models/' + model)
 return [id, { id, label, fields: fieldsFor(Model), controller: controllers[controller], actions: ['read', 'create', 'update', 'delete'] }]
}))
const User = require('../models/User'), Video = require('../models/VideoTestimonial')
const userRead = crud(User, { searchFields: ['name', 'email', 'role', 'status'] })
resources.users = { id: 'users', label: 'User accounts', fields: fieldsFor(User).filter(field => !['authProvider', 'googleId'].includes(field.name)).map(field => field.name === 'password' ? { ...field, required: true } : field.name === 'role' ? { ...field, enum: field.enum.filter(role => role !== 'Admin') } : field), actions: ['read', 'create', 'update', 'delete'], controller: { getAll: userRead.getAll, getById: userRead.getById, create: users.createUser, update: users.updateUser, remove: users.deleteUser } }
const videoRead = crud(Video, { searchFields: ['companyName', 'quote', 'location'] })
resources['video-testimonials'] = { id: 'video-testimonials', label: 'Video testimonials', fields: fieldsFor(Video), actions: ['read', 'create', 'update', 'delete'], controller: { getAll: videoRead.getAll, getById: videoRead.getById, create: videos.createVideoTestimonial, update: videos.updateVideoTestimonial, remove: videos.deleteVideoTestimonial } }
resources['site-branding'] = { id: 'site-branding', label: 'Website branding and course settings', fields: Object.keys(branding.normalizeSiteBrandingValue()).map(name => ({ name, type: name === 'heroBrandNames' ? 'Array' : name === 'showRecruiterFooterLocation' ? 'Boolean' : 'String', required: false })), actions: ['read', 'update'], singleton: true, controller: { getAll: branding.getSiteBranding, update: async (req, res, next) => {
 try {
  const current = await require('../models/Setting').findOne({ key: 'siteSeoBranding' }).lean()
  req.body = { ...(current?.value || {}), ...req.body }
  return branding.updateSiteBranding(req, res, next)
 } catch (error) { next(error) }
} } }
// CRM exports must not seed deleted records back into the database.
for (const id of ['categories', 'faqs', 'content-pages', 'testimonials']) {
 const definition = definitions.find(row => row[0] === id)
 const Model = require('../models/' + definition[2])
 resources[id].controller = { ...resources[id].controller, getAll: crud(Model, { searchFields: resources[id].fields.filter(field => field.type === 'String').map(field => field.name) }).getAll }
}
function catalog() { return Object.values(resources).map(({ controller, ...entry }) => entry) }
module.exports = { catalog, resources }
