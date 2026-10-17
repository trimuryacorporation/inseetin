import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Bell, BriefcaseBusiness, Building2, CalendarDays, ChevronDown, ChevronRight, ClipboardList, CreditCard, Download, Lock, LogOut, Mail, MapPin, Menu, MessageCircle, Phone, Search, Send, Share2, ShieldCheck, Sparkles, Star, UserRound, Users, Wallet, X } from 'lucide-react'
import { AuthModal } from './AuthModal'
import { Button } from './Button'
import { getStoredUser } from '../routes/authRouting'
import { EmployerFooter } from '../employer/components/EmployerFooter'
import { api } from '../services/api'
import { useApiResource } from '../hooks/useApiResource'
import { getCandidateProfileCompletion, getJobAlerts } from '../utils/candidateActivity'
import { getSavedJobs } from '../utils/savedJobs'
import { useSiteBranding } from '../utils/siteBranding'
import { useSocialMediaLinks } from '../utils/socialMediaLinks'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Jobs', to: '/jobs' },
  { label: 'Internship Course', to: '/internship-course' },
  { label: 'Companies', to: '/companies' },
  { label: 'Freelancer', to: '/freelancer' },
  { label: 'Candidates', to: '/candidate-dashboard' },
]

const publicNavItems = [
  { label: 'Jobs', to: '/jobs' },
  { label: 'Freelancer', to: '/freelancer' },
  { label: 'Courses', to: '/jobs', offer: true },
]

const recruiterDashboardPath = '/recruiter-dashboard'
const recruiterProfilePath = '/recruiter-profile'
const liveLocationRoles = ['Candidate', 'users', 'recruiter']

export function Layout() {
  const [open, setOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [clearedNotificationIds, setClearedNotificationIds] = useState([])
  const [user, setUser] = useState(() => getStoredUser())
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterStatus, setNewsletterStatus] = useState({ type: '', message: '' })
  const [newsletterLoading, setNewsletterLoading] = useState(false)
  const [appBannerOpen, setAppBannerOpen] = useState(true)

  useEffect(() => {
    if (!appBannerOpen) return

    const timeoutId = window.setTimeout(() => setAppBannerOpen(false), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [appBannerOpen])

  const [authModalMode, setAuthModalMode] = useState('')
  const [showCompaniesNav, setShowCompaniesNav] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const branding = useSiteBranding()
  const socialLinks = useSocialMediaLinks()
  const location = useLocation()
  const navigate = useNavigate()
  const isCandidate = user?.role === 'Candidate'
  const isUserAccount = ['Candidate', 'users'].includes(user?.role)
  const isRecruiterAccount = user?.role === 'recruiter'
  const hideFooterOnMobile = location.pathname === '/auth' || location.pathname === '/jobs' || location.pathname.startsWith('/jobs/') || location.pathname.startsWith('/job-listings-') || location.pathname.startsWith('/jobs-in-') || location.pathname.startsWith('/company-jobs-') || location.pathname.startsWith('/freelance-project-listings-') || location.pathname === '/candidate-dashboard' || location.pathname.startsWith('/candidate-')
  const visibleNavItems = navItems
    .filter((item) => item.label !== 'Companies' || showCompaniesNav)
    .filter((item) => !isUserAccount || item.label !== 'Recruiter')
    .map((item) => {
      if (isUserAccount && item.label === 'Candidates') return { ...item, label: 'Accounts' }
      if (isRecruiterAccount && item.label === 'Recruiter') return { ...item, to: recruiterDashboardPath }
      return item
    })
  const mobileNavItems = [...visibleNavItems, { label: 'Freelance Projects', to: '/freelancer/projects' }]
  const publicHeaderLinks = [
    { label: 'Home', to: '/' },
    { label: 'Find Jobs', to: '/jobs' },
    { label: 'Internship Course', to: '/internship-course', badge: 'Video' },
    ...(showCompaniesNav ? [{ label: 'Companies', to: '/companies' }] : []),
    { label: 'Freelance Projects', to: '/freelancer/projects', badge: 'New' },
    { label: 'Candidates', to: isUserAccount ? '/candidate-dashboard' : '/auth', caption: '' },
  ]

  useEffect(() => {
    setUser(getStoredUser())
    setOpen(false)
    setProfileOpen(false)
    setNotificationsOpen(false)
  }, [location.pathname])

  useEffect(() => {
    let mounted = true

    api
      .companyProfiles()
      .then((payload) => {
        if (!mounted) return
        const companies = Array.isArray(payload.data) ? payload.data : []
        const completeCompanies = companies.filter((company) => (
          company?.name
          && (company?.status || 'Active') !== 'Rejected'
        ))
        setShowCompaniesNav(completeCompanies.length >= 50)
      })
      .catch(() => {
        if (mounted) setShowCompaniesNav(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!user?.email || !user?.role) {
      setNotifications([])
      setClearedNotificationIds([])
      return
    }

    let mounted = true
    const key = getRoleNotificationClearKey(user)
    const loadNotifications = async () => {
      setNotificationsLoading(true)
      try {
        const roleNotifications = await buildRoleNotifications(user)
        const clearedIds = JSON.parse(localStorage.getItem(key) || '[]')
        if (!mounted) return
        setClearedNotificationIds(clearedIds)
        setNotifications(roleNotifications.filter((item) => !clearedIds.includes(item.id)))
      } catch {
        if (mounted) setNotifications([])
      } finally {
        if (mounted) setNotificationsLoading(false)
      }
    }

    loadNotifications()
    window.addEventListener('focus', loadNotifications)
    window.addEventListener('candidateActivityChanged', loadNotifications)
    window.addEventListener('savedJobsChanged', loadNotifications)
    window.addEventListener('recruiter-wallet-updated', loadNotifications)

    return () => {
      mounted = false
      window.removeEventListener('focus', loadNotifications)
      window.removeEventListener('candidateActivityChanged', loadNotifications)
      window.removeEventListener('savedJobsChanged', loadNotifications)
      window.removeEventListener('recruiter-wallet-updated', loadNotifications)
    }
  }, [user?.email, user?.role])

  useEffect(() => {
    if (!user?.role || !liveLocationRoles.includes(user.role)) return undefined

    const captureLocation = () => {
      const basePayload = {
        loginTime: new Date().toISOString(),
        deviceInfo: navigator.userAgent || '',
      }

      if (!navigator.geolocation) {
        api.trackUserLocation({ ...basePayload, locationStatus: 'unavailable' }).catch(() => {})
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          api.trackUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            heading: position.coords.heading,
            speed: position.coords.speed,
            ...basePayload,
            locationStatus: 'allowed',
          }).catch(() => {})
        },
        (error) => {
          api.trackUserLocation({
            ...basePayload,
            locationStatus: error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable',
          }).catch(() => {})
        },
        {
          enableHighAccuracy: true,
          maximumAge: 15000,
          timeout: 12000,
        },
      )
    }

    captureLocation()
    const interval = window.setInterval(captureLocation, 30000)
    return () => window.clearInterval(interval)
  }, [user?.email, user?.role])

  const clearNotifications = () => {
    if (!user?.email) return
    const nextIds = [...new Set([...clearedNotificationIds, ...notifications.map((item) => item.id)])]
    localStorage.setItem(getRoleNotificationClearKey(user), JSON.stringify(nextIds))
    setClearedNotificationIds(nextIds)
    setNotifications([])
  }

  const logout = () => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('authUser')
    localStorage.removeItem('authExpiresAt')
    setUser(null)
    setProfileOpen(false)
    navigate('/auth')
  }

  const subscribeNewsletter = async (event) => {
    event.preventDefault()
    const email = newsletterEmail.trim().toLowerCase()
    setNewsletterStatus({ type: '', message: '' })

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterStatus({ type: 'error', message: 'Please enter a valid email address.' })
      return
    }

    setNewsletterLoading(true)
    try {
      const payload = await api.subscribeNewsletter({
        email,
        source: user?.role ? `${user.role} footer` : 'public footer',
        topics: ['Hiring insights', 'Latest jobs', 'Recruiter updates'],
      })
      setNewsletterEmail('')
      setNewsletterStatus({ type: 'success', message: payload.message || 'Subscribed successfully. You will receive hiring updates.' })
    } catch (error) {
      setNewsletterStatus({ type: 'error', message: error.message || 'Subscription failed. Please try again.' })
    } finally {
      setNewsletterLoading(false)
    }
  }

  const openAuthModal = (mode) => {
    setAuthModalMode(mode)
    setOpen(false)
  }

  const handleHeaderLinkClick = () => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  const submitHeaderSearch = (event) => {
    event.preventDefault()
    const query = headerSearch.trim()
    navigate(query ? `/jobs?q=${encodeURIComponent(query)}` : '/jobs')
    handleHeaderLinkClick()
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-50 bg-white/95 px-2 py-2 shadow-sm backdrop-blur sm:px-4">
        <div className="mx-auto max-w-[1560px] rounded-[14px] bg-white shadow-xl shadow-slate-200/70">
          <nav className="flex min-h-[72px] items-center justify-between gap-3 px-3 sm:px-5 lg:gap-5">
            <Link className="flex w-32 shrink-0 items-center font-bold text-[#ff8a00] sm:w-40" onClick={handleHeaderLinkClick} to="/">
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
              {publicHeaderLinks.map((item) => (
                <NavLink
                  className={({ isActive }) =>
                    `group relative inline-flex min-h-[50px] items-center gap-1.5 text-[13px] font-bold transition ${
                      isActive ? 'text-[#0057B8]' : 'text-slate-950 hover:text-[#0057B8]'
                    }`
                  }
                  key={item.label}
                  onClick={handleHeaderLinkClick}
                  to={item.to}
                >
                  {({ isActive }) => (
                    <>
                      <span className="leading-5">
                        {item.label}
                        {item.caption && <span className="block text-xs font-semibold text-slate-500">{item.caption}</span>}
                      </span>
                      {item.badge && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-700">{item.badge}</span>}
                      {item.dropdown && <ChevronDown size={14} />}
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
                placeholder="Search jobs, skills or companies"
                value={headerSearch}
              />
            </form>

            <div className="hidden shrink-0 items-center gap-2 xl:flex">
            {isUserAccount ? (
              <>
                <RoleNotificationBell loading={notificationsLoading} notifications={notifications} onClear={clearNotifications} open={notificationsOpen} setOpen={setNotificationsOpen} setProfileOpen={setProfileOpen} user={user} />
                <CandidateProfileMenu logout={logout} open={profileOpen} setOpen={setProfileOpen} user={user} />
              </>
            ) : isRecruiterAccount ? (
              <>
                <RoleNotificationBell loading={notificationsLoading} notifications={notifications} onClear={clearNotifications} open={notificationsOpen} setOpen={setNotificationsOpen} setProfileOpen={setProfileOpen} user={user} />
                <CompanyProfileMenu logout={logout} open={profileOpen} setOpen={setProfileOpen} user={user} />
              </>
            ) : (
              <>
                <button className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-[#0057B8] bg-[white] px-4 text-sm font-bold text-[#0057B8] transition hover:bg-blue-50" onClick={() => openAuthModal('login')} type="button">
                  Login
                </button>
                <button className="inline-flex min-h-10 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-bold text-white shadow-lg shadow-orange-100 transition hover:bg-[#e87500]" onClick={() => openAuthModal('register')} type="button">
                  Register
                </button>
                <Link className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-[7px] bg-[#0057B8] px-4 text-[13px] font-bold text-white shadow-lg shadow-blue-100" onClick={handleHeaderLinkClick} to="/recruiter">
                  <BriefcaseBusiness size={19} />
                  <span>
                    For Employers
                    <span className="block text-xs font-semibold text-blue-100">Post Jobs Free</span>
                  </span>
                  <ArrowRight size={17} />
                </Link>
              </>
            )}
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
              {mobileNavItems.map((item) => (
                <NavLink className={({ isActive }) => `flex items-center justify-between gap-3 rounded-[7px] px-4 py-3 text-sm font-black transition ${isActive ? 'bg-orange-50 text-[#ff8a00]' : 'text-slate-700 hover:bg-slate-50 hover:text-[#ff8a00]'}`} key={item.label} onClick={() => setOpen(false)} to={item.to}>
                  <span>{item.label}</span>
                  {item.label === 'Recruiter' && (
                    <span className="recruiter-offer-badge rounded-[7px] bg-rose-600 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      New Recruiter Offer
                    </span>
                  )}
                </NavLink>
              ))}
              {isUserAccount ? (
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center gap-3 rounded-[7px] bg-blue-50 px-4 py-3 text-sm font-black text-slate-950">
                    <span className="grid h-9 w-9 place-items-center rounded-[7px] bg-blue-600 text-white">
                      <UserRound size={17} />
                    </span>
                    {user.name || 'Candidate'}
                  </div>
                  <MobileNotifications loading={notificationsLoading} notifications={notifications} onClear={clearNotifications} user={user} />
                  {isCandidate && <Button onClick={() => setOpen(false)} to="/candidate-profile" variant="secondary">Profile</Button>}
                  <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100" onClick={logout} type="button">
                    Logout
                  </button>
                </div>
              ) : isRecruiterAccount ? (
                <div className="grid gap-2 pt-2">
                  <div className="flex items-center gap-3 rounded-[7px] bg-blue-50 px-4 py-3 text-sm font-black text-slate-950">
                    <span className="grid h-9 w-9 place-items-center rounded-[7px] bg-blue-600 text-white">
                      <UserRound size={17} />
                    </span>
                    {user.name || 'Company'}
                  </div>
                  <MobileNotifications loading={notificationsLoading} notifications={notifications} onClear={clearNotifications} user={user} />
                  <Button onClick={() => setOpen(false)} to={recruiterProfilePath} variant="secondary">Profile</Button>
                  <Button onClick={() => setOpen(false)} to={recruiterDashboardPath} variant="secondary">Dashboard</Button>
                  <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-rose-50 px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-100" onClick={logout} type="button">
                    Logout
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid gap-2 pt-2">
                    <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-black transition hover:bg-[#fff4e6]" onClick={() => openAuthModal('login')} type="button">Login</button>
                    <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-[#ff8a00] px-4 text-sm font-black text-white" onClick={() => openAuthModal('register')} type="button">Register</button>
                  </div>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-black transition hover:bg-[#fff4e6]" onClick={() => setOpen(false)} to="/recruiter">
                    Employer sign up
                  </Link>
                </>
              )}
              </div>
          </aside>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <div className={hideFooterOnMobile ? 'hidden lg:block' : ''}>
      {isRecruiterAccount ? (
        <EmployerFooter />
      ) : (
        <MainFooter
          branding={branding}
          newsletterEmail={newsletterEmail}
          newsletterLoading={newsletterLoading}
          newsletterStatus={newsletterStatus}
          onNewsletterEmailChange={setNewsletterEmail}
          onSubscribeNewsletter={subscribeNewsletter}
          socialLinks={socialLinks}
        />
      )}
      </div>
      <AuthModal
        initialMode={authModalMode || 'login'}
        onClose={() => setAuthModalMode('')}
        onSuccess={() => setUser(getStoredUser())}
        open={Boolean(authModalMode)}
      />
      {appBannerOpen && <AppDownloadPopup branding={branding} onClose={() => setAppBannerOpen(false)} />}
    </div>
  )
}

function getRoleNotificationClearKey(user = {}) {
  return `roleNotificationsCleared:${user.role || 'guest'}:${String(user.email || '').toLowerCase()}`
}

async function buildRoleNotifications(user) {
  if (user.role === 'Candidate') return buildCandidateNotifications(user)
  if (user.role === 'users') return buildUserNotifications(user)
  if (user.role === 'recruiter') return buildRecruiterHeaderNotifications(user)
  return []
}

async function buildCandidateNotifications(user) {
  const [applicationsPayload] = await Promise.all([
    api.list('applications', `?candidateEmail=${encodeURIComponent(user.email)}&sort=-createdAt&limit=100`).catch(() => ({ data: [] })),
  ])
  const applications = Array.isArray(applicationsPayload.data) ? applicationsPayload.data : []
  const savedJobs = getSavedJobs(user)
  const jobAlerts = getJobAlerts(user)
  const profileCompletion = getCandidateProfileCompletion(user)
  const interviewCount = applications.filter((item) => ['Interview', 'Selected'].includes(item.status)).length
  const items = []

  if (!profileCompletion.complete) {
    items.push({
      id: 'candidate-profile-incomplete',
      title: `${profileCompletion.missing.length} profile details pending`,
      description: 'Complete your profile and resume before applying for jobs.',
      to: '/candidate-profile',
      icon: ShieldCheck,
      tone: 'rose',
      meta: 'Profile',
    })
  }

  if (applications.length) {
    items.push({
      id: 'candidate-applications',
      title: `${applications.length} applied jobs`,
      description: 'Track your application status and recruiter updates.',
      to: '/candidate-applied-jobs',
      icon: ClipboardList,
      tone: 'blue',
      meta: 'Applications',
    })
  }

  if (interviewCount) {
    items.push({
      id: 'candidate-interviews',
      title: `${interviewCount} interview invites`,
      description: 'Review interview and selected-stage applications.',
      to: '/candidate-interview-invites',
      icon: CalendarDays,
      tone: 'violet',
      meta: 'Interview',
    })
  }

  if (savedJobs.length) {
    items.push({
      id: 'candidate-saved-jobs',
      title: `${savedJobs.length} saved jobs`,
      description: 'Review saved jobs and apply.',
      to: '/candidate-saved-jobs',
      icon: Sparkles,
      tone: 'teal',
      meta: 'Saved',
    })
  }

  if (jobAlerts.length) {
    items.push({
      id: 'candidate-job-alerts',
      title: `${jobAlerts.length} job alerts active`,
      description: 'Alert preferences are active for matching jobs.',
      to: '/candidate-job-alerts',
      icon: Bell,
      tone: 'emerald',
      meta: 'Alerts',
    })
  }

  applications.slice(0, 3).forEach((application) => {
    items.push({
      id: `candidate-application-${application._id}`,
      title: `${application.jobTitle || 'Job'} status: ${application.status || 'New'}`,
      description: `${application.company || 'Company'} / applied ${application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'recently'}`,
      to: '/candidate-applied-jobs',
      icon: BriefcaseBusiness,
      tone: application.status === 'Rejected' ? 'rose' : application.status === 'Selected' ? 'emerald' : 'slate',
      meta: application.status || 'New',
    })
  })

  return items
}

async function buildUserNotifications(user) {
  const supportPayload = await api.list('support-messages', `?email=${encodeURIComponent(user.email)}&sort=-createdAt&limit=20`).catch(() => ({ data: [] }))
  const supportMessages = Array.isArray(supportPayload.data) ? supportPayload.data : []
  const items = [
    {
      id: 'user-account-ready',
      title: 'Account workspace ready',
      description: 'Your account is ready for support, jobs, and profile access.',
      to: '/candidate-dashboard',
      icon: UserRound,
      tone: 'blue',
      meta: 'Account',
    },
  ]

  supportMessages.slice(0, 4).forEach((message) => {
    items.push({
      id: `user-support-${message._id}`,
      title: `${message.subject || 'Support chat'}: ${message.status || 'Open'}`,
      description: message.message || 'Support team conversation update.',
      to: '/support',
      icon: MessageCircle,
      tone: ['Open', 'In Progress'].includes(message.status) ? 'teal' : 'slate',
      meta: 'Support',
    })
  })

  return items
}

async function buildRecruiterHeaderNotifications(user) {
  const [dashboardPayload, walletPayload] = await Promise.all([
    api.employerDashboard(user.email).catch(() => ({ data: {} })),
    api.currentRecruiterPackage(user.email).catch(() => ({ data: null })),
  ])
  const dashboard = dashboardPayload.data || {}
  const metrics = dashboard.metrics || {}
  const applications = Array.isArray(dashboard.applications) ? dashboard.applications : []
  const wallet = walletPayload.data
  const items = []

  if (Number(metrics.activeApplications || 0)) {
    items.push({
      id: 'recruiter-header-active-applications',
      title: `${metrics.activeApplications} active applications`,
      description: 'Review candidates, shortlist them, and move them to the interview stage.',
      to: '/recruiter-applications?status=active',
      icon: ClipboardList,
      tone: 'blue',
      meta: 'Hiring',
    })
  }

  if (wallet) {
    items.push({
      id: 'recruiter-header-wallet',
      title: `${wallet.coinBalance || 0} wallet coins`,
      description: 'View job posting wallet and package details.',
      to: '/recruiter-pricing',
      icon: Wallet,
      tone: Number(wallet.coinBalance || 0) > 0 ? 'emerald' : 'rose',
      meta: wallet.packageSnapshot?.name || 'Wallet',
    })
  } else {
    items.push({
      id: 'recruiter-header-package',
      title: 'Package activation required',
      description: 'Activate a recruiter package to post jobs.',
      to: '/recruiter-pricing',
      icon: CreditCard,
      tone: 'rose',
      meta: 'Package',
    })
  }

  applications.slice(0, 3).forEach((application) => {
    items.push({
      id: `recruiter-header-application-${application._id}`,
      title: `${application.candidateName || 'Candidate'} applied`,
      description: `${application.jobTitle || 'Job'} / ${application.status || 'New'}`,
      to: application.candidateEmail ? `/recruiter-applications/candidate/${encodeURIComponent(application.candidateEmail)}` : '/recruiter-applications',
      icon: Users,
      tone: 'teal',
      meta: application.createdAt ? new Date(application.createdAt).toLocaleDateString() : 'Recent',
    })
  })

  return items
}

function getRoleNotificationTone(tone) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700 ring-blue-100',
    teal: 'bg-teal-50 text-teal-700 ring-teal-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    rose: 'bg-rose-50 text-rose-700 ring-rose-100',
    slate: 'bg-slate-50 text-slate-700 ring-slate-200',
  }

  return tones[tone] || tones.blue
}

function RoleNotificationBell({ loading, notifications, onClear, open, setOpen, setProfileOpen, user }) {
  return (
    <div className="relative">
      <button
        className="relative grid h-8 w-10 place-items-center rounded-[3px] border border-[#ff8a00] bg-[#ff8a00] text-white transition hover:bg-[#e87500]"
        onClick={() => {
          setOpen((value) => !value)
          setProfileOpen(false)
        }}
        type="button"
      >
        <Bell size={17} />
        {notifications.length > 0 && (
          <span className="absolute -right-1.5 -top-2 grid h-5 min-w-5 place-items-center rounded-[7px] bg-white px-1 text-[10px] font-black text-teal-700 ring-2 ring-[#ff8a00]">
            {notifications.length}
          </span>
        )}
      </button>
      {open && <RoleNotificationMenu floating loading={loading} notifications={notifications} onClear={onClear} role={user?.role} />}
    </div>
  )
}

function RoleNotificationMenu({ floating = false, loading, notifications, onClear, role }) {
  return (
    <div className={`${floating ? 'absolute right-0 top-14 z-50 w-[24rem] max-w-[calc(100vw-2rem)] shadow-2xl shadow-blue-100' : 'w-full'} rounded-[7px] border border-slate-200 bg-white p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-black text-slate-950">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button className="rounded-[7px] bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 transition hover:bg-rose-50 hover:text-rose-700" onClick={onClear} type="button">Clear</button>
          )}
          <span className="rounded-[7px] bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">{role || 'User'} live</span>
        </div>
      </div>
      {loading ? (
        <div className="rounded-[7px] bg-slate-50 p-4 text-sm font-bold text-slate-500">Loading notifications...</div>
      ) : notifications.length ? (
        <div className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
          {notifications.map((item) => {
            const Icon = item.icon
            return (
              <Link className="group rounded-[7px] border border-slate-100 bg-white p-3 transition hover:border-blue-100 hover:bg-blue-50/50" key={item.id} to={item.to}>
                <div className="flex gap-3">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-[7px] ring-1 ${getRoleNotificationTone(item.tone)}`}>
                    <Icon size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span className="font-black text-slate-950">{item.title}</span>
                      <span className="shrink-0 rounded-[7px] bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 group-hover:bg-white">{item.meta}</span>
                    </span>
                    <span className="mt-1 block text-sm font-semibold leading-5 text-slate-500">{item.description}</span>
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[7px] bg-slate-50 p-4">
          <p className="font-black text-slate-950">All clear</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">There are no new notifications for your role.</p>
        </div>
      )}
    </div>
  )
}

function MobileNotifications({ loading, notifications, onClear, user }) {
  return (
    <div className="pt-2">
      <RoleNotificationMenu loading={loading} notifications={notifications} onClear={onClear} role={user?.role} />
    </div>
  )
}

function CompanyProfileMenu({ logout, open, setOpen, user }) {
  return (
    <div className="relative">
      <button
        className="inline-flex min-h-8 items-center justify-center rounded-[3px] border border-[#ff8a00] bg-[white] px-5 text-sm font-black text-black transition hover:border-[#e87500] hover:bg-[#fff4e6]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {user.name || 'Company'}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-56 rounded-[7px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
          {[
            ['Profile', recruiterProfilePath],
            ['Dashboard', recruiterDashboardPath],
          ].map(([label, to]) => (
            <Link className="flex items-center gap-3 rounded-[7px] px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" key={label} onClick={() => setOpen(false)} to={to}>
              <UserRound size={17} />
              {label}
            </Link>
          ))}
          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50" onClick={logout} type="button">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

function CandidateProfileMenu({ logout, open, setOpen, user }) {
  return (
    <div className="relative">
      <button
        className="inline-flex min-h-8 items-center justify-center rounded-[3px] border border-[#ff8a00] bg-[white] px-5 text-sm font-black text-black transition hover:border-[#e87500] hover:bg-[#fff4e6]"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {user.name || 'Candidate'}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-52 rounded-[7px] border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
          <Link className="flex items-center gap-3 rounded-[7px] px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50" onClick={() => setOpen(false)} to="/candidate-profile">
            <UserRound size={17} />
            Profile
          </Link>
          <button className="flex w-full items-center gap-3 rounded-[7px] px-3 py-2 text-left text-sm font-bold text-rose-600 hover:bg-rose-50" onClick={logout} type="button">
            <LogOut size={17} />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

function MainFooter({ branding, newsletterEmail, newsletterLoading, newsletterStatus, onNewsletterEmailChange, onSubscribeNewsletter, socialLinks }) {
  const platformLinks = [
    ['Home', '/'],
    ['About Us', '/about'],
    ['Press / News', '/press-news'],
    ['Jobs', '/jobs'],
    ['Internship Course', '/internship-course'],
    ['Career Resources', '/career-resources'],
    ['Companies', '/companies'],
    ['Industries', '/industries'],
    ['Contact', '/contact'],
    ['FAQs', '/faqs'],
    ['Support', '/support'],
  ]
  const candidateLinks = [
    ['Candidate Login', '/auth'],
    ['Dashboard', '/candidate-dashboard'],
    ['Saved Jobs', '/candidate-saved-jobs'],
    ['Job Alerts', '/candidate-job-alerts'],
    ['Applications', '/candidate-applied-jobs'],
    ['Profile Settings', '/candidate-profile'],
    ['Resume Builder', '/candidate-profile'],
  ]
  const { data: summary, loading: summaryLoading, error: summaryError } = useApiResource(() => api.portalSummary(), { counts: {} }, [])
  const counts = summary.counts || {}
  const count = (key) => summaryLoading || summaryError ? '?' : Number(counts[key] || 0).toLocaleString()
  const stats = [
    [BriefcaseBusiness, count('jobs'), 'Jobs Available', 'blue'],
    [Users, count('candidates'), 'Candidates', 'green'],
    [Building2, count('companies'), 'Companies', 'orange'],
    [ShieldCheck, count('recruiters'), 'Recruiters', 'purple'],
  ]
  const handleFooterLinkClick = () => {
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  return (
    <footer className="w-full bg-white">
      <div className="w-full overflow-hidden bg-white">
        <section className="relative overflow-hidden bg-gradient-to-r from-[#0057B8] via-[#0057B8] to-[#003f9b] px-4 py-5 text-white sm:px-6">
          <div className="absolute left-6 top-5 grid grid-cols-6 gap-2 opacity-15">
            {Array.from({ length: 24 }).map((_, index) => <span className="h-1 w-1 rounded-full bg-white" key={index} />)}
          </div>
          <div className="absolute -right-8 top-7 h-16 w-16 rounded-full border-[12px] border-white/5" />
          <div className="relative mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.8fr_1.7fr_0.75fr] lg:items-center">
            <div className="hidden min-h-28 place-items-center rounded-[10px] bg-white/10 ring-1 ring-white/10 lg:grid">
              <div className="relative">
                <div className="grid h-16 w-16 place-items-center rounded-[18px] bg-blue-400/40 shadow-xl shadow-blue-950/25">
                  <BriefcaseBusiness size={34} />
                </div>
                <span className="absolute -right-4 bottom-0 grid h-11 w-11 place-items-center rounded-full bg-white text-blue-700 shadow-lg">
                  <SearchFooterIcon />
                </span>
                <span className="absolute -right-1 top-0 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-white">
                  <ShieldCheck size={13} />
                </span>
              </div>
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">Enterprise Hiring Network</p>
              <h2 className="mt-2 max-w-2xl text-2xl font-black leading-tight sm:text-3xl">
                Find Better Opportunities. Build a Successful Career.
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-blue-50">
                Explore verified jobs, connect with trusted companies, and manage your career journey with ease.
              </p>
            </div>
            <div className="border-white/25 lg:border-l lg:pl-6">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-blue-700">
                  <BriefcaseBusiness size={21} />
                </span>
                <div>
                  <h3 className="text-base font-black">Explore Jobs</h3>
                  <p className="mt-1 text-xs font-semibold leading-5 text-blue-50">Discover opportunities from top companies.</p>
                </div>
              </div>
              <Link
                className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-orange-400 bg-orange-400 px-5 text-sm font-black text-slate-950 shadow-none transition hover:bg-orange-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                onClick={handleFooterLinkClick}
                to="/jobs"
              >
                Find Jobs <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[1.05fr_0.82fr_0.82fr_1.15fr] lg:gap-5 lg:py-6">
          <div className="min-w-0 lg:col-span-1">
            <Link className="inline-flex min-w-0 items-center font-black text-slate-950" onClick={handleFooterLinkClick} to="/">
              {branding.logoUrl ? (
                <img className="h-11 w-auto max-w-full object-contain sm:h-14 sm:max-w-[220px]" src={branding.logoUrl} alt={branding.siteName || 'INSEET'} />
              ) : (
                <>
                  <span className="grid h-10 w-10 place-items-center"><BriefcaseBusiness size={22} /></span>
                  <span className="text-lg text-[#ff8a00]">{branding.siteName || 'INSEET'}</span>
                </>
              )}
            </Link>
            <p className="mt-2 max-w-sm text-xs font-semibold leading-5 text-slate-500 sm:mt-3 sm:text-sm sm:leading-6">
              A modern enterprise job portal for candidates, HR teams, and growing companies.
            </p>
            <div className="mt-3 grid gap-2 sm:mt-4 sm:gap-3">
              <FooterFeature icon={<ShieldCheck size={18} />} title="Verified Company Ecosystem" text="Verified companies and transparent hiring." tone="green" />
              <FooterFeature icon={<Sparkles size={18} />} title="Premium Candidate Experience" text="Smart matching, alerts, and dashboards." tone="blue" />
              <FooterFeature icon={<Users size={18} />} title="Career-Focused Platform" text="Find, track, and grow your career." tone="purple" />
            </div>
          </div>

          <FooterLinkPanel icon={<BriefcaseBusiness size={19} />} onLinkClick={handleFooterLinkClick} title="Platform" links={platformLinks} tone="blue" />
          <FooterLinkPanel icon={<UserRound size={19} />} onLinkClick={handleFooterLinkClick} title="Candidates" links={candidateLinks} tone="green" />

          <div className="min-w-0 rounded-[10px] border border-blue-100 bg-white p-3 shadow-sm shadow-blue-50 lg:col-span-1">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-violet-50 text-violet-600"><Mail size={17} /></span>
              <h3 className="text-sm font-black uppercase text-slate-950">Contact & Updates</h3>
            </div>
            <div className="grid gap-2 text-sm font-semibold text-slate-500">
              <p className="flex min-w-0 items-center gap-2 break-words"><Mail className="shrink-0 text-blue-600" size={17} /> {branding.recruiterEmail || 'care@inseet.in'}</p>
              <p className="flex min-w-0 items-center gap-2 break-words"><Phone className="shrink-0 text-blue-600" size={17} /> {branding.tollFreeNumber || '+91 1800-123-4567'}</p>
              <p className="flex min-w-0 items-center gap-2 break-words"><MessageCircle className="shrink-0 text-blue-600" size={17} /> Chat with our support team</p>
              {branding.showRecruiterFooterLocation !== false && (
                <p className="flex min-w-0 items-center gap-2 break-words"><MapPin className="shrink-0 text-blue-600" size={17} /> {branding.recruiterFooterLocation || 'India (All Major Cities)'}</p>
              )}
            </div>
            <div className="mt-3 rounded-[8px] border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-black text-slate-950">Stay Updated</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Get latest jobs and career tips.</p>
              <form className="mt-3 flex gap-2" onSubmit={onSubscribeNewsletter}>
                <input
                  className="min-w-0 flex-1 rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
                  disabled={newsletterLoading}
                  onChange={(event) => onNewsletterEmailChange(event.target.value)}
                  placeholder="Enter your email"
                  type="email"
                  value={newsletterEmail}
                />
                <button className="grid h-10 w-10 shrink-0 place-items-center rounded-[8px] bg-[#0057B8] text-white shadow-lg shadow-blue-100 disabled:cursor-not-allowed disabled:opacity-60" disabled={newsletterLoading} type="submit" aria-label="Subscribe to updates">
                  {newsletterLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={17} />}
                </button>
              </form>
              <p className={`mt-2 flex items-start gap-2 text-xs font-bold ${newsletterStatus.type === 'error' ? 'text-rose-600' : newsletterStatus.type === 'success' ? 'text-teal-700' : 'text-slate-500'}`}>
                <Lock className="mt-0.5 shrink-0" size={13} />
                {newsletterStatus.message || 'We respect your privacy. Unsubscribe anytime.'}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mb-4 max-w-7xl px-4 sm:px-6">
          <div className="rounded-[10px] border border-blue-100 bg-white p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            {stats.map(([Icon, value, label, tone]) => (
              <div className="flex items-center gap-3 border-slate-200 md:justify-center md:border-r md:last:border-r-0" key={label}>
                <span className={`grid h-10 w-10 place-items-center rounded-full ${getFooterTone(tone)}`}>
                  <Icon size={19} />
                </span>
                <div>
                  <p className="text-lg font-black text-slate-950">{value}</p>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 bg-[#082347] px-4 py-4 text-xs font-semibold text-white sm:px-6 sm:text-sm md:flex md:flex-row md:items-center md:justify-between">
          <p className="min-w-0 leading-5">© 2026 INSEET. All rights reserved.</p>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <Link className="hover:text-blue-200" onClick={handleFooterLinkClick} to="/privacy">Privacy Policy</Link>
            <span className="text-white/40">|</span>
            <Link className="hover:text-blue-200" onClick={handleFooterLinkClick} to="/terms">Terms & Conditions</Link>
            <span className="text-white/40">|</span>
            <Link className="hover:text-blue-200" onClick={handleFooterLinkClick} to="/support">Support</Link>
            <SocialLinks links={socialLinks} compact />
          </div>
        </section>
      </div>
    </footer>
  )
}

function FooterFeature({ icon, title, text, tone }) {
  return (
    <div className="flex gap-2 sm:gap-3">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-[8px] sm:h-9 sm:w-9 sm:rounded-[10px] ${getFooterTone(tone)}`}>{icon}</span>
      <div>
        <h4 className="text-xs font-black leading-4 text-slate-950 sm:text-sm">{title}</h4>
        <p className="mt-0.5 text-[11px] font-semibold leading-4 text-slate-500 sm:text-xs sm:leading-5">{text}</p>
      </div>
    </div>
  )
}

function FooterLinkPanel({ icon, title, links, onLinkClick, tone }) {
  return (
    <div className="min-w-0 rounded-[10px] border border-blue-100 bg-white p-2.5 shadow-sm shadow-blue-50 sm:p-3">
      <div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[7px] sm:h-8 sm:w-8 sm:rounded-[8px] ${getFooterTone(tone)}`}>{icon}</span>
        <h3 className="text-xs font-black uppercase text-slate-950 sm:text-sm">{title}</h3>
      </div>
      <div className="grid divide-y divide-slate-100">
        {links.map(([label, to]) => (
          <Link className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-xs font-bold text-slate-700 transition hover:bg-blue-50 hover:text-blue-600 focus-visible:bg-blue-50 focus-visible:text-blue-600 sm:text-sm" key={label} onClick={onLinkClick} to={to}>
            {label}
            <ChevronRight className="text-slate-400" size={15} />
          </Link>
        ))}
      </div>
    </div>
  )
}

function getFooterTone(tone) {
  const tones = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600',
    orange: 'bg-orange-50 text-[#ff8a00]',
    purple: 'bg-violet-50 text-violet-600',
  }
  return tones[tone] || tones.blue
}

function SearchFooterIcon() {
  return (
    <span className="relative block h-6 w-6 rounded-full border-[4px] border-current">
      <span className="absolute -bottom-1.5 -right-1.5 h-3 w-1 rotate-[-45deg] rounded-full bg-current" />
    </span>
  )
}

function FooterColumn({ title, links }) {
  return (
    <div className="min-w-0">
      <h3 className="text-[11px] font-black uppercase leading-4 tracking-wide text-slate-950 sm:text-sm">{title}</h3>
      <div className="mt-3 grid gap-2 text-[11px] font-medium leading-4 text-slate-500 sm:mt-4 sm:space-y-3 sm:text-sm">
        {links.map(([label, to]) => (
          <Link className="block min-w-0 break-words transition hover:translate-x-1 hover:text-blue-600" key={label} to={to}>
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}

function AppDownloadPopup({ branding = {}, onClose }) {
  const playStoreLink = branding.playStoreLink || 'https://play.google.com/store'
  const appStoreLink = branding.appStoreLink || playStoreLink
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=12&data=${encodeURIComponent(playStoreLink)}`

  return (
    <div className="fixed inset-0 z-[110] grid place-items-center overflow-y-auto bg-slate-950/35 px-3 py-3 backdrop-blur-sm sm:py-4">
      <div className="relative my-auto max-h-[calc(100vh-24px)] w-full max-w-[420px] overflow-y-auto overflow-x-hidden rounded-[18px] bg-white shadow-2xl shadow-slate-950/20 sm:max-h-[calc(100vh-32px)] sm:max-w-6xl sm:rounded-[22px]">
        <div className="relative flex min-h-[74px] w-[calc(100%-68px)] items-center gap-3 rounded-br-[34px] bg-gradient-to-r from-[#1677ff] to-[#5b31f3] px-4 pr-5 text-white sm:absolute sm:left-0 sm:top-0 sm:min-h-[102px] sm:w-[60%] sm:gap-5 sm:rounded-br-[58px] sm:px-11">
          <Phone className="shrink-0" size={32} />
          <h2 className="text-lg font-black leading-tight tracking-tight sm:text-3xl">{branding.appDownloadTitle || 'Download the INSEET App'}</h2>
        </div>
        <button
          aria-label="Close app download popup"
          className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-[#005bbb] text-white shadow-xl shadow-blue-200 transition hover:bg-[#004a99] sm:right-5 sm:top-5 sm:h-16 sm:w-16"
          onClick={onClose}
          type="button"
        >
          <X size={26} />
        </button>

        <div className="grid gap-5 px-4 pb-5 pt-5 sm:px-10 sm:pb-8 sm:pt-40 lg:grid-cols-[0.42fr_0.58fr] lg:gap-10">
          <div className="flex flex-col items-center border-slate-200 lg:border-r lg:pr-10">
            <a className="relative rounded-[10px] bg-white p-3 shadow-xl shadow-slate-200 ring-2 ring-[#1677ff] sm:p-5" href={playStoreLink} rel="noreferrer" target="_blank">
              <img className="h-44 w-44 object-contain sm:h-64 sm:w-64" src={qrUrl} alt="Scan QR code to download INSEET app" />
              {branding.logoUrl && (
                <span className="absolute left-1/2 top-1/2 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[12px] bg-white shadow-lg sm:h-16 sm:w-16 sm:rounded-[14px]">
                  <img className="h-9 w-9 object-contain sm:h-12 sm:w-12" src={branding.logoUrl} alt="" />
                </span>
              )}
            </a>
            <p className="mt-4 text-center text-xl font-black text-[#07113f] sm:mt-7 sm:text-2xl">Scan the QR code</p>
            <p className="mt-1 text-center text-base font-semibold text-slate-500 sm:mt-2 sm:text-xl">to download the app</p>
          </div>

          <div className="grid content-center gap-5 sm:gap-8">
            <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
              <div className="px-3">
                <p className="inline-flex items-center justify-center gap-2 text-3xl font-black text-[#07113f] sm:gap-3 sm:text-5xl">
                  {branding.appRating || '4.4'}
                  <Star className="fill-[#ffb000] text-[#ffb000]" size={30} />
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500 sm:mt-4 sm:text-xl">{branding.appReviews || '42K Reviews'}</p>
              </div>
              <div className="px-3">
                <p className="inline-flex items-center justify-center gap-2 text-3xl font-black text-[#07113f] sm:gap-4 sm:text-5xl">
                  {branding.appDownloads || '50L+'}
                  <Download className="text-[#365cff]" size={32} />
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500 sm:mt-4 sm:text-xl">Downloads</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-center gap-3 sm:mb-5 sm:gap-4">
                <span className="h-px w-14 bg-slate-200 sm:w-28" />
                <p className="text-lg font-black text-[#07113f] sm:text-2xl">Available on</p>
                <span className="h-px w-14 bg-slate-200 sm:w-28" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center sm:justify-center sm:gap-4">
                <StoreDownloadButton href={playStoreLink} label="GET IT ON" name="Google Play" play />
                <StoreDownloadButton href={appStoreLink} label="Download on the" name="App Store" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-[12px] bg-[#f0edff] p-3 sm:gap-3 sm:p-5">
              {[
                [ShieldCheck, 'Secure & Trusted'],
                [Sparkles, 'Fast & Easy'],
                [Bell, 'Always Updated'],
              ].map(([Icon, label]) => (
                <div className="flex flex-col items-center justify-center gap-1 border-slate-200 text-center text-[#07113f] sm:flex-row sm:gap-3 sm:border-r sm:last:border-r-0 sm:text-left" key={label}>
                  <Icon className="text-[#663ff0]" size={24} />
                  <span className="text-xs font-semibold leading-tight sm:text-lg">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StoreDownloadButton({ href, label, name, play = false }) {
  return (
    <a className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-[#005bbb] px-3 text-white shadow-lg shadow-blue-100 transition hover:-translate-y-0.5 hover:bg-[#004a99] sm:min-h-20 sm:min-w-[230px] sm:gap-4 sm:px-6" href={href} rel="noreferrer" target="_blank">
      {play ? (
        <span className="h-0 w-0 border-y-[12px] border-l-[20px] border-y-transparent border-l-[#32d06b] sm:border-y-[18px] sm:border-l-[30px]" />
      ) : (
        <span className="text-2xl font-black sm:text-4xl">A</span>
      )}
      <span>
        <span className="block text-[10px] font-semibold leading-none sm:text-sm">{label}</span>
        <span className="mt-1 block text-lg font-black leading-none sm:text-3xl">{name}</span>
      </span>
    </a>
  )
}

function FloatingAppBanner({ onClose }) {
  const qrCells = [
    1, 1, 1, 0, 1, 0, 1, 1, 1,
    1, 0, 1, 0, 0, 1, 0, 0, 1,
    1, 1, 1, 1, 0, 1, 1, 0, 1,
    0, 1, 0, 0, 1, 0, 1, 1, 0,
    1, 0, 1, 1, 1, 0, 0, 1, 1,
    0, 1, 0, 1, 0, 1, 1, 0, 0,
    1, 0, 1, 0, 1, 1, 0, 1, 1,
    1, 1, 0, 1, 0, 0, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 1, 1,
  ]

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 max-w-[430px] overflow-hidden rounded-[12px] bg-white shadow-2xl shadow-slate-950/25 ring-1 ring-slate-200 sm:left-6 sm:right-auto">
      <div className="inline-flex rounded-br-[8px] bg-gradient-to-r from-[#ff4f62] to-[#ff2b91] px-4 py-2 text-sm font-black text-white">
        Download the App!
      </div>
      <button
        aria-label="Close app download banner"
        className="absolute right-3 top-11 grid h-8 w-8 place-items-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
        onClick={onClose}
        type="button"
      >
        <X size={18} />
      </button>
      <div className="grid grid-cols-[112px_1fr] gap-4 px-4 pb-4 pt-4 sm:px-5">
        <div className="border-r border-slate-200 pr-4">
          <div className="mx-auto grid h-[78px] w-[78px] grid-cols-9 gap-[2px] rounded-[5px] bg-white p-1.5 ring-1 ring-slate-200">
            {qrCells.map((filled, index) => (
              <span className={filled ? 'bg-black' : 'bg-white'} key={index} />
            ))}
          </div>
          <p className="mt-2 text-center text-xs font-semibold text-slate-600">Scan the QR</p>
        </div>
        <div className="min-w-0 pr-8">
          <div className="grid grid-cols-2 divide-x divide-slate-200 text-center">
            <div className="px-2">
              <p className="inline-flex items-center gap-1 text-base font-black text-slate-800">4.4 <Star className="fill-[#ffb000] text-[#ffb000]" size={15} /></p>
              <p className="mt-1 text-xs font-semibold text-slate-500">42K Reviews</p>
            </div>
            <div className="px-2">
              <p className="inline-flex items-center gap-1 text-base font-black text-slate-800">50L+ <Download size={14} /></p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Downloads</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-3 text-center">
            <p className="text-xs font-semibold text-slate-500">Available on</p>
            <div className="mt-2 flex items-center justify-center gap-2">
              <span className="inline-flex h-7 items-center rounded-[5px] bg-slate-950 px-2 text-[10px] font-black leading-none text-white">Google Play</span>
              <span className="text-lg font-black text-slate-500"></span>
              <span className="h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-[#30b85a]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SocialLinks({ links, compact = false }) {
  const defaultLinks = compact
    ? [
        { platform: 'facebook', label: 'Facebook', url: '#' },
        { platform: 'linkedin', label: 'LinkedIn', url: '#' },
        { platform: 'twitter', label: 'Twitter', url: '#' },
        { platform: 'instagram', label: 'Instagram', url: '#' },
      ]
    : []
  const visibleLinks = links.filter((item) => item.url)
  const renderedLinks = visibleLinks.length ? visibleLinks : defaultLinks
  if (!renderedLinks.length) return null

  return (
    <div className={compact ? 'flex flex-wrap gap-2' : 'mt-4 flex flex-wrap gap-2 sm:mt-5'}>
      {renderedLinks.map((item) => {
        const tone = getSocialTone(item.platform)
        return (
          <a
            aria-label={item.label || item.platform}
            className={`grid place-items-center rounded-[7px] transition ${compact ? 'h-8 w-8 bg-white !text-[#082347] hover:bg-blue-50' : `h-9 w-9 sm:h-10 sm:w-10 ${tone}`}`}
            href={item.url}
            key={`${item.platform}-${item.url}`}
            rel="noreferrer"
            target="_blank"
            title={item.label || item.platform}
          >
            <SocialGlyph platform={item.platform} />
          </a>
        )
      })}
    </div>
  )
}

function SocialGlyph({ platform = '' }) {
  const key = platform.toLowerCase()
  if (key.includes('instagram')) return <span className="text-xs font-black">IG</span>
  if (key.includes('youtube')) return <span className="text-xs font-black">YT</span>
  if (key.includes('facebook')) return <span className="text-sm font-black">f</span>
  if (key.includes('instagram')) return <span className="text-sm font-black">◎</span>
  if (key.includes('linkedin')) return <span className="text-sm font-black">in</span>
  if (key.includes('youtube')) return <span className="text-sm font-black">▶</span>
  if (key.includes('twitter') || key === 'x') return <span className="text-sm font-black">X</span>
  if (key.includes('whatsapp')) return <MessageCircle size={18} />
  return <Share2 size={18} />
}

function getSocialTone(platform = '') {
  const key = platform.toLowerCase()
  if (key.includes('facebook')) return 'bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2] hover:text-white'
  if (key.includes('instagram')) return 'bg-[#E4405F]/10 text-[#E4405F] hover:bg-[#E4405F] hover:text-white'
  if (key.includes('linkedin')) return 'bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white'
  if (key.includes('youtube')) return 'bg-[#FF0000]/10 text-[#FF0000] hover:bg-[#FF0000] hover:text-white'
  if (key.includes('twitter') || key === 'x') return 'bg-slate-900/10 text-slate-900 hover:bg-slate-900 hover:text-white'
  if (key.includes('whatsapp')) return 'bg-[#25D366]/10 text-[#1FA855] hover:bg-[#25D366] hover:text-white'
  return 'bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white'
}
