/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react'

export function useApiResource(fetcher, fallback, deps = []) {
  const [data, setData] = useState(fallback)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false

    setLoading(true)
    setError('')
    Promise.resolve().then(fetcher)
      .then((payload) => {
        if (!ignore) {
          setData(payload.data ?? fallback)
          setError('')
        }
      })
      .catch((err) => {
        if (!ignore) {
          setData(fallback)
          setError(err?.message || 'Data could not be loaded.')
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, deps)

  return { data, error, loading }
}
