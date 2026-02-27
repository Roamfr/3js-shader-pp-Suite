import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { Sidebar } from './components/Sidebar/Sidebar'
import { GalleryGrid } from './components/Gallery/GalleryGrid'
import { ImportDialog } from './components/Import/ImportDialog'
import { ExportDialog } from './components/Export/ExportDialog'
import { useGalleryStore } from './store/galleryStore'
import { useUIStore } from './store/uiStore'
import { useUndoRedo } from './store/historyStore'
import { saveGalleryState } from './lib/persistence'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { undo, redo } = useUndoRedo()

  // Debounced persistence: save gallery state 2s after changes
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    const unsub = useGalleryStore.subscribe((state) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        saveGalleryState(state.tiles, state.gridSize)
      }, 2000)
    })

    // Immediate save on page unload
    const handleBeforeUnload = () => {
      const state = useGalleryStore.getState()
      saveGalleryState(state.tiles, state.gridSize)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      unsub()
      clearTimeout(timeout)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey

      // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        const tileId = useUIStore.getState().selectedTileId
        if (tileId) undo(tileId)
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        const tileId = useUIStore.getState().selectedTileId
        if (tileId) redo(tileId)
      }

      // Ctrl/Cmd+I = import
      if (mod && e.key === 'i') {
        e.preventDefault()
        useUIStore.getState().setImportDialogOpen(true)
      }

      // Ctrl/Cmd+S = export (prevent browser save)
      if (mod && e.key === 's') {
        e.preventDefault()
        useUIStore.getState().setExportDialogOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

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
        gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}
      >
        <View.Port />
      </Canvas>

      {/* Dialogs */}
      <ImportDialog />
      <ExportDialog />
    </div>
  )
}
