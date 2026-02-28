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

function cardStyle(active: boolean): React.CSSProperties {
  return {
    padding: '8px 10px',
    background: active ? '#1e2a4a' : '#1a1a2e',
    border: `1px solid ${active ? '#3b82f6' : '#333'}`,
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
  }
}

export function PresetLibrary() {
  const [filter, setFilter] = useState<Filter>('all')
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const setShader = useGalleryStore((s) => s.setShader)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)
  const clearTile = useGalleryStore((s) => s.clearTile)
  const pushSnapshot = useHistoryStore((s) => s.pushSnapshot)

  const tileId = selectedTileId ?? tiles[0]?.id
  const activeTile = tiles.find((t) => t.id === tileId)

  // Determine which preset is active on the current tile
  const activeShaderName = activeTile?.shader?.name ?? null
  const activePostFXName = activeTile?.postEffects[0]?.name ?? null
  const isBlank = !activeShaderName && !activePostFXName

  const filteredPresets = filter === 'all' ? PRESETS : PRESETS.filter((p) => p.category === filter)

  const applyPreset = useCallback((preset: PresetDefinition) => {
    if (!tileId) return

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

  const applyBlank = useCallback(() => {
    if (!tileId) return

    const tile = tiles.find((t) => t.id === tileId)
    if (tile) {
      pushSnapshot(tileId, { shader: tile.shader, postEffects: tile.postEffects })
    }

    clearTile(tileId)
  }, [tileId, tiles, clearTile, pushSnapshot])

  function isPresetActive(preset: PresetDefinition): boolean {
    if (preset.category === 'material') return activeShaderName === preset.name
    return activePostFXName === preset.name
  }

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
        {/* Blank / No Style card */}
        <div
          style={cardStyle(isBlank)}
          onClick={applyBlank}
          onMouseEnter={(e) => { if (!isBlank) e.currentTarget.style.borderColor = '#3b82f6' }}
          onMouseLeave={(e) => { if (!isBlank) e.currentTarget.style.borderColor = '#333' }}
          title="Remove all shaders and effects"
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: isBlank ? '#fff' : '#ddd', marginBottom: 2 }}>
            No Style
          </div>
          <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>
            BLANK
          </div>
        </div>

        {filteredPresets.map((preset) => {
          const active = isPresetActive(preset)
          return (
            <div
              key={preset.id}
              style={cardStyle(active)}
              onClick={() => applyPreset(preset)}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.borderColor = '#3b82f6' }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.borderColor = '#333' }}
              title={preset.description}
            >
              <div style={{ fontSize: 11, fontWeight: 600, color: active ? '#fff' : '#ddd', marginBottom: 2 }}>
                {preset.name}
              </div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' }}>
                {preset.category === 'material' ? 'MAT' : 'FX'}
              </div>
            </div>
          )
        })}
      </div>

      {!tileId && (
        <div style={{ color: '#666', fontSize: 11, marginTop: 6 }}>
          Select a tile to apply presets
        </div>
      )}
    </div>
  )
}
