// Dashboard API client — bearer token kept in localStorage.
import { API_BASE, invalidateProjects, rememberHero } from '../lib/api'

const TOKEN_KEY = 'jt:dash:token'
const BASE = `${API_BASE}/api/dashboard`
export const AUTH_EVENT = 'dash:auth'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem('jt:dash:me') // re-check the "Dashboard" button on the site
  } catch {
    /* storage blocked — session will just not persist */
  }
  if (!token) memo.clear()
  window.dispatchEvent(new Event(AUTH_EVENT))
}

/* ── in-memory cache: pages render instantly on revisit, then refresh in background ── */
const memo = new Map()
export const peek = (key) => memo.get(key)
export const remember = (key, value) => {
  memo.set(key, value)
  return value
}
export const forget = (...keys) => keys.forEach((k) => memo.delete(k))

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request(path, { method = 'GET', body, form } = {}) {
  const headers = { Accept: 'application/json' }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  // never spin forever: give up after 30s with a clear message
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 30000)
  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: form || (body !== undefined ? JSON.stringify(body) : undefined),
      signal: ctrl.signal,
    })
  } catch (e) {
    clearTimeout(timer)
    throw new ApiError(
      e.name === 'AbortError' ? 'السيرفر اتأخر في الرد — جرّب تاني.' : 'تعذر الاتصال بالسيرفر — تأكد إن الباك إند شغال.',
      0,
    )
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    /* empty / non-JSON */
  } finally {
    clearTimeout(timer)
  }
  if (data === null) {
    if (res.ok) throw new ApiError('رد غير متوقع من السيرفر — تأكد إن الـ API شغال على /api.', res.status)
    data = {}
  }
  if (res.status === 401 && path !== '/login/') {
    setToken('')
  }
  if (!res.ok) {
    const fields = data.errors || {}
    const first = Object.values(fields)[0]
    throw new ApiError(data.error || first || `حصل خطأ (${res.status})`, res.status, fields)
  }
  if (path === '/settings/hero/' && Object.hasOwn(data, 'hero')) rememberHero(data.hero)
  if (method === 'DELETE' && path === '/settings/hero/') rememberHero(null)
  if (method !== 'GET' && /^\/(projects|images|settings)\//.test(path)) invalidateProjects()
  return data
}

/** Multipart upload with progress (fetch has no upload progress). */
function upload(path, file, onProgress, field = 'images') {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE}${path}`)
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => {
      let data = {}
      try {
        data = JSON.parse(xhr.responseText || '{}')
      } catch {
        /* ignore */
      }
      if (xhr.status === 401) setToken('')
      if (xhr.status >= 200 && xhr.status < 300) {
        if (path === '/settings/hero/' && Object.hasOwn(data, 'hero')) rememberHero(data.hero)
        invalidateProjects()
        resolve(data)
      }
      else reject(new ApiError(data.error || data.errors?.[0] || `فشل الرفع (${xhr.status})`, xhr.status))
    }
    xhr.onerror = () => reject(new ApiError('تعذر رفع الصورة — تأكد من الإنترنت.', 0))
    const form = new FormData()
    form.append(field, file, file.name)
    xhr.send(form)
  })
}

export const dash = {
  login: (username, password) => request('/login/', { method: 'POST', body: { username, password } }),
  me: () => request('/me/'),
  stats: () => request('/stats/'),

  projects: () => request('/projects/'),
  project: (id) => request(`/projects/${id}/`),
  createProject: (data) => request('/projects/', { method: 'POST', body: data }),
  updateProject: (id, data) => request(`/projects/${id}/`, { method: 'PATCH', body: data }),
  deleteProject: (id) => request(`/projects/${id}/`, { method: 'DELETE' }),
  reorderProjects: (ids) => request('/projects/reorder/', { method: 'POST', body: { ids } }),

  uploadImage: (projectId, file, onProgress) => upload(`/projects/${projectId}/images/`, file, onProgress),
  reorderImages: (projectId, ids) => request(`/projects/${projectId}/images/reorder/`, { method: 'POST', body: { ids } }),
  deleteImage: (id) => request(`/images/${id}/`, { method: 'DELETE' }),

  messages: ({ status = 'all', q = '', page = 1 } = {}) =>
    request(`/messages/?status=${status}&q=${encodeURIComponent(q)}&page=${page}`),
  message: (id) => request(`/messages/${id}/`),
  updateMessage: (id, data) => request(`/messages/${id}/`, { method: 'PATCH', body: data }),
  deleteMessage: (id) => request(`/messages/${id}/`, { method: 'DELETE' }),
  readAll: () => request('/messages/read-all/', { method: 'POST', body: {} }),

  hero: () => request('/settings/hero/'),
  uploadHero: (file, onProgress) => upload('/settings/hero/', file, onProgress, 'image'),
  deleteHero: () => request('/settings/hero/', { method: 'DELETE' }),

  ai: (mode, text) => request('/ai/', { method: 'POST', body: { mode, text } }),
}

/** Resize + convert an image in the browser before upload (keeps requests small & fast). */
export async function compressImage(file, maxDim = 1920, quality = 0.85) {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()
    let blob = await new Promise((r) => canvas.toBlob(r, 'image/webp', quality))
    if (!blob || blob.type !== 'image/webp') blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', quality))
    if (!blob || blob.size >= file.size) return file
    const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
    const name = file.name.replace(/\.[^.]+$/, '') + '.' + ext
    return new File([blob], name, { type: blob.type })
  } catch {
    return file
  }
}
