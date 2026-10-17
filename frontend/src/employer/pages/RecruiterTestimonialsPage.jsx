import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, MapPin, Play, Rocket, Star, X } from 'lucide-react'
import { Button } from '../../components/Button'
import { api } from '../../services/api'
import femaleRecruiterImage from '../../assets/recruiter-female-single.png'

export function RecruiterTestimonialsPage() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVideo, setActiveVideo] = useState(null)

  useEffect(() => {
    let mounted = true
    api
      .videoTestimonials()
      .then((payload) => {
        if (!mounted) return
        setVideos(Array.isArray(payload.data) ? payload.data.filter((item) => item.companyName) : [])
      })
      .catch(() => {
        if (mounted) setVideos([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const visibleVideos = useMemo(() => videos.map((item, index) => ({
    ...item,
    quote: item.quote || item.message || item.description || '',
    duration: item.duration || item.videoDuration || '',
    tone: item.tone || (index % 2 ? 'orange' : 'blue'),
  })), [videos])

  return (
    <main className="overflow-hidden bg-[#f8fbff]">
      <section className="relative min-h-[calc(100vh-80px)] py-10 sm:py-12">
        <div className="pointer-events-none absolute left-10 top-28 hidden h-24 w-28 bg-[radial-gradient(circle,#0b5cff_1.5px,transparent_1.5px)] bg-[length:20px_20px] opacity-25 lg:block" />
        <div className="pointer-events-none absolute right-10 top-[420px] hidden h-28 w-28 bg-[radial-gradient(circle,#ff8a00_1.5px,transparent_1.5px)] bg-[length:20px_20px] opacity-20 lg:block" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative mx-auto mb-7 max-w-4xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full bg-[#e9f1ff] px-5 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0b5cff] sm:text-sm">
              <Star size={16} fill="currentColor" />
              Trusted By Leading Companies
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-[#061333] sm:text-4xl lg:text-5xl">
              Why Companies Choose Us
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-slate-600 sm:text-lg">
              Hear from organizations that have transformed their hiring experience with INSEET.
            </p>
          </div>

          <div className="absolute right-8 top-12 hidden items-center gap-4 lg:flex">
            <button className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 bg-white text-[#061333] shadow-lg shadow-slate-200/80 transition hover:border-[#0b5cff] hover:text-[#0b5cff]" type="button" aria-label="Previous video testimonial">
              <ArrowLeft size={22} />
            </button>
            <button className="grid h-12 w-12 place-items-center rounded-full bg-[#0b5cff] text-white shadow-lg shadow-blue-200 transition hover:bg-[#0046d6]" type="button" aria-label="Next video testimonial">
              <ArrowRight size={22} />
            </button>
          </div>

          {loading ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {[1, 2].map((item) => <div className="h-[385px] animate-pulse rounded-[8px] bg-white shadow-xl shadow-slate-200/70" key={item} />)}
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              {visibleVideos.map((item) => <VideoCard item={item} key={item._id || item.companyName} onPlay={() => setActiveVideo(item)} />)}
            </div>
          )}

          <div className="mt-8 text-center">
            <Button className="recruiter-video-testimonial-btn min-h-11 px-8 shadow-lg ring-0" to="/recruiter" variant="secondary">
              <ArrowLeft size={18} />
              Back To Recruiter Page
            </Button>
          </div>

          <div className="relative mt-9 min-h-[150px] overflow-hidden rounded-[8px] bg-gradient-to-r from-[#0758e7] via-[#2456c6] to-[#ff7a00] px-6 py-7 text-white shadow-xl shadow-blue-200/60 sm:px-10">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[40%] bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.28),transparent_32%)] lg:block" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-40 bg-[radial-gradient(circle,rgba(255,255,255,0.18)_1.5px,transparent_1.5px)] bg-[length:18px_18px] opacity-60" />
            <img
              className="pointer-events-none absolute bottom-0 right-2 hidden max-h-[185px] w-auto object-contain lg:block"
              src={femaleRecruiterImage}
              alt=""
              aria-hidden="true"
            />
            <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between lg:pr-[260px]">
              <div className="flex min-w-0 items-center gap-5">
                <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15">
                  <Rocket size={38} fill="currentColor" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Start Hiring Smarter Today</h2>
                  <p className="mt-2 max-w-xl text-base font-medium leading-7 text-blue-50">
                    Post jobs, connect with skilled professionals, and grow your team faster.
                  </p>
                </div>
              </div>
              <Button className="recruiter-cta-primary-btn min-h-14 shrink-0 px-8 shadow-xl ring-0" to="/recruiter-register" variant="secondary">
                Post Your First Job
                <ArrowRight size={22} />
              </Button>
            </div>
          </div>
        </div>

        {activeVideo && <VideoTestimonialModal item={activeVideo} onClose={() => setActiveVideo(null)} />}
      </section>
    </main>
  )
}

function VideoCard({ item, onPlay }) {
  const tone = getVideoTone(item.tone)

  return (
    <article className={`overflow-hidden rounded-[8px] border border-slate-100 bg-white shadow-xl shadow-slate-200/70 ${tone.border}`}>
      <button className="relative block h-[210px] w-full overflow-hidden bg-slate-900 text-left sm:h-[230px]" onClick={onPlay} type="button">
        {item.thumbnailUrl ? (
          <img className="h-full w-full object-cover" src={item.thumbnailUrl} alt={`${item.companyName} video testimonial`} />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${tone.fallback}`} />
        )}
        <div className="absolute inset-0 bg-slate-950/30" />
        <div className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-slate-950/55 px-3 py-2 text-sm font-black text-white shadow backdrop-blur">
          <Play size={14} fill="currentColor" />
          {item.duration || '02:45'}
        </div>
        <span className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white shadow-xl shadow-slate-950/20">
          <Play className={tone.text} size={32} fill="currentColor" />
        </span>
      </button>
      <div className="px-6 py-5">
        <h3 className="text-xl font-black text-[#061333]">{item.companyName}</h3>
        <p className="mt-2 text-base font-medium leading-7 text-slate-600">"{item.quote}"</p>
        <p className={`mt-4 flex items-center gap-2 text-sm font-black ${tone.text}`}>
          <MapPin size={17} fill="currentColor" />
          <span className="text-slate-600">{item.location}</span>
        </p>
      </div>
    </article>
  )
}

function VideoTestimonialModal({ item, onClose }) {
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[8px] bg-white shadow-2xl">
        <button className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-white text-slate-600 shadow ring-1 ring-slate-200 hover:text-[#ff8a00]" onClick={onClose} type="button" aria-label="Close video testimonial">
          <X size={20} />
        </button>
        <div className="aspect-video bg-slate-950">
          {item.videoUrl ? (
            <iframe
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
              src={normalizeVideoEmbedUrl(item.videoUrl)}
              title={`${item.companyName} video testimonial`}
            />
          ) : (
            <div className="grid h-full place-items-center p-8 text-center text-white">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ff8a00]">
                  <Play className="ml-1" size={28} fill="currentColor" />
                </div>
                <h3 className="mt-5 text-2xl font-black">{item.companyName}</h3>
                <p className="mt-2 text-sm text-slate-300">Video URL backend mein add karte hi yahan play hoga.</p>
              </div>
            </div>
          )}
        </div>
        <div className="p-5">
          <h3 className="text-xl font-semibold text-slate-900">{item.companyName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">"{item.quote}"</p>
          <p className="mt-2 text-sm font-semibold text-[#ff6a00]">{item.location}</p>
        </div>
      </div>
    </div>
  )
}

function getVideoTone(tone = 'blue') {
  const tones = {
    amber: {
      border: 'border-b-4 border-b-[#ff8a00]',
      fallback: 'from-zinc-900 via-amber-950 to-zinc-800',
      text: 'text-[#ff6a00]',
    },
    blue: {
      border: 'border-b-4 border-b-[#0b5cff]',
      fallback: 'from-slate-900 via-blue-950 to-slate-950',
      text: 'text-[#0b5cff]',
    },
    orange: {
      border: 'border-b-4 border-b-[#ff6a00]',
      fallback: 'from-stone-950 via-stone-700 to-orange-950',
      text: 'text-[#ff6a00]',
    },
    slate: {
      border: 'border-b-4 border-b-[#0b5cff]',
      fallback: 'from-slate-950 via-slate-800 to-blue-950',
      text: 'text-[#0b5cff]',
    },
    stone: {
      border: 'border-b-4 border-b-[#ff6a00]',
      fallback: 'from-stone-950 via-stone-700 to-stone-900',
      text: 'text-[#ff6a00]',
    },
  }
  return tones[tone] || tones.blue
}

function normalizeVideoEmbedUrl(url = '') {
  if (url.includes('youtube.com/embed/')) return appendVideoParams(url)
  const youtubeMatch = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=|youtube\.com\/shorts\/)([^&?/]+)/)
  if (youtubeMatch?.[1]) return `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`
  return url
}

function appendVideoParams(url = '') {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}autoplay=1&rel=0`
}
