import { useEffect, useRef, useState } from 'react'
import { cachedProjects, fetchProjects } from './api'

/** Projects from the API — renders cached data instantly, then refreshes. */
export function useProjects() {
  const [state, setState] = useState(() => {
    const c = cachedProjects()
    return { data: c, loading: !c, error: null }
  })

  const load = (force = false) => {
    setState((s) => ({ ...s, loading: !s.data, error: null }))
    fetchProjects({ force })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState((s) => ({ ...s, loading: false, error })))
  }

  useEffect(() => load(), [])
  return { ...state, projects: state.data?.projects || [], retry: () => load(true) }
}

/** Adds `.is-in` to every `[data-reveal]` element inside the ref once visible. */
export function useReveal(deps = []) {
  const ref = useRef(null)
  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = root.querySelectorAll('[data-reveal]:not(.is-in)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-in'))
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return ref
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** Animated number that counts up once visible. */
export function useCountUp(target, duration = 1200) {
  const ref = useRef(null)
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!target) return
    if (prefersReducedMotion()) return setVal(target)
    const el = ref.current
    let raf
    const run = () => {
      const t0 = performance.now()
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration)
        setVal(Math.round(target * (1 - Math.pow(1 - p, 3))))
        if (p < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
    }
    if (!el || !('IntersectionObserver' in window)) return run()
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        run()
        io.disconnect()
      }
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration])
  return [ref, val]
}
