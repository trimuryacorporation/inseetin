import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Quote, Star, UsersRound } from 'lucide-react'
import { api } from '../services/api'

export function TestimonialSlider() {
  const [active, setActive] = useState(0)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    api.listAll('testimonials', '?status=Active&sort=-featured,-createdAt')
      .then((payload) => {
        if (!mounted) return
        setItems(Array.isArray(payload.data) ? payload.data : [])
      })
      .catch(() => {
        if (mounted) setItems([])
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const testimonials = useMemo(() => items.filter((item) => item.name && item.text), [items])

  useEffect(() => {
    if (testimonials.length <= 1) return undefined

    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % testimonials.length)
    }, 4500)

    return () => window.clearInterval(timer)
  }, [testimonials.length])

  useEffect(() => {
    if (active >= testimonials.length) setActive(0)
  }, [active, testimonials.length])

  const dotStart = Math.max(0, Math.min(active - 3, testimonials.length - 7))
  const visibleTestimonials = testimonials.slice(dotStart, dotStart + 7)
  const item = testimonials[active]
  const averageRating = testimonials.length
    ? (testimonials.reduce((total, testimonial) => total + Number(testimonial.rating || 5), 0) / testimonials.length).toFixed(1)
    : '0.0'

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-600">Testimonials</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Trusted By Recruiters And Candidates
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-500">
            Real feedback from hiring teams and professionals using the platform.
          </p>
        </div>

        {loading ? (
          <div className="mx-auto h-80 max-w-4xl animate-pulse rounded-[7px] bg-slate-100" />
        ) : item ? (
          <div className="mx-auto max-w-5xl overflow-hidden rounded-[7px] border border-slate-200 bg-gradient-to-br from-blue-50 via-white to-teal-50 p-4 shadow-xl shadow-blue-100/60 sm:p-6">
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <TrustMetric label="Live testimonials" value={testimonials.length} />
              <TrustMetric label="Average rating" value={averageRating} />
              <TrustMetric label="Featured stories" value={testimonials.filter((testimonial) => testimonial.featured).length} />
            </div>

            <AnimatePresence mode="wait">
              <motion.article
                animate={{ opacity: 1, x: 0 }}
                className="rounded-[7px] border border-white bg-white/90 p-6 shadow-sm backdrop-blur sm:p-10"
                exit={{ opacity: 0, x: -40 }}
                initial={{ opacity: 0, x: 40 }}
                key={item._id || item.name}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                <div className="grid gap-6 lg:grid-cols-[auto_1fr] lg:items-start">
                  <div className="grid h-16 w-16 place-items-center rounded-[7px] bg-blue-600 text-xl font-black text-white shadow-lg shadow-blue-100">
                    {getInitials(item.name)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="inline-flex items-center gap-2 rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        <Quote size={14} /> {item.type || 'Candidate'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-amber-400">
                        {Array.from({ length: Number(item.rating || 5) }).map((_, index) => <Star fill="currentColor" key={index} size={16} />)}
                      </span>
                    </div>
                    <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-slate-700">"{item.text}"</p>
                    <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                      <div>
                        <p className="text-xl font-black text-slate-950">{item.name}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-500">{[item.role, item.company].filter(Boolean).join(' · ') || 'Platform user'}</p>
                      </div>
                      {item.featured && <span className="rounded-[7px] bg-teal-50 px-3 py-1 text-xs font-black text-teal-700">Featured review</span>}
                    </div>
                  </div>
                </div>
              </motion.article>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-center gap-2" aria-label="Testimonial navigation">
              <button type="button" aria-label="Previous testimonial" onClick={() => setActive(current => (current - 1 + testimonials.length) % testimonials.length)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={testimonials.length <= 1}><ChevronLeft size={18} /></button>
              {visibleTestimonials.map((testimonial, dotIndex) => {
                const index = dotStart + dotIndex
                return (
                <button
                  aria-label={`Show testimonial from ${testimonial.name}`}
                  aria-current={active === index ? 'true' : undefined}
                  className={`h-2.5 shrink-0 rounded-[7px] transition-all ${active === index ? 'w-8 bg-blue-600' : 'w-2.5 bg-slate-300 hover:bg-blue-300'}`}
                  key={testimonial._id || testimonial.name}
                  onClick={() => setActive(index)}
                  type="button"
                />
              )})}
              <button type="button" aria-label="Next testimonial" onClick={() => setActive(current => (current + 1) % testimonials.length)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-blue-700 transition hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600" disabled={testimonials.length <= 1}><ChevronRight size={18} /></button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl rounded-[7px] border border-dashed border-slate-300 bg-white p-10 text-center">
            <UsersRound className="mx-auto text-blue-500" size={36} />
            <h3 className="mt-4 text-2xl font-black text-slate-950">No testimonials published yet</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm font-semibold leading-6 text-slate-500">
              Reviews from our community will appear here once published.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function TrustMetric({ label, value }) {
  return (
    <div className="rounded-[7px] bg-white/85 p-4 text-center ring-1 ring-white">
      <p className="text-2xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function getInitials(name) {
  return String(name || 'User')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('') || 'U'
}
