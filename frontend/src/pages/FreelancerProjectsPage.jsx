import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, ChevronDown, Clock3, Eye, Filter, IndianRupee, Laptop, MapPin, Pencil, Plus, Search, SearchCheck, Trash2, UsersRound, X } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../services/api'
import { getStoredUser } from '../routes/authRouting'
import freelancerProjectsHeroImage from '../assets/freelancer-projects-photo.png'

const projects = [
  {
    title: 'React Website Revamp',
    company: 'Verified Startup',
    category: 'Development',
    budget: 'INR 35,000 fixed',
    duration: '4 weeks',
    experience: '2-4 years',
    mode: 'Remote',
    status: 'Active',
    owner: 'Admin',
    skills: ['React', 'Tailwind', 'API'],
  },
  {
    title: 'SEO Content Writing',
    company: 'Digital Agency',
    category: 'Content',
    budget: 'INR 1,500 per article',
    duration: 'Ongoing',
    experience: '1-3 years',
    mode: 'Hybrid',
    status: 'Pending',
    owner: 'staff',
    skills: ['SEO', 'Blogs', 'Research'],
  },
  {
    title: 'Sales Lead Generation',
    company: 'B2B Services',
    category: 'Sales',
    budget: 'Milestone based',
    duration: '2 months',
    experience: '2+ years',
    mode: 'Remote',
    status: 'Active',
    owner: 'recruiter',
    skills: ['LinkedIn', 'CRM', 'Calling'],
  },
  {
    title: 'Product Landing Page Design',
    company: 'SaaS Team',
    category: 'Design',
    budget: 'INR 22,000 fixed',
    duration: '2 weeks',
    experience: '3+ years',
    mode: 'Remote',
    status: 'Rejected',
    owner: 'users',
    skills: ['Figma', 'UX', 'Landing Page'],
  },
]

const categories = ['All', 'Development', 'Design', 'Content', 'Sales']
const modes = ['All', 'Remote', 'Hybrid', 'Onsite']
const statuses = ['All statuses', 'Active', 'Pending', 'Rejected']
const roleChips = ['Admin', 'staff', 'recruiter', 'users']
const pageSize = 5

export function FreelancerProjectsPage() {
  const locationPath = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [mode, setMode] = useState('All')
  const [status, setStatus] = useState('All statuses')
  const [projectRows, setProjectRows] = useState(projects)
  const [applications, setApplications] = useState([])
  const [applicationsLoading, setApplicationsLoading] = useState(false)
  const [startedProjects, setStartedProjects] = useState([])
  const [reviewing, setReviewing] = useState(false)
  const [rejectRemark, setRejectRemark] = useState('')
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [reviewMessage, setReviewMessage] = useState('')
  const [page, setPage] = useState(1)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const searchParams = new URLSearchParams(locationPath.search)
  const adminView = searchParams.get('view') === 'applications' ? 'applications' : 'projects'
  const freelancerView = searchParams.get('freelancerView') || 'all'
  const selectedApplicationId = searchParams.get('applicationId') || ''
  const isAdminPanel = locationPath.pathname.startsWith('/admin')
  const currentUser = getStoredUser()
  const isFreelancerPanel = isAdminPanel && currentUser?.role === 'freelancer'

  const visibleProjects = useMemo(() => {
    const term = query.trim().toLowerCase()
    return projectRows.filter((project) => {
      const haystack = [project.title, project.company, project.category, project.mode, project.status, project.owner, ...project.skills].join(' ').toLowerCase()
      return (!term || haystack.includes(term))
        && (category === 'All' || project.category === category)
        && (mode === 'All' || project.mode === mode)
        && (status === 'All statuses' || project.status === status)
    })
  }, [category, mode, projectRows, query, status])

  const stats = useMemo(() => [
    { label: 'Total Projects', value: projectRows.length, icon: BriefcaseBusiness, tone: 'bg-blue-50 text-blue-700' },
    { label: 'Remote Work', value: projectRows.filter((project) => project.mode === 'Remote').length, icon: Laptop, tone: 'bg-teal-50 text-teal-700' },
    { label: 'Active', value: projectRows.filter((project) => project.status === 'Active').length, icon: UsersRound, tone: 'bg-emerald-50 text-emerald-700' },
    { label: 'Fixed Budget', value: projectRows.filter((project) => project.budget.includes('fixed')).length, icon: IndianRupee, tone: 'bg-amber-50 text-amber-700' },
  ], [projectRows])

  const totalPages = Math.max(1, Math.ceil(visibleProjects.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedProjects = visibleProjects.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const firstRecord = visibleProjects.length ? (currentPage - 1) * pageSize + 1 : 0
  const lastRecord = Math.min(currentPage * pageSize, visibleProjects.length)
  const projectApplications = useMemo(() => applications.filter(isProjectApplication), [applications])
  const selectedApplication = useMemo(() => projectApplications.find((application) => String(application._id || '') === selectedApplicationId), [projectApplications, selectedApplicationId])
  const visibleFreelancerApplications = useMemo(() => filterFreelancerApplications(projectApplications, freelancerView), [freelancerView, projectApplications])
  const freelancerStats = useMemo(() => getFreelancerStats(projectApplications), [projectApplications])

  useEffect(() => {
    if (!isAdminPanel) return

    let mounted = true
    setApplicationsLoading(true)
    if (isFreelancerPanel && currentUser?.email) {
      setApplications(getCachedFreelancerProjectApplications(currentUser.email))
    }
    const params = isFreelancerPanel && currentUser?.email
      ? `?candidateEmail=${encodeURIComponent(currentUser.email.toLowerCase())}&sort=-createdAt&limit=100`
      : '?sort=-createdAt&limit=100'
    api
      .list('applications', params)
      .then((payload) => {
        if (!mounted) return
        const apiApplications = Array.isArray(payload.data) ? payload.data : []
        const cachedApplications = isFreelancerPanel && currentUser?.email ? getCachedFreelancerProjectApplications(currentUser.email) : []
        setApplications(mergeApplications(apiApplications, cachedApplications))
      })
      .catch(() => {
        if (mounted && !isFreelancerPanel) setApplications([])
      })
      .finally(() => {
        if (mounted) setApplicationsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [currentUser?.email, isAdminPanel, isFreelancerPanel])

  const updateFilter = (setter) => (value) => {
    setter(value)
    setPage(1)
  }

  const clearPublicFilters = () => {
    setCategory('All')
    setMode('All')
    setStatus('All statuses')
    setPage(1)
  }

  const addBlankProject = () => {
    setProjectRows((current) => [
      {
        title: '',
        company: '',
        category: '',
        budget: '',
        duration: '',
        experience: '',
        mode: '',
        status: 'Pending',
        owner: 'Admin',
        skills: [],
      },
      ...current,
    ])
    setPage(1)
  }

  const updateProjectApplicationStatus = async (application, nextStatus, remark = '') => {
    if (!application?._id) return
    setReviewing(true)
    setReviewMessage('')
    try {
      const payload = await api.update('applications', application._id, {
        status: nextStatus,
        reviewRemark: nextStatus === 'Rejected' ? remark : '',
        reviewedByName: currentUser?.name || currentUser?.role || 'Admin',
        reviewedByEmail: currentUser?.email || '',
        reviewedAt: new Date().toISOString(),
      })
      const updated = payload.data || { ...application, status: nextStatus, reviewRemark: nextStatus === 'Rejected' ? remark : '' }
      setApplications((current) => current.map((item) => (item._id === application._id ? updated : item)))
      setRejectRemark('')
      setRejectModalOpen(false)
      setReviewMessage(nextStatus === 'Rejected' ? 'Application rejected with remark.' : 'Application approved successfully.')
    } catch (error) {
      setReviewMessage(error.message || 'Application status could not be updated.')
    } finally {
      setReviewing(false)
    }
  }

  if (!isAdminPanel) {
    return (
      <section className="bg-[#f6f9fc] py-8 sm:py-12">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[7px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_58%,#fff4e8_100%)] shadow-sm">
            <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a00]">Verified freelance projects</p>
                <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                  Find project work that fits your skills.
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                  Browse trusted freelance opportunities, compare budget and work mode, then apply from one clean workspace.
                </p>
                <label className="mt-6 flex min-h-12 max-w-3xl items-center gap-3 rounded-[7px] border border-slate-200 bg-[white] px-4 shadow-sm focus-within:border-[#ff8a00] focus-within:ring-4 focus-within:ring-orange-100">
                  <Search className="text-[#ff8a00]" size={19} />
                  <input className="w-full bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400" onChange={(event) => updateFilter(setQuery)(event.target.value)} placeholder="Search projects, skills, companies" value={query} />
                </label>
              </div>
              <div className="relative min-h-[260px] overflow-hidden rounded-[7px]">
                <img
                  alt="Freelancer working on project"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  src={freelancerProjectsHeroImage}
                  style={{
                    WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
                    WebkitMaskComposite: 'source-in',
                    maskComposite: 'intersect',
                    maskImage: 'linear-gradient(90deg, transparent 0%, #000 8%, #000 92%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 8%, #000 92%, transparent 100%)',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[286px_1fr] lg:gap-6">
            <aside className="h-max rounded-[7px] border border-slate-200 bg-[white] p-5 shadow-sm lg:sticky lg:top-24">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-950">Advanced Filters</h2>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Refine projects by role, mode, and status.</p>
                </div>
                <span className="grid h-10 w-10 place-items-center rounded-[7px] bg-orange-50 text-[#ff8a00]">
                  <Filter size={18} />
                </span>
              </div>
              <div className="mt-5 rounded-[7px] bg-slate-50 p-3">
                <p className="text-2xl font-black text-slate-950">{visibleProjects.length}</p>
                <p className="text-xs font-bold text-slate-500">matching projects</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {category !== 'All' && <span className="rounded-[7px] bg-orange-50 px-3 py-1 text-xs font-black text-[#b85f00] ring-1 ring-orange-100">{category}</span>}
                {mode !== 'All' && <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100">{mode}</span>}
                {status !== 'All statuses' && <span className="rounded-[7px] bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100">{status}</span>}
                {category === 'All' && mode === 'All' && status === 'All statuses' && (
                  <span className="rounded-[7px] bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">No filters selected</span>
                )}
              </div>
              <button className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] border border-[#ff8a00] bg-[white] px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-orange-50" onClick={() => setFilterModalOpen(true)} type="button">
                <Filter size={16} /> View More
              </button>
            </aside>

            <div>
              <div className="mb-4 flex flex-col gap-3 rounded-[7px] border border-slate-200 bg-[white] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">Recommended Projects</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    Showing {visibleProjects.length} premium projects / {category}, {mode}, {status}
                  </p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <select className="rounded-[7px] border border-slate-200 bg-[white] px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-[#ff8a00]">
                    <option>Sort by relevance</option>
                    <option>Sort by newest</option>
                    <option>Sort by budget</option>
                  </select>
                </div>
              </div>

              {visibleProjects.length ? (
                <div className="grid gap-4 xl:grid-cols-2">
                  {visibleProjects.map((project, index) => (
                    <ProjectCard key={`${project.title}-${index}`} project={project} />
                  ))}
                </div>
              ) : (
                <EmptyProjects />
              )}
            </div>
          </div>
        </div>
        {filterModalOpen && (
          <ProjectFiltersModal
            category={category}
            clearFilters={clearPublicFilters}
            mode={mode}
            onCategoryChange={updateFilter(setCategory)}
            onClose={() => setFilterModalOpen(false)}
            onModeChange={updateFilter(setMode)}
            onStatusChange={updateFilter(setStatus)}
            status={status}
            visibleCount={visibleProjects.length}
          />
        )}
      </section>
    )
  }

  if (isFreelancerPanel) {
    return (
      <section className="bg-[#EEF2F8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-5">
          <div className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
            <div className="bg-[linear-gradient(120deg,#0757B8_0%,#0EA5E9_52%,#14B8A6_100%)] p-6 text-white sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-50">Freelancer dashboard</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">My Project Workspace</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
                Your applied projects, approval status, active work, completed work, and payment summary will appear here.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FreelancerMetric href="/admin/projects?freelancerView=completed" icon={BriefcaseBusiness} label="Completed Projects" tone="bg-emerald-50 text-emerald-700" value={freelancerStats.completed} />
            <FreelancerMetric href="/admin/projects?freelancerView=pending" icon={Clock3} label="Pending Projects" tone="bg-amber-50 text-amber-700" value={freelancerStats.pending} />
            <FreelancerMetric href="/admin/projects?freelancerView=active" icon={Laptop} label="Active Projects" tone="bg-blue-50 text-blue-700" value={freelancerStats.active} />
            <FreelancerMetric href="/admin/projects?freelancerView=payment" icon={IndianRupee} label="Payment Received" tone="bg-teal-50 text-teal-700" value={formatCurrency(freelancerStats.paymentReceived)} />
          </div>

          <div className="overflow-hidden rounded-[7px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black text-slate-950">Applied Projects</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                {getFreelancerViewLabel(freelancerView)}
              </p>
            </div>
            {applicationsLoading ? (
              <p className="p-6 text-sm font-semibold text-slate-500">Loading your project applications...</p>
            ) : visibleFreelancerApplications.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-[1060px] w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                    <tr>
                      {['Project', 'Company', 'Category', 'Mode', 'Budget', 'Status', 'Applied On', 'Work'].map((label) => (
                        <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleFreelancerApplications.map((application) => {
                      const approved = isApplicationApproved(application)
                      const started = startedProjects.includes(getApplicationKey(application))
                      return (
                        <tr className="align-top hover:bg-blue-50/40" key={application._id || `${application.candidateEmail}-${application.jobTitle}`}>
                          <td className="min-w-52 px-4 py-4 font-black text-slate-950">{application.jobTitle || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.company || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectCategory || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectWorkMode || '-'}</td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectBudget || '-'}</td>
                          <td className="px-4 py-4">
                            <span className={getApplicationStatusClass(application.status)}>{application.status || 'New'}</span>
                            {application.status === 'Rejected' && application.reviewRemark && (
                              <span className="mt-2 block max-w-xs rounded-[7px] bg-rose-50 p-2 text-xs font-bold leading-5 text-rose-700">
                                <span className="block">Remark: {application.reviewRemark}</span>
                                {(application.reviewedByName || application.reviewedByEmail) && (
                                  <span className="mt-1 block text-rose-600">By: {application.reviewedByName || 'Admin'} {application.reviewedByEmail ? `(${application.reviewedByEmail})` : ''}</span>
                                )}
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{formatDate(application.createdAt)}</td>
                          <td className="whitespace-nowrap px-4 py-4">
                            {approved ? (
                              <Link
                                className="inline-flex min-h-9 items-center justify-center rounded-[7px] bg-[#0057B8] px-4 text-xs font-black text-white hover:bg-[#004694]"
                                onClick={() => setStartedProjects((current) => [...new Set([...current, getApplicationKey(application)])])}
                                to={getProjectDetailPath({
                                  title: application.jobTitle,
                                  company: application.company,
                                  category: application.projectCategory,
                                  experience: application.projectExperience,
                                  mode: application.projectWorkMode,
                                })}
                              >
                                {started ? 'Continue Work' : 'Start Work'}
                              </Link>
                            ) : (
                              <span className="inline-flex min-h-9 items-center rounded-[7px] bg-slate-100 px-4 text-xs font-black text-slate-500">Waiting Approval</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-6 text-sm font-semibold text-slate-500">There are no projects in this view yet.</p>
            )}
          </div>
        </div>
      </section>
    )
  }

  if (isAdminPanel && selectedApplicationId) {
    return (
      <section className="bg-[#EEF2F8] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-5xl gap-5">
          <div className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
            <div className="bg-[linear-gradient(120deg,#0757B8_0%,#0EA5E9_52%,#14B8A6_100%)] p-6 text-white sm:p-8">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-50">Project Application Review</p>
              <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{selectedApplication?.jobTitle || 'Application Details'}</h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
                Review freelancer application details, approve them, or reject them with a remark.
              </p>
            </div>
          </div>

          {applicationsLoading ? (
            <div className="rounded-[7px] border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">Loading application details...</div>
          ) : selectedApplication ? (
            <>
              <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-blue-600">Application #{String(selectedApplication._id || '').slice(-8)}</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-950">{selectedApplication.jobTitle || '-'}</h2>
                    <p className="mt-1 text-sm font-bold text-slate-500">{selectedApplication.company || '-'} / {selectedApplication.projectCategory || '-'}</p>
                  </div>
                  <span className={getApplicationStatusClass(selectedApplication.status)}>{selectedApplication.status || 'New'}</span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    ['Freelancer', selectedApplication.candidateName],
                    ['Email', selectedApplication.candidateEmail],
                    ['Phone', selectedApplication.candidatePhone],
                    ['Mode', selectedApplication.projectWorkMode],
                    ['Budget', selectedApplication.projectBudget],
                    ['Duration', selectedApplication.projectDuration],
                    ['Experience', selectedApplication.projectExperience],
                    ['Applied On', formatDate(selectedApplication.createdAt)],
                    ['Reviewed By', selectedApplication.reviewedByName || selectedApplication.reviewedByEmail],
                  ].map(([label, value]) => (
                    <div className="rounded-[7px] bg-slate-50 p-4" key={label}>
                      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                      <p className="mt-1 font-black text-slate-800">{value || '-'}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-[7px] bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Cover Note</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{selectedApplication.coverNote || '-'}</p>
                </div>

                {hasReviewDetails(selectedApplication) && (
                  <div className="mt-5 rounded-[7px] bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase text-blue-600">Review Details</p>
                    <div className="mt-3 grid gap-3 text-sm font-bold text-slate-700 sm:grid-cols-3">
                      <div><span className="block text-xs uppercase text-slate-400">Action By</span>{selectedApplication.reviewedByName || '-'}</div>
                      <div><span className="block text-xs uppercase text-slate-400">Reviewer Email</span>{selectedApplication.reviewedByEmail || '-'}</div>
                      <div><span className="block text-xs uppercase text-slate-400">Reviewed On</span>{formatDate(selectedApplication.reviewedAt)}</div>
                    </div>
                    {selectedApplication.status === 'Rejected' && (
                      <div className="mt-4 rounded-[7px] bg-rose-50 p-4">
                        <p className="text-xs font-black uppercase text-rose-500">Reject Remark</p>
                        <p className="mt-2 text-sm font-bold leading-6 text-rose-700">{selectedApplication.reviewRemark || 'No reject remark added.'}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">Review Action</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-emerald-600 px-5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                    disabled={reviewing}
                    onClick={() => updateProjectApplicationStatus(selectedApplication, 'Selected')}
                    type="button"
                  >
                    Approve
                  </button>
                  <button
                    className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-rose-600 px-5 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-60"
                    disabled={reviewing}
                    onClick={() => setRejectModalOpen(true)}
                    type="button"
                  >
                    Reject
                  </button>
                  <Link className="inline-flex min-h-11 items-center justify-center rounded-[7px] border border-slate-200 px-5 text-sm font-black text-slate-600 hover:bg-slate-50" to="/admin/projects?view=applications">
                    Back
                  </Link>
                </div>
                {reviewMessage && <p className="mt-3 text-sm font-black text-blue-700">{reviewMessage}</p>}
              </div>
              {rejectModalOpen && (
                <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/40 px-4">
                  <div className="w-full max-w-lg rounded-[7px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-900/20">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wide text-rose-600">Reject Application</p>
                        <h3 className="mt-2 text-xl font-black text-slate-950">Add reject remark</h3>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">This remark will be visible to the freelancer on their dashboard.</p>
                      </div>
                      <button className="grid h-9 w-9 place-items-center rounded-[7px] bg-slate-100 text-slate-600" onClick={() => setRejectModalOpen(false)} type="button">x</button>
                    </div>
                    <textarea
                      className="mt-4 min-h-32 w-full rounded-[7px] border border-slate-200 bg-slate-50 p-4 text-sm font-semibold outline-none focus:border-blue-400"
                      onChange={(event) => setRejectRemark(event.target.value)}
                      placeholder="Reject reason ya next steps likhein"
                      value={rejectRemark}
                    />
                    <div className="mt-4 flex flex-wrap justify-end gap-3">
                      <button className="inline-flex min-h-10 items-center justify-center rounded-[7px] border border-slate-200 px-4 text-sm font-black text-slate-600 hover:bg-slate-50" onClick={() => setRejectModalOpen(false)} type="button">Cancel</button>
                      <button
                        className="inline-flex min-h-10 items-center justify-center rounded-[7px] bg-rose-600 px-4 text-sm font-black text-white hover:bg-rose-700 disabled:opacity-60"
                        disabled={reviewing || !rejectRemark.trim()}
                        onClick={() => updateProjectApplicationStatus(selectedApplication, 'Rejected', rejectRemark.trim())}
                        type="button"
                      >
                        Submit Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-[7px] border border-slate-200 bg-white p-6">
              <p className="text-sm font-semibold text-slate-500">Application record nahi mila.</p>
              <Link className="mt-4 inline-flex min-h-11 items-center justify-center rounded-[7px] bg-blue-600 px-5 text-sm font-black text-white" to="/admin/projects?view=applications">Back to applications</Link>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-[#EEF2F8] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5">
      <div className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
        <div className="grid gap-5 bg-[linear-gradient(120deg,#0757B8_0%,#0EA5E9_52%,#14B8A6_100%)] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-50">Freelancer workspace</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Projects Management</h1>
            <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-blue-50">
              Track freelance project opportunities, approval status, work mode, and client details from one focused panel.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[210px_auto]">
            <select
              className="min-h-11 rounded-[7px] border border-white/30 bg-white/10 px-4 text-sm font-black text-white outline-none backdrop-blur"
              onChange={(event) => navigate(event.target.value === 'applications' ? '/admin/projects?view=applications' : '/admin/projects')}
              value={adminView}
            >
              <option className="text-slate-900" value="projects">Project Directory</option>
              <option className="text-slate-900" value="applications">Project Applications</option>
            </select>
            <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-white px-5 text-sm font-black text-[#0057B8] shadow-lg shadow-blue-950/10 hover:bg-blue-50" onClick={addBlankProject} type="button">
              <Plus size={16} /> Add New Project
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm" key={item.label}>
              <div className="flex items-center justify-between gap-4">
                <span className={`grid h-11 w-11 place-items-center rounded-[7px] ${item.tone}`}>
                  <Icon size={19} />
                </span>
                <span className="rounded-[7px] bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase text-slate-400">Live</span>
              </div>
              <p className="mt-4 text-2xl font-black text-slate-950">{item.value}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{item.label}</p>
            </div>
          )
        })}
      </div>

      <div className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-950">Project Directory</h2>
            <p className="mt-1 text-sm font-semibold text-slate-500">{visibleProjects.length} matching records from {projectRows.length} projects.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(180px,1fr)_repeat(3,minmax(100px,1fr))_auto]">
            <label className="flex min-h-11 items-center gap-3 rounded-[7px] border border-slate-200 bg-slate-50 px-4">
              <Search className="text-[#0057B8]" size={18} />
              <input className="w-full bg-transparent text-sm font-semibold outline-none" onChange={(event) => updateFilter(setQuery)(event.target.value)} placeholder="Search records" value={query} />
            </label>
            <select className="rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 outline-none" onChange={(event) => updateFilter(setStatus)(event.target.value)} value={status}>
              {statuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 outline-none" onChange={(event) => updateFilter(setCategory)(event.target.value)} value={category}>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 outline-none" onChange={(event) => updateFilter(setMode)(event.target.value)} value={mode}>
              {modes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <span className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-blue-50 px-4 text-sm font-black text-blue-700">
              <Filter size={16} /> Filters
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-[7px] border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          {roleChips.map((item) => <StatusChip key={item} label={item} />)}
        </div>
        <span className="inline-flex items-center gap-2 rounded-[7px] bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
          <Clock3 size={14} /> Updated live
        </span>
      </div>

      {adminView === 'applications' ? (
      <div className="overflow-hidden rounded-[7px] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black text-slate-950">Project Applications</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Records for freelancers who apply to projects from the frontend will appear here.
          </p>
        </div>
        {applicationsLoading ? (
          <p className="p-6 text-sm font-semibold text-slate-500">Loading project applications...</p>
        ) : projectApplications.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Application ID', 'Freelancer', 'Email', 'Phone', 'Project', 'Company', 'Category', 'Mode', 'Budget', 'Status', 'Applied On'].map((label) => (
                    <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projectApplications.map((application) => (
                  <tr className="align-top hover:bg-blue-50/40" key={application._id || `${application.candidateEmail}-${application.jobTitle}`}>
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-600">
                      {application._id ? (
                        <Link className="text-blue-700 hover:underline" target="_blank" to={`/admin/projects?view=applications&applicationId=${application._id}`}>
                          {String(application._id || '').slice(-8)}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-950">{application.candidateName || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.candidateEmail || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.candidatePhone || '-'}</td>
                    <td className="min-w-52 px-4 py-4 font-black text-slate-950">
                      {application._id ? (
                        <Link className="hover:text-blue-700 hover:underline" target="_blank" to={`/admin/projects?view=applications&applicationId=${application._id}`}>
                          {application.jobTitle || '-'}
                        </Link>
                      ) : application.jobTitle || '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.company || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectCategory || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectWorkMode || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{application.projectBudget || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4"><span className={getApplicationStatusClass(application.status)}>{application.status || 'New'}</span></td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{formatDate(application.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="p-6 text-sm font-semibold text-slate-500">There are no freelancer project applications yet.</p>
        )}
      </div>
      ) : (
      <div className="overflow-hidden rounded-[7px] border border-slate-200 bg-white shadow-sm">
        {visibleProjects.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1280px] w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Project ID', 'Owner', 'Email', 'Latest Project', 'Company', 'Category', 'Mode', 'Budget', 'Duration', 'Active', 'Pending', 'Rejected', 'Clicks', 'Applications', 'Actions'].map((label) => (
                    <th className="whitespace-nowrap px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedProjects.map((project, index) => (
                  <tr className="align-top hover:bg-blue-50/40" key={`${project.title || 'blank-project'}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-4 font-black text-slate-600">{getProjectId(project, index)}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-700">{project.owner || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{getOwnerEmail(project.owner)}</td>
                    <td className="min-w-52 px-4 py-4 font-black text-slate-950">{project.title || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{project.company || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{project.category || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{project.mode || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{project.budget || '-'}</td>
                    <td className="whitespace-nowrap px-4 py-4 font-semibold text-slate-600">{project.duration || '-'}</td>
                    <td className="px-4 py-4 font-black text-slate-700">{project.status === 'Active' ? 1 : 0}</td>
                    <td className="px-4 py-4 font-black text-slate-700">{project.status === 'Pending' ? 1 : 0}</td>
                    <td className="px-4 py-4 font-black text-slate-700">{project.status === 'Rejected' ? 1 : 0}</td>
                    <td className="px-4 py-4 font-black text-slate-700">{countProjectApplications(projectApplications, project)}</td>
                    <td className="px-4 py-4 font-black text-slate-700">0</td>
                    <td className="whitespace-nowrap px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-blue-50 text-blue-700 hover:bg-blue-100" type="button" aria-label="View project">
                          <Eye size={15} />
                        </button>
                        <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-slate-100 text-slate-700 hover:bg-slate-200" type="button" aria-label="Edit project">
                          <Pencil size={15} />
                        </button>
                        <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-rose-50 text-rose-700 hover:bg-rose-100" type="button" aria-label="Delete project">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyProjects />
        )}
      </div>
      )}

      <div className="flex flex-col justify-between gap-3 rounded-[7px] border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500 sm:flex-row sm:items-center">
        <p>{adminView === 'applications' ? `Showing ${projectApplications.length} project application records` : `Showing ${firstRecord}-${lastRecord} of ${visibleProjects.length} records`}</p>
        {adminView === 'projects' && <div className="flex flex-wrap items-center gap-2">
          <select className="rounded-[7px] border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 outline-none" value={pageSize} disabled>
            <option>{pageSize} / page</option>
          </select>
          <button className="rounded-[7px] border border-slate-200 px-3 py-2 font-black text-slate-600 disabled:opacity-50" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Prev</button>
          <span className="rounded-[7px] bg-[#0057B8] px-3 py-2 font-black text-white">{currentPage}</span>
          <button className="rounded-[7px] border border-slate-200 px-3 py-2 font-black text-slate-600 disabled:opacity-50" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} type="button">Next</button>
        </div>}
      </div>
      </div>
    </section>
  )
}

function StatusChip({ label }) {
  return <span className="rounded-[7px] bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100">{label}</span>
}

function FreelancerMetric({ href, icon: Icon, label, tone, value }) {
  return (
    <Link className="rounded-[7px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/60" rel="noreferrer" target="_blank" to={href}>
      <div className="flex items-center justify-between gap-4">
        <span className={`grid h-11 w-11 place-items-center rounded-[7px] ${tone}`}>
          <Icon size={19} />
        </span>
        <span className="rounded-[7px] bg-slate-50 px-2.5 py-1 text-[11px] font-black uppercase text-slate-400">Live</span>
      </div>
      <p className="mt-4 text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-slate-500">{label}</p>
    </Link>
  )
}

function ProjectFiltersModal({
  category,
  clearFilters,
  mode,
  onCategoryChange,
  onClose,
  onModeChange,
  onStatusChange,
  status,
  visibleCount,
}) {
  return (
    <div className="fixed inset-0 z-[130] grid place-items-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-[8px] bg-[white] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 p-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a00]">Advanced Filters</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">Select filters</h2>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-[white] text-slate-600 transition hover:border-[#ff8a00] hover:text-[#ff8a00]" onClick={onClose} type="button" aria-label="Close filters">
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-4 p-4">
          <ProjectFilter title="Category" options={categories} value={category} onChange={onCategoryChange} />
          <ProjectFilter title="Work Mode" options={modes} value={mode} onChange={onModeChange} />
          <ProjectFilter title="Status" options={statuses} value={status} onChange={onStatusChange} />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold text-slate-600">{visibleCount} projects matching</p>
          <div className="flex gap-2">
            <button className="min-h-10 rounded-[7px] border border-[#ff8a00] bg-[white] px-4 text-sm font-black text-slate-950 hover:bg-orange-50" onClick={clearFilters} type="button">
              Clear
            </button>
            <button className="min-h-10 rounded-[7px] border border-[#ff8a00] px-5 text-sm font-black text-white shadow-lg shadow-orange-100" style={{ backgroundColor: '#ff8a00' }} onClick={onClose} type="button">
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ProjectFilter({ onChange, options, title, value }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="truncate text-xs font-bold text-slate-500">{value}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = option === value
          return (
            <button
              className="min-h-9 rounded-[7px] border px-3 text-sm font-bold transition"
              key={option}
              onClick={() => onChange(option)}
              style={{
                backgroundColor: checked ? '#fff7ed' : '#ffffff',
                borderColor: checked ? '#ff8a00' : '#e2e8f0',
                color: checked ? '#0f172a' : '#475569',
              }}
              type="button"
            >
              {option}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProjectCard({ project }) {
  const detailsPath = getProjectDetailPath(project)

  return (
    <article className="group min-w-0 rounded-[7px] border border-slate-200 bg-[white] p-5 shadow-sm transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-100/60">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{project.mode}</span>
        <span className={getProjectStatusClass(project.status)}>{project.status}</span>
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[7px] bg-[linear-gradient(135deg,#eaf4ff,#fff2e1)] text-lg font-black text-[#0057B8] ring-1 ring-slate-200">
            {String(project.company || 'PR').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <Link className="line-clamp-2 text-left text-lg font-black leading-6 text-slate-950 hover:text-[#0057B8]" rel="noreferrer" target="_blank" to={detailsPath}>
              {project.title || 'Untitled Project'}
            </Link>
            <p className="mt-1 truncate text-sm font-semibold text-slate-500">{project.company} / {project.category}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        <span className="flex min-w-0 items-center gap-2 truncate rounded-[7px] bg-slate-50 px-3 py-2"><MapPin className="shrink-0 text-[#0057B8]" size={15} />{project.mode}</span>
        <span className="flex min-w-0 items-center gap-2 truncate rounded-[7px] bg-slate-50 px-3 py-2"><IndianRupee className="shrink-0 text-[#ff8a00]" size={15} />{project.budget}</span>
        <span className="flex min-w-0 items-center gap-2 truncate rounded-[7px] bg-slate-50 px-3 py-2"><BriefcaseBusiness className="shrink-0 text-[#0057B8]" size={15} />{project.experience}</span>
        <span className="flex min-w-0 items-center gap-2 truncate rounded-[7px] bg-slate-50 px-3 py-2"><Clock3 className="shrink-0 text-[#ff8a00]" size={15} />{project.duration}</span>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {project.skills.map((skill) => (
          <span className="rounded-[7px] border border-slate-200 bg-[white] px-3 py-1 text-xs font-bold text-slate-600" key={skill}>{skill}</span>
        ))}
      </div>

      <p className="mt-5 line-clamp-2 text-sm font-medium leading-6 text-slate-500">{getProjectDescription(project)}</p>

      <div className="mt-6 grid gap-3 sm:flex sm:flex-row">
        <ProjectApplyButton project={project} />
        <Link className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[7px] border border-[#ff8a00] bg-[white] px-5 py-2.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-orange-50" rel="noreferrer" target="_blank" to={detailsPath}>View Details</Link>
      </div>
    </article>
  )
}

function ProjectApplyButton({ project }) {
  const navigate = useNavigate()
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')

  const applyToProject = async () => {
    const user = getStoredUser()
    if (!user?.email) {
      navigate('/freelancer-login')
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      const applicationPayload = {
        applicationType: 'Freelancer Project',
        projectSlug: getProjectSlug(project),
        projectCategory: project.category,
        projectBudget: project.budget,
        projectDuration: project.duration,
        projectExperience: project.experience,
        projectWorkMode: project.mode,
        projectSkills: project.skills,
        candidateName: user.name || user.fullName || user.email,
        candidateEmail: user.email,
        candidatePhone: user.phone || '',
        jobTitle: project.title || 'Freelance Project',
        company: project.company || 'INSEET',
        coverNote: `Applied for freelance project: ${project.title || 'Freelance Project'}`,
      }
      const payload = await api.createApplication(applicationPayload)
      cacheFreelancerProjectApplication(user.email, payload.data || applicationPayload)
      setStatus('success')
      setMessage('Applied successfully.')
      window.dispatchEvent(new CustomEvent('portalToast', { detail: { message: 'Project application submitted successfully.' } }))
    } catch (error) {
      setStatus('error')
      setMessage(error.message || 'Application could not be submitted.')
    }
  }

  return (
    <div className="flex-1">
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-[7px] bg-[#ff8a00] px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-orange-100 transition hover:bg-[#e87900] disabled:cursor-not-allowed disabled:opacity-70"
        disabled={status === 'loading' || status === 'success'}
        onClick={applyToProject}
        type="button"
      >
        {status === 'loading' ? 'Applying...' : status === 'success' ? 'Applied' : 'Apply Now'}
      </button>
      {message && <p className={`mt-2 text-xs font-bold ${status === 'error' ? 'text-rose-600' : 'text-emerald-600'}`}>{message}</p>}
    </div>
  )
}

export function FreelancerProjectDetailsPage() {
  const { projectSlug } = useParams()
  const resolvedSlug = extractProjectSlug(projectSlug)
  const project = projects.find((item) => getProjectSlug(item) === resolvedSlug) || projects[0]

  return (
    <section className="bg-[#EEF2F8] py-10 sm:py-14">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[7px] border border-blue-100 bg-white shadow-xl shadow-blue-100/50">
          <div className="bg-[linear-gradient(120deg,#0757B8_0%,#0EA5E9_52%,#14B8A6_100%)] p-6 text-white sm:p-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-50">Project details</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{project.title}</h1>
            <p className="mt-2 text-sm font-semibold text-blue-50">{project.company} / {project.category}</p>
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold leading-7 text-slate-600">{getProjectDescription(project)}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ['Budget', project.budget],
                ['Duration', project.duration],
                ['Experience', project.experience],
                ['Work Mode', project.mode],
                ['Status', project.status],
                ['Owner', project.owner],
              ].map(([label, value]) => (
                <div className="rounded-[7px] bg-slate-50 p-4" key={label}>
                  <p className="text-xs font-black uppercase text-slate-400">{label}</p>
                  <p className="mt-1 font-black text-slate-800">{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.skills.map((skill) => <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700" key={skill}>{skill}</span>)}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ProjectApplyButton project={project} />
              <Link className="inline-flex min-h-11 flex-1 items-center justify-center rounded-[7px] border border-slate-300 bg-transparent px-5 py-2.5 text-sm font-black text-slate-700 hover:border-[#0057B8] hover:text-[#0057B8]" to="/freelancer/projects">
                Back to Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function getProjectSlug(project) {
  const source = `${project.title || 'project'}-${project.company || 'inseet'}`
  return source
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function getProjectDetailPath(project) {
  const slug = [
    'freelance-project-listings',
    getProjectSlug(project),
    project.title,
    project.company,
    project.category,
    formatProjectExperienceForSlug(project.experience),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const params = new URLSearchParams({
    src: 'project',
    mode: project.mode || 'Remote',
    xp: String(getProjectExperienceMin(project.experience) || 1),
  })

  return `/${slug}?${params.toString()}`
}

function extractProjectSlug(value = '') {
  const text = String(value)
  if (!text.startsWith('freelance-project-listings-')) return text

  const prefix = 'freelance-project-listings-'
  const normalized = text.slice(prefix.length)
  return projects
    .map((project) => getProjectSlug(project))
    .find((slug) => normalized.startsWith(slug)) || normalized
}

function formatProjectExperienceForSlug(value = '') {
  const numbers = String(value).match(/\d+/g) || []
  if (numbers.length >= 2) return `${numbers[0]} to ${numbers[1]} years`
  if (numbers.length === 1) return `${numbers[0]} years`
  return ''
}

function getProjectExperienceMin(value = '') {
  const numbers = String(value).match(/\d+/g)?.map(Number) || []
  return numbers.length ? Math.min(...numbers) : 0
}

function isProjectApplication(application) {
  return String(application.applicationType || '').toLowerCase() === 'freelancer project'
    || Boolean(application.projectSlug)
    || projects.some((project) => project.title === application.jobTitle && project.company === application.company)
}

function getFreelancerApplicationCacheKey(email = '') {
  return `freelancerProjectApplications:${String(email).toLowerCase()}`
}

function getCachedFreelancerProjectApplications(email = '') {
  try {
    const items = JSON.parse(localStorage.getItem(getFreelancerApplicationCacheKey(email)) || '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

function cacheFreelancerProjectApplication(email = '', application) {
  if (!email || !application) return
  const nextApplication = {
    ...application,
    applicationType: application.applicationType || 'Freelancer Project',
    candidateEmail: String(application.candidateEmail || email).toLowerCase(),
    createdAt: application.createdAt || new Date().toISOString(),
    status: application.status || 'New',
  }
  const merged = mergeApplications([nextApplication], getCachedFreelancerProjectApplications(email))
  localStorage.setItem(getFreelancerApplicationCacheKey(email), JSON.stringify(merged))
}

function mergeApplications(primary = [], secondary = []) {
  const byKey = new Map()
  ;[...primary, ...secondary].filter(Boolean).forEach((application) => {
    const key = application._id || `${application.candidateEmail || ''}-${application.projectSlug || application.jobTitle || ''}-${application.company || ''}`
    if (!byKey.has(key)) byKey.set(key, application)
  })
  return [...byKey.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

function isApplicationApproved(application) {
  return ['Selected', 'Shortlisted', 'Approved'].includes(application.status)
}

function isApplicationCompleted(application) {
  return ['Completed', 'Paid'].includes(application.workStatus || application.projectWorkStatus || application.status)
}

function hasReviewDetails(application = {}) {
  return Boolean(application.reviewedByName || application.reviewedByEmail || application.reviewedAt || application.reviewRemark)
}

function getFreelancerStats(applications) {
  const completedApplications = applications.filter(isApplicationCompleted)
  return {
    completed: completedApplications.length,
    pending: applications.filter((application) => ['New', 'Reviewed', 'Interview'].includes(application.status || 'New')).length,
    active: applications.filter((application) => isApplicationApproved(application) && !isApplicationCompleted(application)).length,
    paymentReceived: completedApplications.reduce((total, application) => total + getBudgetAmount(application.projectBudget), 0),
  }
}

function filterFreelancerApplications(applications, view) {
  if (view === 'completed') return applications.filter(isApplicationCompleted)
  if (view === 'pending') return applications.filter((application) => ['New', 'Reviewed', 'Interview'].includes(application.status || 'New'))
  if (view === 'active') return applications.filter((application) => isApplicationApproved(application) && !isApplicationCompleted(application))
  if (view === 'payment') return applications.filter((application) => isApplicationCompleted(application) || getBudgetAmount(application.projectBudget) > 0)
  return applications
}

function getFreelancerViewLabel(view) {
  const labels = {
    completed: 'Completed projects will appear here.',
    pending: 'Pending approvals and projects will appear here.',
    active: 'Active projects will appear here after admin approval.',
    payment: 'Payment-related projects and budget details will appear here.',
  }
  return labels[view] || 'Projects you have applied to will be tracked here. Start Work becomes active after admin approval.'
}

function getBudgetAmount(value = '') {
  const amount = String(value).replace(/,/g, '').match(/\d+/)
  return amount ? Number(amount[0]) : 0
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0, style: 'currency', currency: 'INR' }).format(Number(value || 0))
}

function getApplicationKey(application) {
  return application._id || `${application.candidateEmail}-${application.jobTitle}-${application.company}`
}

function countProjectApplications(applications, project) {
  const slug = getProjectSlug(project)
  return applications.filter((application) => application.projectSlug === slug || (application.jobTitle === project.title && application.company === project.company)).length
}

function getProjectDescription(project) {
  return `${project.company} is looking for a freelancer for ${project.title}. This ${project.mode} project is ideal for professionals with ${project.experience} of experience in ${project.skills.join(', ')}.`
}

function getApplicationStatusClass(status) {
  const base = 'rounded-[7px] px-2 py-1 text-[10px] font-black sm:px-3 sm:text-xs'
  if (status === 'Rejected') return `${base} bg-rose-50 text-rose-700`
  if (status === 'Selected' || status === 'Shortlisted') return `${base} bg-emerald-50 text-emerald-700`
  if (status === 'Interview') return `${base} bg-violet-50 text-violet-700`
  if (status === 'Reviewed') return `${base} bg-blue-50 text-blue-700`
  return `${base} bg-amber-50 text-amber-700`
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function getProjectStatusClass(status) {
  const base = 'rounded-[7px] px-3 py-1 text-xs font-black'
  if (status === 'Active') return `${base} bg-blue-50 text-blue-700`
  if (status === 'Pending') return `${base} bg-amber-50 text-amber-700`
  return `${base} bg-rose-50 text-rose-700`
}

function EmptyProjects() {
  return (
    <div className="p-10 text-center">
      <SearchCheck className="mx-auto text-[#0057B8]" size={30} />
      <h2 className="mt-3 text-2xl font-black text-slate-950">No matching projects</h2>
      <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">Try a different skill, category, work mode, or status.</p>
    </div>
  )
}

function getProjectId(project, index) {
  const source = `${project.title || 'blank'}-${project.company || 'project'}-${index}`
  let hash = 0
  for (let i = 0; i < source.length; i += 1) {
    hash = ((hash << 5) - hash) + source.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(16).slice(0, 8)
}

function getOwnerEmail(owner = '') {
  const normalized = owner.toLowerCase() || 'admin'
  return `${normalized.replace(/\s+/g, '.')}@inseet.in`
}
