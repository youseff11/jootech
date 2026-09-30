import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, navigate } from '../lib/router'
import Icon from '../components/Icon'
import { compressImage, dash, forget, peek, remember } from './api'
import { Spinner, Switch, fmtDateTime, useConfirm, useToast } from './ui'

const EMPTY = {
  title: '', title_en: '', description: '', description_en: '',
  problem: '', problem_en: '', solution: '', solution_en: '', outcome: '', outcome_en: '',
  tech: [], live_url: '', github_url: '', is_published: true, paragraphs: [],
}

const CONTENT = [
  { key: 'title', label: 'عنوان المشروع', en: 'Project title', single: true, required: true },
  { key: 'description', label: 'الوصف المختصر', en: 'Short description', hint: 'بيظهر في كارت المشروع — سطرين كفاية.', required: true },
  { key: 'problem', label: 'المشكلة', en: 'The challenge', hint: 'إيه المشكلة اللي العميل كان عايز يحلها؟' },
  { key: 'solution', label: 'الحل', en: 'The solution', hint: 'عملت إيه بالظبط؟' },
  { key: 'outcome', label: 'النتيجة', en: 'The outcome', hint: 'إيه القيمة اللي المشروع حققها؟' },
]

const TECH_SUGGEST = ['Django', 'React', 'PostgreSQL', 'JavaScript', 'Python', 'REST API', 'Cloudinary', 'Bootstrap', 'Tailwind', 'Flutter', 'Vercel', 'Neon']

function fromProject(p) {
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
    tech: p.tech || [],
    paragraphs: (p.paragraphs || []).map((x) => ({ text: x.text, text_en: x.text_en })),
  }
}

/* ───────── small building blocks ───────── */
function Field({ label, hint, error, action, children, required }) {
  return (
    <div className={`d-field ${error ? 'has-error' : ''}`}>
      <div className="d-field__top">
        <span>
          {label}
          {required && <i className="d-req">*</i>}
        </span>
        {action}
      </div>
      {children}
      {error ? <em className="d-field__err">{error}</em> : hint ? <small className="d-field__hint">{hint}</small> : null}
    </div>
  )
}

function AiBtn({ icon, label, onClick, busy, disabled }) {
  return (
    <button type="button" className="d-ai" onClick={onClick} disabled={busy || disabled}>
      {busy ? <Spinner size={14} /> : <Icon name={icon} size={14} />} {label}
    </button>
  )
}

function TagInput({ value, onChange }) {
  const [text, setText] = useState('')
  const add = (raw) => {
    const parts = raw
      .split(/[,،\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    const next = [...value]
    parts.forEach((t) => !next.some((x) => x.toLowerCase() === t.toLowerCase()) && next.push(t))
    onChange(next)
    setText('')
  }
  const suggestions = TECH_SUGGEST.filter((s) => !value.some((v) => v.toLowerCase() === s.toLowerCase()))
  return (
    <div>
      <div className="d-tags-input" dir="ltr">
        {value.map((t) => (
          <span key={t} className="d-tag">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`حذف ${t}`}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
        <input
          value={text}
          onChange={(e) => (e.target.value.includes(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) {
              e.preventDefault()
              add(text)
            } else if (e.key === 'Backspace' && !text && value.length) {
              onChange(value.slice(0, -1))
            }
          }}
          onBlur={() => text.trim() && add(text)}
          placeholder={value.length ? '' : 'Django, React…'}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="d-suggest">
          {suggestions.slice(0, 8).map((s) => (
            <button type="button" key={s} onClick={() => onChange([...value, s])}>
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ───────── images manager ───────── */
function Images({ projectId, images, setImages }) {
  const [queue, setQueue] = useState([]) // {id, name, progress, error, preview}
  const [over, setOver] = useState(false)
  const [dragId, setDragId] = useState(null)
  const input = useRef(null)
  const before = useRef(null)
  const toast = useToast()
  const confirm = useConfirm()

  const handleFiles = async (fileList) => {
    const files = [...fileList].filter((f) => f.type.startsWith('image/'))
    if (!files.length) return toast('اختار ملفات صور بس', 'err')
    const items = files.map((f) => ({ id: Math.random().toString(36).slice(2), name: f.name, progress: 0, preview: URL.createObjectURL(f), file: f }))
    setQueue((q) => [...q, ...items])
    let ok = 0
    for (const it of items) {
      try {
        const small = await compressImage(it.file)
        const res = await dash.uploadImage(projectId, small, (p) =>
          setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, progress: p } : x))),
        )
        setImages((l) => [...l, ...(res.images || [])])
        setQueue((q) => q.filter((x) => x.id !== it.id))
        URL.revokeObjectURL(it.preview)
        ok += res.images?.length || 0
        if (res.errors?.length) toast(res.errors[0], 'err')
      } catch (e) {
        setQueue((q) => q.map((x) => (x.id === it.id ? { ...x, error: e.message } : x)))
      }
    }
    if (ok) toast(ok === 1 ? 'الصورة اترفعت' : `اترفع ${ok} صور`)
  }

  const saveOrder = async (list, prev) => {
    try {
      await dash.reorderImages(projectId, list.map((i) => i.id))
    } catch (e) {
      setImages(prev)
      toast(e.message, 'err')
    }
  }

  const move = (idx, dir) => {
    const j = idx + dir
    if (j < 0 || j >= images.length) return
    const prev = images
    const next = [...images]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setImages(next)
    saveOrder(next, prev)
  }

  const remove = async (img) => {
    const ok = await confirm({ title: 'حذف الصورة؟', text: 'الصورة هتتشال من المشروع ومن Cloudinary.', ok: 'احذف', danger: true })
    if (!ok) return
    try {
      await dash.deleteImage(img.id)
      setImages((l) => l.filter((x) => x.id !== img.id))
      toast('الصورة اتحذفت')
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  return (
    <div>
      <div
        className={`d-drop ${over ? 'is-over' : ''}`}
        onDragOver={(e) => {
          if (dragId) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (dragId) return
          e.preventDefault()
          setOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => input.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && input.current?.click()}
      >
        <span className="d-drop__icon">
          <Icon name="upload" size={24} />
        </span>
        <b>اسحب الصور هنا أو اضغط للاختيار</b>
        <small>تقدر تختار كذا صورة مرة واحدة — بتتضغط وتتحول WebP تلقائياً قبل الرفع.</small>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => (handleFiles(e.target.files), (e.target.value = ''))} />
      </div>

      {(images.length > 0 || queue.length > 0) && (
        <ul className="d-images">
          {images.map((img, i) => (
            <li
              key={img.id}
              className={`d-img ${dragId === img.id ? 'is-dragging' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(img.id)
                before.current = images
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', String(img.id))
              }}
              onDragOver={(e) => {
                e.preventDefault()
                if (!dragId || dragId === img.id) return
                setImages((list) => {
                  const from = list.findIndex((x) => x.id === dragId)
                  const to = list.findIndex((x) => x.id === img.id)
                  if (from < 0 || to < 0) return list
                  const next = [...list]
                  const [it] = next.splice(from, 1)
                  next.splice(to, 0, it)
                  return next
                })
              }}
              onDragEnd={() => {
                const prev = before.current
                setDragId(null)
                if (prev && prev.map((x) => x.id).join() !== images.map((x) => x.id).join()) saveOrder(images, prev)
              }}
              onDrop={(e) => e.preventDefault()}
            >
              <img src={img.thumb || img.src} alt="" loading="lazy" draggable="false" />
              {i === 0 && <span className="d-img__cover">الغلاف</span>}
              <div className="d-img__bar">
                <button type="button" className="d-icon-btn d-icon-btn--sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label="قبل">
                  <Icon name="chevronRight" size={16} />
                </button>
                <a className="d-icon-btn d-icon-btn--sm" href={img.full || img.src} target="_blank" rel="noopener noreferrer" aria-label="فتح">
                  <Icon name="expand" size={14} />
                </a>
                <button type="button" className="d-icon-btn d-icon-btn--sm d-icon-btn--danger" onClick={() => remove(img)} aria-label="حذف">
                  <Icon name="trash" size={14} />
                </button>
                <button type="button" className="d-icon-btn d-icon-btn--sm" onClick={() => move(i, 1)} disabled={i === images.length - 1} aria-label="بعد">
                  <Icon name="chevronLeft" size={16} />
                </button>
              </div>
            </li>
          ))}
          {queue.map((q) => (
            <li key={q.id} className={`d-img d-img--uploading ${q.error ? 'has-error' : ''}`}>
              <img src={q.preview} alt="" />
              <div className="d-img__progress">
                {q.error ? (
                  <>
                    <span>{q.error}</span>
                    <button type="button" className="d-link" onClick={() => setQueue((l) => l.filter((x) => x.id !== q.id))}>
                      إخفاء
                    </button>
                  </>
                ) : (
                  <>
                    <span>{Math.round(q.progress * 100)}%</span>
                    <i style={{ transform: `scaleX(${q.progress})` }} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {images.length > 1 && <p className="d-hint">اسحب الصور لترتيبها — أول صورة هي غلاف المشروع.</p>}
    </div>
  )
}

/* ───────── editor ───────── */
/** keep the cached projects list in sync so the list page is instant & correct */
function syncList(project, { remove = false, add = false } = {}) {
  const list = peek('projects')
  forget('stats')
  if (!list) return
  if (remove) return remember('projects', list.filter((p) => p.id !== project.id))
  if (add) return remember('projects', [project, ...list])
  remember('projects', list.map((p) => (p.id === project.id ? { ...p, ...project } : p)))
}

export default function ProjectEditor({ id }) {
  const isNew = !id
  // render instantly from the cached list, then refresh from the server
  const cached = !isNew ? (peek('projects') || []).find((p) => p.id === id) : null
  const [form, setForm] = useState(() => (cached ? fromProject(cached) : EMPTY))
  const [saved, setSaved] = useState(() => JSON.stringify(cached ? fromProject(cached) : EMPTY))
  const [meta, setMeta] = useState(cached || null)
  const [images, setImages] = useState(cached?.images || [])
  const [loading, setLoading] = useState(!isNew && !cached)
  const formRef = useRef(form)
  const savedRef = useRef(saved)
  formRef.current = form
  savedRef.current = saved
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [lang, setLang] = useState('ar')
  const [aiBusy, setAiBusy] = useState('')
  const [undo, setUndo] = useState(null)
  const toast = useToast()
  const confirm = useConfirm()

  useEffect(() => {
    if (isNew) return
    dash
      .project(id)
      .then(({ project }) => {
        const f = fromProject(project)
        // don't overwrite anything the user already started typing
        if (JSON.stringify(formRef.current) === savedRef.current) {
          setForm(f)
          setSaved(JSON.stringify(f))
        }
        setMeta(project)
        setImages(project.images)
        syncList(project)
      })
      .catch((e) => !cached && setError(e.message))
      .finally(() => setLoading(false))
  }, [id, isNew])

  const dirty = useMemo(() => JSON.stringify(form) !== saved, [form, saved])

  useEffect(() => {
    if (!isNew && meta) syncList({ id, images, cover: images[0] || null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images])

  useEffect(() => {
    if (!dirty) return
    const warn = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }))
  }

  const save = useCallback(async () => {
    if (saving) return
    const errs = {}
    if (!form.title.trim()) errs.title = 'العنوان مطلوب.'
    if (!form.description.trim()) errs.description = 'الوصف المختصر مطلوب.'
    if (Object.keys(errs).length) {
      setErrors(errs)
      setLang('ar')
      return toast('في بيانات ناقصة', 'err')
    }
    setSaving(true)
    try {
      if (isNew) {
        const { project } = await dash.createProject(form)
        setSaved(JSON.stringify(form))
        syncList(project, { add: true })
        toast('المشروع اتضاف — ضيف الصور دلوقتي')
        navigate(`/dashboard/projects/${project.id}`, { replace: true })
      } else {
        const { project } = await dash.updateProject(id, form)
        syncList(project)
        const f = fromProject(project)
        setForm(f)
        setSaved(JSON.stringify(f))
        setMeta(project)
        toast('التعديلات اتحفظت ✓')
      }
    } catch (e) {
      setErrors(e.fields || {})
      toast(e.message, 'err')
    } finally {
      setSaving(false)
    }
  }, [form, id, isNew, saving, toast])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        save()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [save])

  const leave = async () => {
    if (dirty && !(await confirm({ title: 'في تعديلات مش محفوظة', text: 'لو خرجت دلوقتي التعديلات هتضيع.', ok: 'اخرج من غير حفظ', danger: true, icon: 'undo' }))) return
    setSaved(JSON.stringify(form))
    navigate('/dashboard/projects')
  }

  const remove = async () => {
    const ok = await confirm({ title: 'حذف المشروع؟', text: 'المشروع هيتحذف نهائياً هو وكل صوره.', ok: 'احذف', danger: true })
    if (!ok) return
    try {
      await dash.deleteProject(id)
      syncList({ id }, { remove: true })
      setSaved(JSON.stringify(form))
      toast('المشروع اتحذف')
      navigate('/dashboard/projects', { replace: true })
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  /* ── AI helpers ── */
  const runAi = async (busyKey, mode, text, apply) => {
    if (!text?.trim()) return toast(mode === 'translate' ? 'الخانة العربي فاضية' : 'الخانة فاضية', 'err')
    setAiBusy(busyKey)
    try {
      const { result } = await dash.ai(mode, text)
      apply(result)
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setAiBusy('')
    }
  }

  const improve = (key) =>
    runAi(key, 'improve', form[key], (r) => {
      setUndo({ key, value: form[key] })
      set(key, r)
    })

  const translate = (key) => runAi(`${key}_en`, 'translate', form[key], (r) => set(`${key}_en`, r))

  const improvePara = (i) =>
    runAi(`p${i}`, 'improve', form.paragraphs[i].text, (r) => {
      setUndo({ para: i, value: form.paragraphs[i].text })
      setPara(i, 'text', r)
    })
  const translatePara = (i) => runAi(`p${i}_en`, 'translate', form.paragraphs[i].text, (r) => setPara(i, 'text_en', r))

  const translateAll = async () => {
    const jobs = CONTENT.filter((c) => form[c.key]?.trim() && !form[`${c.key}_en`]?.trim())
    const paraJobs = form.paragraphs.map((p, i) => [p, i]).filter(([p]) => p.text.trim() && !p.text_en.trim())
    if (!jobs.length && !paraJobs.length) return toast('كل الخانات الإنجليزي مليانة بالفعل')
    setAiBusy('all')
    try {
      for (const c of jobs) {
        const { result } = await dash.ai('translate', form[c.key])
        setForm((f) => ({ ...f, [`${c.key}_en`]: result }))
      }
      for (const [p, i] of paraJobs) {
        const { result } = await dash.ai('translate', p.text)
        setForm((f) => ({ ...f, paragraphs: f.paragraphs.map((x, j) => (j === i ? { ...x, text_en: result } : x)) }))
      }
      toast('الترجمة خلصت — راجعها قبل الحفظ')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setAiBusy('')
    }
  }

  const doUndo = () => {
    if (!undo) return
    if (undo.para !== undefined) setPara(undo.para, 'text', undo.value)
    else set(undo.key, undo.value)
    setUndo(null)
  }

  /* ── paragraphs ── */
  const setPara = (i, k, v) => setForm((f) => ({ ...f, paragraphs: f.paragraphs.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }))
  const addPara = () => setForm((f) => ({ ...f, paragraphs: [...f.paragraphs, { text: '', text_en: '' }] }))
  const delPara = (i) => setForm((f) => ({ ...f, paragraphs: f.paragraphs.filter((_, j) => j !== i) }))
  const movePara = (i, d) =>
    setForm((f) => {
      const j = i + d
      if (j < 0 || j >= f.paragraphs.length) return f
      const next = [...f.paragraphs]
      ;[next[i], next[j]] = [next[j], next[i]]
      return { ...f, paragraphs: next }
    })

  if (loading)
    return (
      <div className="d-center d-center--block">
        <Spinner size={26} />
      </div>
    )
  if (error)
    return (
      <div className="d-page">
        <p className="d-alert">{error}</p>
        <Link to="/dashboard/projects" className="d-btn d-btn--ghost">
          رجوع للمشاريع
        </Link>
      </div>
    )

  const en = lang === 'en'

  return (
    <div className="d-page d-editor">
      <header className="d-editbar">
        <button className="d-icon-btn" onClick={leave} aria-label="رجوع">
          <Icon name="arrowRight" size={18} />
        </button>
        <div className="d-editbar__title">
          <small>{isNew ? 'مشروع جديد' : 'تعديل مشروع'}</small>
          <b dir="auto">{form.title || 'بدون عنوان'}</b>
        </div>
        <span className={`d-savestate ${dirty ? 'is-dirty' : ''}`}>{dirty ? 'تعديلات مش محفوظة' : isNew ? '' : 'محفوظ'}</span>
        <button className="d-btn d-btn--primary" onClick={save} disabled={saving || (!dirty && !isNew)} title="Ctrl + S">
          {saving ? <Spinner /> : <Icon name="save" size={18} />} {isNew ? 'إنشاء' : 'حفظ'}
        </button>
      </header>

      <div className="d-editor__grid">
        <div className="d-editor__main">
          {/* ── content ── */}
          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>المحتوى</h2>
              <div className="d-seg d-seg--sm" role="tablist">
                <button role="tab" aria-selected={!en} className={!en ? 'is-active' : ''} onClick={() => setLang('ar')}>
                  العربي
                </button>
                <button role="tab" aria-selected={en} className={en ? 'is-active' : ''} onClick={() => setLang('en')}>
                  English
                </button>
              </div>
            </div>

            {en && (
              <div className="d-note">
                <Icon name="languages" size={18} />
                <span>النسخة الإنجليزية هي اللي بتظهر على الموقع. لو خانة فاضية بيظهر العربي مكانها.</span>
                <AiBtn icon="sparkles" label="ترجم الفاضي كله" onClick={translateAll} busy={aiBusy === 'all'} disabled={!!aiBusy} />
              </div>
            )}

            {undo && (
              <div className="d-note d-note--ok">
                <Icon name="sparkles" size={18} />
                <span>النص اتحسّن بالذكاء الاصطناعي.</span>
                <button type="button" className="d-link" onClick={doUndo}>
                  <Icon name="undo" size={14} /> تراجع
                </button>
              </div>
            )}

            {CONTENT.map((c) => {
              const key = en ? `${c.key}_en` : c.key
              const Tag = c.single ? 'input' : 'textarea'
              return (
                <Field
                  key={key}
                  label={en ? c.en : c.label}
                  hint={en ? null : c.hint}
                  error={errors[key]}
                  required={!en && c.required}
                  action={
                    en ? (
                      <AiBtn icon="languages" label="ترجم من العربي" onClick={() => translate(c.key)} busy={aiBusy === key} disabled={!!aiBusy} />
                    ) : (
                      <AiBtn icon="sparkles" label="حسّن الصياغة" onClick={() => improve(c.key)} busy={aiBusy === key} disabled={!!aiBusy} />
                    )
                  }
                >
                  <Tag
                    className={`d-control ${c.single ? '' : 'd-control--area'}`}
                    value={form[key]}
                    onChange={(e) => set(key, e.target.value)}
                    dir={en ? 'ltr' : 'rtl'}
                    rows={c.key === 'description' ? 2 : 3}
                    maxLength={c.single ? 200 : undefined}
                  />
                </Field>
              )
            })}
          </section>

          {/* ── paragraphs ── */}
          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>تفاصيل التنفيذ</h2>
              <button type="button" className="d-btn d-btn--ghost d-btn--sm" onClick={addPara}>
                <Icon name="plus" size={16} /> فقرة
              </button>
            </div>
            {!form.paragraphs.length && <p className="d-muted">فقرات اختيارية بتظهر تحت "Implementation details" في صفحة المشروع.</p>}
            {form.paragraphs.map((p, i) => {
              const key = en ? 'text_en' : 'text'
              return (
                <div key={i} className="d-para">
                  <div className="d-para__head">
                    <span className="d-para__num">{i + 1}</span>
                    <div className="d-para__tools">
                      {en ? (
                        <AiBtn icon="languages" label="ترجم" onClick={() => translatePara(i)} busy={aiBusy === `p${i}_en`} disabled={!!aiBusy} />
                      ) : (
                        <AiBtn icon="sparkles" label="حسّن" onClick={() => improvePara(i)} busy={aiBusy === `p${i}`} disabled={!!aiBusy} />
                      )}
                      <button type="button" className="d-icon-btn d-icon-btn--sm" onClick={() => movePara(i, -1)} disabled={i === 0} aria-label="لفوق">
                        <Icon name="chevronUp" size={16} />
                      </button>
                      <button type="button" className="d-icon-btn d-icon-btn--sm" onClick={() => movePara(i, 1)} disabled={i === form.paragraphs.length - 1} aria-label="لتحت">
                        <Icon name="chevronDown" size={16} />
                      </button>
                      <button type="button" className="d-icon-btn d-icon-btn--sm d-icon-btn--danger" onClick={() => delPara(i)} aria-label="حذف الفقرة">
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>
                  <textarea className="d-control d-control--area" value={p[key]} onChange={(e) => setPara(i, key, e.target.value)} dir={en ? 'ltr' : 'rtl'} rows={3} placeholder={en ? 'Paragraph in English…' : 'اكتب الفقرة…'} />
                </div>
              )
            })}
          </section>

          {/* ── images ── */}
          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>الصور</h2>
              {!isNew && <span className="d-chip">{images.length} صورة</span>}
            </div>
            {isNew ? (
              <div className="d-note">
                <Icon name="image" size={18} />
                <span>اضغط "إنشاء" الأول، وبعدها تقدر ترفع صور المشروع.</span>
              </div>
            ) : (
              <Images projectId={id} images={images} setImages={setImages} />
            )}
          </section>
        </div>

        <aside className="d-editor__side">
          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>النشر</h2>
            </div>
            <div className="d-publish">
              <div>
                <b>{form.is_published ? 'ظاهر على الموقع' : 'مخفي (مسودة)'}</b>
                <small>{form.is_published ? 'أي حد يقدر يشوفه' : 'محدش هيشوفه غيرك'}</small>
              </div>
              <Switch checked={form.is_published} onChange={(v) => set('is_published', v)} label="نشر المشروع" />
            </div>
            {meta?.created_at && (
              <p className="d-muted d-publish__date">
                <Icon name="calendar" size={14} /> اتضاف {fmtDateTime(meta.created_at)}
              </p>
            )}
            {!isNew && (
              <a className="d-btn d-btn--ghost d-btn--block" href={`/projects/${id}`} target="_blank" rel="noopener noreferrer">
                <Icon name="eye" size={16} /> عرض على الموقع
              </a>
            )}
          </section>

          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>الروابط</h2>
            </div>
            <Field label="رابط الموقع الحي" error={errors.live_url}>
              <div className="d-input d-input--icon">
                <Icon name="globe" size={16} />
                <input value={form.live_url} onChange={(e) => set('live_url', e.target.value)} placeholder="https://" dir="ltr" inputMode="url" />
              </div>
            </Field>
            <Field label="رابط GitHub (اختياري)" error={errors.github_url}>
              <div className="d-input d-input--icon">
                <Icon name="github" size={16} />
                <input value={form.github_url} onChange={(e) => set('github_url', e.target.value)} placeholder="https://github.com/…" dir="ltr" inputMode="url" />
              </div>
            </Field>
          </section>

          <section className="d-card d-card--pad">
            <div className="d-card__head">
              <h2>التقنيات</h2>
            </div>
            <TagInput value={form.tech} onChange={(v) => set('tech', v)} />
            <small className="d-field__hint">بتظهر كـ tags على الكارت وبتعمل فلاتر فوق المشاريع.</small>
          </section>

          {!isNew && (
            <button type="button" className="d-btn d-btn--danger-ghost d-btn--block" onClick={remove}>
              <Icon name="trash" size={16} /> حذف المشروع
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
