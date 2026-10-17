import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, BriefcaseBusiness, MapPin, Search } from 'lucide-react'
import { Button } from './Button'

export function SearchBar({ compact = false }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [keyword, setKeyword] = useState(searchParams.get('q') || '')
  const [location, setLocation] = useState(searchParams.get('location') || '')
  const [jobType, setJobType] = useState(searchParams.get('type') || '')

  const submit = (event) => {
    event.preventDefault()
    const params = new URLSearchParams()
    if (keyword.trim()) params.set('q', keyword.trim())
    if (location.trim()) params.set('location', location.trim())
    if (jobType) params.set('type', jobType)
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ''}`)
  }

  return (
    <form className={`w-full max-w-full overflow-hidden rounded-[7px] border border-slate-200 bg-white p-1.5 ring-1 ring-white/70 sm:p-2 ${compact ? 'shadow-sm' : 'shadow-lg shadow-blue-100/60 sm:shadow-2xl'}`} onSubmit={submit}>
      <div className={`grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-1 ${compact ? 'md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_190px_190px_auto]' : 'md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_180px_190px_auto]'}`}>
        <label className="col-span-2 flex min-h-11 min-w-0 items-center gap-2 rounded-[7px] bg-slate-50 px-3 text-slate-500 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-blue-200 sm:col-span-1 sm:min-h-14 sm:gap-3 sm:px-4">
          <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-[7px] bg-white text-blue-600 shadow-sm ring-1 ring-slate-100 sm:grid">
            <Search size={19} />
          </span>
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="Job title, skill, or company" placeholder="Job title, skill, or company"
            value={keyword}
          />
        </label>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-[7px] bg-slate-50 px-3 text-slate-500 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-blue-200 sm:flex sm:min-h-14 sm:gap-3 sm:px-4">
          <MapPin className="hidden shrink-0 text-[#0057B8] sm:block" size={19} />
          <input
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400"
            onChange={(event) => setLocation(event.target.value)}
            aria-label="City" placeholder="City"
            value={location}
          />
        </label>
        <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-[7px] bg-slate-50 px-3 text-slate-500 ring-1 ring-transparent transition focus-within:bg-white focus-within:ring-blue-200 sm:flex sm:min-h-14 sm:gap-3 sm:px-4">
          <BriefcaseBusiness className="hidden shrink-0 text-teal-600 sm:block" size={19} />
          <select aria-label="Job type" className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-slate-800 outline-none" onChange={(event) => setJobType(event.target.value)} value={jobType}>
            <option value="">All job types</option>
            <option value="Full Time">Full Time</option>
            <option value="Part Time">Part Time</option>
            <option value="Contract">Contract</option>
            <option value="Freelance">Freelance</option>
          </select>
        </label>
        <Button className="col-span-2 min-h-11 min-w-0 whitespace-nowrap px-3 text-sm sm:col-span-1 sm:min-h-14 sm:px-7" type="submit">
          Find Jobs <ArrowRight size={18} />
        </Button>
      </div>
    </form>
  )
}
