import { useEffect, useState } from 'react'
import { City, Country, State } from 'country-state-city'
import { BriefcaseBusiness, Camera, CheckCircle2, FileText, Image, Mail, MapPin, Pencil, Phone, Plus, Save, ShieldCheck, Upload, UserRound, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Button } from '../components/Button'
import { getStoredUser } from '../routes/authRouting'
import { DashboardShell, Panel } from './CandidateDashboard'
import { getSavedJobs } from '../utils/savedJobs'
import { getAppliedJobs, getCandidateProfileCompletion } from '../utils/candidateActivity'
import { api } from '../services/api'
import { useApiResource } from '../hooks/useApiResource'
import { createJobDetailPath } from '../utils/jobRoutes'

const defaultSkills = []

const skillOptions = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'React', 'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Tailwind CSS', 'Bootstrap', 'Material UI', 'Redux', 'Zustand',
  'Node.js', 'Express.js', 'NestJS', 'Python', 'Django', 'Flask', 'FastAPI', 'Java', 'Spring Boot', 'PHP', 'Laravel', 'Ruby on Rails', 'Go', 'C#', '.NET',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Supabase', 'GraphQL', 'REST APIs', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud',
  'Git', 'GitHub', 'CI/CD', 'Linux', 'Jenkins', 'Terraform', 'DevOps', 'QA Testing', 'Selenium', 'Cypress', 'Playwright', 'Jest', 'Vitest',
  'UI Development', 'UX Design', 'Figma', 'Adobe XD', 'Product Management', 'Agile', 'Scrum', 'Data Analysis', 'Excel', 'Power BI', 'Tableau', 'SQL',
  'Machine Learning', 'AI', 'Data Science', 'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'NLP', 'Digital Marketing', 'SEO', 'Content Writing', 'Sales',
  'Customer Support', 'HR', 'Recruitment', 'Accounting', 'Finance', 'Operations', 'Project Management', 'Team Collaboration', 'Communication',
]

const workModeOptions = ['On-site', 'Remote', 'Hybrid', 'Work from Home', 'Freelance', 'Contract', 'Part-time', 'Full-time', 'Night Shift', 'Flexible']

const salaryOptions = ['0-3 LPA', '3-6 LPA', '6-10 LPA', '10-15 LPA', '15-20 LPA', '20-30 LPA', '30-50 LPA', '50+ LPA', 'Hourly', 'Negotiable']

const noticePeriodOptions = ['Immediate', '7 days', '15 days', '30 days', '45 days', '60 days', '90 days', 'Serving notice', 'Negotiable']

const preferredRoleOptions = [
  'Frontend Developer', 'React Developer', 'Next.js Developer', 'Full Stack Developer', 'Backend Developer', 'Node.js Developer', 'Python Developer',
  'Java Developer', 'PHP Developer', 'Mobile App Developer', 'Android Developer', 'iOS Developer', 'Flutter Developer', 'DevOps Engineer',
  'Cloud Engineer', 'QA Engineer', 'Automation Tester', 'UI/UX Designer', 'Product Designer', 'Product Manager', 'Project Manager', 'Business Analyst',
  'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'Digital Marketing Executive', 'SEO Specialist', 'Content Writer',
  'Sales Executive', 'Customer Support Executive', 'HR Recruiter', 'Talent Acquisition Specialist', 'Accountant', 'Operations Executive',
]

const headlineOptions = [
  'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'React Developer', 'Next.js Developer', 'Node.js Developer', 'Python Developer',
  'Java Developer', 'PHP Developer', 'Laravel Developer', 'MERN Stack Developer', 'MEAN Stack Developer', 'Mobile App Developer', 'Flutter Developer',
  'Android Developer', 'iOS Developer', 'UI/UX Designer', 'Product Designer', 'Graphic Designer', 'Web Designer', 'QA Engineer', 'Automation Tester',
  'DevOps Engineer', 'Cloud Engineer', 'Data Analyst', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer', 'Business Analyst',
  'Project Manager', 'Product Manager', 'Digital Marketing Executive', 'SEO Specialist', 'Content Writer', 'Technical Writer', 'Sales Executive',
  'Business Development Executive', 'Customer Support Executive', 'HR Recruiter', 'Talent Acquisition Specialist', 'Accountant', 'Finance Executive',
  'Operations Executive', 'BPO Executive', 'Telecaller', 'Data Entry Operator', 'Fresher', 'Intern',
]

const availabilityOptions = [
  'Open to full-time roles', 'Open to part-time roles', 'Open to remote roles', 'Open to hybrid roles', 'Open to on-site roles', 'Open to freelance work',
  'Open to contract roles', 'Open to internships', 'Actively looking', 'Immediately available', 'Serving notice period', 'Available in 15 days',
  'Available in 30 days', 'Available in 60 days', 'Available in 90 days', 'Open to relocation', 'Open to night shift', 'Open to flexible shifts',
  'Not actively looking', 'Open to better opportunities',
]

const experienceOptions = [
  'Fresher', 'Internship experience', '0-6 months', '0-1 year', '1+ years', '1-2 years', '2-3 years', '3-4 years', '4-5 years', '5-6 years',
  '6-8 years', '8-10 years', '10-12 years', '12-15 years', '15+ years', 'Entry level', 'Mid level', 'Senior level', 'Lead level', 'Manager level',
]

function getStoredCandidateProfile(user) {
  const fallback = {
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: '',
    locationScope: 'India',
    country: 'India',
    countryCode: 'IN',
    state: '',
    stateCode: '',
    city: '',
    fullAddress: '',
    headline: '',
    availability: 'Open to full-time roles',
    experience: '',
    preferredRole: '',
    workMode: [],
    expectedSalary: [],
    noticePeriod: [],
    skills: defaultSkills,
    avatar: '',
    banner: '',
    resumeName: '',
    resumeUrl: '',
    resumeUpdatedAt: '',
  }

  try {
    const stored = JSON.parse(localStorage.getItem('candidateProfile') || '{}')
    const merged = { ...fallback, ...stored }
    const countryCode = merged.locationScope === 'India'
      ? 'IN'
      : merged.countryCode || Country.getAllCountries().find((country) => country.name === merged.country)?.isoCode || 'US'
    const country = Country.getCountryByCode(countryCode)
    const states = getStateOptions(countryCode)
    const stateCode = merged.stateCode || states.find((state) => state.name === merged.state)?.isoCode || ''
    const state = State.getStateByCodeAndCountry(stateCode, countryCode)
    const cities = getCityOptions(countryCode, stateCode)
    const city = merged.city || ''

    return {
      ...merged,
      country: country?.name || merged.country || '',
      countryCode,
      state: state?.name || merged.state || '',
      stateCode,
      city,
      skills: Array.isArray(merged.skills) ? merged.skills : defaultSkills,
      workMode: Array.isArray(merged.workMode) ? merged.workMode : String(merged.workMode || '').split(/\s+or\s+|,\s*/).filter(Boolean),
      expectedSalary: Array.isArray(merged.expectedSalary) ? merged.expectedSalary : String(merged.expectedSalary || '').split(/\s+or\s+|,\s*/).filter(Boolean),
      noticePeriod: Array.isArray(merged.noticePeriod) ? merged.noticePeriod : String(merged.noticePeriod || '').split(/\s+or\s+|,\s*/).filter(Boolean),
    }
  } catch {
    return fallback
  }
}

export function CandidateProfilePage() {
  const user = getStoredUser()
  const [searchParams] = useSearchParams()
  const [profile, setProfile] = useState(() => getStoredCandidateProfile(user))
  const { data: applications } = useApiResource(() => user?.email ? api.listAll('applications', `?candidateEmail=${encodeURIComponent(user.email)}`) : Promise.resolve({ data: [] }), getAppliedJobs(user), [user?.email])
  const filledFields = ['name', 'email', 'phone', 'city', 'state', 'headline', 'experience', 'preferredRole', 'avatar', 'banner', 'skills', 'workMode'].filter((key) => Array.isArray(profile[key]) ? profile[key].length > 0 : Boolean(profile[key])).length
  const profileStrength = Math.round(filledFields / 12 * 100)
  const profileStats = [['Profile Strength', profileStrength + '%'], ['Applications', applications.length], ['Saved Jobs', getSavedJobs(user).length], ['Interviews', applications.filter((item) => item.status === 'Interview').length]]
  const [editing, setEditing] = useState(() => Boolean(searchParams.get('missing')))
  const [message, setMessage] = useState('')
  const [resumeUploading, setResumeUploading] = useState(false)
  const [skillQuery, setSkillQuery] = useState('')
  const [savedJobs, setSavedJobs] = useState(() => getSavedJobs(user))

  useEffect(() => {
    const syncSavedJobs = () => setSavedJobs(getSavedJobs(user))
    window.addEventListener('savedJobsChanged', syncSavedJobs)
    window.addEventListener('storage', syncSavedJobs)

    return () => {
      window.removeEventListener('savedJobsChanged', syncSavedJobs)
      window.removeEventListener('storage', syncSavedJobs)
    }
  }, [user])

  useEffect(() => {
    const missingFromApply = searchParams.get('missing')
    if (!missingFromApply) return

    let missing = [missingFromApply]
    try {
      const storedMissing = JSON.parse(sessionStorage.getItem('candidateProfileMissing') || '[]')
      if (Array.isArray(storedMissing) && storedMissing.length) missing = storedMissing
    } catch {
      missing = [missingFromApply]
    }

    setEditing(true)
    setMessage(`Complete these details before applying for a job: ${missing.join(', ')}.`)
  }, [searchParams])

  const update = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  const saveProfile = () => {
    const nextProfile = { ...profile, location: formatLocation(profile) }
    localStorage.setItem('candidateProfile', JSON.stringify(nextProfile))
    setProfile(nextProfile)

    if (user) {
      localStorage.setItem('authUser', JSON.stringify({ ...user, name: nextProfile.name, email: nextProfile.email }))
    }

    sessionStorage.removeItem('candidateProfileMissing')
    window.dispatchEvent(new CustomEvent('candidateActivityChanged'))
    setEditing(false)
    setMessage('Profile updated successfully.')
  }

  const uploadImage = (key, file) => {
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => update(key, reader.result)
    reader.readAsDataURL(file)
  }

  const uploadResume = async (file) => {
    if (!file) return

    if (file.type !== 'application/pdf') {
      setMessage('Only PDF resume upload is allowed.')
      return
    }

    setResumeUploading(true)
    setMessage('Uploading resume to Cloudflare R2...')

    const data = new FormData()
    data.append('resume', file)
    data.append('candidateName', profile.name)
    data.append('emailId', profile.email)
    data.append('mobileNumber', profile.phone)
    data.append('role', profile.preferredRole || profile.headline)
    data.append('companyName', 'Candidate Profile')
    data.append('state', profile.state)
    data.append('location', formatLocation(profile))
    data.append('entity', 'Candidate Profile')
    data.append('department', profile.headline)
    data.append('qualification', profile.experience)
    if (profile.resumeMongoId) data.append('previousResumeId', profile.resumeMongoId)

    try {
      const payload = await api.uploadResumeToCloudflareR2(data)
      const resume = payload.data || {}
      const nextProfile = {
        ...profile,
        resumeName: file.name,
        resumeUrl: resume.resumeUrl || '',
        resumeMongoId: resume._id || '',
        resumeJson: payload.resumeJson || resume.resumeJson || null,
        resumeUpdatedAt: new Date().toISOString(),
      }
      setProfile(nextProfile)
      localStorage.setItem('candidateProfile', JSON.stringify(nextProfile))
      window.dispatchEvent(new CustomEvent('candidateActivityChanged'))
      setMessage('Resume uploaded to Cloudflare R2 and saved in MongoDB.')
    } catch (error) {
      setMessage(error.message || 'Resume upload failed. Please check Cloudflare R2 settings.')
    } finally {
      setResumeUploading(false)
    }
  }

  const addSkill = (skill) => {
    const nextSkill = skill.trim()
    if (!nextSkill || profile.skills.some((item) => item.toLowerCase() === nextSkill.toLowerCase())) return
    update('skills', [...profile.skills, nextSkill])
    setSkillQuery('')
  }

  const removeSkill = (skill) => update('skills', profile.skills.filter((item) => item !== skill))

  const toggleWorkMode = (mode) => {
    const selected = profile.workMode.includes(mode)
    update('workMode', selected ? profile.workMode.filter((item) => item !== mode) : [...profile.workMode, mode])
  }

  const toggleExpectedSalary = (salary) => {
    const selected = profile.expectedSalary.includes(salary)
    update('expectedSalary', selected ? profile.expectedSalary.filter((item) => item !== salary) : [...profile.expectedSalary, salary])
  }

  const toggleNoticePeriod = (period) => {
    const selected = profile.noticePeriod.includes(period)
    update('noticePeriod', selected ? profile.noticePeriod.filter((item) => item !== period) : [...profile.noticePeriod, period])
  }

  const updateLocationScope = (scope) => {
    if (scope === 'India') {
      const nextCountryCode = 'IN'
      const nextState = getStateOptions(nextCountryCode)[0]
      const nextCity = getCityOptions(nextCountryCode, nextState?.isoCode)[0]
      setProfile((current) => ({
        ...current,
        locationScope: scope,
        country: 'India',
        countryCode: nextCountryCode,
        state: nextState?.name || '',
        stateCode: nextState?.isoCode || '',
        city: nextCity?.name || '',
      }))
      setMessage('')
      return
    }

    const nextCountryCode = 'US'
    const nextCountry = Country.getCountryByCode(nextCountryCode)
    const nextState = getStateOptions(nextCountryCode)[0]
    const nextCity = getCityOptions(nextCountryCode, nextState?.isoCode)[0]
    setProfile((current) => ({
      ...current,
      locationScope: scope,
      country: nextCountry?.name || 'United States',
      countryCode: nextCountryCode,
      state: nextState?.name || '',
      stateCode: nextState?.isoCode || '',
      city: nextCity?.name || '',
    }))
    setMessage('')
  }

  const updateCountry = (countryCode) => {
    const country = Country.getCountryByCode(countryCode)
    const nextState = getStateOptions(countryCode)[0]
    const nextCity = getCityOptions(countryCode, nextState?.isoCode)[0]
    setProfile((current) => ({
      ...current,
      country: country?.name || '',
      countryCode,
      state: nextState?.name || '',
      stateCode: nextState?.isoCode || '',
      city: nextCity?.name || '',
    }))
    setMessage('')
  }

  const updateState = (stateCode) => {
    const state = State.getStateByCodeAndCountry(stateCode, profile.countryCode)
    const cities = getCityOptions(profile.countryCode, stateCode)
    setProfile((current) => ({ ...current, state: state?.name || '', stateCode, city: cities[0]?.name || '' }))
    setMessage('')
  }

  const filteredSkillOptions = skillOptions
    .filter((skill) => skill.toLowerCase().includes(skillQuery.trim().toLowerCase()))
    .filter((skill) => !profile.skills.includes(skill))
    .slice(0, 18)
  const completion = getCandidateProfileCompletion(user)

  return (
    <DashboardShell title="Candidate Profile" subtitle="Your professional profile, contact details, skills, resume, and job preferences.">
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="grid gap-6">
          <Panel title="Profile Overview">
            <div className="overflow-hidden rounded-[7px] bg-slate-50">
              <div className="relative min-h-44 bg-gradient-to-br from-blue-600 via-sky-500 to-teal-400">
                {profile.banner && <img className="absolute inset-0 h-full w-full object-cover" src={profile.banner} alt="Candidate profile cover" />}
                <label className="absolute right-4 top-4 inline-flex cursor-pointer items-center gap-2 rounded-[7px] bg-white/90 px-4 py-2 text-sm font-black text-slate-700 shadow-lg shadow-slate-900/10 backdrop-blur hover:bg-white">
                  <Image size={17} />
                  Profile Image
                  <input accept="image/*" className="hidden" onChange={(event) => uploadImage('banner', event.target.files?.[0])} type="file" />
                </label>
              </div>

              <div className="p-5">
                <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                    <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[7px] bg-blue-600 text-white ring-4 ring-white">
                      {profile.avatar ? (
                        <img className="h-full w-full object-cover" src={profile.avatar} alt="Candidate avatar" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-3xl font-black">{getInitials(profile.name)}</div>
                      )}
                      <label className="absolute bottom-2 right-2 grid h-9 w-9 cursor-pointer place-items-center rounded-[7px] bg-white text-blue-600 shadow-lg">
                        <Camera size={17} />
                        <input accept="image/*" className="hidden" onChange={(event) => uploadImage('avatar', event.target.files?.[0])} type="file" />
                      </label>
                    </div>
                    <div className="pt-1">
                      <h2 className="text-2xl font-black text-slate-950">{profile.name}</h2>
                      <p className="mt-1 font-semibold text-slate-500">{profile.headline} - {profile.availability}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex w-max items-center gap-2 rounded-[7px] bg-teal-50 px-3 py-1 text-sm font-black text-teal-700">
                      <CheckCircle2 size={16} />
                      Verified
                    </span>
                    <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-100 hover:bg-blue-700" onClick={() => setEditing((value) => !value)} type="button">
                      <Pencil size={16} />
                      {editing ? 'Cancel Edit' : 'Edit Profile'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-[7px] bg-slate-100">
                  <div className="h-full rounded-[7px] bg-teal-500" style={{ width: `${profileStrength}%` }} />
                </div>
                {message && <p className="mt-4 rounded-[7px] bg-teal-50 p-3 text-sm font-black text-teal-700">{message}</p>}
                {!completion.complete && (
                  <div className="mt-4 rounded-[7px] bg-amber-50 p-3 text-sm font-black text-amber-700">
                    Pending details: {completion.missing.join(', ')}
                  </div>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Saved Jobs">
            <div className="grid gap-3 md:grid-cols-2">
              {savedJobs.length ? (
                savedJobs.map((job) => (
                  <div className="rounded-[7px] bg-slate-50 p-4" key={job._id || job.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{job.title}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{job.company}</p>
                      </div>
                      <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{job.workMode}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{job.location} - {job.salary}</p>
                    <Button className="mt-4 w-full" to={createJobDetailPath(job)} variant="secondary">View Details</Button>
                  </div>
                ))
              ) : (
                <div className="rounded-[7px] bg-slate-50 p-5 text-sm font-semibold text-slate-500 md:col-span-2">
                  No saved jobs yet. Save jobs from listings and they will appear here.
                </div>
              )}
            </div>
          </Panel>

          <Panel title="Personal Information">
            {editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <EditField label="Full Name" onChange={(value) => update('name', value)} value={profile.name} />
                <EditField label="Email" onChange={(value) => update('email', value)} type="email" value={profile.email} />
                <EditField label="Phone" onChange={(value) => update('phone', value)} value={profile.phone} />
                <LocationSelector
                  className="md:col-span-2"
                  profile={profile}
                  onCityChange={(city) => update('city', city)}
                  onCountryChange={updateCountry}
                  onFullAddressChange={(fullAddress) => update('fullAddress', fullAddress)}
                  onScopeChange={updateLocationScope}
                  onStateChange={updateState}
                />
                <EditField datalist="headline-options" label="Headline" onChange={(value) => update('headline', value)} value={profile.headline} />
                <EditField datalist="availability-options" label="Availability" onChange={(value) => update('availability', value)} value={profile.availability} />
                <EditField datalist="experience-options" label="Experience" onChange={(value) => update('experience', value)} value={profile.experience} />
                <datalist id="headline-options">
                  {headlineOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
                <datalist id="availability-options">
                  {availabilityOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
                <datalist id="experience-options">
                  {experienceOptions.map((item) => <option key={item} value={item} />)}
                </datalist>
                <div className="flex items-end">
                  <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-200 hover:bg-blue-700" onClick={saveProfile} type="button">
                    <Save size={18} />
                    Update Profile
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem icon={UserRound} label="Full Name" value={profile.name} />
                <InfoItem icon={Mail} label="Email" value={profile.email} />
                <InfoItem icon={Phone} label="Phone" value={profile.phone} />
                <InfoItem icon={MapPin} label="Location" value={formatLocation(profile)} />
                <InfoItem icon={MapPin} label="Full Address" value={profile.fullAddress || 'Not added'} />
                <InfoItem icon={BriefcaseBusiness} label="Experience" value={profile.experience} />
                <InfoItem icon={ShieldCheck} label="Role" value={user?.role || 'Candidate'} />
              </div>
            )}
          </Panel>

          <Panel title="Skills">
            {editing && (
              <div className="mb-5 rounded-[7px] bg-slate-50 p-4">
                <label>
                  <span className="text-sm font-bold text-slate-700">Add Skills</span>
                  <div className="mt-2 flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-[7px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500"
                      onChange={(event) => setSkillQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addSkill(skillQuery)
                        }
                      }}
                      placeholder="Search or type a skill"
                      value={skillQuery}
                    />
                    <button className="grid h-12 w-12 shrink-0 place-items-center rounded-[7px] bg-blue-600 text-white hover:bg-blue-700" onClick={() => addSkill(skillQuery)} type="button" aria-label="Add skill">
                      <Plus size={18} />
                    </button>
                  </div>
                </label>

                <div className="mt-4 flex max-h-48 flex-wrap gap-2 overflow-y-auto">
                  {filteredSkillOptions.map((skill) => (
                    <button className="rounded-[7px] bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700" key={skill} onClick={() => addSkill(skill)} type="button">
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {profile.skills.map((skill) => (
                <span className="inline-flex items-center gap-2 rounded-[7px] bg-blue-50 px-4 py-2 text-sm font-black text-blue-700" key={skill}>
                  {skill}
                  {editing && (
                    <button className="grid h-5 w-5 place-items-center rounded-[7px] bg-blue-100 text-blue-700 hover:bg-blue-200" onClick={() => removeSkill(skill)} type="button" aria-label={`Remove ${skill}`}>
                      <X size={13} />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </Panel>

          <Panel title="Resume">
            <div className="flex flex-col justify-between gap-4 rounded-[7px] bg-slate-50 p-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-[7px] bg-white text-blue-600 ring-1 ring-slate-200">
                  <FileText size={22} />
                </span>
                <div>
                  <p className="font-black text-slate-950">{profile.resumeName || 'Resume not uploaded'}</p>
                  <p className="text-sm font-semibold text-slate-500">
                    {profile.resumeUpdatedAt ? `Updated ${new Date(profile.resumeUpdatedAt).toLocaleDateString()}` : 'Upload resume to apply for jobs'}
                  </p>
                </div>
              </div>
              <label className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[7px] bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100">
                <Upload size={18} />
                {resumeUploading ? 'Uploading...' : profile.resumeName ? 'Update Resume' : 'Upload Resume'}
                <input accept="application/pdf,.pdf" className="hidden" disabled={resumeUploading} onChange={(event) => uploadResume(event.target.files?.[0])} type="file" />
              </label>
            </div>
          </Panel>
        </div>

        <div className="grid h-max gap-6">
          <Panel title="Profile Stats">
            <div className="grid gap-3">
              {profileStats.map(([label, value]) => (
                <div className="flex items-center justify-between rounded-[7px] bg-slate-50 p-4" key={label}>
                  <span className="text-sm font-bold text-slate-500">{label}</span>
                  <span className="text-xl font-black text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Job Preferences">
            {editing ? (
              <div className="grid gap-3">
                <EditField datalist="preferred-role-options" label="Preferred Role" onChange={(value) => update('preferredRole', value)} value={profile.preferredRole} />
                <datalist id="preferred-role-options">
                  {preferredRoleOptions.map((role) => <option key={role} value={role} />)}
                </datalist>

                <MultiSelect label="Work Mode" options={workModeOptions} selected={profile.workMode} onToggle={toggleWorkMode} />
                <MultiSelect label="Expected Salary" options={salaryOptions} selected={profile.expectedSalary} onToggle={toggleExpectedSalary} />
                <MultiSelect label="Notice Period" options={noticePeriodOptions} selected={profile.noticePeriod} onToggle={toggleNoticePeriod} />
              </div>
            ) : (
              <div className="grid gap-3 text-sm font-semibold text-slate-600">
                <p className="rounded-[7px] bg-slate-50 p-4">Preferred role: {profile.preferredRole}</p>
                <p className="rounded-[7px] bg-slate-50 p-4">Work mode: {profile.workMode.join(', ')}</p>
                <p className="rounded-[7px] bg-slate-50 p-4">Expected salary: {profile.expectedSalary.join(', ')}</p>
                <p className="rounded-[7px] bg-slate-50 p-4">Notice period: {profile.noticePeriod.join(', ')}</p>
              </div>
            )}
          </Panel>

          <Button className="w-full" to="/candidate-dashboard">Back to Dashboard</Button>
        </div>
      </div>
    </DashboardShell>
  )
}

function EditField({ datalist, label, onChange, type = 'text', value }) {
  return (
    <label>
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input className="mt-2 w-full rounded-[7px] border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" list={datalist} onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  )
}

function LocationSelector({ className = '', onCityChange, onCountryChange, onFullAddressChange, onScopeChange, onStateChange, profile }) {
  const countryOptions = profile.locationScope === 'India' ? [Country.getCountryByCode('IN')].filter(Boolean) : Country.getAllCountries()
  const stateOptions = getStateOptions(profile.countryCode)
  const cityOptions = getCityOptions(profile.countryCode, profile.stateCode)

  return (
    <div className={className}>
      <p className="text-sm font-bold text-slate-700">Location</p>
      <div className="mt-2 grid gap-3 rounded-[7px] bg-slate-50 p-3 md:grid-cols-4">
        <SelectField label="Region" onChange={onScopeChange} options={['India', 'International']} value={profile.locationScope} />
        <SelectField label="Country" onChange={onCountryChange} options={countryOptions.map((country) => ({ label: country.name, value: country.isoCode }))} value={profile.countryCode} />
        <SelectField label={profile.locationScope === 'India' ? 'State / UT' : 'State / Province'} onChange={onStateChange} options={stateOptions.map((state) => ({ label: state.name, value: state.isoCode }))} value={profile.stateCode} />
        <SelectField label="City" onChange={onCityChange} options={cityOptions.map((city) => ({ label: city.name, value: city.name }))} value={profile.city} />
        <label className="md:col-span-4">
          <span className="text-xs font-black uppercase tracking-wide text-slate-400">Full Address</span>
          <textarea
            className="mt-1 min-h-24 w-full resize-y rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500"
            onChange={(event) => onFullAddressChange(event.target.value)}
            placeholder="House/flat, street, landmark, area, PIN/ZIP code"
            value={profile.fullAddress}
          />
        </label>
      </div>
    </div>
  )
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label>
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <select className="mt-1 w-full rounded-[7px] border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => onChange(event.target.value)} value={value}>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { label: option, value: option } : option
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>
        })}
      </select>
    </label>
  )
}

function MultiSelect({ label, onToggle, options, selected }) {
  return (
    <div>
      <p className="text-sm font-bold text-slate-700">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option)
          return (
            <button
              className={`rounded-[7px] px-3 py-2 text-xs font-black transition ${
                active ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700'
              }`}
              key={option}
              onClick={() => onToggle(option)}
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

function getStateOptions(countryCode) {
  return State.getStatesOfCountry(countryCode || 'IN')
}

function getCityOptions(countryCode, stateCode) {
  return City.getCitiesOfState(countryCode || 'IN', stateCode || '')
}

function formatLocation(profile) {
  return [profile.city, profile.state, profile.country].filter(Boolean).join(', ')
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-[7px] bg-slate-50 p-4">
      <span className="grid h-11 w-11 place-items-center rounded-[7px] bg-white text-blue-600 ring-1 ring-slate-200">
        <Icon size={19} />
      </span>
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 font-bold text-slate-800">{value}</p>
      </div>
    </div>
  )
}

function getInitials(value) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
