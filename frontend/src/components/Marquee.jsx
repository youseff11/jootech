import { stack } from '../data/site'

export default function Marquee() {
  const row = [...stack, ...stack]
  return (
    <div className="marquee" aria-label="Tech stack">
      <div className="marquee__track">
        {row.map((t, i) => (
          <span key={i} aria-hidden={i >= stack.length}>
            {t}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  )
}
