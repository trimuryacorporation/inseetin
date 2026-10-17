import { useMemo, useState } from 'react'
import { Clock3, MapPin, Search, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { JobCard } from '../components/JobCard'
import { SearchBar } from '../components/SearchBar'
import { EmptyState } from '../components/PortalUI'
import { useApiResource } from '../hooks/useApiResource'
import { api } from '../services/api'
import { formatStateCountryLocation } from '../utils/locationDisplay'
import jobsHeroCandidateImage from '../assets/jobs-hero-candidate-clean.png'

const filterConfig = [
  { key: 'location', label: 'Location', field: 'locationState' },
  { key: 'typeFilter', label: 'Job Type', field: 'type', fixedValues: ['Full Time', 'Part Time'] },
  { key: 'workMode', label: 'Work Mode', field: 'workMode', fixedValues: ['Remote', 'Hybrid', 'Office'] },
  { key: 'skills', label: 'Skills', field: 'skills', array: true },
  { key: 'department', label: 'Department', field: 'department' },
]

const salaryBands = [
  { label: '0-3 Lakhs', min: 0, max: 3 },
  { label: '3-6 Lakhs', min: 3, max: 6 },
  { label: '6-10 Lakhs', min: 6, max: 10 },
  { label: '10-15 Lakhs', min: 10, max: 15 },
  { label: '15-25 Lakhs', min: 15, max: 25 },
  { label: '25+ Lakhs', min: 25, max: Infinity },
]

const workModeToWfhType = {
  Office: '0',
  Remote: '2',
  Hybrid: '3',
}

const wfhTypeToWorkMode = Object.entries(workModeToWfhType).reduce((map, [label, value]) => {
  map[value] = label
  return map
}, {})

export function JobsPage({ onApply }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false)
  const [departmentSearch, setDepartmentSearch] = useState('')
  const [departmentDraft, setDepartmentDraft] = useState([])
  const [skillsModalOpen, setSkillsModalOpen] = useState(false)
  const [skillsSearch, setSkillsSearch] = useState('')
  const [skillsDraft, setSkillsDraft] = useState([])
  const [locationModalOpen, setLocationModalOpen] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationDraft, setLocationDraft] = useState([])
  const [salaryModalOpen, setSalaryModalOpen] = useState(false)
  const [salaryDraft, setSalaryDraft] = useState([])
  const { data: apiJobs, loading, error } = useApiResource(() => api.jobListings('?sort=-createdAt'), [], [])
  const rawList = Array.isArray(apiJobs) ? apiJobs : apiJobs?.data || []
  const normalizedJobs = useMemo(() => rawList.map(normalizeJob), [rawList])
  const dynamicFilters = useMemo(() => buildDynamicFilters(normalizedJobs), [normalizedJobs])
  const keyword = (searchParams.get('q') || '').trim().toLowerCase()
  const selectedType = (searchParams.get('type') || '').trim().toLowerCase()
  const selectedExperienceMax = Number(searchParams.get('experience') || searchParams.get('experienceMax') || 0)
  const selectedSalaryBands = useMemo(() => getParamList(searchParams, 'salaryBand'), [searchParams])
  const departmentFilter = dynamicFilters.find((filter) => filter.key === 'department') || { values: [], counts: {} }
  const selectedFilters = useMemo(() => getSelectedFilters(searchParams, departmentFilter.values), [searchParams, departmentFilter.values])

  const list = normalizedJobs.filter((job) => {
    const haystack = [
      job.title,
      job.company,
      job.department,
      job.industry,
      job.description,
      ...job.skills,
    ].filter(Boolean).join(' ').toLowerCase()
    const jobType = String(job.type || '').toLowerCase()

    return (!keyword || haystack.includes(keyword))
      && (!selectedType || jobType === selectedType)
      && (!selectedExperienceMax || getExperienceMin(job.experience) <= selectedExperienceMax)
      && (!selectedSalaryBands.length || matchesSalaryBands(job.salary, selectedSalaryBands))
      && matchesAdvancedFilters(job, selectedFilters)
  })
  const activeFilterCount = Object.values(selectedFilters).reduce((total, values) => total + values.length, 0) + Number(Boolean(selectedExperienceMax)) + selectedSalaryBands.length
  const hasSearch = Boolean(keyword || selectedType || selectedExperienceMax || selectedSalaryBands.length || activeFilterCount)

  const setSingleFilter = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (key === 'experienceMax') {
      if (value) params.set('experience', value)
      else params.delete('experience')
      params.delete('experienceMax')
    } else if (key === 'workMode') {
      params.delete('workMode')
      params.delete('wfhType')
      if (value) params.set('wfhType', workModeToWfhType[value] || value)
      syncClusterParam(params)
    } else if (key === 'department') {
      params.delete('department')
      params.delete('functionAreaIdGid')
      if (value) params.append('functionAreaIdGid', getDepartmentId(value, departmentFilter.values))
      syncClusterParam(params)
    } else if (value) params.set(key, value)
    else params.delete(key)

    setSearchParams(params)
  }

  const setMultiFilter = (key, values) => {
    const params = new URLSearchParams(searchParams)
    const nextValues = values.map((value) => value.trim()).filter(Boolean)
    if (key === 'department') {
      params.delete('department')
      params.delete('functionAreaIdGid')
      nextValues.forEach((value) => params.append('functionAreaIdGid', getDepartmentId(value, departmentFilter.values)))
      syncClusterParam(params)
    } else if (nextValues.length) params.set(key, nextValues.join('|'))
    else params.delete(key)
    setSearchParams(params)
  }

  const openDepartmentModal = () => {
    setDepartmentDraft(selectedFilters.department || [])
    setDepartmentSearch('')
    setDepartmentModalOpen(true)
  }

  const openSkillsModal = () => {
    setSkillsDraft(selectedFilters.skills || [])
    setSkillsSearch('')
    setSkillsModalOpen(true)
  }

  const openLocationModal = () => {
    setLocationDraft(selectedFilters.location || [])
    setLocationSearch('')
    setLocationModalOpen(true)
  }

  const openSalaryModal = () => {
    setSalaryDraft(selectedSalaryBands)
    setSalaryModalOpen(true)
  }

  const clearFilters = () => {
    const params = new URLSearchParams(searchParams)
    filterConfig.forEach((filter) => params.delete(filter.key))
    params.delete('experience')
    params.delete('experienceMax')
    params.delete('salaryBand')
    params.delete('wfhType')
    params.delete('functionAreaIdGid')
    params.delete('clusters')
    setSearchParams(params)
  }

  const salaryBandCounts = useMemo(() => buildSalaryBandCounts(normalizedJobs), [normalizedJobs])
  const urgentCount = normalizedJobs.filter((job) => job.urgent).length
  const activeChips = buildActiveChips(selectedFilters, selectedSalaryBands, selectedExperienceMax)

  return (
    <section className="w-full max-w-full overflow-x-hidden bg-[#f6f9fc] py-6 sm:py-10">
      <div className="w-full max-w-full px-4 sm:mx-auto sm:max-w-7xl sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[7px] border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef7ff_58%,#fff4e8_100%)] shadow-sm">
          <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff8a00]">Verified jobs network</p>
              <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight text-slate-950 sm:text-5xl">
                Find trusted jobs from active recruiters.
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
                Search fresh openings, compare salary and location, and apply with your candidate profile.
              </p>
              <div className="mt-6 overflow-hidden rounded-[7px] border border-slate-200 bg-[white] p-3 shadow-sm">
                <SearchBar compact />
              </div>
            </div>
            <div className="relative min-h-[270px] overflow-hidden rounded-[7px]">
              <img
                alt="Candidate searching jobs on laptop"
                className="absolute inset-0 h-full w-full object-cover object-center"
                src={jobsHeroCandidateImage}
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

        <div className="mt-6 grid w-full max-w-full gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden h-fit rounded-[7px] border border-slate-200 bg-[white] shadow-sm lg:sticky lg:top-20 lg:block">
            <div className="border-b border-slate-100 p-5">
              <div className="inline-flex items-center justify-center gap-2 text-base font-black text-slate-950">
                <SlidersHorizontal className="text-[#ff8a00]" size={20} />
                Filters
              </div>
              <p className="mt-1 text-xs font-bold text-slate-500">{activeFilterCount} active filters</p>
            </div>
            <div className="grid gap-0 p-4">
              {activeFilterCount > 0 && (
                <button className="mb-2 ml-auto inline-flex min-h-8 items-center justify-center gap-1 rounded-[7px] px-2 text-sm font-bold text-[#008bdc] shadow-none transition hover:text-[#006fac]" onClick={clearFilters} type="button">
                  <X size={16} /> Clear all filters
                </button>
              )}
              <div className="grid gap-0">
                <RangeFilter
                  label="Experience"
                  max={30}
                  minLabel="0 Yrs"
                  onChange={(value) => setSingleFilter('experienceMax', value ? String(value) : '')}
                  step={1}
                  suffix="Yrs"
                  value={selectedExperienceMax || 0}
                />
                <SalaryFilter
                  counts={salaryBandCounts}
                  onViewMore={openSalaryModal}
                  selectedValues={selectedSalaryBands}
                />
                <ModalOnlyFilter
                  allLabel="All locations"
                  filter={dynamicFilters.find((item) => item.key === 'location') || { key: 'location', label: 'Location', values: [], counts: {} }}
                  onViewMore={openLocationModal}
                  selectedValues={selectedFilters.location || []}
                />
                <ExpandedFilter
                  allLabel="All skills"
                  filter={dynamicFilters.find((item) => item.key === 'skills') || { key: 'skills', label: 'Skills', values: [], counts: {} }}
                  onChange={(value) => setSingleFilter('skills', value)}
                  onViewMore={openSkillsModal}
                  value={selectedFilters.skills?.[0] || ''}
                />
                <DepartmentFilter
                  filter={departmentFilter}
                  onChange={(value) => setSingleFilter('department', value)}
                  onViewMore={openDepartmentModal}
                  value={selectedFilters.department?.[0] || ''}
                />
                {['workMode', 'typeFilter'].map((key) => {
                  const filter = dynamicFilters.find((item) => item.key === key) || { key, label: key, values: [] }
                  return (
                    <FilterSelect
                      allLabel={key === 'workMode' ? 'All mode' : 'All type'}
                      key={key}
                      filter={filter}
                      onChange={(value) => setSingleFilter(key, value)}
                      value={selectedFilters[key]?.[0] || ''}
                    />
                  )
                })}
              </div>

            </div>
          </aside>

          <div className="min-w-0">
            <div className="mb-4 rounded-[7px] border border-slate-200 bg-[white] p-4 shadow-sm">
              <div className="flex w-full max-w-full items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-950 sm:text-base">Recommended Jobs</p>
                  <p className="mt-1 min-w-0 truncate text-xs font-semibold text-slate-500">
                    {list.length} jobs found{hasSearch ? ' for your search' : ''}
                  </p>
                </div>
                <select className="w-36 shrink-0 rounded-[7px] border border-slate-200 bg-[white] px-2 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-[#ff8a00] sm:w-auto sm:px-4 sm:text-sm">
                  <option>Sort by relevance</option>
                  <option>Sort by newest</option>
                  <option>Sort by salary</option>
                  <option>Sort by featured</option>
                </select>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {activeChips.length ? activeChips.map((chip) => (
                  <span className="rounded-[7px] bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100" key={chip}>{chip}</span>
                )) : (
                  <>
                    <span className="inline-flex items-center gap-1 rounded-[7px] bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-100"><Sparkles size={13} /> {urgentCount} urgent</span>
                    <span className="inline-flex items-center gap-1 rounded-[7px] bg-orange-50 px-3 py-1 text-xs font-black text-orange-700 ring-1 ring-orange-100"><Clock3 size={13} /> Fresh listings</span>
                    <span className="inline-flex items-center gap-1 rounded-[7px] bg-slate-100 px-3 py-1 text-xs font-black text-slate-600"><MapPin size={13} /> Pan India</span>
                  </>
                )}
                {activeFilterCount > 0 && (
                  <button className="rounded-[7px] bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 hover:bg-blue-50 hover:text-blue-700 lg:hidden" onClick={clearFilters} type="button">
                    Clear filters
                  </button>
                )}
              </div>
            </div>
            {loading ? <p role="status" className="rounded-lg bg-white p-6 text-slate-500">Loading jobs...</p> : error ? <p role="alert" className="rounded-lg bg-rose-50 p-6 text-rose-700">{error}</p> : list.length ? (
              <div className="grid w-full max-w-full grid-cols-1 gap-4">
                {list.map((job, index) => <JobCard denseMobile index={index + 1} job={job} key={job._id || job.id} onApply={onApply} premiumList />)}
              </div>
            ) : (
              <div className="mt-8"><EmptyState /></div>
            )}
          </div>
        </div>
      </div>
      {departmentModalOpen && (
        <DepartmentModal
          draft={departmentDraft}
          filter={dynamicFilters.find((item) => item.key === 'department') || { key: 'department', label: 'Department', values: [], counts: {} }}
          onApply={() => {
            setMultiFilter('department', departmentDraft)
            setDepartmentModalOpen(false)
          }}
          onClose={() => setDepartmentModalOpen(false)}
          onSearch={setDepartmentSearch}
          onToggle={(department) => {
            setDepartmentDraft((current) => (
              current.includes(department)
                ? current.filter((item) => item !== department)
                : [...current, department]
            ))
          }}
          search={departmentSearch}
        />
      )}
      {skillsModalOpen && (
        <FilterModal
          draft={skillsDraft}
          filter={dynamicFilters.find((item) => item.key === 'skills') || { key: 'skills', label: 'Skills', values: [], counts: {} }}
          onApply={() => {
            setMultiFilter('skills', skillsDraft)
            setSkillsModalOpen(false)
          }}
          onClose={() => setSkillsModalOpen(false)}
          onSearch={setSkillsSearch}
          onToggle={(skill) => {
            setSkillsDraft((current) => (
              current.includes(skill)
                ? current.filter((item) => item !== skill)
                : [...current, skill]
            ))
          }}
          search={skillsSearch}
          searchPlaceholder="Search Skills"
        />
      )}
      {locationModalOpen && (
        <FilterModal
          draft={locationDraft}
          filter={dynamicFilters.find((item) => item.key === 'location') || { key: 'location', label: 'Location', values: [], counts: {} }}
          onApply={() => {
            setMultiFilter('location', locationDraft)
            setLocationModalOpen(false)
          }}
          onClose={() => setLocationModalOpen(false)}
          onSearch={setLocationSearch}
          onToggle={(location) => {
            setLocationDraft((current) => (
              current.includes(location)
                ? current.filter((item) => item !== location)
                : [...current, location]
            ))
          }}
          search={locationSearch}
          searchPlaceholder="Search Location"
        />
      )}
      {salaryModalOpen && (
        <FilterModal
          draft={salaryDraft}
          filter={{ key: 'salaryBand', label: 'Salary', values: salaryBands.map((band) => band.label), counts: salaryBandCounts }}
          onApply={() => {
            setMultiFilter('salaryBand', salaryDraft)
            setSalaryModalOpen(false)
          }}
          onClose={() => setSalaryModalOpen(false)}
          onSearch={() => {}}
          onToggle={(salary) => {
            setSalaryDraft((current) => (
              current.includes(salary)
                ? current.filter((item) => item !== salary)
                : [...current, salary]
            ))
          }}
          search=""
          searchPlaceholder="Search Salary"
          showSearch={false}
        />
      )}
    </section>
  )
}

function FilterSelect({ allLabel, filter, onChange, value }) {
  return (
    <label className="grid gap-2 border-b border-slate-100 px-2 py-3 last:border-b-0">
      <span className="text-sm font-black text-slate-900">{filter.label}</span>
      <select
        className="min-h-10 rounded-[7px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{allLabel || `All ${filter.label.toLowerCase()}`}</option>
        {filter.values.map((option) => (
          <option key={option} value={option}>{option} ({filter.counts[option]})</option>
        ))}
      </select>
    </label>
  )
}

function CheckboxFilter({ filter, onChange, selectedValue }) {
  return (
    <div className="grid gap-2 border-t border-slate-100 pt-4">
      <span className="text-sm font-black text-slate-800">{filter.label}</span>
      <div className="grid gap-2">
        {filter.values.slice(0, 6).map((option) => {
          const checked = selectedValue === option
          return (
            <label className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600" key={option}>
              <input checked={checked} className="h-4 w-4 rounded-[4px] border-slate-300 accent-blue-600" onChange={() => onChange(option)} type="checkbox" />
              <span className="min-w-0 truncate">{option}</span>
              <span className="ml-auto text-slate-400">({filter.counts[option] || 0})</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function RangeFilter({ label, max, minLabel, onChange, step, suffix, value }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-2 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-slate-900">{label}</span>
        <span className="rounded-[7px] bg-blue-50 px-2.5 py-1 text-xs font-black text-[#0057B8] ring-1 ring-blue-100">{value || max} {suffix}</span>
      </div>
      <div className="rounded-[7px] bg-slate-50 px-3 py-3 ring-1 ring-slate-100">
        <input
          className="w-full cursor-pointer accent-[#0057B8]"
          max={max}
          min="0"
          onChange={(event) => onChange(Number(event.target.value))}
          step={step}
          type="range"
          value={value || max}
        />
      </div>
      <div className="flex items-center justify-between text-xs font-bold text-slate-500">
        <span>{minLabel}</span>
        <span>{value || max} {suffix}</span>
      </div>
    </div>
  )
}

function SalaryFilter({ counts, onViewMore, selectedValues }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">Salary</span>
        <button className="rounded-[7px] px-2 py-1 text-xs font-black text-blue-600 transition hover:text-blue-700" onClick={onViewMore} type="button">
          View More
        </button>
      </div>
      <div className="rounded-[7px] border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Selected salary</p>
        <p className="mt-1 text-sm font-bold text-slate-700">{selectedValues.length ? selectedValues.join(', ') : 'All salary ranges'}</p>
        {selectedValues.length ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedValues.map((salary) => <span className="rounded-[7px] bg-white px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-100" key={salary}>{salary} ({counts[salary] || 0})</span>)}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ModalOnlyFilter({ allLabel, filter, onViewMore, selectedValues }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">{filter.label}</span>
        <button className="rounded-[7px] px-2 py-1 text-xs font-black text-blue-600 transition hover:text-blue-700" onClick={onViewMore} type="button">
          View More
        </button>
      </div>
      <div className="rounded-[7px] border border-slate-100 bg-slate-50 p-3">
        <p className="text-xs font-black uppercase tracking-wide text-slate-400">Selected {filter.label.toLowerCase()}</p>
        <p className="mt-1 text-sm font-bold text-slate-700">{selectedValues.length ? selectedValues.join(', ') : allLabel}</p>
      </div>
    </div>
  )
}

function ExpandedFilter({ allLabel, filter, onChange, onViewMore, value }) {
  return (
    <div className="grid gap-3 border-b border-slate-100 px-2 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-black text-slate-900">{filter.label}</span>
        <button className="rounded-[7px] px-2 py-1 text-xs font-black text-blue-600 transition hover:text-blue-700" onClick={onViewMore} type="button">
          View More
        </button>
      </div>
      <select
        className="min-h-10 rounded-[7px] border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{allLabel}</option>
        {filter.values.slice(0, 10).map((option) => (
          <option key={option} value={option}>{option} ({filter.counts[option]})</option>
        ))}
      </select>
    </div>
  )
}

function DepartmentFilter({ filter, onChange, onViewMore, value }) {
  return (
    <ExpandedFilter allLabel="All departments" filter={filter} onChange={onChange} onViewMore={onViewMore} value={value} />
  )
}

function DepartmentModal({ draft, filter, onApply, onClose, onSearch, onToggle, search }) {
  return (
    <FilterModal
      draft={draft}
      filter={filter}
      onApply={onApply}
      onClose={onClose}
      onSearch={onSearch}
      onToggle={onToggle}
      search={search}
      searchPlaceholder="Search Department"
    />
  )
}

function FilterModal({ draft, filter, onApply, onClose, onSearch, onToggle, search, searchPlaceholder, showSearch = true }) {
  const query = search.trim().toLowerCase()
  const options = filter.values.filter((option) => option.toLowerCase().includes(query))

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[7px] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
          <div>
            <h3 className="text-xl font-black text-slate-950">{filter.label}</h3>
            <p className="mt-1 text-sm font-semibold text-slate-500">{draft.length} selected</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-[7px] bg-slate-100 text-slate-500 hover:bg-slate-200" onClick={onClose} type="button" aria-label={`Close ${filter.label.toLowerCase()} filter`}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {showSearch && (
            <label className="mb-5 flex min-h-11 max-w-sm items-center gap-2 rounded-[7px] border border-slate-200 bg-white px-3 text-sm text-slate-500 shadow-sm">
              <Search size={17} className="text-blue-600" />
              <input
                className="w-full bg-transparent font-semibold outline-none placeholder:text-slate-400"
                onChange={(event) => onSearch(event.target.value)}
                placeholder={searchPlaceholder}
                value={search}
              />
            </label>
          )}
          <div className="grid max-h-[52vh] gap-x-7 gap-y-3 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.length ? options.map((option) => {
              const checked = draft.includes(option)
              return (
                <label className="flex min-w-0 cursor-pointer items-center gap-3 text-sm font-semibold text-slate-600" key={option}>
                  <input checked={checked} className="h-4 w-4 rounded-[4px] border-slate-300 accent-blue-600" onChange={() => onToggle(option)} type="checkbox" />
                  <span className="min-w-0 truncate">{option}</span>
                  <span className="shrink-0 text-slate-400">({filter.counts[option] || 0})</span>
                </label>
              )
            }) : (
              <p className="rounded-[7px] bg-slate-50 p-4 text-sm font-semibold text-slate-500 sm:col-span-2 lg:col-span-3">No {filter.label.toLowerCase()} found.</p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-5">
          <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-black text-slate-600" onClick={onClose} type="button">Cancel</button>
          <button className="rounded-[7px] bg-blue-600 px-6 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-100" onClick={onApply} type="button">Apply</button>
        </div>
      </div>
    </div>
  )
}

function normalizeJob(job) {
  return {
    ...job,
    locationState: getLocationState(job.location),
    type: normalizeJobType(job.type),
    workMode: normalizeWorkMode(job.workMode),
    skills: Array.isArray(job.skills) ? job.skills : String(job.skills || '').split(',').map((skill) => skill.trim()).filter(Boolean),
  }
}

function normalizeWorkMode(value) {
  const text = String(value || '').toLowerCase()
  if (text.includes('hybrid')) return 'Hybrid'
  if (text.includes('office') || text.includes('onsite') || text.includes('on-site')) return 'Office'
  if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) return 'Remote'
  return 'Office'
}

function normalizeJobType(value) {
  const text = String(value || '').toLowerCase()
  if (text.includes('part')) return 'Part Time'
  return 'Full Time'
}

function getLocationState(value) {
  return formatStateCountryLocation(value)
}

function getExperienceMin(value) {
  const numbers = String(value || '').match(/\d+/g)?.map(Number) || []
  return numbers.length ? Math.min(...numbers) : 0
}

function getSalaryRange(value) {
  const numbers = String(value || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || []
  if (!numbers.length) return null
  return {
    min: Math.min(...numbers),
    max: numbers.length > 1 ? Math.max(...numbers) : Math.min(...numbers),
  }
}

function matchesSalaryBands(value, selectedBands) {
  const range = getSalaryRange(value)
  if (!range) return false

  return selectedBands.some((label) => {
    const band = salaryBands.find((item) => item.label === label)
    return band ? range.min <= band.max && range.max >= band.min : false
  })
}

function buildSalaryBandCounts(jobs) {
  return salaryBands.reduce((counts, band) => {
    counts[band.label] = jobs.filter((job) => matchesSalaryBands(job.salary, [band.label])).length
    return counts
  }, {})
}

function buildDynamicFilters(jobs) {
  return filterConfig.map((filter) => {
    const counts = {}

    jobs.forEach((job) => {
      const rawValues = filter.array ? job[filter.field] : [job[filter.field]]
      rawValues.filter(Boolean).forEach((value) => {
        const normalized = String(value).trim()
        if (!normalized) return
        counts[normalized] = (counts[normalized] || 0) + 1
      })
    })

    return {
      ...filter,
      counts,
      values: filter.fixedValues || Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b)),
    }
  })
}

function syncClusterParam(params) {
  const clusters = []
  if (params.has('functionAreaIdGid')) clusters.push('functionalAreaGid')
  if (params.has('wfhType')) clusters.push('wfhType')

  if (clusters.length) params.set('clusters', clusters.join(','))
  else params.delete('clusters')
}

function getDepartmentId(department, departments) {
  const index = departments.findIndex((item) => item === department)
  return String(index >= 0 ? index + 1 : department)
}

function getDepartmentById(id, departments) {
  const index = Number(id) - 1
  return Number.isInteger(index) && departments[index] ? departments[index] : ''
}

function getParamList(params, key) {
  return String(params.get(key) || '').split('|').map((item) => item.trim()).filter(Boolean)
}

function getSelectedFilters(params, departments = []) {
  return filterConfig.reduce((selected, filter) => {
    if (filter.key === 'workMode') {
      const modernValues = params.getAll('wfhType').map((value) => wfhTypeToWorkMode[value]).filter(Boolean)
      selected[filter.key] = modernValues.length ? modernValues : getParamList(params, filter.key)
      return selected
    }

    if (filter.key === 'department') {
      const modernValues = params.getAll('functionAreaIdGid').map((id) => getDepartmentById(id, departments)).filter(Boolean)
      selected[filter.key] = modernValues.length ? modernValues : getParamList(params, filter.key)
      return selected
    }

    selected[filter.key] = getParamList(params, filter.key)
    return selected
  }, {})
}

function buildActiveChips(selectedFilters, selectedSalaryBands, selectedExperienceMax) {
  const filterLabels = Object.entries(selectedFilters).flatMap(([key, values]) => (
    values.map((value) => {
      const config = filterConfig.find((item) => item.key === key)
      return `${config?.label || key}: ${value}`
    })
  ))
  const salaryLabels = selectedSalaryBands.map((value) => `Salary: ${value}`)
  const experienceLabel = selectedExperienceMax ? [`Experience: 0-${selectedExperienceMax} Yrs`] : []

  return [...filterLabels, ...salaryLabels, ...experienceLabel]
}

function matchesAdvancedFilters(job, selectedFilters) {
  return filterConfig.every((filter) => {
    const selected = selectedFilters[filter.key] || []
    if (!selected.length) return true

    const jobValues = filter.array ? job[filter.field] : [job[filter.field]]
    const normalizedJobValues = jobValues.filter(Boolean).map((value) => String(value).toLowerCase())

    return selected.some((value) => {
      const normalizedValue = value.toLowerCase()
      return filter.mode === 'includes'
        ? normalizedJobValues.some((jobValue) => jobValue.includes(normalizedValue))
        : normalizedJobValues.includes(normalizedValue)
    })
  })
}
