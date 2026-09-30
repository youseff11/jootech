import { useState } from 'react'
import { profile } from '../data/site'
import { sendContact } from '../lib/api'
import { useReveal } from '../lib/hooks'
import Icon from './Icon'

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', website: '' }

function Field({ label, name, value, onChange, error, as = 'input', ...rest }) {
  const Tag = as
  return (
    <label className={`field ${error ? 'has-error' : ''} ${as === 'textarea' ? 'field--area' : ''}`}>
      <Tag name={name} value={value} onChange={onChange} placeholder=" " aria-invalid={!!error} {...rest} />
      <span>{label}</span>
      {error && <em role="alert">{error}</em>}
    </label>
  )
}

export default function Contact() {
  const ref = useReveal()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)

  const onChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    if (errors[e.target.name]) setErrors((er) => ({ ...er, [e.target.name]: undefined }))
  }

  const validate = () => {
    const er = {}
    if (form.name.trim().length < 2) er.name = 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) er.email = 'Please enter a valid email.'
    if (form.message.trim().length < 10) er.message = 'Tell me a little more (10+ characters).'
    return er
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    const er = validate()
    setErrors(er)
    if (Object.keys(er).length) return
    setStatus('sending')
    try {
      await sendContact(form)
      setStatus('sent')
      setMessage('Thanks! Your message is in — I’ll get back to you shortly.')
      setForm(EMPTY)
    } catch (err) {
      setStatus('error')
      setErrors(err.fields || {})
      setMessage(err.message)
    }
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(profile.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      location.href = `mailto:${profile.email}`
    }
  }

  return (
    <section className="section contact" id="contact" ref={ref}>
      <div className="container contact__grid">
        <div className="contact__info" data-reveal>
          <p className="eyebrow">
            <span>04</span> Contact
          </p>
          <h2>
            Have a project in mind? <span className="grad">Let’s build it.</span>
          </h2>
          <p className="section__lead">
            Tell me about your idea, your timeline and your goals. I usually reply within 24 hours.
          </p>

          <div className="channels">
            <button className="channel" onClick={copyEmail} type="button">
              <span className="channel__icon">
                <Icon name="mail" />
              </span>
              <span>
                <small>Email</small>
                {profile.email}
              </span>
              <Icon name={copied ? 'check' : 'copy'} size={16} className="channel__end" />
            </button>
            <a className="channel" href={profile.socials.whatsapp} target="_blank" rel="noopener noreferrer">
              <span className="channel__icon">
                <Icon name="whatsapp" />
              </span>
              <span>
                <small>WhatsApp</small>
                {profile.phone}
              </span>
              <Icon name="arrowUpRight" size={16} className="channel__end" />
            </a>
            <a className="channel" href={`tel:${profile.phone.replace(/\s/g, '')}`}>
              <span className="channel__icon">
                <Icon name="phone" />
              </span>
              <span>
                <small>Phone</small>
                {profile.phone}
              </span>
              <Icon name="arrowUpRight" size={16} className="channel__end" />
            </a>
          </div>
          {copied && <p className="toast">Email copied to clipboard</p>}
        </div>

        <form className="form" onSubmit={onSubmit} noValidate data-reveal style={{ '--d': '120ms' }}>
          <div className="form__row">
            <Field label="Your name" name="name" value={form.name} onChange={onChange} error={errors.name} autoComplete="name" required />
            <Field label="Email" name="email" type="email" value={form.email} onChange={onChange} error={errors.email} autoComplete="email" required />
          </div>
          <div className="form__row">
            <Field label="Phone (optional)" name="phone" type="tel" value={form.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
            <Field label="Subject" name="subject" value={form.subject} onChange={onChange} error={errors.subject} />
          </div>
          <Field label="Tell me about your project" name="message" as="textarea" rows="5" value={form.message} onChange={onChange} error={errors.message} required />
          {/* honeypot — hidden from humans */}
          <input className="hp" type="text" name="website" tabIndex="-1" autoComplete="off" value={form.website} onChange={onChange} aria-hidden="true" />

          <button className="btn btn--primary btn--lg btn--block" disabled={status === 'sending'}>
            {status === 'sending' ? (
              <>
                <span className="spinner" /> Sending…
              </>
            ) : (
              <>
                Send message <Icon name="send" size={18} />
              </>
            )}
          </button>

          {(status === 'sent' || status === 'error') && (
            <p className={`form__note ${status === 'sent' ? 'is-ok' : 'is-err'}`} role="status">
              <Icon name={status === 'sent' ? 'check' : 'close'} size={16} /> {message}
            </p>
          )}
        </form>
      </div>
    </section>
  )
}
