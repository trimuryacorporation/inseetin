import { useEffect, useMemo, useState } from 'react'
import { BriefcaseBusiness, CalendarCheck, Download, Eye, Pencil, Plus, Trash2, UserCheck, UserPlus, UsersRound, XCircle } from 'lucide-react'
import { AdminCard, AdminModal, StatusBadge } from '../components/AdminPrimitives'
import { api } from '../../services/api'

const trackingStatuses = ['Not Applied', 'Applied', 'Interview', 'Selected', 'Rejected']

const columns = [
  'Select',
  'Record Inserted On',
  'Hiring Source',
  'Candidate Name',
  'Candidate Code',
  'Mobile Number',
  'Sourcing Vendor',
  'Candidate State',
  'Candidate Location',
  'Designation',
  'Grade',
  'Role',
  'Department',
  'SubTeam',
  'SourceCode',
  'Email Id',
  'Job Applied',
  'Interview',
  'Selection',
  'Rejection',
  'Tracking Status',
  'Interview Date',
  'Qualification',
  'DOB(yyyy-MM-dd)',
  'Shortlisting Status',
  'Interviewer Remarks',
  'Proposed DOJ(yyyy-MM-dd)',
  'Final DOJ(yyyy-MM-dd)',
  'SAP ID',
  'Entity Name',
  'TL Ecode',
  'Manager/ASM Ecode',
  'GGApp Status',
  'GGApp Rejection Reason',
  'GGApp Status DateTime',
  'Candidate Status',
  'Status',
  'LWD',
  'Action',
]
const initialForm = {
  candidateName: '',
  mobileNumber: '',
  emailId: '',
  gender: '',
  state: '',
  location: '',
  entity: '',
  department: '',
  subTeam: '',
  sourceCode: '',
  role: '',
  trackingStatus: 'Applied',
  interviewDate: '2026-05-20',
  interviewTime: '01:52:51',
  venue: '',
  qualification: '',
  dateOfBirth: '',
  maritalStatus: '',
  resume: null,
}

export function AdminHiringTeamPage() {
  const currentUser = getStoredUser()
  const canDeleteCandidates = currentUser?.role !== 'hiring'
  const storageKey = getHiringStorageKey(currentUser)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [companies, setCompanies] = useState([])
  const [companiesError, setCompaniesError] = useState('')
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [rowsByCompany, setRowsByCompany] = useState(() => getStoredHiringRows(storageKey))
  const [selectedRows, setSelectedRows] = useState([])
  const [page, setPage] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [editRowId, setEditRowId] = useState('')
  const [actionMessage, setActionMessage] = useState('')
  const [filters, setFilters] = useState({
    fromDate: '2026-05-20',
    toDate: '2026-05-20',
    candidateCode: '',
    sapId: '',
    trackingStatus: '',
  })

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    let mounted = true
    const loadCompanies = async () => {
      setLoadingCompanies(true)
      setCompaniesError('')
      try {
        const payload = await api.companies('?limit=100&sort=name')
        const nextCompanies = Array.isArray(payload.data) ? payload.data : []
        if (!mounted) return
        setCompanies(nextCompanies)
        setSelectedCompanyId((current) => current || nextCompanies[0]?._id || nextCompanies[0]?.id || '')
      } catch (err) {
        if (!mounted) return
        setCompanies([])
        setCompaniesError(err.message || 'Companies load nahi ho payi.')
      } finally {
        if (mounted) setLoadingCompanies(false)
      }
    }

    loadCompanies()

    return () => {
      mounted = false
    }
  }, [])

  const selectedCompany = useMemo(() => {
    return companies.find((company) => String(company._id || company.id) === String(selectedCompanyId)) || null
  }, [companies, selectedCompanyId])
  const selectedCompanyKey = selectedCompanyId || 'unassigned'
  const companyRows = rowsByCompany[selectedCompanyKey] || []
  const filteredRows = companyRows.filter((row) => {
    const candidateCodeMatch = filters.candidateCode ? String(row['Candidate Code'] || '').toLowerCase().includes(filters.candidateCode.toLowerCase()) : true
    const sapIdMatch = filters.sapId ? String(row['SAP ID'] || '').toLowerCase().includes(filters.sapId.toLowerCase()) : true
    const trackingMatch = filters.trackingStatus ? row['Tracking Status'] === filters.trackingStatus : true
    const recordDate = String(row['Record Inserted On'] || '')
    const fromMatch = filters.fromDate ? recordDate >= filters.fromDate : true
    const toMatch = filters.toDate ? recordDate <= filters.toDate : true
    return candidateCodeMatch && sapIdMatch && trackingMatch && fromMatch && toMatch
  })
  const trackingSummary = getTrackingSummary(companyRows)

  const closeForm = () => {
    setFormOpen(false)
    setEditRowId('')
    setForm(initialForm)
    setUploadMessage('')
  }

  useEffect(() => {
    setSelectedRows([])
    setPage(1)
  }, [selectedCompanyKey])

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(rowsByCompany))
  }, [rowsByCompany, storageKey])

  const submitForm = async (event) => {
    event.preventDefault()
    if (!selectedCompany) return
    setUploading(true)
    setUploadMessage('')
    setActionMessage('')

    const existingRow = editRowId ? companyRows.find((row) => row.id === editRowId) : null

    let uploadedResume = null
    if (form.resume) {
      const data = new FormData()
      data.append('resume', form.resume)
      data.append('candidateName', form.candidateName)
      data.append('mobileNumber', form.mobileNumber)
      data.append('emailId', form.emailId)
      data.append('role', form.role)
      data.append('companyId', selectedCompanyKey)
      data.append('companyName', selectedCompany.name)
      data.append('state', form.state)
      data.append('location', form.location)
      data.append('entity', form.entity || selectedCompany.name)
      data.append('department', form.department)
      data.append('subTeam', form.subTeam)
      data.append('sourceCode', form.sourceCode)
      data.append('interviewDate', form.interviewDate)
      data.append('interviewTime', form.interviewTime)
      data.append('venue', form.venue)
      data.append('qualification', form.qualification)
      data.append('dateOfBirth', form.dateOfBirth)
      data.append('maritalStatus', form.maritalStatus)

      try {
        uploadedResume = await api.uploadResumeToCloudflareR2(data)
      } catch (error) {
        setUploading(false)
        setUploadMessage(error.message || 'Resume upload failed. Check Cloudflare R2 settings.')
        return
      }
    }

    if (uploadedResume?.data?._id && existingRow && (existingRow.resumeId || existingRow.resumeUrl || existingRow['Download Resume'])) {
      try {
        await deleteResumeForRow(existingRow)
      } catch (error) {
        setUploading(false)
        setUploadMessage(error.message || 'Old resume delete failed. Candidate update stopped.')
        return
      }
    }

    const nextIndex = (rowsByCompany[selectedCompanyKey]?.length || 0) + 1
    const candidateCode = existingRow?.['Candidate Code'] || `${getCompanyCode(selectedCompany.name)}-${String(nextIndex).padStart(3, '0')}`
    const resumeData = uploadedResume?.data || null
    const trackingFlags = getTrackingFlags(form.trackingStatus)
    const record = {
      id: existingRow?.id || `${selectedCompanyKey}-${Date.now()}`,
      ownerEmail: currentUser?.email || '',
      ownerName: currentUser?.name || '',
      'Record Inserted On': existingRow?.['Record Inserted On'] || new Date().toLocaleDateString('en-CA'),
      'Hiring Source': selectedCompany.name,
      'Candidate Name': form.candidateName,
      'Candidate Code': candidateCode,
      'Mobile Number': form.mobileNumber,
      'Sourcing Vendor': '',
      'Candidate State': form.state,
      'Candidate Location': form.location,
      Designation: form.role,
      Grade: '',
      Role: form.role,
      Department: form.department,
      SubTeam: form.subTeam,
      SourceCode: form.sourceCode,
      'Email Id': form.emailId,
      'Job Applied': trackingFlags.jobApplied,
      Interview: trackingFlags.interview,
      Selection: trackingFlags.selection,
      Rejection: trackingFlags.rejection,
      'Tracking Status': form.trackingStatus,
      'Interview Date': form.interviewDate,
      Qualification: form.qualification,
      'DOB(yyyy-MM-dd)': form.dateOfBirth,
      'Shortlisting Status': '',
      'Interviewer Remarks': '',
      'Proposed DOJ(yyyy-MM-dd)': '',
      'Final DOJ(yyyy-MM-dd)': '',
      'SAP ID': '',
      'Entity Name': form.entity || selectedCompany.name,
      'TL Ecode': '',
      'Manager/ASM Ecode': '',
      'GGApp Status': '',
      'GGApp Rejection Reason': '',
      'GGApp Status DateTime': '',
      'Candidate Status': form.trackingStatus === 'Not Applied' ? 'New' : form.trackingStatus,
      Status: ['Selected', 'Rejected'].includes(form.trackingStatus) ? form.trackingStatus : 'Active',
      LWD: '',
      resumeId: resumeData?._id || existingRow?.resumeId || '',
      resumeUrl: resumeData?.resumeUrl || existingRow?.resumeUrl || existingRow?.['Download Resume'] || '',
      resumeName: resumeData?.originalFileName || existingRow?.resumeName || form.resume?.name || existingRow?.['Download Resume'] || '',
      storageBucket: resumeData?.storageBucket || existingRow?.storageBucket || '',
      storagePath: resumeData?.storagePath || existingRow?.storagePath || '',
    }
    setRowsByCompany((current) => ({
      ...current,
      [selectedCompanyKey]: editRowId
        ? (current[selectedCompanyKey] || []).map((row) => (row.id === editRowId ? record : row))
        : [...(current[selectedCompanyKey] || []), record],
    }))
    setForm(initialForm)
    setEditRowId('')
    setFormOpen(false)
    setPage(1)
    setUploading(false)
  }

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const downloadExcel = () => {
    const exportColumns = columns.filter((column) => !['Select', 'Action'].includes(column))
    const table = [
      exportColumns.join('\t'),
      ...filteredRows.map((row) => exportColumns.map((column) => row[column] || '').join('\t')),
    ].join('\n')
    const blob = new Blob([table], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${selectedCompany ? getCompanyCode(selectedCompany.name).toLowerCase() : 'hiring-team'}-candidates.xls`
    link.click()
    URL.revokeObjectURL(url)
  }

  const pageSize = 10
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const visibleRows = filteredRows.slice((page - 1) * pageSize, page * pageSize)
  const start = filteredRows.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, filteredRows.length)
  const allVisibleSelected = visibleRows.length > 0 && visibleRows.every((row) => selectedRows.includes(row.id))

  const toggleSelectAll = (checked) => {
    const visibleIds = visibleRows.map((row) => row.id)
    setSelectedRows((current) => {
      if (checked) return [...new Set([...current, ...visibleIds])]
      return current.filter((id) => !visibleIds.includes(id))
    })
  }

  const toggleRow = (id, checked) => {
    setSelectedRows((current) => {
      if (checked) return [...new Set([...current, id])]
      return current.filter((item) => item !== id)
    })
  }

  const deleteRows = async (ids) => {
    setActionMessage('')
    const rowsToDelete = (rowsByCompany[selectedCompanyKey] || []).filter((row) => ids.includes(row.id))

    try {
      const deletedResumeIds = (await Promise.all(rowsToDelete.map(deleteResumeForRow))).filter(Boolean)
      setRowsByCompany((current) => ({
        ...current,
        [selectedCompanyKey]: (current[selectedCompanyKey] || []).filter((row) => !ids.includes(row.id)),
      }))
      setSelectedRows((current) => current.filter((id) => !ids.includes(id)))
      setActionMessage(deletedResumeIds.length ? 'Candidate and resume deleted from MongoDB and Supa Cloud.' : 'Candidate deleted.')
    } catch (error) {
      setActionMessage(error.message || 'Candidate delete failed. Resume was not removed.')
    }
  }

  const deleteResumeForRow = async (row) => {
    if (row.resumeId) {
      await api.remove('resumes', row.resumeId)
      return row.resumeId
    }

    const resumeUrl = row.resumeUrl || row['Download Resume']
    if (!resumeUrl || resumeUrl === 'Not uploaded') return ''

    const payload = await api.list('resumes', `?search=${encodeURIComponent(resumeUrl)}&limit=5`)
    const match = (payload.data || []).find((resume) => resume.resumeUrl === resumeUrl)
    if (!match?._id) return ''

    await api.remove('resumes', match._id)
    return match._id
  }

  const viewResume = async (row) => {
    setActionMessage('')

    if (row.resumeId) {
      api.openResume(row.resumeId).catch((error) => setActionMessage(error.message || 'Resume could not be opened.'))
      return
    }

    const resumeUrl = row.resumeUrl || row['Download Resume']
    if (!resumeUrl || resumeUrl === 'Not uploaded') {
      setActionMessage('This candidate has not uploaded a resume.')
      return
    }

    try {
      const payload = await api.list('resumes', `?search=${encodeURIComponent(resumeUrl)}&limit=5`)
      const match = (payload.data || []).find((resume) => resume.resumeUrl === resumeUrl)
      if (match?._id) {
        api.openResume(match._id).catch((error) => setActionMessage(error.message || 'Resume could not be opened.'))
        return
      }
    } catch {
      // Fall back to the saved URL for older local-only rows.
    }

    setActionMessage('The old resume link points to a Supa Cloud public URL. Edit the candidate and upload the resume again.')
  }

  const editCandidate = (row) => {
    setEditRowId(row.id)
    setUploadMessage('')
    setActionMessage('')
    setForm({
      candidateName: row['Candidate Name'] || '',
      mobileNumber: row['Mobile Number'] || '',
      emailId: row['Email Id'] || '',
      gender: row.Gender || '',
      state: row['Candidate State'] || '',
      location: row['Candidate Location'] || '',
      entity: row['Entity Name'] || selectedCompany?.name || '',
      department: row.Department || '',
      subTeam: row.SubTeam || '',
      sourceCode: row.SourceCode || '',
      role: row.Role || row.Designation || '',
      trackingStatus: row['Tracking Status'] || row['Candidate Status'] || 'Applied',
      interviewDate: row['Interview Date'] || '',
      interviewTime: row.interviewTime || '',
      venue: row.venue || '',
      qualification: row.Qualification || '',
      dateOfBirth: row['DOB(yyyy-MM-dd)'] || '',
      maritalStatus: row.maritalStatus || '',
      resume: null,
    })
    setFormOpen(true)
  }

  const updateCandidateTracking = (id, status) => {
    const trackingFlags = getTrackingFlags(status)
    setRowsByCompany((current) => ({
      ...current,
      [selectedCompanyKey]: (current[selectedCompanyKey] || []).map((row) => {
        if (row.id !== id) return row
        return {
          ...row,
          'Job Applied': trackingFlags.jobApplied,
          Interview: trackingFlags.interview,
          Selection: trackingFlags.selection,
          Rejection: trackingFlags.rejection,
          'Tracking Status': status,
          'Candidate Status': status === 'Not Applied' ? 'New' : status,
          Status: ['Selected', 'Rejected'].includes(status) ? status : 'Active',
        }
      }),
    }))
  }

  return (
    <div className="grid gap-5">
      <section className="rounded-[7px] border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-teal-50 p-6 shadow-xl shadow-blue-100/50">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-[7px] bg-blue-600 text-white shadow-lg shadow-blue-100">
              <UsersRound size={25} />
            </span>
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-blue-600">Hiring Team</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Candidates Hiring Team</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-500">
                Manage candidates assigned to your hiring team login. Candidate records added here remain visible in this account.
              </p>
              <p className="mt-2 text-xs font-black uppercase tracking-wide text-blue-700">Signed in: {currentUser?.name || 'Hiring Team'} / {currentUser?.email || 'No email'}</p>
            </div>
          </div>
          <div className="w-full rounded-[7px] border border-blue-100 bg-white/90 p-3 shadow-lg shadow-blue-100/50 lg:max-w-md">
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Company
                <select
                  className="min-h-11 w-full rounded-[7px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
                  disabled={loadingCompanies || !companies.length}
                  onChange={(event) => setSelectedCompanyId(event.target.value)}
                  value={selectedCompanyId}
                >
                  <option value="">{loadingCompanies ? 'Loading companies...' : 'Select company'}</option>
                  {companies.map((company) => (
                    <option key={company._id || company.id || company.name} value={company._id || company.id}>{company.name}</option>
                  ))}
                </select>
              </label>
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!selectedCompany}
                onClick={() => {
                  setEditRowId('')
                  setUploadMessage('')
                  setActionMessage('')
                  setForm({ ...initialForm, entity: selectedCompany?.name || '' })
                  setFormOpen(true)
                }}
                type="button"
              >
                <Plus size={17} /> Add Candidates
              </button>
            </div>
            {companiesError ? (
              <p className="mt-2 text-xs font-bold text-rose-600">{companiesError}</p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate-500">The selected company table stays unique and shows only records for the current login.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <TrackingCard icon={UsersRound} label="Total Candidates" tone="bg-slate-100 text-slate-700" value={companyRows.length} />
        <TrackingCard icon={BriefcaseBusiness} label="Job Applied" tone="bg-blue-50 text-blue-700" value={trackingSummary.applied} />
        <TrackingCard icon={CalendarCheck} label="Interview" tone="bg-amber-50 text-amber-700" value={trackingSummary.interview} />
        <TrackingCard icon={UserCheck} label="Selected" tone="bg-emerald-50 text-emerald-700" value={trackingSummary.selected} />
        <TrackingCard icon={XCircle} label="Rejected" tone="bg-rose-50 text-rose-700" value={trackingSummary.rejected} />
      </section>

      <AdminModal open={formOpen} title={editRowId ? 'Edit Candidate' : 'Add Candidate'} onClose={closeForm}>
        <form onSubmit={submitForm}>
          <div className="mb-5">
            <p className="text-sm font-black uppercase tracking-wide text-blue-600">Candidates Hiring Team</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{editRowId ? 'Update candidate details. Upload a new PDF only if resume replacement is required.' : 'Fill all candidate details for the hiring team record.'}</p>
            {selectedCompany && (
              <div className="mt-4 rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-800">
                Company: {selectedCompany.name}
              </div>
            )}
            {uploadMessage && <p className="mt-3 rounded-[7px] bg-rose-50 p-3 text-sm font-bold text-rose-700">{uploadMessage}</p>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Candidate Name" onChange={(value) => updateForm('candidateName', value)} value={form.candidateName} />
            <Field label="Mobile Number" onChange={(value) => updateForm('mobileNumber', value)} type="tel" value={form.mobileNumber} />
            <Field label="Email ID" onChange={(value) => updateForm('emailId', value)} type="email" value={form.emailId} />
            <SelectField label="Gender" onChange={(value) => updateForm('gender', value)} options={['Male', 'Female', 'Other']} value={form.gender} />
            <Field label="State" onChange={(value) => updateForm('state', value)} value={form.state} />
            <Field label="Location" onChange={(value) => updateForm('location', value)} value={form.location} />
            <Field label="Entity" onChange={(value) => updateForm('entity', value)} value={form.entity} />
            <Field label="Department" onChange={(value) => updateForm('department', value)} value={form.department} />
            <Field label="Sub Team" onChange={(value) => updateForm('subTeam', value)} value={form.subTeam} />
            <Field label="Source Code" onChange={(value) => updateForm('sourceCode', value)} value={form.sourceCode} />
            <Field label="Role" onChange={(value) => updateForm('role', value)} value={form.role} />
            <SelectField label="Tracking Status" onChange={(value) => updateForm('trackingStatus', value || 'Applied')} options={trackingStatuses} value={form.trackingStatus} />
            <Field label="Interview Date" onChange={(value) => updateForm('interviewDate', value)} type="date" value={form.interviewDate} />
            <Field label="Interview Time" onChange={(value) => updateForm('interviewTime', value)} type="time" value={form.interviewTime} />
            <Field label="Venue" onChange={(value) => updateForm('venue', value)} value={form.venue} />
            <Field label="Qualification" onChange={(value) => updateForm('qualification', value)} value={form.qualification} />
            <Field label="Date of Birth" onChange={(value) => updateForm('dateOfBirth', value)} type="date" value={form.dateOfBirth} />
            <SelectField label="Marital Status" onChange={(value) => updateForm('maritalStatus', value)} options={['Single', 'Married', 'Other']} value={form.maritalStatus} />
            <label className="grid gap-2 text-sm font-bold text-slate-700">
              Upload Resume(PDF)
              <input
                accept="application/pdf"
                className="min-h-11 rounded-[7px] border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 outline-none file:mr-3 file:rounded-[7px] file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-white"
                onChange={(event) => updateForm('resume', event.target.files?.[0] || null)}
                type="file"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-col justify-end gap-2 sm:flex-row">
            <button className="rounded-[7px] bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-200" onClick={closeForm} type="button">Cancel</button>
            <button className="rounded-[7px] bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-100 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300" disabled={uploading} type="submit">
              {uploading ? 'Saving...' : editRowId ? 'Update Candidate' : 'Save Candidate'}
            </button>
          </div>
        </form>
      </AdminModal>

      <AdminCard className="overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
            <div>
              <h3 className="text-xl font-black text-slate-950">{selectedCompany?.name || 'Selected company'} hiring team candidates</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">This table is unique for the selected company. Filter records and export the table format.</p>
            </div>
            <button className="inline-flex min-h-11 w-max items-center justify-center gap-2 rounded-[7px] bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700" onClick={downloadExcel} type="button">
              <Download size={17} /> Download Excel
            </button>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-[repeat(5,minmax(0,1fr))_auto] xl:items-end">
            <Field label="From Date" onChange={(value) => updateFilter('fromDate', value)} type="date" value={filters.fromDate} />
            <Field label="To Date" onChange={(value) => updateFilter('toDate', value)} type="date" value={filters.toDate} />
            <Field label="Candidate Code" onChange={(value) => updateFilter('candidateCode', value)} value={filters.candidateCode} />
            <Field label="SAP ID" onChange={(value) => updateFilter('sapId', value)} value={filters.sapId} />
            <SelectField label="Tracking Status" onChange={(value) => updateFilter('trackingStatus', value)} options={trackingStatuses} value={filters.trackingStatus} />
            <button className="inline-flex min-h-11 items-center justify-center rounded-[7px] bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-blue-700" type="button">
              Search
            </button>
          </div>
          {canDeleteCandidates && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[7px] bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-600">{selectedRows.length} selected</p>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[7px] bg-rose-600 px-4 text-sm font-bold text-white shadow-lg shadow-rose-100 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={!selectedRows.length}
                onClick={() => deleteRows(selectedRows)}
                type="button"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </div>
          )}
          {actionMessage && <p className="mt-3 rounded-[7px] bg-blue-50 p-3 text-sm font-bold text-blue-700">{actionMessage}</p>}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[3400px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                {columns.map((column) => (
                  <th className="whitespace-nowrap border-r border-slate-100 px-4 py-4 font-bold" key={column}>
                    {column === 'Select' ? (
                      <input checked={allVisibleSelected} onChange={(event) => toggleSelectAll(event.target.checked)} type="checkbox" />
                    ) : column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? visibleRows.map((row) => (
                <tr className="border-t border-slate-100 hover:bg-blue-50/40" key={row['Candidate Code']}>
                  {columns.map((column) => (
                    <td className="whitespace-nowrap border-r border-slate-100 px-4 py-3 font-semibold text-slate-600" key={column}>
                      {column === 'Select' ? (
                        <input checked={selectedRows.includes(row.id)} onChange={(event) => toggleRow(row.id, event.target.checked)} type="checkbox" />
                      ) : column === 'Tracking Status' ? (
                        <select
                          className="min-h-9 rounded-[7px] border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                          onChange={(event) => updateCandidateTracking(row.id, event.target.value)}
                          value={row['Tracking Status'] || row['Candidate Status'] || 'Applied'}
                        >
                          {trackingStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      ) : ['Job Applied', 'Interview', 'Selection', 'Rejection', 'Candidate Status', 'Status'].includes(column) ? (
                        <StatusBadge status={row[column] || '-'} />
                      ) : column === 'Action' ? (
                        <div className="flex items-center gap-2">
                          <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => viewResume(row)} type="button" aria-label="View resume">
                            <Eye size={16} />
                          </button>
                          <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-slate-100 text-slate-700 hover:bg-slate-200" onClick={() => editCandidate(row)} type="button" aria-label="Edit candidate">
                            <Pencil size={16} />
                          </button>
                          {canDeleteCandidates && (
                            <button className="grid h-8 w-8 place-items-center rounded-[7px] bg-rose-50 text-rose-700 hover:bg-rose-100" onClick={() => deleteRows([row.id])} type="button" aria-label="Delete candidate">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ) : row[column] || '-'}
                    </td>
                  ))}
                </tr>
              )) : (
                <tr>
                  <td className="px-5 py-12 text-center" colSpan={columns.length}>
                    <UserPlus className="mx-auto text-blue-600" size={34} />
                    <h4 className="mt-4 text-xl font-black text-slate-950">No hiring team candidates added</h4>
                    <p className="mt-2 text-sm font-semibold text-slate-500">Use Add Candidates to create the first record for {selectedCompany?.name || 'this company'}.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-sm font-semibold text-slate-500">Showing {start}-{end} of {filteredRows.length} records</p>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-[7px] bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} type="button">Prev</button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button
                className={`grid h-9 w-9 place-items-center rounded-[7px] text-sm font-bold ${pageNumber === page ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}
                key={pageNumber}
                onClick={() => setPage(pageNumber)}
                type="button"
              >
                {pageNumber}
              </button>
            ))}
            <button className="rounded-[7px] bg-slate-50 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-40" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))} type="button">Next</button>
          </div>
        </div>
      </AdminCard>
    </div>
  )
}

function Field({ label, onChange, type = 'text', value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <input
        className="min-h-11 rounded-[7px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        type={type}
        value={value}
      />
    </label>
  )
}

function SelectField({ label, onChange, options, value }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      {label}
      <select
        className="min-h-11 rounded-[7px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">Select {label}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  )
}

function TrackingCard({ icon: Icon, label, tone, value }) {
  return (
    <AdminCard>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-3xl font-black text-slate-950">{value}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">{label}</p>
        </div>
        <span className={`grid h-12 w-12 place-items-center rounded-[7px] ${tone}`}>
          <Icon size={22} />
        </span>
      </div>
    </AdminCard>
  )
}

function getTrackingFlags(status = 'Applied') {
  return {
    jobApplied: status === 'Not Applied' ? 'No' : 'Yes',
    interview: ['Interview', 'Selected', 'Rejected'].includes(status) ? 'Yes' : 'No',
    selection: status === 'Selected' ? 'Yes' : 'No',
    rejection: status === 'Rejected' ? 'Yes' : 'No',
  }
}

function getTrackingSummary(rows = []) {
  return rows.reduce((summary, row) => {
    const status = row['Tracking Status'] || row['Candidate Status'] || ''
    if (row['Job Applied'] === 'Yes' || ['Applied', 'Interview', 'Selected', 'Rejected'].includes(status)) summary.applied += 1
    if (row.Interview === 'Yes' || ['Interview', 'Selected', 'Rejected'].includes(status)) summary.interview += 1
    if (row.Selection === 'Yes' || status === 'Selected') summary.selected += 1
    if (row.Rejection === 'Yes' || status === 'Rejected') summary.rejected += 1
    return summary
  }, { applied: 0, interview: 0, selected: 0, rejected: 0 })
}

function getCompanyCode(name = 'COMPANY') {
  const code = String(name)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6)

  return code || 'COMP'
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('authUser') || 'null') || {}
  } catch {
    return {}
  }
}

function getHiringStorageKey(user = {}) {
  const owner = String(user.email || user.id || user.name || 'guest').toLowerCase()
  return `hiringTeamRows:${owner}`
}

function getStoredHiringRows(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')
    return stored && typeof stored === 'object' && !Array.isArray(stored) ? stored : {}
  } catch {
    return {}
  }
}
