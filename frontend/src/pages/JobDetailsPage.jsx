import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Bookmark, Briefcase, Building2, CalendarDays, CheckCircle2, Copy, FileText, Mail, MapPin, MessageCircle, Monitor, Send, Share2, ShieldCheck, Wallet, X } from 'lucide-react'
import { Button } from '../components/Button'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { canSaveJobs, isJobSaved, toggleSavedJob } from '../utils/savedJobs'
import { getStoredUser } from '../routes/authRouting'
import { isSameAppliedJob } from '../utils/candidateActivity'
import { createJobDetailPath, extractJobIdFromSlug, findJobByRouteValue } from '../utils/jobRoutes'
import { formatStateCountryLocation } from '../utils/locationDisplay'

export function JobDetailsPage({ onApply }) {
  const { jobId, jobSlug } = useParams()
  const routeValue = jobSlug || jobId
  const resolvedJobId = extractJobIdFromSlug(routeValue)
  const navigate = useNavigate()
  const user = getStoredUser()
  const fallbackJob = {
    id: resolvedJobId,
    title: 'Job not found',
    company: 'INSEET',
    companyLogo: 'CR',
    department: '',
    location: '',
    salary: '',
    experience: '',
    type: '',
    workMode: '',
    posted: '',
    deadline: '',
    skills: [],
    description: 'This job is not available right now.',
    responsibilities: [],
    requirements: [],
    benefits: [],
    aboutCompany: '',
  }
  const shouldFetchById = /^[a-f\d]{24}$/i.test(resolvedJobId)
  const { data: apiJob } = useApiResource(async () => {
    if (shouldFetchById) return api.job(resolvedJobId)

    const payload = await api.jobListings('?sort=-createdAt')
    const jobs = Array.isArray(payload.data) ? payload.data : []
    return { data: findJobByRouteValue(jobs, routeValue) || fallbackJob }
  }, fallbackJob, [resolvedJobId, routeValue, shouldFetchById])
  const job = apiJob || fallbackJob
  const displayLocation = formatStateCountryLocation(job.location)
  const [saved, setSaved] = useState(() => isJobSaved(job))
  const [shareOpen, setShareOpen] = useState(false)
  const [alreadyApplied, setAlreadyApplied] = useState(false)
  const [similarJobs, setSimilarJobs] = useState([])
  const [similarLoading, setSimilarLoading] = useState(true)

  useEffect(() => {
    const syncSaved = () => setSaved(isJobSaved(job))
    window.addEventListener('savedJobsChanged', syncSaved)
    window.addEventListener('storage', syncSaved)
    syncSaved()

    return () => {
      window.removeEventListener('savedJobsChanged', syncSaved)
      window.removeEventListener('storage', syncSaved)
    }
  }, [job])

  useEffect(() => {
    let active = true

    const syncApplications = async () => {
      if (user?.role !== 'Candidate' || !user?.email) {
        setAlreadyApplied(false)
        return
      }

      try {
        const payload = await api.list('applications', `?candidateEmail=${encodeURIComponent(user.email)}&limit=100`)
        const applications = Array.isArray(payload.data) ? payload.data : []
        if (active) setAlreadyApplied(applications.some((application) => isSameAppliedJob(application, job)))
      } catch {
        if (active) setAlreadyApplied(false)
      }
    }

    window.addEventListener('candidateActivityChanged', syncApplications)
    window.addEventListener('storage', syncApplications)
    syncApplications()

    return () => {
      active = false
      window.removeEventListener('candidateActivityChanged', syncApplications)
      window.removeEventListener('storage', syncApplications)
    }
  }, [job, user?.email, user?.role])

  useEffect(() => {
    let active = true

    const loadSimilarJobs = async () => {
      setSimilarLoading(true)
      try {
        const payload = await api.jobListings('?sort=-createdAt')
        const list = Array.isArray(payload.data) ? payload.data : []
        const ranked = rankSimilarJobs(list, job)
        if (active) setSimilarJobs(ranked.slice(0, 3))
      } catch {
        if (active) setSimilarJobs([])
      } finally {
        if (active) setSimilarLoading(false)
      }
    }

    if (job?.title && job.title !== 'Job not found') {
      loadSimilarJobs()
    } else {
      setSimilarJobs([])
      setSimilarLoading(false)
    }

    return () => {
      active = false
    }
  }, [job])

  const saveJob = () => {
    if (!canSaveJobs()) {
      window.dispatchEvent(new CustomEvent('portalToast', {
        detail: {
          title: 'Login required',
          message: 'Please login as a candidate to save jobs.',
          type: 'info',
          actionLabel: 'Login',
          actionHref: '/auth',
          duration: 2500,
        },
      }))
      window.setTimeout(() => window.location.assign('/auth'), 900)
      return
    }

    const result = toggleSavedJob(job)
    setSaved(result.saved)
  }

  const overviewItems = [
    [Monitor, 'Job Type', job.type],
    [CalendarDays, 'Posted', job.posted],
    [CalendarDays, 'Deadline', job.deadline],
    [Building2, 'Company', job.company],
    [Briefcase, 'Department', job.department],
    [MapPin, 'Work Mode', job.workMode],
  ]
  const sections = [
    ['Job Description', [job.description], FileText],
    ['Responsibilities', job.responsibilities, CheckCircle2],
    ['Requirements', job.requirements, ShieldCheck],
    ['Benefits', job.benefits, Wallet],
    ['About Company', [job.aboutCompany], Building2],
  ]

  return (
    <section className="overflow-x-hidden bg-[#f6f9fc] pb-24 sm:pb-16">
      <div className="border-b border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)]">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-xl shadow-blue-100/50">
            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[1fr_330px] lg:items-stretch">
              <div className="min-w-0">
                <div className="flex items-start gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-[linear-gradient(135deg,#0057B8,#0EA5E9)] text-xl font-black uppercase text-white shadow-lg shadow-blue-100">
                    {job.companyLogo || String(job.company || job.title || 'CR').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#0057B8]">{job.company || 'INSEET partner'}</p>
                    <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-5xl">{job.title}</h1>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {job.featured && <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">Featured</span>}
                      {job.urgent && <span className="rounded-[7px] bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100">Urgent hiring</span>}
                      <span className="rounded-[7px] bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{job.workMode || 'Work mode'}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-6 max-w-3xl text-sm font-semibold leading-7 text-slate-600 sm:text-base">
                  {job.description || 'Review this opening, check the role details, and apply with your candidate profile.'}
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MiniHeroMetric icon={MapPin} label="Location" value={displayLocation} />
                  <MiniHeroMetric icon={Wallet} label="Salary" value={job.salary} />
                  <MiniHeroMetric icon={Briefcase} label="Experience" value={job.experience} />
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-[8px] border border-blue-100 bg-[#f8fbff] p-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0057B8]">Quick action</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">Apply for this role</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Submit your candidate profile and track the application from your dashboard.</p>
                </div>
                <button
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-[7px] bg-[#0057B8] px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:bg-[#004694]"
                  onClick={() => (alreadyApplied ? navigate('/candidate-applied-jobs') : onApply?.(job))}
                  type="button"
                >
                  {alreadyApplied ? 'Already Applied' : 'Apply Now'}
                </button>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700" onClick={saveJob} type="button">
                    <Bookmark fill={saved ? 'currentColor' : 'none'} size={16} /> {saved ? 'Saved' : 'Save'}
                  </button>
                  <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] bg-white px-3 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-orange-50 hover:text-orange-700" onClick={() => setShareOpen(true)} type="button">
                    <Share2 size={16} /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <main className="min-w-0">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overviewItems.map(([Icon, label, value]) => <JobInfoTile icon={Icon} key={label} label={label} value={value} />)}
          </div>

          <div className="mt-5 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-black text-slate-950">Required skills</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(job.skills || []).filter(Boolean).length ? (
                (job.skills || []).filter(Boolean).map((item, index) => (
                  <span className="rounded-[7px] bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100" key={`skill-${index}-${item}`}>{item}</span>
                ))
              ) : (
                <span className="rounded-[7px] bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500">Skills not added</span>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-5">
            {sections.map(([title, items, Icon]) => <JobDetailSection icon={Icon} items={items} key={title} title={title} />)}
          </div>
        </main>

        <aside className="hidden h-max lg:sticky lg:top-24 lg:block">
          <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-xl shadow-blue-100/50">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">Apply for this role</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{job.title}</h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">Submit your profile before {job.deadline || 'the deadline'}.</p>
            <Button className="mt-5 w-full" onClick={() => (alreadyApplied ? navigate('/candidate-applied-jobs') : onApply?.(job))}>
              {alreadyApplied ? 'Already Applied' : 'Apply Now'}
            </Button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button onClick={saveJob} variant={saved ? 'primary' : 'secondary'}><Bookmark fill={saved ? 'currentColor' : 'none'} size={17} /> {saved ? 'Saved' : 'Save'}</Button>
              <Button onClick={() => setShareOpen(true)} variant="secondary"><Share2 size={17} /> Share</Button>
            </div>
          </div>

          <div className="mt-5 rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-black text-slate-950">Similar Jobs</h2>
            {similarLoading ? (
              <p className="mt-5 rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">Finding related jobs...</p>
            ) : similarJobs.length ? (
              <div className="mt-5 grid gap-3">
                {similarJobs.map((item, index) => <SimilarJobLink index={index + 1} job={item} key={item._id || item.id || item.title} />)}
              </div>
            ) : (
              <p className="mt-5 rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">No similar jobs available right now.</p>
            )}
          </div>
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 shadow-2xl shadow-slate-300/50 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_auto] gap-2">
          <Button className="min-h-11 px-4" onClick={() => (alreadyApplied ? navigate('/candidate-applied-jobs') : onApply?.(job))}>
            {alreadyApplied ? 'Already Applied' : 'Apply Now'}
          </Button>
          <button
            aria-label={saved ? 'Remove saved job' : 'Save job'}
            className={`grid h-11 w-11 place-items-center rounded-[7px] border text-sm font-black transition ${saved ? 'border-blue-200 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
            onClick={saveJob}
            type="button"
          >
            <Bookmark fill={saved ? 'currentColor' : 'none'} size={18} />
          </button>
          <button
            aria-label="Share job"
            className="grid h-11 w-11 place-items-center rounded-[7px] border border-slate-200 bg-white text-slate-600"
            onClick={() => setShareOpen(true)}
            type="button"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
      {shareOpen && <ShareModal job={job} onClose={() => setShareOpen(false)} />}
    </section>
  )
}

function JobInfoTile({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[7px] bg-blue-50 text-[#0057B8]">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1 break-words text-sm font-black text-slate-900">{value || 'Not specified'}</p>
        </div>
      </div>
    </div>
  )
}

function MiniHeroMetric({ icon: Icon, label, value }) {
  return (
    <div className="min-w-0 rounded-[7px] bg-slate-50 p-3 ring-1 ring-slate-100">
      <div className="flex items-center gap-2">
        <Icon className="shrink-0 text-[#0057B8]" size={16} />
        <p className="truncate text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      </div>
      <p className="mt-2 truncate text-sm font-black text-slate-900">{value || 'Not specified'}</p>
    </div>
  )
}

function JobDetailSection({ icon: Icon, items, title }) {
  const visibleItems = (items || []).filter(Boolean)

  return (
    <section className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[7px] bg-orange-50 text-[#ff8a00]">
          <Icon size={19} />
        </span>
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{title}</h2>
      </div>
      <div className="mt-5 grid gap-3 text-sm font-semibold leading-7 text-slate-600 sm:text-base">
        {visibleItems.length ? visibleItems.map((item, index) => (
          <p className="rounded-[7px] bg-slate-50 p-4" key={`${title}-${index}`}>{item}</p>
        )) : (
          <p className="rounded-[7px] bg-slate-50 p-4 text-slate-500">Not added</p>
        )}
      </div>
    </section>
  )
}

function SimilarJobLink({ index, job }) {
  return (
    <Link className="block rounded-[8px] border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50" to={createJobDetailPath(job, index)}>
      <p className="line-clamp-2 text-sm font-black text-slate-950">{job.title || 'Job opening'}</p>
      <p className="mt-1 truncate text-xs font-bold text-slate-500">{job.company || 'INSEET partner'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-[7px] bg-white px-2 py-1 text-[11px] font-black text-blue-700 ring-1 ring-blue-100">{job.workMode || 'Work mode'}</span>
        <span className="rounded-[7px] bg-white px-2 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">{job.salary || 'Salary'}</span>
      </div>
    </Link>
  )
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ')
}

function getSimilarJobTerms(job) {
  return [
    job.title,
    job.department,
    job.industry,
    job.type,
    job.workMode,
    job.location,
    ...(Array.isArray(job.skills) ? job.skills : []),
  ]
    .flatMap((value) => normalizeText(value).split(/\s+|,\s*/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
}

function isSameJob(left, right) {
  const leftId = String(left?._id || left?.id || '')
  const rightId = String(right?._id || right?.id || '')
  if (leftId && rightId && leftId === rightId) return true

  return normalizeText(left?.title) === normalizeText(right?.title)
    && normalizeText(left?.company) === normalizeText(right?.company)
}

function rankSimilarJobs(list, currentJob) {
  const terms = getSimilarJobTerms(currentJob)
  if (!terms.length) return []

  const currentDepartment = normalizeText(currentJob.department)
  const currentTitle = normalizeText(currentJob.title)
  const currentLocation = normalizeText(currentJob.location)

  return list
    .filter((item) => !isSameJob(item, currentJob))
    .map((item) => {
      const seoText = normalizeText([
        item.title,
        item.company,
        item.department,
        item.industry,
        item.description,
        item.location,
        item.type,
        item.workMode,
        ...(Array.isArray(item.skills) ? item.skills : []),
      ].filter(Boolean).join(' '))
      const keywordScore = terms.reduce((score, term) => score + (seoText.includes(term) ? 1 : 0), 0)
      const departmentBoost = currentDepartment && normalizeText(item.department).includes(currentDepartment) ? 4 : 0
      const titleBoost = currentTitle && normalizeText(item.title).split(/\s+/).some((word) => word.length > 2 && currentTitle.includes(word)) ? 3 : 0
      const locationBoost = currentLocation && normalizeText(item.location).includes(currentLocation) ? 1 : 0
      return { ...item, similarScore: keywordScore + departmentBoost + titleBoost + locationBoost }
    })
    .filter((item) => item.similarScore > 0)
    .sort((a, b) => b.similarScore - a.similarScore)
}

function ShareModal({ job, onClose }) {
  const [copied, setCopied] = useState(false)
  const url = typeof window !== 'undefined' ? window.location.href : ''
  const text = `${job.title} at ${job.company}`
  const encodedUrl = encodeURIComponent(url)
  const encodedText = encodeURIComponent(`${text} - ${url}`)

  const copyLink = async () => {
    await navigator.clipboard?.writeText(url)
    setCopied(true)
  }

  const shareLinks = [
    ['WhatsApp', `https://wa.me/?text=${encodedText}`, MessageCircle],
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, Share2],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, Share2],
    ['X', `https://twitter.com/intent/tweet?text=${encodedText}`, Share2],
    ['Telegram', `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`, Send],
    ['Email', `mailto:?subject=${encodeURIComponent(text)}&body=${encodedText}`, Mail],
  ]

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[7px] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Share job</p>
            <h3 className="mt-1 text-2xl font-black text-slate-950">{job.title}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{job.company}</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-[7px] bg-slate-100 text-slate-500" onClick={onClose} type="button" aria-label="Close share modal">
            <X size={18} />
          </button>
        </div>

        <div className="mt-5 flex gap-2 rounded-[7px] bg-slate-50 p-2">
          <input className="min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-600 outline-none" readOnly value={url} />
          <button className="inline-flex min-h-10 items-center gap-2 rounded-[7px] bg-blue-600 px-4 text-sm font-bold text-white" onClick={copyLink} type="button">
            <Copy size={16} />
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {shareLinks.map(([label, href, Icon]) => (
            <a className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-white px-4 py-2 text-sm font-black text-slate-700 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700" href={href} key={label} rel="noreferrer" target="_blank">
              <Icon size={17} />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
