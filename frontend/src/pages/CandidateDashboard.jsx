import { useEffect, useState } from 'react'
import { Building2, CloudUpload, Eye, FileCheck2, FileText, RefreshCw, Rocket, SearchCheck, ShieldCheck, Sparkles, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { JobCard } from '../components/JobCard'
import { getStoredUser } from '../routes/authRouting'
import { api } from '../services/api'
import { getAppliedJobs, getCandidateProfileStrength, getInterviewInvites, getJobAlerts } from '../utils/candidateActivity'
import { getSavedJobs } from '../utils/savedJobs'
import { createJobDetailPath } from '../utils/jobRoutes'

export function CandidateDashboard({ onApply }) {
const user = getStoredUser()
  const navigate = useNavigate()
  const [savedJobs, setSavedJobs] = useState(() => getSavedJobs())
  const [appliedJobs, setAppliedJobs] = useState(() => getAppliedJobs())
  const [applications, setApplications] = useState([])
  const [recommendedJobs, setRecommendedJobs] = useState([])
  const [recommendationsLoading, setRecommendationsLoading] = useState(true)
  const [interviewInvites, setInterviewInvites] = useState(() => getInterviewInvites())
  const [jobAlerts, setJobAlerts] = useState(() => getJobAlerts())
  const [profileStrength, setProfileStrength] = useState(() => getCandidateProfileStrength())
  const [candidateProfile, setCandidateProfile] = useState(() => getStoredCandidateProfile(user))
  const [resumeDeleting, setResumeDeleting] = useState(false)
  const [resumeMessage, setResumeMessage] = useState('')

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const payload = await api.listAll('applications', '?candidateEmail=' + encodeURIComponent(user?.email || ''))
        const list = Array.isArray(payload.data) ? payload.data : []
        setApplications(list.filter((item) => item.candidateEmail?.toLowerCase() === user?.email?.toLowerCase()))
      } catch {
        setApplications([])
      }
    }

    const syncCandidateStats = () => {
      setSavedJobs(getSavedJobs())
      setAppliedJobs(getAppliedJobs())
      setInterviewInvites(getInterviewInvites())
      setJobAlerts(getJobAlerts())
      setProfileStrength(getCandidateProfileStrength())
      setCandidateProfile(getStoredCandidateProfile(user))
      loadApplications()
    }

    window.addEventListener('savedJobsChanged', syncCandidateStats)
    window.addEventListener('candidateActivityChanged', syncCandidateStats)
    window.addEventListener('storage', syncCandidateStats)
    syncCandidateStats()

    return () => {
      window.removeEventListener('savedJobsChanged', syncCandidateStats)
      window.removeEventListener('candidateActivityChanged', syncCandidateStats)
      window.removeEventListener('storage', syncCandidateStats)
    }
  }, [user?.email])

  useEffect(() => {
    let active = true

    const loadRecommendedJobs = async () => {
      setRecommendationsLoading(true)
      try {
        const payload = await api.jobListings('?sort=-createdAt')
        const list = Array.isArray(payload.data) ? payload.data : []
        const ranked = rankRecommendedJobs(list, candidateProfile, applications)
        if (active) setRecommendedJobs(ranked.slice(0, 4))
      } catch {
        if (active) setRecommendedJobs([])
      } finally {
        if (active) setRecommendationsLoading(false)
      }
    }

    loadRecommendedJobs()

    return () => {
      active = false
    }
  }, [applications, candidateProfile])

  const trackedApplications = applications.length
    ? applications.map((item) => ({
        id: item._id,
        title: item.jobTitle,
        company: item.company,
        status: item.status || 'New',
      }))
    : appliedJobs.map((job) => ({
        id: job._id || job.id,
        title: job.title,
        company: job.company,
        status: job.applicationStatus || 'New',
      }))

  const dashboardItems = [
    { label: 'Profile strength', value: `${profileStrength}%`, icon: ShieldCheck },
    { label: 'Applied jobs', value: String(trackedApplications.length), icon: SearchCheck },
    { label: 'Saved jobs', value: String(savedJobs.length), icon: Sparkles, to: '/candidate-saved-jobs' },
    { label: 'Interview invites', value: String(trackedApplications.filter((item) => ['Interview', 'Selected'].includes(item.status)).length || interviewInvites.length), icon: Building2, to: '/candidate-interview-invites' },
    { label: 'Job alerts', value: String(jobAlerts.length), icon: Rocket, to: '/candidate-job-alerts' },
  ]
  const hasResume = Boolean(candidateProfile.resumeName || candidateProfile.resumeMongoId || candidateProfile.resumeUrl)

  const updateStoredCandidateProfile = (nextProfile) => {
    localStorage.setItem('candidateProfile', JSON.stringify(nextProfile))
    setCandidateProfile(nextProfile)
    window.dispatchEvent(new CustomEvent('candidateActivityChanged'))
  }

  const viewResume = async () => {
    setResumeMessage('')
    try {
      if (candidateProfile.resumeMongoId) {
        await api.openResume(candidateProfile.resumeMongoId)
        return
      }

      if (candidateProfile.resumeUrl && !String(candidateProfile.resumeUrl).startsWith('r2://')) {
        window.open(candidateProfile.resumeUrl, '_blank', 'noopener,noreferrer')
        return
      }

      setResumeMessage('Resume preview is not available. Please re-upload your resume.')
    } catch (error) {
      setResumeMessage(error.message || 'Resume could not be opened.')
    }
  }

  const deleteResume = async () => {
    if (!hasResume || resumeDeleting) return

    setResumeDeleting(true)
    setResumeMessage('')
    try {
      if (candidateProfile.resumeMongoId) {
        await api.remove('resumes', candidateProfile.resumeMongoId)
      }

      const nextProfile = {
        ...candidateProfile,
        resumeJson: null,
        resumeMongoId: '',
        resumeName: '',
        resumeUpdatedAt: '',
        resumeUrl: '',
      }
      updateStoredCandidateProfile(nextProfile)
      setResumeMessage('Resume deleted.')
    } catch (error) {
      setResumeMessage(error.message || 'Resume could not be deleted.')
    } finally {
      setResumeDeleting(false)
    }
  }

  return (
    <DashboardShell title="Candidate Dashboard" subtitle="Manage your profile, applications, saved jobs, and recommendations.">
      <div className="grid grid-cols-2 gap-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">
        {dashboardItems.map((item) => {
          const Icon = item.icon
          return <MetricCard icon={Icon} key={item.label} label={item.label} onClick={item.to ? () => navigate(item.to) : item.label === 'Applied jobs' ? () => navigate('/candidate-applied-jobs') : undefined} value={item.value} />
        })}
      </div>

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-4 sm:gap-6">
          <Panel title="Profile Overview">
            <div className="flex gap-3 sm:gap-5 sm:items-center">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-[7px] bg-blue-600 text-lg font-black text-white sm:h-20 sm:w-20 sm:text-2xl">AR</div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-base font-bold text-slate-950 sm:text-xl">Aarav Recruiter-ready</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-base">React Developer - Bengaluru - Open to hybrid roles</p>
                <div className="mt-4 h-3 overflow-hidden rounded-[7px] bg-slate-100">
                  <div className="h-full rounded-[7px] bg-teal-500" style={{ width: `${profileStrength}%` }} />
                </div>
              </div>
            </div>
          </Panel>

          <Panel action={<Button onClick={() => navigate('/candidate-applied-jobs')} variant="secondary">View All</Button>} title="Applied Jobs">
            <StatusRows applications={trackedApplications} />
          </Panel>

          <Panel title="Application Status Timeline">
            <ApplicationTimeline applications={trackedApplications} />
          </Panel>

          <Panel title="Recommended Jobs">
            {recommendationsLoading ? (
              <p className="rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">Finding jobs related to your profile...</p>
            ) : recommendedJobs.length ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 xl:grid-cols-2">
                {recommendedJobs.map((job) => <JobCard denseMobile job={job} key={job._id || job.id} onApply={onApply} />)}
              </div>
            ) : (
              <p className="rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                No related jobs found yet. Update your profile skills or search jobs to find matching openings.
              </p>
            )}
          </Panel>
        </div>

        <div className="grid h-max gap-4 sm:gap-6">
          <Panel title="Resume Upload">
            {hasResume ? (
              <div className="rounded-[7px] border border-blue-100 bg-blue-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[7px] bg-white text-blue-600 ring-1 ring-blue-100">
                    <FileText size={22} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-950 sm:text-base">{candidateProfile.resumeName || 'Uploaded resume'}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {candidateProfile.resumeUpdatedAt ? `Updated ${new Date(candidateProfile.resumeUpdatedAt).toLocaleDateString()}` : 'Resume uploaded'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button className="w-full px-3" onClick={viewResume} variant="secondary"><Eye size={16} /> View</Button>
                  <Button className="w-full px-3" to="/candidate-profile?missing=Resume" variant="secondary"><RefreshCw size={16} /> Re-upload</Button>
                  <Button className="w-full px-3 bg-rose-600 shadow-rose-100 hover:bg-rose-700" disabled={resumeDeleting} onClick={deleteResume} variant="secondary"><Trash2 size={16} /> {resumeDeleting ? 'Deleting...' : 'Delete'}</Button>
                </div>
                {resumeMessage && <p className="mt-3 rounded-[7px] bg-white p-3 text-xs font-bold text-slate-600">{resumeMessage}</p>}
              </div>
            ) : (
              <div className="rounded-[7px] border border-dashed border-blue-200 bg-blue-50 p-4 text-center sm:p-6">
                <CloudUpload className="mx-auto text-blue-600" size={28} />
                <p className="mt-3 text-sm font-bold text-slate-950 sm:text-base">Upload latest resume</p>
                <p className="mt-1 text-xs text-slate-500 sm:mt-2 sm:text-sm">PDF up to 25MB</p>
                <Button className="mt-4 w-full sm:mt-5 sm:w-auto" to="/candidate-profile?missing=Resume">Choose File</Button>
                {resumeMessage && <p className="mt-3 text-xs font-bold text-slate-600">{resumeMessage}</p>}
              </div>
            )}
          </Panel>

          <Panel title="Saved Jobs">
            <div className="grid gap-3">
              {savedJobs.length ? (
                savedJobs.slice(0, 4).map((job) => (
                  <div className="rounded-[7px] bg-slate-50 p-4" key={job._id || job.id}>
                    <p className="text-sm font-black text-slate-950">{job.title}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{job.company} - {job.location}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500">No saved jobs yet.</p>
              )}
            </div>
          </Panel>

          <Panel title="Profile Edit">
            <div className="grid gap-3">
              <input className="input" list="dashboard-headline-suggestions" placeholder="Headline" />
              <datalist id="dashboard-headline-suggestions">
                {headlineSuggestions.map((item) => <option key={item} value={item} />)}
              </datalist>
              <input className="input" list="dashboard-location-suggestions" placeholder="Preferred location" />
              <datalist id="dashboard-location-suggestions">
                {locationSuggestions.map((item) => <option key={item} value={item} />)}
              </datalist>
            </div>
          </Panel>

          <Panel title="Job Alerts">
            <label className="flex items-center justify-between rounded-[7px] bg-slate-50 p-4 text-sm font-bold text-slate-600">
              Remote React jobs
              <input
                className="h-5 w-5 accent-blue-600"
                onChange={() => window.dispatchEvent(new CustomEvent('portalToast', { detail: { message: 'Job alert preferences saved' } }))}
                type="checkbox"
              />
            </label>
          </Panel>
        </div>
      </div>
    </DashboardShell>
  )
}

export function CandidateAppliedJobsPage() {
  const user = getStoredUser()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadApplications = async () => {
      setLoading(true)
      try {
        const payload = await api.list('applications', `?candidateEmail=${encodeURIComponent(user?.email || '')}&sort=-createdAt&limit=100`)
        const list = Array.isArray(payload.data) ? payload.data : []
        setApplications(list)
      } catch {
        setApplications([])
      } finally {
        setLoading(false)
      }
    }

    loadApplications()
  }, [user?.email])

  return (
    <DashboardShell title="Applied Jobs" subtitle="Track every job you applied for, company details, application status, and submitted resume.">
      <Panel title="Your Applications">
        {loading ? (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">Loading applied jobs...</p>
        ) : applications.length ? (
          <div className="max-w-full overflow-x-auto rounded-[7px] border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Sr No', 'Job Title', 'Company', 'Status', 'Resume', 'Applied Date', 'Actions'].map((label) => (
                    <th className="px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {applications.map((application, index) => (
                  <tr className="hover:bg-blue-50/40" key={application._id || `${application.jobTitle}-${index}`}>
                    <td className="px-4 py-3 font-black text-slate-500">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-black text-slate-950">{application.jobTitle}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">Application ID: {String(application._id || '').slice(-8)}</p>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{application.company}</td>
                    <td className="px-4 py-3"><span className={`rounded-[7px] px-3 py-1 text-xs font-black ${getStatusTone(application.status)}`}>{normalizeStatus(application.status)}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{application.resumeUrl ? 'Submitted' : 'Not attached'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{application.createdAt ? new Date(application.createdAt).toLocaleString() : 'Recently'}</td>
                    <td className="px-4 py-3">
                      <Button to={application.jobId ? createJobDetailPath({
                        id: application.jobId,
                        title: application.jobTitle,
                        company: application.company,
                        location: application.location,
                        experience: application.experience,
                      }, index + 1) : '/jobs'} variant="secondary">View Job</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">No applied jobs yet.</p>
        )}
      </Panel>
    </DashboardShell>
  )
}

export function CandidateSavedJobsPage() {
  const user = getStoredUser()
  const [savedJobs, setSavedJobs] = useState(() => getSavedJobs(user))

  useEffect(() => {
    const syncSavedJobs = () => setSavedJobs(getSavedJobs(user))
    window.addEventListener('savedJobsChanged', syncSavedJobs)
    window.addEventListener('storage', syncSavedJobs)
    syncSavedJobs()

    return () => {
      window.removeEventListener('savedJobsChanged', syncSavedJobs)
      window.removeEventListener('storage', syncSavedJobs)
    }
  }, [user?.email, user?.id])

  return (
    <DashboardShell title="Saved Jobs" subtitle="Your saved jobs in a table view with company, location, salary, and actions.">
      <Panel title="Saved Jobs Table">
        {savedJobs.length ? (
          <div className="max-w-full overflow-x-auto rounded-[7px] border border-slate-200">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Sr No', 'Job Title', 'Company', 'Location', 'Type', 'Salary', 'Saved Date', 'Actions'].map((label) => (
                    <th className="px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {savedJobs.map((job, index) => (
                  <tr className="hover:bg-blue-50/40" key={job._id || job.id || `${job.title}-${index}`}>
                    <td className="px-4 py-3 font-black text-slate-500">#{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{job.title || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{job.company || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{job.location || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{job.type || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{job.salary || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{job.savedAt ? new Date(job.savedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <Button to={job._id || job.id ? createJobDetailPath(job, index + 1) : '/jobs'} variant="secondary">View Job</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">No saved jobs yet.</p>
        )}
      </Panel>
    </DashboardShell>
  )
}

export function CandidateInterviewInvitesPage() {
  const user = getStoredUser()
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadInvites = async () => {
      setLoading(true)
      try {
        const payload = await api.list('applications', `?candidateEmail=${encodeURIComponent(user?.email || '')}&sort=-createdAt&limit=100`)
        const list = Array.isArray(payload.data) ? payload.data : []
        const applicationInvites = list.filter((item) => ['Interview', 'Selected'].includes(item.status))
        setInvites(applicationInvites.length ? applicationInvites : getInterviewInvites(user))
      } catch {
        setInvites(getInterviewInvites(user))
      } finally {
        setLoading(false)
      }
    }

    loadInvites()
  }, [user?.email, user?.id])

  return (
    <DashboardShell title="Interview Invites" subtitle="Recruiter interview invites and selected-stage applications in one table.">
      <Panel title="Interview Invites Table">
        {loading ? (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">Loading interview invites...</p>
        ) : invites.length ? (
          <div className="max-w-full overflow-x-auto rounded-[7px] border border-slate-200">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Sr No', 'Job Title', 'Company', 'Status', 'Email', 'Invite Date', 'Actions'].map((label) => (
                    <th className="px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {invites.map((invite, index) => (
                  <tr className="hover:bg-blue-50/40" key={invite._id || invite.id || `${invite.jobTitle || invite.title}-${index}`}>
                    <td className="px-4 py-3 font-black text-slate-500">#{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{invite.jobTitle || invite.title || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{invite.company || '-'}</td>
                    <td className="px-4 py-3"><span className={`rounded-[7px] px-3 py-1 text-xs font-black ${getStatusTone(invite.status)}`}>{normalizeStatus(invite.status || 'Interview')}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{invite.recruiterEmail || invite.email || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{invite.createdAt || invite.invitedAt ? new Date(invite.createdAt || invite.invitedAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <Button to={invite.jobId ? createJobDetailPath({
                        id: invite.jobId,
                        title: invite.jobTitle || invite.title,
                        company: invite.company,
                        location: invite.location,
                        experience: invite.experience,
                      }, index + 1) : '/candidate-applied-jobs'} variant="secondary">View Details</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">No interview invites yet.</p>
        )}
      </Panel>
    </DashboardShell>
  )
}

export function CandidateJobAlertsPage() {
  const user = getStoredUser()
  const [jobAlerts, setJobAlerts] = useState(() => getJobAlerts(user))

  useEffect(() => {
    const syncAlerts = () => setJobAlerts(getJobAlerts(user))
    window.addEventListener('candidateActivityChanged', syncAlerts)
    window.addEventListener('storage', syncAlerts)
    syncAlerts()

    return () => {
      window.removeEventListener('candidateActivityChanged', syncAlerts)
      window.removeEventListener('storage', syncAlerts)
    }
  }, [user?.email, user?.id])

  return (
    <DashboardShell title="Job Alerts" subtitle="Your saved alert preferences and matching job alert rules in a table.">
      <Panel title="Job Alerts Table">
        {jobAlerts.length ? (
          <div className="max-w-full overflow-x-auto rounded-[7px] border border-slate-200">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
                <tr>
                  {['Sr No', 'Alert Name', 'Keyword', 'Location', 'Frequency', 'Status', 'Created', 'Actions'].map((label) => (
                    <th className="px-4 py-3" key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {jobAlerts.map((alert, index) => (
                  <tr className="hover:bg-blue-50/40" key={alert.id || alert._id || `${alert.keyword || alert.title}-${index}`}>
                    <td className="px-4 py-3 font-black text-slate-500">#{index + 1}</td>
                    <td className="px-4 py-3 font-black text-slate-950">{alert.title || alert.name || 'Job alert'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{alert.keyword || alert.role || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{alert.location || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{alert.frequency || 'Instant'}</td>
                    <td className="px-4 py-3"><span className="rounded-[7px] bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{alert.status || 'Active'}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-600">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : '-'}</td>
                    <td className="px-4 py-3">
                      <Button to="/jobs" variant="secondary">Find Jobs</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500">No job alerts yet.</p>
        )}
      </Panel>
    </DashboardShell>
  )
}

const headlineSuggestions = [
  'Frontend Developer', 'React Developer', 'Next.js Developer', 'Full Stack Developer', 'Backend Developer', 'Node.js Developer', 'Python Developer',
  'Java Developer', 'Mobile App Developer', 'UI/UX Designer', 'QA Engineer', 'DevOps Engineer', 'Data Analyst', 'Data Scientist',
  'Digital Marketing Executive', 'SEO Specialist', 'Content Writer', 'Sales Executive', 'Customer Support Executive', 'HR Recruiter', 'Fresher',
]

const locationSuggestions = [
  'Bengaluru, Karnataka', 'Mumbai, Maharashtra', 'Pune, Maharashtra', 'Hyderabad, Telangana', 'Chennai, Tamil Nadu', 'Delhi NCR',
  'Noida, Uttar Pradesh', 'Gurugram, Haryana', 'Kolkata, West Bengal', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan', 'Kochi, Kerala',
  'Remote', 'Work from Home', 'Hybrid - Bengaluru', 'Hybrid - Mumbai', 'Hybrid - Delhi NCR', 'International Remote',
]

function getStoredCandidateProfile(user) {
  try {
    const profile = JSON.parse(localStorage.getItem('candidateProfile') || '{}')
    return {
      ...profile,
      name: profile.name || user?.name || '',
      email: profile.email || user?.email || '',
      skills: Array.isArray(profile.skills) ? profile.skills : [],
      workMode: Array.isArray(profile.workMode) ? profile.workMode : [],
    }
  } catch {
    return { name: user?.name || '', email: user?.email || '', skills: [], workMode: [] }
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9+#.\s-]/g, ' ')
}

function getSeoTerms(profile) {
  const terms = [
    profile.headline,
    profile.preferredRole,
    profile.experience,
    profile.city,
    profile.state,
    profile.country,
    ...(Array.isArray(profile.skills) ? profile.skills : []),
    ...(Array.isArray(profile.workMode) ? profile.workMode : []),
  ]

  return terms
    .flatMap((value) => normalizeText(value).split(/\s+|,\s*/))
    .map((term) => term.trim())
    .filter((term) => term.length >= 2)
}

function rankRecommendedJobs(list, profile, applications = []) {
  const terms = getSeoTerms(profile)
  if (!terms.length) return []

  const appliedKeys = new Set(applications.map((item) => `${normalizeText(item.jobTitle)}|${normalizeText(item.company)}`))
  const profileLocation = normalizeText([profile.city, profile.state, profile.country].filter(Boolean).join(' '))

  return list
    .filter((job) => !appliedKeys.has(`${normalizeText(job.title)}|${normalizeText(job.company)}`))
    .map((job) => {
      const seoText = normalizeText([
        job.title,
        job.company,
        job.department,
        job.industry,
        job.description,
        job.location,
        job.type,
        job.workMode,
        ...(Array.isArray(job.skills) ? job.skills : []),
      ].filter(Boolean).join(' '))
      const keywordScore = terms.reduce((score, term) => score + (seoText.includes(term) ? 1 : 0), 0)
      const roleTerm = normalizeText(profile.preferredRole || profile.headline)
      const locationTerm = normalizeText(profile.city || profile.state)
      const roleBoost = roleTerm && normalizeText(job.title).includes(roleTerm) ? 4 : 0
      const locationBoost = profileLocation && locationTerm && normalizeText(job.location).includes(locationTerm) ? 2 : 0
      return { ...job, recommendationScore: keywordScore + roleBoost + locationBoost }
    })
    .filter((job) => job.recommendationScore > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
}

function StatusRows({ applications }) {
  if (!applications.length) {
    return <p className="rounded-[7px] bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:p-4 sm:text-sm">No applied jobs yet.</p>
  }

  return applications.map((application) => (
    <div className="flex items-center justify-between gap-2 rounded-[7px] bg-slate-50 p-3 sm:p-4" key={application.id}>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3"><FileCheck2 className="shrink-0 text-blue-600" size={18} /><span className="truncate text-xs font-semibold text-slate-700 sm:text-base">{application.title}</span></div>
      <span className={`rounded-[7px] px-3 py-1 text-xs font-bold ${getStatusTone(application.status)}`}>{normalizeStatus(application.status)}</span>
    </div>
  ))
}

function ApplicationTimeline({ applications }) {
  if (!applications.length) {
    return <p className="rounded-[7px] bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:p-4 sm:text-sm">No application tracking yet.</p>
  }

  return (
    <div className="grid gap-5">
      {applications.map((application) => {
        const currentIndex = getStatusIndex(application.status)

        return (
          <div className="rounded-[7px] bg-slate-50 p-4" key={application.id}>
            <div className="mb-4 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
              <div>
                <p className="font-black text-slate-950">{application.title}</p>
                <p className="text-sm font-semibold text-slate-500">{application.company}</p>
              </div>
              <span className={`w-max rounded-[7px] px-3 py-1 text-xs font-black ${getStatusTone(application.status)}`}>{normalizeStatus(application.status)}</span>
            </div>

            <div className="grid gap-3">
              {getTimelineSteps(application.status).map((step, index) => {
                const complete = index <= currentIndex
                const rejected = application.status === 'Rejected' && step === 'Rejected'

                return (
                  <div className="flex items-center gap-3" key={step}>
                    <span className={`grid h-9 w-9 place-items-center rounded-[7px] text-sm font-black ${complete ? (rejected ? 'bg-rose-600 text-white' : 'bg-blue-600 text-white') : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                      {index + 1}
                    </span>
                    <div className="flex-1 rounded-[7px] bg-white p-4 ring-1 ring-slate-200">
                      <p className="font-bold text-slate-800">{step}</p>
                      <p className="text-sm text-slate-500">{application.title} - {application.company}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function normalizeStatus(status) {
  return status === 'New' ? 'Applied' : status
}

function getTimelineSteps(status) {
  if (status === 'Rejected') return ['Applied', 'Reviewed', 'Rejected']
  if (status === 'Selected') return ['Applied', 'Reviewed', 'Shortlisted', 'Interview', 'Selected']
  return ['Applied', 'Reviewed', 'Shortlisted', 'Interview']
}

function getStatusIndex(status) {
  return getTimelineSteps(status).indexOf(normalizeStatus(status))
}

function getStatusTone(status) {
  const tones = {
    New: 'bg-blue-50 text-blue-700',
    Reviewed: 'bg-sky-50 text-sky-700',
    Shortlisted: 'bg-teal-50 text-teal-700',
    Interview: 'bg-violet-50 text-violet-700',
    Selected: 'bg-emerald-50 text-emerald-700',
    Rejected: 'bg-rose-50 text-rose-700',
  }

  return tones[status] || 'bg-slate-100 text-slate-600'
}

export function DashboardShell({ title, subtitle, children }) {
  return (
    <section className="py-4 sm:py-10">
      <div className="mx-auto max-w-7xl px-2 sm:px-6 lg:px-8">
        <div className="mb-4 overflow-hidden rounded-[7px] border border-[#0057B8]/10 bg-white p-4 shadow-lg shadow-[#0057B8]/10 sm:mb-8 sm:p-6">
          <div className="h-1.5 w-24 rounded-[7px] bg-gradient-to-r from-[#0057B8] via-[#FF8A00] to-[#3E9B28] sm:w-32" />
          <h1 className="mt-4 text-2xl font-black text-slate-950 sm:mt-5 sm:text-5xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-xs font-semibold leading-5 text-slate-500 sm:mt-3 sm:text-base sm:font-normal sm:leading-6">{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  )
}

export function MetricCard({ icon: Icon, label, onClick, value }) {
  const Component = onClick ? 'button' : 'div'
  return (
    <Component className={`rounded-[7px] border border-[#0057B8]/10 bg-white p-3 text-left shadow-sm shadow-[#0057B8]/5 sm:p-5 ${onClick ? 'transition hover:-translate-y-0.5 hover:border-[#FF8A00]/30 hover:shadow-lg hover:shadow-[#0057B8]/10' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <span className="grid h-9 w-9 place-items-center rounded-[7px] bg-[#0057B8]/10 text-[#0057B8] sm:h-11 sm:w-11"><Icon size={18} /></span>
      <p className="mt-3 text-2xl font-black text-slate-950 sm:mt-5 sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
    </Component>
  )
}

export function Panel({ action, title, children }) {
  return (
    <section className="rounded-[7px] border border-[#0057B8]/10 bg-white p-3 shadow-sm shadow-[#0057B8]/5 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 sm:mb-5 sm:gap-3">
        <h2 className="text-base font-bold text-slate-950 sm:text-xl">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
