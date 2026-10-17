/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useMemo, useRef, useState } from 'react'
import { City, Country, State } from 'country-state-city'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Ban, BriefcaseBusiness, CheckCircle2, Clock, Download, ExternalLink, Eye, EyeOff, FileSpreadsheet, FileText, ImagePlus, MailPlus, MapPin, Navigation, PauseCircle, Pencil, Phone, RefreshCw, Route, Send, ShieldCheck, Trash2, XCircle } from 'lucide-react'
import {
  ActionButtons,
  AdminCard,
  AdminModal,
  ConfirmDialog,
  DataTable,
  EmptyAdminState,
  ExportButtons,
  LoadingSkeleton,
  StatusBadge,
  Toolbar,
} from '../components/AdminPrimitives'
import { reportRows } from '../data/adminData'
import { api } from '../../services/api'
import { updateRecruiterVerificationRemark } from '../../routes/authRouting'
import { fetchPricingPackages, getPricingPackages, seedDefaultPricingPackages } from '../../utils/pricingPackages'
import { applySiteBrandingMeta, defaultSiteBranding, normalizeSiteBranding, publishSiteBranding } from '../../utils/siteBranding'
import { buildStateCountryLocation } from '../../utils/locationDisplay'
import { getJobsForCategory } from '../../utils/categoryMatching'
import { showMessageToast } from '../../utils/toast'

const configs = {
  users: {
    resource: 'users',
    title: 'User Management',
  subtitle: 'Account Management dashboard for user, admin, staff, recruiter, hiring team, and account team accounts.',
    actionLabel: 'Add User',
    modalTitle: 'Add / Edit User',
    extra: '',
    columns: [
      { key: '_id', label: 'User ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['name', 'Full name'],
      ['email', 'Email address'],
      ['role', 'Role'],
      ['status', 'Status'],
    ],
    required: ['name', 'email', 'role', 'status'],
    transform: (form) => {
      const payload = { ...form }
      if (!payload.password) delete payload.password
      return payload
    },
  },
  jobs: {
    resource: 'jobs',
    title: 'Jobs Management',
    subtitle: 'Add, edit, approve, reject, open, close, and manage job listings.',
    actionLabel: 'Add New Job',
    modalTitle: 'Add / Edit Job',
    extra: 'Approve',
    columns: [
      { key: 'recruiterId', label: 'Recruiter ID' },
      { key: 'recruiterName', label: 'Recruiter' },
      { key: 'recruiterEmail', label: 'Email' },
      { key: 'latestJobTitle', label: 'Latest Job' },
      { key: 'latestCompany', label: 'Company' },
      { key: 'latestDepartment', label: 'Department' },
      { key: 'latestLocation', label: 'Location' },
      { key: 'jobPostCount', label: 'Jobs Posted' },
      { key: 'activeJobs', label: 'Active' },
      { key: 'pendingJobs', label: 'Pending' },
      { key: 'rejectedJobs', label: 'Rejected' },
      { key: 'candidateClicks', label: 'Clicks' },
      { key: 'applicationsCount', label: 'Applications' },
    ],
    fields: [
      ['title', 'Job title'],
      ['company', 'Company name'],
      ['department', 'Department'],
      ['location', 'Location', 'jobLocation'],
      ['salary', 'Salary range'],
      ['experience', 'Experience'],
      ['type', 'Job type', 'careerJobType'],
      ['workMode', 'Work mode', 'careerWorkMode'],
      ['posted', 'Posted date', 'date'],
      ['deadline', 'Application deadline', 'date'],
      ['accountDepartmentStatus', 'Account department status'],
      ['accountDepartmentRemark', 'Reject remark', 'textarea'],
      ['skills', 'Skills comma separated'],
      ['description', 'Description', 'jobDescription'],
    ],
    required: ['title', 'company', 'location'],
    transform: (form) => {
      const accountActive = form.accountDepartmentStatus === 'Active'
      const accountRejected = form.accountDepartmentStatus === 'Rejected'
      return {
        ...form,
        status: accountActive ? 'Active' : accountRejected ? 'Closed' : form.status,
        approval: accountActive ? 'Approved' : accountRejected ? 'Rejected' : form.approval,
        accountDepartmentRemark: accountActive ? '' : form.accountDepartmentRemark,
        location: formatJobLocation(form),
        interviewAddress: form.interviewSameAsOffice ? form.officeAddress : form.interviewAddress,
        posted: form.posted ? new Date(form.posted).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
        deadline: form.deadline ? new Date(form.deadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        skills: splitComma(form.skills),
        companyLogo: form.company?.slice(0, 2).toUpperCase(),
      }
    },
  },
  companies: {
    resource: 'companies',
    title: 'Company Management',
    subtitle: 'Review company profiles, verify documents, and control recruiter access.',
    actionLabel: 'Add Company',
    modalTitle: 'Add / Edit Company',
    extra: 'Verify',
    columns: [
      { key: '_id', label: 'Company ID' },
      { key: 'name', label: 'Company' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'gstNumber', label: 'GST No' },
      { key: 'industry', label: 'Industry' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'jobs', label: 'Jobs' },
    ],
    fields: [
      ['name', 'Company name'],
      ['contactPerson', 'Contact person'],
      ['contactNumber', 'Contact number'],
      ['contactEmail', 'Contact email'],
      ['gstNumber', 'GST no'],
      ['industry', 'Industry'],
      ['website', 'Website'],
      ['location', 'Location', 'companyLocation'],
      ['address', 'Full address', 'textarea'],
      ['jobs', 'Open jobs', 'number'],
      ['documents', 'Documents status'],
      ['status', 'Status', 'careerJobStatus'],
    ],
    required: [],
    transform: (form) => ({
      ...form,
      contactNumber: String(form.contactNumber || '').replace(/\D/g, ''),
      contactEmail: String(form.contactEmail || '').trim().toLowerCase(),
      gstNumber: String(form.gstNumber || '').trim().toUpperCase(),
      location: formatJobLocation(form),
      jobs: Number(form.jobs || 0),
      badge: form.name?.slice(0, 2).toUpperCase(),
    }),
  },
  employers: {
    resource: 'employers',
    title: 'Recruiter Management',
    subtitle: 'Approve accounts, verify documents, edit details, and block recruiters.',
    actionLabel: 'Add Recruiter',
    modalTitle: 'Add / Edit Recruiter',
    extra: '',
    statusOptions: ['Pending', 'Approved', 'Rejected', 'Suspended', 'Blocked'],
    columns: [
      { key: 'recruiterId', label: 'Recruiter ID' },
      { key: 'companyName', label: 'Recruiter' },
      { key: 'contactPerson', label: 'Contact Person' },
      { key: 'businessEmail', label: 'Business Email' },
      { key: 'industry', label: 'Industry' },
      { key: 'location', label: 'Location' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'accountAuthorizedByName', label: 'Authorised By', render: renderRecruiterAccountAuthorisedBy },
    ],
    fields: [['companyName', 'Recruiter name'], ['contactPerson', 'Contact person name'], ['businessEmail', 'Business email'], ['phone', 'Phone'], ['industry', 'Industry'], ['companySize', 'Company size'], ['website', 'Website'], ['location', 'Location'], ['status', 'Status']],
  },
  candidates: {
    resource: 'candidates',
    title: 'Candidate Management',
    subtitle: 'View profiles, preview resumes, shortlist talent, and manage candidate access.',
    actionLabel: 'Add Candidate',
    modalTitle: 'Candidate Details',
    extra: 'Shortlist',
    columns: [
      { key: '_id', label: 'Candidate ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'skills', label: 'Skills' },
      { key: 'experience', label: 'Experience' },
      { key: 'status', label: 'Status', badge: true },
    ],
    fields: [['name', 'Full name'], ['email', 'Email'], ['phone', 'Phone'], ['role', 'Current role'], ['skills', 'Skills comma separated'], ['experience', 'Experience'], ['location', 'Location'], ['status', 'Status']],
    transform: (form) => ({ ...form, skills: splitComma(form.skills) }),
  },
  applications: {
    resource: 'applications',
    title: 'Applications Management',
    subtitle: 'Track applications and update candidate status across hiring stages.',
    actionLabel: 'Add Application',
    modalTitle: 'Candidate Application',
    extra: 'Update',
    columns: [
      { key: '_id', label: 'Application ID' },
      { key: 'candidateName', label: 'Candidate' },
      { key: 'jobTitle', label: 'Job' },
      { key: 'company', label: 'Company' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Date' },
    ],
    fields: [['candidateName', 'Candidate name'], ['candidateEmail', 'Candidate email'], ['jobTitle', 'Job'], ['company', 'Company'], ['status', 'Status'], ['coverNote', 'Recruiter note', 'textarea']],
  },
  resumes: {
    resource: 'resumes',
    title: 'Resume Database',
    subtitle: 'Switch between registered candidate leads and admin-uploaded resumes.',
    actionLabel: 'Upload Resume',
    modalTitle: 'Resume Preview',
    extra: 'Preview',
    columns: [
      { key: '_id', label: 'Resume ID' },
      { key: 'name', label: 'Candidate' },
      { key: 'role', label: 'Target Role' },
      { key: 'skills', label: 'Skills' },
      { key: 'experience', label: 'Experience' },
      { key: 'source', label: 'Source', badge: true },
      { key: 'status', label: 'Status', badge: true },
    ],
    fields: [['name', 'Candidate'], ['email', 'Email'], ['role', 'Resume title'], ['skills', 'Skills comma separated'], ['experience', 'Experience'], ['resumeUrl', 'Resume URL']],
    transform: (form) => ({ ...form, skills: splitComma(form.skills) }),
  },
  freelancerProfiles: {
    resource: 'freelancer-profiles',
    title: 'Freelancer Profiles',
    subtitle: 'Manage marketplace freelancer profiles from MongoDB.',
    actionLabel: 'Add Freelancer',
    modalTitle: 'Add / Edit Freelancer',
    extra: 'Feature',
    statusOptions: ['Active', 'Review', 'Inactive', 'Blocked'],
    columns: [
      { key: '_id', label: 'Freelancer ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'role', label: 'Role' },
      { key: 'location', label: 'Location' },
      { key: 'rate', label: 'Rate' },
      { key: 'rating', label: 'Rating' },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'status', label: 'Status', badge: true },
    ],
    fields: [
      ['name', 'Name'],
      ['email', 'Email'],
      ['role', 'Role'],
      ['location', 'Location'],
      ['rate', 'Rate'],
      ['rating', 'Rating', 'number'],
      ['reviews', 'Reviews', 'number'],
      ['experience', 'Experience'],
      ['availability', 'Availability'],
      ['skills', 'Skills comma separated'],
      ['summary', 'Summary', 'textarea'],
      ['featured', 'Featured', 'featuredToggle'],
      ['sortOrder', 'Sort order', 'number'],
      ['status', 'Status'],
    ],
    required: ['name', 'role', 'status'],
    transform: (form) => ({
      ...form,
      email: String(form.email || '').trim().toLowerCase(),
      rating: Math.min(Math.max(Number(form.rating || 0), 0), 5),
      reviews: Number(form.reviews || 0),
      sortOrder: Number(form.sortOrder || 0),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
      skills: splitComma(form.skills),
      status: form.status || 'Review',
    }),
  },
  categories: {
    resource: 'categories',
    title: 'Category Management',
    subtitle: 'Add, edit, delete, activate, and deactivate job categories.',
    actionLabel: 'Add Category',
    modalTitle: 'Add / Edit Category',
    extra: 'Toggle',
    columns: [{ key: '_id', label: 'Category ID' }, { key: 'name', label: 'Category' }, { key: 'jobs', label: 'Jobs' }, { key: 'status', label: 'Status', badge: true }],
    fields: [['name', 'Category name'], ['status', 'Status']],
    transform: (form) => {
      const payload = { ...form }
      delete payload.jobs
      return payload
    },
  },
  locations: {
    resource: 'locations',
    title: 'Location Management',
    subtitle: 'Maintain city, state, country, and active location status.',
    actionLabel: 'Add Location',
    modalTitle: 'Add / Edit Location',
    extra: 'Toggle',
    columns: [{ key: '_id', label: 'Location ID' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'country', label: 'Country' }, { key: 'status', label: 'Status', badge: true }],
    fields: [['city', 'City'], ['state', 'State'], ['country', 'Country'], ['status', 'Status']],
  },
  payments: {
    resource: 'payments',
    title: 'Transactions',
    subtitle: 'Manage subscriptions, payment history, invoices, revenue, and failed payments.',
    actionLabel: 'Add Payment',
    modalTitle: 'Payment / Plan Details',
    extra: 'Invoice',
    export: true,
    disableCreate: true,
    columns: [{ key: 'invoiceNo', label: 'Invoice' }, { key: 'employer', label: 'Recruiter', render: (row) => <PaymentRecruiterLink row={row} /> }, { key: 'plan', label: 'Plan' }, { key: 'amount', label: 'Total Fee' }, { key: 'status', label: 'Status', badge: true }],
    fields: [['invoiceNo', 'Invoice number'], ['employer', 'Recruiter'], ['plan', 'Plan'], ['amount', 'Amount'], ['status', 'Payment status']],
  },
  paymentLogs: {
    resource: 'payments',
    title: 'Payment Logs',
    subtitle: 'Review Razorpay order logs, payment IDs, gateway status, purpose, and timestamps.',
    actionLabel: 'Add Payment Log',
    modalTitle: 'Payment Log Details',
    extra: '',
    export: true,
    readonly: true,
    statusOptions: ['Paid', 'Pending', 'Failed'],
    columns: [
      { key: 'createdAt', label: 'Logged At' },
      { key: 'invoiceNo', label: 'Invoice' },
      { key: 'gateway', label: 'Gateway' },
      { key: 'purpose', label: 'Purpose', badge: true },
      { key: 'razorpayOrderId', label: 'Order ID' },
      { key: 'razorpayPaymentId', label: 'Payment ID' },
      { key: 'amount', label: 'Amount' },
      { key: 'status', label: 'Status', badge: true },
    ],
    fields: [
      ['invoiceNo', 'Invoice number'],
      ['gateway', 'Gateway'],
      ['purpose', 'Purpose'],
      ['razorpayOrderId', 'Razorpay order ID'],
      ['razorpayPaymentId', 'Razorpay payment ID'],
      ['amount', 'Amount'],
      ['status', 'Payment status'],
      ['failureReason', 'Failure reason', 'textarea'],
    ],
  },
  recruiterDocuments: {
    resource: 'recruiter-documents',
    title: 'Recruiter Documents',
    subtitle: 'View recruiter document submissions saved in backend.',
    actionLabel: 'Add Document',
    modalTitle: 'Recruiter Document Details',
    extra: 'View',
    columns: [
      { key: 'recruiterId', label: 'Recruiter ID' },
      { key: 'recruiterName', label: 'Recruiter' },
      { key: 'recruiterEmail', label: 'Email' },
      { key: 'documentType', label: 'Document Type', badge: true },
      { key: 'panNumber', label: 'PAN' },
      { key: 'panDocument', label: 'PAN Card', render: (row) => renderDocumentFileCell(row.panDocument, 'PAN Card') },
      { key: 'gstNumber', label: 'GSTIN' },
      { key: 'gstDocument', label: 'GST Certificate', render: (row) => renderDocumentFileCell(row.gstDocument, 'GST Certificate') },
      { key: 'submissionsCount', label: 'Requests' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'reviewedByName', label: 'Authorised By', render: renderDocumentAuthorisedBy },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['recruiterName', 'Recruiter name'],
      ['recruiterEmail', 'Recruiter email'],
      ['documentType', 'Document type'],
      ['panNumber', 'PAN number'],
      ['gstNumber', 'GST number'],
      ['aadhaarNumber', 'Aadhar number'],
      ['panDocument', 'PAN document'],
      ['gstDocument', 'GST certificate'],
      ['offerLetter', 'Offer letter'],
      ['aadhaarDocument', 'Aadhar card'],
      ['gstLegalName', 'GST legal name'],
      ['gstTradeName', 'GST trade name'],
      ['gstStatus', 'GST status'],
      ['remark', 'Admin remark', 'textarea'],
      ['status', 'Review status'],
    ],
    required: ['recruiterEmail', 'documentType'],
  },
  contentPages: {
    resource: 'content-pages',
    title: 'Policy Management',
    subtitle: 'Maintain separate published policy pages for the users, recruiter, and freelancer frontends.',
    actionLabel: 'Add Policy',
    modalTitle: 'Add / Edit Policy',
    extra: 'Publish',
    statusOptions: ['Published', 'Draft'],
    columns: [
      { key: '_id', label: 'Policy ID' },
      { key: 'title', label: 'Title' },
      { key: 'slug', label: 'Slug' },
      { key: 'category', label: 'Category', badge: true },
      { key: 'frontendPlacement', label: 'Frontend', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'effectiveDate', label: 'Effective' },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['title', 'Policy title'],
      ['slug', 'URL slug'],
      ['category', 'Policy category', 'policyCategory'],
      ['frontendPlacement', 'Frontend placement', 'policyPlacement'],
      ['subtitle', 'Short summary', 'textarea'],
      ['sectionsText', 'Policy sections', 'contentSections'],
      ['status', 'Status', 'policyStatus'],
      ['effectiveDate', 'Effective date', 'date'],
    ],
    required: ['title', 'slug', 'frontendPlacement', 'status'],
    transform: (form) => {
      const sections = parsePolicySections(form.sectionsText)
      const normalizedTitle = String(form.title || '').trim()
      const normalizedSlug = String(form.slug || normalizedTitle)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      return {
        ...form,
        title: normalizedTitle,
        subtitle: String(form.subtitle || '').trim(),
        slug: normalizedSlug,
        category: String(form.category || 'Policy').trim(),
        frontendPlacement: String(form.frontendPlacement || fieldOptions.policyPlacement[0]).trim(),
        sections,
        status: form.status || 'Published',
        effectiveDate: form.effectiveDate || new Date().toISOString(),
      }
    },
  },
  testimonials: {
    resource: 'testimonials',
    title: 'Testimonials Management',
    subtitle: 'Publish polished testimonial stories to the Users frontend or Recruiter frontend carousel.',
    actionLabel: 'Add Testimonial',
    modalTitle: 'Add / Edit Testimonial',
    extra: 'Feature',
    statusOptions: ['Active', 'Inactive'],
    columns: [
      { key: '_id', label: 'Testimonial ID' },
      { key: 'name', label: 'Name' },
      { key: 'role', label: 'Role' },
      { key: 'company', label: 'Company' },
      { key: 'type', label: 'Type', badge: true },
      { key: 'frontendPlacement', label: 'Frontend', badge: true },
      { key: 'rating', label: 'Rating' },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['name', 'Name'],
      ['role', 'Role / Designation'],
      ['company', 'Company'],
      ['type', 'User type', 'testimonialType'],
      ['frontendPlacement', 'Show on frontend', 'testimonialPlacement'],
      ['rating', 'Rating', 'number'],
      ['featured', 'Featured', 'featuredToggle'],
      ['status', 'Status'],
      ['text', 'Feedback text', 'textarea'],
    ],
    required: ['name', 'text', 'status'],
    transform: (form) => ({
      ...form,
      frontendPlacement: form.frontendPlacement || fieldOptions.testimonialPlacement[0],
      rating: Math.min(Math.max(Number(form.rating || 5), 1), 5),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
    }),
  },
  videoTestimonials: {
    resource: 'video-testimonials',
    title: 'Video Testimonials Management',
    subtitle: 'Add recruiter video testimonials with YouTube URL, card copy, duration, thumbnail, and placement details.',
    actionLabel: 'Add Video Testimonial',
    modalTitle: 'Add / Edit Video Testimonial',
    extra: 'Feature',
    statusOptions: ['Active', 'Inactive'],
    columns: [
      { key: '_id', label: 'Video ID' },
      { key: 'companyName', label: 'Company' },
      { key: 'duration', label: 'Duration' },
      { key: 'location', label: 'Location' },
      { key: 'videoUrl', label: 'YouTube URL' },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['companyName', 'Company name'],
      ['duration', 'Video duration e.g. 02:45'],
      ['location', 'Location'],
      ['logoText', 'Logo text'],
      ['videoUrl', 'YouTube video URL'],
      ['thumbnailUrl', 'Thumbnail image URL'],
      ['tone', 'Color tone'],
      ['sortOrder', 'Sort order', 'number'],
      ['featured', 'Featured', 'featuredToggle'],
      ['status', 'Status'],
      ['quote', 'Quote / feedback text', 'textarea'],
    ],
    required: ['companyName', 'status'],
    transform: (form) => ({
      ...form,
      sortOrder: Number(form.sortOrder || 0),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
      tone: form.tone || 'blue',
    }),
  },
  careerJobs: {
    resource: 'career-jobs',
    title: 'Career Job Posts',
    subtitle: 'Manage INSEET internal vacancies displayed on Career Resources.',
    actionLabel: 'Add Career Job',
    modalTitle: 'Add / Edit Career Job',
    extra: 'Publish',
    statusOptions: ['Active', 'Inactive', 'Closed'],
    columns: [
      { key: '_id', label: 'Job ID' },
      { key: 'title', label: 'Title' },
      { key: 'department', label: 'Department' },
      { key: 'location', label: 'Location' },
      { key: 'openings', label: 'Vacancy' },
      { key: 'type', label: 'Type', badge: true },
      { key: 'workMode', label: 'Work Mode', badge: true },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['title', 'Job title'],
      ['department', 'Department'],
      ['location', 'Location'],
      ['openings', 'Vacancy count', 'number'],
      ['type', 'Job type'],
      ['workMode', 'Work mode'],
      ['experience', 'Experience'],
      ['salary', 'Salary'],
      ['deadline', 'Apply deadline'],
      ['applyEmail', 'Apply email'],
      ['skills', 'Skills comma separated'],
      ['responsibilities', 'Responsibilities comma separated'],
      ['requirements', 'Requirements comma separated'],
      ['sortOrder', 'Sort order', 'number'],
      ['featured', 'Featured', 'featuredToggle'],
      ['status', 'Status'],
      ['description', 'Job description', 'textarea'],
    ],
    required: ['title', 'description', 'status'],
    transform: (form) => ({
      ...form,
      openings: Math.max(Number(form.openings || 1), 1),
      sortOrder: Number(form.sortOrder || 0),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
      skills: splitAdminList(form.skills),
      responsibilities: splitAdminList(form.responsibilities),
      requirements: splitAdminList(form.requirements),
    }),
  },
  pressNews: {
    resource: 'press-news',
    title: 'Press / News Posts',
    subtitle: 'Manage press releases, company announcements, media notes, and news cards displayed on Press / News.',
    actionLabel: 'Add Press Post',
    modalTitle: 'Add / Edit Press News',
    extra: 'Publish',
    statusOptions: ['Active', 'Inactive', 'Draft'],
    columns: [
      { key: '_id', label: 'Post ID' },
      { key: 'title', label: 'Title' },
      { key: 'category', label: 'Category', badge: true },
      { key: 'author', label: 'Author' },
      { key: 'publishedAt', label: 'Published' },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['title', 'Post title'],
      ['category', 'Category'],
      ['imageUrl', 'Image URL'],
      ['publishedAt', 'Published date'],
      ['author', 'Author / team'],
      ['location', 'Location'],
      ['sourceName', 'Source name'],
      ['sourceUrl', 'Source URL'],
      ['sortOrder', 'Sort order', 'number'],
      ['featured', 'Featured', 'featuredToggle'],
      ['status', 'Status'],
      ['excerpt', 'Short excerpt', 'textarea'],
      ['description', 'Post description', 'textarea'],
    ],
    required: ['title', 'description', 'status'],
    transform: (form) => ({
      ...form,
      sortOrder: Number(form.sortOrder || 0),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
      category: form.category || 'Company News',
      author: form.author || 'INSEET Team',
      status: form.status || 'Active',
    }),
  },
  faqs: {
    resource: 'faqs',
    title: 'FAQ Management',
    subtitle: 'Add and publish MongoDB FAQs that automatically appear on the website Common Questions section.',
    actionLabel: 'Add FAQ',
    modalTitle: 'Add / Edit FAQ',
    extra: 'Publish',
    statusOptions: ['Active', 'Inactive'],
    columns: [
      { key: '_id', label: 'FAQ ID' },
      { key: 'category', label: 'Category' },
      { key: 'question', label: 'Question' },
      { key: 'answer', label: 'Answer' },
      { key: 'featured', label: 'Featured', badge: true },
      { key: 'sortOrder', label: 'Sort' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['category', 'Category', 'faqCategory'],
      ['question', 'Question'],
      ['answer', 'Answer', 'textarea'],
      ['featured', 'Featured', 'featuredToggle'],
      ['sortOrder', 'Sort order', 'number'],
      ['status', 'Status', 'faqStatus'],
    ],
    required: ['question', 'answer', 'status'],
    transform: (form) => ({
      ...form,
      category: String(form.category || 'General').trim(),
      question: String(form.question || '').trim(),
      answer: String(form.answer || '').trim(),
      status: form.status || 'Active',
      sortOrder: Number(form.sortOrder || 0),
      featured: ['true', 'Yes', 'Featured', true].includes(form.featured),
    }),
  },
  newsletterSubscribers: {
    resource: 'newsletter-subscribers',
    title: 'Hiring Insights Subscribers',
    subtitle: 'Manage users who subscribed from Get hiring insights. These records are saved in MongoDB.',
    actionLabel: 'Add Subscriber',
    modalTitle: 'Add / Edit Subscriber',
    extra: 'Email',
    export: true,
    statusOptions: ['Subscribed', 'Unsubscribed'],
    columns: [
      { key: '_id', label: 'Subscriber ID' },
      { key: 'email', label: 'Email' },
      { key: 'source', label: 'Source' },
      { key: 'topics', label: 'Topics' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'lastSubscribedAt', label: 'Subscribed' },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['email', 'Email address'],
      ['source', 'Source'],
      ['topics', 'Topics comma separated', 'textarea'],
      ['status', 'Subscription status', 'subscriberStatus'],
    ],
    required: ['email', 'status'],
    transform: (form) => ({
      ...form,
      email: String(form.email || '').trim().toLowerCase(),
      source: form.source || 'admin',
      topics: splitComma(form.topics).length ? splitComma(form.topics) : ['Hiring insights', 'Latest jobs', 'Recruiter updates'],
      lastSubscribedAt: form.status === 'Subscribed' ? new Date().toISOString() : form.lastSubscribedAt,
    }),
  },
  supportMessages: {
    resource: 'support-messages',
    title: 'Support Messages',
    subtitle: 'View customer care chat requests from users, candidates, recruiters, and guests.',
    actionLabel: 'Add Ticket',
    modalTitle: 'Support Message Details',
    extra: 'Reply',
    statusOptions: ['Open', 'In Progress', 'Resolved', 'Closed'],
    columns: [
      { key: '_id', label: 'Message ID' },
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'company', label: 'Company' },
      { key: 'role', label: 'Role', badge: true },
      { key: 'subject', label: 'Subject' },
      { key: 'packageName', label: 'Package' },
      { key: 'candidatesNeeded', label: 'Candidates' },
      { key: 'message', label: 'Message' },
      { key: 'messagesCount', label: 'Requests' },
      { key: 'status', label: 'Status', badge: true },
      { key: 'createdAt', label: 'Created' },
    ],
    fields: [
      ['name', 'Name'],
      ['email', 'Email'],
      ['phone', 'Phone'],
      ['company', 'Company'],
      ['role', 'Role'],
      ['subject', 'Subject'],
      ['packageName', 'Package name'],
      ['candidatesNeeded', 'Candidates needed'],
      ['callbackTime', 'Preferred callback time'],
      ['status', 'Support status', 'supportStatus'],
      ['message', 'Customer message', 'textarea'],
      ['adminReply', 'Admin reply / internal note', 'textarea'],
    ],
    required: ['message', 'status'],
    transform: (form) => ({
      ...form,
      name: form.name || 'Guest User',
      role: form.role || 'Guest',
      subject: form.subject || 'Support chat',
      status: form.status || 'Open',
      source: form.source || 'admin-panel',
    }),
  },
  reports: {
    resource: null,
    title: 'Reports',
    subtitle: 'Daily, weekly, monthly, recruiter-wise, job-wise, and candidate-wise reports.',
    actionLabel: 'Generate Report',
    modalTitle: 'Generate Report',
    extra: 'Export',
    export: true,
    columns: [{ key: 'id', label: 'Report ID' }, { key: 'name', label: 'Report' }, { key: 'scope', label: 'Scope' }, { key: 'updated', label: 'Updated' }, { key: 'records', label: 'Records' }],
    fields: [['name', 'Report type'], ['scope', 'Scope'], ['updated', 'Date range'], ['records', 'Records']],
    staticRows: reportRows,
  },
}

const accessByRole = {
  Admin: ['users', 'jobs', 'companies', 'employers', 'recruiterDocuments', 'candidates', 'applications', 'resumes', 'freelancerProfiles', 'categories', 'locations', 'payments', 'paymentLogs', 'contentPages', 'testimonials', 'videoTestimonials', 'careerJobs', 'pressNews', 'faqs', 'newsletterSubscribers', 'supportMessages', 'reports', 'settings'],
  staff: [],
  recruiter: [],
  users: [],
  hiring: [],
  'account team': ['jobs', 'employers', 'recruiterDocuments'],
}

const fieldOptions = {
  role: ['users', 'Admin', 'staff', 'recruiter', 'freelancer', 'hiring', 'account team'],
  status: ['Active', 'Review', 'Inactive', 'Draft', 'Pending', 'Approved', 'Rejected', 'Suspended', 'Blocked', 'Open', 'Closed', 'New', 'Reviewed', 'Shortlisted', 'Interview', 'Selected'],
  userStatus: ['Review', 'Active', 'Inactive', 'Suspend'],
  documentType: ['GST', 'Offer Letter', 'Aadhar Card'],
  testimonialType: ['Candidate', 'Recruiter', 'Company', 'Admin'],
  testimonialPlacement: ['Users Frontend', 'Recruiter Frontend'],
  policyPlacement: ['Users Frontend', 'Recruiter Frontend', 'Freelancer Frontend'],
  policyCategory: ['Policy', 'Privacy', 'Terms', 'Support', 'General'],
  policyStatus: ['Published', 'Draft'],
  faqCategory: ['General', 'Candidate', 'Recruiter', 'Jobs', 'Applications', 'Payments', 'Account', 'Support'],
  faqStatus: ['Active', 'Inactive'],
  subscriberStatus: ['Subscribed', 'Unsubscribed'],
  careerJobStatus: ['Active', 'Inactive', 'Closed'],
  careerJobType: ['Full Time', 'Part Time', 'Contract', 'Internship'],
  careerWorkMode: ['Remote', 'Hybrid', 'On-site'],
  featuredToggle: ['false', 'true'],
  supportStatus: ['Open', 'In Progress', 'Resolved', 'Closed'],
  accountDepartmentStatus: ['Pending', 'Active', 'Rejected', 'Hold', 'Removed'],
  department: ['Engineering', 'Product', 'Design', 'Growth', 'Marketing', 'Sales', 'Customer Success', 'Support', 'HR & Recruitment', 'Finance', 'Operations', 'Research Operations', 'AI Operations'],
  experience: ['Fresher', '0-1 years', '1-3 years', '3-6 years', '6-10 years', '10+ years'],
  type: ['Full Time', 'Part Time', 'Contract', 'Freelance'],
  workMode: ['Remote', 'Hybrid', 'On-site'],
}

const skillOptions = ['React', 'JavaScript', 'TypeScript', 'Node.js', 'Python', 'Java', 'PHP', 'Laravel', 'Next.js', 'Tailwind', 'REST API', 'GraphQL', 'MongoDB', 'SQL', 'AWS', 'Docker', 'DevOps', 'QA', 'Selenium', 'Cypress', 'SEO', 'Google Ads', 'Meta Ads', 'Analytics', 'CRM', 'Communication', 'Excel', 'Power BI', 'Data Analysis', 'Machine Learning', 'LLM Review', 'Quality Audit', 'Research', 'Reporting']

const jobTitleOptions = ['Frontend Developer', 'React Developer', 'Next.js Developer', 'Backend Developer', 'Node.js Developer', 'Full Stack Developer', 'MERN Stack Developer', 'Python Developer', 'Java Developer', 'PHP Developer', 'Laravel Developer', 'Mobile App Developer', 'Flutter Developer', 'Android Developer', 'iOS Developer', 'UI/UX Designer', 'Product Designer', 'QA Engineer', 'Automation Tester', 'DevOps Engineer', 'Cloud Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'Digital Marketing Executive', 'SEO Specialist', 'Performance Marketing Manager', 'Content Writer', 'Sales Executive', 'Business Development Executive', 'Customer Support Specialist', 'HR Recruiter', 'Talent Acquisition Specialist', 'Finance Analyst', 'Operations Executive', 'Data Entry Operator', 'BPO Executive']

const companyNameOptions = ['Nimbus Tech', 'Talentora', 'Auralis Support', 'BluePeak Finance', 'PeopleMint', 'Marketly Labs', 'INSEET Solutions', 'TechNova Systems', 'BrightEdge Digital', 'Cloudify Labs', 'HireWave', 'FinEdge Analytics', 'SupportSphere', 'DataMint', 'GrowthWorks']

const industryOptions = ['IT & Software', 'SaaS', 'Fintech', 'Recruitment', 'HR Technology', 'Digital Marketing', 'Customer Support', 'E-commerce', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Logistics', 'AI & Data', 'BPO', 'Consulting']

const recruiterReviewActions = [
  { label: 'Account Reviews', value: 'account_review', status: 'account_review' },
  { label: 'Rejected', value: 'rejected', status: 'rejected' },
  { label: 'Hold', value: 'hold', status: 'hold' },
  { label: 'Suspended', value: 'suspended', status: 'suspended' },
]

const recruiterStatusOptions = ['Pending', 'Approved', 'Rejected', 'Suspended', 'Blocked']
const recruiterRemarkStatuses = ['Rejected', 'Suspended', 'Blocked']

const defaultNewsletterUpdateForm = {
  subject: '',
  previewText: '',
  message: '',
  imageUrl: '',
  ctaLabel: '',
  ctaUrl: '',
}

function normalizeName(value) {
  return String(value || '').trim().toLowerCase()
}

function mergeAdminQuery(query = '', fallbackQuery = '') {
  const params = new URLSearchParams(String(query || '').replace(/^\?/, ''))
  const fallback = new URLSearchParams(fallbackQuery)
  fallback.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })
  const next = params.toString()
  return next ? `?${next}` : ''
}

function splitAdminList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getDefaultJobLocation() {
  const state = State.getStatesOfCountry('IN')[0]
  const city = City.getCitiesOfState('IN', state?.isoCode || '')[0]
  return {
    locationScope: 'India',
    country: 'India',
    countryCode: 'IN',
    state: state?.name || '',
    stateCode: state?.isoCode || '',
    city: city?.name || '',
  }
}

function getStoredAdminUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser') || 'null')
  } catch {
    return null
  }
}

function useToastMessageState() {
  const [message, setStoredMessage] = useState('')

  const setMessage = (nextMessage) => {
    const text = typeof nextMessage === 'function' ? nextMessage(message) : nextMessage
    if (!text) {
      setStoredMessage('')
      return
    }

    showMessageToast(String(text))
    setStoredMessage('')
  }

  return [message, setMessage]
}

export function AdminManagementPage({ fixedFilters = {}, type }) {
  const user = getStoredAdminUser()
  const allowedTypes = accessByRole[user?.role] || accessByRole.Admin
  if (!allowedTypes.includes(type) || !configs[type]) return <Navigate replace to="/admin" />
  return <ManagementContent key={type} fixedFilters={fixedFilters} type={type} />
}

function ManagementContent({ fixedFilters, type }) {
  const user = getStoredAdminUser()
  const navigate = useNavigate()
  const config = configs[type]
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || ''
  const roleQuery = searchParams.get('role') || ''
  const googleStyleRoleQuery = type === 'users' && fieldOptions.role.includes(searchParams.get('q') || '') ? searchParams.get('q') || '' : ''
  const role = roleQuery || googleStyleRoleQuery
  const resumeMode = searchParams.get('resumeMode') || 'lead'
  const frontendPlacement = fixedFilters.frontendPlacement || searchParams.get('frontendPlacement') || ''
  const [rows, setRows] = useState(config.staticRows || [])
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [reviewAction, setReviewAction] = useState(null)
  const [reviewRemark, setReviewRemark] = useState('')
  const [documentViewer, setDocumentViewer] = useState(null)
  const [accountActionViewer, setAccountActionViewer] = useState(null)
  const [userViewer, setUserViewer] = useState(null)
  const [applicationViewer, setApplicationViewer] = useState(null)
  const [companyViewer, setCompanyViewer] = useState(null)
  const [selectedRow, setSelectedRow] = useState(null)
  const [form, setForm] = useState({})
  const [message, setMessage] = useToastMessageState()
  const [companyOptions, setCompanyOptions] = useState([])
  const [companyRows, setCompanyRows] = useState([])

  const loadRows = () => {
    if (!config.resource) {
      const staticRows = config.staticRows || []
      setRows(
        staticRows.filter((row) => {
          const matchesSearch = search ? JSON.stringify(row).toLowerCase().includes(search.toLowerCase()) : true
          const matchesStatus = status ? String(row.status || '').toLowerCase() === status.toLowerCase() : true
          return matchesSearch && matchesStatus
        }),
      )
      return
    }

    const resource = type === 'resumes' && resumeMode === 'lead' ? 'candidates' : config.resource
    const params = new URLSearchParams()
    if (type === 'users' && role) params.set('role', role)
    if (type === 'jobs') params.set('includeAll', 'true')
    if (type === 'contentPages' && frontendPlacement) params.set('frontendPlacement', frontendPlacement)
    if (search) params.set('search', search)
    if (status) params.set('status', status)

    const query = params.toString() ? `?${params.toString()}` : ''
    const listRequest = type === 'faqs'
      ? api.adminFaqs(mergeAdminQuery(query, 'sort=sortOrder -featured -createdAt'))
      : type === 'contentPages'
        ? api.adminContentPages(mergeAdminQuery(query, 'sort=-updatedAt'))
        : type === 'newsletterSubscribers'
          ? api.adminNewsletterSubscribers(mergeAdminQuery(query, 'sort=-createdAt'))
          : api.listAll(resource, query)

    listRequest
      .then((payload) => {
        const data = payload.data || []
        if (type === 'users') {
          setRows(data.map(normalizeUserManagementRow))
          return
        }

        if (type === 'recruiterDocuments') {
          Promise
            .all([
              api.listAll('employers'),
              api.listAll('users', '?role=recruiter'),
            ])
            .then(([employersPayload, usersPayload]) => {
              const employers = employersPayload.data || []
              const users = usersPayload.data || []
              const documentRows = groupRecruiterDocuments(attachRecruiterIdsToDocuments(data, employers, users))
              setRows(documentRows.length ? documentRows : buildRecruiterDocumentFallbackRows(employers, users))
            })
            .catch(() => setRows(groupRecruiterDocuments(data.map((document) => ({ ...document, recruiterId: document.recruiterId || '' })))))
          return
        }

        if (type === 'employers') {
          Promise
            .all([
              api.listAll('recruiter-documents', '?sort=-updatedAt'),
              api.listAll('users', '?role=recruiter'),
            ])
            .then(([documentsPayload, usersPayload]) => setRows(mergeRecruiterDocumentStatus(attachRecruiterUserIdsToRecruiters(data, usersPayload.data || []), documentsPayload.data || [])))
            .catch(() => setRows(data.map((row) => ({ ...row, source: row.source || 'Admin Upload' }))))
          return
        }

        if (type === 'jobs') {
          api
            .listAll('employers')
            .then((employersPayload) => setRows(groupJobsByRecruiter(attachRecruiterIdsToJobs(data, employersPayload.data || []))))
            .catch(() => setRows(groupJobsByRecruiter(data.map((row) => ({ ...row, recruiterId: getShortId(row.recruiterId) })))))
          return
        }

        if (type === 'companies') {
          api
            .companyProfiles()
            .then((profilesPayload) => setRows(mergeCompanyManagementRows(data, profilesPayload.data || [], { search, status })))
            .catch(() => setRows(data))
          return
        }

        if (type === 'categories') {
          api
            .listAll('jobs', '?includeAll=true&limit=100')
            .then((jobsPayload) => setRows(withAutomaticCategoryJobCounts(data, jobsPayload.data || [])))
            .catch(() => setRows(data.map((row) => ({ ...row, jobs: Number(row.jobs || 0) }))))
          return
        }

        setRows(type === 'resumes' && resumeMode === 'lead' ? data.map((row) => ({ ...row, source: 'Lead Resume' })) : data.map((row) => ({ ...row, source: row.source || 'Admin Upload' })))
      })
      .catch((error) => {
        setMessage(error.message)
        setRows([])
      })
  }

  useEffect(() => {
    setMessage('')
    setSelectedRow(null)
    setForm({})
    loadRows()
  }, [type, search, status, role, resumeMode, frontendPlacement])

  useEffect(() => {
    api
      .listAll('companies')
      .then((payload) => {
        const names = Array.from(new Set((payload.data || []).map((company) => company.name).filter(Boolean)))
        setCompanyRows(payload.data || [])
        setCompanyOptions(names)
      })
      .catch(() => {
        setCompanyRows([])
        setCompanyOptions([])
      })
  }, [])

  const updateQuery = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }

  const openCreate = () => {
    setSelectedRow(null)
    const initialForm = getInitialForm(type, companyOptions)
    if (type === 'jobs') {
      const company = companyRows.find((item) => normalizeName(item.name) === normalizeName(initialForm.company))
      if (company?.industry) {
        initialForm.industry = company.industry
        initialForm.department = company.industry
      }
    }
    if (type === 'contentPages' && frontendPlacement) {
      initialForm.frontendPlacement = frontendPlacement
    }
    setForm(initialForm)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setSelectedRow(row)
    setForm(rowToForm(row, config.fields))
    setModalOpen(true)
  }

  const requestDelete = (row) => {
    setSelectedRow(row)
    setConfirmOpen(true)
  }

  const save = async () => {
    if (!config.resource) {
      setModalOpen(false)
      setMessage('Report generated successfully.')
      return
    }

    const payload = config.transform ? config.transform(form) : form
    const requiredFields = type === 'users' && !selectedRow ? [...(config.required || []), 'password'] : config.required
    const validationSource = type === 'contentPages' ? payload : form
    const missingField = requiredFields?.find((key) => !String(validationSource[key] || '').trim())

    if (missingField) {
      setMessage(`${getFieldLabel(config.fields, missingField)} is required.`)
      return
    }

    try {
      const resource = type === 'resumes' ? 'resumes' : config.resource
      const normalizedPayload = normalizeUserManagementPayload(payload)
      const resumePayload = type === 'resumes' ? { ...normalizedPayload, source: 'Admin Upload' } : normalizedPayload

      if (selectedRow?._id && !(type === 'resumes' && resumeMode === 'lead')) {
        const payload = await api.update(resource, selectedRow._id, resumePayload)
        if (['faqs', 'contentPages', 'newsletterSubscribers'].includes(type) && payload.data) {
          setRows((current) => current.map((row) => (row._id === payload.data._id ? { ...payload.data, source: row.source || 'Admin Upload' } : row)))
        }
        setMessage('Record updated successfully.')
      } else {
        const payload = await api.create(resource, resumePayload)
        if (['faqs', 'contentPages', 'newsletterSubscribers'].includes(type) && payload.data) {
          setRows((current) => [{ ...payload.data, source: 'Admin Upload' }, ...current])
        }
        setMessage('Record created successfully.')
      }
      setModalOpen(false)
      loadRows()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const remove = async () => {
    if (!selectedRow?._id || !config.resource) {
      setConfirmOpen(false)
      return
    }

    try {
      await api.remove(config.resource, selectedRow._id)
      setMessage(type === 'users' && selectedRow.role === 'recruiter' ? 'Recruiter account, profile, and documents deleted. New registration can use this email now.' : 'Record deleted successfully.')
      setConfirmOpen(false)
      loadRows()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyRecruiterReviewAction = async (row, action, remark = '') => {
    const normalizedAction = recruiterReviewActions.find((item) => item.value === action)
    if (!normalizedAction) return

    const email = row.email || row.businessEmail
    const status = normalizedAction.status
    const backendStatus = ['account_verify', 'approved'].includes(action) ? 'Active' : action === 'suspended' ? 'Suspend' : 'Inactive'
    const localPayload = { status: normalizedAction.label, recruiterVerificationStatus: status, recruiterVerificationRemark: remark }
    const apiPayload = { status: backendStatus, recruiterVerificationStatus: status, recruiterVerificationRemark: remark }

    if (email) updateRecruiterVerificationRemark(email, remark)

    try {
      if (row._id && config.resource) {
        await api.update(config.resource, row._id, apiPayload)
      }
      setRows((current) => current.map((item) => (item._id === row._id ? { ...item, ...localPayload } : item)))
      setMessage(`Recruiter account marked as ${normalizedAction.label}.`)
    } catch (error) {
      setRows((current) => current.map((item) => (item._id === row._id ? { ...item, ...localPayload } : item)))
      setMessage(`Saved locally. Backend unavailable: ${error.message}`)
    }
  }

  const selectRecruiterReviewAction = (row, action) => {
    const needsRemark = ['rejected', 'hold', 'suspended'].includes(action)

    if (needsRemark) {
      setReviewAction({ row, action })
      setReviewRemark('')
      return
    }

    applyRecruiterReviewAction(row, action)
  }

  const approveRecruiterDocument = async (row) => {
    const email = row.recruiterEmail

    if (!email) {
      setMessage('Recruiter email is missing on this document.')
      return
    }

    try {
      await api.update('recruiter-documents', row._id, { status: 'Approved' })
      const usersPayload = await api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`)
      const recruiter = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === email.toLowerCase())

      if (recruiter?._id) {
        await api.update('users', recruiter._id, { status: 'Active', recruiterVerificationStatus: 'approved', recruiterVerificationRemark: '' })
      }

      setMessage('Recruiter documents approved. Recruiter can login to dashboard now.')
      loadRows()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyRecruiterDocumentAction = async (row, action, remark = '') => {
    if (action === 'delete') {
      requestDelete(row)
      return
    }

    const statusMap = {
      Pending: { documentStatus: 'Pending', recruiterStatus: 'documents_review', userStatus: 'Review', message: 'Recruiter documents marked pending.' },
      Approved: { documentStatus: 'Approved', recruiterStatus: 'approved', userStatus: 'Active', message: 'Recruiter documents approved. Recruiter can login to dashboard now.' },
      Rejected: { documentStatus: 'Rejected', recruiterStatus: 'rejected', userStatus: 'Inactive', message: 'Recruiter documents rejected. Remark sent to recruiter.' },
      Suspended: { documentStatus: 'Suspended', recruiterStatus: 'suspended', userStatus: 'Suspend', message: 'Recruiter documents suspended. Remark sent to recruiter.' },
      Blocked: { documentStatus: 'Blocked', recruiterStatus: 'suspended', userStatus: 'Suspend', message: 'Recruiter documents blocked. Remark sent to recruiter.' },
    }
    const next = statusMap[action]
    const email = row.recruiterEmail
    const reviewer = getStoredAdminUser() || {}

    if (!next || !email) {
      setMessage('Recruiter email is missing on this document.')
      return
    }

    try {
      const reviewPayload = {
        status: next.documentStatus,
        remark,
        reviewedByName: reviewer.name || 'Account Team',
        reviewedByEmail: reviewer.email || '',
        reviewedAction: next.documentStatus,
        reviewedAt: new Date().toISOString(),
      }
      await api.update('recruiter-documents', row._id, reviewPayload)
      const usersPayload = await api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`)
      const recruiter = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === email.toLowerCase())

      if (recruiter?._id) {
        await api.update('users', recruiter._id, { status: next.userStatus, recruiterVerificationStatus: next.recruiterStatus, recruiterVerificationRemark: remark })
      }

      setRows((current) => current.map((item) => (item._id === row._id ? { ...item, ...reviewPayload } : item)))
      setMessage(`${next.message} Authorised by ${reviewPayload.reviewedByName}.`)
      loadRows()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyEmployerAccountAction = async (row, action, remark = '') => {
    if (action === 'delete') {
      requestDelete(row)
      return
    }

    const reviewer = getStoredAdminUser() || {}
    const statusMap = {
      Pending: { documentStatus: 'Pending', employerStatus: 'Pending', userStatus: 'Review', recruiterStatus: 'account_review', verified: false, message: 'Recruiter account moved to pending.' },
      Approved: { documentStatus: 'Approved', employerStatus: 'Approved', userStatus: 'Active', recruiterStatus: 'approved', verified: true, message: 'Recruiter account approved.' },
      Rejected: { documentStatus: 'Rejected', employerStatus: 'Rejected', userStatus: 'Inactive', recruiterStatus: 'rejected', verified: false, message: 'Recruiter account rejected.' },
      Suspended: { documentStatus: 'Suspended', employerStatus: 'Suspended', userStatus: 'Suspend', recruiterStatus: 'suspended', verified: false, message: 'Recruiter account suspended.' },
      Blocked: { documentStatus: 'Blocked', employerStatus: 'Blocked', userStatus: 'Suspend', recruiterStatus: 'suspended', verified: false, message: 'Recruiter account blocked.' },
    }
    const next = statusMap[action]
    if (!next) return

    const authPayload = {
      status: next.employerStatus,
      verified: next.verified,
      accountAuthorizedByName: reviewer.name || 'Account Team',
      accountAuthorizedByEmail: reviewer.email || '',
      accountAuthorizedAction: next.employerStatus,
      accountAuthorizedRemark: remark,
      accountAuthorizedAt: new Date().toISOString(),
    }

    try {
      const response = await api.update('employers', row._id, authPayload)
      const email = row.businessEmail
      if (email) {
        const [usersPayload, documentsPayload] = await Promise.all([
          api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`),
          api.list('recruiter-documents', `?recruiterEmail=${encodeURIComponent(email)}&sort=-updatedAt&limit=1`).catch(() => ({ data: [] })),
        ])
        const recruiter = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === email.toLowerCase())
        if (recruiter?._id) {
          await api.update('users', recruiter._id, {
            status: next.userStatus,
            recruiterVerificationStatus: next.recruiterStatus,
            recruiterVerificationRemark: remark,
          })
        }
        const latestDocument = (documentsPayload.data || [])[0]
        if (latestDocument?._id) {
          await api.update('recruiter-documents', latestDocument._id, {
            status: next.documentStatus,
            remark,
            reviewedByName: authPayload.accountAuthorizedByName,
            reviewedByEmail: authPayload.accountAuthorizedByEmail,
            reviewedAction: next.documentStatus,
            reviewedAt: authPayload.accountAuthorizedAt,
          })
        }
      }
      setRows((current) => current.map((item) => (item._id === row._id ? { ...item, ...(response.data || authPayload) } : item)))
      setMessage(`${next.message} Authorised by ${authPayload.accountAuthorizedByName}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectEmployerAccountAction = (row, action) => {
    if (recruiterRemarkStatuses.includes(action)) {
      setReviewAction({ row, action, type: 'employerAccount' })
      setReviewRemark('')
      return
    }

    applyEmployerAccountAction(row, action)
  }

  const selectRecruiterDocumentAction = (row, action) => {
    if (recruiterRemarkStatuses.includes(action)) {
      setReviewAction({ row, action, type: 'recruiterDocument' })
      setReviewRemark('')
      return
    }

    applyRecruiterDocumentAction(row, action)
  }

  const updateUserManagementStatus = async (row, status) => {
    if (!row?._id || !status || status === row.status) return

    const payload = normalizeUserManagementPayload({ ...row, status })
    try {
      const response = await api.update('users', row._id, payload)
      const nextRow = normalizeUserManagementRow(response.data || payload)
      setRows((current) => current.map((item) => (item._id === row._id ? { ...item, ...nextRow } : item)))
      setMessage(`User status updated to ${nextRow.status || status}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const applyJobReviewAction = async (row, action, remark = '') => {
    const payload = action === 'active'
      ? { accountDepartmentStatus: 'Active', status: 'Active', approval: 'Approved', accountDepartmentRemark: '' }
      : { accountDepartmentStatus: 'Rejected', status: 'Closed', approval: 'Rejected', accountDepartmentRemark: remark }

    try {
      const response = await api.update('jobs', row._id, payload)
      setRows((current) => current.map((item) => (item._id === row._id ? response.data : item)))
      setMessage(action === 'active' ? 'Job activated. It is now visible to users.' : 'Job rejected. The remark will be shown to the recruiter.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectJobReviewAction = (row, action) => {
    if (action === 'reject') {
      setReviewAction({ row, action, type: 'jobReview' })
      setReviewRemark('')
      return
    }

    applyJobReviewAction(row, action)
  }

  const openRecruiterJobs = (row) => {
    const recruiterObjectId = row.recruiterObjectId || row._id

    if (recruiterObjectId) {
      window.open(`/admin/recruiters/${recruiterObjectId}`, '_blank', 'noopener,noreferrer')
    } else {
      setMessage('Recruiter profile not linked with this job group.')
    }
  }

  const openLocationsPage = () => {
    window.open('/admin/locations', '_blank', 'noopener,noreferrer')
  }

  const submitReviewRemark = () => {
    if (!reviewAction) return

    if (!reviewRemark.trim()) {
      setMessage('Remark is required for rejected, suspended, and blocked accounts.')
      return
    }

    if (reviewAction.type === 'jobReview') {
      applyJobReviewAction(reviewAction.row, reviewAction.action, reviewRemark.trim())
    } else if (reviewAction.type === 'recruiterDocument') {
      applyRecruiterDocumentAction(reviewAction.row, reviewAction.action, reviewRemark.trim())
    } else if (reviewAction.type === 'employerAccount') {
      applyEmployerAccountAction(reviewAction.row, reviewAction.action, reviewRemark.trim())
    } else {
      applyRecruiterReviewAction(reviewAction.row, reviewAction.action, reviewRemark.trim())
    }
    setReviewAction(null)
    setReviewRemark('')
  }

  const actions = useMemo(
    () => (row) => {
      if (type === 'users') {
        return <UserManagementActions onDelete={() => requestDelete(row)} onStatusChange={(nextStatus) => updateUserManagementStatus(row, nextStatus)} row={row} />
      }

      if (type === 'recruiterDocuments') {
        return <RecruiterDocumentActions onAction={(action) => selectRecruiterDocumentAction(row, action)} row={row} />
      }

      if (type === 'employers') {
        return <RecruiterAccountActions canDelete={user?.role !== 'account team'} onAction={(action) => selectEmployerAccountAction(row, action)} row={row} />
      }

      if (type === 'applications') {
        return <ApplicationManagementActions onDelete={() => requestDelete(row)} onEdit={() => openEdit(row)} onView={() => setApplicationViewer(row)} />
      }

      if (type === 'testimonials') {
        return <TestimonialManagementActions onDelete={() => requestDelete(row)} onEdit={() => openEdit(row)} />
      }

      if (type === 'faqs') {
        return <FaqManagementActions onDelete={() => requestDelete(row)} onEdit={() => openEdit(row)} />
      }

      if (type === 'contentPages') {
        return <PolicyManagementActions onDelete={() => requestDelete(row)} onEdit={() => openEdit(row)} row={row} />
      }

      if (type === 'companies') {
        return (
          <ActionButtons
            extra={undefined}
            onDelete={row._id ? () => requestDelete(row) : undefined}
            onEdit={() => openEdit(row)}
            onView={() => setCompanyViewer(row)}
          />
        )
      }

      if (type === 'payments') {
        return <PaymentTransactionActions onDelete={() => requestDelete(row)} row={row} />
      }

      return (
        <ActionButtons
          extra={type === 'resumes' ? 'Preview' : config.extra}
          onDelete={type === 'resumes' && resumeMode === 'lead' ? undefined : () => requestDelete(row)}
          onEdit={type === 'resumes' && resumeMode === 'lead' ? () => openEdit(row) : () => openEdit(row)}
        />
      )
    },
    [config.extra, navigate, resumeMode, type, user?.role],
  )
  const displayRows = type === 'jobs'
    ? (rows.some((row) => !row.jobPostCount) ? groupJobsByRecruiter(rows) : rows)
    : type === 'supportMessages'
      ? groupSupportMessagesByEmail(rows)
      : rows
  const toolbarTitle = type === 'contentPages' && frontendPlacement ? `${frontendPlacement} Policies` : config.title
  const toolbarSubtitle = type === 'contentPages' && frontendPlacement
    ? `Manage ${frontendPlacement.toLowerCase()} privacy, terms, support, and general policy pages separately.`
    : config.subtitle
  const canCreate = !config.readonly && !config.disableCreate && !(user?.role === 'account team' && ['jobs', 'employers'].includes(type))
  const rowClickHandler = type === 'jobs'
    ? openRecruiterJobs
    : type === 'recruiterDocuments'
      ? (row) => window.open(`/admin/recruiter-documents/${row._id}`, '_blank', 'noopener,noreferrer')
      : type === 'employers'
        ? (row) => window.open(`/admin/recruiters/${row._id}`, '_blank', 'noopener,noreferrer')
        : type === 'supportMessages'
          ? (row) => window.open(`/admin/support-messages/${row.latestMessageId || row._id}`, '_blank', 'noopener,noreferrer')
          : type === 'users'
            ? openLocationsPage
            : undefined

  if (type === 'locations') {
    return <LiveLocationDashboard />
  }

  return (
    <div className="grid gap-5">
      <Toolbar
        actionLabel={config.actionLabel}
        onAction={canCreate ? openCreate : undefined}
        onSearchChange={(value) => updateQuery('search', value)}
        onStatusChange={(value) => updateQuery('status', value)}
        searchValue={search}
        statusValue={status}
        statusOptions={config.statusOptions}
        subtitle={toolbarSubtitle}
        title={toolbarTitle}
      />
      <div className="flex flex-col justify-between gap-3 rounded-[7px] border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {(type === 'users' ? fieldOptions.role : config.statusOptions || ['Admin', 'staff', 'recruiter', 'users']).map((item) => <StatusBadge key={item} status={item} />)}
        </div>
        {type === 'resumes' && (
          <select className="rounded-[7px] border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 outline-none" onChange={(event) => updateQuery('resumeMode', event.target.value)} value={resumeMode}>
            <option value="lead">Lead Resume</option>
            <option value="upload">Upload Resume</option>
          </select>
        )}
        {type === 'contentPages' && !fixedFilters.frontendPlacement && (
          <select className="rounded-[7px] border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-600 outline-none" onChange={(event) => updateQuery('frontendPlacement', event.target.value)} value={frontendPlacement}>
            <option value="">All Frontends</option>
            {fieldOptions.policyPlacement.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        )}
        {config.export && <ExportButtons />}
      </div>
      {message && <p className="rounded-[7px] bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}
      {type === 'applications' && <ApplicationStatusPanel />}
      {['payments', 'paymentLogs'].includes(type) && <RevenueSummary rows={displayRows} />}
      <DataTable
        actions={type === 'jobs' || config.readonly ? undefined : actions}
        columns={config.columns}
        onRowClick={rowClickHandler}
        rows={type === 'recruiterDocuments' ? displayRows : formatRows(displayRows)}
      />
      {!displayRows.length && <EmptyAdminState title={`${config.title} empty state`} />}
      {type === 'newsletterSubscribers' && <NewsletterSendShortcut />}
      <CrudModal companyOptions={companyOptions} companyRows={companyRows} config={config} form={form} isCreate={!selectedRow} onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))} onClose={() => setModalOpen(false)} onSave={save} open={modalOpen} type={type} />
      <AdminModal open={Boolean(reviewAction)} title={reviewAction?.type === 'jobReview' ? 'Add job reject remark' : reviewAction?.type === 'recruiterDocument' ? 'Add document review remark' : 'Add recruiter account remark'} onClose={() => setReviewAction(null)}>
        <p className="text-sm leading-6 text-slate-500">{reviewAction?.type === 'jobReview' ? 'This remark will be shown to the recruiter on their posted jobs page.' : 'This remark will be shown to the recruiter on their verification screen.'}</p>
        <textarea className="input mt-4 min-h-32" onChange={(event) => setReviewRemark(event.target.value)} placeholder="Write reason or next steps for recruiter" value={reviewRemark} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={() => setReviewAction(null)} type="button">Cancel</button>
          <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={submitReviewRemark} type="button">Save Remark</button>
        </div>
      </AdminModal>
      <DocumentViewerModal onClose={() => setDocumentViewer(null)} row={documentViewer} />
      <AccountActionViewerModal onClose={() => setAccountActionViewer(null)} row={accountActionViewer} />
      <UserViewerModal onClose={() => setUserViewer(null)} row={userViewer} />
      <ApplicationViewerModal onClose={() => setApplicationViewer(null)} row={applicationViewer} />
      <CompanyViewerModal onClose={() => setCompanyViewer(null)} row={companyViewer} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={remove} />
    </div>
  )
}

export function AdminPaymentDetailPage() {
  const user = getStoredAdminUser()
  const allowedTypes = accessByRole[user?.role] || accessByRole.Admin
  if (!allowedTypes.includes('payments')) return <Navigate replace to="/admin" />
  return <PaymentDetailContent />
}

function PaymentDetailContent() {
  const user = getStoredAdminUser()
  const { paymentId } = useParams()
  const [payment, setPayment] = useState(null)
  const [recruiter, setRecruiter] = useState(null)
  const [recruiterUser, setRecruiterUser] = useState(null)
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadPayment = async () => {
      setLoading(true)
      setMessage('')

      try {
        const payload = await api.get('payments', paymentId)
        const nextPayment = payload.data || payload
        let matchedRecruiter = null
        let matchedUser = null

        if (nextPayment?.recruiterEmail) {
          const [recruiterPayload, usersPayload] = await Promise.all([
            api.list('employers', `?search=${encodeURIComponent(nextPayment.recruiterEmail)}`).catch(() => ({ data: [] })),
            api.list('users', `?role=recruiter&search=${encodeURIComponent(nextPayment.recruiterEmail)}`).catch(() => ({ data: [] })),
          ])
          matchedRecruiter = (recruiterPayload.data || []).find((item) => item.businessEmail?.toLowerCase() === nextPayment.recruiterEmail.toLowerCase()) || null
          matchedUser = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === nextPayment.recruiterEmail.toLowerCase()) || null
        } else if (nextPayment?.employer) {
          const recruiterPayload = await api.list('employers', `?search=${encodeURIComponent(nextPayment.employer)}`).catch(() => ({ data: [] }))
          matchedRecruiter = (recruiterPayload.data || [])[0] || null
        }

        if (!mounted) return
        setPayment(nextPayment)
        setRecruiter(matchedRecruiter)
        setRecruiterUser(matchedUser)
      } catch (error) {
        if (mounted) setMessage(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadPayment()

    return () => {
      mounted = false
    }
  }, [paymentId])

  if (loading) {
    return <LoadingSkeleton />
  }

  if (message) {
    return <p className="rounded-[7px] bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</p>
  }

  if (!payment) {
    return <EmptyAdminState title="Payment record not found" />
  }

  const customerName = recruiterUser?.name || recruiter?.contactPerson || 'Not added'
  const companyName = recruiter?.companyName || payment.employer || 'Not added'
  const totalFee = getPaymentTotalFee(payment)
  const paymentExportRecruiter = { ...(recruiter || {}), contactPerson: customerName }

  return (
    <div className="grid gap-5">
      <AdminCard>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-blue-600">Payment details</p>
            <h1 className="mt-2 text-4xl font-black text-slate-950">{payment.invoiceNo || 'Transaction'}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">Full customer, recruiter, gateway, and total fee information for this transaction.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="export-btn" onClick={() => downloadPaymentRecord(payment, 'excel', paymentExportRecruiter)} type="button"><FileSpreadsheet size={16} /> Excel</button>
            <button className="export-btn" onClick={() => downloadPaymentRecord(payment, 'pdf', paymentExportRecruiter)} type="button"><FileText size={16} /> PDF</button>
            <button className="export-btn" onClick={() => downloadPaymentRecord(payment, 'doc', paymentExportRecruiter)} type="button"><FileText size={16} /> DOC</button>
          </div>
        </div>
      </AdminCard>

      <div className="grid gap-4 lg:grid-cols-3">
        <AdminCard>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Total Fee</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{totalFee}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{payment.currency || 'INR'} charged to recruiter</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Payment Status</p>
          <div className="mt-4"><StatusBadge status={payment.status || 'Pending'} /></div>
          <p className="mt-3 text-sm font-bold text-slate-500">{payment.paidAt ? `Paid at ${formatDateTime(payment.paidAt)}` : `Created at ${formatDateTime(payment.createdAt)}`}</p>
        </AdminCard>
        <AdminCard>
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">Plan</p>
          <p className="mt-3 text-3xl font-black text-slate-950">{payment.plan || 'Manual'}</p>
          <p className="mt-1 text-sm font-bold text-slate-500">{payment.coins ? `${payment.coins} coins` : payment.purpose || 'package'}</p>
        </AdminCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <AdminCard>
          <h2 className="text-xl font-black text-slate-950">Customer Details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProfileLine label="Contact person" value={customerName} />
            <ProfileLine label="Company" value={companyName} />
            <ProfileLine label="Email" value={payment.recruiterEmail || recruiter?.businessEmail || 'Not added'} />
            <ProfileLine label="Phone" value={recruiter?.phone || 'Not added'} />
            <ProfileLine label="Industry" value={recruiter?.industry || 'Not added'} />
            <ProfileLine label="Company size" value={recruiter?.companySize || 'Not added'} />
            <ProfileLine label="Location" value={recruiter?.location || 'Not added'} />
            <ProfileLine label="Website" value={recruiter?.website || 'Not added'} />
          </div>
        </AdminCard>

        <AdminCard>
          <h2 className="text-xl font-black text-slate-950">Transaction Details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ProfileLine label="Invoice" value={payment.invoiceNo || 'Not added'} />
            <ProfileLine label="Gateway" value={payment.gateway || 'Not added'} />
            <ProfileLine label="Payment method" value={payment.paymentMethod || 'Not added'} />
            <ProfileLine label="Purpose" value={payment.purpose || 'Not added'} />
            <ProfileLine label="Razorpay order ID" value={payment.razorpayOrderId || 'Not added'} />
            <ProfileLine label="Razorpay payment ID" value={payment.razorpayPaymentId || 'Not added'} />
            <ProfileLine label="Created" value={formatDateTime(payment.createdAt)} />
            <ProfileLine label="Updated" value={formatDateTime(payment.updatedAt)} />
          </div>
          {payment.failureReason ? (
            <p className="mt-4 rounded-[7px] bg-rose-50 p-4 text-sm font-bold text-rose-700">{payment.failureReason}</p>
          ) : null}
        </AdminCard>
      </div>
    </div>
  )
}

export function RecruiterDocumentDetailPage() {
  const user = getStoredAdminUser()
  const allowedTypes = accessByRole[user?.role] || accessByRole.Admin
  if (!allowedTypes.includes('recruiterDocuments')) return <Navigate replace to="/admin" />
  return <RecruiterDocumentDetailContent />
}

function RecruiterDocumentDetailContent() {
  const user = getStoredAdminUser()
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [message, setMessage] = useToastMessageState()
  const [reviewAction, setReviewAction] = useState(null)
  const [reviewRemark, setReviewRemark] = useState('')
  const [documentViewer, setDocumentViewer] = useState(null)
  const [remarkViewer, setRemarkViewer] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const loadDocuments = async () => {
    if (!documentId) return

    try {
      const payload = await api.get('recruiter-documents', documentId)
      const document = payload.data || payload
      const email = document.recruiterEmail

      if (!email) {
        setDocuments(document?._id ? [document] : [])
        return
      }

      const historyPayload = await api.list('recruiter-documents', `?recruiterEmail=${encodeURIComponent(email)}&sort=-updatedAt`)
      const history = historyPayload.data || []
      const documentsToShow = history.length ? history : [document]
      try {
        const [recruitersPayload, usersPayload] = await Promise.all([
          api.list('employers', `?search=${encodeURIComponent(email)}`),
          api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`),
        ])
        setDocuments(attachRecruiterIdsToDocuments(documentsToShow, recruitersPayload.data || [], usersPayload.data || []))
      } catch {
        setDocuments(documentsToShow.map((item) => ({ ...item, recruiterId: item.recruiterId || '' })))
      }
    } catch (error) {
      setMessage(error.message)
      setDocuments([])
    }
  }

  useEffect(() => {
    setMessage('')
    loadDocuments()
  }, [documentId])

  const primaryDocument = documents[0] || {}

  const applyDocumentAction = async (document, action, remark = '') => {
    if (action === 'delete') {
      setSelectedDocument(document)
      setConfirmOpen(true)
      return
    }

    const statusMap = {
      Pending: { documentStatus: 'Pending', recruiterStatus: 'documents_review', userStatus: 'Review', message: 'Recruiter documents marked pending.' },
      Approved: { documentStatus: 'Approved', recruiterStatus: 'approved', userStatus: 'Active', message: 'Recruiter documents approved. Recruiter can login to dashboard now.' },
      Rejected: { documentStatus: 'Rejected', recruiterStatus: 'rejected', userStatus: 'Inactive', message: 'Recruiter documents rejected. Remark sent to recruiter.' },
      Suspended: { documentStatus: 'Suspended', recruiterStatus: 'suspended', userStatus: 'Suspend', message: 'Recruiter documents suspended. Remark sent to recruiter.' },
      Blocked: { documentStatus: 'Blocked', recruiterStatus: 'suspended', userStatus: 'Suspend', message: 'Recruiter documents blocked. Remark sent to recruiter.' },
    }
    const next = statusMap[action]
    const email = document.recruiterEmail

    if (!next || !email) {
      setMessage('Recruiter email is missing on this document.')
      return
    }

    try {
      const reviewer = getStoredAdminUser() || {}
      const reviewPayload = {
        status: next.documentStatus,
        remark: action === 'Approved' ? '' : remark,
        reviewedByName: reviewer.name || 'Account Team',
        reviewedByEmail: reviewer.email || '',
        reviewedAction: next.documentStatus,
        reviewedAt: new Date().toISOString(),
      }
      await api.update('recruiter-documents', document._id, reviewPayload)
      const usersPayload = await api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`)
      const recruiter = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === email.toLowerCase())

      if (recruiter?._id) {
        await api.update('users', recruiter._id, {
          status: next.userStatus,
          recruiterVerificationStatus: next.recruiterStatus,
            recruiterVerificationRemark: action === 'Approved' ? '' : remark,
        })
      }

      setMessage(`${next.message} Authorised by ${reviewPayload.reviewedByName}.`)
      loadDocuments()
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectDocumentAction = (document, action) => {
    if (action === 'view') {
      setDocumentViewer(document)
      return
    }

    if (recruiterRemarkStatuses.includes(action)) {
      setReviewAction({ document, action })
      setReviewRemark('')
      return
    }

    applyDocumentAction(document, action)
  }

  const submitReviewRemark = () => {
    if (!reviewAction) return

    if (!reviewRemark.trim()) {
      setMessage('Remark is required for rejected, suspended, and blocked documents.')
      return
    }

    applyDocumentAction(reviewAction.document, reviewAction.action, reviewRemark.trim())
    setReviewAction(null)
    setReviewRemark('')
  }

  const removeDocument = async () => {
    if (!selectedDocument?._id) {
      setConfirmOpen(false)
      return
    }

    try {
      await api.remove('recruiter-documents', selectedDocument._id)
      setMessage('Recruiter document request deleted successfully.')
      setConfirmOpen(false)
      setSelectedDocument(null)
      loadDocuments()
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="grid gap-5">
      <Toolbar
        actionLabel="Back"
        onAction={() => navigate('/admin/recruiter-documents')}
        subtitle="All recruiter document requests are shown here in a full-page view."
        title="Recruiter document request history"
      />
      {message && <p className="rounded-[7px] bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}
      <AdminCard>
        <p className="text-lg font-black text-slate-950">{primaryDocument.recruiterName || 'Recruiter'}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{primaryDocument.recruiterEmail || 'Email not available'}</p>
        <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-400">Recruiter ID {primaryDocument.recruiterId || 'Not available'} · {documents.length} request{submissionSuffix(documents.length)}</p>
      </AdminCard>
      <AdminCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Requests No', 'Recruiter ID', 'Recruiter', 'Email', 'Document Type', 'PAN', 'PAN Card', 'GSTIN', 'GST Certificate', 'Status', 'Created', 'Actions'].map((label) => (
                  <th className="whitespace-nowrap px-5 py-4 font-bold" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document, index) => (
                <tr className="transition hover:bg-blue-50/40" key={document._id || index}>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">#{documents.length - index}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.recruiterId || 'Not available'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-700">{document.recruiterName || 'Recruiter'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.recruiterEmail || 'Not added'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.documentType || 'Not added'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.panNumber || 'Not added'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{renderDocumentFileCell(document.panDocument, 'PAN Card')}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.gstNumber || 'Not added'}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{renderDocumentFileCell(document.gstDocument, 'GST Certificate')}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">
                    {document.remark && ['rejected', 'suspend', 'suspended'].includes(String(document.status || '').toLowerCase()) ? (
                      <button className="rounded-[7px] bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700" onClick={() => setRemarkViewer({ status: document.status, remark: document.remark })} type="button">
                        {document.status}
                      </button>
                    ) : (
                      <StatusBadge status={document.status || 'Submitted'} />
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{document.createdAt ? new Date(document.createdAt).toLocaleString() : 'Not available'}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-2">
                      <IconAction kind="view" label="View documents" onClick={() => setDocumentViewer(document)} />
                      <StatusActionSelect onChange={(status) => selectDocumentAction(document, status)} value={recruiterStatusOptions.includes(document.status) ? document.status : ''} />
                      <IconAction kind="delete" label="Delete" onClick={() => selectDocumentAction(document, 'delete')} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
      {!documents.length && <EmptyAdminState title="No recruiter document requests found" />}
      <AdminModal open={Boolean(reviewAction)} title="Add document review remark" onClose={() => setReviewAction(null)}>
        <p className="text-sm leading-6 text-slate-500">This remark will be shown to the recruiter on their verification screen.</p>
        <textarea className="input mt-4 min-h-32" onChange={(event) => setReviewRemark(event.target.value)} placeholder="Write reason or next steps for recruiter" value={reviewRemark} />
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={() => setReviewAction(null)} type="button">Cancel</button>
          <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={submitReviewRemark} type="button">Save Remark</button>
        </div>
      </AdminModal>
      <DocumentViewerModal onClose={() => setDocumentViewer(null)} row={documentViewer} />
      <RemarkViewerModal onClose={() => setRemarkViewer(null)} remark={remarkViewer} />
      <ConfirmDialog open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={removeDocument} />
    </div>
  )
}

function getInitialForm(type, companyOptions = []) {
  if (type === 'users') {
    return {
      name: '',
      email: '',
      role: fieldOptions.role[0],
      password: '',
      status: fieldOptions.userStatus[0],
    }
  }

  if (type === 'companies') {
    return {
      ...getDefaultJobLocation(),
      name: '',
      industry: '',
      jobs: 0,
      status: 'Pending',
      address: '',
    }
  }

  if (type === 'jobs') {
    const location = getDefaultJobLocation()
    return {
      ...location,
      title: jobTitleOptions[0],
      company: companyOptions[0] || '',
      industry: '',
      department: fieldOptions.department[0],
      location: formatJobLocation(location),
      experience: fieldOptions.experience[0],
      type: fieldOptions.type[0],
      workMode: fieldOptions.workMode[0],
      status: 'Open',
      approval: 'Pending',
      accountDepartmentStatus: 'Pending',
      interviewSameAsOffice: true,
    }
  }

  if (type === 'testimonials') {
    return {
      name: '',
      role: '',
      company: '',
      type: fieldOptions.testimonialType[0],
      frontendPlacement: fieldOptions.testimonialPlacement[0],
      rating: 5,
      featured: 'false',
      status: 'Active',
      text: '',
    }
  }

  if (type === 'videoTestimonials') {
    return {
      companyName: '',
      quote: '',
      location: '',
      duration: '02:45',
      logoText: '',
      videoUrl: '',
      thumbnailUrl: '',
      tone: 'blue',
      sortOrder: 0,
      featured: 'false',
      status: 'Active',
    }
  }

  if (type === 'careerJobs') {
    return {
      title: '',
      department: '',
      location: 'India',
      openings: 1,
      type: 'Full Time',
      workMode: 'Hybrid',
      experience: '',
      salary: '',
      deadline: '',
      applyEmail: 'support@inseet.in',
      skills: '',
      responsibilities: '',
      requirements: '',
      sortOrder: 0,
      featured: 'false',
      status: 'Active',
      description: '',
    }
  }

  if (type === 'freelancerProfiles') {
    return {
      name: '',
      email: '',
      role: '',
      location: '',
      rate: '',
      rating: 0,
      reviews: 0,
      experience: '',
      availability: 'Available',
      skills: '',
      summary: '',
      featured: 'false',
      sortOrder: 0,
      status: 'Review',
    }
  }

  if (type === 'faqs') {
    return {
      category: fieldOptions.faqCategory[0],
      question: 'How do I apply for jobs on INSEET?',
      answer: 'Create or login to your candidate account, complete your profile, open a job, and click Apply. You can track submitted applications from your dashboard.',
      featured: 'false',
      sortOrder: 0,
      status: fieldOptions.faqStatus[0],
    }
  }

  if (type === 'newsletterSubscribers') {
    return {
      email: '',
      source: 'admin',
      topics: 'Hiring insights, Latest jobs, Recruiter updates',
      status: fieldOptions.subscriberStatus[0],
    }
  }

  if (type === 'contentPages') {
    return {
      title: '',
      slug: '',
      category: 'Policy',
      frontendPlacement: fieldOptions.policyPlacement[0],
      subtitle: '',
      sectionsText: '',
      status: 'Published',
      effectiveDate: new Date().toISOString().slice(0, 10),
    }
  }

  return {}
}

function getFieldLabel(fields, key) {
  return fields.find(([fieldKey]) => fieldKey === key)?.[1] || key
}

function PaymentRecruiterLink({ row }) {
  const label = row?.employer || row?.recruiterEmail || 'View recruiter'
  const href = row?._id ? `/admin/payments/transactions/${row._id}` : ''

  if (!href) return <span>{label}</span>

  return (
    <a
      className="inline-flex items-center gap-2 rounded-[7px] px-2 py-1 font-black text-blue-700 transition hover:bg-blue-50 hover:text-blue-800"
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink size={14} />
    </a>
  )
}

function PaymentTransactionActions({ onDelete, row }) {
  const openDetails = () => {
    if (row?._id) window.open(`/admin/payments/transactions/${row._id}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        className="inline-flex h-9 items-center gap-2 rounded-[7px] bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700"
        onClick={openDetails}
        type="button"
      >
        View
      </button>
      <details className="relative">
        <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-[7px] border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:border-blue-300 hover:text-blue-700">
          <Download size={15} /> Download
        </summary>
        <div className="absolute right-0 z-20 mt-2 w-36 overflow-hidden rounded-[7px] border border-slate-200 bg-white p-1 shadow-xl">
          <button className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50" onClick={() => downloadPaymentRecord(row, 'excel')} type="button"><FileSpreadsheet size={14} /> Excel</button>
          <button className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50" onClick={() => downloadPaymentRecord(row, 'pdf')} type="button"><FileText size={14} /> PDF</button>
          <button className="flex w-full items-center gap-2 rounded-[6px] px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-blue-50" onClick={() => downloadPaymentRecord(row, 'doc')} type="button"><FileText size={14} /> DOC</button>
        </div>
      </details>
      {onDelete && <IconAction kind="delete" label="Delete transaction" onClick={onDelete} />}
    </div>
  )
}

function RecruiterReviewActions({ onAction, onDelete, onEdit }) {
  return (
    <div className="flex flex-wrap gap-2">
      <IconAction kind="edit" label="Edit" onClick={onEdit} />
      {recruiterReviewActions.map((action) => <IconAction action={action.value} key={action.value} label={action.label} onClick={() => onAction(action.value)} />)}
      {onDelete && <IconAction kind="delete" label="Delete" onClick={onDelete} />}
    </div>
  )
}

function UserManagementActions({ onDelete, onStatusChange, row }) {
  return (
    <div className="flex flex-wrap gap-2">
      <select
        className="h-8 rounded-[7px] border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-500"
        onChange={(event) => {
          const next = event.target.value
          if (next) onStatusChange(next)
        }}
        value={fieldOptions.userStatus.includes(row?.status) ? row.status : ''}
      >
        <option value="">Status</option>
        {fieldOptions.userStatus.map((status) => <option key={status} value={status}>{status}</option>)}
      </select>
      <IconAction kind="delete" label="Delete user" onClick={onDelete} />
    </div>
  )
}

function ApplicationManagementActions({ onDelete, onEdit, onView }) {
  return (
    <div className="flex flex-wrap gap-2">
      <IconAction kind="view" label="View application" onClick={onView} />
      <IconAction kind="edit" label="Edit application" onClick={onEdit} />
      <IconAction kind="delete" label="Delete application" onClick={onDelete} />
    </div>
  )
}

function TestimonialManagementActions({ onDelete, onEdit }) {
  return (
    <div className="flex flex-wrap gap-2">
      <IconAction kind="edit" label="Edit testimonial" onClick={onEdit} />
      <IconAction kind="delete" label="Delete testimonial" onClick={onDelete} />
    </div>
  )
}

function FaqManagementActions({ onDelete, onEdit }) {
  return (
    <div className="flex flex-wrap gap-2">
      <IconAction kind="edit" label="Edit FAQ" onClick={onEdit} />
      <IconAction kind="delete" label="Delete FAQ" onClick={onDelete} />
    </div>
  )
}

function PolicyManagementActions({ onDelete, onEdit, row }) {
  const frontendPath = getPolicyFrontendPath(row)

  return (
    <div className="flex flex-wrap gap-2">
      <IconAction kind="edit" label="Edit policy" onClick={onEdit} />
      <IconAction kind="view" label={`View frontend: ${frontendPath}`} onClick={() => window.open(frontendPath, '_blank', 'noopener,noreferrer')} />
      <IconAction kind="delete" label="Delete policy" onClick={onDelete} />
    </div>
  )
}

function getPolicyFrontendPath(row = {}) {
  const slug = String(row.slug || 'privacy').trim().toLowerCase()
  const recruiter = row.frontendPlacement === 'Recruiter Frontend'
  const freelancer = row.frontendPlacement === 'Freelancer Frontend'

  if (recruiter) {
    if (slug === 'recruiter-privacy') return '/recruiter/privacy'
    if (slug === 'recruiter-terms') return '/recruiter/terms'
    if (slug === 'recruiter-support') return '/recruiter/support'
    return `/recruiter/policies/${slug}`
  }

  if (freelancer) {
    if (slug === 'freelancer-privacy') return '/freelancer/privacy'
    if (slug === 'freelancer-terms') return '/freelancer/terms'
    if (slug === 'freelancer-support') return '/freelancer/support'
    return `/freelancer/policies/${slug}`
  }

  if (slug === 'privacy') return '/privacy'
  if (slug === 'terms') return '/terms'
  if (slug === 'support') return '/support'
  return `/policies/${slug}`
}

function IconAction({ action, kind, label, onClick }) {
  const normalized = action || kind
  const config = getIconActionConfig(normalized)
  const Icon = config.icon

  return (
    <button aria-label={label} className={`grid h-8 w-8 place-items-center rounded-[7px] transition ${config.className}`} onClick={onClick} title={label} type="button">
      <Icon size={16} />
    </button>
  )
}

function getIconActionConfig(action = '') {
  const key = String(action).toLowerCase()
  if (['view', 'details', 'preview'].includes(key)) return { icon: Eye, className: 'bg-blue-50 text-blue-700 hover:bg-blue-100' }
  if (['edit'].includes(key)) return { icon: Pencil, className: 'bg-slate-100 text-slate-700 hover:bg-slate-200' }
  if (['delete'].includes(key)) return { icon: Trash2, className: 'bg-rose-50 text-rose-700 hover:bg-rose-100' }
  if (['approve', 'approved', 'active', 'account_verify'].includes(key)) return { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' }
  if (['reject', 'rejected'].includes(key)) return { icon: XCircle, className: 'bg-red-50 text-red-700 hover:bg-red-100' }
  if (['hold', 'suspend', 'suspended'].includes(key)) return { icon: PauseCircle, className: 'bg-amber-50 text-amber-700 hover:bg-amber-100' }
  if (['blocked', 'block'].includes(key)) return { icon: Ban, className: 'bg-orange-50 text-orange-700 hover:bg-orange-100' }
  return { icon: ShieldCheck, className: 'bg-teal-50 text-teal-700 hover:bg-teal-100' }
}

function RecruiterAccountActions({ canDelete = true, onAction, row }) {
  const authorisedBy = row.accountAuthorizedByName || row.accountAuthorizedByEmail

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <StatusActionSelect onChange={onAction} value={recruiterStatusOptions.includes(row.status) ? row.status : ''} />
        {canDelete ? <IconAction kind="delete" label="Delete" onClick={() => onAction('delete')} /> : null}
      </div>
      {authorisedBy && (
        <div className="rounded-[7px] bg-teal-50 px-3 py-2 text-xs font-bold leading-5 text-teal-700">
          Authorised by {row.accountAuthorizedByName || 'Account Team'}
          {row.accountAuthorizedByEmail ? <span className="block text-[11px] text-teal-600">{row.accountAuthorizedByEmail}</span> : null}
          {row.accountAuthorizedAt ? <span className="block text-[11px] text-teal-600">{formatDateTime(row.accountAuthorizedAt)}</span> : null}
        </div>
      )}
    </div>
  )
}

function RecruiterDocumentActions({ onAction, row = {} }) {
  const authorisedBy = row.reviewedByName || row.reviewedByEmail

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <StatusActionSelect onChange={onAction} value={recruiterStatusOptions.includes(row.status) ? row.status : ''} />
      </div>
      {authorisedBy && (
        <div className="rounded-[7px] bg-teal-50 px-3 py-2 text-xs font-bold leading-5 text-teal-700">
          Authorised by {row.reviewedByName || 'Account Team'}
          {row.reviewedByEmail ? <span className="block text-[11px] text-teal-600">{row.reviewedByEmail}</span> : null}
          {row.reviewedAt ? <span className="block text-[11px] text-teal-600">{formatDateTime(row.reviewedAt)}</span> : null}
        </div>
      )}
    </div>
  )
}

function StatusActionSelect({ onChange, value = '' }) {
  return (
    <select
      className="h-8 rounded-[7px] border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-500"
      onChange={(event) => {
        const next = event.target.value
        if (next) onChange(next)
      }}
      value={value}
    >
      <option value="">Action</option>
      {recruiterStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
    </select>
  )
}

const locationRoles = ['users', 'staff', 'recruiter', 'hiring', 'account team']

function LiveLocationDashboard() {
  const [roleFilter, setRoleFilter] = useState('')
  const [activeLocations, setActiveLocations] = useState([])
  const [history, setHistory] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [historyViewer, setHistoryViewer] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [adminLocation, setAdminLocation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useToastMessageState()

  const loadLocations = () => {
    const params = new URLSearchParams()
    if (roleFilter) params.set('role', roleFilter)

    setLoading(true)
    Promise.all([
      api.activeUserLocations(params.toString() ? `?${params.toString()}` : ''),
      api.userLocationHistory(`?limit=80${roleFilter ? `&role=${encodeURIComponent(roleFilter)}` : ''}`),
    ])
      .then(([activePayload, historyPayload]) => {
        const activeRows = activePayload.data || []
        setActiveLocations(activeRows)
        setHistory(historyPayload.data || [])
        setSelectedLocation((current) => {
          if (current && activeRows.some((row) => row._id === current._id)) return current
          return activeRows.find(hasCoordinates) || activeRows[0] || null
        })
        setMessage(activeRows.length || (historyPayload.data || []).length ? '' : 'No active location records yet.')
      })
      .catch((error) => {
        const detail = error.message || 'Live locations could not be loaded.'
        setMessage(detail.includes('Forbidden') ? 'Admin access allowed. Please refresh after backend restart.' : detail)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadLocations()
    const interval = window.setInterval(loadLocations, 30000)
    return () => window.clearInterval(interval)
  }, [roleFilter])

  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (position) => setAdminLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    )
  }, [])

  const selectedMapUrl = hasCoordinates(selectedLocation)
    ? `https://www.google.com/maps?q=${selectedLocation.latitude},${selectedLocation.longitude}&z=15&output=embed`
    : ''
  const directionsUrl = hasCoordinates(selectedLocation)
    ? adminLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${adminLocation.latitude},${adminLocation.longitude}&destination=${selectedLocation.latitude},${selectedLocation.longitude}&travelmode=driving`
      : `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.latitude},${selectedLocation.longitude}&travelmode=driving`
    : ''

  const deleteHistoryRecord = async () => {
    if (!deleteTarget?._id) return

    try {
      await api.removeUserLocation(deleteTarget._id)
      setDeleteTarget(null)
      loadLocations()
    } catch (error) {
      setMessage(error.message || 'Location history record could not be deleted.')
    }
  }

  return (
    <div className="grid gap-5">
      <Toolbar
        actionLabel="Refresh"
        onAction={loadLocations}
        onStatusChange={setRoleFilter}
        statusOptions={locationRoles}
        statusValue={roleFilter}
        subtitle="Track user, staff, recruiter, hiring, and account team live locations with 30 second refresh, marker details, directions, and history."
        title="Live Location Tracking"
      />

      {message && <p className={`rounded-[7px] p-4 text-sm font-bold ${message.includes('Forbidden') || message.includes('backend') || message.includes('could not') ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <AdminCard className="min-h-[32rem] overflow-hidden p-0">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-blue-600">Google Map View / Active Users</p>
              <h3 className="mt-1 text-xl font-black text-slate-950">{activeLocations.length} active users online</h3>
            </div>
            <span className="inline-flex items-center gap-2 rounded-[7px] bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">
              <RefreshCw size={14} /> Auto-refresh 30s
            </span>
          </div>

          <div className="relative min-h-[28rem] overflow-hidden bg-slate-950">
            {selectedMapUrl ? (
              <iframe className="absolute inset-0 h-full w-full opacity-60" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={selectedMapUrl} title="Selected user Google map" />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(0deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:48px_48px]" />
            )}
            <div className="absolute inset-0 bg-slate-950/35" />
            {activeLocations.filter(hasCoordinates).map((location, index, list) => {
              const point = getMarkerPosition(location, list)
              const selected = selectedLocation?._id === location._id
              return (
                <button
                  className={`absolute grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-xl ring-4 transition ${selected ? 'bg-blue-600 text-white ring-blue-200' : 'bg-white text-blue-700 ring-white/40 hover:bg-blue-50'}`}
                  key={location._id}
                  onClick={() => setSelectedLocation(location)}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                  title={`${location.name || location.email} - ${location.role}`}
                  type="button"
                >
                  <MapPin size={20} />
                </button>
              )
            })}
            {!activeLocations.some(hasCoordinates) && (
              <div className="absolute inset-0 grid place-items-center p-6 text-center text-sm font-black text-white">
                {loading ? 'Loading live locations...' : 'Location permission required'}
              </div>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Marker Details</p>
          {selectedLocation ? (
            <div className="mt-4 grid gap-3">
              <div className="rounded-[7px] bg-blue-50 p-4">
                <h3 className="text-xl font-black text-slate-950">{selectedLocation.name || 'User'}</h3>
                <p className="mt-1 text-sm font-bold text-blue-700">{selectedLocation.role || 'Role'} / {selectedLocation.locationStatus || 'allowed'}</p>
              </div>
              <LocationInfo icon={Phone} label="Mobile" value={selectedLocation.phone || 'Not added'} />
              <LocationInfo icon={Navigation} label="IP Address" value={selectedLocation.ipAddress || 'Not captured'} />
              <LocationInfo icon={Clock} label="Login Time" value={selectedLocation.loginTime ? formatDateTime(selectedLocation.loginTime) : 'Not added'} />
              <LocationInfo icon={MapPin} label="Current Location" value={hasCoordinates(selectedLocation) ? `${Number(selectedLocation.latitude).toFixed(6)}, ${Number(selectedLocation.longitude).toFixed(6)}` : 'Location permission required'} />
              <LocationInfo icon={Navigation} label="Device" value={selectedLocation.deviceInfo || 'Not captured'} />
              {directionsUrl && (
                <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-100" href={directionsUrl} rel="noreferrer" target="_blank">
                  <Route size={17} /> Direction from admin location
                </a>
              )}
            </div>
          ) : (
            <p className="mt-4 rounded-[7px] bg-rose-50 p-4 text-sm font-black text-rose-700">Location permission required</p>
          )}
        </AdminCard>
      </div>

      <AdminCard className="overflow-hidden p-0">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-blue-600">Location History Report</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Recent location pings</h3>
          </div>
          <StatusBadge status={roleFilter || 'All Roles'} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Name', 'Role', 'Mobile', 'IP Address', 'Login Time', 'Latitude', 'Longitude', 'Status', 'Tracked', 'Actions'].map((label) => <th className="whitespace-nowrap px-5 py-4 font-bold" key={label}>{label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((row) => (
                <tr className="hover:bg-blue-50/40" key={row._id}>
                  <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">{row.name || row.email || '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={row.role || '-'} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.phone || '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.ipAddress || '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.loginTime ? formatDateTime(row.loginTime) : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{Number.isFinite(Number(row.latitude)) ? Number(row.latitude).toFixed(6) : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{Number.isFinite(Number(row.longitude)) ? Number(row.longitude).toFixed(6) : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={row.locationStatus || 'allowed'} /></td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">{row.trackedAt ? formatDateTime(row.trackedAt) : '-'}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button aria-label="View location history" className="grid h-8 w-8 place-items-center rounded-[7px] bg-blue-50 text-blue-700 transition hover:bg-blue-100" onClick={() => setHistoryViewer(row)} title="View" type="button">
                        <Eye size={16} />
                      </button>
                      <button aria-label="Delete location history" className="grid h-8 w-8 place-items-center rounded-[7px] bg-rose-50 text-rose-700 transition hover:bg-rose-100" onClick={() => setDeleteTarget(row)} title="Delete" type="button">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <LocationHistoryViewerModal onClose={() => setHistoryViewer(null)} row={historyViewer} />
      <ConfirmDialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} onConfirm={deleteHistoryRecord} />
    </div>
  )
}

function LocationInfo({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[7px] bg-slate-50 p-3">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><Icon size={14} /> {label}</p>
      <p className="mt-1 break-words text-sm font-black text-slate-800">{value}</p>
    </div>
  )
}

function LocationHistoryViewerModal({ onClose, row }) {
  return (
    <AdminModal open={Boolean(row)} title="Location details" onClose={onClose}>
      {row && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileLine label="Name" value={row.name || '-'} />
          <ProfileLine label="Email" value={row.email || '-'} />
          <ProfileLine label="Role" value={row.role || '-'} />
          <ProfileLine label="Mobile" value={row.phone || '-'} />
          <ProfileLine label="IP Address" value={row.ipAddress || '-'} />
          <ProfileLine label="Login Time" value={row.loginTime ? formatDateTime(row.loginTime) : '-'} />
          <ProfileLine label="Location Status" value={row.locationStatus || '-'} />
          <ProfileLine label="Latitude" value={Number.isFinite(Number(row.latitude)) ? Number(row.latitude).toFixed(6) : '-'} />
          <ProfileLine label="Longitude" value={Number.isFinite(Number(row.longitude)) ? Number(row.longitude).toFixed(6) : '-'} />
          <ProfileLine label="Accuracy" value={Number.isFinite(Number(row.accuracy)) ? `${Math.round(Number(row.accuracy))} m` : '-'} />
          <ProfileLine label="Tracked" value={row.trackedAt ? formatDateTime(row.trackedAt) : '-'} />
          <ProfileLine label="Device" value={row.deviceInfo || '-'} />
          <ProfileLine label="Map" value={row.mapsUrl || '-'} />
        </div>
      )}
    </AdminModal>
  )
}

function hasCoordinates(location) {
  return Number.isFinite(Number(location?.latitude)) && Number.isFinite(Number(location?.longitude))
}

function getMarkerPosition(location, locations) {
  const latitudes = locations.map((item) => Number(item.latitude)).filter(Number.isFinite)
  const longitudes = locations.map((item) => Number(item.longitude)).filter(Number.isFinite)
  const minLat = Math.min(...latitudes)
  const maxLat = Math.max(...latitudes)
  const minLon = Math.min(...longitudes)
  const maxLon = Math.max(...longitudes)
  const latRange = maxLat - minLat || 1
  const lonRange = maxLon - minLon || 1

  return {
    x: 12 + ((Number(location.longitude) - minLon) / lonRange) * 76,
    y: 88 - ((Number(location.latitude) - minLat) / latRange) * 76,
  }
}

function UserViewerModal({ onClose, row }) {
  return (
    <AdminModal open={Boolean(row)} title="User details" onClose={onClose}>
      {row && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileLine label="Name" value={row.name || '-'} />
          <ProfileLine label="Email" value={row.email || '-'} />
          <ProfileLine label="Role" value={row.role || '-'} />
          <ProfileLine label="Status" value={row.status || '-'} />
          <ProfileLine label="User ID" value={row._id || row.id || '-'} />
          <ProfileLine label="Created" value={row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'} />
        </div>
      )}
    </AdminModal>
  )
}

function ApplicationViewerModal({ onClose, row }) {
  return (
    <AdminModal open={Boolean(row)} title="Application details" onClose={onClose}>
      {row && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileLine label="Candidate" value={row.candidateName || '-'} />
          <ProfileLine label="Candidate email" value={row.candidateEmail || '-'} />
          <ProfileLine label="Job" value={row.jobTitle || '-'} />
          <ProfileLine label="Company" value={row.company || '-'} />
          <ProfileLine label="Status" value={row.status || '-'} />
          <ProfileLine label="Application ID" value={row._id || row.id || '-'} />
          <ProfileLine label="Created" value={row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'} />
          <ProfileLine label="Recruiter note" value={row.coverNote || '-'} />
        </div>
      )}
    </AdminModal>
  )
}

function CompanyViewerModal({ onClose, row }) {
  return (
    <AdminModal open={Boolean(row)} title="Company details" onClose={onClose}>
      {row && (
        <div className="grid gap-3 sm:grid-cols-2">
          <ProfileLine label="Company ID" value={row._id || row.id || '-'} />
          <ProfileLine label="Company" value={row.name || '-'} />
          <ProfileLine label="Contact person" value={row.contactPerson || '-'} />
          <ProfileLine label="Contact number" value={row.contactNumber || '-'} />
          <ProfileLine label="Contact email" value={row.contactEmail || '-'} />
          <ProfileLine label="GST no" value={row.gstNumber || '-'} />
          <ProfileLine label="Industry" value={row.industry || '-'} />
          <ProfileLine label="Status" value={row.status || '-'} />
          <ProfileLine label="Open jobs" value={row.jobs ?? row.openJobs ?? 0} />
          <ProfileLine label="Website" value={row.website || '-'} />
          <ProfileLine label="Location" value={row.location || '-'} />
          <ProfileLine label="Address" value={row.address || '-'} />
          <ProfileLine label="Documents" value={row.documents || '-'} />
          <ProfileLine label="Plan" value={row.plan || '-'} />
          <ProfileLine label="Created" value={row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'} />
        </div>
      )}
    </AdminModal>
  )
}

function JobReviewActions({ onAction }) {
  return (
    <div className="flex flex-wrap gap-2">
      <IconAction action="active" label="Active" onClick={() => onAction('active')} />
      <IconAction action="reject" label="Reject" onClick={() => onAction('reject')} />
    </div>
  )
}

function JobGroupActions({ onView }) {
  return (
    <IconAction kind="view" label="View details" onClick={onView} />
  )
}

function PostedJobApprovalActions({ onAction }) {
  return (
    <select
      className="h-10 min-w-36 rounded-[7px] border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-500"
      defaultValue=""
      onChange={(event) => {
        const action = event.target.value
        if (action) onAction(action)
        event.target.value = ''
      }}
    >
      <option value="">Choose action</option>
      {postedJobReviewActions.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
    </select>
  )
}

function AccountActionViewerModal({ onClose, row }) {
  if (!row) return null

  return (
    <AdminModal open={Boolean(row)} title="Recruiter account action" onClose={onClose}>
      <div className="grid gap-3">
        <ProfileLine label="Recruiter" value={row.companyName || 'Recruiter'} />
        <ProfileLine label="Business email" value={row.businessEmail || 'Not added'} />
        <ProfileLine label="Action" value={row.accountAuthorizedAction || row.status || 'No action recorded'} />
        <ProfileLine label="Authorised by" value={row.accountAuthorizedByName || 'Not added'} />
        <ProfileLine label="Authoriser email" value={row.accountAuthorizedByEmail || 'Not added'} />
        <ProfileLine label="Action time" value={row.accountAuthorizedAt ? formatDateTime(row.accountAuthorizedAt) : 'Not added'} />
        <div className="rounded-[7px] bg-rose-50 p-5 text-sm font-semibold leading-7 text-rose-800">
          <span className="font-black">Remark:</span> {row.accountAuthorizedRemark || 'No remark added for this action.'}
        </div>
      </div>
    </AdminModal>
  )
}

function DocumentViewerModal({ onClose, row }) {
  if (!row) return null

  const documents = [
    ['PAN Card', row.panDocument],
    ['GST Certificate', row.gstDocument],
    ['Offer Letter', row.offerLetter],
    ['Aadhar Card', row.aadhaarDocument],
  ].filter(([, value]) => Boolean(value))

  return (
    <AdminModal open={Boolean(row)} title="Uploaded recruiter documents" onClose={onClose}>
      <div className="grid gap-3 text-sm">
        <div className="rounded-[7px] bg-slate-50 p-4">
          <p className="font-black text-slate-950">{row.recruiterName || 'Recruiter'}</p>
          <p className="mt-1 font-semibold text-slate-500">{row.recruiterEmail}</p>
        </div>
        {(row.reviewedByName || row.reviewedByEmail || row.reviewedAt || row.remark) && (
          <div className="grid gap-3 rounded-[7px] bg-teal-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-teal-700">Authorised action</p>
            <ProfileLine label="Action" value={row.reviewedAction || row.status || 'No action recorded'} />
            <ProfileLine label="Authorised by" value={row.reviewedByName || 'Not added'} />
            <ProfileLine label="Authoriser email" value={row.reviewedByEmail || 'Not added'} />
            <ProfileLine label="Action time" value={row.reviewedAt ? formatDateTime(row.reviewedAt) : 'Not added'} />
            <div className="rounded-[7px] bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
              <span className="font-black">Remark:</span> {row.remark || 'No remark added for this action.'}
            </div>
          </div>
        )}
        {documents.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 rounded-[7px] border border-slate-200 bg-white p-3" key={label}>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 font-bold text-slate-700">PDF uploaded</p>
            </div>
            {isDocumentUrl(value) && (
              <a className="rounded-[7px] bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700" href={value} rel="noreferrer" target="_blank">Open PDF</a>
            )}
          </div>
        ))}
      </div>
    </AdminModal>
  )
}

function RemarkViewerModal({ onClose, remark }) {
  if (!remark) return null

  return (
    <AdminModal open={Boolean(remark)} title={`${remark.status || 'Document'} remark`} onClose={onClose}>
      <div className="rounded-[7px] bg-rose-50 p-5 text-sm font-semibold leading-7 text-rose-800">
        {remark.remark}
      </div>
    </AdminModal>
  )
}

const postedJobReviewActions = [
  { label: 'Approved', value: 'approve' },
  { label: 'Rejected', value: 'reject' },
  { label: 'Hold', value: 'hold' },
  { label: 'Removed', value: 'remove' },
]

export function RecruiterDetailPage() {
  const user = getStoredAdminUser()
  const allowedTypes = accessByRole[user?.role] || accessByRole.Admin
  if (!allowedTypes.includes('employers')) return <Navigate replace to="/admin" />
  return <RecruiterDetailContent />
}

function RecruiterDetailContent() {
  const user = getStoredAdminUser()
  const { recruiterId } = useParams()
  const [recruiter, setRecruiter] = useState(null)
  const [recruiterUser, setRecruiterUser] = useState(null)
  const [jobs, setJobs] = useState([])
  const [applications, setApplications] = useState([])
  const [documents, setDocuments] = useState([])
  const [subscription, setSubscription] = useState(null)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobReviewAction, setJobReviewAction] = useState(null)
  const [jobReviewRemark, setJobReviewRemark] = useState('')
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const loadRecruiter = async () => {
      setLoading(true)
      setMessage('')

      try {
        const recruiterPayload = await api.get('employers', recruiterId)
        const nextRecruiter = recruiterPayload.data
        const email = nextRecruiter?.businessEmail || ''

        const [jobsPayload, applicationsPayload, documentsPayload, packagePayload, usersPayload] = await Promise.all([
          api.list('jobs', `?includeAll=true&recruiterEmail=${encodeURIComponent(email)}&sort=-createdAt&limit=100`).catch(() => ({ data: [] })),
          api.list('applications', `?recruiterEmail=${encodeURIComponent(email)}&sort=-createdAt&limit=100`).catch(() => ({ data: [] })),
          api.list('recruiter-documents', `?recruiterEmail=${encodeURIComponent(email)}&sort=-updatedAt&limit=100`).catch(() => ({ data: [] })),
          api.currentRecruiterPackage(email).catch(() => ({ data: null })),
          api.list('users', `?role=recruiter&search=${encodeURIComponent(email)}`).catch(() => ({ data: [] })),
        ])
        const matchedRecruiterUser = (usersPayload.data || []).find((item) => item.email?.toLowerCase() === email.toLowerCase()) || null

        if (!mounted) return
        setRecruiter(nextRecruiter)
        setRecruiterUser(matchedRecruiterUser)
        setJobs(jobsPayload.data || [])
        setApplications(applicationsPayload.data || [])
        setDocuments(documentsPayload.data || [])
        setSubscription(packagePayload.data || null)
      } catch (error) {
        if (mounted) setMessage(error.message)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    loadRecruiter()

    return () => {
      mounted = false
    }
  }, [recruiterId])

  const activeJobs = jobs.filter((job) => job.accountDepartmentStatus === 'Active' || job.approval === 'Approved').length
  const pendingJobs = jobs.filter((job) => job.accountDepartmentStatus === 'Pending' || job.approval === 'Pending').length
  const rejectedJobs = jobs.filter((job) => job.accountDepartmentStatus === 'Rejected' || job.approval === 'Rejected').length
  const totalViews = jobs.reduce((sum, job) => sum + Number(job.views || 0), 0)
  const uniqueCandidates = new Set(applications.map((item) => item.candidateEmail).filter(Boolean).map((email) => email.toLowerCase())).size
  const latestDocument = documents[0]
  const canReviewJobs = ['Admin', 'account team'].includes(user?.role)

  const applyPostedJobAction = async (job, action, remark = '') => {
    const reviewer = getStoredAdminUser() || {}
    const statusMap = {
      approve: { accountDepartmentStatus: 'Active', approval: 'Approved', status: 'Active', message: 'Job approved successfully.' },
      reject: { accountDepartmentStatus: 'Rejected', approval: 'Rejected', status: 'Closed', message: 'Job rejected successfully.' },
      hold: { accountDepartmentStatus: 'Hold', approval: 'Hold', status: 'Closed', message: 'Job moved to hold.' },
      remove: { accountDepartmentStatus: 'Removed', approval: 'Removed', status: 'Closed', message: 'Job removed from approval.' },
    }
    const next = statusMap[action]
    if (!job?._id || !next) return

    const payload = {
      ...next,
      accountDepartmentRemark: action === 'approve' ? '' : remark,
      jobAuthorizedByName: reviewer.name || 'Account Team',
      jobAuthorizedByEmail: reviewer.email || '',
      jobAuthorizedAction: next.approval,
      jobAuthorizedRemark: action === 'approve' ? '' : remark,
      jobAuthorizedAt: new Date().toISOString(),
    }

    try {
      const response = await api.update('jobs', job._id, payload)
      const updatedJob = response.data || { ...job, ...payload }
      setJobs((current) => current.map((item) => (item._id === job._id ? updatedJob : item)))
      setSelectedJob((current) => (current?._id === job._id ? updatedJob : current))
      setMessage(`${next.message} Authorised by ${payload.jobAuthorizedByName}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  const selectPostedJobAction = (job, action) => {
    if (['reject', 'hold', 'remove'].includes(action)) {
      setJobReviewAction({ job, action })
      setJobReviewRemark('')
      return
    }

    applyPostedJobAction(job, action)
  }

  const submitPostedJobRemark = () => {
    if (!jobReviewAction) return

    if (!jobReviewRemark.trim()) {
      setMessage('Remark is required for reject, hold, and remove actions.')
      return
    }

    applyPostedJobAction(jobReviewAction.job, jobReviewAction.action, jobReviewRemark.trim())
    setJobReviewAction(null)
    setJobReviewRemark('')
  }

  return (
    <div className="grid max-w-full gap-5 overflow-x-hidden">
      <div className="min-w-0 rounded-[7px] bg-gradient-to-br from-blue-600 to-teal-500 p-6 text-white shadow-xl shadow-blue-100">
        <p className="text-sm font-black uppercase tracking-wide text-blue-100">Recruiter profile</p>
        <h1 className="mt-2 break-words text-3xl font-black">{recruiter?.companyName || 'Recruiter'}</h1>
        <p className="mt-2 break-words font-semibold text-blue-50">{getShortId(recruiter?._id)} / {recruiter?.businessEmail || 'Email not available'} / {recruiter?.location || 'Location not added'}</p>
      </div>

      {message && <p className="rounded-[7px] bg-rose-50 p-4 text-sm font-bold text-rose-700">{message}</p>}
      {loading ? (
        <AdminCard><p className="text-sm font-bold text-slate-500">Loading recruiter full details...</p></AdminCard>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RecruiterMetric label="Total Jobs" value={jobs.length} />
            <RecruiterMetric label="Active Jobs" value={activeJobs} />
            <RecruiterMetric label="Pending Jobs" value={pendingJobs} />
            <RecruiterMetric label="Rejected Jobs" value={rejectedJobs} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RecruiterMetric label="Candidates Arrived" value={uniqueCandidates} />
            <RecruiterMetric label="Candidate Clicks" value={totalViews} />
            <RecruiterMetric label="Applications" value={applications.length} />
            <RecruiterMetric label="Wallet Balance" value={`${subscription?.coinBalance || 0} coins`} />
          </div>

          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="grid min-w-0 gap-5">
              <AdminCard className="min-w-0 overflow-hidden">
                <h2 className="text-xl font-black text-slate-950">Posted Jobs</h2>
                {jobs.length ? (
                  <div className="mt-4 max-w-full overflow-x-auto rounded-[7px] border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        <tr>
                          {['Sr No', 'Job ID', 'Job Title', 'Company', 'Department', 'Location', 'Type', 'Work Mode', 'Account Status', 'Approval', 'Actions', 'Authorised By', 'Remark', 'Created'].map((label) => (
                            <th className="whitespace-nowrap px-4 py-3 font-black" key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobs.map((job, index) => (
                          <tr className="cursor-pointer transition hover:bg-blue-50/60" key={job._id} onClick={() => setSelectedJob(job)}>
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-600">#{index + 1}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-bold text-slate-600">{getShortId(job._id)}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-black text-slate-900">{job.title}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.company}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.department || 'Not added'}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.location}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.type || 'Not added'}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.workMode || 'Not added'}</td>
                            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={job.accountDepartmentStatus || 'Pending'} /></td>
                            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={job.approval || 'Pending'} /></td>
                            <td className="whitespace-nowrap px-4 py-3" onClick={(event) => event.stopPropagation()}>
                              {canReviewJobs ? <PostedJobApprovalActions onAction={(action) => selectPostedJobAction(job, action)} /> : '-'}
                            </td>
                            <td className="px-4 py-3">{renderJobAuthorisedBy(job)}</td>
                            <td className="max-w-[240px] truncate px-4 py-3 font-semibold text-rose-700">{job.accountDepartmentRemark || '-'}</td>
                            <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-600">{job.createdAt ? new Date(job.createdAt).toLocaleDateString() : 'Not added'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="mt-4 rounded-[7px] bg-slate-50 p-4 text-sm font-bold text-slate-500">No jobs posted yet.</p>}
              </AdminCard>

              <AdminCard className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">Candidate Activity</h2>
                <div className="mt-4 grid gap-3">
                  {applications.length ? applications.map((application) => (
                    <div className="grid gap-3 rounded-[7px] bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center" key={application._id}>
                      <div>
                        <p className="font-black text-slate-950">{application.candidateName}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{application.jobTitle} / {application.candidateEmail}</p>
                      </div>
                      <StatusBadge status={application.status || 'New'} />
                    </div>
                  )) : <p className="rounded-[7px] bg-slate-50 p-4 text-sm font-bold text-slate-500">No candidate activity yet.</p>}
                </div>
              </AdminCard>
            </div>

            <div className="grid h-max min-w-0 gap-5">
              <AdminCard className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">Package & Wallet</h2>
                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
                  <ProfileLine label="Package" value={subscription?.packageSnapshot?.name || 'No active package'} />
                  <ProfileLine label="Price" value={subscription?.packageSnapshot?.price || 'Not available'} />
                  <ProfileLine label="Wallet balance" value={`${subscription?.coinBalance || 0} coins`} />
                  <ProfileLine label="Jobs used" value={`${subscription?.jobsUsed || 0} / ${subscription?.packageSnapshot?.jobLimit || 0}`} />
                  <ProfileLine label="Valid till" value={subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'Not available'} />
                </div>
              </AdminCard>

              <AdminCard className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">Full Profile</h2>
                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
                  <ProfileLine label="Recruiter ID" value={getShortId(recruiterUser?._id || recruiter?.recruiterUserId || recruiter?._id)} />
                  <ProfileLine label="Profile ID" value={getShortId(recruiter?._id)} />
                  <ProfileLine label="Company" value={recruiter?.companyName || 'Not added'} />
                  <ProfileLine label="Email" value={recruiter?.businessEmail || 'Not added'} />
                  <ProfileLine label="Phone" value={recruiter?.phone || 'Not added'} />
                  <ProfileLine label="Industry" value={recruiter?.industry || 'Not added'} />
                  <ProfileLine label="Company size" value={recruiter?.companySize || 'Not added'} />
                  <ProfileLine label="Website" value={recruiter?.website || 'Not added'} />
                  <ProfileLine label="Status" value={recruiter?.status || 'Pending'} />
                  <ProfileLine label="User status" value={recruiterUser?.status || 'Not available'} />
                  <ProfileLine label="Document status" value={latestDocument?.status || 'Not submitted'} />
                </div>
              </AdminCard>

              <AdminCard className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">Account Action</h2>
                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
                  <ProfileLine label="Action" value={recruiter?.accountAuthorizedAction || recruiter?.status || 'No action recorded'} />
                  <ProfileLine label="Authorised by" value={recruiter?.accountAuthorizedByName || 'Not added'} />
                  <ProfileLine label="Authoriser email" value={recruiter?.accountAuthorizedByEmail || 'Not added'} />
                  <ProfileLine label="Action time" value={recruiter?.accountAuthorizedAt ? formatDateTime(recruiter.accountAuthorizedAt) : 'Not added'} />
                  <div className="rounded-[7px] bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">
                    <span className="font-black">Remark:</span> {recruiter?.accountAuthorizedRemark || 'No remark added for this action.'}
                  </div>
                </div>
              </AdminCard>

              <AdminCard className="min-w-0">
                <h2 className="text-xl font-black text-slate-950">Job Summary</h2>
                <div className="mt-4 grid gap-3 text-sm font-bold text-slate-700">
                  <ProfileLine label="Active jobs" value={activeJobs} />
                  <ProfileLine label="Pending jobs" value={pendingJobs} />
                  <ProfileLine label="Rejected jobs" value={rejectedJobs} />
                  <ProfileLine label="Total applications" value={applications.length} />
                </div>
              </AdminCard>
            </div>
          </div>
          <AdminModal open={Boolean(jobReviewAction)} title="Add job approval remark" onClose={() => setJobReviewAction(null)}>
            <p className="text-sm leading-6 text-slate-500">This remark will be saved with the job approval action and shown in job view details.</p>
            <textarea className="input mt-4 min-h-32" onChange={(event) => setJobReviewRemark(event.target.value)} placeholder="Write reason or next steps for recruiter" value={jobReviewRemark} />
            <div className="mt-5 flex justify-end gap-2">
              <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={() => setJobReviewAction(null)} type="button">Cancel</button>
              <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={submitPostedJobRemark} type="button">Save Remark</button>
            </div>
          </AdminModal>
          <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
        </>
      )}
    </div>
  )
}

export function SupportMessageDetailPage() {
  const { messageId } = useParams()
  const [ticket, setTicket] = useState(null)
  const [reply, setReply] = useState('')
  const [status, setStatus] = useState('Open')
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(Date.now())

  const loadTicket = () => {
    setLoading(true)
    api
      .get('support-messages', messageId)
      .then((payload) => {
        const data = normalizeSupportTicket(payload.data || {})
        setTicket(data)
        setStatus(data.status || 'Open')
        setMessage('')
      })
      .catch((error) => setMessage(error.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTicket()
  }, [messageId])

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const sessionEndsAt = ticket?.sessionEndsAt ? new Date(ticket.sessionEndsAt).getTime() : 0
  const isSessionClosed = ['Closed', 'Resolved'].includes(ticket?.status)
  const sessionExpired = Boolean(ticket && sessionEndsAt && now >= sessionEndsAt && !isSessionClosed)
  const remainingSeconds = sessionEndsAt ? Math.max(0, Math.ceil((sessionEndsAt - now) / 1000)) : 0

  useEffect(() => {
    if (!sessionExpired || !ticket?._id) return

    const closeExpiredTicket = async () => {
      try {
        const chatMessages = [
          ...getSupportChatMessages(ticket),
          { sender: 'system', text: 'Session ended automatically because user did not respond within 10 minutes.', sentAt: new Date().toISOString() },
        ]
        await api.update('support-messages', ticket._id, {
          status: 'Closed',
          endedReason: 'No user response within 10 minutes.',
          chatMessages,
        })
        setTicket((current) => current ? { ...current, status: 'Closed', endedReason: 'No user response within 10 minutes.', chatMessages } : current)
        setStatus('Closed')
      } catch (error) {
        setMessage(error.message)
      }
    }

    closeExpiredTicket()
  }, [sessionExpired, ticket?._id])

  const sendReply = async () => {
    const text = reply.trim()
    if (!text || !ticket?._id || isSessionClosed) return

    const chatMessages = [
      ...getSupportChatMessages(ticket),
      { sender: 'admin', text, sentAt: new Date().toISOString() },
    ]

    try {
      const payload = await api.update('support-messages', ticket._id, {
        adminReply: text,
        status: status === 'Open' ? 'In Progress' : status,
        chatMessages,
      })
      setTicket(normalizeSupportTicket(payload.data || {}))
      setStatus(payload.data?.status || 'In Progress')
      setReply('')
      setMessage('Reply saved. Waiting for user response.')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const updateTicketStatus = async (nextStatus) => {
    if (!ticket?._id) return

    try {
      const payload = await api.update('support-messages', ticket._id, { status: nextStatus })
      setTicket(normalizeSupportTicket(payload.data || {}))
      setStatus(nextStatus)
      setMessage(`Ticket marked as ${nextStatus}.`)
    } catch (error) {
      setMessage(error.message)
    }
  }

  if (loading) return <LoadingSkeleton />
  if (!ticket) return <EmptyAdminState title={message || 'Support message not found'} />

  return (
    <div className="mx-auto grid max-w-6xl gap-5">
      <section className="rounded-[7px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-teal-50 p-5 shadow-xl shadow-blue-100/50 sm:p-7">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Customer Care Session</p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{ticket.subject || 'Support chat'}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-500">
              {ticket.name || 'Guest User'} / {ticket.email || 'No email'} / {ticket.role || 'Guest'} / {formatDateTime(ticket.createdAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={ticket.status || 'Open'} />
            {!isSessionClosed && (
              <span className="rounded-[7px] bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                Session ends in {formatCountdown(remainingSeconds)}
              </span>
            )}
          </div>
        </div>
      </section>

      {message && <p className="rounded-[7px] bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <AdminCard className="min-h-[560px] min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">Live Chat Box</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Admin and user conversation history</p>
            </div>
            <button className="rounded-[7px] bg-slate-100 px-4 py-2 text-xs font-black text-slate-600" onClick={loadTicket} type="button">Refresh</button>
          </div>

          <div className="mt-5 grid max-h-[420px] gap-3 overflow-y-auto rounded-[7px] bg-slate-50 p-4">
            {getSupportChatMessages(ticket).map((item, index) => (
              <div
                className={`max-w-[82%] rounded-[7px] p-4 text-sm font-semibold leading-6 shadow-sm ${
                  item.sender === 'admin'
                    ? 'ml-auto rounded-t-[7px]r-md bg-blue-600 text-white'
                    : item.sender === 'system'
                      ? 'mx-auto bg-amber-50 text-amber-700'
                      : 'rounded-t-[7px]l-md bg-white text-slate-700'
                }`}
                key={`${item.sender}-${item.sentAt}-${index}`}
              >
                <p>{item.text}</p>
                <p className={`mt-2 text-[11px] font-black uppercase ${item.sender === 'admin' ? 'text-blue-100' : 'text-slate-400'}`}>{formatDateTime(item.sentAt)}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <textarea
              className="input min-h-28"
              disabled={isSessionClosed}
              onChange={(event) => setReply(event.target.value)}
              placeholder={isSessionClosed ? 'Session ended' : 'Type admin reply'}
              value={reply}
            />
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <p className="text-xs font-semibold text-slate-500">Saving a reply moves the ticket to In Progress. If the user does not respond, the session closes automatically after 10 minutes.</p>
              <button className="rounded-[7px] bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-50" disabled={!reply.trim() || isSessionClosed} onClick={sendReply} type="button">
                Send Reply
              </button>
            </div>
          </div>
        </AdminCard>

        <div className="grid h-max gap-5">
          <AdminCard>
            <h3 className="text-lg font-black text-slate-950">Session Control</h3>
            <div className="mt-4 grid gap-3">
              <select className="input" onChange={(event) => setStatus(event.target.value)} value={status}>
                {fieldOptions.supportStatus.map((option) => <option key={option}>{option}</option>)}
              </select>
              <button className="rounded-[7px] bg-slate-900 px-5 py-3 text-sm font-black text-white" onClick={() => updateTicketStatus(status)} type="button">Update Status</button>
              <button className="rounded-[7px] bg-teal-50 px-5 py-3 text-sm font-black text-teal-700" onClick={() => updateTicketStatus('Resolved')} type="button">Mark Resolved</button>
              <button className="rounded-[7px] bg-rose-50 px-5 py-3 text-sm font-black text-rose-700" onClick={() => updateTicketStatus('Closed')} type="button">End Session</button>
            </div>
          </AdminCard>
          <AdminCard>
            <h3 className="text-lg font-black text-slate-950">Customer Details</h3>
            <div className="mt-4 grid gap-3">
              <ProfileLine label="Name" value={ticket.name || 'Guest User'} />
              <ProfileLine label="Email" value={ticket.email || 'No email'} />
              <ProfileLine label="Role" value={ticket.role || 'Guest'} />
              <ProfileLine label="Source" value={ticket.source || 'support-chat'} />
              <ProfileLine label="Ended reason" value={ticket.endedReason || '-'} />
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}

function JobDetailModal({ job, onClose }) {
  if (!job) return null

  const fields = [
    ['Job ID', getShortId(job._id)],
    ['Recruiter ID', job.recruiterId || 'Not added'],
    ['Title', job.title],
    ['Company', job.company],
    ['Recruiter email', job.recruiterEmail || 'Not added'],
    ['Department', job.department || 'Not added'],
    ['Industry', job.industry || 'Not added'],
    ['Location', job.location || 'Not added'],
    ['Country', job.country || 'Not added'],
    ['State', job.state || 'Not added'],
    ['City', job.city || 'Not added'],
    ['Office address', job.officeAddress || 'Not added'],
    ['Interview address', job.interviewAddress || 'Not added'],
    ['Salary', job.salary || 'Not disclosed'],
    ['Experience', job.experience || 'Not added'],
    ['Job type', job.type || 'Not added'],
    ['Work mode', job.workMode || 'Not added'],
    ['Posted', job.posted || 'Not added'],
    ['Deadline', job.deadline || 'Not added'],
    ['Package', job.packageName || 'Not added'],
    ['Account status', job.accountDepartmentStatus || 'Pending'],
    ['Approval', job.approval || 'Pending'],
    ['Public status', job.status || 'Open'],
    ['Authorised by', job.jobAuthorizedByName || 'Not added'],
    ['Authoriser email', job.jobAuthorizedByEmail || 'Not added'],
    ['Authorised action', job.jobAuthorizedAction || 'Not added'],
    ['Authorised time', job.jobAuthorizedAt ? formatDateTime(job.jobAuthorizedAt) : 'Not added'],
    ['Applications', job.applicationsCount || 0],
    ['Candidate clicks', job.views || 0],
    ['Created', job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Not added'],
  ]

  return (
    <AdminModal open={Boolean(job)} title="Job full details" onClose={onClose}>
      <div className="rounded-[7px] bg-blue-50 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Selected job</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">{job.title}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">{job.company} / {job.location}</p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {fields.map(([label, value]) => (
          <ProfileLine key={label} label={label} value={value} />
        ))}
      </div>

      {(job.accountDepartmentRemark || job.jobAuthorizedRemark) && (
        <div className="mt-5 rounded-[7px] bg-rose-50 p-4 text-sm font-semibold leading-6 text-rose-800">
          <span className="font-black">Approval remark:</span> {job.jobAuthorizedRemark || job.accountDepartmentRemark}
        </div>
      )}

      <div className="mt-5 grid gap-4">
        <JobLongField label="Skills" value={Array.isArray(job.skills) ? job.skills.join(', ') : job.skills} />
        <JobLongField label="Description" value={job.description} />
        <JobLongField label="Responsibilities" value={Array.isArray(job.responsibilities) ? job.responsibilities.join('\n') : job.responsibilities} />
        <JobLongField label="Requirements" value={Array.isArray(job.requirements) ? job.requirements.join('\n') : job.requirements} />
        <JobLongField label="Benefits" value={Array.isArray(job.benefits) ? job.benefits.join('\n') : job.benefits} />
        <JobLongField label="About company" value={job.aboutCompany} />
      </div>
    </AdminModal>
  )
}

function JobLongField({ label, value }) {
  return (
    <div className="rounded-[7px] bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-6 text-slate-700">{value || 'Not added'}</p>
    </div>
  )
}

function RecruiterMetric({ label, value }) {
  return (
    <AdminCard>
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </AdminCard>
  )
}

function ProfileLine({ label, value }) {
  return (
    <div className="rounded-[7px] bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-slate-800">{value}</p>
    </div>
  )
}

function getPaymentTotalFee(payment = {}) {
  const amount = String(payment.amount || '').trim()
  if (!amount) return `${payment.currency || 'INR'} 0`
  if (/^(inr|rs\.?|₹)/i.test(amount)) return amount
  return `${payment.currency || 'INR'} ${amount}`
}

function getPaymentExportRows(payment = {}, recruiter = {}) {
  return [
    ['Invoice', payment.invoiceNo || 'Not added'],
    ['Recruiter', payment.employer || recruiter.companyName || 'Not added'],
    ['Contact person', recruiter.contactPerson || 'Not added'],
    ['Customer email', payment.recruiterEmail || recruiter.businessEmail || 'Not added'],
    ['Phone', recruiter.phone || 'Not added'],
    ['Company', recruiter.companyName || payment.employer || 'Not added'],
    ['Plan', payment.plan || 'Not added'],
    ['Total fee', getPaymentTotalFee(payment)],
    ['Status', payment.status || 'Pending'],
    ['Gateway', payment.gateway || 'Not added'],
    ['Payment method', payment.paymentMethod || 'Not added'],
    ['Purpose', payment.purpose || 'Not added'],
    ['Coins', payment.coins || 0],
    ['Razorpay order ID', payment.razorpayOrderId || 'Not added'],
    ['Razorpay payment ID', payment.razorpayPaymentId || 'Not added'],
    ['Paid at', payment.paidAt ? formatDateTime(payment.paidAt) : 'Not paid'],
    ['Created at', payment.createdAt ? formatDateTime(payment.createdAt) : 'Not added'],
  ]
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function paymentDocumentHtml(payment = {}, recruiter = {}) {
  const rows = getPaymentExportRows(payment, recruiter)
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payment.invoiceNo || 'payment-details')}</title>
  <style>
    body { font-family: Arial, sans-serif; color: #0f172a; padding: 32px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    p { margin: 0 0 24px; color: #475569; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #dbe4f0; padding: 12px; text-align: left; vertical-align: top; }
    th { width: 220px; background: #f8fafc; color: #64748b; text-transform: uppercase; font-size: 12px; letter-spacing: .04em; }
  </style>
</head>
<body>
  <h1>Payment Details</h1>
  <p>Invoice ${escapeHtml(payment.invoiceNo || 'Not added')} / Total Fee ${escapeHtml(getPaymentTotalFee(payment))}</p>
  <table>${rows}</table>
</body>
</html>`
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function downloadPaymentRecord(payment = {}, format = 'excel', recruiter = {}) {
  const safeInvoice = String(payment.invoiceNo || payment._id || 'payment-details').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()
  const html = paymentDocumentHtml(payment, recruiter)

  if (format === 'excel') {
    downloadBlob(html, `${safeInvoice}.xls`, 'application/vnd.ms-excel')
    return
  }

  if (format === 'doc') {
    downloadBlob(html, `${safeInvoice}.doc`, 'application/msword')
    return
  }

  const printWindow = window.open('', '_blank')
  if (!printWindow) return
  printWindow.document.write(html)
  printWindow.document.close()
  printWindow.focus()
  setTimeout(() => printWindow.print(), 250)
}

function normalizeSupportTicket(ticket) {
  const messages = getSupportChatMessages(ticket)
  const lastUserMessage = [...messages].reverse().find((item) => item.sender === 'user')
  const lastUserTime = lastUserMessage?.sentAt || ticket.lastUserMessageAt || ticket.createdAt || new Date().toISOString()
  const sessionEndsAt = ticket.sessionEndsAt || new Date(new Date(lastUserTime).getTime() + 10 * 60 * 1000).toISOString()

  return {
    ...ticket,
    chatMessages: messages,
    lastUserMessageAt: lastUserTime,
    sessionEndsAt,
  }
}

function getSupportChatMessages(ticket = {}) {
  if (Array.isArray(ticket.chatMessages) && ticket.chatMessages.length) {
    return ticket.chatMessages.filter((item) => item?.text).map((item) => ({
      sender: item.sender || 'user',
      text: item.text,
      sentAt: item.sentAt || ticket.createdAt || new Date().toISOString(),
    }))
  }

  const messages = []
  if (ticket.message) {
    messages.push({ sender: 'user', text: ticket.message, sentAt: ticket.createdAt || new Date().toISOString() })
  }
  if (ticket.adminReply) {
    messages.push({ sender: 'admin', text: ticket.adminReply, sentAt: ticket.updatedAt || new Date().toISOString() })
  }
  return messages
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString()
}

function renderAuthorisedBy({ action, email, name, time }) {
  if (!name && !email && !time) return <span className="text-slate-400">Not authorised</span>

  return (
    <div className="min-w-48 whitespace-normal rounded-[7px] bg-teal-50 px-3 py-2 text-xs font-bold leading-5 text-teal-700">
      <span className="block">{name || 'Account Team'}</span>
      {email ? <span className="block break-all text-[11px] text-teal-600">{email}</span> : null}
      {time ? <span className="block text-[11px] text-teal-600">{formatDateTime(time)}</span> : null}
      {action ? <span className="mt-1 inline-flex rounded-[7px] bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-teal-700">{action}</span> : null}
    </div>
  )
}

function renderRecruiterAccountAuthorisedBy(row) {
  return renderAuthorisedBy({
    action: row.accountAuthorizedAction,
    email: row.accountAuthorizedByEmail,
    name: row.accountAuthorizedByName,
    time: row.accountAuthorizedAt,
  })
}

function renderDocumentAuthorisedBy(row) {
  return renderAuthorisedBy({
    action: row.reviewedAction || row.status,
    email: row.reviewedByEmail,
    name: row.reviewedByName,
    time: row.reviewedAt,
  })
}

function renderJobAuthorisedBy(row) {
  return renderAuthorisedBy({
    action: row.jobAuthorizedAction,
    email: row.jobAuthorizedByEmail,
    name: row.jobAuthorizedByName,
    time: row.jobAuthorizedAt,
  })
}

function formatCountdown(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function submissionSuffix(count) {
  return count === 1 ? '' : 's'
}

function isDocumentUrl(value) {
  return /^(https?:\/\/|data:application\/pdf)/i.test(String(value || ''))
}

function renderDocumentFileCell(value, label = 'Document') {
  if (!value) return <span className="text-slate-400">Not uploaded</span>

  if (isDocumentUrl(value)) {
    return (
      <a className="rounded-[7px] bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700" href={value} rel="noreferrer" target="_blank">
        View PDF
      </a>
    )
  }

  return (
    <span className="inline-flex max-w-48 flex-col gap-1 whitespace-normal">
      <span className="break-all text-xs font-bold text-slate-600">{value}</span>
      <span className="text-[11px] font-black uppercase tracking-wide text-amber-600">{label} URL not available</span>
    </span>
  )
}

function getSelectOptions(key, companyOptions) {
  return key === 'company' ? companyOptions : fieldOptions[key]
}

function getShortId(value) {
  return value ? String(value).slice(-8) : ''
}

function buildRecruiterUserByEmail(users = []) {
  const userByEmail = new Map()

  users.forEach((user) => {
    const email = String(user.email || '').toLowerCase()
    if (email) userByEmail.set(email, user)
  })

  return userByEmail
}

function attachRecruiterUserIdsToRecruiters(recruiters, users = []) {
  const userByEmail = buildRecruiterUserByEmail(users)

  return recruiters.map((recruiter) => {
    const user = userByEmail.get(String(recruiter.businessEmail || '').toLowerCase())

    return {
      ...recruiter,
      recruiterId: getShortId(user?._id || recruiter.recruiterId || recruiter._id),
      recruiterUserId: user?._id || recruiter.recruiterUserId || '',
      recruiterUserStatus: user?.status || recruiter.recruiterUserStatus || '',
    }
  })
}

function attachRecruiterIdsToDocuments(documents, recruiters, users = []) {
  const recruiterIdByEmail = new Map()
  const userByEmail = buildRecruiterUserByEmail(users)

  recruiters.forEach((recruiter) => {
    const email = (recruiter.businessEmail || recruiter.email || '').toLowerCase()
    if (email) recruiterIdByEmail.set(email, getShortId(recruiter._id))
  })

  return documents.map((document) => {
    const email = (document.recruiterEmail || '').toLowerCase()
    const user = userByEmail.get(email)

    return {
      ...document,
      recruiterId: getShortId(user?._id || document.recruiterUserId || document.recruiterId) || recruiterIdByEmail.get(email) || getShortId(document._id),
      recruiterUserId: user?._id || document.recruiterUserId || '',
    }
  })
}

function buildRecruiterDocumentFallbackRows(recruiters = [], users = []) {
  const rowsByEmail = new Map()

  users.forEach((user) => {
    const email = String(user.email || '').toLowerCase()
    if (!email) return

    rowsByEmail.set(email, {
      _id: user._id,
      recruiterId: getShortId(user._id),
      recruiterUserId: user._id,
      recruiterName: user.name || 'Recruiter',
      recruiterEmail: user.email || '',
      documentType: 'Not Submitted',
      panNumber: '',
      panDocument: '',
      gstNumber: '',
      gstDocument: '',
      submissionsCount: 0,
      status: user.status || 'Not Submitted',
      createdAt: user.createdAt,
    })
  })

  recruiters.forEach((recruiter) => {
    const email = String(recruiter.businessEmail || recruiter.email || '').toLowerCase()
    if (!email) return

    const current = rowsByEmail.get(email) || {}
    rowsByEmail.set(email, {
      ...current,
      _id: current._id || recruiter._id,
      recruiterId: current.recruiterId || getShortId(recruiter._id),
      recruiterName: recruiter.companyName || current.recruiterName || 'Recruiter',
      recruiterEmail: recruiter.businessEmail || current.recruiterEmail || '',
      status: recruiter.status || current.status || 'Not Submitted',
      createdAt: current.createdAt || recruiter.createdAt,
    })
  })

  return Array.from(rowsByEmail.values()).sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

function attachRecruiterIdsToJobs(jobs, recruiters) {
  const recruiterIdByEmail = new Map()
  const recruiterByEmail = new Map()

  recruiters.forEach((recruiter) => {
    const email = (recruiter.businessEmail || recruiter.email || '').toLowerCase()
    if (email) {
      recruiterIdByEmail.set(email, getShortId(recruiter._id))
      recruiterByEmail.set(email, recruiter)
    }
  })

  return jobs.map((job) => {
    const email = (job.recruiterEmail || '').toLowerCase()
    const recruiter = recruiterByEmail.get(email)

    return {
      ...job,
      recruiterId: recruiterIdByEmail.get(email) || getShortId(job.recruiterId),
      recruiterObjectId: recruiter?._id || job.recruiterObjectId || '',
      recruiterName: job.recruiterName || recruiter?.companyName || job.company || 'Recruiter',
    }
  })
}

function groupJobsByRecruiter(jobs) {
  const grouped = new Map()

  jobs.forEach((job) => {
    const groupKey = job.recruiterObjectId || job.recruiterEmail || job.recruiterId || job._id
    const current = grouped.get(groupKey)
    const jobCreatedAt = new Date(job.createdAt || 0).getTime()

    if (!current) {
      grouped.set(groupKey, {
        _id: groupKey,
        recruiterObjectId: job.recruiterObjectId,
        recruiterId: job.recruiterId || getShortId(job.recruiterObjectId),
        recruiterName: job.recruiterName || job.company || 'Recruiter',
        recruiterEmail: job.recruiterEmail || 'Not linked',
        latestJobTitle: job.title,
        latestCompany: job.company,
        latestDepartment: job.department || 'Not added',
        latestLocation: job.location,
        latestCreatedAt: jobCreatedAt,
        jobPostCount: 1,
        activeJobs: job.accountDepartmentStatus === 'Active' || job.approval === 'Approved' ? 1 : 0,
        pendingJobs: job.accountDepartmentStatus === 'Pending' || job.approval === 'Pending' ? 1 : 0,
        rejectedJobs: job.accountDepartmentStatus === 'Rejected' || job.approval === 'Rejected' ? 1 : 0,
        candidateClicks: Number(job.views || 0),
        applicationsCount: Number(job.applicationsCount || 0),
        jobHistory: [job],
      })
      return
    }

    current.jobPostCount += 1
    current.activeJobs += job.accountDepartmentStatus === 'Active' || job.approval === 'Approved' ? 1 : 0
    current.pendingJobs += job.accountDepartmentStatus === 'Pending' || job.approval === 'Pending' ? 1 : 0
    current.rejectedJobs += job.accountDepartmentStatus === 'Rejected' || job.approval === 'Rejected' ? 1 : 0
    current.candidateClicks += Number(job.views || 0)
    current.applicationsCount += Number(job.applicationsCount || 0)
    current.jobHistory.push(job)

    if (jobCreatedAt > current.latestCreatedAt) {
      current.latestJobTitle = job.title
      current.latestCompany = job.company
      current.latestDepartment = job.department || 'Not added'
      current.latestLocation = job.location
      current.latestCreatedAt = jobCreatedAt
    }
  })

  return Array.from(grouped.values()).sort((a, b) => b.latestCreatedAt - a.latestCreatedAt)
}

function withAutomaticCategoryJobCounts(categories, jobs) {
  return categories.map((category) => ({
    ...category,
    jobs: getJobsForCategory(jobs, category.name).length,
  }))
}

function mergeCompanyManagementRows(companyRows, profileRows, filters = {}) {
  const rowsByKey = new Map()

  ;[...companyRows, ...profileRows].forEach((company, index) => {
    const normalized = normalizeCompanyManagementRow(company, index)
    const key = normalizeName(normalized.name) || String(normalized._id || normalized.id || `company-${index}`)
    const current = rowsByKey.get(key)
    rowsByKey.set(key, current ? { ...normalized, ...current } : normalized)
  })

  return Array.from(rowsByKey.values()).filter((company) => matchesCompanyManagementFilters(company, filters))
}

function normalizeCompanyManagementRow(company = {}, index = 0) {
  const openJobs = Number(company.jobs ?? company.openJobs ?? 0)
  const name = company.name || company.companyName || ''

  return {
    ...company,
    _id: company._id,
    id: company.id || company._id || `profile-${normalizeName(name) || index}`,
    name,
    contactPerson: company.contactPerson || company.recruiterName || '',
    contactNumber: company.contactNumber || company.phone || '',
    contactEmail: company.contactEmail || company.businessEmail || '',
    gstNumber: company.gstNumber || '',
    industry: company.industry || 'Not added',
    status: company.status || 'Active',
    jobs: openJobs,
  }
}

function matchesCompanyManagementFilters(company, { search = '', status = '' } = {}) {
  const matchesSearch = search
    ? [company.name, company.contactPerson, company.contactNumber, company.contactEmail, company.gstNumber, company.industry, company.location, company.status]
      .some((value) => String(value || '').toLowerCase().includes(search.toLowerCase()))
    : true
  const matchesStatus = status ? String(company.status || '').toLowerCase() === status.toLowerCase() : true

  return matchesSearch && matchesStatus
}

function groupRecruiterDocuments(documents) {
  const grouped = new Map()

  documents.forEach((document) => {
    const groupKey = document.recruiterEmail || document.recruiterName || document._id
    const current = grouped.get(groupKey)

    if (!current) {
      grouped.set(groupKey, { ...document, submissionsCount: 1, submissionHistory: [document] })
      return
    }

    current.submissionsCount += 1
    current.submissionHistory.push(document)

    const currentDate = new Date(current.updatedAt || current.createdAt || 0).getTime()
    const documentDate = new Date(document.updatedAt || document.createdAt || 0).getTime()

    if (documentDate > currentDate) {
      grouped.set(groupKey, { ...document, submissionsCount: current.submissionsCount, submissionHistory: current.submissionHistory })
    }
  })

  return Array.from(grouped.values())
}

function groupSupportMessagesByEmail(messages) {
  const grouped = new Map()

  messages.forEach((message) => {
    const email = String(message.email || '').trim().toLowerCase()
    const groupKey = email || `guest-${message._id}`
    const current = grouped.get(groupKey)
    const messageDate = new Date(message.updatedAt || message.createdAt || 0).getTime()
    const chatCount = Array.isArray(message.chatMessages) && message.chatMessages.length ? message.chatMessages.length : 1

    if (!current) {
      grouped.set(groupKey, {
        ...message,
        latestMessageId: message._id,
        messagesCount: 1,
        chatMessagesCount: chatCount,
        latestCreatedAt: messageDate,
        messageHistory: [message],
      })
      return
    }

    current.messagesCount += 1
    current.chatMessagesCount += chatCount
    current.messageHistory.push(message)

    if (messageDate > current.latestCreatedAt) {
      grouped.set(groupKey, {
        ...message,
        latestMessageId: message._id,
        messagesCount: current.messagesCount,
        chatMessagesCount: current.chatMessagesCount,
        latestCreatedAt: messageDate,
        messageHistory: current.messageHistory,
      })
    }
  })

  return Array.from(grouped.values()).sort((a, b) => b.latestCreatedAt - a.latestCreatedAt)
}

function mergeRecruiterDocumentStatus(recruiters, documents) {
  const latestStatusByEmail = new Map()

  documents.forEach((document) => {
    const email = document.recruiterEmail?.toLowerCase()
    if (!email) return

    const current = latestStatusByEmail.get(email)
    const currentDate = new Date(current?.updatedAt || current?.createdAt || 0).getTime()
    const documentDate = new Date(document.updatedAt || document.createdAt || 0).getTime()

    if (!current || documentDate > currentDate) {
      latestStatusByEmail.set(email, document)
    }
  })

  return recruiters.map((recruiter) => {
    const document = latestStatusByEmail.get(recruiter.businessEmail?.toLowerCase())
    return document ? { ...recruiter, latestDocumentStatus: document.status || '' } : recruiter
  })
}

function CrudModal({ companyOptions, companyRows, config, form, isCreate, onChange, onClose, onSave, open, type }) {
  const [showPassword, setShowPassword] = useState(false)
  const fields = type === 'users' && isCreate
    ? [['name', 'Full name'], ['email', 'Email address'], ['role', 'Role'], ['password', 'Password'], ['status', 'Status']]
    : config.fields
  const updateMany = (updates) => {
    Object.entries(updates).forEach(([key, value]) => onChange(key, value))
  }

  return (
    <AdminModal open={open} title={config.modalTitle} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.map(([key, label, fieldType]) =>
          fieldType === 'textarea' ? (
            <textarea className="input min-h-28 sm:col-span-2" key={key} onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || ''} />
          ) : fieldType === 'jobLocation' ? (
            <JobLocationSelect form={form} key={key} updateMany={updateMany} />
          ) : fieldType === 'companyLocation' ? (
            <CompanyLocationSelect form={form} key={key} updateMany={updateMany} />
          ) : fieldType === 'jobDescription' ? (
            <JobDescriptionField form={form} key={key} onChange={(value) => onChange(key, value)} />
          ) : fieldType === 'date' ? (
            <label className="grid gap-1" key={key}>
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
              <input className="input" onChange={(event) => onChange(key, event.target.value)} type="date" value={toDateInputValue(form[key])} />
            </label>
          ) : fieldType === 'testimonialType' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.testimonialType} value={form[key] || fieldOptions.testimonialType[0]} />
          ) : fieldType === 'testimonialPlacement' ? (
            <TestimonialPlacementSelect key={key} label={label} onChange={(value) => onChange(key, value)} value={form[key] || fieldOptions.testimonialPlacement[0]} />
          ) : fieldType === 'careerJobType' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.careerJobType} value={form[key] || fieldOptions.careerJobType[0]} />
          ) : fieldType === 'careerWorkMode' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.careerWorkMode} value={form[key] || fieldOptions.careerWorkMode[1]} />
          ) : fieldType === 'careerJobStatus' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.careerJobStatus} value={form[key] || fieldOptions.careerJobStatus[0]} />
          ) : fieldType === 'policyPlacement' ? (
            <PolicyPlacementSelect key={key} label={label} onChange={(value) => onChange(key, value)} value={form[key] || fieldOptions.policyPlacement[0]} />
          ) : fieldType === 'policyCategory' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.policyCategory} value={form[key] || fieldOptions.policyCategory[0]} />
          ) : fieldType === 'policyStatus' ? (
            <SelectWithLabel key={key} label={label} onChange={(value) => onChange(key, value)} options={fieldOptions.policyStatus} value={form[key] || fieldOptions.policyStatus[0]} />
          ) : fieldType === 'contentSections' ? (
            <label className="grid gap-1 sm:col-span-2" key={key}>
              <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
              <textarea
                className="input min-h-48"
                onChange={(event) => onChange(key, event.target.value)}
                placeholder={'Data We Collect\nWrite section body here\n\nHow We Use Data\nWrite next section body here'}
                value={form[key] || ''}
              />
            </label>
          ) : fieldType === 'featuredToggle' ? (
            <select className="input" key={key} onChange={(event) => onChange(key, event.target.value)} value={String(form[key] ?? 'false')}>
              {fieldOptions.featuredToggle.map((option) => <option key={option} value={option}>{option === 'true' ? 'Featured' : 'Not Featured'}</option>)}
            </select>
          ) : fieldType === 'supportStatus' ? (
            <select className="input" key={key} onChange={(event) => onChange(key, event.target.value)} value={form[key] || fieldOptions.supportStatus[0]}>
              {fieldOptions.supportStatus.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : fieldType === 'faqCategory' ? (
            <input className="input" key={key} list="faq-category-options" onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || fieldOptions.faqCategory[0]} />
          ) : fieldType === 'faqStatus' ? (
            <select className="input" key={key} onChange={(event) => onChange(key, event.target.value)} value={form[key] || fieldOptions.faqStatus[0]}>
              {fieldOptions.faqStatus.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : fieldType === 'subscriberStatus' ? (
            <select className="input" key={key} onChange={(event) => onChange(key, event.target.value)} value={form[key] || fieldOptions.subscriberStatus[0]}>
              {fieldOptions.subscriberStatus.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : key === 'skills' ? (
            <SkillSelect key={key} onChange={(value) => onChange(key, value)} value={form[key] || ''} />
          ) : key === 'title' ? (
            <label className="grid gap-1" key={key}>
              <input className="input" list="job-title-options" onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || ''} />
              <datalist id="job-title-options">
                {jobTitleOptions.map((option) => <option key={option} value={option} />)}
              </datalist>
            </label>
          ) : key === 'name' && type === 'companies' ? (
            <label className="grid gap-1" key={key}>
              <input className="input" list="company-name-options" onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || ''} />
              <datalist id="company-name-options">
                {companyNameOptions.map((option) => <option key={option} value={option} />)}
              </datalist>
            </label>
          ) : key === 'industry' && type === 'companies' ? (
            <label className="grid gap-1" key={key}>
              <input className="input" list="industry-options" onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || ''} />
              <datalist id="industry-options">
                {industryOptions.map((option) => <option key={option} value={option} />)}
              </datalist>
            </label>
          ) : fieldType === 'number' ? (
            <input className="input" key={key} min="0" onChange={(event) => onChange(key, event.target.value)} placeholder={label} type="number" value={form[key] || ''} />
          ) : type === 'users' && key === 'status' ? (
            <select className="input" key={key} onChange={(event) => onChange(key, event.target.value)} value={form[key] || (form.role === 'recruiter' ? 'Review' : 'Active')}>
              {fieldOptions.userStatus.map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : type === 'users' && key === 'password' ? (
            <div className="flex items-center gap-3 rounded-[7px] border border-slate-200 bg-white px-4 py-3" key={key}>
              <input
                className="w-full bg-transparent text-sm font-semibold outline-none"
                onChange={(event) => onChange(key, event.target.value)}
                placeholder={label}
                type={showPassword ? 'text' : 'password'}
                value={form[key] || ''}
              />
              <button
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                onClick={() => setShowPassword((value) => !value)}
                type="button"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          ) : type === 'jobs' && key === 'company' ? (
            <select
              className="input"
              key={key}
              onChange={(event) => {
                onChange(key, event.target.value)
                const company = companyRows.find((item) => normalizeName(item.name) === normalizeName(event.target.value))
                if (company?.industry) {
                  onChange('industry', company.industry)
                  onChange('department', company.industry)
                }
              }}
              value={form[key] || ''}
            >
              <option value="">{companyOptions.length ? 'Select admin company' : 'Add company first'}</option>
              {companyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          ) : fieldOptions[key] ? (
            <select
              className="input"
              key={key}
              onChange={(event) => {
                onChange(key, event.target.value)
                if (type === 'users' && key === 'role' && event.target.value === 'recruiter' && isCreate) {
                  onChange('status', 'Review')
                }
                if (type === 'jobs' && key === 'company') {
                  const company = companyRows.find((item) => normalizeName(item.name) === normalizeName(event.target.value))
                  if (company?.industry) {
                    onChange('industry', company.industry)
                    onChange('department', company.industry)
                  }
                }
              }}
              value={form[key] || getSelectOptions(key, companyOptions)[0]}
            >
              {getSelectOptions(key, companyOptions).map((option) => <option key={option}>{option}</option>)}
            </select>
          ) : (
            <input className="input" key={key} onChange={(event) => onChange(key, event.target.value)} placeholder={label} value={form[key] || ''} />
          ),
        )}
      </div>
      <datalist id="faq-category-options">
        {fieldOptions.faqCategory.map((option) => <option key={option} value={option} />)}
      </datalist>
      {type === 'applications' && (
        <select className="input mt-3" onChange={(event) => onChange('status', event.target.value)} value={form.status || 'New'}>
          {['New', 'Reviewed', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].map((status) => <option key={status}>{status}</option>)}
        </select>
      )}
      {type === 'resumes' && (
        <div className="mt-4 grid gap-3 rounded-[7px] bg-blue-50 p-4 text-sm text-blue-800">
          <p className="flex items-center gap-2 font-bold"><Eye size={17} /> Resume preview panel</p>
          <p>Skills, experience, application history, and download controls appear here.</p>
        </div>
      )}
      <div className="mt-5 flex flex-col justify-end gap-2 sm:flex-row">
        <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={onClose} type="button">Cancel</button>
        <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={onSave} type="button">Save Changes</button>
      </div>
    </AdminModal>
  )
}

function SkillSelect({ onChange, value }) {
  const [query, setQuery] = useState('')
  const selected = splitComma(value)
  const filteredSkills = skillOptions.filter((skill) => skill.toLowerCase().includes(query.trim().toLowerCase()))

  const toggle = (skill) => {
    const next = selected.includes(skill) ? selected.filter((item) => item !== skill) : [...selected, skill]
    onChange(next.join(', '))
  }

  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Skills</p>
      <input
        className="mt-2 w-full rounded-[7px] border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search skills"
        value={query}
      />
      <div className="mt-3 flex max-h-44 flex-wrap gap-2 overflow-y-auto rounded-[7px] border border-slate-200 bg-slate-50 p-3">
        {filteredSkills.map((skill) => {
          const active = selected.includes(skill)
          return (
            <button
              className={`rounded-[7px] px-3 py-2 text-xs font-black transition ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700'}`}
              key={skill}
              onClick={() => toggle(skill)}
              type="button"
            >
              {skill}
            </button>
          )
        })}
        {!filteredSkills.length && <p className="text-sm font-semibold text-slate-500">No skills found.</p>}
      </div>
    </div>
  )
}

function SelectWithLabel({ label, onChange, options, value }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select className="input" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function TestimonialPlacementSelect({ label, onChange, value }) {
  const options = [
    {
      value: 'Users Frontend',
      title: 'Users Frontend',
      text: 'Candidate/user website testimonial carousel par show hoga.',
    },
    {
      value: 'Recruiter Frontend',
      title: 'Recruiter Frontend',
      text: 'Recruiter/employer landing page testimonial section par show hoga.',
    },
  ]

  return (
    <div className="grid gap-2 sm:col-span-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <div className="grid gap-3 md:grid-cols-2">
        {options.map((option) => (
          <button
            className={`rounded-[7px] border p-4 text-left transition ${
              value === option.value
                ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-100 hover:bg-slate-50'
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="block text-sm font-black">{option.title}</span>
            <span className={`mt-1 block text-xs font-semibold leading-5 ${value === option.value ? 'text-blue-600' : 'text-slate-500'}`}>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PolicyPlacementSelect({ label, onChange, value }) {
  const options = [
    {
      value: 'Users Frontend',
      title: 'Users Frontend',
      text: 'Privacy, terms, support, and platform policy pages for the candidate/user website.',
    },
    {
      value: 'Recruiter Frontend',
      title: 'Recruiter Frontend',
      text: 'Hiring, account, package, and compliance policy pages for the recruiter/employer website.',
    },
    {
      value: 'Freelancer Frontend',
      title: 'Freelancer Frontend',
      text: 'Freelancer privacy, terms, support, project, proposal, and marketplace policy pages.',
    },
  ]

  return (
    <div className="grid gap-2 sm:col-span-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <div className="grid gap-3 md:grid-cols-3">
        {options.map((option) => (
          <button
            className={`rounded-[7px] border p-4 text-left transition ${
              value === option.value
                ? 'border-blue-200 bg-blue-50 text-blue-800 shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-100 hover:bg-slate-50'
            }`}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span className="block text-sm font-black">{option.title}</span>
            <span className={`mt-1 block text-xs font-semibold leading-5 ${value === option.value ? 'text-blue-600' : 'text-slate-500'}`}>{option.text}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function JobLocationSelect({ form, updateMany }) {
  const location = {
    ...getDefaultJobLocation(),
    ...form,
  }
  const countryOptions = location.locationScope === 'India' ? [Country.getCountryByCode('IN')].filter(Boolean) : Country.getAllCountries()
  const stateOptions = State.getStatesOfCountry(location.countryCode || 'IN')
  const cityOptions = City.getCitiesOfState(location.countryCode || 'IN', location.stateCode || '')

  const setScope = (locationScope) => {
    const countryCode = locationScope === 'India' ? 'IN' : 'US'
    const country = Country.getCountryByCode(countryCode)
    const state = State.getStatesOfCountry(countryCode)[0]
    const city = City.getCitiesOfState(countryCode, state?.isoCode || '')[0]

    updateMany({
      locationScope,
      country: country?.name || '',
      countryCode,
      state: state?.name || '',
      stateCode: state?.isoCode || '',
      city: city?.name || '',
      location: [city?.name, state?.name, country?.name].filter(Boolean).join(', '),
    })
  }

  const setCountry = (countryCode) => {
    const country = Country.getCountryByCode(countryCode)
    const state = State.getStatesOfCountry(countryCode)[0]
    const city = City.getCitiesOfState(countryCode, state?.isoCode || '')[0]

    updateMany({
      country: country?.name || '',
      countryCode,
      state: state?.name || '',
      stateCode: state?.isoCode || '',
      city: city?.name || '',
      location: [city?.name, state?.name, country?.name].filter(Boolean).join(', '),
    })
  }

  const setState = (stateCode) => {
    const state = State.getStateByCodeAndCountry(stateCode, location.countryCode)
    const city = City.getCitiesOfState(location.countryCode, stateCode)[0]

    updateMany({
      state: state?.name || '',
      stateCode,
      city: city?.name || '',
      location: [city?.name, state?.name, location.country].filter(Boolean).join(', '),
    })
  }

  const setCity = (city) => {
    updateMany({ city, location: [city, location.state, location.country].filter(Boolean).join(', ') })
  }

  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Job Location</p>
      <div className="mt-2 grid gap-3 rounded-[7px] bg-slate-50 p-3 sm:grid-cols-2">
        <SelectField label="Region" onChange={setScope} options={['India', 'International']} value={location.locationScope} />
        <SelectField label="Country" onChange={setCountry} options={countryOptions.map((country) => ({ label: country.name, value: country.isoCode }))} value={location.countryCode} />
        <SelectField label={location.locationScope === 'India' ? 'State / UT' : 'State / Province'} onChange={setState} options={stateOptions.map((state) => ({ label: state.name, value: state.isoCode }))} value={location.stateCode} />
        <SelectField label="City" onChange={setCity} options={cityOptions.map((city) => ({ label: city.name, value: city.name }))} value={location.city} />
        <label className="sm:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">Office Address</span>
          <textarea className="mt-1 min-h-24 w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => updateMany({ officeAddress: event.target.value, ...(location.interviewSameAsOffice !== false ? { interviewAddress: event.target.value } : {}) })} placeholder="Office address, landmark, floor, PIN/ZIP" value={form.officeAddress || ''} />
        </label>
        <label className="flex items-center justify-between rounded-[7px] bg-white p-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 sm:col-span-2">
          Interview address same as office
          <input checked={form.interviewSameAsOffice !== false} className="h-5 w-5 accent-blue-600" onChange={(event) => updateMany({ interviewSameAsOffice: event.target.checked, interviewAddress: event.target.checked ? form.officeAddress || '' : form.interviewAddress || '' })} type="checkbox" />
        </label>
        {form.interviewSameAsOffice === false && (
          <label className="sm:col-span-2">
            <span className="text-xs font-black uppercase tracking-wide text-slate-400">Interview Address</span>
            <textarea className="mt-1 min-h-24 w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => updateMany({ interviewAddress: event.target.value })} placeholder="Interview venue address if different from office" value={form.interviewAddress || ''} />
          </label>
        )}
      </div>
    </div>
  )
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select className="mt-1 w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => onChange(event.target.value)} value={value || ''}>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { label: option, value: option } : option
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>
        })}
      </select>
    </label>
  )
}

function CompanyLocationSelect({ form, updateMany }) {
  const location = {
    ...getDefaultJobLocation(),
    ...form,
  }
  const countryOptions = location.locationScope === 'India' ? [Country.getCountryByCode('IN')].filter(Boolean) : Country.getAllCountries()
  const stateOptions = State.getStatesOfCountry(location.countryCode || 'IN')
  const cityOptions = City.getCitiesOfState(location.countryCode || 'IN', location.stateCode || '')

  const setScope = (locationScope) => {
    const countryCode = locationScope === 'India' ? 'IN' : 'US'
    const country = Country.getCountryByCode(countryCode)
    const state = State.getStatesOfCountry(countryCode)[0]
    const city = City.getCitiesOfState(countryCode, state?.isoCode || '')[0]

    updateMany({
      locationScope,
      country: country?.name || '',
      countryCode,
      state: state?.name || '',
      stateCode: state?.isoCode || '',
      city: city?.name || '',
      location: [city?.name, state?.name, country?.name].filter(Boolean).join(', '),
    })
  }

  const setCountry = (countryCode) => {
    const country = Country.getCountryByCode(countryCode)
    const state = State.getStatesOfCountry(countryCode)[0]
    const city = City.getCitiesOfState(countryCode, state?.isoCode || '')[0]

    updateMany({
      country: country?.name || '',
      countryCode,
      state: state?.name || '',
      stateCode: state?.isoCode || '',
      city: city?.name || '',
      location: [city?.name, state?.name, country?.name].filter(Boolean).join(', '),
    })
  }

  const setState = (stateCode) => {
    const state = State.getStateByCodeAndCountry(stateCode, location.countryCode)
    const city = City.getCitiesOfState(location.countryCode, stateCode)[0]

    updateMany({
      state: state?.name || '',
      stateCode,
      city: city?.name || '',
      location: [city?.name, state?.name, location.country].filter(Boolean).join(', '),
    })
  }

  const setCity = (city) => {
    updateMany({ city, location: [city, location.state, location.country].filter(Boolean).join(', ') })
  }

  return (
    <div className="sm:col-span-2">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">Company Location</p>
      <div className="mt-2 grid gap-3 rounded-[7px] bg-slate-50 p-3 sm:grid-cols-2">
        <SelectField label="Region" onChange={setScope} options={['India', 'International']} value={location.locationScope} />
        <SelectField label="Country" onChange={setCountry} options={countryOptions.map((country) => ({ label: country.name, value: country.isoCode }))} value={location.countryCode} />
        <SelectField label={location.locationScope === 'India' ? 'State / UT' : 'State / Province'} onChange={setState} options={stateOptions.map((state) => ({ label: state.name, value: state.isoCode }))} value={location.stateCode} />
        <SelectField label="City" onChange={setCity} options={cityOptions.map((city) => ({ label: city.name, value: city.name }))} value={location.city} />
        <label className="sm:col-span-2">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">Address</span>
          <textarea className="mt-1 min-h-24 w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => updateMany({ address: event.target.value })} placeholder="Company office address, landmark, floor, PIN/ZIP" value={form.address || ''} />
        </label>
      </div>
    </div>
  )
}

function JobDescriptionField({ form, onChange }) {
  const generate = () => {
    const skills = splitComma(form.skills).join(', ') || 'relevant tools and business skills'
    const description = `We are hiring a ${form.title || 'skilled professional'} for ${form.company || 'our company'} in the ${form.department || 'relevant'} department. This ${form.type || 'Full Time'} role is designed for candidates with ${form.experience || 'relevant experience'} who can work in a ${form.workMode || 'Hybrid'} setup from ${formatJobLocation(form) || 'the selected location'}.

The selected candidate will own day-to-day execution, collaborate with cross-functional teams, and deliver high-quality work aligned with business goals. Strong practical knowledge of ${skills} is expected, along with clear communication, ownership, and problem-solving ability.

Key responsibilities include understanding requirements, planning and delivering tasks on time, coordinating with internal stakeholders, maintaining quality standards, and sharing regular progress updates. Candidates should be comfortable working in a fast-paced environment and adapting to changing priorities.

This role offers growth opportunities, exposure to real projects, and a professional hiring workflow. Applicants should review the job details carefully and apply before the deadline.`

    onChange(description)
  }

  return (
    <div className="sm:col-span-2">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Description</p>
        <button className="rounded-[7px] bg-blue-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-100 hover:bg-blue-700" onClick={generate} type="button">
          AI Generate
        </button>
      </div>
      <textarea className="input min-h-48" onChange={(event) => onChange(event.target.value)} placeholder="Description" value={form.description || ''} />
    </div>
  )
}

function ApplicationStatusPanel() {
  return (
    <AdminCard>
      <h3 className="mb-4 text-lg font-black text-slate-950">Application Status Workflow</h3>
      <div className="flex flex-wrap gap-2">
        {['New', 'Reviewed', 'Shortlisted', 'Interview', 'Selected', 'Rejected'].map((status) => <StatusBadge key={status} status={status} />)}
      </div>
    </AdminCard>
  )
}

function NewsletterSendShortcut() {
  return (
    <section className="flex flex-col justify-between gap-4 rounded-[7px] border border-blue-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-black uppercase tracking-wide text-blue-600">Hiring Insight Email</p>
        <h3 className="mt-1 text-xl font-black text-slate-950">Send updates to all subscribed emails</h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">Open the professional email composer with image, URL, and message controls.</p>
      </div>
      <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100" onClick={() => window.open('/admin/hiring-insights/send', '_blank', 'noopener,noreferrer')} type="button">
        <MailPlus size={18} /> Send Hiring Insight Update
      </button>
    </section>
  )
}

export function AdminNewsletterSendPage() {
  const [form, setForm] = useState({
    subject: 'Fresh hiring insights from INSEET',
    previewText: 'Latest jobs, recruiter trends, and platform updates curated for you.',
    message: 'Hello,\n\nHere are the latest hiring insights from INSEET. Explore fresh verified openings, recruiter updates, and career trends from active companies.\n\nStay connected for more job alerts and hiring updates.',
    imageUrl: '',
    ctaLabel: 'Explore Latest Jobs',
    ctaUrl: 'https://www.inseet.in/jobs',
  })
  const [updates, setUpdates] = useState([])
  const [message, setMessage] = useToastMessageState()
  const [sending, setSending] = useState(false)

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const loadUpdates = () => {
    api.newsletterUpdates('?limit=10')
      .then((payload) => setUpdates(payload.data || []))
      .catch(() => setUpdates([]))
  }

  useEffect(() => {
    loadUpdates()
  }, [])

  const sendUpdate = async () => {
    const subject = form.subject.trim()
    const updateMessage = form.message.trim()

    if (!subject || !updateMessage) {
      setMessage('Subject and update message are required.')
      return
    }

    setSending(true)
    setMessage('')

    try {
      const payload = await api.sendNewsletterUpdate({
        subject,
        previewText: form.previewText.trim(),
        message: updateMessage,
        imageUrl: form.imageUrl.trim(),
        ctaLabel: form.ctaLabel.trim(),
        ctaUrl: form.ctaUrl.trim(),
      })
      setMessage(payload.message || 'Hiring insight update sent successfully.')
      setUpdates((current) => [payload.data, ...current].filter(Boolean).slice(0, 10))
    } catch (error) {
      setMessage(error.message || 'Hiring insight update could not be sent.')
      loadUpdates()
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid gap-5">
      <section className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-50">Hiring Insights / Email Composer</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Send Hiring Insight Update</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold text-blue-50">Compose a branded email with image, URL, CTA, and message for every subscribed email.</p>
          </div>
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-white px-5 py-3 text-sm font-black text-blue-700 shadow-lg" disabled={sending} onClick={sendUpdate} type="button">
            <Send size={17} /> {sending ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </section>

      {message && <p className="rounded-[7px] bg-blue-50 p-4 text-sm font-bold text-blue-700">{message}</p>}

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3">
            <input className="input" onChange={(event) => update('subject', event.target.value)} placeholder="Email subject" value={form.subject} />
            <input className="input" onChange={(event) => update('previewText', event.target.value)} placeholder="Preview text" value={form.previewText} />
            <input className="input" onChange={(event) => update('imageUrl', event.target.value)} placeholder="Image URL, optional" value={form.imageUrl} />
            <textarea className="input min-h-44" onChange={(event) => update('message', event.target.value)} placeholder="Write the email message" value={form.message} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="input" onChange={(event) => update('ctaLabel', event.target.value)} placeholder="Button label" value={form.ctaLabel} />
              <input className="input" onChange={(event) => update('ctaUrl', event.target.value)} placeholder="Button URL" value={form.ctaUrl} />
            </div>
          </div>
        </div>

        <div className="grid gap-5">
          <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Email Preview</p>
            <div className="mt-4 overflow-hidden rounded-[7px] border border-slate-200">
              <div className="bg-gradient-to-br from-blue-600 to-teal-500 p-5 text-white">
                <p className="text-xs font-black uppercase tracking-wide text-blue-50">Hiring Insights</p>
                <h3 className="mt-2 text-xl font-black">{form.subject || 'Email subject'}</h3>
                {form.previewText ? <p className="mt-2 text-sm text-blue-50">{form.previewText}</p> : null}
              </div>
              {form.imageUrl ? <img className="h-40 w-full object-cover" src={form.imageUrl} alt="" /> : null}
              <div className="p-5">
                <p className="whitespace-pre-line text-sm font-semibold leading-6 text-slate-600">{form.message}</p>
                {form.ctaUrl ? <span className="mt-4 inline-flex rounded-[7px] bg-blue-600 px-4 py-2 text-sm font-black text-white">{form.ctaLabel || 'Open update'}</span> : null}
              </div>
            </div>
          </div>

          <div className="rounded-[7px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black uppercase tracking-wide text-slate-500">Recent Updates</p>
            <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
              {updates.length ? updates.map((item) => (
                <div className="rounded-[7px] bg-white p-3 shadow-sm" key={item._id || item.subject}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-black text-slate-900">{item.subject}</p>
                    <StatusBadge status={item.status || 'Sent'} />
                  </div>
                  <p className="mt-2 text-xs font-bold text-slate-500">Sent {item.sentCount || 0}/{item.recipientCount || 0} subscribers</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{formatDateTime(item.sentAt || item.createdAt)}</p>
                </div>
              )) : (
                <p className="rounded-[7px] bg-white p-4 text-sm font-bold text-slate-500">No hiring insight updates sent yet.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function RevenueSummary({ rows = [] }) {
  const paidRows = rows.filter((row) => String(row.status || '').toLowerCase() === 'paid')
  const failedRows = rows.filter((row) => String(row.status || '').toLowerCase() === 'failed')
  const activeTiers = new Set(rows.map((row) => String(row.plan || '').trim()).filter(Boolean)).size
  const revenue = paidRows.reduce((total, row) => total + parsePaymentAmount(row.amount), 0)

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        ['Subscription Plans', `${activeTiers} active ${activeTiers === 1 ? 'tier' : 'tiers'}`, ShieldCheck],
        ['Revenue Summary', formatInrAmount(revenue), FileText],
        ['Failed Payments', `${failedRows.length} ${failedRows.length === 1 ? 'retry' : 'retries'}`, Download],
      ].map(([label, value, Icon]) => (
        <AdminCard key={label}>
          <Icon className="text-blue-600" size={24} />
          <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
        </AdminCard>
      ))}
    </div>
  )
}

function parsePaymentAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0

  const text = String(value || '').trim().toLowerCase()
  if (!text) return 0

  const multiplier = text.includes('cr') ? 10000000 : text.includes('l') ? 100000 : text.includes('k') ? 1000 : 1
  const amount = Number(text.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0] || 0)
  return Number.isFinite(amount) ? amount * multiplier : 0
}

function formatInrAmount(value) {
  return `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(value || 0)))}`
}

function LabeledInput({ className = '', label, min, onChange, placeholder, type = 'text', value }) {
  const handleChange = (event) => {
    const nextValue = type === 'number' ? event.target.value.replace(/\D/g, '') : event.target.value
    onChange(nextValue)
  }

  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input className="input" inputMode={type === 'number' ? 'numeric' : undefined} min={min} onChange={handleChange} pattern={type === 'number' ? '[0-9]*' : undefined} placeholder={placeholder} type={type} value={value} />
    </label>
  )
}

export function AdminPricingPage() {
  const loadedPackagesRef = useRef(false)
  const [plans, setPlans] = useState(() => getPricingPackages())
  const [packageModalOpen, setPackageModalOpen] = useState(false)
  const [editingPackageIndex, setEditingPackageIndex] = useState(null)
  const [pricingMessage, setPricingMessage] = useState('')
  const [packageForm, setPackageForm] = useState({
    name: '',
    description: '',
    price: '',
    features: '',
    badge: '',
    buttonLabel: 'Start Hiring',
    status: 'Active',
    sortOrder: '',
    jobLimit: '',
    validityDays: '',
    discountPercent: '',
    coinPerJob: 10,
  })

  useEffect(() => {
    const syncPlans = () => setPlans(getPricingPackages())

    if (!loadedPackagesRef.current) {
      loadedPackagesRef.current = true
      seedDefaultPricingPackages()
        .then(setPlans)
        .catch(() => setPlans(getPricingPackages()))
    }

    window.addEventListener('pricing-packages-updated', syncPlans)
    window.addEventListener('storage', syncPlans)

    return () => {
      window.removeEventListener('pricing-packages-updated', syncPlans)
      window.removeEventListener('storage', syncPlans)
    }
  }, [])

  const openPackageModal = (plan = null, index = null) => {
    setEditingPackageIndex(index)
    setPackageForm({
      name: plan?.name || '',
      description: plan?.description || '',
      price: plan?.price || '',
      features: Array.isArray(plan?.features) ? plan.features.join(', ') : '',
      badge: plan?.badge || '',
      buttonLabel: plan?.buttonLabel || 'Start Hiring',
      status: plan?.status || 'Active',
      sortOrder: plan?.sortOrder || '',
      jobLimit: plan?.jobLimit || '',
      validityDays: plan?.validityDays || '',
      discountPercent: plan?.discountPercent || '',
      coinPerJob: plan?.coinPerJob || 10,
    })
    setPackageModalOpen(true)
  }

  const savePackage = async () => {
    if (!packageForm.name.trim() || !packageForm.price.trim()) return

    const nextPackage = {
      ...packageForm,
      sortOrder: Number(packageForm.sortOrder || plans.length + 1),
      jobLimit: Number(packageForm.jobLimit || 1),
      validityDays: Number(packageForm.validityDays || 30),
      discountPercent: Number(packageForm.discountPercent || 0),
      coinPerJob: Number(packageForm.coinPerJob || 10),
      features: splitComma(packageForm.features),
    }

    try {
      const editingPlan = editingPackageIndex === null ? null : plans[editingPackageIndex]
      if (editingPlan?._id) {
        await api.update('pricing-packages', editingPlan._id, nextPackage)
      } else {
        await api.create('pricing-packages', nextPackage)
      }
      const savedPlans = await fetchPricingPackages()
      setPlans(savedPlans)
      setPricingMessage('Package saved to MongoDB successfully. Recruiter pricing updated.')
      setPackageForm({ name: '', description: '', price: '', features: '', badge: '', buttonLabel: 'Start Hiring', status: 'Active', sortOrder: '', jobLimit: '', validityDays: '', discountPercent: '', coinPerJob: 10 })
      setEditingPackageIndex(null)
      setPackageModalOpen(false)
    } catch (error) {
      setPricingMessage(error.message)
    }
  }

  const deletePackage = async (indexToDelete) => {
    const plan = plans[indexToDelete]

    try {
      if (plan?._id) await api.remove('pricing-packages', plan._id)
      const savedPlans = await fetchPricingPackages()
      setPlans(savedPlans)
      setPricingMessage('Package deleted from MongoDB successfully. Recruiter pricing updated.')
    } catch (error) {
      setPricingMessage(error.message)
    }
  }

  return (
    <div className="grid gap-5">
      <Toolbar
        actionLabel="Add Package"
        onAction={() => openPackageModal()}
        subtitle="Choose a hiring plan for posting jobs, reviewing candidates, and scaling your recruitment workflow."
        title="Recruiter Pricing"
      />
      {pricingMessage && <p className="rounded-[7px] bg-blue-50 p-4 text-sm font-bold text-blue-700">{pricingMessage}</p>}
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <AdminCard className={`relative flex min-h-[420px] flex-col ${plan.badge ? 'border-blue-200 shadow-xl shadow-blue-100' : ''}`} key={plan.name}>
            {plan.badge && (
              <span className="absolute right-5 top-5 rounded-[7px] bg-blue-600 px-3 py-1 text-xs font-black text-white">
                {plan.badge}
              </span>
            )}
            <div>
              <div className="flex items-start justify-between gap-3 pr-20">
                <h2 className="text-2xl font-black text-slate-950">{plan.name}</h2>
                <StatusBadge status={plan.status || 'Active'} />
              </div>
              <p className="mt-2 min-h-12 text-sm font-semibold leading-6 text-slate-500">{plan.description}</p>
              <p className="mt-6 text-3xl font-black text-slate-950">{plan.price}</p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-400">{plan.jobLimit || 1} jobs / {plan.validityDays || 30} days / {plan.discountPercent || 0}% discount / {plan.coinPerJob || 10} coins per job / Sort {plan.sortOrder || index + 1}</p>
            </div>
            <div className="mt-7 grid gap-3">
              {plan.features.map((feature) => (
                <div className="flex items-center gap-3 rounded-[7px] bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700" key={feature}>
                  <span className="grid h-6 w-6 place-items-center rounded-[7px] bg-teal-50 text-teal-700">
                    <ShieldCheck size={15} />
                  </span>
                  {feature}
                </div>
              ))}
            </div>
            <button className="mt-auto rounded-[7px] bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700" type="button">
              {plan.buttonLabel || 'Start Hiring'}
            </button>
            <div className="mt-3 flex flex-wrap gap-2">
              <IconAction kind="edit" label="Edit package" onClick={() => openPackageModal(plan, index)} />
              <IconAction kind="delete" label="Delete package" onClick={() => deletePackage(index)} />
            </div>
          </AdminCard>
        ))}
      </div>
      <AdminModal open={packageModalOpen} title={editingPackageIndex === null ? 'Add Package' : 'Edit Package'} onClose={() => setPackageModalOpen(false)}>
        <div className="grid gap-5">
          <div className="rounded-[7px] border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Package Identity</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <LabeledInput label="Package name" onChange={(value) => setPackageForm((current) => ({ ...current, name: value }))} placeholder="Starter, Growth, Enterprise" value={packageForm.name} />
              <LabeledInput label="Display badge" onChange={(value) => setPackageForm((current) => ({ ...current, badge: value }))} placeholder="Popular, Best Value, Optional" value={packageForm.badge} />
              <LabeledInput className="sm:col-span-2" label="Short description" onChange={(value) => setPackageForm((current) => ({ ...current, description: value }))} placeholder="For growing hiring teams" value={packageForm.description} />
            </div>
          </div>

          <div className="rounded-[7px] border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Commercial Rules</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <LabeledInput label="Package price" onChange={(value) => setPackageForm((current) => ({ ...current, price: value }))} placeholder="INR 4,999" value={packageForm.price} />
              <LabeledInput label="Job post limit" min="1" onChange={(value) => setPackageForm((current) => ({ ...current, jobLimit: value }))} placeholder="10" type="number" value={packageForm.jobLimit} />
              <LabeledInput label="Validity days" min="1" onChange={(value) => setPackageForm((current) => ({ ...current, validityDays: value }))} placeholder="30" type="number" value={packageForm.validityDays} />
              <LabeledInput label="Discount percent" min="0" onChange={(value) => setPackageForm((current) => ({ ...current, discountPercent: value }))} placeholder="0" type="number" value={packageForm.discountPercent} />
              <LabeledInput label="Coins per job" min="1" onChange={(value) => setPackageForm((current) => ({ ...current, coinPerJob: value }))} placeholder="10" type="number" value={packageForm.coinPerJob} />
              <LabeledInput label="Sort order" min="1" onChange={(value) => setPackageForm((current) => ({ ...current, sortOrder: value }))} placeholder="1" type="number" value={packageForm.sortOrder} />
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Package status</span>
                <select className="input" onChange={(event) => setPackageForm((current) => ({ ...current, status: event.target.value }))} value={packageForm.status}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[7px] border border-slate-200 bg-white p-4">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">Recruiter Experience</p>
            <div className="mt-3 grid gap-3">
              <LabeledInput label="CTA button label" onChange={(value) => setPackageForm((current) => ({ ...current, buttonLabel: value }))} placeholder="Start Hiring" value={packageForm.buttonLabel} />
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Package features</span>
                <textarea className="input min-h-32" onChange={(event) => setPackageForm((current) => ({ ...current, features: event.target.value }))} placeholder="1 active job, Basic candidate visibility, Recruiter profile" value={packageForm.features} />
                <span className="text-xs font-semibold text-slate-400">Separate each feature with comma.</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={() => setPackageModalOpen(false)} type="button">Cancel</button>
          <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={savePackage} type="button">Save Package</button>
        </div>
      </AdminModal>
    </div>
  )
}

const defaultCoupons = [
  { code: 'WELCOME10', discount: '10%', packageName: 'Starter', status: 'Active', validTill: '31 Dec 2026' },
  { code: 'GROWTH20', discount: '20%', packageName: 'Growth', status: 'Active', validTill: '31 Dec 2026' },
]

export function AdminDiscountCouponPage() {
  const packageOptions = getPricingPackages()
  const [coupons, setCoupons] = useState(defaultCoupons)
  const [couponModalOpen, setCouponModalOpen] = useState(false)
  const [couponForm, setCouponForm] = useState({ code: '', discount: '', packageName: 'Starter', validTill: '', status: 'Active' })

  const saveCoupon = () => {
    if (!couponForm.code.trim() || !couponForm.discount.trim()) return

    setCoupons((current) => [...current, couponForm])
    setCouponForm({ code: '', discount: '', packageName: 'Starter', validTill: '', status: 'Active' })
    setCouponModalOpen(false)
  }

  return (
    <div className="grid gap-5">
      <Toolbar
        actionLabel="Add Coupon"
        onAction={() => setCouponModalOpen(true)}
        subtitle="Create and manage recruiter package discount coupons."
        title="Discount Coupon"
      />
      <AdminCard className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {['Coupon Code', 'Discount', 'Package', 'Status', 'Valid Till'].map((label) => (
                  <th className="whitespace-nowrap px-5 py-4 font-bold" key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {coupons.map((coupon) => (
                <tr className="transition hover:bg-blue-50/40" key={coupon.code}>
                  <td className="whitespace-nowrap px-5 py-4 font-black text-slate-800">{coupon.code}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{coupon.discount}</td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{coupon.packageName}</td>
                  <td className="whitespace-nowrap px-5 py-4"><StatusBadge status={coupon.status} /></td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600">{coupon.validTill || 'No expiry'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </AdminCard>
      <AdminModal open={couponModalOpen} title="Add Discount Coupon" onClose={() => setCouponModalOpen(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" onChange={(event) => setCouponForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))} placeholder="Coupon code" value={couponForm.code} />
          <input className="input" onChange={(event) => setCouponForm((current) => ({ ...current, discount: event.target.value }))} placeholder="Discount e.g. 10%" value={couponForm.discount} />
          <select className="input" onChange={(event) => setCouponForm((current) => ({ ...current, packageName: event.target.value }))} value={couponForm.packageName}>
            {packageOptions.map((plan) => <option key={plan.name}>{plan.name}</option>)}
          </select>
          <select className="input" onChange={(event) => setCouponForm((current) => ({ ...current, status: event.target.value }))} value={couponForm.status}>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <input className="input sm:col-span-2" onChange={(event) => setCouponForm((current) => ({ ...current, validTill: event.target.value }))} placeholder="Valid till" value={couponForm.validTill} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700" onClick={() => setCouponModalOpen(false)} type="button">Cancel</button>
          <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white" onClick={saveCoupon} type="button">Save Coupon</button>
        </div>
      </AdminModal>
    </div>
  )
}

const defaultGoogleAuthConfig = {
  enabled: true,
  clientId: '',
  projectId: '',
  authorizedDomains: '',
  notes: '',
}

const defaultSupaCloudConfig = {
  enabled: true,
  supabaseUrl: '',
  serviceRoleKey: '',
  resumeBucket: 'resumes',
  resumeFolder: 'hiring-team',
  documentBucket: 'documents',
  documentFolder: 'recruiter-documents',
  recruiterProfileBucket: 'recruiter-profiles',
  recruiterProfileFolder: 'logos',
  brandingBucket: 'branding',
  brandingFolder: 'site-assets',
  publicBucket: true,
  notes: '',
}

const defaultWhatsAppApiConfig = {
  enabled: true,
  provider: 'Meta WhatsApp Cloud API',
  phoneNumberId: '',
  businessAccountId: '',
  accessToken: '',
  otpTemplateName: '',
  defaultCountryCode: '+91',
  notes: '',
}

export function AdminWhatsAppApiPage() {
  const [settingId, setSettingId] = useState('')
  const [form, setForm] = useState(defaultWhatsAppApiConfig)
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setMessage('')
    api
      .list('settings', '?search=whatsappLoginApi&limit=10')
      .then((payload) => {
        const setting = (payload.data || []).find((item) => item.key === 'whatsappLoginApi')
        const value = setting?.value || {}
        setSettingId(setting?._id || '')
        setForm({
          ...defaultWhatsAppApiConfig,
          enabled: value.enabled !== false,
          provider: value.provider || defaultWhatsAppApiConfig.provider,
          phoneNumberId: value.phoneNumberId || '',
          businessAccountId: value.businessAccountId || '',
          accessToken: value.accessToken || '',
          otpTemplateName: value.otpTemplateName || '',
          defaultCountryCode: value.defaultCountryCode || '+91',
          notes: value.notes || '',
        })
      })
      .catch((error) => setMessage(error.message || 'WhatsApp API config could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setSaving(true)
    setMessage('')

    const payload = {
      key: 'whatsappLoginApi',
      group: 'auth',
      value: {
        enabled: Boolean(form.enabled),
        provider: form.provider.trim() || defaultWhatsAppApiConfig.provider,
        phoneNumberId: form.phoneNumberId.trim(),
        businessAccountId: form.businessAccountId.trim(),
        accessToken: form.accessToken.trim(),
        otpTemplateName: form.otpTemplateName.trim(),
        defaultCountryCode: form.defaultCountryCode.trim() || '+91',
        notes: form.notes.trim(),
      },
    }

    if (payload.value.enabled && (!payload.value.phoneNumberId || !payload.value.accessToken)) {
      setSaving(false)
      setMessage('Phone Number ID and Access Token are required when WhatsApp API is enabled.')
      return
    }

    try {
      if (settingId) {
        await api.update('settings', settingId, payload)
      } else {
        const created = await api.create('settings', payload)
        setSettingId(created.data?._id || '')
      }
      setMessage('WhatsApp API settings saved successfully.')
    } catch (error) {
      setMessage(error.message || 'WhatsApp API config could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-50">Settings / Auth API</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">WhatsApp API</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
              Configure WhatsApp OTP login provider details for mobile number login and forgot access flows.
            </p>
          </div>
          <StatusBadge status={form.enabled ? 'Active' : 'Inactive'} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <AdminCard>
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-600">WhatsApp Provider</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">OTP login configuration</h3>
            </div>
            <label className="flex items-center gap-3 rounded-[7px] bg-slate-50 px-4 py-2 text-sm font-black text-slate-600">
              <input checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} type="checkbox" />
              Enable WhatsApp Login
            </label>
          </div>

          {loading ? (
            <div className="mt-5 h-56 animate-pulse rounded-[7px] bg-slate-100" />
          ) : (
            <div className="mt-5 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <LabeledInput label="Provider" onChange={(value) => update('provider', value)} placeholder="Meta WhatsApp Cloud API" value={form.provider} />
                <LabeledInput label="Default Country Code" onChange={(value) => update('defaultCountryCode', value)} placeholder="+91" value={form.defaultCountryCode} />
                <LabeledInput label="Phone Number ID" onChange={(value) => update('phoneNumberId', value)} placeholder="Meta phone number ID" value={form.phoneNumberId} />
                <LabeledInput label="Business Account ID" onChange={(value) => update('businessAccountId', value)} placeholder="WhatsApp business account ID" value={form.businessAccountId} />
                <LabeledInput className="sm:col-span-2" label="OTP Template Name" onChange={(value) => update('otpTemplateName', value)} placeholder="login_otp" value={form.otpTemplateName} />
              </div>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Access Token</span>
                <textarea className="input min-h-24" onChange={(event) => update('accessToken', event.target.value)} placeholder="Paste WhatsApp Cloud API access token" value={form.accessToken} />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Internal Notes</span>
                <textarea className="input min-h-24" onChange={(event) => update('notes', event.target.value)} placeholder="Template status, provider notes, token rotation..." value={form.notes} />
              </label>
              {message && <p className="rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700" onClick={loadConfig} type="button">Refresh</button>
                <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-60" disabled={saving} onClick={save} type="button">
                  {saving ? 'Saving...' : 'Save WhatsApp API'}
                </button>
              </div>
            </div>
          )}
        </AdminCard>

        <div className="grid gap-5">
          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-teal-600">Login Flow</p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <p>1. User clicks WhatsApp login on the login page.</p>
              <p>2. Registered mobile number receives OTP.</p>
              <p>3. After OTP verification, the user is logged in directly.</p>
            </div>
          </AdminCard>
          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-blue-600">Integration Note</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              Settings are saved here. For actual WhatsApp message delivery, connect the backend sender service to the Meta or Twilio API.
            </p>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}

export function AdminGoogleAuthPage() {
  const [settingId, setSettingId] = useState('')
  const [form, setForm] = useState(defaultGoogleAuthConfig)
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setMessage('')
    api
      .list('settings', '?search=googleAuthLogin&limit=10')
      .then((payload) => {
        const setting = (payload.data || []).find((item) => item.key === 'googleAuthLogin')
        const value = setting?.value || {}
        setSettingId(setting?._id || '')
        setForm({
          enabled: value.enabled !== false,
          clientId: value.clientId || '',
          projectId: value.projectId || '',
          authorizedDomains: Array.isArray(value.authorizedDomains) ? value.authorizedDomains.join(', ') : '',
          notes: value.notes || '',
        })
      })
      .catch((error) => setMessage(error.message || 'Google auth config could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setSaving(true)
    setMessage('')

    const payload = {
      key: 'googleAuthLogin',
      group: 'package',
      value: {
        enabled: Boolean(form.enabled),
        clientId: form.clientId.trim(),
        projectId: form.projectId.trim(),
        authorizedDomains: splitComma(form.authorizedDomains),
        notes: form.notes.trim(),
      },
    }

    if (!payload.value.clientId) {
      setSaving(false)
      setMessage('Google OAuth Client ID is required.')
      return
    }

    try {
      if (settingId) {
        await api.update('settings', settingId, payload)
      } else {
        const created = await api.create('settings', payload)
        setSettingId(created.data?._id || '')
      }
      setMessage('Google Auth Login API saved successfully. Frontend login buttons will use this dynamic config.')
    } catch (error) {
      setMessage(error.message || 'Google auth config could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-50">Settings / API Configuration</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Google Auth Login API</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
              Configure Google OAuth login dynamically for user, candidate, and recruiter registration/login workflows.
            </p>
          </div>
          <StatusBadge status={form.enabled ? 'Active' : 'Inactive'} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <AdminCard>
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-600">OAuth Client</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Google login configuration</h3>
            </div>
            <label className="flex items-center gap-3 rounded-[7px] bg-slate-50 px-4 py-2 text-sm font-black text-slate-600">
              <input checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} type="checkbox" />
              Enable Google Auth
            </label>
          </div>

          {loading ? (
            <div className="mt-5 h-48 animate-pulse rounded-[7px] bg-slate-100" />
          ) : (
            <div className="mt-5 grid gap-4">
              <LabeledInput label="Google OAuth Client ID" onChange={(value) => update('clientId', value)} placeholder="xxxx.apps.googleusercontent.com" value={form.clientId} />
              <LabeledInput label="Google Cloud Project ID" onChange={(value) => update('projectId', value)} placeholder="inseet-auth" value={form.projectId} />
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Authorized domains</span>
                <textarea
                  className="input min-h-24"
                  onChange={(event) => update('authorizedDomains', event.target.value)}
                  placeholder="www.inseet.in, inseet.in"
                  value={form.authorizedDomains}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Internal notes</span>
                <textarea
                  className="input min-h-24"
                  onChange={(event) => update('notes', event.target.value)}
                  placeholder="OAuth consent screen, production domain, support owner..."
                  value={form.notes}
                />
              </label>
              {message && <p className="rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700" onClick={loadConfig} type="button">Refresh</button>
                <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-60" disabled={saving} onClick={save} type="button">
                  {saving ? 'Saving...' : 'Save Google Auth API'}
                </button>
              </div>
            </div>
          )}
        </AdminCard>

        <div className="grid gap-5">
          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-teal-600">Runtime Usage</p>
            <h3 className="mt-1 text-xl font-black text-slate-950">Dynamic login behavior</h3>
            <div className="mt-4 grid gap-3">
              {[
                ['User frontend', 'Candidate/user Google login and registration buttons use this client ID.'],
                ['Recruiter frontend', 'Recruiter login/register Google buttons use the same verified config.'],
                ['Backend verify', 'Server verifies Google ID tokens against this dynamic client ID.'],
              ].map(([title, text]) => (
                <div className="rounded-[7px] bg-slate-50 p-4" key={title}>
                  <p className="font-black text-slate-950">{title}</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{text}</p>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-blue-600">Setup Checklist</p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <p>1. Create OAuth Client ID in Google Cloud Console.</p>
              <p>2. Add frontend domains in Authorized JavaScript origins.</p>
              <p>3. Paste Client ID here and save.</p>
              <p>4. Test user and recruiter Google login flows.</p>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}

export function AdminSupaCloudPage() {
  const [settingId, setSettingId] = useState('')
  const [form, setForm] = useState(defaultSupaCloudConfig)
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setMessage('')
    api
      .list('settings', '?search=supaCloudStorage&limit=10')
      .then((payload) => {
        const setting = (payload.data || []).find((item) => item.key === 'supaCloudStorage')
        const value = setting?.value || {}
        setSettingId(setting?._id || '')
        setForm({
          enabled: value.enabled !== false,
          supabaseUrl: value.supabaseUrl || '',
          serviceRoleKey: value.serviceRoleKey || '',
          resumeBucket: value.resumeBucket || value.bucket || 'resumes',
          resumeFolder: value.resumeFolder || value.folder || 'hiring-team',
          documentBucket: value.documentBucket || 'documents',
          documentFolder: value.documentFolder || 'recruiter-documents',
          recruiterProfileBucket: value.recruiterProfileBucket || 'recruiter-profiles',
          recruiterProfileFolder: value.recruiterProfileFolder || 'logos',
          brandingBucket: value.brandingBucket || 'branding',
          brandingFolder: value.brandingFolder || 'site-assets',
          publicBucket: value.publicBucket !== false,
          notes: value.notes || '',
        })
      })
      .catch((error) => setMessage(error.message || 'Supa Cloud config could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const save = async () => {
    setSaving(true)
    setMessage('')

    const payload = {
      key: 'supaCloudStorage',
      group: 'storage',
      value: {
        enabled: Boolean(form.enabled),
        supabaseUrl: form.supabaseUrl.trim().replace(/\/+$/, ''),
        serviceRoleKey: form.serviceRoleKey.trim(),
        resumeBucket: form.resumeBucket.trim() || 'resumes',
        resumeFolder: form.resumeFolder.trim() || 'hiring-team',
        documentBucket: form.documentBucket.trim() || 'documents',
        documentFolder: form.documentFolder.trim() || 'recruiter-documents',
        recruiterProfileBucket: form.recruiterProfileBucket.trim() || 'recruiter-profiles',
        recruiterProfileFolder: form.recruiterProfileFolder.trim() || 'logos',
        brandingBucket: form.brandingBucket.trim() || 'branding',
        brandingFolder: form.brandingFolder.trim() || 'site-assets',
        publicBucket: Boolean(form.publicBucket),
        notes: form.notes.trim(),
      },
    }

    if (!payload.value.supabaseUrl || !payload.value.serviceRoleKey || !payload.value.resumeBucket || !payload.value.documentBucket || !payload.value.recruiterProfileBucket || !payload.value.brandingBucket) {
      setSaving(false)
      setMessage('Supa Cloud URL, service role key, resume bucket, document bucket, recruiter profile bucket, and branding bucket are required.')
      return
    }

    try {
      if (settingId) {
        await api.update('settings', settingId, payload)
      } else {
        const created = await api.create('settings', payload)
        setSettingId(created.data?._id || '')
      }
      setMessage('Supa Cloud storage saved successfully. Resume, document, recruiter profile, and branding uploads will use these paths.')
    } catch (error) {
      setMessage(error.message || 'Supa Cloud config could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-50">Settings / Storage Configuration</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">Supa Cloud Storage</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
              Configure Supabase/Supa Cloud storage for resumes, recruiter documents, recruiter profiles, and website branding assets.
            </p>
          </div>
          <StatusBadge status={form.enabled ? 'Active' : 'Inactive'} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.75fr]">
        <AdminCard>
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-600">Storage API</p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">Supa Cloud upload paths</h3>
            </div>
            <label className="flex items-center gap-3 rounded-[7px] bg-slate-50 px-4 py-2 text-sm font-black text-slate-600">
              <input checked={form.enabled} onChange={(event) => update('enabled', event.target.checked)} type="checkbox" />
              Enable Supa Cloud
            </label>
          </div>

          {loading ? (
            <div className="mt-5 h-48 animate-pulse rounded-[7px] bg-slate-100" />
          ) : (
            <div className="mt-5 grid gap-4">
              <LabeledInput label="Supa Cloud / Supabase URL" onChange={(value) => update('supabaseUrl', value)} placeholder="https://xxxx.supabase.co" value={form.supabaseUrl} />
              <LabeledInput label="Service Role Key" onChange={(value) => update('serviceRoleKey', value)} placeholder="Paste service_role key" value={form.serviceRoleKey} />
              <div className="grid gap-4 rounded-[7px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-black uppercase tracking-wide text-blue-600 sm:col-span-2">Resume Storage</p>
                <LabeledInput label="Resume Bucket" onChange={(value) => update('resumeBucket', value)} placeholder="resumes" value={form.resumeBucket} />
                <LabeledInput label="Resume Folder Path" onChange={(value) => update('resumeFolder', value)} placeholder="hiring-team" value={form.resumeFolder} />
              </div>
              <div className="grid gap-4 rounded-[7px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-black uppercase tracking-wide text-blue-600 sm:col-span-2">Recruiter Document Storage</p>
                <LabeledInput label="Document Bucket" onChange={(value) => update('documentBucket', value)} placeholder="documents" value={form.documentBucket} />
                <LabeledInput label="Document Folder Path" onChange={(value) => update('documentFolder', value)} placeholder="recruiter-documents" value={form.documentFolder} />
              </div>
              <div className="grid gap-4 rounded-[7px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-black uppercase tracking-wide text-blue-600 sm:col-span-2">Recruiter Profile Storage</p>
                <LabeledInput label="Recruiter Profile Bucket" onChange={(value) => update('recruiterProfileBucket', value)} placeholder="recruiter-profiles" value={form.recruiterProfileBucket} />
                <LabeledInput label="Recruiter Profile Folder Path" onChange={(value) => update('recruiterProfileFolder', value)} placeholder="logos" value={form.recruiterProfileFolder} />
              </div>
              <div className="grid gap-4 rounded-[7px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
                <p className="text-sm font-black uppercase tracking-wide text-blue-600 sm:col-span-2">Logo / Branding Storage</p>
                <LabeledInput label="Branding Bucket" onChange={(value) => update('brandingBucket', value)} placeholder="branding" value={form.brandingBucket} />
                <LabeledInput label="Branding Folder Path" onChange={(value) => update('brandingFolder', value)} placeholder="site-assets" value={form.brandingFolder} />
              </div>
              <label className="flex items-center gap-3 rounded-[7px] bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
                <input checked={form.publicBucket} onChange={(event) => update('publicBucket', event.target.checked)} type="checkbox" />
                Buckets are public, save public file URLs
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">Internal notes</span>
                <textarea className="input min-h-24" onChange={(event) => update('notes', event.target.value)} placeholder="Bucket policy, owner, setup notes..." value={form.notes} />
              </label>
              {message && <p className="rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700" onClick={loadConfig} type="button">Refresh</button>
                <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-60" disabled={saving} onClick={save} type="button">
                  {saving ? 'Saving...' : 'Save Supa Cloud'}
                </button>
              </div>
            </div>
          )}
        </AdminCard>

        <div className="grid gap-5">
          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-teal-600">Upload Flow</p>
            <div className="mt-4 grid gap-3 text-sm font-semibold text-slate-600">
              <p>1. Resume PDFs upload to resume bucket/folder.</p>
              <p>2. Recruiter PAN, GST, offer letter, and Aadhar PDFs upload to document bucket/folder.</p>
              <p>3. Website logo and favicon upload to branding bucket/folder.</p>
              <p>4. MongoDB stores metadata, storage path, public URL, and form details.</p>
            </div>
          </AdminCard>
          <AdminCard>
            <p className="text-sm font-black uppercase tracking-wide text-blue-600">Security Note</p>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">
              Use the service role key only on the backend. This settings page saves it in MongoDB for server-side upload use.
            </p>
          </AdminCard>
        </div>
      </div>
    </div>
  )
}

export function AdminSEOBrandingPage() {
  const [form, setForm] = useState(defaultSiteBranding)
  const [message, setMessage] = useToastMessageState()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadConfig = () => {
    setLoading(true)
    setMessage('')
    api
      .siteBranding()
      .then((payload) => {
        const value = payload.data?.value || {}
        const next = normalizeSiteBranding({ ...defaultSiteBranding, ...value })
        setForm(next)
        applySiteBrandingMeta(next)
      })
      .catch((error) => setMessage(error.message || 'SEO branding config could not be loaded.'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const uploadBrandAsset = async (key, file) => {
    if (!file) return

    const isIconFile = key === 'faviconUrl' && file.name.toLowerCase().endsWith('.ico')
    if (!file.type.startsWith('image/') && !isIconFile) {
      setMessage('Please upload only image file for logo or favicon.')
      return
    }

    const data = new FormData()
    data.append('asset', file)
    data.append('field', key === 'logoUrl' ? 'logo' : 'favicon')
    if (form[key]) data.append('previousFileUrl', form[key])

    setSaving(true)
    setMessage('')

    try {
      const payload = await api.uploadBrandAssetToSupaCloud(data)
      const url = payload.data?.url
      if (!url) {
        setMessage('Brand asset uploaded, but public URL was not returned. Please check public bucket setting.')
        return
      }
      const nextBranding = publishSiteBranding({
        ...form,
        ...(payload.data?.branding || {}),
        [key]: url,
      })
      setForm(nextBranding)
      setMessage(`${key === 'logoUrl' ? 'Logo' : 'Favicon'} uploaded and published successfully.`)
    } catch (error) {
      setMessage(error.message || 'Brand asset could not be uploaded to Supa Cloud.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    setSaving(true)
    setMessage('')

    const payload = {
      siteName: form.siteName.trim() || defaultSiteBranding.siteName,
      adminName: form.adminName.trim() || defaultSiteBranding.adminName,
      recruiterName: form.recruiterName.trim() || defaultSiteBranding.recruiterName,
      logoUrl: form.logoUrl.trim(),
      faviconUrl: form.faviconUrl.trim(),
      tollFreeNumber: form.tollFreeNumber.trim(),
      recruiterEmail: form.recruiterEmail.trim() || defaultSiteBranding.recruiterEmail,
      recruiterFooterLocation: form.recruiterFooterLocation.trim() || defaultSiteBranding.recruiterFooterLocation,
      showRecruiterFooterLocation: form.showRecruiterFooterLocation !== false,
      heroBrandNames: Array.isArray(form.heroBrandNames)
        ? form.heroBrandNames.map((item) => String(item || '').trim()).filter(Boolean)
        : String(form.heroBrandNames || '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
      seoTitle: form.seoTitle.trim() || form.siteName.trim() || defaultSiteBranding.seoTitle,
      seoDescription: form.seoDescription.trim(),
      seoKeywords: form.seoKeywords.trim(),
      appDownloadTitle: form.appDownloadTitle.trim() || defaultSiteBranding.appDownloadTitle,
      playStoreLink: form.playStoreLink.trim(),
      appStoreLink: form.appStoreLink.trim(),
      appRating: form.appRating.trim() || defaultSiteBranding.appRating,
      appReviews: form.appReviews.trim() || defaultSiteBranding.appReviews,
      appDownloads: form.appDownloads.trim() || defaultSiteBranding.appDownloads,
    }

    try {
      const saved = await api.updateSiteBranding(payload)
      const savedSetting = saved.data || {}
      const nextBranding = publishSiteBranding({ ...(savedSetting.value || {}), ...payload })
      setForm(nextBranding)
      setMessage('SEO, logo, and favicon saved successfully.')
    } catch (error) {
      setMessage(error.message || 'SEO branding config could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-blue-50">Website Content / SEO</p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">SEO & Branding</h2>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
              Manage website logo, favicon, browser title, and SEO meta content from one place.
            </p>
          </div>
          <StatusBadge status="Website" />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_0.7fr]">
        <AdminCard>
          <div className="grid gap-4">
            {loading ? (
              <div className="h-56 animate-pulse rounded-[7px] bg-slate-100" />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <LabeledInput label="Frontend Site Name" onChange={(value) => update('siteName', value)} placeholder="INSEET" value={form.siteName} />
                  <LabeledInput label="Admin Name" onChange={(value) => update('adminName', value)} placeholder="INSEET Admin" value={form.adminName} />
                  <LabeledInput label="Recruiter Name" onChange={(value) => update('recruiterName', value)} placeholder="INSEET Recruiter" value={form.recruiterName} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <LabeledInput label="Toll-Free Number" onChange={(value) => update('tollFreeNumber', value)} placeholder="1800 000 0000" type="tel" value={form.tollFreeNumber} />
                  <LabeledInput label="Recruiter Email" onChange={(value) => update('recruiterEmail', value)} placeholder="support@inseet.in" type="email" value={form.recruiterEmail} />
                </div>
                <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                  <LabeledInput label="Recruiter Footer Location" onChange={(value) => update('recruiterFooterLocation', value)} placeholder="New Delhi, India" value={form.recruiterFooterLocation} />
                  <label className="inline-flex min-h-11 items-center gap-3 rounded-[7px] border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-700">
                    <input
                      checked={form.showRecruiterFooterLocation !== false}
                      className="h-4 w-4 accent-[#ff8a00]"
                      onChange={(event) => update('showRecruiterFooterLocation', event.target.checked)}
                      type="checkbox"
                    />
                    Show location
                  </label>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <BrandAssetUpload
                    accept="image/*"
                    label="Logo"
                    onChange={(value) => update('logoUrl', value)}
                    onUpload={(file) => uploadBrandAsset('logoUrl', file)}
                    placeholder="https://example.com/logo.png"
                    value={form.logoUrl}
                  />
                  <BrandAssetUpload
                    accept="image/*,.ico"
                    label="Favicon"
                    onChange={(value) => update('faviconUrl', value)}
                    onUpload={(file) => uploadBrandAsset('faviconUrl', file)}
                    placeholder="https://example.com/favicon.ico"
                    value={form.faviconUrl}
                  />
                </div>
                <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">Internship Course</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <LabeledInput label="Course Title" value={form.courseTitle || ''} onChange={(value) => update('courseTitle', value)} />
                    <LabeledInput label="Price in INR" type="number" min="0" value={form.coursePrice ?? '999'} onChange={(value) => update('coursePrice', value)} />
                    <LabeledInput label="Course Hours" value={form.courseHours || ''} onChange={(value) => update('courseHours', value)} />
                    <LabeledInput label="Access Duration" value={form.courseAccess || ''} onChange={(value) => update('courseAccess', value)} />
                    <LabeledInput label="Preview Video URL" type="url" value={form.coursePreviewUrl || ''} onChange={(value) => update('coursePreviewUrl', value)} />
                  </div>
                </div>
                <LabeledInput label="SEO Title" onChange={(value) => update('seoTitle', value)} placeholder="INSEET - Jobs and Hiring" value={form.seoTitle} />
                <div className="rounded-[7px] border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">App Download Popup</p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <LabeledInput label="Popup Title" onChange={(value) => update('appDownloadTitle', value)} placeholder="Download the INSEET App" value={form.appDownloadTitle || ''} />
                    <LabeledInput label="Play Store Link" onChange={(value) => update('playStoreLink', value)} placeholder="https://play.google.com/store/apps/details?id=..." value={form.playStoreLink || ''} />
                    <LabeledInput label="App Store Link" onChange={(value) => update('appStoreLink', value)} placeholder="https://apps.apple.com/app/..." value={form.appStoreLink || ''} />
                    <LabeledInput label="Rating" onChange={(value) => update('appRating', value)} placeholder="4.4" value={form.appRating || ''} />
                    <LabeledInput label="Reviews Text" onChange={(value) => update('appReviews', value)} placeholder="42K Reviews" value={form.appReviews || ''} />
                    <LabeledInput label="Downloads Text" onChange={(value) => update('appDownloads', value)} placeholder="50L+" value={form.appDownloads || ''} />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-slate-500">Play Store link update karte hi frontend popup QR code automatically isi link se generate hoga.</p>
                </div>
                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">Brand Names</span>
                  <textarea
                    className="input min-h-24"
                    onChange={(event) => update('heroBrandNames', event.target.value)}
                    placeholder="OYO&#10;paytm&#10;Nestle&#10;HCL&#10;bookmyshow&#10;NYKAA"
                    value={Array.isArray(form.heroBrandNames) ? form.heroBrandNames.join('\n') : (form.heroBrandNames || '')}
                  />
                  <span className="text-xs font-semibold text-slate-500">Home page moving brand bar mein ye names show honge. Ek line mein ek brand name add karein.</span>
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">SEO Description</span>
                  <textarea className="input min-h-24" onChange={(event) => update('seoDescription', event.target.value)} placeholder="Search engine description..." value={form.seoDescription} />
                </label>
                <label className="grid gap-1">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">SEO Keywords</span>
                  <textarea className="input min-h-20" onChange={(event) => update('seoKeywords', event.target.value)} placeholder="jobs, hiring, recruiters..." value={form.seoKeywords} />
                </label>
                {message && <p className="rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-700">{message}</p>}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-700" onClick={loadConfig} type="button">Refresh</button>
                  <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 disabled:opacity-60" disabled={saving} onClick={save} type="button">
                    {saving ? 'Saving...' : 'Save SEO & Branding'}
                  </button>
                </div>
              </>
            )}
          </div>
        </AdminCard>

        <AdminCard>
          <p className="text-sm font-black uppercase tracking-wide text-blue-600">Live Preview</p>
          <div className="mt-4 rounded-[7px] border border-slate-200 bg-slate-50 p-4">
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <PreviewBox label="Logo" value={form.logoUrl} />
              <PreviewBox label="Favicon" value={form.faviconUrl} />
            </div>
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 place-items-center">
                {form.logoUrl ? <img className="h-10 w-10 rounded-[7px] object-contain" src={form.logoUrl} alt="" /> : <BriefcaseBusiness size={24} />}
              </span>
              <div>
                <p className="text-lg font-black text-slate-950">{form.siteName || defaultSiteBranding.siteName}</p>
                <p className="text-sm font-semibold text-slate-500">{form.seoTitle || defaultSiteBranding.seoTitle}</p>
              </div>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">{form.seoDescription || defaultSiteBranding.seoDescription}</p>
            <p className="mt-3 text-sm font-black text-slate-800">Toll-Free: {form.tollFreeNumber || defaultSiteBranding.tollFreeNumber}</p>
            <p className="mt-2 text-sm font-black text-slate-800">Recruiter Email: {form.recruiterEmail || defaultSiteBranding.recruiterEmail}</p>
            {form.showRecruiterFooterLocation !== false && (
              <p className="mt-2 text-sm font-black text-slate-800">Location: {form.recruiterFooterLocation || defaultSiteBranding.recruiterFooterLocation}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {(Array.isArray(form.heroBrandNames) ? form.heroBrandNames : String(form.heroBrandNames || '').split(/\r?\n|,/))
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .map((brand) => (
                  <span className="rounded-[7px] bg-orange-50 px-3 py-1 text-xs font-black text-[#b85f00] ring-1 ring-orange-100" key={brand}>{brand}</span>
                ))}
            </div>
            <p className="mt-3 break-words text-xs font-bold text-blue-600">{form.seoKeywords || defaultSiteBranding.seoKeywords}</p>
          </div>
        </AdminCard>
      </div>
    </div>
  )
}

function BrandAssetUpload({ accept, label, onChange, onUpload, placeholder, value }) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <div className="grid gap-3 rounded-[7px] border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[5.5rem_1fr]">
        <PreviewBox compact label={label} value={value} />
        <div className="grid min-w-0 content-start gap-2">
          <input className="input min-w-0" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700">
            <ImagePlus size={17} />
            Upload {label}
            <input accept={accept} className="hidden" onChange={(event) => onUpload(event.target.files?.[0])} type="file" />
          </label>
        </div>
      </div>
    </div>
  )
}

function PreviewBox({ compact = false, label, value }) {
  const sizeClass = compact ? 'h-20 w-20' : 'h-24 w-full'

  return (
    <div className={`grid ${sizeClass} place-items-center overflow-hidden rounded-[7px] border border-dashed border-slate-300 bg-white p-2`}>
      {value ? (
        <img className="max-h-full max-w-full rounded-[7px] object-contain" src={value} alt={`${label} preview`} />
      ) : (
        <span className="text-center text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
      )}
    </div>
  )
}

export function AdminSettingsPage() {
  const items = [
    ['Google Auth API', '/admin/settings/google-auth', 'Google OAuth login client ID and authorized domains.'],
    ['WhatsApp API', '/admin/settings/whatsapp-api', 'WhatsApp OTP login provider, token, template, and sender IDs.'],
    ['Email API', '/admin/settings/email-api', 'Password reset email provider, sender, API key, and SMTP details.'],
    ['Razorpay Gateway', '/admin/settings/razorpay', 'Razorpay package payments, wallet coin checkout, and payment keys.'],
    ['Supa Cloud Storage', '/admin/settings/supa-cloud', 'Resume upload bucket, folder, and storage credentials.'],
    ['Role & Permission', '/admin/settings/role-permission', 'Control dashboard module permissions for every role.'],
  ]

  return (
    <div className="grid gap-5">
      <Toolbar actionLabel="Configuration" subtitle="Manage API, storage, database, and platform configuration pages." title="Settings" />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map(([title, to, text]) => (
          <Link className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100" key={title} to={to}>
            <p className="text-lg font-black text-slate-950">{title}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{text}</p>
            <span className="mt-4 inline-flex rounded-[7px] bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">Open Settings</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function splitComma(value) {
  if (Array.isArray(value)) return value
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function parsePolicySections(value) {
  if (Array.isArray(value)) return value
  return String(value || '')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const [heading = '', ...bodyLines] = block.split('\n')
      return {
        heading: heading.trim(),
        body: bodyLines.join('\n').trim(),
      }
    })
    .filter((section) => section.heading || section.body)
}

function rowToForm(row, fields) {
  return fields.reduce((acc, [key]) => {
    if (key === 'sectionsText') {
      acc[key] = Array.isArray(row.sections)
        ? row.sections.map((section) => [section.heading, section.body].filter(Boolean).join('\n')).join('\n\n')
        : ''
      return acc
    }
    acc[key] = Array.isArray(row[key]) ? row[key].join(', ') : toDateInputValue(row[key]) || row[key] || ''
    return acc
  }, {})
}

function normalizeUserManagementPayload(payload) {
  if (payload?.role !== 'recruiter') return payload

  const status = payload.status || 'Review'
  const verificationByStatus = {
    Active: 'approved',
    Review: 'documents_required',
    Inactive: 'rejected',
    Suspend: 'suspended',
  }

  return {
    ...payload,
    status,
    recruiterVerificationStatus: verificationByStatus[status] || payload.recruiterVerificationStatus || 'documents_required',
  }
}

function normalizeUserManagementRow(row) {
  if (row?.role !== 'recruiter') return row

  const recruiterVerificationStatus = row.recruiterVerificationStatus || 'documents_required'
  if (recruiterVerificationStatus === 'approved') return row

  return {
    ...row,
    status: row.status === 'Active' || !row.status ? 'Review' : row.status,
    recruiterVerificationStatus,
  }
}

function toDateInputValue(value) {
  if (!value || value === 'Today') return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function formatJobLocation(form) {
  return buildStateCountryLocation(form) || form.location || ''
}

function formatRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => {
        if (Array.isArray(value)) return [key, value.join(', ')]
        if (key === 'createdAt' && value) return [key, new Date(value).toLocaleDateString()]
        return [key, value]
      }),
    ),
  )
}
