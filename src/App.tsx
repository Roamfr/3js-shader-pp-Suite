import { useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { View } from '@react-three/drei'
import { Sidebar } from './components/Sidebar/Sidebar'
import { GalleryGrid } from './components/Gallery/GalleryGrid'
import { ImportDialog } from './components/Import/ImportDialog'
import { ExportDialog } from './components/Export/ExportDialog'
import { DiffView } from './components/Comparison/DiffView'
import { PerformanceMonitor } from './components/Performance/PerformanceMonitor'
import { WelcomeState } from './components/Onboarding/WelcomeState'
import { useGalleryStore } from './store/galleryStore'
import { useUIStore } from './store/uiStore'
import { useUndoRedo } from './store/historyStore'
import { saveGalleryState } from './lib/persistence'

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null!)
  const { undo, redo } = useUndoRedo()
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed)

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
      const ui = useUIStore.getState()
      const gallery = useGalleryStore.getState()

      // Skip shortcuts when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      // Ctrl/Cmd+Z = undo, Ctrl/Cmd+Shift+Z = redo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        if (ui.selectedTileId) undo(ui.selectedTileId)
      }
      if (mod && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        if (ui.selectedTileId) redo(ui.selectedTileId)
      }

      // Ctrl/Cmd+I = import
      if (mod && e.key === 'i') {
        e.preventDefault()
        ui.setImportDialogOpen(true)
      }

      // Ctrl/Cmd+S = export (prevent browser save)
      if (mod && e.key === 's') {
        e.preventDefault()
        ui.setExportDialogOpen(true)
      }

      // Non-modifier shortcuts (only when not in input)
      if (!isInput && !mod) {
        // Tab = cycle tiles
        if (e.key === 'Tab') {
          e.preventDefault()
          const tiles = gallery.tiles
          if (tiles.length === 0) return
          const idx = tiles.findIndex((t) => t.id === ui.selectedTileId)
          const next = e.shiftKey
            ? (idx <= 0 ? tiles.length - 1 : idx - 1)
            : (idx + 1) % tiles.length
          ui.selectTile(tiles[next].id)
        }

        // Escape = deselect tile
        if (e.key === 'Escape') {
          ui.selectTile(null)
        }

        // Enter = focus prompt input
        if (e.key === 'Enter') {
          const promptInput = document.querySelector<HTMLTextAreaElement>(
            '[data-prompt-input]'
          )
          if (promptInput) {
            e.preventDefault()
            promptInput.focus()
          }
        }
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
      {!sidebarCollapsed && <Sidebar />}

      {/* Gallery area — contains both the HTML grid and the Canvas */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* HTML grid that View components track (rendered on top via z-index) */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <GalleryGrid />
        </div>

        {/* Canvas fills the main area; Views scissor into tracked HTML rects */}
        <Canvas
          eventSource={containerRef}
          style={{ position: 'absolute', inset: 0 }}
          gl={{ antialias: true }}
        >
          <PerformanceMonitor />
          <View.Port />
        </Canvas>
      </main>

      {/* Sidebar toggle when collapsed */}
      {sidebarCollapsed && (
        <button
          onClick={() => useUIStore.getState().toggleSidebar()}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            padding: '6px 10px',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: 6,
            color: '#ccc',
            cursor: 'pointer',
            fontSize: 14,
          }}
          title="Show sidebar"
        >
          &#9776;
        </button>
      )}

      {/* Dialogs */}
      <WelcomeState />
      <ImportDialog />
      <ExportDialog />
      <DiffView />
    </div>
  )
}
