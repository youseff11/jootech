import { useCallback, useEffect, useRef, useState } from 'react'
import Icon from './Icon'

/**
 * Image carousel with ← → arrows, swipe, dots / thumbnails and lazy slides.
 *
 * variant="card"  → compact (arrows on hover, dots)       — project cards
 * variant="hero"  → large  (arrows always, thumbnails)    — project page
 */
export default function Carousel({ images = [], alt = '', sizes, variant = 'card', eager = false, onOpen, index: controlled, onIndexChange, keyboard = true }) {
  const [inner, setInner] = useState(0)
  const index = controlled ?? inner
  const setIndex = useCallback(
    (i) => {
      const n = images.length
      const next = ((i % n) + n) % n
      onIndexChange ? onIndexChange(next) : setInner(next)
    },
    [images.length, onIndexChange],
  )
  const [loaded, setLoaded] = useState(() => new Set([0, 1]))
  const drag = useRef(null)
  const root = useRef(null)
  const thumbs = useRef(null)
  const many = images.length > 1

  // lazy-load the current slide and its neighbours only
  useEffect(() => {
    setLoaded((s) => {
      const need = [index, index + 1, index - 1].map((i) => (i + images.length) % Math.max(images.length, 1))
      if (need.every((i) => s.has(i))) return s
      const n = new Set(s)
      need.forEach((i) => n.add(i))
      return n
    })
    // keep the active thumbnail visible
    const t = thumbs.current?.children[index]
    if (t && thumbs.current) {
      const box = thumbs.current
      box.scrollTo({ left: t.offsetLeft - box.clientWidth / 2 + t.clientWidth / 2, behavior: 'smooth' })
    }
  }, [index, images.length])

  if (!images.length) {
    return (
      <div className={`carousel carousel--${variant} carousel--empty`}>
        <div className="noimg" aria-hidden="true">
          <Icon name="code" size={34} />
        </div>
      </div>
    )
  }

  const go = (d) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIndex(index + d)
  }

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e) => {
    if (drag.current && Math.abs(e.clientX - drag.current.x) > 8) drag.current.moved = true
  }
  const onPointerUp = (e) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dx = e.clientX - d.x
    if (many && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - d.y)) {
      setIndex(index + (dx < 0 ? 1 : -1))
    } else if (!d.moved) {
      onOpen?.(index)
    }
  }

  const onKey = (e) => {
    if (!keyboard) return
    if (e.key === 'ArrowRight') setIndex(index + 1)
    if (e.key === 'ArrowLeft') setIndex(index - 1)
    if (e.key === 'Enter' && onOpen) onOpen(index)
  }

  return (
    <div className={`carousel carousel--${variant}`} ref={root}>
      <div
        className={`carousel__viewport ${onOpen ? 'is-clickable' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={onKey}
        tabIndex={variant === 'hero' ? 0 : -1}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${alt} — screenshots`}
      >
        <div className="carousel__track" style={{ transform: `translate3d(${-index * 100}%,0,0)` }}>
          {images.map((img, i) => (
            <div className="carousel__slide" key={img.src + i} aria-hidden={i !== index}>
              {loaded.has(i) && (
                <img
                  src={img.src}
                  srcSet={img.srcset || undefined}
                  sizes={sizes}
                  alt={i === 0 ? alt : `${alt} — screenshot ${i + 1}`}
                  loading={eager && i === 0 ? 'eager' : 'lazy'}
                  fetchPriority={eager && i === 0 ? 'high' : undefined}
                  decoding="async"
                  draggable="false"
                  width="1200"
                  height="750"
                />
              )}
            </div>
          ))}
        </div>

        {many && (
          <>
            <button className="carousel__arrow carousel__arrow--prev" onClick={go(-1)} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} aria-label="Previous image">
              <Icon name="chevronLeft" size={variant === 'hero' ? 24 : 20} />
            </button>
            <button className="carousel__arrow carousel__arrow--next" onClick={go(1)} onPointerDown={(e) => e.stopPropagation()} onPointerUp={(e) => e.stopPropagation()} aria-label="Next image">
              <Icon name="chevronRight" size={variant === 'hero' ? 24 : 20} />
            </button>
            <span className="carousel__count mono">
              {index + 1} / {images.length}
            </span>
          </>
        )}
        {variant === 'hero' && onOpen && (
          <span className="carousel__zoom" aria-hidden="true">
            <Icon name="expand" size={16} />
          </span>
        )}
      </div>

      {many && variant === 'card' && (
        <div className="carousel__dots" role="tablist" aria-label="Choose image">
          {images.slice(0, 8).map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === index}
              aria-label={`Image ${i + 1}`}
              className={i === index ? 'is-active' : ''}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setIndex(i)
              }}
            />
          ))}
        </div>
      )}

      {many && variant === 'hero' && (
        <div className="carousel__thumbs" ref={thumbs}>
          {images.map((img, i) => (
            <button key={img.thumb + i} className={i === index ? 'is-active' : ''} onClick={() => setIndex(i)} aria-label={`Show image ${i + 1}`}>
              <img src={img.thumb} alt="" loading="lazy" decoding="async" width="160" height="100" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
