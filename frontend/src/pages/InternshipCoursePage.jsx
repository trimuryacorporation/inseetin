import { useSiteBranding } from '../utils/siteBranding'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CheckCircle2, Clock3, IndianRupee, LockKeyhole, PlayCircle, ShieldCheck, Sparkles, UsersRound } from 'lucide-react'

const modules = [
  ['Career Foundation', 'Resume, LinkedIn, portfolio basics, and interview confidence.'],
  ['Workplace Skills', 'Email writing, task ownership, team communication, and reporting.'],
  ['Project Practice', 'Real assignment walkthroughs with video-led explanations.'],
  ['Job Readiness', 'Mock interview prompts, application strategy, and recruiter follow-up.'],
]

const outcomes = [
  'Recorded internship course videos',
  'Practical assignments and checklists',
  'Certificate-ready completion flow',
  'Access according to the course plan',
]

export function InternshipCoursePage() {
  const branding = useSiteBranding()
  return (
    <main className="bg-slate-50">
      <section className="relative overflow-hidden bg-[#082347] px-4 py-10 text-white sm:px-6 lg:py-14">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, #ff8a00 0 2px, transparent 3px), radial-gradient(circle at 80% 40%, #38bdf8 0 2px, transparent 3px)', backgroundSize: '44px 44px' }} />
        <div className="relative mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-200 ring-1 ring-white/15">
              <PlayCircle size={16} /> Internship Course
            </p>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              Buy the internship video course and start job-ready learning.
            </h1>
            <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-blue-50 sm:text-lg">
              A focused video course for students and freshers who want practical career skills, project confidence, and interview preparation in one place.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <a className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[8px] bg-[#ff8a00] px-6 text-sm font-black text-white shadow-xl shadow-orange-950/20 transition hover:-translate-y-0.5 hover:bg-[#e87500]" href="#buy-course">
                Buy Course Video <ArrowRight size={18} />
              </a>
              <a className="inline-flex min-h-13 items-center justify-center gap-2 rounded-[8px] border border-white/25 px-6 text-sm font-black text-white transition hover:bg-white/10" href="#course-modules">
                View Modules
              </a>
            </div>
          </div>

          <div className="rounded-[12px] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur">
            <div className="rounded-[10px] bg-white p-4 text-slate-950">
              <div className="grid aspect-video place-items-center rounded-[10px] bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400 text-white">
                <div className="grid place-items-center text-center">
                  <span className="grid h-20 w-20 place-items-center rounded-full bg-white/20 ring-1 ring-white/30">
                    <PlayCircle size={44} />
                  </span>
                  <p className="mt-4 text-xl font-black">Internship Course Preview</p>
                  <p className="mt-1 text-sm font-semibold text-blue-50">Recorded lessons + practical tasks</p>
                  {branding.coursePreviewUrl && <video className="mt-4 w-full rounded-lg" controls preload="metadata" src={branding.coursePreviewUrl} aria-label="Course preview" />}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Metric icon={Clock3} label="Hours" value={branding.courseHours} />
                <Metric icon={UsersRound} label="Level" value="Beginner" />
                <Metric icon={BadgeCheck} label="Access" value={branding.courseAccess} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.42fr] lg:py-10">
        <div id="course-modules" className="grid gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-600">What You Get</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Course modules built for employability</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {modules.map(([title, text], index) => (
              <article className="rounded-[8px] border border-blue-100 bg-white p-5 shadow-sm shadow-blue-50" key={title}>
                <span className="grid h-11 w-11 place-items-center rounded-[8px] bg-blue-50 text-blue-600">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-black text-slate-950">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <aside id="buy-course" className="h-fit rounded-[10px] border border-orange-100 bg-white p-5 shadow-xl shadow-orange-50">
          <p className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-[#b85f00]">
            <Sparkles size={14} /> Limited Launch
          </p>
          <h2 className="mt-4 text-2xl font-black text-slate-950">{branding.courseTitle}</h2>
          <div className="mt-4 flex items-end gap-1">
            <IndianRupee className="mb-2 text-[#ff8a00]" size={24} />
            <span className="text-5xl font-black text-slate-950">{Number(branding.coursePrice || 0).toLocaleString()}</span>
            <span className="mb-2 text-sm font-bold text-slate-500">one-time</span>
          </div>
          <div className="mt-5 grid gap-3">
            {outcomes.map((item) => (
              <p className="flex items-start gap-2 text-sm font-bold leading-6 text-slate-700" key={item}>
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
                {item}
              </p>
            ))}
          </div>
          <Link className="mt-6 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[8px] bg-[#0057B8] px-5 text-sm font-black text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#004a99]" to="/auth">
            Buy Course Video <ArrowRight size={18} />
          </Link>
          <p className="mt-3 flex items-start gap-2 text-xs font-semibold leading-5 text-slate-500">
            <LockKeyhole className="mt-0.5 shrink-0" size={14} />
            Login or register to continue with purchase access.
          </p>
        </aside>
      </section>

      <section className="bg-white px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-3">
          <TrustItem icon={ShieldCheck} title="Secure Access" text="Course access stays linked with your INSEET account." />
          <TrustItem icon={BriefcaseBusiness} title="Career Focused" text="Built around internship readiness and entry-level hiring." />
          <TrustItem icon={PlayCircle} title="Video Learning" text="Learn anytime with structured recorded lessons." />
        </div>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="rounded-[8px] bg-slate-50 p-3">
      <Icon className="mx-auto text-blue-600" size={18} />
      <p className="mt-1 text-sm font-black text-slate-950">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function TrustItem({ icon: Icon, title, text }) {
  return (
    <div className="flex gap-3 rounded-[8px] border border-slate-200 bg-slate-50 p-4">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[8px] bg-blue-50 text-blue-600">
        <Icon size={20} />
      </span>
      <div>
        <h3 className="text-sm font-black text-slate-950">{title}</h3>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{text}</p>
      </div>
    </div>
  )
}
