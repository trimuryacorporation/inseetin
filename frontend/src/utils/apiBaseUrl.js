const PUBLIC_API_ORIGIN = 'https://inseet.in'

export function resolveApiBaseUrl({ hostname = '', origin = '', configuredUrl = '', localUrl = '' } = {}) {
  if (['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)) {
    return localUrl || 'http://localhost:5050'
  }
  // Public requests and CRM URLs always use the INSEET domain, even with an old hosting env value.
  if (['inseet.in', 'www.inseet.in'].includes(hostname)) return origin || PUBLIC_API_ORIGIN
  if (configuredUrl) {
    try {
      if (!['inseet.in', 'www.inseet.in'].includes(new URL(configuredUrl).hostname)) return configuredUrl
    } catch { /* Ignore an invalid environment URL and use the current site. */ }
  }
  return origin || PUBLIC_API_ORIGIN
}
