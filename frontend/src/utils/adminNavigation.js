// Match one leaf, preferring the most specific path and query over its parent.
export function getActiveSidebarTarget(items, location) {
  const pathname = location.pathname
  const current = new URLSearchParams(location.search || '')
  let target = null
  let bestScore = -1
  for (const item of items.flatMap(item => item.children?.length ? item.children : [item])) {
    const [path, search = ''] = item.to.split('?')
    const matchesPath = pathname === path || (path !== '/admin' && pathname.startsWith(path + '/')) || item.activePaths?.some(prefix => pathname.startsWith(prefix))
    if (!matchesPath) continue
    const expected = new URLSearchParams(search)
    if (![...expected].every(([key, value]) => (current.get(key) ?? (path === '/admin/users' && key === 'q' ? current.get('role') : null)) === value)) continue
    const score = path.length * 100 + [...expected].length
    if (score > bestScore) { bestScore = score; target = item.to }
  }
  return target
}
