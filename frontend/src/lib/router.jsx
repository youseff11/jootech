// Minimal client-side router (no dependency) — two routes are all we need.
import { useEffect, useState } from 'react'

const EVENT = 'app:navigate'

export function navigate(to, { replace = false } = {}) {
  const url = new URL(to, location.href)
  const samePage = url.pathname === location.pathname
  history[replace ? 'replaceState' : 'pushState']({}, '', url.pathname + url.search + url.hash)
  window.dispatchEvent(new Event(EVENT))
  if (url.hash) {
    // wait for the target page to render, then scroll to the section
    requestAnimationFrame(() => setTimeout(() => scrollToId(url.hash.slice(1)), samePage ? 0 : 60))
  } else if (!samePage) {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
}

export function scrollToId(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export function usePath() {
  const [path, setPath] = useState(location.pathname)
  useEffect(() => {
    const update = () => setPath(location.pathname)
    window.addEventListener('popstate', update)
    window.addEventListener(EVENT, update)
    return () => {
      window.removeEventListener('popstate', update)
      window.removeEventListener(EVENT, update)
    }
  }, [])
  return path
}

export function Link({ to, onClick, children, ...rest }) {
  const handle = (e) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(to)
  }
  return (
    <a href={to} onClick={handle} {...rest}>
      {children}
    </a>
  )
}
