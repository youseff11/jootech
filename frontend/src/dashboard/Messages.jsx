import { useCallback, useEffect, useRef, useState } from 'react'
import { navigate } from '../lib/router'
import Icon from '../components/Icon'
import { dash, peek, remember } from './api'
import { Empty, Spinner, fmtDateTime, timeAgo, useConfirm, useToast } from './ui'

const TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'unread', label: 'غير مقروءة' },
  { id: 'read', label: 'مقروءة' },
]

const notify = () => window.dispatchEvent(new Event('dash:messages'))

function Reader({ msg, onBack, onToggleRead, onDelete }) {
  const phone = (msg.phone || '').replace(/[^\d+]/g, '')
  const wa = phone ? `https://wa.me/${phone.replace(/^\+/, '').replace(/^0/, '20')}` : ''
  const reply = `mailto:${msg.email}?subject=${encodeURIComponent(`Re: ${msg.subject || 'رسالتك من الموقع'}`)}`
  return (
    <article className="d-reader">
      <header className="d-reader__head">
        <button className="d-icon-btn d-reader__back" onClick={onBack} aria-label="رجوع للرسائل">
          <Icon name="arrowRight" size={18} />
        </button>
        <div className="d-reader__tools">
          <button className="d-icon-btn" onClick={onToggleRead} title={msg.is_read ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة'} aria-label={msg.is_read ? 'تعليم كغير مقروءة' : 'تعليم كمقروءة'}>
            <Icon name={msg.is_read ? 'mail' : 'mailOpen'} size={18} />
          </button>
          <button className="d-icon-btn d-icon-btn--danger" onClick={onDelete} title="حذف" aria-label="حذف">
            <Icon name="trash" size={18} />
          </button>
        </div>
      </header>

      <h2 className="d-reader__subject" dir="auto">
        {msg.subject || 'بدون موضوع'}
      </h2>

      <div className="d-reader__from">
        <span className="d-avatar">{msg.name.slice(0, 1)}</span>
        <div>
          <b dir="auto">{msg.name}</b>
          <a href={`mailto:${msg.email}`} dir="ltr">
            {msg.email}
          </a>
        </div>
        <time>{fmtDateTime(msg.created_at)}</time>
      </div>

      {msg.phone && (
        <p className="d-reader__phone">
          <Icon name="phone" size={16} />
          <a href={`tel:${phone}`} dir="ltr">
            {msg.phone}
          </a>
        </p>
      )}

      <div className="d-reader__body" dir="auto">
        {msg.message}
      </div>

      <div className="d-reader__actions">
        <a className="d-btn d-btn--primary" href={reply}>
          <Icon name="reply" size={18} /> رد بالإيميل
        </a>
        {wa && (
          <a className="d-btn d-btn--ghost" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={18} /> واتساب
          </a>
        )}
      </div>
    </article>
  )
}

export default function Messages({ id, onUnreadChange }) {
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const first = peek('msgs:all:')
  const [list, setList] = useState(first?.list || [])
  const [meta, setMeta] = useState(first?.meta || { page: 1, pages: 1, count: 0, unread: 0 })
  const [loading, setLoading] = useState(!first)
  const [more, setMore] = useState(false)
  const [error, setError] = useState('')
  const [current, setCurrent] = useState(null)
  const toast = useToast()
  const confirm = useConfirm()
  const reqId = useRef(0)

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const load = useCallback(
    async (page = 1) => {
      const my = ++reqId.current
      const key = `msgs:${tab}:${query}`
      const hit = page === 1 && peek(key)
      if (hit) {
        setList(hit.list)
        setMeta(hit.meta)
      }
      page === 1 ? setLoading(!hit) : setMore(true)
      try {
        const d = await dash.messages({ status: tab, q: query, page })
        if (my !== reqId.current) return
        setList((l) => (page === 1 ? d.results : [...l, ...d.results]))
        const m = { page: d.page, pages: d.pages, count: d.count, unread: d.unread }
        setMeta(m)
        if (page === 1) remember(key, { list: d.results, meta: m })
        onUnreadChange?.(d.unread)
        setError('')
      } catch (e) {
        if (my === reqId.current) setError(e.message)
      } finally {
        if (my === reqId.current) {
          setLoading(false)
          setMore(false)
        }
      }
    },
    [tab, query, onUnreadChange],
  )

  useEffect(() => {
    load(1)
  }, [load])

  // open a message (from URL) and mark it read
  useEffect(() => {
    if (!id) return setCurrent(null)
    const inList = list.find((m) => m.id === id)
    if (inList) setCurrent(inList)
    else
      dash
        .message(id)
        .then((d) => setCurrent(d.message))
        .catch((e) => toast(e.message, 'err'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    if (!current || current.is_read) return
    dash
      .updateMessage(current.id, { is_read: true })
      .then(() => {
        setCurrent((c) => (c && c.id === current.id ? { ...c, is_read: true } : c))
        setList((l) => l.map((m) => (m.id === current.id ? { ...m, is_read: true } : m)))
        setMeta((m) => ({ ...m, unread: Math.max(0, m.unread - 1) }))
        onUnreadChange?.((u) => Math.max(0, u - 1))
        notify()
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  const open = (m) => navigate(`/dashboard/messages/${m.id}`)

  const toggleRead = async () => {
    const value = !current.is_read
    try {
      await dash.updateMessage(current.id, { is_read: value })
      setCurrent({ ...current, is_read: value })
      setList((l) => l.map((m) => (m.id === current.id ? { ...m, is_read: value } : m)))
      setMeta((m) => ({ ...m, unread: Math.max(0, m.unread + (value ? -1 : 1)) }))
      notify()
      toast(value ? 'اتعلّمت كمقروءة' : 'اتعلّمت كغير مقروءة')
      if (!value) navigate('/dashboard/messages')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const remove = async () => {
    const ok = await confirm({ title: 'حذف الرسالة؟', text: `رسالة ${current.name} هتتحذف نهائياً.`, ok: 'احذف', danger: true })
    if (!ok) return
    try {
      await dash.deleteMessage(current.id)
      setList((l) => l.filter((m) => m.id !== current.id))
      setMeta((m) => ({ ...m, count: m.count - 1 }))
      notify()
      toast('الرسالة اتحذفت')
      navigate('/dashboard/messages', { replace: true })
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const readAll = async () => {
    try {
      await dash.readAll()
      setList((l) => l.map((m) => ({ ...m, is_read: true })))
      setMeta((m) => ({ ...m, unread: 0 }))
      onUnreadChange?.(0)
      notify()
      toast('كل الرسائل اتعلّمت كمقروءة')
      if (tab === 'unread') load(1)
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  return (
    <div className={`d-page d-inbox ${current ? 'has-open' : ''}`}>
      <header className="d-head">
        <div>
          <h1>الرسائل</h1>
          <p className="d-head__sub">
            {meta.count} رسالة{meta.unread ? ` · ${meta.unread} غير مقروءة` : ''}
          </p>
        </div>
        {meta.unread > 0 && (
          <div className="d-head__actions">
            <button className="d-btn d-btn--ghost" onClick={readAll}>
              <Icon name="check" size={18} /> تعليم الكل كمقروء
            </button>
          </div>
        )}
      </header>

      <div className="d-inbox__grid">
        <section className="d-card d-inbox__list">
          <div className="d-inbox__tools">
            <div className="d-input d-input--icon">
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر في الرسائل…" />
            </div>
            <div className="d-seg d-seg--sm" role="tablist">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => setTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="d-alert">{error}</p>}
          {loading ? (
            <div className="d-center d-center--block">
              <Spinner size={24} />
            </div>
          ) : !list.length ? (
            <Empty icon="inbox" title={query ? 'مفيش نتايج' : tab === 'unread' ? 'مفيش رسائل جديدة' : 'مفيش رسائل'} text={query ? 'جرّب كلمة تانية.' : 'الرسائل اللي بتيجي من فورم التواصل بتظهر هنا.'} />
          ) : (
            <ul className="d-mlist">
              {list.map((m) => (
                <li key={m.id}>
                  <button className={`d-mitem ${!m.is_read ? 'is-unread' : ''} ${current?.id === m.id ? 'is-active' : ''}`} onClick={() => open(m)}>
                    <span className="d-avatar d-avatar--sm">{m.name.slice(0, 1)}</span>
                    <span className="d-mitem__text">
                      <span className="d-mitem__top">
                        <b dir="auto">{m.name}</b>
                        <time>{timeAgo(m.created_at)}</time>
                      </span>
                      <span className="d-mitem__subject" dir="auto">
                        {m.subject || 'بدون موضوع'}
                      </span>
                      <span className="d-mitem__snippet" dir="auto">
                        {m.message}
                      </span>
                    </span>
                    {!m.is_read && <i className="d-dot" aria-label="غير مقروءة" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!loading && meta.page < meta.pages && (
            <button className="d-btn d-btn--ghost d-btn--block d-inbox__more" onClick={() => load(meta.page + 1)} disabled={more}>
              {more ? <Spinner /> : 'تحميل المزيد'}
            </button>
          )}
        </section>

        <section className="d-card d-inbox__view">
          {current ? (
            <Reader msg={current} onBack={() => navigate('/dashboard/messages')} onToggleRead={toggleRead} onDelete={remove} />
          ) : (
            <Empty icon="mailOpen" title="اختار رسالة" text="اضغط على أي رسالة من القائمة عشان تقراها وترد عليها." />
          )}
        </section>
      </div>
    </div>
  )
}
