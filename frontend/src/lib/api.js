// API client with an instant-render cache (stale-while-revalidate).
const env = (import.meta && import.meta.env) || {}
export const API_BASE = (env.VITE_API_URL || '').replace(/\/$/, '')

const CACHE_KEY = 'jt:projects:v2'
const CHANGE_KEY = 'jt:projects:changed'
export const PROJECTS_CHANGED = 'projects:changed'
let inflight = null
let revision = 0

export function invalidateProjects(broadcast = true) {
  revision += 1
  inflight = null
  try {
    sessionStorage.removeItem(CACHE_KEY)
    sessionStorage.removeItem('jt:projects:v1')
    if (broadcast) localStorage.setItem(CHANGE_KEY, `${Date.now()}:${revision}`)
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(PROJECTS_CHANGED))
}

window.addEventListener('storage', (event) => {
  if (event.key === CHANGE_KEY) invalidateProjects(false)
})

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    const cached = raw ? JSON.parse(raw) : null
    return cached && Date.now() - cached.savedAt < 60000 ? cached.data : null
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), data }))
  } catch {
    /* storage unavailable — ignore */
  }
}

export const cachedProjects = () => readCache()

export function fetchProjects({ force = false } = {}) {
  if (force) {
    revision += 1
    inflight = null
  }
  if (inflight && !force) return inflight
  const requestRevision = revision
  // A unique URL also bypasses responses cached by an older deployment.
  const pending = fetch(`${API_BASE}/api/projects/?fresh=${Date.now()}-${requestRevision}`, { cache: 'no-store', headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`API ${r.status}`)
      return r.json()
    })
    .then((data) => {
      if (requestRevision !== revision) return fetchProjects()
      writeCache(data)
      return data
    })
    .catch((error) => {
      if (requestRevision !== revision) return fetchProjects()
      throw error
    })
    .finally(() => {
      if (inflight === pending) inflight = null
    })
  inflight = pending
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
