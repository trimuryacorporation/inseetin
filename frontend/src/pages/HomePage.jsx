import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, BriefcaseBusiness, SearchCheck, Send, ShieldCheck, Target, TrendingUp } from 'lucide-react'
import { Button } from '../components/Button'
import { HeroBanner } from '../components/HeroBanner'
import { JobCard } from '../components/JobCard'
import { Section } from '../components/Section'
import { TestimonialSlider } from '../components/TestimonialSlider'
import { getStoredUser } from '../routes/authRouting'
import { api } from '../services/api'
import { createCompanyDetailPath } from '../utils/companyProfiles'
import { getAppliedJobs, getCandidateProfileStrength } from '../utils/candidateActivity'
import { decorateCategories } from '../utils/portalResources'

export function HomePage({ onApply }) {
  const [liveJobs, setLiveJobs] = useState([])
  const [liveCompanies, setLiveCompanies] = useState([])
  const [categories, setCategories] = useState([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobsError, setJobsError] = useState('')

  useEffect(() => {
    let active = true

    api.jobListings('?sort=-createdAt')
      .then((payload) => {
        if (active) setLiveJobs(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(() => {
        if (active) {
          setLiveJobs([])
          setJobsError('Jobs could not be loaded. Please try again shortly.')
        }
      })
      .finally(() => { if (active) setJobsLoading(false) })

    api.companyProfiles()
      .then((payload) => {
        if (active) setLiveCompanies(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(() => { if (active) setLiveCompanies([]) })

    api.listAll('categories', '?status=Active&sort=name')
      .then((payload) => {
        if (active) setCategories(decorateCategories(Array.isArray(payload.data) ? payload.data : []))
      })
      .catch(() => {
        if (active) setCategories([])
      })

    return () => {
      active = false
    }
  }, [])

  const premiumJobs = useMemo(() => getLatestPremiumJobs(liveJobs), [liveJobs])
  const latestJobs = useMemo(() => premiumJobs.slice(0, 6), [premiumJobs])

  return (
    <>
      <HeroBanner categories={categories} jobs={liveJobs} loading={jobsLoading} companies={liveCompanies} />

      <MobileHomeJobs jobs={latestJobs} loading={jobsLoading} error={jobsError} onApply={onApply} />

      {liveCompanies.length > 0 && (
        <Section className="bg-white md:hidden" title="Trusted companies hiring on INSEET" subtitle="Verified recruiters with active openings.">
          <CompanyGrid companies={liveCompanies} compactMobile />
        </Section>
      )}

      <div className="hidden md:block">
        <LatestJobsSection hasMore={premiumJobs.length > 2} jobs={latestJobs} loading={jobsLoading} error={jobsError} onApply={onApply} />

        {liveCompanies.length > 0 && (
          <Section className="bg-white" title="Trusted companies hiring on INSEET" subtitle="Verified recruiter profiles with active openings and transparent role information.">
            <CompanyGrid companies={liveCompanies} />
          </Section>
        )}

        <CareerFocusBand jobs={liveJobs} />

      </div>

      <TrustedByCandidates />
    </>
  )
}

function MobileHomeJobs({ jobs = [], loading, error, onApply }) {
  return (
    <section className="bg-slate-50 px-2 py-4 md:hidden">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-blue-600">Recommended</p>
          <h2 className="text-lg font-black text-slate-950">Latest Jobs</h2>
        </div>
        <Link className="rounded-[7px] bg-blue-50 px-3 py-2 text-xs font-black text-blue-700" to="/jobs">View all</Link>
      </div>
      {loading ? <p role="status" className="p-4 text-sm text-slate-500">Loading latest jobs...</p> : error ? <p role="alert" className="p-4 text-sm text-rose-700">{error}</p> : jobs.length ? (
        <div className="grid grid-cols-2 gap-2">
          {jobs.slice(0, 4).map((job) => <JobCard denseMobile job={job} key={job._id || job.id} onApply={onApply} />)}
        </div>
      ) : (
        <div className="rounded-[7px] border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-500">
          No active jobs yet.
        </div>
      )}
    </section>
  )
}

function TrustedByCandidates() {
  return (
    <TestimonialSlider />
  )
}

function CareerFocusBand({ jobs = [] }) {
  const user = getStoredUser()
  const readActivity = () => ({ strength: user ? getCandidateProfileStrength() : 0, applied: getAppliedJobs(user).length })
  const [activity, setActivity] = useState(readActivity)

  useEffect(() => {
    const update = () => setActivity(readActivity())
    window.addEventListener('candidateActivityChanged', update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener('candidateActivityChanged', update)
      window.removeEventListener('storage', update)
    }
  }, [user?.id, user?.email])

  return (
    <section className="bg-[#f7fbff] py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-[0.88fr_1.45fr]">
          <div className="relative overflow-hidden rounded-[7px] bg-[#0057B8] p-5 text-white shadow-xl shadow-blue-100 sm:p-6">
            <div className="absolute -right-10 top-16 h-28 w-28 rounded-full border-[18px] border-white/10" />
            <div className="absolute bottom-8 left-10 grid grid-cols-6 gap-2 opacity-20">
              {Array.from({ length: 24 }).map((_, index) => <span className="h-1.5 w-1.5 rounded-full bg-white" key={index} />)}
            </div>
            <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-white/15 ring-1 ring-white/15"><BriefcaseBusiness size={24} /></span>
            <p className="mt-4 text-xs font-black uppercase tracking-[0.22em] text-blue-100">Career workspace</p>
            <h2 className="mt-3 max-w-lg text-2xl font-black leading-tight sm:text-3xl">One place for jobs, profiles, saves, and applications</h2>
            <span className="mt-4 block h-0.5 w-12 rounded-full bg-[#ff8a00]" />
            <p className="mt-4 max-w-lg text-sm font-semibold leading-6 text-blue-50">
              Build your candidate profile once, then use it to apply faster, track status, and stay ready for recruiter shortlisting.
            </p>
            <div className="relative mt-6 rounded-[7px] border border-white/20 bg-white p-3 text-slate-900 shadow-xl shadow-blue-950/20">
              <div className="grid gap-3 sm:grid-cols-[90px_1fr_120px]">
                <div className="rounded-[7px] bg-[#0057B8] p-2 text-[11px] font-bold text-white">
                  {['Overview', 'Applied Jobs', 'Saved Jobs', 'Applications', 'Profile'].map((item) => <p className="py-1" key={item}>{item}</p>)}
                </div>
                <div className="rounded-[7px] bg-slate-50 p-3">
                  <p className="text-xs font-black">{user?.name ? `Welcome back, ${user.name}` : 'Your career workspace'}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-[7px] bg-white p-2 shadow-sm">
                      <p className="text-xs font-bold text-slate-500">Profile Strength</p>
                      <p className="mt-1 text-xl font-black text-emerald-600">{activity.strength}%</p>
                    </div>
                    <div className="rounded-[7px] bg-white p-2 shadow-sm">
                      <p className="text-xs font-bold text-slate-500">Recent Applications</p>
                      <p className="mt-1 text-xl font-black text-[#0057B8]">{activity.applied}</p>
                    </div>
                  </div>
                </div>
                <div className="hidden rounded-[7px] bg-slate-50 p-2 text-[11px] font-bold text-slate-600 sm:block">
                  <p className="font-black text-slate-950">Latest Jobs</p>
                  {jobs.slice(0, 3).map((job) => job.title).map((item) => <p className="mt-2 rounded-[7px] bg-white px-2 py-1.5 shadow-sm" key={item}>{item}</p>)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {['Profile-led matching', 'Saved jobs', 'Application tracking'].map((item) => (
                <span className="rounded-[7px] bg-white/14 px-3 py-1.5 text-xs font-black text-white ring-1 ring-white/10" key={item}>{item}</span>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              [ShieldCheck, 'Verified Recruiters', 'Connect with trusted companies and genuine hiring teams.', 'bg-blue-50 text-[#0057B8]'],
              [BriefcaseBusiness, 'Flexible Work Modes', 'Find full-time, part-time, remote, hybrid, contract, and freelance jobs that fit your lifestyle.', 'bg-green-50 text-[#21a943]'],
              [Send, 'Fast Apply', 'Apply faster using your saved profile and resume with one click.', 'bg-orange-50 text-[#ff8a00]'],
              [Bookmark, 'Saved Jobs', 'Bookmark jobs that interest you and apply when you are ready.', 'bg-violet-50 text-[#6d37dc]'],
              [TrendingUp, 'Application Tracking', 'Track your applications and get real-time updates at every step.', 'bg-cyan-50 text-cyan-600'],
              [Target, 'Smart Matching', 'Get job recommendations based on your skills, experience and preferences.', 'bg-pink-50 text-pink-600'],
            ].map(([Icon, title, text, tone]) => (
              <article className="rounded-[7px] border border-slate-200 bg-white p-4 shadow-lg shadow-blue-100/40 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100" key={title}>
                <span className={`grid h-12 w-12 place-items-center rounded-[13px] ${tone}`}>
                  <Icon size={24} strokeWidth={1.9} />
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                <span className={`mt-3 block h-0.5 w-10 rounded-full ${title.includes('Recruiters') ? 'bg-[#0057B8]' : title.includes('Modes') ? 'bg-[#21a943]' : title.includes('Apply') ? 'bg-[#ff8a00]' : title.includes('Saved') ? 'bg-[#6d37dc]' : title.includes('Tracking') ? 'bg-cyan-500' : 'bg-pink-500'}`} />
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function LatestJobsSection({ hasMore = false, jobs: latestJobs, loading, error, onApply }) {
  return (
    <section className="bg-[#fbfaf7] py-14 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-8 max-w-3xl text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Latest Jobs</h2>
          <span className="mx-auto mt-2 block h-1 w-14 rounded-full bg-[#178955]" />
          <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
            Fresh verified openings from active recruiters, updated as new jobs are approved.
          </p>
        </div>
        {loading ? <p role="status" className="py-8 text-center text-slate-500">Loading latest jobs...</p> : error ? <p role="alert" className="rounded-lg bg-rose-50 p-5 text-center text-rose-700">{error}</p> : <LatestJobsGrid hasMore={hasMore} jobs={latestJobs} onApply={onApply} />}
      </div>
    </section>
  )
}

function LatestJobsGrid({ hasMore = false, jobs: latestJobs, onApply }) {
  if (!latestJobs.length) {
    return (
      <div className="rounded-[7px] border border-dashed border-slate-300 bg-white p-10 text-center">
        <SearchCheck className="mx-auto text-blue-500" size={34} />
        <h3 className="mt-4 text-2xl font-black text-slate-950">No premium openings yet</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
          When recruiters post approved active jobs, the latest openings will appear here automatically.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        {latestJobs.slice(0, 2).map((job) => <JobCard homeLatest job={job} key={job._id || job.id} onApply={onApply} />)}
      </div>
      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button className="min-h-10 bg-[#178955] px-5 text-xs font-black shadow-lg shadow-emerald-100 hover:bg-[#126f45]" to="/jobs" variant="primary">More Jobs</Button>
        </div>
      )}
    </>
  )
}

function getLatestPremiumJobs(jobs = []) {
  return jobs
    .map((job) => ({ ...normalizeJob(job), premiumScore: getPremiumJobScore(job) }))
    .sort((a, b) => {
      const dateDiff = new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      if (dateDiff) return dateDiff
      return b.premiumScore - a.premiumScore
    })
}

function normalizeJob(job) {
  return {
    ...job,
    skills: Array.isArray(job.skills) ? job.skills : String(job.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean),
    responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    benefits: Array.isArray(job.benefits) ? job.benefits : [],
  }
}

function getPremiumJobScore(job) {
  const fields = [
    job.title,
    job.company,
    job.department,
    job.industry,
    job.location,
    job.salary,
    job.experience,
    job.type,
    job.workMode,
    job.deadline,
    job.description,
    ...(Array.isArray(job.skills) ? job.skills : []),
  ]
  const completed = fields.filter((value) => String(value || '').trim()).length
  const recruiterBoost = job.recruiterEmail ? 3 : 0
  const packageBoost = job.packageName ? 2 : 0
  return completed + recruiterBoost + packageBoost
}

export function CompanyGrid({ compactMobile = false, companies = [] }) {
  const [showAllMobileCompanies, setShowAllMobileCompanies] = useState(false)
  const list = useMemo(() => companies, [companies])
  const visibleList = compactMobile
    ? (showAllMobileCompanies ? list.slice(0, 6) : list.slice(0, 4))
    : list.slice(0, 3)

  return (
    <div className={`grid ${compactMobile ? 'grid-cols-2 gap-2' : 'gap-5 md:grid-cols-2 lg:grid-cols-3'}`}>
      {list.length ? visibleList.map((company) => (
        <div className={`rounded-[7px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100 ${compactMobile ? 'p-3' : 'p-6'}`} key={company.name}>
          <div className="flex items-start justify-between gap-2 sm:gap-4">
            <div className={`grid place-items-center rounded-[7px] bg-gradient-to-br ${company.accent} font-black text-white shadow-lg shadow-blue-100 ${compactMobile ? 'h-10 w-10 text-sm' : 'h-14 w-14 text-lg'}`}>{company.badge}</div>
            <span className={`rounded-[7px] bg-teal-50 font-black text-teal-700 ${compactMobile ? 'px-2 py-1 text-[10px]' : 'px-3 py-1 text-xs'}`}>{company.rating} rating</span>
          </div>
          <h3 className={`font-black text-slate-950 ${compactMobile ? 'mt-3 truncate text-sm' : 'mt-5 text-lg'}`}>{company.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{company.industry} · {company.location || 'Location not added'}</p>
          <p className="mt-4 text-sm font-bold text-blue-600">{company.openJobs} open jobs</p>
          <Button className="mt-5 w-full" to={createCompanyDetailPath(company)} variant="secondary">View Company</Button>
        </div>
      )) : (
        <div className="rounded-[7px] border border-dashed border-slate-300 bg-white p-6 text-sm font-semibold text-slate-500 md:col-span-2 lg:col-span-3">
          No company profiles yet. Add companies from admin to show them here.
        </div>
      )}
      {compactMobile && list.length > 4 && (
        <div className="col-span-2 flex justify-center">
          <button
            className="inline-flex min-h-9 items-center justify-center rounded-[7px] bg-[#0057B8] px-4 py-2 text-xs font-black text-white shadow-lg shadow-blue-100 transition hover:bg-[#004694]"
            onClick={() => setShowAllMobileCompanies((value) => !value)}
            type="button"
          >
            {showAllMobileCompanies ? 'Show Less' : 'More Companies'}
          </button>
        </div>
      )}
      {!compactMobile && list.length > 3 && (
        <div className="md:col-span-2 lg:col-span-3 text-center">
          <Button target="_blank" to="/companies" variant="secondary">More Companies</Button>
        </div>
      )}
    </div>
  )
}
