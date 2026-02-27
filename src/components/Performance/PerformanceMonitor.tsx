import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'

/**
 * Adaptive DPR monitor — reduces pixel ratio when frame rate drops.
 * Place inside `<Canvas>` (outside Views, at the root level).
 *
 * Samples FPS over a 2-second window.
 * - If FPS < lowThreshold (default 25), step DPR down by 0.25 (min 0.5)
 * - If FPS > highThreshold (default 55), step DPR up by 0.25 (max device DPR)
 */
interface PerformanceMonitorProps {
  lowThreshold?: number
  highThreshold?: number
  minDpr?: number
}

export function PerformanceMonitor({
  lowThreshold = 25,
  highThreshold = 55,
  minDpr = 0.5,
}: PerformanceMonitorProps) {
  const gl = useThree((s) => s.gl)
  const maxDpr = Math.min(window.devicePixelRatio, 2)
  const frames = useRef(0)
  const lastTime = useRef(performance.now())
  const currentDpr = useRef(gl.getPixelRatio())

  useFrame(() => {
    frames.current++
    const now = performance.now()
    const elapsed = now - lastTime.current

    if (elapsed >= 2000) {
      const fps = (frames.current / elapsed) * 1000
      frames.current = 0
      lastTime.current = now

      if (fps < lowThreshold && currentDpr.current > minDpr) {
        currentDpr.current = Math.max(minDpr, currentDpr.current - 0.25)
        gl.setPixelRatio(currentDpr.current)
      } else if (fps > highThreshold && currentDpr.current < maxDpr) {
        currentDpr.current = Math.min(maxDpr, currentDpr.current + 0.25)
        gl.setPixelRatio(currentDpr.current)
      }
    }
  })

  return null
}
