import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'

/* ───────── formatting (Arabic words, Latin digits) ───────── */
const LOCALE = 'ar-EG-u-nu-latn'
export const fmtDate = (iso, opts = { day: 'numeric', month: 'short', year: 'numeric' }) =>
  iso ? new Intl.DateTimeFormat(LOCALE, opts).format(new Date(iso)) : ''
export const fmtDateTime = (iso) =>
  iso ? new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)) : ''
export const fmtNum = (n) => new Intl.NumberFormat(LOCALE).format(n ?? 0)

const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' }) : null
export function timeAgo(iso) {
  if (!iso) return ''
  const diff = (new Date(iso).getTime() - Date.now()) / 1000
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  for (const [unit, sec] of units) {
    if (Math.abs(diff) >= sec) return rtf ? rtf.format(Math.round(diff / sec), unit) : fmtDate(iso)
  }
  return 'الآن'
}

/* ───────── toasts ───────── */
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const push = useCallback((text, type = 'ok') => {
    const id = Math.random().toString(36).slice(2)
    setItems((l) => [...l, { id, text, type }])
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 3800)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="d-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`d-toast d-toast--${t.type}`}>
            <Icon name={t.type === 'err' ? 'close' : 'check'} size={16} />
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

/* ───────── confirm dialog ───────── */
const ConfirmCtx = createContext(async () => false)
export const useConfirm = () => useContext(ConfirmCtx)

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolver = useRef(null)
  const confirm = useCallback((opts) => {
    setState(typeof opts === 'string' ? { title: opts } : opts)
    return new Promise((r) => (resolver.current = r))
  }, [])
  const close = (v) => {
    resolver.current?.(v)
    setState(null)
  }
  useEffect(() => {
    if (!state) return
    const onKey = (e) => e.key === 'Escape' && close(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [state])
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {state && (
        <div className="d-modal" onClick={() => close(false)}>
          <div className="d-modal__box" role="alertdialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <span className={`d-modal__icon ${state.danger ? 'is-danger' : ''}`}>
              <Icon name={state.icon || (state.danger ? 'trash' : 'check')} size={22} />
            </span>
            <h3>{state.title}</h3>
            {state.text && <p>{state.text}</p>}
            <div className="d-modal__actions">
              <button className={`d-btn ${state.danger ? 'd-btn--danger' : 'd-btn--primary'}`} onClick={() => close(true)} autoFocus>
                {state.ok || 'تأكيد'}
              </button>
              <button className="d-btn d-btn--ghost" onClick={() => close(false)}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmCtx.Provider>
  )
}

/* ───────── small pieces ───────── */
export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`d-switch ${checked ? 'is-on' : ''}`}
      onClick={(e) => {
        e.stopPropagation()
        onChange(!checked)
      }}
    >
      <span />
    </button>
  )
}

export const Spinner = ({ size = 18 }) => <span className="d-spinner" style={{ width: size, height: size }} />

export function Empty({ icon = 'inbox', title, text, children }) {
  return (
    <div className="d-empty">
      <span className="d-empty__icon">
        <Icon name={icon} size={26} />
      </span>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {children}
    </div>
  )
}

export function Status({ published }) {
  return <span className={`d-status ${published ? 'is-live' : 'is-draft'}`}>{published ? 'منشور' : 'مسودة'}</span>
}

export function Thumb({ image, size = 56 }) {
  return image ? (
    <img className="d-thumb" src={image.thumb || image.src} alt="" loading="lazy" style={{ width: size * 1.6, height: size }} />
  ) : (
    <span className="d-thumb d-thumb--empty" style={{ width: size * 1.6, height: size }}>
      <Icon name="image" size={18} />
    </span>
  )
}
