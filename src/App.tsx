import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { Sidebar } from './components/Sidebar/Sidebar'
import { GalleryGrid } from './components/Gallery/GalleryGrid'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100vw',
        height: '100vh',
        background: '#0a0a0a',
        color: '#eee',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Gallery area — HTML grid that View components track */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <GalleryGrid />
      </main>

      {/* Single Canvas renders all Views via gl.scissor */}
      <Canvas
        eventSource={containerRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
        }}
        gl={{ antialias: true, alpha: true }}
      >
        <View.Port />
      </Canvas>
    </div>
  )
}
