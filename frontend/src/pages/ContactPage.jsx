import { useMemo, useState } from 'react'
import { ArrowRight, Building2, Headphones, Mail, MapPin, MessageCircle, Phone, Send, Share2, ShieldCheck, UserRound } from 'lucide-react'
import { SupportChatButton } from '../components/SupportChat'
import { getStoredUser } from '../routes/authRouting'
import { api } from '../services/api'
import { useSiteBranding } from '../utils/siteBranding'
import { useSocialMediaLinks } from '../utils/socialMediaLinks'

const initialForm = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

export function ContactPage() {
  const branding = useSiteBranding()
  const socialLinks = useSocialMediaLinks()
  const user = getStoredUser()
  const [form, setForm] = useState(() => ({
    ...initialForm,
    name: user?.name || '',
    email: user?.email || '',
  }))
  const [status, setStatus] = useState('')
  const [statusType, setStatusType] = useState('info')
  const [sending, setSending] = useState(false)

  const companyInfo = useMemo(() => ({
    address: branding.recruiterFooterLocation || '21 Career Avenue, New Delhi',
    phone: branding.tollFreeNumber || '+91 1800-123-4567',
    email: branding.recruiterEmail || 'support@inseet.in',
  }), [branding.recruiterEmail, branding.recruiterFooterLocation, branding.tollFreeNumber])

  const visibleSocialLinks = useMemo(() => {
    const dynamicLinks = socialLinks
      .filter((item) => item?.enabled !== false && item?.url)
      .slice(0, 4)

    return dynamicLinks.length ? dynamicLinks : [
      { label: 'Share', platform: 'Share', url: '' },
      { label: 'Telegram', platform: 'Telegram', url: '' },
      { label: 'Chat', platform: 'Chat', url: '' },
      { label: 'LinkedIn', platform: 'LinkedIn', url: '' },
    ]
  }, [socialLinks])

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
    if (status) setStatus('')
  }

  const submit = async (event) => {
    event.preventDefault()
    setSending(true)
    setStatus('')

    try {
      await api.create('support-messages', {
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || 'Contact page message',
        message: form.message.trim(),
        role: user?.role || 'Guest',
        source: 'contact-page',
      })
      setStatusType('success')
      setStatus('Message sent successfully. Our team will contact you shortly.')
      setForm({ ...initialForm, name: user?.name || '', email: user?.email || '' })
    } catch (error) {
      setStatusType('error')
      setStatus(error.message || 'Message could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.98fr_1fr]">
        <div className="rounded-[8px] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-9">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-4 py-2 text-xs font-black text-[#ff5b00]">
            <Send size={14} /> Get In Touch
          </span>
          <h1 className="mt-5 text-4xl font-black leading-tight text-[#00113d] sm:text-5xl">Contact Us</h1>
          <span className="mt-4 block h-0.5 w-10 rounded-full bg-[#ff5b00]" />
          <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-slate-500">
            We're here to help! Talk to our team about hiring, partnerships, or candidate support.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={submit}>
            <ContactField icon={UserRound} onChange={(event) => update('name', event.target.value)} placeholder="Your Full Name" required value={form.name} />
            <ContactField icon={Mail} onChange={(event) => update('email', event.target.value)} placeholder="Email Address" required type="email" value={form.email} />
            <ContactField icon={ShieldCheck} onChange={(event) => update('subject', event.target.value)} placeholder="Subject" required value={form.subject} />
            <ContactField as="textarea" icon={MessageCircle} onChange={(event) => update('message', event.target.value)} placeholder="Your Message" required value={form.message} />

            {status && (
              <p className={`rounded-[7px] px-4 py-3 text-sm font-bold ${statusType === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
                {status}
              </p>
            )}

            <button className="inline-flex min-h-14 items-center justify-center gap-3 rounded-[7px] bg-[#ff5b00] px-6 text-sm font-black text-white shadow-xl shadow-orange-100 transition hover:-translate-y-0.5 hover:bg-[#ef5200] disabled:cursor-not-allowed disabled:opacity-70" disabled={sending} type="submit">
              <Send size={18} /> {sending ? 'Sending...' : 'Send Message'}
            </button>
          </form>

          <div className="mt-6 flex items-start gap-4 rounded-[7px] bg-slate-50 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-orange-50 text-[#ff5b00]">
              <ShieldCheck size={21} />
            </span>
            <div>
              <p className="text-sm font-black text-[#00113d]">Your information is safe with us.</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">We never share your details.</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[8px] border border-slate-200/70 bg-white p-6 shadow-xl shadow-slate-200/60 sm:p-8">
            <div className="flex items-start gap-5">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[8px] bg-orange-50 text-[#ff5b00]">
                <Building2 size={29} />
              </span>
              <div>
                <h2 className="text-2xl font-black text-[#00113d]">Company Info</h2>
                <span className="mt-4 block h-0.5 w-12 rounded-full bg-[#ff5b00]" />
              </div>
            </div>

            <div className="mt-8 grid gap-7 text-sm font-semibold text-[#00113d]">
              <InfoLine icon={MapPin} value={companyInfo.address} />
              <InfoLine icon={Phone} value={companyInfo.phone} />
              <InfoLine icon={Mail} value={companyInfo.email} />
            </div>

            <div className="mt-8 border-t border-slate-200 pt-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-black text-[#00113d]">Connect with us</p>
                <div className="flex flex-wrap gap-4">
                  {visibleSocialLinks.map((item, index) => <SocialButton item={item} key={`${item.platform}-${index}`} />)}
                </div>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[8px] bg-[#006eea] p-7 text-white shadow-xl shadow-blue-200/70 sm:p-9">
            <div className="absolute right-8 top-8 grid grid-cols-5 gap-2 opacity-20">
              {Array.from({ length: 25 }).map((_, index) => <span className="h-1 w-1 rounded-full bg-white" key={index} />)}
            </div>
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center">
              <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-white text-[#006eea] shadow-lg shadow-blue-950/10">
                <Headphones size={42} />
              </span>
              <div>
                <h2 className="text-2xl font-black">Need hiring support?</h2>
                <p className="mt-3 max-w-md text-sm font-semibold leading-7 text-blue-50">
                  Our support team can help candidates and recruiters with onboarding, listings, and applications.
                </p>
                <SupportChatButton className="mt-6 !bg-white !text-[#0057B8] shadow-lg shadow-blue-950/10 hover:!bg-blue-50" variant="secondary">
                  Contact Support <ArrowRight size={17} />
                </SupportChatButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function ContactField({ as = 'input', icon: Icon, ...props }) {
  const Input = as
  return (
    <label className="flex items-start gap-4 rounded-[7px] border border-slate-200 bg-white px-4 py-4 text-slate-500 transition focus-within:border-blue-200 focus-within:ring-4 focus-within:ring-blue-50">
      <Icon className="mt-0.5 shrink-0 text-[#53617f]" size={18} />
      <Input className={`${as === 'textarea' ? 'min-h-28 resize-y' : 'h-6'} w-full bg-transparent text-sm font-semibold text-[#00113d] outline-none placeholder:text-[#53617f]`} {...props} />
    </label>
  )
}

function InfoLine({ icon: Icon, value }) {
  return (
    <p className="flex items-center gap-5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-50 text-[#ff5b00]">
        <Icon size={18} />
      </span>
      <span>{value}</span>
    </p>
  )
}

function SocialButton({ item }) {
  const platform = String(item.platform || item.label || '').toLowerCase()
  const content = platform.includes('telegram') ? <Send size={22} />
    : platform.includes('chat') || platform.includes('whatsapp') ? <MessageCircle size={22} />
      : platform.includes('linkedin') ? <span className="text-xl font-black lowercase">in</span> : <Share2 size={22} />
  const className = 'grid h-14 w-14 place-items-center rounded-[7px] border border-slate-200 bg-white text-[#006eea] shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50'

  if (item.url) {
    return (
      <a aria-label={item.label || item.platform || 'Social link'} className={className} href={item.url} rel="noreferrer" target="_blank">
        {content}
      </a>
    )
  }

  return (
    <span aria-label={item.label || item.platform || 'Social link'} className={className} role="img">
      {content}
    </span>
  )
}
