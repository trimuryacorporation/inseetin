import { useEffect, useId, useRef, useState } from 'react'
import { Globe2 } from 'lucide-react'
import { api } from '../services/api'

const googleScriptId = 'google-identity-services'

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve()

  const existingScript = document.getElementById(googleScriptId)
  if (existingScript) {
    return new Promise((resolve, reject) => {
      existingScript.addEventListener('load', resolve, { once: true })
      existingScript.addEventListener('error', reject, { once: true })
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.id = googleScriptId
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export function GoogleAuthButton({ disabled = false, iconOnly = false, label = 'Continue with Google', onCredential }) {
  const buttonRef = useRef(null)
  const credentialRef = useRef(onCredential)
  const initializedClientRef = useRef('')
  const [clientId, setClientId] = useState(import.meta.env.VITE_GOOGLE_CLIENT_ID || '')
  const [configLoaded, setConfigLoaded] = useState(Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID))
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const buttonId = `google-btn-${useId().replace(/:/g, '')}`

  useEffect(() => {
    credentialRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let mounted = true

    api
      .googleAuthConfig()
      .then((payload) => {
        if (!mounted) return
        const config = payload.data || {}
        if (config.enabled && config.clientId) {
          setClientId(config.clientId)
          setError('')
        } else if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
          setError('Google auth is not configured.')
        }
        setConfigLoaded(true)
      })
      .catch(() => {
        if (mounted && !import.meta.env.VITE_GOOGLE_CLIENT_ID) {
          setError('Google auth is not configured.')
          setConfigLoaded(true)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!configLoaded || !clientId) {
      return undefined
    }

    let mounted = true

    loadGoogleScript()
      .then(() => {
        if (!mounted) return
        if (initializedClientRef.current !== clientId) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => credentialRef.current?.(response.credential),
          })
          initializedClientRef.current = clientId
        }
        if (buttonRef.current) {
          buttonRef.current.innerHTML = ''
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            shape: iconOnly ? 'circle' : 'pill',
            text: 'continue_with',
            type: iconOnly ? 'icon' : 'standard',
            width: iconOnly ? 44 : buttonRef.current.offsetWidth || 360,
          })
        }
        setReady(true)
      })
      .catch(() => {
        if (mounted) setError('Google sign-in could not load.')
      })

    return () => {
      mounted = false
    }
  }, [clientId, configLoaded, iconOnly])

  if (!configLoaded) {
    if (iconOnly) {
      return (
        <button aria-label="Loading Google" className="grid h-11 w-11 place-items-center rounded-[7px] border border-slate-200 bg-white text-slate-400" disabled type="button">
          <GoogleMark />
        </button>
      )
    }

    return (
      <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] border border-slate-200 bg-white px-5 text-sm font-black text-slate-600" disabled type="button">
        <Globe2 size={18} /> Loading Google...
      </button>
    )
  }

  if (!clientId || error) {
    if (iconOnly) {
      return (
        <button aria-label={error || label} className="grid h-11 w-11 place-items-center rounded-[7px] border border-slate-200 bg-white text-slate-400 opacity-60" disabled title={error || label} type="button">
          <GoogleMark />
        </button>
      )
    }

    return (
      <button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[7px] border border-slate-200 bg-white px-5 text-sm font-black text-slate-400" disabled type="button">
        <Globe2 size={18} /> {error || label}
      </button>
    )
  }

  if (iconOnly) {
    return (
      <div className={`relative h-11 w-11 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
        <button
          aria-label={label}
          className="absolute inset-0 grid h-11 w-11 place-items-center rounded-[7px] border border-[#4285F4] bg-[#4285F4] shadow-sm shadow-[#4285F4]/25 transition hover:bg-[#3367D6]"
          tabIndex={-1}
          title={label}
          type="button"
        >
          <GoogleMark />
        </button>
        {!ready && (
          <button aria-label="Loading Google" className="absolute inset-0 h-11 w-11 rounded-[7px] opacity-0" disabled type="button" />
        )}
        <div className={ready ? 'absolute inset-0 h-11 w-11 opacity-0' : 'hidden'} id={buttonId} ref={buttonRef} />
      </div>
    )
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-60' : ''}>
      {!ready && (
        <button className={`${iconOnly ? 'h-11 w-11 px-0' : 'min-h-11 w-full px-5'} inline-flex items-center justify-center gap-2 rounded-[7px] border border-slate-200 bg-white text-sm font-black text-slate-600`} disabled type="button" aria-label="Loading Google">
          <Globe2 size={18} /> {!iconOnly && 'Loading Google...'}
        </button>
      )}
      <div className={ready ? `${iconOnly ? 'grid h-11 w-11 place-items-center overflow-hidden rounded-[7px]' : 'grid min-h-11 place-items-center'}` : 'hidden'} id={buttonId} ref={buttonRef} />
    </div>
  )
}

function GoogleMark() {
  return (
    <span className="grid h-7 w-7 place-items-center rounded-full bg-white">
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.52Z" fill="#4285F4" />
        <path d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.58-4.12H3.08v2.59A9.99 9.99 0 0 0 12 22Z" fill="#34A853" />
        <path d="M6.42 13.88A6.02 6.02 0 0 1 6.1 12c0-.65.11-1.28.32-1.88V7.53H3.08A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.08 4.47l3.34-2.59Z" fill="#FBBC05" />
        <path d="M12 6c1.47 0 2.79.51 3.83 1.5l2.86-2.86A9.57 9.57 0 0 0 12 2 9.99 9.99 0 0 0 3.08 7.53l3.34 2.59C7.2 7.76 9.4 6 12 6Z" fill="#EA4335" />
      </svg>
    </span>
  )
}
