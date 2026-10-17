import { useEffect, useState } from 'react'
import { Camera, Mail, MapPin, Phone } from 'lucide-react'
import { getStoredUser } from '../routes/authRouting'
import { api } from '../services/api'
import { DashboardShell, Panel } from './CandidateDashboard'
import { showMessageToast, showToast } from '../utils/toast'

export function RecruiterProfilePage() {
  const user = getStoredUser()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [employerId, setEmployerId] = useState('')
  const [profile, setProfile] = useState(() => ({
    name: user?.name || 'Recruiter',
    contactPerson: user?.name || '',
    email: user?.email || '',
    phone: '',
    location: 'India',
    industry: '',
    companySize: '',
    website: '',
    logo: '',
  }))
  const initials = profile.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const update = (key, value) => {
    setProfile((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  const notify = (text, type) => {
    setMessage('')
    if (text) showMessageToast(text, type ? { type } : {})
  }

  useEffect(() => {
    if (!user?.email) return

    api
      .list('employers', `?businessEmail=${encodeURIComponent(user.email)}&limit=1`)
      .then((payload) => {
        const employer = payload.data?.[0]
        if (!employer) return

        setEmployerId(employer._id || '')
        setProfile({
          name: employer.companyName || user.name || 'Recruiter',
          contactPerson: employer.contactPerson || user.name || '',
          email: employer.businessEmail || user.email,
          phone: employer.phone || user.phone || '',
          location: employer.location || 'India',
          industry: employer.industry || 'Recruitment',
          companySize: employer.companySize || '',
          website: employer.website || '',
          logo: employer.logo || employer.logoUrl || '',
        })
      })
      .catch(() => null)
  }, [user?.email])

  const save = async () => {
    if (!profile.name.trim() || !profile.email.trim()) {
      notify('Company name and business email are required.', 'error')
      return
    }

    setSaving(true)
    try {
      const body = {
        companyName: profile.name,
        contactPerson: profile.contactPerson,
        businessEmail: profile.email,
        phone: profile.phone,
        industry: profile.industry,
        companySize: profile.companySize,
        website: profile.website,
        location: profile.location,
        logo: profile.logo,
        logoUrl: profile.logo,
        status: 'Approved',
        verified: true,
      }
      const payload = employerId
        ? await api.update('employers', employerId, body)
        : await api.create('employers', body)
      const employer = payload.data
      setEmployerId(employer._id || employerId)
      setProfile({
        name: employer.companyName || profile.name,
        contactPerson: employer.contactPerson || profile.contactPerson,
        email: employer.businessEmail || profile.email,
        phone: employer.phone || profile.phone,
        location: employer.location || profile.location,
        industry: employer.industry || profile.industry,
        companySize: employer.companySize || profile.companySize,
        website: employer.website || profile.website,
        logo: employer.logo || employer.logoUrl || profile.logo,
      })

      const currentUser = getStoredUser()
      if (currentUser) {
        localStorage.setItem('authUser', JSON.stringify({
          ...currentUser,
          email: employer.businessEmail || profile.email,
          phone: employer.phone || profile.phone,
          companyName: employer.companyName || profile.name,
          contactPerson: employer.contactPerson || profile.contactPerson,
        }))
      }

      setEditing(false)
      notify('Recruiter profile saved successfully.', 'success')
    } catch (error) {
      notify(error.message || 'Recruiter profile save failed.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateLogo = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!String(file.type || '').startsWith('image/')) {
      notify('Only image upload is allowed for recruiter profile.', 'error')
      return
    }

    const data = new FormData()
    data.append('image', file)
    data.append('field', 'recruiter-logo')
    data.append('recruiterEmail', user?.email || profile.email || '')
    if (profile.logo) data.append('previousFileUrl', profile.logo)

    setLogoUploading(true)
    setMessage('')

    try {
      const payload = await api.uploadRecruiterProfileImageToSupaCloud(data)
      const url = payload.data?.url
      if (!url) {
        notify('Image uploaded, but public URL was not returned. Check Supa Cloud public bucket setting.', 'error')
        return
      }
      update('logo', url)
      showToast('Profile image uploaded. Click Save to update recruiter profile.', 'success')
    } catch (error) {
      notify(error.message || 'Recruiter profile image upload failed.', 'error')
    } finally {
      setLogoUploading(false)
      event.target.value = ''
    }
  }

  return (
    <DashboardShell title="Recruiter Profile" subtitle="Manage your recruiter identity, company details, contact information, and hiring workspace profile.">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Panel title="Profile Summary">
          <div className="mb-5 flex justify-end">
            {editing ? (
              <div className="flex gap-2">
                <button className="rounded-[7px] bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200" onClick={() => setEditing(false)} type="button">Cancel</button>
                <button className="rounded-[7px] bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={saving} onClick={save} type="button">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            ) : (
              <button className="rounded-[7px] bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700" onClick={() => setEditing(true)} type="button">Edit Profile</button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative">
              <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-[7px] bg-blue-600 text-2xl font-black text-white shadow-lg shadow-blue-100">
                {profile.logo ? <img alt={`${profile.name} logo`} className="h-full w-full object-cover" src={profile.logo} /> : initials}
              </span>
              {editing && (
                <label className="absolute -bottom-2 -right-2 grid h-10 w-10 cursor-pointer place-items-center rounded-[7px] bg-slate-950 text-white shadow-lg transition hover:bg-blue-600">
                  <Camera size={17} />
                  <input accept="image/*" className="hidden" disabled={logoUploading} onChange={updateLogo} type="file" />
                </label>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-950">{profile.name}</h2>
              <p className="mt-1 text-sm font-semibold text-blue-700">Recruiter</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{profile.contactPerson || 'Contact person not added'}</p>
              {editing && <p className="mt-2 text-xs font-bold text-slate-400">{logoUploading ? 'Uploading logo...' : 'Click camera icon to upload company logo'}</p>}
            </div>
          </div>
          <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-600">
            <p className="flex items-center gap-3 rounded-[7px] bg-slate-50 p-4">
              <Mail className="text-blue-600" size={18} />
              {profile.email}
            </p>
            <p className="flex items-center gap-3 rounded-[7px] bg-slate-50 p-4">
              <Phone className="text-blue-600" size={18} />
              {profile.phone || 'Not added'}
            </p>
            <p className="flex items-center gap-3 rounded-[7px] bg-slate-50 p-4">
              <MapPin className="text-blue-600" size={18} />
              {profile.location}
            </p>
          </div>
        </Panel>

        <div className="grid gap-6">
          <Panel title="Company Information">
            {editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <ProfileField label="Company name" onChange={(value) => update('name', value)} value={profile.name} />
                <ProfileField label="Contact person name" onChange={(value) => update('contactPerson', value)} value={profile.contactPerson} />
                <ProfileField label="Business email" onChange={(value) => update('email', value)} type="email" value={profile.email} />
                <ProfileField label="Phone" onChange={(value) => update('phone', value)} value={profile.phone} />
                <ProfileField label="Industry" onChange={(value) => update('industry', value)} value={profile.industry} />
                <ProfileField label="Company size" onChange={(value) => update('companySize', value)} value={profile.companySize} />
                <ProfileField label="Website" onChange={(value) => update('website', value)} value={profile.website} />
                <ProfileField className="md:col-span-2" label="Office location" onChange={(value) => update('location', value)} value={profile.location} />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <InfoItem label="Company name" value={profile.name} />
                <InfoItem label="Contact person" value={profile.contactPerson || 'Not added'} />
                <InfoItem label="Industry" value={profile.industry} />
                <InfoItem label="Company size" value={profile.companySize || 'Not added'} />
                <InfoItem label="Website" value={profile.website || 'Not added'} />
                <InfoItem label="Office location" value={profile.location} />
                <InfoItem label="Verification" value="Verified recruiter profile" />
              </div>
            )}
          </Panel>

        </div>
      </div>
    </DashboardShell>
  )
}

function ProfileField({ className = '', label, onChange, type = 'text', value }) {
  return (
    <label className={className}>
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</span>
      <input className="mt-2 w-full rounded-[7px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-blue-500" onChange={(event) => onChange(event.target.value)} type={type} value={value} />
    </label>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-[7px] bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-sm font-bold text-slate-800">{value}</p>
    </div>
  )
}
