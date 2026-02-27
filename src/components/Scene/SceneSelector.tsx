import { useGalleryStore } from '../../store/galleryStore'
import { useUIStore } from '../../store/uiStore'
import type { SceneType, BuiltinModel } from '../../types/tile'

const SCENE_OPTIONS: { value: SceneType; label: string }[] = [
  { value: 'procedural', label: 'Procedural' },
  { value: 'materialSpheres', label: 'Material Spheres' },
  { value: 'environment', label: 'Environment (GLTF)' },
  { value: 'customGLTF', label: 'Custom GLTF' },
]

const MODEL_OPTIONS: { value: BuiltinModel; label: string }[] = [
  { value: 'DamagedHelmet', label: 'Damaged Helmet' },
  { value: 'Duck', label: 'Duck' },
  { value: 'clawMachine', label: 'Claw Machine' },
]

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 8px',
  background: '#1a1a1a',
  color: '#ccc',
  border: '1px solid #333',
  borderRadius: 4,
  fontSize: 13,
  cursor: 'pointer',
}

export function SceneSelector() {
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const setTileScene = useGalleryStore((s) => s.setTileScene)
  const setTileModel = useGalleryStore((s) => s.setTileModel)

  const selectedTile = tiles.find((t) => t.id === selectedTileId)

  if (!selectedTile) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        Select a tile to change its scene
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <select
        value={selectedTile.sceneType}
        onChange={(e) => setTileScene(selectedTile.id, e.target.value as SceneType)}
        style={selectStyle}
      >
        {SCENE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {selectedTile.sceneType === 'environment' && (
        <select
          value={selectedTile.builtinModel}
          onChange={(e) => setTileModel(selectedTile.id, e.target.value as BuiltinModel)}
          style={selectStyle}
        >
          {MODEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
