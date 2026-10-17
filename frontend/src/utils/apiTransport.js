export class ApiRequestError extends Error {
  constructor(message, status = 0) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}

function statusMessage(status) {
  if (status === 401) return 'Please log in again to continue.'
  if (status === 403) return 'Your account does not have permission for this action.'
  if (status === 404) return 'The API route is unavailable. The server routing or deployment needs to be updated.'
  if (status === 429) return 'Too many requests. Please wait a moment and try again.'
  if (status >= 500) return 'The server could not complete the request. Please try again shortly.'
  return 'The request could not be completed. Please check your input and try again.'
}

export async function requestJson(url, options = {}, fetcher = fetch) {
  let response
  try {
    response = await fetcher(url, options)
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiRequestError('Unable to reach the server. Check your connection and try again.')
  }
  let payload
  try { payload = JSON.parse(await response.text()) } catch { /* Non-JSON hosting errors are handled below. */ }
  const message = typeof payload?.message === 'string' && payload.message.trim() ? payload.message : ''
  if (!response.ok) throw new ApiRequestError(message || statusMessage(response.status), response.status)
  if (!payload || typeof payload !== 'object') {
    throw new ApiRequestError('The server returned an invalid API response. Please try again shortly.', response.status)
  }
  if (payload.success === false) throw new ApiRequestError(message || 'The server could not complete this operation.', response.status)
  return payload
}
