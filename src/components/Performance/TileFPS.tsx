import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/**
 * Per-tile FPS counter that runs inside a View.
 * Measures frame deltas via useFrame and exposes a DOM overlay via a render prop.
 */
export function TileFPSCounter({ onFPS }: { onFPS: (fps: number) => void }) {
  const frames = useRef(0)
  const lastTime = useRef(performance.now())

  useFrame(() => {
    frames.current++
    const now = performance.now()
    if (now - lastTime.current >= 1000) {
      onFPS(frames.current)
      frames.current = 0
      lastTime.current = now
    }
  })

  return null
}

interface TileFPSProps {
  fps: number
  visible: boolean
}

export function TileFPSOverlay({ fps, visible }: TileFPSProps) {
  if (!visible) return null

  const color = fps >= 50 ? '#4ade80' : fps >= 30 ? '#facc15' : '#f87171'

  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        padding: '2px 6px',
        background: 'rgba(0,0,0,0.6)',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: 'monospace',
        color,
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      {fps} FPS
    </div>
  )
}
