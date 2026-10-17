import { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, Info, Loader2, LogIn, Mail, UserPlus, X } from 'lucide-react'
import { Button } from './Button'
import { api } from '../services/api'
import { getStoredUser } from '../routes/authRouting'
import { getCandidateProfileCompletion, getCandidateProfileRedirect, isSameAppliedJob } from '../utils/candidateActivity'

function getAppliedJobsKey(user) {
  return user?.id || user?.email ? `appliedJobs:${user.id || user.email}` : null
}

function saveAppliedJob(user, job) {
  const key = getAppliedJobsKey(user)
  if (!key) return

  const jobId = String(job._id || job.id)
  const current = JSON.parse(localStorage.getItem(key) || '[]')
  const next = current.some((item) => String(item._id || item.id) === jobId) ? current : [{ ...job, applicationStatus: 'New', appliedAt: new Date().toISOString() }, ...current]
  localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent('candidateActivityChanged', { detail: { jobs: next } }))
}

export function ApplyModal({ job, onClose }) {
  const [status, setStatus] = useState('idle')
  const [message, setMessage] = useState('')
  const submittedRef = useRef(false)
  const user = getStoredUser()
  const isCandidate = user?.role === 'Candidate'

  useEffect(() => {
    if (!job || !isCandidate || submittedRef.current) return

    submittedRef.current = true
    setStatus('loading')
    setMessage('Checking your profile...')

    const submit = async () => {
      const completion = getCandidateProfileCompletion(user)
      if (!completion.complete) {
        sessionStorage.setItem('candidateProfileMissing', JSON.stringify(completion.missing))
        window.location.assign(getCandidateProfileRedirect(completion.missing))
        return 'redirecting'
      }

      const existing = await api.list('applications', `?candidateEmail=${encodeURIComponent(user.email)}&limit=100`)
      const applications = existing.data || []
      const alreadyApplied = applications.some((item) => isSameAppliedJob(item, job))

      if (alreadyApplied) {
        saveAppliedJob(user, job)
        return 'already-applied'
      }

      await api.createApplication({
        jobId: job._id || job.id,
        recruiterEmail: job.recruiterEmail || '',
        recruiterName: job.recruiterName || '',
        candidateName: completion.profile.name || user.name || 'Candidate',
        candidateEmail: user.email,
        candidatePhone: completion.profile.phone || user.phone || '',
        jobTitle: job.title,
        company: job.company,
        resumeUrl: completion.profile.resumeUrl || completion.profile.resumeName || '',
        status: 'New',
      })

      return 'applied'
    }

    submit()
      .then((result) => {
        if (result === 'redirecting') return
        saveAppliedJob(user, job)
        setStatus('success')
        setMessage(result === 'already-applied' ? 'You have already applied for this job.' : 'Application submitted successfully.')
      })
      .catch((error) => {
        setStatus('error')
        setMessage(error.message || 'Application could not be submitted.')
      })
  }, [isCandidate, job, user])

  if (!job) return null

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/30 p-4 backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[7px] bg-white p-4 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-blue-600">Apply to</p>
            <h3 className="mt-1 text-2xl font-bold text-slate-950">{job.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{job.company} - {job.location}</p>
          </div>
          <button className="grid h-10 w-10 place-items-center rounded-[7px] bg-slate-100 text-slate-500" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {isCandidate ? (
          <div className="mt-6 rounded-[7px] bg-blue-50 p-5 text-center">
            {status === 'loading' ? (
              <Loader2 className="mx-auto animate-spin text-blue-600" size={34} />
            ) : (
              <CheckCircle2 className="mx-auto text-teal-500" size={36} />
            )}
            <h3 className="mt-4 text-xl font-black text-slate-950">{status === 'loading' ? 'Applying now' : status === 'error' ? 'Application failed' : 'Application sent'}</h3>
            <p className="mt-2 text-sm font-semibold text-slate-500">{message}</p>
            {status !== 'loading' && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button className="w-full" onClick={onClose} variant="secondary">Done</Button>
                <Button className="w-full" onClick={() => window.location.assign('/candidate-applied-jobs')}>Applied Jobs</Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6 rounded-[7px] bg-slate-50 p-5 text-center">
            <UserPlus className="mx-auto text-blue-600" size={36} />
            <h3 className="mt-4 text-xl font-black text-slate-950">Login required</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
              Log in with a candidate account to apply for jobs. If you do not have an account, register first.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50" onClick={() => window.location.assign('/auth')} type="button">
                <LogIn size={18} /> Login
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:bg-blue-700" onClick={() => window.location.assign('/auth')} type="button">
                <UserPlus size={18} /> Register
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Toast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const showToast = (event) => {
      const detail = event.detail || {}
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const nextToast = {
        actionHref: detail.actionHref || '',
        actionLabel: detail.actionLabel || '',
        id,
        message: detail.message || 'Action completed successfully.',
        title: detail.title || getToastTitle(detail.type),
        type: detail.type || 'success',
      }

      setToasts((current) => [nextToast, ...current].slice(0, 4))
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, detail.duration || 3500)
    }

    window.addEventListener('portalToast', showToast)
    return () => window.removeEventListener('portalToast', showToast)
  }, [])

  if (!toasts.length) return null

  return (
    <div className="fixed right-4 top-4 z-[90] grid w-[calc(100vw-2rem)] max-w-sm gap-3 sm:right-6 sm:top-6">
      {toasts.map((toast) => {
        const Icon = getToastIcon(toast.type)
        const tone = getToastTone(toast.type)

        return (
          <div className={`overflow-hidden rounded-[7px] border bg-white shadow-2xl ${tone.border} ${tone.shadow}`} key={toast.id}>
            <div className="flex items-start gap-3 p-4">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[7px] ${tone.iconBg} ${tone.iconText}`}>
                <Icon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-950">{toast.title}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">{toast.message}</p>
                {toast.actionHref && toast.actionLabel && (
                  <button
                    className="mt-3 inline-flex min-h-9 items-center justify-center gap-2 rounded-[7px] bg-[#0057B8] px-4 text-xs font-black text-white shadow-lg shadow-blue-100"
                    onClick={() => window.location.assign(toast.actionHref)}
                    type="button"
                  >
                    <LogIn size={15} />
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button className="grid h-8 w-8 shrink-0 place-items-center rounded-[7px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" onClick={() => setToasts((current) => current.filter((item) => item.id !== toast.id))} type="button" aria-label="Close notification">
                <X size={16} />
              </button>
            </div>
            <span className={`block h-1 ${tone.bar}`} />
          </div>
        )
      })}
    </div>
  )
}

function getToastTitle(type = 'success') {
  if (type === 'error') return 'Action failed'
  if (type === 'info') return 'Update'
  return 'Success'
}

function getToastIcon(type = 'success') {
  if (type === 'error') return AlertCircle
  if (type === 'info') return Info
  return CheckCircle2
}

function getToastTone(type = 'success') {
  const tones = {
    success: {
      border: 'border-[#3E9B28]/20',
      iconBg: 'bg-[#3E9B28]/10',
      iconText: 'text-[#2F7D1F]',
      shadow: 'shadow-[#3E9B28]/10',
      bar: 'bg-[#3E9B28]',
    },
    error: {
      border: 'border-rose-200',
      iconBg: 'bg-rose-50',
      iconText: 'text-rose-600',
      shadow: 'shadow-rose-100',
      bar: 'bg-rose-500',
    },
    info: {
      border: 'border-[#0057B8]/20',
      iconBg: 'bg-[#0057B8]/10',
      iconText: 'text-[#0057B8]',
      shadow: 'shadow-[#0057B8]/10',
      bar: 'bg-[#0057B8]',
    },
  }

  return tones[type] || tones.success
}

export function SkeletonCards() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((item) => (
        <div className="rounded-[7px] border border-slate-200 bg-white p-5" key={item}>
          <div className="h-12 w-12 animate-pulse rounded-[7px] bg-slate-100" />
          <div className="mt-5 h-4 w-2/3 animate-pulse rounded-[7px] bg-slate-100" />
          <div className="mt-3 h-3 w-full animate-pulse rounded-[7px] bg-slate-100" />
        </div>
      ))}
    </div>
  )
}

export function EmptyState() {
  return (
    <div className="rounded-[7px] border border-dashed border-slate-300 bg-white p-10 text-center">
      <Mail className="mx-auto text-blue-500" size={34} />
      <h3 className="mt-4 text-xl font-bold text-slate-950">No matching jobs yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">Adjust filters or save this search to get fresh matches in your inbox.</p>
      <Button className="mt-5">Save Search</Button>
    </div>
  )
}
