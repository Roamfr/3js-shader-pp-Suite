import { useCallback } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { exportProjectJSON, downloadFile, downloadGLSL, downloadScreenshot } from '../../lib/persistence'

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: 12, padding: 24, width: 420,
  border: '1px solid #333',
}

const cardStyle: React.CSSProperties = {
  padding: 16, background: '#111', border: '1px solid #333', borderRadius: 8,
  cursor: 'pointer', transition: 'border-color 0.15s',
}

export function ExportDialog() {
  const open = useUIStore((s) => s.exportDialogOpen)
  const close = useUIStore((s) => s.setExportDialogOpen)
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const gridSize = useGalleryStore((s) => s.gridSize)

  const selectedTile = tiles.find((t) => t.id === selectedTileId)

  const handleExportGLSL = useCallback(() => {
    if (!selectedTile) return
    if (selectedTile.shader) {
      downloadGLSL(selectedTile.shader.fragmentShader, `${selectedTile.shader.name}-fragment.glsl`)
      if (selectedTile.shader.vertexShader) {
        downloadGLSL(selectedTile.shader.vertexShader, `${selectedTile.shader.name}-vertex.glsl`)
      }
    }
    for (const fx of selectedTile.postEffects) {
      downloadGLSL(fx.fragmentShader, `${fx.name}-postfx.glsl`)
    }
    close(false)
  }, [selectedTile, close])

  const handleExportJSON = useCallback(() => {
    const project = exportProjectJSON(tiles, gridSize)
    downloadFile(JSON.stringify(project, null, 2), 'shader-project.json', 'application/json')
    close(false)
  }, [tiles, gridSize, close])

  const handleScreenshot = useCallback(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return
    downloadScreenshot(canvas, 'shader-screenshot.png')
    close(false)
  }, [close])

  if (!open) return null

  const hasShader = selectedTile && (selectedTile.shader || selectedTile.postEffects.length > 0)

  return (
    <div style={overlayStyle} onClick={() => close(false)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#eee' }}>Export</h2>
          <button onClick={() => close(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* GLSL export */}
          <div
            style={{ ...cardStyle, opacity: hasShader ? 1 : 0.4, cursor: hasShader ? 'pointer' : 'default' }}
            onClick={hasShader ? handleExportGLSL : undefined}
            onMouseEnter={(e) => { if (hasShader) (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 4 }}>
              Export GLSL Files
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              {hasShader
                ? `Download shader files from ${selectedTile!.label}`
                : 'Select a tile with a shader first'}
            </div>
          </div>

          {/* JSON project */}
          <div
            style={cardStyle}
            onClick={handleExportJSON}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 4 }}>
              Export Project JSON
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              Save entire gallery as a re-importable JSON file
            </div>
          </div>

          {/* Screenshot */}
          <div
            style={cardStyle}
            onClick={handleScreenshot}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333' }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 4 }}>
              Save Screenshot
            </div>
            <div style={{ fontSize: 11, color: '#888' }}>
              Capture the current canvas as PNG
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
