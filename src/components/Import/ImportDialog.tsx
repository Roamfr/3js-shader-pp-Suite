import { useState, useCallback, useRef } from 'react'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { useHistoryStore } from '../../store/historyStore'
import { importShaderSource, importFromFile, importFromClipboard, detectFormat, FORMAT_LABELS, type ImportFormat } from '../../lib/shaderImporter'
import { parseProjectJSON } from '../../lib/persistence'

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
}

const modalStyle: React.CSSProperties = {
  background: '#1a1a2e', borderRadius: 12, padding: 24, width: 480,
  maxHeight: '80vh', overflowY: 'auto', border: '1px solid #333',
}

const dropZoneBase: React.CSSProperties = {
  border: '2px dashed #444', borderRadius: 8, padding: 32,
  textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s',
}

export function ImportDialog() {
  const open = useUIStore((s) => s.importDialogOpen)
  const close = useUIStore((s) => s.setImportDialogOpen)
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const setShader = useGalleryStore((s) => s.setShader)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)
  const hydrateFromSaved = useGalleryStore((s) => s.hydrateFromSaved)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const [pasteText, setPasteText] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [detectedFormat, setDetectedFormat] = useState<ImportFormat | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tileId = selectedTileId ?? tiles[0]?.id

  const applyShader = useCallback((result: ReturnType<typeof importShaderSource>) => {
    if (!result.success || !result.shader) {
      setFeedback({ type: 'error', message: result.error ?? 'Import failed' })
      return
    }
    if (!tileId) {
      setFeedback({ type: 'error', message: 'No tile selected' })
      return
    }

    // Push undo snapshot
    const tile = tiles.find((t) => t.id === tileId)
    if (tile) {
      pushSnapshot(tileId, { shader: tile.shader, postEffects: tile.postEffects })
    }

    if (result.shader.type === 'material') {
      setShader(tileId, result.shader)
    } else {
      setPostEffect(tileId, [result.shader])
    }

    setFeedback({ type: 'success', message: `Applied as ${FORMAT_LABELS[result.detectedFormat]}` })
    setTimeout(() => close(false), 800)
  }, [tileId, tiles, setShader, setPostEffect, pushSnapshot, close])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (!file) return

    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text()
        const project = parseProjectJSON(text)
        hydrateFromSaved(project.tiles, project.gridSize)
        setFeedback({ type: 'success', message: 'Project imported successfully' })
        setTimeout(() => close(false), 800)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
      return
    }

    const result = await importFromFile(file)
    applyShader(result)
  }, [applyShader, hydrateFromSaved, close])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.name.endsWith('.json')) {
      try {
        const text = await file.text()
        const project = parseProjectJSON(text)
        hydrateFromSaved(project.tiles, project.gridSize)
        setFeedback({ type: 'success', message: 'Project imported successfully' })
        setTimeout(() => close(false), 800)
      } catch (err) {
        setFeedback({ type: 'error', message: (err as Error).message })
      }
      return
    }
    const result = await importFromFile(file)
    applyShader(result)
  }, [applyShader, hydrateFromSaved, close])

  const handlePaste = useCallback(() => {
    if (!pasteText.trim()) return
    const result = importShaderSource(pasteText.trim(), 'Pasted Shader')
    applyShader(result)
  }, [pasteText, applyShader])

  const handleClipboard = useCallback(async () => {
    const result = await importFromClipboard()
    applyShader(result)
  }, [applyShader])

  const handlePasteChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value
    setPasteText(text)
    if (text.trim()) {
      setDetectedFormat(detectFormat(text))
    } else {
      setDetectedFormat(null)
    }
    setFeedback(null)
  }, [])

  if (!open) return null

  return (
    <div style={overlayStyle} onClick={() => close(false)}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, color: '#eee' }}>Import Shader</h2>
          <button onClick={() => close(false)} style={{ background: 'none', border: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>
            &times;
          </button>
        </div>

        {/* File drop zone */}
        <div
          style={{ ...dropZoneBase, borderColor: dragOver ? '#3b82f6' : '#444', marginBottom: 16 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".glsl,.frag,.vert,.json"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <div style={{ color: '#888', fontSize: 13 }}>
            Drop .glsl / .frag / .vert / .json here
          </div>
          <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>or click to browse</div>
        </div>

        {/* Paste area */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ color: '#888', fontSize: 12 }}>Paste GLSL</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {detectedFormat && (
                <span style={{
                  fontSize: 10, padding: '2px 6px', borderRadius: 4,
                  background: '#2a2a4a', color: '#7c8aff',
                }}>
                  {FORMAT_LABELS[detectedFormat]}
                </span>
              )}
              <button
                onClick={handleClipboard}
                style={{ background: '#2a2a4a', border: '1px solid #444', borderRadius: 4, color: '#aaa', fontSize: 11, padding: '3px 8px', cursor: 'pointer' }}
              >
                Paste from clipboard
              </button>
            </div>
          </div>
          <textarea
            value={pasteText}
            onChange={handlePasteChange}
            placeholder="Paste your GLSL shader code here..."
            style={{
              width: '100%', height: 120, background: '#111', border: '1px solid #333',
              borderRadius: 6, color: '#ccc', fontFamily: 'monospace', fontSize: 12,
              padding: 8, resize: 'vertical', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Apply button */}
        <button
          onClick={handlePaste}
          disabled={!pasteText.trim()}
          style={{
            width: '100%', padding: '10px 0', fontSize: 13, fontWeight: 600,
            background: pasteText.trim() ? '#3b82f6' : '#333',
            border: 'none', borderRadius: 6,
            color: pasteText.trim() ? '#fff' : '#666', cursor: pasteText.trim() ? 'pointer' : 'default',
          }}
        >
          Import to {tiles.find(t => t.id === tileId)?.label ?? 'tile'}
        </button>

        {/* Feedback */}
        {feedback && (
          <div style={{
            marginTop: 12, padding: 8, borderRadius: 6, fontSize: 12,
            background: feedback.type === 'success' ? '#1a3a1a' : '#3a1a1a',
            color: feedback.type === 'success' ? '#4ade80' : '#f87171',
            border: `1px solid ${feedback.type === 'success' ? '#2a5a2a' : '#5a2a2a'}`,
          }}>
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  )
}
