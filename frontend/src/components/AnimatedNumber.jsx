import { useState, useEffect, useRef } from 'react'

/**
 * AnimatedNumber — smoothly counts up from 0 to `value` on mount.
 * @param {number}  value      Target number to animate to
 * @param {number}  duration   Animation duration in ms (default 1200)
 * @param {string}  prefix     Prefix string e.g. "$"
 * @param {string}  suffix     Suffix string e.g. "%" or "x"
 * @param {number}  decimals   Number of decimal places
 * @param {object}  style      Optional inline style
 */
export default function AnimatedNumber({ value, duration = 1200, prefix = '', suffix = '', decimals = 2, style = {}, className = '' }) {
  const [display, setDisplay] = useState(0)
  const frameRef = useRef(null)
  const startRef = useRef(null)

  useEffect(() => {
    if (value == null || isNaN(Number(value))) return
    const target = Number(value)
    cancelAnimationFrame(frameRef.current)
    startRef.current = null

    const animate = (ts) => {
      if (!startRef.current) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(eased * target)
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(target)
      }
    }

    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [value, duration])

  const formatted = Number(display).toFixed(decimals)

  return (
    <span className={className} style={style}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
