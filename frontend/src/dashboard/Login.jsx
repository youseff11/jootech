import { useState } from 'react'
import { profile } from '../data/site'
import Icon from '../components/Icon'
import logo from '../assets/logo.webp'
import { dash } from './api'
import { Spinner } from './ui'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!username || !password) return setError('اكتب اسم المستخدم وكلمة المرور.')
    setBusy(true)
    setError('')
    try {
      const d = await dash.login(username, password)
      onLogin(d.token, d.user)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="d-login">
      <div className="d-login__glow" aria-hidden="true" />
      <form className="d-login__card" onSubmit={submit} noValidate>
        <img src={logo} alt="" width="56" height="56" className="d-login__logo" />
        <h1>أهلاً بيك تاني</h1>
        <p>سجّل الدخول للوحة تحكم {profile.brand}</p>

        <label className="d-field">
          <span>اسم المستخدم</span>
          <div className="d-input d-input--icon">
            <Icon name="user" size={18} />
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus dir="ltr" />
          </div>
        </label>

        <label className="d-field">
          <span>كلمة المرور</span>
          <div className="d-input d-input--icon">
            <Icon name="lock" size={18} />
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              dir="ltr"
            />
            <button type="button" className="d-input__btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}>
              <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
            </button>
          </div>
        </label>

        {error && (
          <p className="d-alert" role="alert">
            {error}
          </p>
        )}

        <button className="d-btn d-btn--primary d-btn--lg d-btn--block" disabled={busy}>
          {busy ? <Spinner /> : 'دخول'}
        </button>
        <a href="/" className="d-login__back">
          <Icon name="arrowRight" size={16} /> رجوع للموقع
        </a>
      </form>
    </div>
  )
}
