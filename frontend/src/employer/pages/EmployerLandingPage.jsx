import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  FileSearch,
  Handshake,
  LineChart,
  LayoutDashboard,
  ListChecks,
  MapPin,
  MessageSquare,
  Play,
  Rocket,
  Sparkles,
  Star,
  UsersRound,
  X,
} from 'lucide-react'
import { Button } from '../../components/Button'
import { FeatureShowcase } from '../../components/FeatureShowcase'
import { api } from '../../services/api'
import { getStoredUser } from '../../routes/authRouting'
import heroImage from '../../assets/enterprise-hiring-banner.png'
import femaleRecruiterImage from '../../assets/recruiter-female-single.png'

const slides = [
  {
    badge: 'INSEET Recruiter Portal',
    title: 'Hire Verified Talent Faster With INSEET',
    subtitle: 'Post jobs, manage applications, shortlist candidates, and connect with skilled talent across India from one professional recruiter dashboard.',
    primary: 'Post a Job',
    secondary: 'View Candidates',
    metric: '94%',
    metricLabel: 'Candidate match',
    proof: ['Verified recruiter workflows', 'Live applicant tracking', 'Resume-ready talent pool'],
    to: '/post-job',
  },
  {
    badge: 'Pipeline control center',
    title: 'Manage Recruitment In One Place',
    subtitle: 'Track recruiter activity, shortlist candidates, and keep your hiring team aligned with clean pipeline visibility.',
    primary: 'Start Hiring',
    secondary: 'View Dashboard',
    metric: '+32%',
    metricLabel: 'Job performance',
    proof: ['Shortlist faster', 'Interview stage clarity', 'Team feedback tracking'],
    to: '/recruiter/recruiter-dashboard',
  },
  {
    badge: 'Talent brand builder',
    title: 'Build Your Dream Team',
    subtitle: 'Showcase your company, reach skilled professionals, and convert applications into reliable hires across industries.',
    primary: 'Register Recruiter',
    secondary: 'Explore Candidates',
    metric: '4x',
    metricLabel: 'Hiring reach',
    proof: ['Branded recruiter profile', 'Role-based discovery', 'Structured hiring flow'],
    to: '/recruiter-register',
  },
]

const features = [
  {
    icon: Sparkles,
    title: 'Verified Talent Matching',
    text: 'Match candidates based on skills, location, salary expectations, and availability with intelligent algorithms.',
    tone: 'blue',
    to: '/recruiter-talent',
  },
  {
    icon: Database,
    title: 'Resume Database',
    text: 'Search qualified profiles and build powerful, reusable candidate pools for current and future needs.',
    tone: 'green',
    to: '/recruiter-find-resume',
  },
  {
    icon: ListChecks,
    title: 'Applicant Tracking',
    text: 'Move candidates through every stage of hiring including review, shortlist, interview, and offer with ease.',
    tone: 'orange',
    to: '/recruiter-applications',
  },
  {
    icon: MessageSquare,
    title: 'Team Collaboration',
    text: 'Keep recruiters and hiring managers on the same page with comments, notes, and real-time updates.',
    tone: 'purple',
    to: '/recruiter-team',
  },
  {
    icon: BarChart3,
    title: 'Hiring Analytics',
    text: 'Track job performance, conversion rates, pipeline health, and time-to-hire with real-time analytics.',
    tone: 'blue',
    to: '/recruiter-analytics',
  },
  {
    icon: UsersRound,
    title: 'Bulk Hiring',
    text: 'Run high-volume recruitment campaigns with structured screening workflows and automation.',
    tone: 'pink',
    to: '/admin/crm/hiring/bulk',
  },
]

const processSteps = [
  {
    icon: LayoutDashboard,
    title: 'Create Recruiter Profile',
    text: 'Sign up and create your recruiter profile. Add company details and build your brand.',
    status: 'Completed',
    statusType: 'completed',
    tone: 'blue',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Post Job',
    text: 'Create job posts with detailed requirements and attract the right candidates.',
    status: 'Completed',
    statusType: 'completed',
    tone: 'green',
  },
  {
    icon: FileSearch,
    title: 'Review Applications',
    text: 'Review incoming applications, evaluate candidates and shortlist the best matches.',
    status: 'In Progress',
    statusType: 'progress',
    tone: 'orange',
  },
  {
    icon: Handshake,
    title: 'Hire Candidate',
    text: 'Select the perfect candidate and complete the hiring process with ease.',
    status: 'Pending',
    statusType: 'pending',
    tone: 'purple',
  },
]

const processBenefits = [
  {
    icon: CheckCircle2,
    title: 'Verified & Secure',
    text: 'All recruiter profiles are verified for trust and safety.',
    tone: 'blue',
  },
  {
    icon: UsersRound,
    title: 'Large Talent Pool',
    text: 'Access thousands of qualified candidates across industries.',
    tone: 'green',
  },
  {
    icon: Rocket,
    title: 'Fast & Efficient',
    text: 'Streamlined workflow to save time and hire faster.',
    tone: 'orange',
  },
  {
    icon: LineChart,
    title: 'Better Outcomes',
    text: 'Find the right talent and build high-performing teams.',
    tone: 'purple',
  },
]

export function EmployerLandingPage() {
  const user = getStoredUser()
  const isLoggedIn = Boolean(user?.email)
  const isRecruiterAccount = user?.role === 'recruiter'
  const [active, setActive] = useState(0)
  const [recruiters, setRecruiters] = useState([])
  const [jobs, setJobs] = useState([])
  const [documents, setDocuments] = useState([])
  const [videoTestimonials, setVideoTestimonials] = useState([])

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % slides.length), 4500)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let mounted = true

    api
      .recruiterPage()
      .then((payload) => {
        if (!mounted) return
        const data = payload.data || {}
        setRecruiters(Array.isArray(data.recruiters) ? data.recruiters : [])
        setJobs(Array.isArray(data.jobs) ? data.jobs : [])
        setDocuments(Array.isArray(data.documents) ? data.documents : [])
        setVideoTestimonials(Array.isArray(data.videoTestimonials) ? data.videoTestimonials : [])
      })
      .catch(() => {
        if (!mounted) return
        setRecruiters([])
        setJobs([])
        setDocuments([])
        setVideoTestimonials([])
      })

    return () => {
      mounted = false
    }
  }, [])

  const activeSlideAction = getRecruiterSlideAction(slides[active], user)
  const networkStats = useMemo(() => [
    [`${recruiters.length.toLocaleString('en-IN')}+`, 'Recruiters'],
    [`${jobs.filter((job) => job.accountDepartmentStatus === 'Active' || job.approval === 'Approved').length.toLocaleString('en-IN')}+`, 'Active Jobs'],
    [`${jobs.reduce((total, job) => total + Number(job.applicationsCount || 0), 0).toLocaleString('en-IN')}+`, 'Applications'],
    [`${documents.filter((document) => document.status === 'Approved').length.toLocaleString('en-IN')}+`, 'Verified Documents'],
  ], [documents, jobs, recruiters.length])

  return (
    <>
      <section className="relative overflow-hidden border-b border-[#b7ecf4] bg-[#e8fbff]">
        <div className="absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,#7bd3e8_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[1fr_0.62fr_0.68fr] lg:px-8 lg:py-0">
          <div className="py-2 lg:py-4">
            <h1 className="max-w-2xl text-2xl font-semibold leading-tight text-[#17466f] lg:text-[28px]">
              Recruit Right Candidate For Right Job
            </h1>
            <div className="mt-3 grid gap-1.5 text-sm font-medium text-slate-900">
              {[
                'Register and Post Jobs for Free Now!',
                'Over 2.5 Millions Verified Resume Database',
                'Unlimited Job Post & Hire Applicants Faster',
                'Search Professional CVs at Your Fingertips',
              ].map((item) => (
                <p className="flex items-center gap-3" key={item}>
                  <CheckCircle2 className="shrink-0 fill-[#1bc600] text-white" size={17} />
                  {item}
                </p>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="border border-[#ff8a00] bg-white !text-black shadow-none hover:bg-[#fff4e6] focus:ring-orange-100" to="/post-job">
                Post Jobs for Free
              </Button>
              <Button
                className="border border-[#ff8a00] bg-white !text-black shadow-none hover:bg-[#fff4e6] focus:ring-orange-100"
                to="/recruiter-find-resume"
                variant="secondary"
              >
                Search Resume
              </Button>
            </div>
          </div>

          <div className="relative hidden h-[410px] overflow-hidden lg:block">
            <img
              alt="Female recruiter using laptop"
              className="absolute bottom-0 left-1/2 h-[430px] w-[430px] max-w-none -translate-x-[46%] object-cover object-left-bottom drop-shadow-[0_18px_28px_rgba(23,70,111,0.18)]"
              src={femaleRecruiterImage}
              style={{
                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, transparent 0%, #000 10%, #000 90%, transparent 100%)',
              }}
            />
          </div>

          <div className="rounded-[7px] border border-slate-200 bg-white p-2.5 shadow-xl shadow-cyan-900/10 lg:my-3">
            <h2 className="border-b border-slate-200 pb-1.5 text-center text-sm font-black text-[#17466f]">Get a Call Back</h2>
            <div className="mt-2.5 grid gap-2">
              <input className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#4b74d7]" placeholder="Name" />
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
                <span>Hiring For :</span>
                <label className="inline-flex items-center gap-2"><input name="hiringFor" type="radio" /> Your Company</label>
                <label className="inline-flex items-center gap-2"><input name="hiringFor" type="radio" /> Your Consultancy</label>
              </div>
              <input className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#4b74d7]" placeholder="Company Name" />
              <input className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#4b74d7]" placeholder="Email ID" />
              <div className="grid grid-cols-[92px_1fr]">
                <select className="rounded-l-[5px] border border-r-0 border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-[#4b74d7]">
                  <option>IN (+91)</option>
                </select>
                <input className="rounded-r-[5px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#4b74d7]" placeholder="Mobile Number" />
              </div>
              <input className="rounded-[5px] border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-[#4b74d7]" placeholder="Your Location" />
              <button className="rounded-[5px] bg-[#ff8a00] px-4 py-2 text-sm font-black text-white transition hover:bg-[#e87900] focus:outline-none focus:ring-4 focus:ring-orange-100" type="button">
                Get a Call Back
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden">
        <div className="absolute inset-y-0 right-0 hidden w-[58%] lg:block">
          <img className="h-full w-full object-cover object-left opacity-95" src={heroImage} alt="" aria-hidden="true" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#FFFFFF_0%,rgba(255,255,255,0.82)_24%,rgba(255,255,255,0.2)_58%,rgba(255,247,237,0.74)_100%)]" />
        </div>
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0057B8] to-transparent" />
        <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.8fr)] lg:px-8">
          <div className="min-w-0 lg:py-8">
            <AnimatePresence mode="wait">
              <motion.div key={active} initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.45 }}>
                <span className="inline-flex items-center gap-2 rounded-[7px] border border-[#0057B8]/15 bg-white/90 px-4 py-2 text-sm font-black text-[#0057B8] shadow-sm shadow-[#0057B8]/10 backdrop-blur">
                  <Rocket size={17} /> {slides[active].badge}
                </span>
                <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] text-slate-950 sm:text-5xl lg:text-6xl">{slides[active].title}</h1>
                <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">{slides[active].subtitle}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button to={activeSlideAction.to}>{activeSlideAction.label}</Button>
                  <Button to="/recruiter-talent" variant="secondary">{slides[active].secondary}</Button>
                </div>
                <div className="mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
                  {['10,000+ Active Candidates', 'Pan India Hiring', 'Verified Recruiters', 'Fast Shortlisting'].map((item) => (
                    <span className="inline-flex min-h-12 items-center gap-2 rounded-[7px] border border-slate-200 bg-white/80 px-3 text-sm font-bold text-slate-700 shadow-sm backdrop-blur" key={item}>
                      <CheckCircle2 className="shrink-0 text-[#3E9B28]" size={17} /> {item}
                    </span>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button className="grid h-11 w-11 place-items-center rounded-[7px] bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-lg hover:shadow-blue-100" onClick={() => setActive((active + slides.length - 1) % slides.length)} type="button" aria-label="Previous recruiter hero slide"><ArrowLeft size={18} /></button>
              <button className="grid h-11 w-11 place-items-center rounded-[7px] bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:text-blue-700 hover:shadow-lg hover:shadow-blue-100" onClick={() => setActive((active + 1) % slides.length)} type="button" aria-label="Next recruiter hero slide"><ArrowRight size={18} /></button>
              <div className="flex items-center gap-2 rounded-[7px] bg-white/80 px-3 py-2 shadow-sm ring-1 ring-slate-200 backdrop-blur">
                {slides.map((slide, index) => <button className={`h-2.5 rounded-[7px] transition-all ${active === index ? 'w-9 bg-blue-600' : 'w-2.5 bg-slate-300 hover:bg-slate-400'}`} key={slide.title} onClick={() => setActive(index)} type="button" aria-label={`Show ${slide.title}`} />)}
              </div>
            </div>
          </div>

          <div className="relative min-w-0 lg:min-h-[460px]">
            <div className="relative overflow-hidden rounded-[7px] border border-white/80 bg-white/75 p-3 shadow-2xl shadow-blue-100 backdrop-blur-xl lg:hidden">
              <img className="aspect-[16/11] w-full object-contain" src={heroImage} alt="Recruiter dashboard preview" />
            </div>
            <div className="hidden lg:block">
              <FloatingStat className="right-5 top-8" label={slides[active].metricLabel} value={slides[active].metric} />
              <FloatingStat className="bottom-16 left-2" label="Active pipeline" value="2.4k" teal />
              <div className="absolute bottom-5 right-8 w-80 rounded-[7px] border border-white/80 bg-white/90 p-4 shadow-2xl shadow-blue-100 backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">Hiring momentum</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{networkStats[2]?.[0] || '0+'}</p>
                  </div>
                  <span className="grid h-12 w-12 place-items-center rounded-[7px] bg-[#0057B8] text-white">
                    <BarChart3 size={22} />
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['Applied', 'Interview', 'Hired'].map((stage, index) => (
                    <div className="rounded-[7px] bg-slate-50 p-2" key={stage}>
                      <span className={`block h-1.5 rounded-[7px] ${index === 0 ? 'bg-[#0057B8]' : index === 1 ? 'bg-[#FF8A00]' : 'bg-[#3E9B28]'}`} />
                      <p className="mt-2 text-[11px] font-black text-slate-500">{stage}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HiringFeaturesSection />

      <FeatureShowcase />

      <RecruitmentProcessSection />

      <EmployerTestimonials testimonials={videoTestimonials} />
      <EmployerCTA isLoggedIn={isLoggedIn} isRecruiterAccount={isRecruiterAccount} />
    </>
  )
}

function FloatingStat({ className, label, value, teal = false }) {
  return (
    <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} className={`absolute hidden rounded-[7px] border border-white bg-white/90 p-3 shadow-xl shadow-blue-100 backdrop-blur md:block ${className}`}>
      <p className={`text-2xl font-black ${teal ? 'text-teal-600' : 'text-blue-600'}`}>{value}</p>
      <p className="text-xs font-bold text-slate-500">{label}</p>
    </motion.div>
  )
}

function SectionHeading({ eyebrow, subtitle, title }) {
  return (
    <div className="mx-auto mb-10 max-w-3xl text-center">
      <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-base font-semibold leading-7 text-slate-500 sm:text-lg">{subtitle}</p>}
    </div>
  )
}

function HiringFeaturesSection() {
  return (
    <section id="solutions" className="bg-[#f8fbff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-5 py-2 text-sm font-black uppercase tracking-[0.16em] text-blue-600">
            <Sparkles size={17} /> Hiring Features
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-[#070d24] sm:text-5xl lg:text-6xl">
            Enterprise tools for modern recruitment
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-500">
            Powerful features designed to help recruitment teams hire faster, smarter, and better.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => <FeatureCard feature={feature} index={index} key={feature.title} />)}
        </div>

        <div className="mt-6 overflow-hidden rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
            <span className="grid h-16 w-16 place-items-center rounded-[8px] bg-[#2f80ff] text-white shadow-lg shadow-blue-100">
              <Rocket size={32} />
            </span>
            <div>
              <h3 className="text-xl font-black text-[#070d24]">Built for modern hiring teams</h3>
              <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                INSEET provides everything you need to attract, engage, and hire top talent efficiently.
              </p>
            </div>
            <Button className="min-h-14 bg-[#0d5be8] px-8 text-sm font-black shadow-lg shadow-blue-100 hover:bg-[#084bc4]" to="/recruiter-resources">
              Explore All Features <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function RecruitmentProcessSection() {
  return (
    <section className="bg-[#f8fbff] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-14 max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-100/70 px-5 py-2 text-sm font-black uppercase tracking-[0.16em] text-blue-600">
            <Sparkles size={17} /> Recruitment Process
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-[#070d24] sm:text-5xl lg:text-6xl">
            From recruiter profile to successful hire
          </h2>
          <p className="mx-auto mt-5 max-w-4xl text-lg font-semibold leading-8 text-slate-500">
            A streamlined hiring workflow to help you find, engage, and hire the best talent.
          </p>
          <span className="mx-auto mt-6 block h-1 w-24 rounded-full bg-[#1269f2]" />
        </div>

        <div className="relative grid gap-10 lg:grid-cols-4">
          <div className="absolute left-[11%] right-[11%] top-[104px] hidden border-t-2 border-dashed border-blue-100 lg:block" />
          {processSteps.map((step, index) => <ProcessCard index={index} key={step.title} step={step} />)}
        </div>

        <div className="mt-16 rounded-[8px] border border-blue-100 bg-blue-50/70 p-6 shadow-sm">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {processBenefits.map((benefit) => <ProcessBenefit benefit={benefit} key={benefit.title} />)}
          </div>
        </div>
      </div>
    </section>
  )
}

function ProcessCard({ index, step }) {
  const Icon = step.icon
  const tone = getProcessTone(step.tone)
  const isLast = index === processSteps.length - 1

  return (
    <motion.article whileHover={{ y: -6 }} className="relative rounded-[8px] border border-slate-200 bg-white px-6 pb-6 pt-12 text-center shadow-sm transition hover:shadow-xl hover:shadow-blue-100">
      <span className={`absolute left-1/2 top-0 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-xl font-black text-white shadow-lg ${tone.solidBg} ${tone.shadow}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      {!isLast && (
        <span className="absolute -right-8 top-[78px] z-10 hidden h-16 w-16 place-items-center rounded-full bg-white text-[#1269f2] shadow-lg shadow-blue-100 lg:grid">
          <ArrowRight size={30} />
        </span>
      )}
      <span className={`mx-auto grid h-24 w-24 place-items-center rounded-[8px] ${tone.softBg} ${tone.text}`}>
        <Icon size={44} strokeWidth={1.8} />
      </span>
      <h3 className="mt-8 text-2xl font-black text-[#070d24]">{step.title}</h3>
      <span className={`mx-auto mt-5 block h-1 w-9 rounded-full ${tone.solidBg}`} />
      <p className="mx-auto mt-6 max-w-[250px] text-base font-semibold leading-7 text-slate-600">{step.text}</p>
      <div className={`mt-8 flex min-h-12 items-center justify-center gap-2 rounded-[7px] text-sm font-black ${tone.statusBg} ${tone.text}`}>
        {step.statusType === 'pending' ? <Circle size={18} /> : step.statusType === 'progress' ? <Clock3 size={18} /> : <CheckCircle2 size={18} />}
        {step.status}
      </div>
    </motion.article>
  )
}

function ProcessBenefit({ benefit }) {
  const Icon = benefit.icon
  const tone = getProcessTone(benefit.tone)

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-start">
      <span className={`grid h-16 w-16 place-items-center rounded-full bg-white ${tone.text} shadow-lg shadow-blue-100`}>
        <Icon size={30} strokeWidth={1.8} />
      </span>
      <div>
        <h3 className="text-lg font-black text-[#070d24]">{benefit.title}</h3>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{benefit.text}</p>
      </div>
    </div>
  )
}

function getProcessTone(tone = 'blue') {
  const tones = {
    blue: {
      shadow: 'shadow-blue-100',
      softBg: 'bg-blue-50',
      solidBg: 'bg-[#1269f2]',
      statusBg: 'bg-blue-50',
      text: 'text-[#1269f2]',
    },
    green: {
      shadow: 'shadow-emerald-100',
      softBg: 'bg-emerald-50',
      solidBg: 'bg-[#12b981]',
      statusBg: 'bg-emerald-50',
      text: 'text-[#12a66d]',
    },
    orange: {
      shadow: 'shadow-orange-100',
      softBg: 'bg-orange-50',
      solidBg: 'bg-[#ff8a00]',
      statusBg: 'bg-orange-50',
      text: 'text-[#ff8a00]',
    },
    purple: {
      shadow: 'shadow-violet-100',
      softBg: 'bg-violet-50',
      solidBg: 'bg-[#6d37dc]',
      statusBg: 'bg-violet-50',
      text: 'text-[#6d37dc]',
    },
  }
  return tones[tone] || tones.blue
}

function FeatureCard({ feature, index }) {
  const Icon = feature.icon
  const tone = getFeatureTone(feature.tone)

  return (
    <motion.article whileHover={{ y: -6 }} className="relative min-h-[285px] overflow-hidden rounded-[8px] border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-xl hover:shadow-blue-100">
      <div className="flex items-start justify-between gap-4">
        <span className={`grid h-20 w-20 place-items-center rounded-[8px] ${tone.softBg} ${tone.text}`}>
          <Icon size={42} strokeWidth={1.8} />
        </span>
        <span className={`rounded-[7px] ${tone.numberBg} px-4 py-2 text-2xl font-black ${tone.text}`}>
          {String(index + 1).padStart(2, '0')}
        </span>
      </div>
      <h3 className="mt-7 text-2xl font-black text-[#070d24]">{feature.title}</h3>
      <span className={`mt-4 block h-1 w-11 rounded-full ${tone.lineBg}`} />
      <p className="mt-5 max-w-sm text-base font-semibold leading-7 text-slate-600">{feature.text}</p>
      <Button className={`mt-7 min-h-10 !bg-transparent px-0 py-0 text-base font-black ${tone.text} shadow-none hover:!bg-transparent`} to={feature.to} variant="ghost">
        Learn more <ArrowRight size={22} />
      </Button>
      <div className="absolute bottom-7 right-7 grid grid-cols-4 gap-2 opacity-35">
        {Array.from({ length: 16 }).map((_, dotIndex) => <span className={`h-1.5 w-1.5 rounded-full ${tone.lineBg}`} key={dotIndex} />)}
      </div>
    </motion.article>
  )
}

function getFeatureTone(tone = 'blue') {
  const tones = {
    blue: {
      lineBg: 'bg-[#0d5be8]',
      numberBg: 'bg-blue-50',
      softBg: 'bg-blue-50',
      text: 'text-[#0d5be8]',
    },
    green: {
      lineBg: 'bg-[#0f9f5f]',
      numberBg: 'bg-emerald-50',
      softBg: 'bg-emerald-50',
      text: 'text-[#0f9f5f]',
    },
    orange: {
      lineBg: 'bg-[#ff7a00]',
      numberBg: 'bg-orange-50',
      softBg: 'bg-orange-50',
      text: 'text-[#ff6a00]',
    },
    purple: {
      lineBg: 'bg-[#7a35d8]',
      numberBg: 'bg-violet-50',
      softBg: 'bg-violet-50',
      text: 'text-[#7a35d8]',
    },
    pink: {
      lineBg: 'bg-[#f42f75]',
      numberBg: 'bg-pink-50',
      softBg: 'bg-pink-50',
      text: 'text-[#f42f75]',
    },
  }
  return tones[tone] || tones.blue
}

function EmployerTestimonials({ testimonials = [] }) {
  const [activeVideo, setActiveVideo] = useState(null)
  const visibleVideos = testimonials.filter((item) => item.companyName).slice(0, 2).map((item, index) => ({
    ...item,
    quote: item.quote || item.message || item.description || '',
    duration: item.duration || item.videoDuration || '',
    tone: item.tone || (index % 2 ? 'orange' : 'blue'),
  }))
  if (!visibleVideos.length) return null

  return (
    <section className="overflow-hidden bg-[#f8fbff] py-10 sm:py-12">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute left-0 top-20 hidden h-20 w-24 bg-[radial-gradient(circle,#0b5cff_1.5px,transparent_1.5px)] bg-[length:20px_20px] opacity-25 lg:block" />
        <div className="pointer-events-none absolute right-2 top-[330px] hidden h-24 w-24 bg-[radial-gradient(circle,#ff8a00_1.5px,transparent_1.5px)] bg-[length:20px_20px] opacity-20 lg:block" />

        <div className="relative mx-auto mb-6 max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0b5cff] sm:text-sm">
            <Star size={16} fill="currentColor" />
            Trusted By Leading Companies
          </div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#061333] sm:text-4xl lg:text-5xl">
            Why Companies Choose Us
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
            Hear from organizations that have transformed their hiring experience with INSEET.
          </p>
        </div>

        <div className="absolute right-4 top-5 hidden items-center gap-4 lg:flex">
          <button className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#061333] shadow-lg shadow-slate-200/80 transition hover:border-[#0b5cff] hover:text-[#0b5cff]" type="button" aria-label="Previous video testimonial">
            <ArrowLeft size={22} />
          </button>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-[#0b5cff] text-white shadow-lg shadow-blue-200 transition hover:bg-[#0046d6]" type="button" aria-label="Next video testimonial">
            <ArrowRight size={22} />
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {visibleVideos.map((item) => {
            const tone = getVideoToneClass(item.tone)
            return (
              <article className={`overflow-hidden rounded-[8px] border border-slate-100 bg-white shadow-xl shadow-slate-200/70 ${tone.border}`} key={item._id || item.companyName}>
                <button className="relative block h-[210px] w-full overflow-hidden bg-slate-900 text-left sm:h-[230px]" onClick={() => setActiveVideo(item)} type="button">
                  {item.thumbnailUrl ? (
                    <img className="h-full w-full object-cover" src={item.thumbnailUrl} alt={`${item.companyName} video testimonial`} />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${tone.fallback}`} />
                  )}
                  <div className="absolute inset-0 bg-slate-950/30" />
                  <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/55 px-3 py-2 text-sm font-black text-white shadow backdrop-blur">
                    <Play size={14} fill="currentColor" />
                    {item.duration || '02:45'}
                  </div>
                  <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#0b5cff] shadow-xl shadow-slate-950/20">
                    <Play className={tone.text} size={32} fill="currentColor" />
                  </span>
                </button>
                <div className="px-6 py-5">
                  <h3 className="text-xl font-black text-[#061333]">{item.companyName}</h3>
                  <p className="mt-2 text-base font-medium leading-7 text-slate-600">"{item.quote}"</p>
                  <p className={`mt-4 flex items-center gap-2 text-sm font-black ${tone.text}`}>
                    <MapPin size={17} fill="currentColor" />
                    <span className="text-slate-600">{item.location}</span>
                  </p>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-7 text-center">
          <Button
            className="recruiter-video-testimonial-btn min-h-11 px-8 shadow-lg ring-0"
            to="/recruiter-testimonials"
            variant="secondary"
          >
            <Play size={18} fill="currentColor" />
            View All Video Testimonials
          </Button>
        </div>
      </div>
      {activeVideo && <VideoTestimonialModal item={activeVideo} onClose={() => setActiveVideo(null)} />}
    </section>
  )
}

function getVideoToneClass(tone = 'blue') {
  const tones = {
    amber: {
      border: 'border-b-4 border-b-[#ff8a00]',
      fallback: 'from-zinc-900 via-amber-950 to-zinc-800',
      text: 'text-[#ff6a00]',
    },
    blue: {
      border: 'border-b-4 border-b-[#0b5cff]',
      fallback: 'from-slate-900 via-blue-950 to-slate-950',
      text: 'text-[#0b5cff]',
    },
    orange: {
      border: 'border-b-4 border-b-[#ff6a00]',
      fallback: 'from-stone-950 via-stone-700 to-orange-950',
      text: 'text-[#ff6a00]',
    },
    slate: {
      border: 'border-b-4 border-b-[#0b5cff]',
      fallback: 'from-slate-950 via-slate-800 to-blue-950',
      text: 'text-[#0b5cff]',
    },
    stone: {
      border: 'border-b-4 border-b-[#ff6a00]',
      fallback: 'from-stone-950 via-stone-700 to-stone-900',
      text: 'text-[#ff6a00]',
    },
  }
  return tones[tone] || tones.blue
}

function VideoTestimonialModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[8px] bg-white shadow-2xl">
        <button className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-200 hover:text-[#ff8a00]" onClick={onClose} type="button" aria-label="Close video testimonial">
          <X size={20} />
        </button>
        <div className="aspect-video bg-slate-950">
          {item.videoUrl ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              src={normalizeVideoEmbedUrl(item.videoUrl)}
              title={`${item.companyName} video testimonial`}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-white">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ff8a00]">
                  <Play className="ml-1" size={28} fill="currentColor" />
                </div>
                <h3 className="mt-5 text-2xl font-black">{item.companyName}</h3>
                <p className="mt-2 text-sm text-slate-300">Video URL backend mein add karte hi yahan play hoga.</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-xl font-semibold text-slate-900">{item.companyName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">"{item.quote}"</p>
          <p className="mt-2 text-sm font-semibold text-[#ff6a00]">{item.location}</p>
        </div>
      </div>
    </div>
  )
}

function normalizeVideoEmbedUrl(url = '') {
  if (url.includes('youtube.com/embed/')) return appendVideoParams(url)
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([^&?/]+)/)
  if (youtubeMatch?.[1]) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`
  return url
}

function appendVideoParams(url = '') {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}autoplay=1&rel=0`
}

function getRecruiterSlideAction(slide, user) {
  const isLoggedIn = Boolean(user?.email)
  const isRecruiterAccount = user?.role === 'recruiter'

  if (isRecruiterAccount) {
    if (slide.primary === 'Register Recruiter' || slide.primary === 'Start Hiring') {
      return { label: 'Open Recruiter Dashboard', to: '/recruiter-dashboard' }
    }
    return { label: slide.primary, to: slide.to }
  }

  if (isLoggedIn && slide.primary === 'Register Recruiter') {
    return { label: 'Go To Account', to: '/candidate-dashboard' }
  }

  return { label: slide.primary, to: slide.to }
}

function getRecruiterInitials(value) {
  return String(value || 'R')
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function EmployerCTA({ isLoggedIn, isRecruiterAccount }) {
  const action = isRecruiterAccount
    ? { label: 'Open Dashboard', to: '/recruiter-dashboard' }
    : isLoggedIn
      ? { label: 'Post Your First Job', to: '/post-job' }
      : { label: 'Post Your First Job', to: '/recruiter-register' }

  return (
    <section className="bg-[#f8fbff] pb-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative min-h-[150px] overflow-hidden rounded-[8px] bg-gradient-to-r from-[#0758e7] via-[#2456c6] to-[#ff7a00] px-6 py-7 text-white shadow-xl shadow-blue-200/60 sm:px-10">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[40%] bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.28),transparent_32%)] lg:block" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.5px,transparent_1.5px)] bg-[length:18px_18px] opacity-60" />
          <img
            className="pointer-events-none absolute bottom-0 right-2 hidden max-h-[185px] w-auto object-contain lg:block"
            src={femaleRecruiterImage}
            alt=""
            aria-hidden="true"
          />
          <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:pr-[260px]">
            <div className="flex min-w-0 items-center gap-5">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15">
                <Rocket size={38} fill="currentColor" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Start Hiring Smarter Today</h2>
                <p className="mt-2 max-w-xl text-base font-medium leading-7 text-blue-50">
                  Post jobs, connect with skilled professionals, and grow your team faster.
                </p>
              </div>
            </div>
            <Button className="recruiter-cta-primary-btn min-h-14 shrink-0 px-8 shadow-xl ring-0" to={action.to} variant="secondary">
              {action.label}
              <ArrowRight size={22} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}





