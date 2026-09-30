import { useEffect, useRef, useState } from 'react'
import { profile, highlights } from '../data/site'
import { navigate } from '../lib/router'
import { prefersReducedMotion, useCountUp } from '../lib/hooks'
import Icon from './Icon'
import heroAvif from '../assets/hero.avif'
import heroWebp from '../assets/hero.webp'

function Rotator({ words }) {
  const [i, setI] = useState(0)
  useEffect(() => {
    if (prefersReducedMotion()) return
    const t = setInterval(() => setI((n) => (n + 1) % words.length), 2400)
    return () => clearInterval(t)
  }, [words.length])
  return (
    <span className="rotator" aria-live="polite">
      <span key={i} className="rotator__word">
        {words[i]}
      </span>
    </span>
  )
}

function Portrait() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el || prefersReducedMotion() || !matchMedia('(pointer:fine)').matches) return
    let raf = 0
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - 0.5
        const y = e.clientY / innerHeight - 0.5
        el.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`)
        el.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  return (
    <div className="portrait" ref={ref}>
      <div className="portrait__ring" aria-hidden="true" />
      <div className="portrait__ring portrait__ring--2" aria-hidden="true" />
      <picture>
        <source srcSet={heroAvif} type="image/avif" />
        <img
          src={heroWebp}
          alt={`${profile.name} — ${profile.role}`}
          width="527"
          height="582"
          fetchPriority="high"
          decoding="async"
        />
      </picture>
      <span className="chip-float chip-float--a">
        <Icon name="code" size={16} /> Django
      </span>
      <span className="chip-float chip-float--b">
        <Icon name="zap" size={16} /> React
      </span>
      <span className="chip-float chip-float--c">
        <Icon name="database" size={16} /> PostgreSQL
      </span>
    </div>
  )
}

function Stat({ value, label }) {
  const [ref, n] = useCountUp(value)
  return (
    <div className="stat" ref={ref}>
      <b>{value ? `${n}+` : '—'}</b>
      <span>{label}</span>
    </div>
  )
}

export default function Hero({ projectCount }) {
  const to = (id) => (e) => {
    e.preventDefault()
    navigate(`/#${id}`)
  }
  return (
    <section className="hero" id="top">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="status">
            <span className="status__dot" /> Available for new projects
          </p>
          <p className="hero__name">
            Hi, I’m <strong>{profile.name}</strong> — {profile.role}
          </p>
          <h1 className="hero__title">
            {profile.headline[0]} <span className="grad">{profile.headline[1]}</span> {profile.headline[2]}
          </h1>
          <p className="hero__sub">
            Specialised in <Rotator words={profile.rotating} />
          </p>
          <p className="hero__intro">{profile.intro}</p>

          <div className="hero__actions">
            <a href="/#work" onClick={to('work')} className="btn btn--primary btn--lg">
              View my work <Icon name="arrowRight" size={18} />
            </a>
            <a href="/#contact" onClick={to('contact')} className="btn btn--ghost btn--lg">
              Let’s talk
            </a>
          </div>

          <div className="hero__stats">
            <Stat value={projectCount} label="Projects shipped" />
            {highlights.map((h) => (
              <div className="stat" key={h.k}>
                <b className="stat__text">{h.k}</b>
                <span>{h.v}</span>
              </div>
            ))}
          </div>
        </div>

        <Portrait />
      </div>

      <a href="/#work" onClick={to('work')} className="scroll-cue" aria-label="Scroll to projects">
        <span />
      </a>
    </section>
  )
}
