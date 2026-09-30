import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, navigate } from '../lib/router'
import Icon from '../components/Icon'
import { dash, forget, peek, remember } from './api'
import { Empty, Spinner, Status, Switch, Thumb, fmtDate, useConfirm, useToast } from './ui'

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'live', label: 'منشور' },
  { id: 'draft', label: 'مسودة' },
]

export default function Projects() {
  const [items, setItems] = useState(() => peek('projects') || null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [dragId, setDragId] = useState(null)
  const [overId, setOverId] = useState(null)
  const before = useRef(null)
  const toast = useToast()
  const confirm = useConfirm()

  const load = () => {
    setError('')
    dash
      .projects()
      .then((d) => setItems(d.projects))
      .catch((e) => setError(e.message))
  }
  useEffect(load, [])
  // keep the shared cache in sync with every local change (publish, reorder, delete…)
  useEffect(() => {
    if (items) {
      remember('projects', items)
      forget('stats')
    }
  }, [items])

  const shown = useMemo(() => {
    if (!items) return []
    const s = q.trim().toLowerCase()
    return items.filter((p) => {
      if (filter === 'live' && !p.is_published) return false
      if (filter === 'draft' && p.is_published) return false
      if (!s) return true
      return [p.title, p.title_en, p.technologies].some((v) => (v || '').toLowerCase().includes(s))
    })
  }, [items, q, filter])

  const canReorder = filter === 'all' && !q.trim()

  const saveOrder = async (list, prev) => {
    try {
      await dash.reorderProjects(list.map((p) => p.id))
      toast('اتحفظ الترتيب الجديد')
    } catch (e) {
      setItems(prev)
      toast(e.message, 'err')
    }
  }

  const move = (id, dir) => {
    const i = items.findIndex((p) => p.id === id)
    const j = i + dir
    if (j < 0 || j >= items.length) return
    const prev = items
    const next = [...items]
    ;[next[i], next[j]] = [next[j], next[i]]
    setItems(next)
    saveOrder(next, prev)
  }

  // ── HTML5 drag & drop (desktop) ──
  const onDragStart = (id) => (e) => {
    setDragId(id)
    before.current = items
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(id))
  }
  const onDragOver = (id) => (e) => {
    e.preventDefault()
    if (id === dragId || !dragId) return
    setOverId(id)
    setItems((list) => {
      const from = list.findIndex((p) => p.id === dragId)
      const to = list.findIndex((p) => p.id === id)
      if (from < 0 || to < 0 || from === to) return list
      const next = [...list]
      const [it] = next.splice(from, 1)
      next.splice(to, 0, it)
      return next
    })
  }
  const onDragEnd = () => {
    const prev = before.current
    setDragId(null)
    setOverId(null)
    if (prev && prev.map((p) => p.id).join() !== items.map((p) => p.id).join()) saveOrder(items, prev)
  }

  const togglePublish = async (p, value) => {
    setItems((l) => l.map((x) => (x.id === p.id ? { ...x, is_published: value } : x)))
    try {
      await dash.updateProject(p.id, { is_published: value })
      toast(value ? 'المشروع اتنشر على الموقع' : 'المشروع اتخفى من الموقع')
    } catch (e) {
      setItems((l) => l.map((x) => (x.id === p.id ? { ...x, is_published: !value } : x)))
      toast(e.message, 'err')
    }
  }

  const remove = async (p) => {
    const ok = await confirm({
      title: 'حذف المشروع؟',
      text: `"${p.title}" هيتحذف نهائياً هو وكل صوره. مينفعش ترجع في القرار ده.`,
      ok: 'احذف',
      danger: true,
    })
    if (!ok) return
    try {
      await dash.deleteProject(p.id)
      setItems((l) => l.filter((x) => x.id !== p.id))
      toast('المشروع اتحذف')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  const counts = useMemo(
    () => ({
      all: items?.length || 0,
      live: items?.filter((p) => p.is_published).length || 0,
      draft: items?.filter((p) => !p.is_published).length || 0,
    }),
    [items],
  )

  return (
    <div className="d-page">
      <header className="d-head">
        <div>
          <h1>المشاريع</h1>
          <p className="d-head__sub">أضف وعدّل ورتّب المشاريع اللي بتظهر في البروتفوليو.</p>
        </div>
        <div className="d-head__actions">
          <Link to="/dashboard/projects/new" className="d-btn d-btn--primary">
            <Icon name="plus" size={18} /> مشروع جديد
          </Link>
        </div>
      </header>

      <div className="d-toolbar">
        <div className="d-input d-input--icon d-toolbar__search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم المشروع أو التقنية…" />
        </div>
        <div className="d-seg" role="tablist">
          {FILTERS.map((f) => (
            <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'is-active' : ''} onClick={() => setFilter(f.id)}>
              {f.label} <small>{counts[f.id]}</small>
            </button>
          ))}
        </div>
      </div>

      {error && !items && (
        <p className="d-alert d-alert--retry">
          {error}
          <button className="d-link" onClick={load}>
            حاول تاني
          </button>
        </p>
      )}
      {!items && !error && (
        <div className="d-center d-center--block">
          <Spinner size={26} />
        </div>
      )}

      {items && !items.length && (
        <Empty icon="folder" title="مفيش مشاريع لسه" text="أضف أول مشروع وهيظهر على الموقع على طول.">
          <Link to="/dashboard/projects/new" className="d-btn d-btn--primary">
            <Icon name="plus" size={18} /> مشروع جديد
          </Link>
        </Empty>
      )}

      {items && items.length > 0 && !shown.length && <Empty icon="search" title="مفيش نتايج" text="جرّب كلمة تانية أو غيّر الفلتر." />}

      {shown.length > 0 && (
        <>
          {canReorder && (
            <p className="d-hint">
              <Icon name="grip" size={16} /> اسحب المشروع من المقبض عشان تغيّر ترتيبه على الموقع — الأول بيظهر الأول.
            </p>
          )}
          <ul className="d-plist">
            {shown.map((p, i) => (
              <li
                key={p.id}
                className={`d-prow ${dragId === p.id ? 'is-dragging' : ''} ${overId === p.id ? 'is-over' : ''}`}
                draggable={canReorder}
                onDragStart={canReorder ? onDragStart(p.id) : undefined}
                onDragOver={canReorder ? onDragOver(p.id) : undefined}
                onDragEnd={canReorder ? onDragEnd : undefined}
                onDrop={(e) => e.preventDefault()}
              >
                {canReorder && (
                  <span className="d-prow__grip" title="اسحب للترتيب" aria-hidden="true">
                    <Icon name="grip" size={18} />
                  </span>
                )}
                <span className="d-prow__num">{String(i + 1).padStart(2, '0')}</span>
                <button className="d-prow__main" onClick={() => navigate(`/dashboard/projects/${p.id}`)}>
                  <Thumb image={p.cover} size={52} />
                  <span className="d-prow__text">
                    <b dir="auto">{p.title}</b>
                    <small dir="auto">{p.title_en || p.description}</small>
                    <span className="d-prow__meta">
                      <Status published={p.is_published} />
                      <span>
                        <Icon name="image" size={14} /> {p.images.length}
                      </span>
                      <span>
                        <Icon name="calendar" size={14} /> {fmtDate(p.created_at)}
                      </span>
                    </span>
                  </span>
                </button>
                <div className="d-prow__actions">
                  <Switch checked={p.is_published} onChange={(v) => togglePublish(p, v)} label="نشر المشروع" />
                  {canReorder && (
                    <span className="d-prow__move">
                      <button className="d-icon-btn d-icon-btn--sm" onClick={() => move(p.id, -1)} disabled={i === 0} aria-label="لفوق">
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button className="d-icon-btn d-icon-btn--sm" onClick={() => move(p.id, 1)} disabled={i === shown.length - 1} aria-label="لتحت">
                        <Icon name="chevronDown" size={16} />
                      </button>
                    </span>
                  )}
                  <a className="d-icon-btn" href={`/projects/${p.id}`} target="_blank" rel="noopener noreferrer" aria-label="عرض على الموقع" title="عرض على الموقع">
                    <Icon name="eye" size={18} />
                  </a>
                  <Link to={`/dashboard/projects/${p.id}`} className="d-icon-btn" aria-label="تعديل" title="تعديل">
                    <Icon name="edit" size={18} />
                  </Link>
                  <button className="d-icon-btn d-icon-btn--danger" onClick={() => remove(p)} aria-label="حذف" title="حذف">
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
