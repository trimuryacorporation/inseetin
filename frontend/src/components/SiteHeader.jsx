import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, Menu, Search, X } from 'lucide-react'
import { AuthModal } from './AuthModal'
import { getStoredUser } from '../routes/authRouting'
import { useSiteBranding } from '../utils/siteBranding'

const headerConfigs = {
  default: {
    homeTo: '/',
    searchTo: '/jobs',
    searchPlaceholder: 'Search jobs, skills or companies',
    links: [
      { label: 'Home', to: '/' },
      { label: 'Find Jobs', to: '/jobs' },
      { label: 'Internship Course', to: '/internship-course', badge: 'Video' },
      { label: 'Freelance Projects', to: '/freelancer/projects', badge: 'New' },
      { label: 'Candidates', to: '/auth' },
    ],
    cta: { label: 'For Employers', caption: 'Post Jobs Free', to: '/recruiter' },
  },
  freelancer: {
    homeTo: '/freelancer',
    loginTo: '/freelancer-login',
    registerTo: '/freelancer-register',
    searchTo: '/freelancer/projects',
    searchPlaceholder: 'Search projects, skills or clients',
    links: [
      { label: 'Freelancer Home', to: '/freelancer' },
      { label: 'Browse Projects', to: '/freelancer/projects' },
      { label: 'Find Jobs', to: '/jobs' },
      { label: 'Privacy', to: '/freelancer/privacy' },
      { label: 'Support', to: '/freelancer/support' },
    ],
    cta: { label: 'Start Freelancing', caption: 'Create Profile', to: '/freelancer-register' },
  },
  recruiter: {
    homeTo: '/recruiter',
    loginTo: '/recruiter-login',
    registerTo: '/recruiter-register',
    searchTo: '/jobs',
    searchPlaceholder: 'Search jobs, candidates or skills',
    links: [
      { label: 'Recruiter Home', to: '/recruiter' },
      { label: 'Post Job', to: '/post-job' },
      { label: 'Find Talent', to: '/candidates' },
      { label: 'Testimonials', to: '/recruiter-testimonials' },
      { label: 'Support', to: '/recruiter/support' },
    ],
    cta: { label: 'For Candidates', caption: 'Find Jobs', to: '/jobs' },
  },
}

export function SiteHeader({ variant = 'default' }) {
  const [open, setOpen] = useState(false)
  const [authModalMode, setAuthModalMode] = useState('')
  const [headerSearch, setHeaderSearch] = useState('')
  const [user, setUser] = useState(() => getStoredUser())
  const branding = useSiteBranding()
  const navigate = useNavigate()
  const location = useLocation()
  const config = headerConfigs[variant] || headerConfigs.default

  useEffect(() => {
    setUser(getStoredUser())
    setOpen(false)
  }, [location.pathname])

  const navLinks = config.links.map((item) => {
    if (variant === 'default' && item.label === 'Candidates' && ['Candidate', 'users'].includes(user?.role)) {
      return { ...item, to: '/candidate-dashboard' }
    }
    return item
  })

  const handleLinkClick = () => {
    setOpen(false)
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const openAuthModal = (mode) => {
    setAuthModalMode(mode)
    setOpen(false)
  }

  const submitHeaderSearch = (event) => {
    event.preventDefault()
    const query = headerSearch.trim()
    navigate(query ? `${config.searchTo}?q=${encodeURIComponent(query)}` : config.searchTo)
    handleLinkClick()
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 px-2 py-2 shadow-sm backdrop-blur sm:px-4">
        <div className="mx-auto max-w-[1560px] rounded-[14px] bg-white shadow-xl shadow-slate-200/70">
          <nav className="flex min-h-[72px] items-center justify-between gap-3 px-3 sm:px-5 lg:gap-5">
            <Link className="flex w-32 shrink-0 items-center font-bold text-[#ff8a00] sm:w-40" onClick={handleLinkClick} to={config.homeTo}>
              {branding.logoUrl ? (
                <img className="h-10 w-full object-contain object-left sm:h-12" src={branding.logoUrl} alt={branding.siteName || 'INSEET'} />
              ) : (
                <>
                  <span className="grid h-12 w-12 place-items-center rounded-[7px] bg-[#0057B8] text-white"><BriefcaseBusiness size={22} /></span>
                  <span className="ml-3 text-xl text-[#ff8a00]">{branding.siteName || 'INSEET'}</span>
                </>
              )}
            </Link>

            <div className="hidden flex-1 items-center justify-center gap-4 xl:flex">
              {navLinks.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `group relative inline-flex min-h-[50px] items-center gap-1.5 text-[13px] font-bold transition ${
                      isActive ? 'text-[#0057B8]' : 'text-slate-950 hover:text-[#0057B8]'
                    }`
                  }
                  key={item.label}
                  onClick={handleLinkClick}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      <span className="leading-5">
                        {item.label}
                        {item.caption && <span className="block text-xs font-semibold text-slate-500">{item.caption}</span>}
                      </span>
                      {item.badge && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{item.badge}</span>}
                      <span className={`absolute bottom-0 left-0 h-1 rounded-full bg-[#0057B8] transition-all ${isActive ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            <form className="hidden h-10 w-[250px] shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 shadow-sm xl:flex" onSubmit={submitHeaderSearch}>
              <button className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-50 hover:text-[#0057B8]" type="submit" aria-label="Search jobs">
                <Search size={19} />
              </button>
              <input
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                onChange={(event) => setHeaderSearch(event.target.value)}
                placeholder={config.searchPlaceholder}
                value={headerSearch}
              />
            </form>

            <div className="hidden shrink-0 items-center gap-2 xl:flex">
              {config.loginTo ? (
                <Link className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[#0057B8] bg-[white] px-4 text-sm font-bold text-[#0057B8] transition hover:bg-blue-50" onClick={handleLinkClick} to={config.loginTo}>
                  Login
                </Link>
              ) : (
                <button className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[#0057B8] bg-[white] px-4 text-sm font-bold text-[#0057B8] transition hover:bg-blue-50" onClick={() => openAuthModal('login')} type="button">
                  Login
                </button>
              )}
              {config.registerTo ? (
                <Link className="inline-flex min-h-10 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-[#e87500]" onClick={handleLinkClick} to={config.registerTo}>
                  Register
                </Link>
              ) : (
                <button className="inline-flex min-h-10 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-[#e87500]" onClick={() => openAuthModal('register')} type="button">
                  Register
                </button>
              )}
              <Link className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[7px] bg-[#0057B8] px-4 text-[13px] font-bold text-white shadow-lg shadow-blue-100" onClick={handleLinkClick} to={config.cta.to}>
                <BriefcaseBusiness size={19} />
                <span>
                  {config.cta.label}
                  <span className="block text-xs font-semibold text-blue-100">{config.cta.caption}</span>
                </span>
                <ArrowRight size={17} />
              </Link>
            </div>

            <button
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-[7px] bg-[#0057B8] text-white shadow-lg shadow-blue-100 xl:hidden"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </nav>
        </div>

        <div className={`xl:hidden ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <button aria-label="Close menu overlay" className={`fixed inset-0 z-[80] bg-slate-950/35 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} onClick={() => setOpen(false)} type="button" />
          <aside inert={!open} className={`fixed inset-y-0 right-0 z-[90] h-dvh w-80 max-w-[86vw] overflow-y-auto border-l border-[#0057B8]/10 bg-white px-4 py-4 shadow-2xl shadow-[#0057B8]/20 transition-transform duration-300 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-[7px] bg-[linear-gradient(135deg,#eef7ff,#fff4e6)] p-3">
              <span className="text-sm font-black text-slate-950">Menu</span>
              <button aria-label="Close menu" className="grid h-9 w-9 place-items-center rounded-[7px] bg-[white] text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:text-[#ff8a00]" onClick={() => setOpen(false)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2">
              {navLinks.map((item) => (
                <NavLink className={({ isActive }) => `flex items-center justify-between gap-3 rounded-[7px] px-4 py-3 text-sm font-black transition ${isActive ? 'bg-orange-50 text-[#ff8a00]' : 'text-slate-700 hover:bg-slate-50 hover:text-[#ff8a00]'}`} key={item.label} onClick={handleLinkClick} to={item.to}>
                  <span>{item.label}</span>
                  {item.badge && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{item.badge}</span>}
                </NavLink>
              ))}
              <div className="grid gap-2 pt-2">
                {config.loginTo ? (
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-black transition hover:bg-[#fff4e6]" onClick={handleLinkClick} to={config.loginTo}>Login</Link>
                ) : (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-black transition hover:bg-[#fff4e6]" onClick={() => openAuthModal('login')} type="button">Login</button>
                )}
                {config.registerTo ? (
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-black text-white" onClick={handleLinkClick} to={config.registerTo}>Register</Link>
                ) : (
                  <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-black text-white" onClick={() => openAuthModal('register')} type="button">Register</button>
                )}
                <Link className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-black transition hover:bg-[#fff4e6]" onClick={handleLinkClick} to={config.cta.to}>
                  {config.cta.label}
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <AuthModal
        initialMode={authModalMode || 'login'}
        onClose={() => setAuthModalMode('')}
        onSuccess={() => setUser(getStoredUser())}
        open={Boolean(authModalMode)}
      />
    </>
  )
}
