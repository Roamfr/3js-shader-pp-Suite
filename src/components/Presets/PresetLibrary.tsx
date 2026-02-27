import { useState, useCallback } from 'react'
import { PRESETS, type PresetCategory, type PresetDefinition } from '../../data/presets'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { useHistoryStore } from '../../store/historyStore'

type Filter = 'all' | PresetCategory

const filterBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: '3px 8px',
  fontSize: 10,
  fontWeight: 600,
  background: active ? '#3b82f6' : 'transparent',
  border: `1px solid ${active ? '#3b82f6' : '#444'}`,
  borderRadius: 4,
  color: active ? '#fff' : '#888',
  cursor: 'pointer',
  textTransform: 'uppercase',
})

const cardStyle: React.CSSProperties = {
  padding: '8px 10px',
  background: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 6,
  cursor: 'pointer',
  transition: 'border-color 0.15s',
}

export function PresetLibrary() {
  const [filter, setFilter] = useState<Filter>('all')
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const setShader = useGalleryStore((s) => s.setShader)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const tileId = selectedTileId ?? tiles[0]?.id

  const filteredPresets = filter === 'all' ? PRESETS : PRESETS.filter((p) => p.category === filter)

  const applyPreset = useCallback((preset: PresetDefinition) => {
    if (!tileId) return

    // Push undo snapshot
    const tile = tiles.find((t) => t.id === tileId)
    if (tile) {
      pushSnapshot(tileId, { shader: tile.shader, postEffects: tile.postEffects })
    }

    if (preset.shader.type === 'material') {
      setShader(tileId, preset.shader)
    } else {
      setPostEffect(tileId, [preset.shader])
    }
  }, [tileId, tiles, setShader, setPostEffect, pushSnapshot])

  return (
    <div>
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button style={filterBtnStyle(filter === 'all')} onClick={() => setFilter('all')}>All</button>
        <button style={filterBtnStyle(filter === 'material')} onClick={() => setFilter('material')}>Material</button>
        <button style={filterBtnStyle(filter === 'postprocessing')} onClick={() => setFilter('postprocessing')}>Post-FX</button>
      </div>

      {/* Preset grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 6,
        maxHeight: 200,
        overflowY: 'auto',
      }}>
        {filteredPresets.map((preset) => (
          <div
            key={preset.id}
            style={cardStyle}
            onClick={() => applyPreset(preset)}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#333' }}
            title={preset.description}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#ddd', marginBottom: 2 }}>
              {preset.name}
            </div>
            <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>
              {preset.category === 'material' ? 'MAT' : 'FX'}
            </div>
          </div>
        ))}
      </div>

      {!tileId && (
        <div style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
          Select a tile to apply presets
        </div>
      )}
    </div>
  )
}
