import { Suspense, useRef, useCallback, useState } from 'react'
import { View, PerspectiveCamera, OrbitControls } from '@react-three/drei'
import { useUIStore } from '../../store/uiStore'
import { useGalleryStore } from '../../store/galleryStore'
import { ProceduralScene } from '../Scene/ProceduralScene'
import { MaterialSpheres } from '../Scene/MaterialSpheres'
import { EnvironmentScene } from '../Scene/EnvironmentScene'
import { CustomGLTFScene } from '../Scene/CustomGLTFScene'
import { ClawGameScene } from '../Scene/ClawGame/ClawGameScene'
import { ClawGameHUD } from '../Scene/ClawGame/ClawGameHUD'
import { PostEffectLayer } from '../Shader/PostEffectLayer'
import { RenderErrorBoundary } from '../Error/RenderErrorBoundary'
import { TileFPSCounter, TileFPSOverlay } from '../Performance/TileFPS'
import { TileLabel } from './TileLabel'
import { TileControls } from './TileControls'
import type { TileConfig, CameraState } from '../../types/tile'

interface TileViewProps {
  tile: TileConfig
}

// Fixed camera for claw game: front-angled view showing the machine
const CLAW_GAME_CAMERA_POS: [number, number, number] = [0, 14, 18]
const CLAW_GAME_CAMERA_TARGET: [number, number, number] = [0, 8, 0]

function TileScene({ tile }: { tile: TileConfig }) {
  switch (tile.sceneType) {
    case 'materialSpheres':
      return <MaterialSpheres shader={tile.shader} />
    case 'environment':
      return <EnvironmentScene shader={tile.shader} model={tile.builtinModel} />
    case 'customGLTF':
      return <CustomGLTFScene shader={tile.shader} modelUrl={tile.customModelUrl} />
    case 'clawGame':
      return <ClawGameScene shader={tile.shader} tileId={tile.id} />
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
  const showFPS = useUIStore((s) => s.showFPS)
  const [fps, setFps] = useState(0)
  const [hovered, setHovered] = useState(false)
  const clearTile = useGalleryStore((s) => s.clearTile)
  const duplicateTile = useGalleryStore((s) => s.duplicateTile)
  const resetTileCamera = useGalleryStore((s) => s.resetTileCamera)
  const syncCameraToAll = useGalleryStore((s) => s.syncCameraToAll)
  const setTileCameraState = useGalleryStore((s) => s.setTileCameraState)

  const isSelected = selectedTileId === tile.id
  const isClawGame = tile.sceneType === 'clawGame'
  const clawGameActive = isClawGame && isSelected

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

  // Camera position: use fixed game camera for claw game, otherwise tile's camera state
  const cameraPos = isClawGame ? CLAW_GAME_CAMERA_POS : tile.cameraState.position
  const cameraTarget = isClawGame ? CLAW_GAME_CAMERA_TARGET : tile.cameraState.target

  const effectName = tile.shader?.name ?? tile.postEffects[0]?.name

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
      <TileFPSOverlay fps={fps} visible={showFPS} />
      <TileLabel
        label={tile.label}
        effectName={effectName}
        isGenerating={tile.isGenerating}
      />
      <TileControls
        visible={hovered}
        onClear={() => clearTile(tile.id)}
        onDuplicate={() => duplicateTile(tile.id)}
        onResetCamera={() => resetTileCamera(tile.id)}
      />

      {/* Claw game HUD overlay (HTML, only when selected) */}
      {clawGameActive && <ClawGameHUD tileId={tile.id} />}

      <View style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#5b8fb9']} />
        <PerspectiveCamera
          makeDefault
          position={cameraPos}
          fov={50}
        />
        <OrbitControls
          target={cameraTarget}
          onEnd={handleCameraChange}
          enabled
        />

        <RenderErrorBoundary resetKey={tile.shader?.name ?? '' + tile.postEffects.length}>
          <Suspense fallback={null}>
            <TileScene tile={tile} />
          </Suspense>

          {tile.postEffects.length > 0 && (
            <PostEffectLayer effects={tile.postEffects} />
          )}
          {showFPS && <TileFPSCounter onFPS={setFps} />}
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
