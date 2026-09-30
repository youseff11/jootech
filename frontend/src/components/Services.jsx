import { services, process } from '../data/site'
import { useReveal } from '../lib/hooks'
import Icon from './Icon'

export function Services() {
  const ref = useReveal()
  return (
    <section className="section" id="services" ref={ref}>
      <div className="container">
        <header className="section__head" data-reveal>
          <p className="eyebrow">
            <span>02</span> Services
          </p>
          <h2>
            Everything your product needs, <span className="grad">under one roof</span>
          </h2>
        </header>

        <div className="bento">
          {services.map((s, i) => (
            <article
              key={s.title}
              className={`tile ${s.wide ? 'tile--wide' : ''}`}
              data-reveal
              style={{ '--d': `${(i % 3) * 70}ms` }}
            >
              <span className="tile__icon">
                <Icon name={s.icon} size={24} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <ul className="tags">
                {s.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function Process() {
  const ref = useReveal()
  return (
    <section className="section" id="process" ref={ref}>
      <div className="container">
        <header className="section__head" data-reveal>
          <p className="eyebrow">
            <span>03</span> How I work
          </p>
          <h2>
            A clear process, <span className="grad">no surprises</span>
          </h2>
        </header>

        <ol className="steps">
          {process.map((s, i) => (
            <li key={s.n} className="step" data-reveal style={{ '--d': `${i * 90}ms` }}>
              <span className="step__n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
