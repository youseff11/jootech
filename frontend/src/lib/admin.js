// Shows the "Dashboard" button only to a logged-in superuser.
// Regular visitors have no token, so no request is ever made for them.
import { useEffect, useState } from 'react'
import { API_BASE } from './api'

const TOKEN_KEY = 'jt:dash:token'
const CACHE_KEY = 'jt:dash:me'

const read = (store, key) => {
  try {
    return store.getItem(key)
  } catch {
    return null
  }
}

export function useIsAdmin() {
  const [admin, setAdmin] = useState(() => read(sessionStorage, CACHE_KEY) === '1')

  useEffect(() => {
    const token = read(localStorage, TOKEN_KEY)
    if (!token) return setAdmin(false)
    const cached = read(sessionStorage, CACHE_KEY)
    if (cached !== null) return setAdmin(cached === '1')

    let alive = true
    fetch(`${API_BASE}/api/dashboard/me/`, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const ok = !!d?.user?.is_superuser
        try {
          sessionStorage.setItem(CACHE_KEY, ok ? '1' : '0')
        } catch {
          /* ignore */
        }
        if (alive) setAdmin(ok)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return admin
}
