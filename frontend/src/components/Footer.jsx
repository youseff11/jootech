import { profile } from '../data/site'
import { Link } from '../lib/router'
import Icon from './Icon'

export default function Footer() {
  const s = profile.socials
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__cta">
          <p className="footer__big">
            Let’s make something <span className="grad">great</span>.
          </p>
          <a className="btn btn--primary btn--lg" href={`mailto:${profile.email}`}>
            {profile.email} <Icon name="arrowUpRight" size={18} />
          </a>
        </div>

        <div className="footer__bar">
          <Link to="/" className="brand brand--sm">
            <span>
              {profile.brand}
              <i>.</i>
            </span>
          </Link>
          <p>
            © {new Date().getFullYear()} {profile.name}. Built with React & Django.
          </p>
          <div className="socials">
            <a href={s.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <Icon name="linkedin" size={18} />
            </a>
            <a href={s.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <Icon name="facebook" size={18} />
            </a>
            <a href={s.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <Icon name="whatsapp" size={18} />
            </a>
            <a href={`mailto:${profile.email}`} aria-label="Email">
              <Icon name="mail" size={18} />
            </a>
            <button className="totop" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top">
              <Icon name="arrowUp" size={18} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}
