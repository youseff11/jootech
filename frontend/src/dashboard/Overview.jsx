import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '../lib/router'
import Icon from '../components/Icon'
import { dash } from './api'
import { Empty, Spinner, Status, Thumb, fmtDate, fmtNum, timeAgo } from './ui'

function StatTile({ icon, label, value, sub, tone, to }) {
  const body = (
    <>
      <span className={`d-stat__icon ${tone ? `is-${tone}` : ''}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="d-stat__label">{label}</span>
      <b className="d-stat__value">{fmtNum(value)}</b>
      {sub && <span className="d-stat__sub">{sub}</span>}
    </>
  )
  return to ? (
    <Link to={to} className="d-card d-stat">
      {body}
    </Link>
  ) : (
    <div className="d-card d-stat">{body}</div>
  )
}

/** Single-series bar chart: messages per day (last 30 days). */
function DailyChart({ data }) {
  const [hover, setHover] = useState(null)
  const box = useRef(null)
  const [W, setW] = useState(720)
  // draw at the real pixel width so labels stay readable on phones
  useEffect(() => {
    const el = box.current
    if (!el || !('ResizeObserver' in window)) return
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const H = W < 480 ? 190 : 230
  const every = W < 480 ? 7 : 5
  const pad = { t: 16, r: 8, b: 28, l: 34 }
  const max = Math.max(4, ...data.map((d) => d.count))
  const nice = Math.ceil(max / 4) * 4
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const step = iw / data.length
  const bw = Math.max(3, step - 4) // 2px gap each side
  const y = (v) => pad.t + ih - (v / nice) * ih
  const ticks = [0, nice / 2, nice]
  const total = data.reduce((s, d) => s + d.count, 0)

  return (
    <div className="d-chart" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`رسائل آخر 30 يوم: ${total}`} dir="ltr" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="d-chart__grid" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="d-chart__axis">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = pad.l + i * step + (step - bw) / 2
          const h = Math.max(d.count ? 3 : 0, (d.count / nice) * ih)
          const r = Math.min(4, bw / 2, h)
          const top = pad.t + ih - h
          // bar with rounded top only (anchored to the baseline)
          const path = h
            ? `M${x},${pad.t + ih} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${pad.t + ih} Z`
            : ''
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${fmtDate(d.date + 'T12:00:00')}: ${d.count}`}>
              <rect x={pad.l + i * step} y={pad.t} width={step} height={ih} fill="transparent" />
              {path && <path d={path} className={`d-chart__bar ${hover === i ? 'is-hover' : ''}`} />}
              {i % every === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" className="d-chart__axis">
                  {+d.date.slice(8, 10)}/{+d.date.slice(5, 7)}
                </text>
              )}
            </g>
          )
        })}
        <line x1={pad.l} x2={W - pad.r} y1={pad.t + ih} y2={pad.t + ih} className="d-chart__base" />
      </svg>
      {hover !== null && (
        <div className="d-chart__tip" style={{ left: `${((pad.l + hover * step + step / 2) / W) * 100}%` }}>
          <b>{data[hover].count}</b> رسالة
          <small>{fmtDate(data[hover].date + 'T12:00:00', { weekday: 'long', day: 'numeric', month: 'long' })}</small>
        </div>
      )}
    </div>
  )
}

export default function Overview({ user }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dash
      .stats()
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? 'صباح الخير' : 'مساء الخير'
  }, [])

  const trend = useMemo(() => {
    if (!data) return null
    const { last30, prev30 } = data.messages
    if (!prev30) return last30 ? 'رسائل جديدة الشهر ده' : 'مفيش رسائل الشهر ده'
    const pct = Math.round(((last30 - prev30) / prev30) * 100)
    return `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}% عن الشهر اللي فات`
  }, [data])

  return (
    <div className="d-page">
      <header className="d-head">
        <div>
          <p className="d-head__eyebrow">{fmtDate(new Date().toISOString(), { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>
            {greeting}، {user?.name}
          </h1>
          <p className="d-head__sub">دي نظرة سريعة على البروتفوليو والرسائل.</p>
        </div>
        <div className="d-head__actions">
          <Link to="/dashboard/projects/new" className="d-btn d-btn--primary">
            <Icon name="plus" size={18} /> مشروع جديد
          </Link>
        </div>
      </header>

      {error && <p className="d-alert">{error}</p>}
      {!data && !error && (
        <div className="d-center d-center--block">
          <Spinner size={26} />
        </div>
      )}

      {data && (
        <>
          <section className="d-stats">
            <StatTile icon="folder" label="المشاريع" value={data.projects.total} sub={`${data.projects.published} منشور · ${data.projects.drafts} مسودة`} to="/dashboard/projects" />
            <StatTile icon="image" label="الصور" value={data.projects.images} sub="على Cloudinary" />
            <StatTile icon="inbox" label="الرسائل" value={data.messages.total} sub={trend} to="/dashboard/messages" />
            <StatTile icon="mail" label="غير مقروءة" value={data.messages.unread} tone={data.messages.unread ? 'accent' : ''} sub={data.messages.unread ? 'مستنية ردك' : 'كله مقروء ✓'} to="/dashboard/messages" />
          </section>

          <section className="d-grid-2">
            <div className="d-card d-card--pad">
              <div className="d-card__head">
                <h2>
                  <Icon name="chart" size={18} /> الرسائل آخر 30 يوم
                </h2>
                <span className="d-chip">{fmtNum(data.messages.last30)} رسالة</span>
              </div>
              <DailyChart data={data.daily} />
            </div>

            <div className="d-card d-card--pad">
              <div className="d-card__head">
                <h2>
                  <Icon name="inbox" size={18} /> أحدث الرسائل
                </h2>
                <Link to="/dashboard/messages" className="d-link">
                  الكل
                </Link>
              </div>
              {data.latest_messages.length ? (
                <ul className="d-mini-list">
                  {data.latest_messages.map((m) => (
                    <li key={m.id}>
                      <Link to={`/dashboard/messages/${m.id}`}>
                        <span className="d-avatar d-avatar--sm">{m.name.slice(0, 1)}</span>
                        <span className="d-mini-list__text">
                          <b>
                            {!m.is_read && <i className="d-dot" />}
                            {m.name}
                          </b>
                          <small dir="auto">{m.subject || m.message}</small>
                        </span>
                        <time>{timeAgo(m.created_at)}</time>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty icon="inbox" title="مفيش رسائل لسه" text="أول ما حد يبعت من فورم التواصل هتلاقيها هنا." />
              )}
            </div>
          </section>

          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>
                <Icon name="folder" size={18} /> المشاريع
              </h2>
              <Link to="/dashboard/projects" className="d-link">
                إدارة المشاريع
              </Link>
            </div>
            {data.recent_projects.length ? (
              <div className="d-recent">
                {data.recent_projects.map((p) => (
                  <Link key={p.id} to={`/dashboard/projects/${p.id}`} className="d-recent__item">
                    <Thumb image={p.cover} size={70} />
                    <span className="d-recent__meta">
                      <b dir="auto">{p.title}</b>
                      <span>
                        <Status published={p.is_published} /> <small>{p.images.length} صور</small>
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty icon="folder" title="مفيش مشاريع" text="ابدأ بإضافة أول مشروع.">
                <Link to="/dashboard/projects/new" className="d-btn d-btn--primary">
                  <Icon name="plus" size={18} /> مشروع جديد
                </Link>
              </Empty>
            )}
          </section>
        </>
      )}
    </div>
  )
}
