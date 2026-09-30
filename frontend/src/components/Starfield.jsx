import { useEffect, useRef } from 'react'

/**
 * Falling white stars + an occasional shooting star, drawn on one <canvas>.
 * - pauses when the tab is hidden
 * - density scales with screen size (lighter on phones)
 * - reduced-motion users get a still star field
 */
export default function Starfield() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d', { alpha: true })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    let w = 0
    let h = 0
    let stars = []
    let shooting = null
    let nextShot = performance.now() + 2500
    let raf = 0
    let last = performance.now()

    const rand = (a, b) => a + Math.random() * (b - a)

    const makeStar = (y) => {
      const depth = Math.random() // 0 = far, 1 = near
      return {
        x: Math.random() * w,
        y: y ?? Math.random() * h,
        r: 0.35 + depth * 1.35,
        vy: 8 + depth * 38, // px / second
        vx: rand(-4, 4),
        a: 0.35 + depth * 0.6,
        tw: Math.random() * Math.PI * 2, // twinkle phase
        ts: rand(1, 3), // twinkle speed
      }
    }

    const resize = () => {
      const prevW = w
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // mobile browsers resize the height while scrolling (address bar) —
      // only rebuild the field when the width really changes
      if (!stars.length || prevW !== w) {
        const count = Math.min(170, Math.round((w * h) / 9000))
        stars = Array.from({ length: count }, () => makeStar())
      }
      if (reduced) draw(0, 0)
    }

    const draw = (dt, t) => {
      ctx.clearRect(0, 0, w, h)
      for (const s of stars) {
        if (!reduced) {
          s.y += s.vy * dt
          s.x += s.vx * dt
          if (s.y > h + 4) Object.assign(s, makeStar(-4))
          if (s.x < -4) s.x = w + 4
          if (s.x > w + 4) s.x = -4
        }
        const alpha = s.a * (0.7 + 0.3 * Math.sin(s.tw + t * 0.001 * s.ts))
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
        if (s.r > 1.3) {
          // soft glow on the bigger stars
          ctx.globalAlpha = alpha * 0.18
          ctx.beginPath()
          ctx.arc(s.x, s.y, s.r * 3.2, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      if (!reduced) {
        if (!shooting && t > nextShot) {
          const fromLeft = Math.random() < 0.5
          shooting = {
            x: fromLeft ? rand(0, w * 0.5) : rand(w * 0.5, w),
            y: rand(-20, h * 0.35),
            vx: (fromLeft ? 1 : -1) * rand(520, 760),
            vy: rand(260, 380),
            life: 0,
            max: rand(0.7, 1.1),
          }
          nextShot = t + rand(3500, 8000)
        }
        if (shooting) {
          const s = shooting
          s.life += dt
          s.x += s.vx * dt
          s.y += s.vy * dt
          const p = s.life / s.max
          const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85
          const len = 0.12
          const tx = s.x - s.vx * len
          const ty = s.y - s.vy * len
          const g = ctx.createLinearGradient(s.x, s.y, tx, ty)
          g.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`)
          g.addColorStop(0.3, `rgba(165,180,252,${0.45 * fade})`)
          g.addColorStop(1, 'rgba(165,180,252,0)')
          ctx.globalAlpha = 1
          ctx.strokeStyle = g
          ctx.lineWidth = 1.6
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(s.x, s.y)
          ctx.lineTo(tx, ty)
          ctx.stroke()
          ctx.fillStyle = `rgba(255,255,255,${fade})`
          ctx.beginPath()
          ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2)
          ctx.fill()
          if (p >= 1) shooting = null
        }
      }
      ctx.globalAlpha = 1
    }

    const loop = (t) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      draw(dt, t)
      raf = requestAnimationFrame(loop)
    }

    const onVisibility = () => {
      cancelAnimationFrame(raf)
      if (!document.hidden && !reduced) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }

    let resizeTimer = 0
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(resize, 150)
    }

    resize()
    if (!reduced) raf = requestAnimationFrame(loop)
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={ref} className="bg__stars" aria-hidden="true" />
}
