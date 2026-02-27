import { useCallback } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { useUIStore } from '../../store/uiStore'
import type { PostEffectConfig } from '../../types/shader'

/**
 * Drag-and-drop reorderable list of post-processing effects for the selected tile.
 * Supports reorder (via drag), toggle on/off, and remove.
 */
export function EffectChain() {
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)

  const tile = tiles.find((t) => t.id === selectedTileId)
  const effects = tile?.postEffects ?? []

  const updateEffects = useCallback(
    (newEffects: PostEffectConfig[]) => {
      if (!selectedTileId) return
      setPostEffect(selectedTileId, newEffects)
    },
    [selectedTileId, setPostEffect]
  )

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault()
      const dragIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
      if (isNaN(dragIndex) || dragIndex === dropIndex) return

      const reordered = [...effects]
      const [moved] = reordered.splice(dragIndex, 1)
      reordered.splice(dropIndex, 0, moved)
      updateEffects(reordered)
    },
    [effects, updateEffects]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleRemove = useCallback(
    (index: number) => {
      updateEffects(effects.filter((_, i) => i !== index))
    },
    [effects, updateEffects]
  )

  if (!selectedTileId) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        Select a tile to manage effects
      </div>
    )
  }

  if (effects.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        No post-processing effects on this tile
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {effects.map((effect, i) => (
        <div
          key={`${effect.name}-${i}`}
          draggable
          onDragStart={(e) => handleDragStart(e, i)}
          onDrop={(e) => handleDrop(e, i)}
          onDragOver={handleDragOver}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 8px',
            background: '#1a1a2e',
            border: '1px solid #333',
            borderRadius: 4,
            cursor: 'grab',
            fontSize: 12,
            color: '#ccc',
          }}
        >
          {/* Drag handle */}
          <span style={{ color: '#555', fontSize: 14, userSelect: 'none' }}>
            &#x2630;
          </span>

          {/* Index */}
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: '#3b82f6',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {i + 1}
          </span>

          {/* Name */}
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {effect.name}
          </span>

          {/* Remove button */}
          <button
            onClick={() => handleRemove(i)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: 14,
              padding: '0 2px',
              lineHeight: 1,
            }}
            title="Remove effect"
          >
            &times;
          </button>
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>
        Drag to reorder. Effects are applied top to bottom.
      </div>
    </div>
  )
}
