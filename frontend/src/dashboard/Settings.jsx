import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import defaultHero from '../assets/hero.webp'
import { compressImage, dash, peek, remember } from './api'
import { Spinner, fmtDateTime, useConfirm, useToast } from './ui'

const clearSiteCache = () => {
  try {
    sessionStorage.removeItem('jt:projects:v1') // so your own browser shows the new photo right away
  } catch {
    /* ignore */
  }
}

export default function Settings() {
  const [hero, setHeroState] = useState(() => peek('hero')) // undefined = loading, null = default photo
  const setHero = (h) => setHeroState(remember('hero', h))
  const [error, setError] = useState('')
  const [preview, setPreview] = useState('')
  const [progress, setProgress] = useState(null)
  const [over, setOver] = useState(false)
  const input = useRef(null)
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    dash
      .hero()
      .then((d) => setHero(d.hero))
      .catch((e) => {
        setError(e.message)
        setHeroState((h) => (h === undefined ? null : h))
      })
  }, [])

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  const upload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('اختار ملف صورة', 'err')
    const local = URL.createObjectURL(file)
    setPreview(local)
    setProgress(0)
    try {
      const small = await compressImage(file, 1400, 0.9)
      const d = await dash.uploadHero(small, setProgress)
      setHero(d.hero)
      clearSiteCache()
      toast('الصورة اتغيرت — هتظهر على الموقع خلال دقايق')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setProgress(null)
      setPreview('')
    }
  }

  const reset = async () => {
    const ok = await confirm({
      title: 'ترجع للصورة الأصلية؟',
      text: 'الصورة اللي رفعتها هتتحذف والموقع هيرجع يعرض الصورة الافتراضية.',
      ok: 'رجّع الأصلية',
      icon: 'undo',
    })
    if (!ok) return
    try {
      await dash.deleteHero()
      setHero(null)
      clearSiteCache()
      toast('رجعت الصورة الأصلية')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const shown = preview || hero?.src || defaultHero
  const busy = progress !== null

  return (
    <div className="d-page">
      <header className="d-head">
        <div>
          <h1>صورتي</h1>
          <p className="d-head__sub">الصورة اللي بتظهر في أول صفحة البروتفوليو جنب الحلقة المضيئة.</p>
        </div>
      </header>

      {error && <p className="d-alert">{error}</p>}

      <div className="d-hero-set">
        <section className="d-card d-card--pad d-hero-set__preview">
          <div className="d-card__head">
            <h2>
              <Icon name="eye" size={18} /> المعاينة
            </h2>
            <span className={`d-status ${hero ? 'is-live' : 'is-draft'}`}>{hero ? 'صورة مخصّصة' : 'الصورة الأصلية'}</span>
          </div>
          <div className="d-portrait">
            <span className="d-portrait__ring" aria-hidden="true" />
            {hero === undefined ? (
              <Spinner size={26} />
            ) : (
              <img key={shown} src={shown} alt="صورتك الحالية" className={busy ? 'is-busy' : ''} />
            )}
            {busy && (
              <span className="d-portrait__progress">
                <b>{Math.round(progress * 100)}%</b>
                <i style={{ transform: `scaleX(${progress})` }} />
              </span>
            )}
          </div>
          {hero?.updated_at && (
            <p className="d-muted d-hero-set__date">
              <Icon name="calendar" size={14} /> آخر تغيير {fmtDateTime(hero.updated_at)}
            </p>
          )}
        </section>

        <section className="d-card d-card--pad">
          <div className="d-card__head">
            <h2>
              <Icon name="upload" size={18} /> تغيير الصورة
            </h2>
          </div>

          <div
            className={`d-drop ${over ? 'is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setOver(true)
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setOver(false)
              !busy && upload(e.dataTransfer.files[0])
            }}
            onClick={() => !busy && input.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !busy && input.current?.click()}
          >
            <span className="d-drop__icon">{busy ? <Spinner size={22} /> : <Icon name="image" size={24} />}</span>
            <b>{busy ? 'بيترفع…' : 'اسحب صورتك هنا أو اضغط للاختيار'}</b>
            <small>بتتضغط لـ WebP تلقائياً وبتحافظ على الخلفية الشفافة.</small>
            <input ref={input} type="file" accept="image/*" hidden onChange={(e) => (upload(e.target.files[0]), (e.target.value = ''))} />
          </div>

          <ul className="d-tips">
            <li>
              <Icon name="check" size={16} /> صورة طولية (زي 9:10) بتطلع أحسن حاجة.
            </li>
            <li>
              <Icon name="check" size={16} /> خلفية داكنة أو شفافة (PNG) بتندمج مع تصميم الموقع.
            </li>
            <li>
              <Icon name="check" size={16} /> مقاس 800 بكسل عرض أو أكتر عشان تفضل واضحة.
            </li>
          </ul>

          {hero && (
            <button type="button" className="d-btn d-btn--ghost d-btn--block" onClick={reset} disabled={busy}>
              <Icon name="undo" size={16} /> رجوع للصورة الأصلية
            </button>
          )}
        </section>
      </div>
    </div>
  )
}
