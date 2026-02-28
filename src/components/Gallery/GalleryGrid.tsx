import { useMemo, useSyncExternalStore } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { useEvalStore } from '../../store/evalStore'
import { TileView } from './TileView'
import { EvalPageControls } from '../Eval/EvalPageControls'
import type { TileConfig, CameraState } from '../../types/tile'
import type { ShaderConfig, PostEffectConfig } from '../../types/shader'
import type { EffectCombination } from '../../lib/combinationGenerator'

const GRID_COLUMNS: Record<string, number> = {
  '2x2': 2,
  '2x3': 3,
  '3x3': 3,
}

// Responsive breakpoints
const MOBILE_MAX = 640
const TABLET_MAX = 1024

function getScreenWidth() {
  return window.innerWidth
}

function subscribeToResize(cb: () => void) {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}

function useWindowWidth() {
  return useSyncExternalStore(subscribeToResize, getScreenWidth)
}

const CITY_CAMERA: CameraState = {
  position: [8, 10, 10],
  target: [0, 0, 0],
}

function comboToTile(combo: EffectCombination): TileConfig {
  const postEffects: PostEffectConfig[] = []
  if (combo.postEffect) {
    postEffects.push(combo.postEffect.shader as PostEffectConfig)
  }

  return {
    id: `eval-${combo.id}`,
    label: combo.label,
    sceneType: 'environment',
    builtinModel: 'lowPolyCity',
    customModelUrl: null,
    shader: combo.material ? (combo.material.shader as ShaderConfig) : null,
    postEffects,
    cameraState: { ...CITY_CAMERA },
    isGenerating: false,
    error: null,
    lastGoodShader: null,
  }
}

export function GalleryGrid() {
  const tiles = useGalleryStore((s) => s.tiles)
  const gridSize = useGalleryStore((s) => s.gridSize)
  const isEvalMode = useEvalStore((s) => s.isEvalMode)
  const currentPage = useEvalStore((s) => s.currentPage)
  const filter = useEvalStore((s) => s.filter)
  const pageSize = useEvalStore((s) => s.pageSize)
  const getCombinations = useEvalStore((s) => s.currentPageCombinations)
  const width = useWindowWidth()

  const evalTiles = useMemo(() => {
    if (!isEvalMode) return null
    return getCombinations().map(comboToTile)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEvalMode, currentPage, filter, pageSize])

  const displayTiles = evalTiles ?? tiles

  // Responsive column override
  let columns = GRID_COLUMNS[gridSize] ?? 2
  if (width <= MOBILE_MAX) {
    columns = 1
  } else if (width <= TABLET_MAX) {
    columns = Math.min(columns, 2)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 8,
          width: '100%',
          height: '100%',
          padding: 8,
          boxSizing: 'border-box',
        }}
      >
        {displayTiles.map((tile) => (
          <TileView key={tile.id} tile={tile} />
        ))}
      </div>
      <EvalPageControls />
    </div>
  )
}
