// API client with an instant-render cache (stale-while-revalidate).
const env = (import.meta && import.meta.env) || {}
export const API_BASE = (env.VITE_API_URL || '').replace(/\/$/, '')

const CACHE_KEY = 'jt:projects:v1'
let inflight = null

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
  } catch {
    /* storage unavailable — ignore */
  }
}

export const cachedProjects = () => readCache()

export function fetchProjects({ force = false } = {}) {
  if (inflight && !force) return inflight
  inflight = fetch(`${API_BASE}/api/projects/`, { headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`API ${r.status}`)
      return r.json()
    })
    .then((data) => {
      writeCache(data)
      return data
    })
    .catch((err) => {
      inflight = null
      throw err
    })
  return inflight
}

export async function sendContact(payload) {
  const r = await fetch(`${API_BASE}/api/contact/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  })
  let data = {}
  try {
    data = await r.json()
  } catch {
    /* non-JSON error */
  }
  if (!r.ok || !data.ok) {
    const err = new Error(data.error || 'Something went wrong. Please try again.')
    err.fields = data.errors || {}
    throw err
  }
  return data
}
