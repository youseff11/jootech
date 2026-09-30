import { useMemo, useState } from 'react'
import { Link, navigate } from '../lib/router'
import { useReveal } from '../lib/hooks'
import Carousel from './Carousel'
import Icon from './Icon'

function ProjectCard({ p, index }) {
  const url = `/projects/${p.id}`
  return (
    <article className="card" data-reveal style={{ '--d': `${(index % 3) * 90}ms` }}>
      <div className="card__media">
        <Carousel
          images={p.images}
          alt={p.title}
          eager={index < 3}
          sizes="(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px"
          onOpen={() => navigate(url)}
        />
      </div>

      <div className="card__body">
        <div className="card__meta">
          <span className="card__num">{String(index + 1).padStart(2, '0')}</span>
          {p.year && <span className="mono">{p.year}</span>}
        </div>
        <h3 dir="auto"><Link to={url}>{p.title}</Link></h3>
        <p dir="auto">{p.summary}</p>
        <div className="card__foot">
          {p.tech.length > 0 ? (
            <ul className="tags">
              {p.tech.slice(0, p.tech.length > 3 ? 2 : 3).map((t) => (
                <li key={t}>{t}</li>
              ))}
              {p.tech.length > 3 && <li className="tags__more">+{p.tech.length - 2}</li>}
            </ul>
          ) : (
            <span />
          )}
        </div>
        <div className="card__actions">
          {p.live_url ? (
            <a className="btn btn--primary" href={p.live_url} target="_blank" rel="noopener noreferrer" aria-label={`Preview website: ${p.title}`}>
              Live preview <Icon name="arrowUpRight" size={16} />
            </a>
          ) : (
            <button className="btn btn--ghost" type="button" disabled title="This project has no live website URL">
              Preview unavailable <Icon name="globe" size={16} />
            </button>
          )}
          <Link to={url} className="btn btn--ghost" aria-label={`View details: ${p.title}`}>
            View details <Icon name="arrowRight" size={16} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function Skeleton() {
  return (
    <div className="grid">
      {[0, 1, 2].map((i) => (
        <div key={i} className="card card--skeleton">
          <div className="card__media">
            <div className="shimmer" style={{ aspectRatio: '16/10' }} />
          </div>
          <div className="card__body">
            <div className="line shimmer" style={{ width: '30%' }} />
            <div className="line shimmer" style={{ width: '80%', height: 20 }} />
            <div className="line shimmer" />
            <div className="line shimmer" style={{ width: '65%' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Work({ projects, loading, error, retry }) {
  const [filter, setFilter] = useState('All')

  const filters = useMemo(() => {
    const counts = {}
    projects.forEach((p) => p.tech.forEach((t) => (counts[t] = (counts[t] || 0) + 1)))
    const top = Object.entries(counts)
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([t]) => t)
    return top.length ? ['All', ...top] : []
  }, [projects])

  const shown = filter === 'All' ? projects : projects.filter((p) => p.tech.includes(filter))
  const ref = useReveal([shown.length, filter, loading])

  return (
    <section className="section" id="work" ref={ref}>
      <div className="container">
        <header className="section__head section__head--split" data-reveal>
          <div>
            <p className="eyebrow">
              <span>01</span> Selected work
            </p>
            <h2>
              Projects that ship <span className="grad">real results</span>
            </h2>
            <p className="section__lead">
              Platforms, stores and dashboards built end-to-end — each one a real product used by real businesses.
            </p>
          </div>
          {projects.length > 0 && (
            <p className="section__count">
              <b>{String(projects.length).padStart(2, '0')}</b>
              <span>projects</span>
            </p>
          )}
        </header>

        {filters.length > 0 && (
          <div className="filters" role="tablist" aria-label="Filter projects" data-reveal>
            {filters.map((f) => (
              <button key={f} role="tab" aria-selected={filter === f} className={filter === f ? 'is-active' : ''} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        )}

        {loading && !projects.length ? (
          <Skeleton />
        ) : error && !projects.length ? (
          <div className="empty">
            <p>Couldn’t load projects right now.</p>
            <button className="btn btn--ghost" onClick={retry}>
              <Icon name="refresh" size={16} /> Try again
            </button>
          </div>
        ) : !projects.length ? (
          <div className="empty">
            <p>New projects are on the way — check back soon.</p>
          </div>
        ) : (
          <div className="grid">
            {shown.map((p, i) => (
              <ProjectCard key={p.id} p={p} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
