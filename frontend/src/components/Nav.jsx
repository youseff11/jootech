import { useEffect, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { profile } from '../data/site'
import Icon from './Icon'
import logo from '../assets/logo.webp'
import { useIsAdmin } from '../lib/admin'

const LINKS = [
  { id: 'work', label: 'Work', icon: 'folder', desc: 'Selected projects & case studies' },
  { id: 'services', label: 'Services', icon: 'code', desc: 'What I can build for you' },
  { id: 'process', label: 'Process', icon: 'compass', desc: 'How we work together' },
  { id: 'contact', label: 'Contact', icon: 'mail', desc: 'Let’s talk about your idea' },
]

export default function Nav({ path }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  const isAdmin = useIsAdmin()

  useEffect(() => {
    let raf = 0
    const bar = document.getElementById('progress')
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - innerHeight
        if (bar) bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  // highlight the section currently in view (home page only)
  useEffect(() => {
    if (path !== '/') return setActive('')
    const els = LINKS.map((l) => document.getElementById(l.id)).filter(Boolean)
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '-45% 0px -50% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [path])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const go = (id) => (e) => {
    e.preventDefault()
    setOpen(false)
    navigate(`/#${id}`)
  }

  return (
    <>
      <div className="progress" id="progress" aria-hidden="true" />
      <header className="nav">
        <div className="nav__inner">
          <Link to="/" className="brand" aria-label={`${profile.brand} — home`} onClick={() => setOpen(false)}>
            <img src={logo} alt="" width="34" height="34" />
            <span>
              {profile.brand}
              <i>.</i>
            </span>
          </Link>

          <nav className="nav__links" aria-label="Main">
            {LINKS.map((l) => (
              <a key={l.id} href={`/#${l.id}`} onClick={go(l.id)} className={active === l.id ? 'is-active' : ''}>
                {l.label}
              </a>
            ))}
          </nav>

          {isAdmin && (
            <Link to="/dashboard" className="nav__dash" title="لوحة التحكم" aria-label="لوحة التحكم">
              <Icon name="dashboard" size={17} />
              <span>Dashboard</span>
            </Link>
          )}

          <a href="/#contact" onClick={go('contact')} className="btn btn--sm btn--primary nav__cta">
            Hire me <Icon name="arrowUpRight" size={16} />
          </a>

          <button
            className={`nav__burger ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className={`mmenu ${open ? 'is-open' : ''}`} aria-hidden={!open}>
        <div className="mmenu__backdrop" onClick={() => setOpen(false)} />
        <div className="mmenu__panel" id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu">
          <p className="mmenu__status">
            <span className="status__dot" /> Available for new projects
          </p>

          <nav className="mmenu__links" aria-label="Mobile">
            {LINKS.map((l, i) => (
              <a
                key={l.id}
                href={`/#${l.id}`}
                onClick={go(l.id)}
                className={active === l.id ? 'is-active' : ''}
                style={{ '--i': i }}
                tabIndex={open ? 0 : -1}
              >
                <span className="mmenu__icon">
                  <Icon name={l.icon} size={20} />
                </span>
                <span className="mmenu__text">
                  <b>{l.label}</b>
                  <small>{l.desc}</small>
                </span>
                <Icon name="chevronRight" size={18} className="mmenu__chev" />
              </a>
            ))}
          </nav>

          <a href="/#contact" onClick={go('contact')} className="btn btn--primary btn--lg btn--block mmenu__cta" tabIndex={open ? 0 : -1}>
            Start a project <Icon name="arrowUpRight" size={18} />
          </a>

          <div className="mmenu__foot">
            <div className="mmenu__quick">
              <a href={profile.socials.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" tabIndex={open ? 0 : -1}>
                <Icon name="whatsapp" size={19} />
              </a>
              <a href={`mailto:${profile.email}`} aria-label="Email" tabIndex={open ? 0 : -1}>
                <Icon name="mail" size={19} />
              </a>
              <a href={`tel:${profile.phone.replace(/\s/g, '')}`} aria-label="Call" tabIndex={open ? 0 : -1}>
                <Icon name="phone" size={18} />
              </a>
              <a href={profile.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" tabIndex={open ? 0 : -1}>
                <Icon name="linkedin" size={18} />
              </a>
              <a href={profile.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook" tabIndex={open ? 0 : -1}>
                <Icon name="facebook" size={18} />
              </a>
            </div>
            {isAdmin && (
              <Link to="/dashboard" className="mmenu__dash" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>
                <Icon name="dashboard" size={17} /> Dashboard
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
