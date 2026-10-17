import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { createCategoryJobsPath, getJobsForCategory } from '../utils/categoryMatching'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Home,
  Search,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { Link } from 'react-router-dom'

const toneClasses = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  violet: 'bg-violet-50 text-violet-600',
  orange: 'bg-orange-50 text-[#ff8a00]',
  indigo: 'bg-indigo-50 text-indigo-600',
  teal: 'bg-teal-50 text-teal-600',
  stone: 'bg-stone-50 text-stone-600',
}

export function IndustriesPage() {
  const { data: jobs, loading, error } = useApiResource(() => api.jobListings(), [], [])
  const { data: categories } = useApiResource(() => api.listAll('categories', '?status=Active'), [], [])
  const { data: summary } = useApiResource(() => api.portalSummary(), { counts: {} }, [])
  const stats = [
    [Building2, categories.length, 'Industries', 'blue'],
    [BriefcaseBusiness, loading ? '?' : jobs.length, 'Open Jobs', 'green'],
    [UsersRound, summary.counts?.companies ?? '?', 'Companies', 'violet'],
    [UserRound, summary.counts?.candidates ?? '?', 'Candidates', 'orange'],
  ]
  const industries = categories.map((category) => {
    const matching = getJobsForCategory(jobs, category.name)
    return [BriefcaseBusiness, category.name, matching.length + ' Open Jobs', new Set(matching.map((job) => job.company)).size + ' Companies Hiring', 'blue']
  })
  return (
    <main className="min-h-screen bg-[#f8fbff] py-3 sm:py-5">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-[7px] px-4 text-xs font-black text-white shadow-md shadow-blue-100 transition hover:-translate-y-0.5"
          style={{ backgroundColor: '#0057B8' }}
          to="/"
        >
          <ArrowLeft size={15} />
          Back Home
        </Link>

        <section className="mt-4 overflow-hidden rounded-[10px] border border-blue-100 bg-white shadow-sm shadow-blue-100/60 sm:mt-5">
          <div className="grid items-center gap-5 px-4 py-5 sm:px-7 sm:py-6 lg:grid-cols-[1fr_0.38fr] lg:px-10">
            <div className="text-center sm:text-left">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-[9px] bg-blue-50 text-blue-600 sm:mx-0">
                <Building2 size={23} />
              </div>
              <h1 className="mx-auto mt-3 max-w-xl text-[26px] font-black leading-tight text-slate-950 sm:mx-0 sm:mt-4 sm:max-w-3xl sm:text-4xl">
                Explore Industries & Career Paths
              </h1>
              <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-slate-500 sm:mx-0 sm:mt-3 sm:max-w-2xl">
                Discover industry paths and current job opportunities from top companies across India.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:mt-5 sm:flex sm:gap-3">
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] px-3 text-xs font-black text-white shadow-md shadow-blue-100 transition hover:-translate-y-0.5 sm:px-5 sm:text-sm"
                  style={{ backgroundColor: '#0057B8' }}
                  to="/jobs"
                >
                  <Search size={17} />
                  Search Industry
                </Link>
                <Link
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-[7px] border px-3 text-xs font-black transition hover:bg-orange-50 sm:px-5 sm:text-sm"
                  style={{ borderColor: '#ff8a00', color: '#0057B8', backgroundColor: 'transparent' }}
                  to="/jobs"
                >
                  <BriefcaseBusiness size={17} />
                  Browse Jobs
                </Link>
              </div>
            </div>

            <div className="relative hidden h-48 lg:block">
              <div className="absolute bottom-0 right-2 h-[120px] w-60 rounded-t-[16px] bg-gradient-to-t from-blue-100 to-blue-50 opacity-90" />
              <div className="absolute bottom-0 right-0 flex items-end gap-3">
                <div className="grid h-[88px] w-28 place-items-center rounded-[10px] border border-blue-100 bg-white shadow-xl shadow-blue-100">
                  <BarChart3 className="text-blue-600" size={44} />
                </div>
                <div className="grid h-20 w-28 place-items-center rounded-[10px] bg-[#003d91] text-white shadow-xl shadow-blue-100">
                  <BriefcaseBusiness size={48} />
                </div>
                <div className="grid h-[52px] w-10 place-items-center rounded-[8px] bg-green-50 text-green-600">
                  <Home size={22} />
                </div>
              </div>
              <div className="absolute bottom-6 right-24 grid h-12 w-12 place-items-center rounded-full bg-white/90 text-blue-600 shadow-lg ring-4 ring-blue-100">
                <Search size={24} />
              </div>
              <div className="absolute right-10 top-2 flex items-end gap-2 opacity-40">
                {[48, 78, 56, 90].map((height, index) => (
                  <span className="w-6 rounded-t bg-blue-300" style={{ height }} key={index} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-0 overflow-hidden rounded-[10px] border border-blue-100 bg-white shadow-sm shadow-blue-100/60 lg:grid-cols-4">
          {stats.map(([Icon, value, label, tone], index) => (
            <div className={`flex flex-col items-center gap-2 px-2 py-3 text-center sm:flex-row sm:gap-4 sm:px-5 sm:py-4 sm:text-left ${index ? 'lg:border-l lg:border-blue-100' : ''} ${index > 1 ? 'border-t border-blue-100 lg:border-t-0' : ''} ${index % 2 ? 'border-l border-blue-100 lg:border-l' : ''}`} key={label}>
              <span className={`grid h-10 w-10 place-items-center rounded-[9px] sm:h-11 sm:w-11 ${toneClasses[tone]}`}>
                <Icon size={20} />
              </span>
              <div>
                <p className="text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
                <p className="text-[11px] font-black text-slate-500 sm:text-xs">{label}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-5 sm:mt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xl font-black text-slate-950">Top Industries</h2>
            <Link className="hidden items-center gap-2 text-sm font-black text-blue-600 sm:inline-flex" to="/jobs">
              View all industries
              <ArrowRight size={18} />
            </Link>
          </div>

          {error && <p role="alert" className="mt-4 text-sm text-rose-700">{error}</p>}
          {!loading && !industries.length && <p className="mt-4 text-sm text-slate-500">No industries available yet.</p>}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-4">
            {industries.map(([Icon, title, jobs, companies, tone]) => (
              <Link
                className="group flex h-full flex-col rounded-[10px] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-100/50 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-100 sm:p-4"
                key={title}
                style={{ minHeight: 154 }}
                to={createCategoryJobsPath({ name: title })}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-[9px] sm:h-12 sm:w-12 ${toneClasses[tone]}`}>
                  <Icon size={23} />
                </span>
                <h3 className="mt-3 min-h-9 text-sm font-black leading-tight text-slate-950 sm:mt-4 sm:text-base">{title}</h3>
                <p className="mt-1 text-xs font-black text-blue-600 sm:text-sm">{jobs}</p>
                <p className="mt-1 hidden text-xs font-bold text-slate-500 sm:block">{companies}</p>
                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-xs font-black text-blue-600 sm:pt-3 sm:text-sm">
                  Explore
                  <ArrowRight className="transition group-hover:translate-x-1" size={16} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
