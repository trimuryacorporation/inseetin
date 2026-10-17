import { AnimatePresence, motion } from 'framer-motion'
import { Fragment, useMemo, useState } from 'react'
import { CheckCircle2, Download, Eye, FileSpreadsheet, FileText, Pencil, Plus, Search, Trash2, X } from 'lucide-react'

export function AdminCard({ children, className = '' }) {
  return <div className={`rounded-[7px] border border-white/70 bg-white/90 p-5 shadow-lg shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/86 dark:shadow-black/25 ${className}`}>{children}</div>
}

export function StatusBadge({ status }) {
  const key = String(status).toLowerCase()
  const tone =
    key.includes('suspend') || key.includes('blocked') || key.includes('rejected') || key.includes('failed') || key.includes('closed')
      ? 'bg-rose-50 text-rose-700 ring-rose-100 dark:bg-rose-400/10 dark:text-rose-200 dark:ring-rose-400/20'
      : key.includes('inactive') || key.includes('pending') || key.includes('review') || key.includes('interview') || key.includes('open') || key.includes('submitted')
        ? 'bg-amber-50 text-amber-700 ring-amber-100 dark:bg-amber-400/10 dark:text-amber-200 dark:ring-amber-400/20'
        : key.includes('active') || key.includes('approved') || key.includes('paid') || key.includes('selected') || key.includes('verified')
      ? 'bg-emerald-50 text-emerald-700 ring-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/20'
      : 'bg-indigo-50 text-indigo-700 ring-indigo-100 dark:bg-indigo-400/10 dark:text-indigo-200 dark:ring-indigo-400/20'

  return <span className={`inline-flex rounded-[7px] px-3 py-1 text-xs font-black ring-1 ${tone}`}>{status}</span>
}

export function Toolbar({
  title,
  subtitle,
  actionLabel = 'Add New',
  onAction,
  searchValue = '',
  onSearchChange,
  statusValue = '',
  onStatusChange,
  statusOptions = ['Active', 'Pending', 'Blocked', 'Approved', 'Rejected'],
}) {
  return (
    <div className="mb-5 rounded-[7px] border border-white/70 bg-white/85 p-4 shadow-lg shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/82 dark:shadow-black/25 lg:flex lg:items-center lg:justify-between lg:gap-4">
      <div>
        <p className="text-xs font-black uppercase tracking-wide text-blue-600 dark:text-blue-300">Enterprise module</p>
        <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">{title}</h2>
        {subtitle && <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:mt-0">
        <label className="flex min-h-11 items-center gap-2 rounded-[7px] border border-slate-200 bg-white px-4 text-sm text-slate-500 shadow-sm dark:border-white/10 dark:bg-slate-800 dark:text-slate-300">
          <Search size={17} className="text-blue-600 dark:text-blue-300" />
          <input
            className="w-full bg-transparent outline-none placeholder:text-slate-400 dark:text-white"
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder="Search records"
            value={searchValue}
          />
        </label>
        <select
          className="rounded-[7px] border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          onChange={(event) => onStatusChange?.(event.target.value)}
          value={statusValue}
        >
          <option value="">All statuses</option>
          {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        {onAction && (
          <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[7px] bg-gradient-to-r from-blue-600 to-indigo-600 px-5 text-sm font-black text-white shadow-lg shadow-blue-200 transition hover:-translate-y-0.5 hover:shadow-xl dark:shadow-blue-950/40" onClick={onAction} type="button">
            <Plus size={17} /> {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

export function DataTable({ columns, rows, actions, expandedRowId, renderExpandedRow, onRowClick }) {
  const [requestedPage, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requestedPage, pageCount)
  const pageNumbers = [...new Set([1, ...Array.from({ length: 5 }, (_, index) => page + index - 2), pageCount])].filter((value) => value >= 1 && value <= pageCount).sort((a, b) => a - b)
  const start = rows.length ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, rows.length)
  const visibleRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [page, pageSize, rows])


  return (
    <AdminCard className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table aria-label="Records" className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <tr>
              {columns.map((column) => <th className="whitespace-nowrap px-5 py-4 font-black" key={column.key}>{column.label}</th>)}
              {actions && <th className="px-5 py-4 font-bold">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visibleRows.map((row) => {
              const rowId = row._id || row.id
              const expanded = expandedRowId === rowId

              return (
                <Fragment key={rowId}>
                  <tr className={`transition hover:bg-blue-50/50 dark:hover:bg-blue-400/10 ${onRowClick ? 'cursor-pointer' : ''}`} onClick={() => onRowClick?.(row)}>
                    {columns.map((column) => (
                      <td className="whitespace-nowrap px-5 py-4 font-semibold text-slate-600 dark:text-slate-300" key={column.key}>
                        {column.render ? column.render(row) : column.badge ? <StatusBadge status={row[column.key]} /> : formatCell(column.key, row[column.key])}
                      </td>
                    ))}
                    {actions && <td className="px-5 py-4" onClick={(event) => event.stopPropagation()}>{actions(row)}</td>}
                  </tr>
                  {expanded && renderExpandedRow && (
                    <tr>
                      <td className="bg-slate-50 px-5 py-4 dark:bg-slate-800/70" colSpan={columns.length + (actions ? 1 : 0)}>
                        {renderExpandedRow(row)}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-800/40 sm:flex-row sm:items-center">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Showing {start}-{end} of {rows.length} records</p>
          <select className="rounded-[7px] border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 outline-none dark:border-white/10 dark:bg-slate-800 dark:text-slate-200" onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} value={pageSize}>
            {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-[7px] bg-white px-3 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10" disabled={page === 1} onClick={() => setPage(Math.max(1, page - 1))} type="button">Prev</button>
          {pageNumbers.map((pageNumber) => (
            <button
              className={`grid h-9 w-9 place-items-center rounded-[7px] text-sm font-bold ${pageNumber === page ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10'}`}
              key={pageNumber}
              onClick={() => setPage(pageNumber)}
              type="button"
            >
              {pageNumber}
            </button>
          ))}
          <button className="rounded-[7px] bg-white px-3 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 disabled:opacity-40 dark:bg-slate-800 dark:text-slate-200 dark:ring-white/10" disabled={page === pageCount} onClick={() => setPage(Math.min(pageCount, page + 1))} type="button">Next</button>
        </div>
      </div>
    </AdminCard>
  )
}

function formatCell(key, value) {
  if (Array.isArray(value)) return value.join(', ')
  if (key === '_id' && value) return String(value).slice(-8)
  if (key === 'createdAt' && value) return new Date(value).toLocaleDateString()
  if (['panDocument', 'gstDocument', 'offerLetter', 'aadhaarDocument'].includes(key)) return value ? String(value).slice(0, 28) : 'Not uploaded'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value
}

export function ActionButtons({ onEdit, onDelete, onView, extra = 'Approve' }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button aria-label="Edit record" className="grid h-8 w-8 place-items-center rounded-[7px] bg-slate-100 text-slate-700 transition hover:bg-slate-200" onClick={onEdit} title="Edit" type="button">
        <Pencil size={16} />
      </button>
      {onView ? (
        <button aria-label="View record" className="grid h-8 w-8 place-items-center rounded-[7px] bg-blue-50 text-blue-700 transition hover:bg-blue-100" onClick={onView} title="View" type="button">
          <Eye size={16} />
        </button>
      ) : extra && (
        <button aria-label={extra} className="grid h-8 w-8 place-items-center rounded-[7px] bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100" title={extra} type="button">
          <CheckCircle2 size={16} />
        </button>
      )}
      {onDelete && (
        <button aria-label="Delete record" className="grid h-8 w-8 place-items-center rounded-[7px] bg-rose-50 text-rose-700 transition hover:bg-rose-100" onClick={onDelete} title="Delete" type="button">
          <Trash2 size={16} />
        </button>
      )}
    </div>
  )
}

export function ExportButtons() {
  return (
    <div className="flex flex-wrap gap-2">
      <button className="export-btn" type="button"><FileSpreadsheet size={16} /> CSV</button>
      <button className="export-btn" type="button"><Download size={16} /> Excel</button>
      <button className="export-btn" type="button"><FileText size={16} /> PDF</button>
    </div>
  )
}

export function AdminModal({ open, title, children, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-slate-900/30 px-4 pb-4 pt-14 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="relative w-full max-w-3xl">
            <button className="absolute right-0 -top-11 grid h-10 w-10 place-items-center rounded-[7px] bg-white text-slate-600 shadow-xl ring-1 ring-slate-200 hover:bg-slate-50" onClick={onClose} type="button"><X size={18} /></button>
            <motion.div className="max-h-[calc(100dvh-5rem)] w-full overflow-y-auto rounded-[7px] bg-white p-6 shadow-2xl" initial={{ y: 24, scale: 0.96 }} animate={{ y: 0, scale: 1 }} exit={{ y: 24, scale: 0.96 }}>
            <div className="mb-5">
              <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            </div>
            {children}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function ConfirmDialog({ open, onClose, onConfirm }) {
  return (
    <AdminModal open={open} title="Confirm delete" onClose={onClose}>
      <p className="text-slate-500">This action will remove the selected record from the admin list.</p>
      <div className="mt-6 flex justify-end gap-2">
        <button className="rounded-[7px] bg-slate-100 px-5 py-2 text-sm font-bold text-slate-700" onClick={onClose} type="button">Cancel</button>
        <button className="rounded-[7px] bg-rose-600 px-5 py-2 text-sm font-bold text-white" onClick={onConfirm || onClose} type="button">Delete</button>
      </div>
    </AdminModal>
  )
}

export function LoadingSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[1, 2, 3].map((item) => <div className="h-32 animate-pulse rounded-[7px] bg-white ring-1 ring-slate-200" key={item} />)}
    </div>
  )
}

export function EmptyAdminState({ title = 'No records found' }) {
  return (
    <AdminCard className="text-center">
      <Search className="mx-auto text-blue-600" size={34} />
      <h3 className="mt-4 text-xl font-black text-slate-950">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">Try changing search terms, filters, or date range.</p>
    </AdminCard>
  )
}
