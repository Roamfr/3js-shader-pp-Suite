import { Suspense, useRef, useCallback } from 'react'
import { View, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { ProceduralScene } from '../Scene/ProceduralScene'
import { MaterialSpheres } from '../Scene/MaterialSpheres'
import { EnvironmentScene } from '../Scene/EnvironmentScene'
import { CustomGLTFScene } from '../Scene/CustomGLTFScene'
import { PostEffectLayer } from '../Shader/PostEffectLayer'
import { RenderErrorBoundary } from '../Error/RenderErrorBoundary'
import { TileLabel } from './TileLabel'
import { TileControls } from './TileControls'
import type { TileConfig, CameraState } from '../../types/tile'

interface TileViewProps {
  tile: TileConfig
}

function TileScene({ tile }: { tile: TileConfig }) {
  switch (tile.sceneType) {
    case 'materialSpheres':
      return <MaterialSpheres shader={tile.shader} />
    case 'environment':
      return <EnvironmentScene shader={tile.shader} model={tile.builtinModel} />
    case 'customGLTF':
      return <CustomGLTFScene shader={tile.shader} modelUrl={tile.customModelUrl} />
    case 'procedural':
    default:
      return <ProceduralScene shader={tile.shader} />
  }
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
        border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
        borderRadius: 6,
        overflow: 'hidden',
        cursor: 'pointer',
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
        {/* Scene background ensures the View's scissor rect is cleared each frame */}
        <color attach="background" args={['#0a0a0a']} />
        <PerspectiveCamera
          makeDefault
          position={tile.cameraState.position}
          fov={50}
        />
        <OrbitControls
          target={tile.cameraState.target}
          onEnd={handleCameraChange}
        />

        <RenderErrorBoundary>
          {/* Suspense boundary required inside View portals —
              Environment (HDR), useGLTF, etc. suspend and there's no
              inherited Suspense inside createPortal. Without this the
              entire portal tree stays suspended (black) until a resize
              forces React to re-evaluate. */}
          <Suspense fallback={null}>
            <TileScene tile={tile} />
          </Suspense>

          {tile.postEffects.length > 0 && (
            <PostEffectLayer effects={tile.postEffects} />
          )}
        </RenderErrorBoundary>
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
