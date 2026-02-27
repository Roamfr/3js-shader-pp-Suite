import { useRef, useCallback } from 'react'
import { View, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { EffectComposer } from '@react-three/postprocessing'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { ShaderTestScene } from '../Scene/ShaderTestScene'
import { DynamicPostEffect } from '../Shader/DynamicPostEffect'
import { TileLabel } from './TileLabel'
import { TileControls } from './TileControls'
import type { TileConfig, CameraState } from '../../types/tile'

interface TileViewProps {
  tile: TileConfig
}

export function TileView({ tile }: TileViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const selectTile = useUIStore((s) => s.selectTile)
  const cameraSyncEnabled = useUIStore((s) => s.cameraSyncEnabled)
  const clearTile = useGalleryStore((s) => s.clearTile)
  const duplicateTile = useGalleryStore((s) => s.duplicateTile)
  const syncCameraToAll = useGalleryStore((s) => s.syncCameraToAll)
  const setTileCameraState = useGalleryStore((s) => s.setTileCameraState)

  const isSelected = selectedTileId === tile.id

  const handleClick = useCallback(() => {
    selectTile(tile.id)
  }, [selectTile, tile.id])

  const handleCameraChange = useCallback(
    (e: any) => {
      if (!e?.target) return
      const controls = e.target
      const position: [number, number, number] = [
        controls.object.position.x,
        controls.object.position.y,
        controls.object.position.z,
      ]
      const target: [number, number, number] = [
        controls.target.x,
        controls.target.y,
        controls.target.z,
      ]
      const cameraState: CameraState = { position, target }

      if (cameraSyncEnabled) {
        syncCameraToAll(cameraState)
      } else {
        setTileCameraState(tile.id, cameraState)
      }
    },
    [cameraSyncEnabled, syncCameraToAll, setTileCameraState, tile.id]
  )

  const effectName = tile.shader?.name ?? tile.postEffects[0]?.name

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        border: isSelected ? '2px solid #3b82f6' : '2px solid #333',
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#0a0a0a',
      }}
    >
      <TileLabel
        label={tile.label}
        effectName={effectName}
        isGenerating={tile.isGenerating}
      />
      <TileControls
        onClear={() => clearTile(tile.id)}
        onDuplicate={() => duplicateTile(tile.id)}
      />

      <View style={{ width: '100%', height: '100%' }}>
        <PerspectiveCamera
          makeDefault
          position={tile.cameraState.position}
          fov={50}
        />
        <OrbitControls
          target={tile.cameraState.target}
          onEnd={handleCameraChange}
        />
        <ShaderTestScene shader={tile.shader} />

        {tile.postEffects.length > 0 && (
          <EffectComposer>
            {tile.postEffects.map((effect, i) => (
              <DynamicPostEffect key={`${effect.name}-${i}`} config={effect} />
            ))}
          </EffectComposer>
        )}
      </View>

      {tile.error && (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 4,
            padding: '2px 6px',
            background: 'rgba(255,0,0,0.3)',
            borderRadius: 3,
            fontSize: 10,
            color: '#ff6666',
            zIndex: 2,
          }}
        >
          Error
        </div>
      )}
    </div>
  )
}
