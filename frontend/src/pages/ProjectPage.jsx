import { useCallback, useEffect, useState } from 'react'
import { Link } from '../lib/router'
import { useReveal } from '../lib/hooks'
import { profile } from '../data/site'
import Icon from '../components/Icon'
import Carousel from '../components/Carousel'

function Lightbox({ images, index, onClose, onNav }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNav(1)
      if (e.key === 'ArrowLeft') onNav(-1)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onNav])

  const img = images[index]
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={onClose}>
      <button className="lightbox__close" aria-label="Close" onClick={onClose}>
        <Icon name="close" size={22} />
      </button>
      {images.length > 1 && (
        <>
          <button className="lightbox__nav lightbox__nav--prev" aria-label="Previous image" onClick={(e) => (e.stopPropagation(), onNav(-1))}>
            <Icon name="chevronLeft" size={26} />
          </button>
          <button className="lightbox__nav lightbox__nav--next" aria-label="Next image" onClick={(e) => (e.stopPropagation(), onNav(1))}>
            <Icon name="chevronRight" size={26} />
          </button>
        </>
      )}
      <img key={img.full} src={img.full} alt="" onClick={(e) => e.stopPropagation()} />
      <p className="lightbox__count mono">
        {index + 1} / {images.length}
      </p>
    </div>
  )
}

function Detail({ p, index, next }) {
  const [slide, setSlide] = useState(0)
  const [open, setOpen] = useState(false)
  const ref = useReveal([p.id])
  const n = p.images.length

  const close = useCallback(() => setOpen(false), [])
  const nav = useCallback((d) => setSlide((s) => (s + d + n) % n), [n])

  const study = [
    { icon: 'target', label: 'The challenge', text: p.problem },
    { icon: 'bulb', label: 'The solution', text: p.solution },
    { icon: 'trend', label: 'The outcome', text: p.outcome },
  ].filter((s) => s.text)

  return (
    <main className="page" ref={ref}>
      <div className="container">
        <Link to="/#work" className="back">
          <Icon name="arrowLeft" size={16} /> All projects
        </Link>

        <section className="detail">
          <div className="detail__info" data-reveal>
            <p className="eyebrow">
              <span>{String(index + 1).padStart(2, '0')}</span> Case study
            </p>
            <h1 dir="auto">{p.title}</h1>
            <p className="detail__summary" dir="auto">
              {p.summary}
            </p>

            <dl className="facts">
              {p.year && (
                <div>
                  <dt>Year</dt>
                  <dd>{p.year}</dd>
                </div>
              )}
              <div>
                <dt>Role</dt>
                <dd>Full-stack development</dd>
              </div>
              {n > 0 && (
                <div>
                  <dt>Screens</dt>
                  <dd>{n}</dd>
                </div>
              )}
            </dl>

            {p.tech.length > 0 && (
              <ul className="tags">
                {p.tech.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            )}

            {(p.live_url || p.github_url) && (
              <div className="detail__actions">
                {p.live_url && (
                  <a className="btn btn--primary" href={p.live_url} target="_blank" rel="noopener noreferrer">
                    Visit live site <Icon name="arrowUpRight" size={16} />
                  </a>
                )}
                {p.github_url && (
                  <a className="btn btn--ghost" href={p.github_url} target="_blank" rel="noopener noreferrer">
                    <Icon name="github" size={16} /> Source code
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="detail__media" data-reveal style={{ '--d': '120ms' }}>
            <div className="detail__frame">
              <span className="detail__dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <Carousel
                variant="hero"
                images={p.images}
                alt={p.title}
                eager
                sizes="(max-width: 720px) calc(100vw - 48px), (max-width: 1024px) 660px, 600px"
                index={slide}
                onIndexChange={setSlide}
                keyboard={!open}
                onOpen={n ? () => setOpen(true) : undefined}
              />
            </div>
          </div>
        </section>

        {study.length > 0 && (
          <div className="study">
            {study.map((s, i) => (
              <article key={s.label} className="study__card" data-reveal style={{ '--d': `${i * 90}ms` }}>
                <span className="tile__icon">
                  <Icon name={s.icon} size={22} />
                </span>
                <h2>{s.label}</h2>
                <p dir="auto">{s.text}</p>
              </article>
            ))}
          </div>
        )}

        {p.paragraphs.length > 0 && (
          <section className="prose" data-reveal>
            <h2>Implementation details</h2>
            {p.paragraphs.map((t, i) => (
              <p key={i} dir="auto">
                {t}
              </p>
            ))}
          </section>
        )}

        {next && (
          <Link to={`/projects/${next.id}`} className="next" data-reveal>
            <span className="mono">Next project</span>
            <strong dir="auto">{next.title}</strong>
            <Icon name="arrowRight" size={28} />
          </Link>
        )}
      </div>

      {open && n > 0 && <Lightbox images={p.images} index={slide} onClose={close} onNav={nav} />}
    </main>
  )
}

export default function ProjectPage({ id, projects, loading, error, retry }) {
  const index = projects.findIndex((p) => String(p.id) === String(id))
  const p = projects[index]
  const next = projects.length > 1 && p ? projects[(index + 1) % projects.length] : null

  useEffect(() => {
    if (p) document.title = `${p.title} — ${profile.brand}`
    return () => {
      document.title = `${profile.name} — ${profile.role} | ${profile.brand}`
    }
  }, [p])

  if (!p) {
    return (
      <main className="page container">
        {loading ? (
          <div className="detail detail--loading">
            <div className="detail__info">
              <div className="line shimmer" style={{ width: 140 }} />
              <div className="line shimmer" style={{ width: '90%', height: 44 }} />
              <div className="line shimmer" />
              <div className="line shimmer" style={{ width: '70%' }} />
            </div>
            <div className="shimmer" style={{ aspectRatio: '16/10', borderRadius: 24 }} />
          </div>
        ) : (
          <div className="empty">
            <p>{error ? 'Couldn’t load this project.' : 'Project not found.'}</p>
            {error ? (
              <button className="btn btn--ghost" onClick={retry}>
                Try again
              </button>
            ) : (
              <Link to="/#work" className="btn btn--ghost">
                <Icon name="arrowLeft" size={16} /> All projects
              </Link>
            )}
          </div>
        )}
      </main>
    )
  }

  // key → fresh carousel state when moving to another project
  return <Detail key={p.id} p={p} index={index} next={next} />
}
