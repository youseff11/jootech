import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { profile } from '../data/site'
import Icon from '../components/Icon'
import logo from '../assets/logo.webp'
import { AUTH_EVENT, dash, getToken, setToken } from './api'
import { ConfirmProvider, Spinner, ToastProvider } from './ui'
import Login from './Login'
import Overview from './Overview'
import Projects from './Projects'
import ProjectEditor from './ProjectEditor'
import Messages from './Messages'
import './dashboard.css'

const NAV = [
  { to: '/dashboard', icon: 'home', label: 'الرئيسية', match: (p) => p === '/dashboard' || p === '/dashboard/' },
  { to: '/dashboard/projects', icon: 'folder', label: 'المشاريع', match: (p) => p.startsWith('/dashboard/projects') },
  { to: '/dashboard/messages', icon: 'inbox', label: 'الرسائل', match: (p) => p.startsWith('/dashboard/messages'), badge: true },
]

function useDashHead() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = `لوحة التحكم — ${profile.brand}`
    const robots = document.createElement('meta')
    robots.name = 'robots'
    robots.content = 'noindex, nofollow'
    document.head.appendChild(robots)
    // Arabic UI font — loaded only for the dashboard
    const font = document.createElement('link')
    font.rel = 'stylesheet'
    font.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap'
    document.head.appendChild(font)
    document.documentElement.classList.add('is-dash')
    return () => {
      document.title = prevTitle
      robots.remove()
      font.remove()
      document.documentElement.classList.remove('is-dash')
    }
  }, [])
}

function route(path) {
  const p = path.replace(/\/+$/, '') || '/dashboard'
  let m
  if (p === '/dashboard') return { view: 'overview' }
  if (p === '/dashboard/projects') return { view: 'projects' }
  if (p === '/dashboard/projects/new') return { view: 'editor', id: null }
  if ((m = p.match(/^\/dashboard\/projects\/(\d+)$/))) return { view: 'editor', id: Number(m[1]) }
  if (p === '/dashboard/messages') return { view: 'messages', id: null }
  if ((m = p.match(/^\/dashboard\/messages\/(\d+)$/))) return { view: 'messages', id: Number(m[1]) }
  return { view: 'overview' }
}

function Shell({ path, user, onLogout }) {
  const [unread, setUnread] = useState(0)
  const r = route(path)

  const refreshUnread = useCallback(() => {
    dash
      .messages({ status: 'unread', page: 1 })
      .then((d) => setUnread(d.unread))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshUnread()
    const t = setInterval(refreshUnread, 60000)
    window.addEventListener('dash:messages', refreshUnread)
    return () => {
      clearInterval(t)
      window.removeEventListener('dash:messages', refreshUnread)
    }
  }, [refreshUnread])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [r.view, r.id])

  const initials = (user?.name || 'A').trim().slice(0, 1).toUpperCase()

  return (
    <div className="d-app">
      <aside className="d-side">
        <Link to="/dashboard" className="d-brand">
          <img src={logo} alt="" width="36" height="36" />
          <span>
            {profile.brand}
            <small>لوحة التحكم</small>
          </span>
        </Link>

        <nav className="d-nav" aria-label="القائمة">
          {NAV.map((n) => (
            <Link key={n.to} to={n.to} className={n.match(path) ? 'is-active' : ''}>
              <Icon name={n.icon} size={20} />
              <span>{n.label}</span>
              {n.badge && unread > 0 && <b className="d-badge">{unread}</b>}
            </Link>
          ))}
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Icon name="globe" size={20} />
            <span>عرض الموقع</span>
            <Icon name="arrowUpRight" size={14} className="d-nav__ext" />
          </a>
        </nav>

        <Link to="/dashboard/projects/new" className="d-btn d-btn--primary d-side__cta">
          <Icon name="plus" size={18} /> مشروع جديد
        </Link>

        <div className="d-user">
          <span className="d-avatar">{initials}</span>
          <span className="d-user__meta">
            <b>{user?.name}</b>
            <small>{user?.email || 'مدير الموقع'}</small>
          </span>
          <button className="d-icon-btn" onClick={onLogout} aria-label="تسجيل الخروج" title="تسجيل الخروج">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </aside>

      <header className="d-topbar">
        <Link to="/dashboard" className="d-brand d-brand--sm">
          <img src={logo} alt="" width="30" height="30" />
          <span>{profile.brand}</span>
        </Link>
        <div className="d-topbar__actions">
          <Link to="/dashboard/projects/new" className="d-icon-btn d-icon-btn--accent" aria-label="مشروع جديد">
            <Icon name="plus" size={20} />
          </Link>
          <button className="d-icon-btn" onClick={onLogout} aria-label="تسجيل الخروج">
            <Icon name="logout" size={18} />
          </button>
        </div>
      </header>

      <main className="d-main">
        {r.view === 'overview' && <Overview user={user} />}
        {r.view === 'projects' && <Projects />}
        {r.view === 'editor' && <ProjectEditor key={r.id ?? 'new'} id={r.id} />}
        {r.view === 'messages' && <Messages id={r.id} onUnreadChange={setUnread} />}
      </main>

      <nav className="d-tabbar" aria-label="القائمة">
        {NAV.map((n) => (
          <Link key={n.to} to={n.to} className={n.match(path) ? 'is-active' : ''}>
            <span className="d-tabbar__icon">
              <Icon name={n.icon} size={22} />
              {n.badge && unread > 0 && <b className="d-badge d-badge--dot">{unread}</b>}
            </span>
            <span>{n.label}</span>
          </Link>
        ))}
        <a href="/" target="_blank" rel="noopener noreferrer">
          <span className="d-tabbar__icon">
            <Icon name="globe" size={22} />
          </span>
          <span>الموقع</span>
        </a>
      </nav>
    </div>
  )
}

export default function Dashboard({ path }) {
  useDashHead()
  const [token, setTok] = useState(getToken)
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(!!getToken())
  const userRef = useRef(null)
  userRef.current = user

  useEffect(() => {
    const sync = () => setTok(getToken())
    window.addEventListener(AUTH_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      setChecking(false)
      return
    }
    if (userRef.current) return // just logged in — we already have the user
    setChecking(true)
    dash
      .me()
      .then((d) => setUser(d.user))
      .catch(() => {})
      .finally(() => setChecking(false))
  }, [token])

  const logout = () => {
    setToken('')
    navigate('/dashboard', { replace: true })
  }

  return (
    <div className="dash" dir="rtl" lang="ar">
      <ToastProvider>
        <ConfirmProvider>
          {checking ? (
            <div className="d-center">
              <Spinner size={28} />
            </div>
          ) : !token || !user ? (
            <Login
              onLogin={(t, u) => {
                setUser(u)
                setToken(t)
              }}
            />
          ) : (
            <Shell path={path} user={user} onLogout={logout} />
          )}
        </ConfirmProvider>
      </ToastProvider>
    </div>
  )
}
