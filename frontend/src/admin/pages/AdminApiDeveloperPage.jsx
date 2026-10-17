import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Copy, Download, KeyRound, RefreshCw, ShieldCheck } from 'lucide-react'
import { api } from '../../services/api'
import { getStoredUser } from '../../routes/authRouting'
import { AdminCard } from '../components/AdminPrimitives'

const expiryDefault = () => new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 16)
const initialScopes = ['jobs:read', 'companies:read', 'candidates:read', 'applications:read']
const actionLabels = { read: 'Read', create: 'Create', update: 'Edit', delete: 'Delete' }
export function AdminApiDeveloperPage() {
  const user = getStoredUser()
  return user?.role === 'Admin' ? <DeveloperWorkspace /> : <Navigate replace to="/admin" />
}
function DeveloperWorkspace() {
  const [catalog, setCatalog] = useState([])
  const [keys, setKeys] = useState([])
  const [logs, setLogs] = useState([])
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState('')
  const [name, setName] = useState('My CRM')
  const [expiresAt, setExpiresAt] = useState('')
  const [scopes, setScopes] = useState(initialScopes)
  const [secret, setSecret] = useState('')
  const [reveal, setReveal] = useState(false)
  const [selected, setSelected] = useState('jobs')
  const [clock, setClock] = useState(() => Date.now())
  const baseUrl = api.developerBaseUrl()
  const resource = catalog.find(item => item.id === selected) || catalog[0]

  useEffect(() => {
    let active = true
    Promise.all([api.developerCatalog(), api.developerKeys(), api.developerLogs(page)])
      .then(([catalogResult, keyResult, logResult]) => {
        if (!active) return
        setCatalog(catalogResult.data.resources)
        setKeys(keyResult.data)
        setLogs(logResult.data)
        setPages(Math.max(1, logResult.pagination.pages))
        setClock(Date.now())
        setError('')
      })
      .catch(err => { if (active) setError(err.message || 'API Developer could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision, page])

  const refresh = () => { setLoading(true); setRevision(value => value + 1) }
  const toggle = scope => setScopes(current => current.includes(scope) ? current.filter(item => item !== scope) : [...current, scope])
  const reset = () => { setEditing(''); setName('My CRM'); setExpiresAt(''); setScopes(initialScopes) }
  const copy = async value => {
    try { await navigator.clipboard.writeText(value); setMessage('Copied.') }
    catch { setError('Clipboard unavailable. Select and copy the value manually.') }
  }
  const save = async event => {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try {
      const body = { name, scopes, expiresAt: expiresAt ? new Date(expiresAt + 'Z').toISOString() : null }
      const result = editing ? await api.updateDeveloperKey(editing, body) : await api.createDeveloperKey(body)
      if (result.data.key) { setSecret(result.data.key); setReveal(false) }
      setMessage(editing ? 'Key permissions updated.' : 'CRM key created. Copy it now; it cannot be retrieved later.')
      reset(); refresh()
    } catch (err) { setError(err.message || 'API key could not be saved.') }
    finally { setBusy(false) }
  }
  const revoke = async key => {
    if (!window.confirm('Revoke ' + key.name + '? Your CRM will immediately lose access with this key.')) return
    setBusy(true); setError('')
    try { await api.revokeDeveloperKey(key._id); if (editing === key._id) reset(); setSecret(''); setMessage('Key revoked.'); refresh() }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  const download = async () => {
    try {
      const specification = await api.developerOpenApi()
      // The downloaded CRM documentation uses the same public address as the connection field.
      specification.servers = [{ url: baseUrl }]
      const url = URL.createObjectURL(new Blob([JSON.stringify(specification, null, 2)], { type: 'application/json' }))
      const link = document.createElement('a'); link.href = url; link.download = 'inseet-crm-openapi.json'; link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (err) { setError(err.message) }
  }
  const input = 'min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500'
  const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 disabled:opacity-50'
  const example = 'curl "' + baseUrl + '/' + (resource?.id || 'jobs') + '?page=1&limit=20" \\\n  -H "X-API-Key: YOUR_CRM_API_KEY"'

  return (
    <div className="grid min-w-0 gap-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">CRM Integration</p><h1 className="mt-1 text-2xl font-black text-slate-950">API Developer</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Connect your CRM to INSEET. Choose which records it can read, add, edit and delete.</p></div>
        <button className={button} onClick={refresh} disabled={loading} type="button"><RefreshCw size={17} /> Refresh</button>
      </div>
      {error && <p role="alert" className="break-words rounded-lg bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}
      {loading && !catalog.length ? <p role="status" className="p-6 text-slate-500">Loading developer settings...</p> : <>
        <AdminCard>
          <div className="flex flex-wrap items-center gap-2"><ShieldCheck className="text-blue-600" size={20} /><h2 className="text-lg font-bold">Connection details</h2></div>
          <p className="mt-2 text-sm leading-6 text-slate-500">Keep the API key on your CRM server. Changes affect the same live records shown in INSEET. Passwords and provider secrets are excluded from responses.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row"><input className={input + ' font-mono'} aria-label="CRM API base URL" value={baseUrl} readOnly /><button className={button} onClick={() => copy(baseUrl)} type="button"><Copy size={16} /> Copy URL</button><button className={button} onClick={download} type="button"><Download size={16} /> OpenAPI JSON</button></div>
        </AdminCard>
        {secret && <AdminCard className="border-blue-200 bg-blue-50/50">
          <h2 className="font-bold text-blue-900">New API key ? shown once</h2><p className="mt-2 text-sm text-blue-800">Copy this key into your CRM server configuration before dismissing it.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className={input + ' font-mono'} aria-label="New CRM API key" type={reveal ? 'text' : 'password'} value={secret} readOnly /><button className={button} onClick={() => copy(secret)} type="button">Copy key</button><button className={button} onClick={() => setSecret('')} type="button">Dismiss</button></div>
          <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={reveal} onChange={event => setReveal(event.target.checked)} /> Show key</label>
        </AdminCard>}
        <AdminCard>
          <form onSubmit={save} className="grid gap-4">
            <h2 className="flex items-center gap-2 text-lg font-bold"><KeyRound size={20} />{editing ? 'Edit CRM access' : 'Create CRM API key'}</h2>
            <div className="grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold">Connection name<input className={input} value={name} maxLength={80} onChange={event => setName(event.target.value)} required /></label><div className="grid gap-2"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" aria-label="Never expires" checked={!expiresAt} onChange={event => setExpiresAt(event.target.checked ? '' : expiryDefault())} /> Never expires</label>{expiresAt && <label className="grid gap-2 text-sm font-bold">Expiry (UTC)<input className={input} type="datetime-local" value={expiresAt} onChange={event => setExpiresAt(event.target.value)} required /></label>}</div></div>
            <div className="flex flex-wrap gap-2"><button className={button} type="button" onClick={() => setScopes(catalog.flatMap(item => item.actions.map(action => item.id + ':' + action)))}>Full CRM control</button><button className={button} type="button" onClick={() => setScopes(catalog.filter(item => item.actions.includes('read')).map(item => item.id + ':read'))}>Read only</button><button className={button} type="button" onClick={() => setScopes([])}>Clear selection</button></div>
            <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[520px] text-left text-sm"><thead className="bg-slate-50"><tr><th className="p-3">Resource</th>{Object.values(actionLabels).map(label => <th key={label} className="p-3 text-center">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{catalog.map(item => <tr key={item.id}><td className="p-3 font-semibold">{item.label}</td>{Object.keys(actionLabels).map(action => <td className="p-3 text-center" key={action}>{item.actions.includes(action) ? <input className="h-5 w-5 accent-blue-600" type="checkbox" aria-label={item.label + ': ' + actionLabels[action]} checked={scopes.includes(item.id + ':' + action)} onChange={() => toggle(item.id + ':' + action)} /> : <span className="text-slate-300">?</span>}</td>)}</tr>)}</tbody></table></div>
            <p className="text-xs leading-5 text-slate-500">Admin accounts and secret provider configuration stay in the Admin panel. Delete permission can remove records and their related files according to existing rules.</p>
            <div className="flex flex-wrap gap-2"><button className={button + ' !border-blue-600 !bg-blue-600 !text-white'} disabled={busy || !catalog.length || !scopes.length} type="submit">{busy ? 'Saving...' : editing ? 'Save permissions' : 'Generate API key'}</button>{editing && <button className={button} onClick={reset} type="button">Cancel edit</button>}</div>
          </form>
        </AdminCard>
        <AdminCard><h2 className="text-lg font-bold">Your CRM connections</h2><div className="mt-4 grid gap-3">{!keys.length && <p className="text-sm text-slate-500">No API keys yet. Create one above.</p>}{keys.map(key => {
          const status = key.revokedAt ? 'Revoked' : key.expiresAt && new Date(key.expiresAt).getTime() <= clock ? 'Expired' : 'Active'
          return <div className="flex flex-col justify-between gap-3 rounded-lg border border-slate-200 p-4 lg:flex-row lg:items-center" key={key._id}><div className="min-w-0"><p className="font-bold">{key.name} <span className="ml-2 text-xs text-blue-600">{status}</span></p><p className="mt-1 break-words font-mono text-xs text-slate-500">{key.prefix}???? ? {key.scopes.length} permissions</p><p className="mt-1 text-xs text-slate-500">Expires: {key.expiresAt ? new Date(key.expiresAt).toLocaleString() : 'Never'} ? Last used: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}</p><details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">View permissions</summary><p className="mt-2 break-words leading-6">{key.scopes.join(', ')}</p></details></div><div className="flex flex-wrap gap-2"><button className={button} disabled={busy || !!key.revokedAt} onClick={() => { setEditing(key._id); setName(key.name); setExpiresAt(key.expiresAt ? new Date(key.expiresAt).toISOString().slice(0,16) : ''); setScopes(key.scopes); window.scrollTo({ top: 0, behavior: 'smooth' }) }} type="button">Edit access</button><button className={button + ' text-rose-700'} disabled={busy || !!key.revokedAt} onClick={() => revoke(key)} type="button">Revoke</button></div></div>
        })}</div></AdminCard>
        <AdminCard><h2 className="text-lg font-bold">API guide</h2><p className="mt-2 text-sm leading-6 text-slate-500">GET reads records, POST creates, PUT/PATCH edits, DELETE removes by ID. Every request needs its resource permission. Lists return data plus pagination; request each page to export all records. Store returned IDs in your CRM for later edits and deletes.</p><label className="mt-4 grid gap-2 text-sm font-bold">Resource<select className={input} value={selected} onChange={event => setSelected(event.target.value)}>{catalog.map(item => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-blue-100">{resource?.singleton ? 'GET or PUT/PATCH ' + baseUrl + '/' + resource.id : example + '\n\nPOST ' + baseUrl + '/' + (resource?.id || 'jobs') + '\nPUT / PATCH / DELETE ' + baseUrl + '/' + (resource?.id || 'jobs') + '/RECORD_ID'}</pre>
          <p className="mt-3 text-xs leading-6 text-slate-500">Use Content-Type: application/json for writes. Filters: documented field names, search, sort, page, limit (1?100), updatedSince (ISO date). updatedSince does not include deleted records. Website branding updates merge with saved fields.</p>
          <details className="mt-4"><summary className="cursor-pointer text-sm font-bold">Input fields for {resource?.label}</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-xs"><thead><tr><th className="p-2">Field</th><th className="p-2">Type</th><th className="p-2">Required on create</th><th className="p-2">Allowed values</th></tr></thead><tbody>{resource?.fields.map(field => <tr key={field.name} className="border-t border-slate-100"><td className="p-2 font-mono">{field.name}</td><td className="p-2">{field.type}</td><td className="p-2">{field.required ? 'Yes' : 'No'}</td><td className="p-2">{field.enum?.join(', ') || '?'}</td></tr>)}</tbody></table></div></details>
        </AdminCard>
        <AdminCard><h2 className="text-lg font-bold">CRM request history</h2><p className="mt-1 text-xs text-slate-500">Metadata only; API keys and request/response bodies are not stored here. Status 0 means the request has not completed.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-xs"><thead className="bg-slate-50"><tr>{['Time','Method','Resource','Status','Duration','Request ID'].map(label => <th className="p-3" key={label}>{label}</th>)}</tr></thead><tbody>{logs.map(log => <tr className="border-t border-slate-100" key={log._id}><td className="whitespace-nowrap p-3">{new Date(log.createdAt).toLocaleString()}</td><td className="p-3 font-bold">{log.method}</td><td className="p-3">{log.resource}</td><td className="p-3">{log.statusCode || 'Pending'}</td><td className="p-3">{log.durationMs ?? '?'} ms</td><td className="p-3 font-mono">{log.requestId}</td></tr>)}</tbody></table>{!logs.length && <p className="p-4 text-sm text-slate-500">Your CRM requests will appear here.</p>}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-slate-500">Page {page} of {pages}</span><div className="flex gap-2"><button className={button} disabled={page <= 1} onClick={() => setPage(value => value-1)} type="button">Previous</button><button className={button} disabled={page >= pages} onClick={() => setPage(value => value+1)} type="button">Next</button></div></div></AdminCard>
      </>}
    </div>
  )
}
