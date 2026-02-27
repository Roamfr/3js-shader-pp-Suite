import { useEffect, useRef } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { getPresetById } from '../../data/presets'
import type { ShaderConfig, PostEffectConfig } from '../../types/shader'

const WELCOME_KEY = 'shader-eval-welcomed'

/**
 * Example presets to load on first visit.
 * 4 tiles: 2 material + 2 post-processing (one from each category pair).
 */
const WELCOME_PRESETS = [
  { presetId: 'holographic', sceneType: 'procedural' as const },
  { presetId: 'toon', sceneType: 'materialSpheres' as const },
  { presetId: 'film-grain', sceneType: 'environment' as const },
  { presetId: 'chromatic-aberration', sceneType: 'procedural' as const },
]

/**
 * Invisible component that applies welcome presets on first load.
 * Only runs once (tracked via localStorage).
 */
export function WelcomeState() {
  const hasRun = useRef(false)
  const tiles = useGalleryStore((s) => s.tiles)
  const setShader = useGalleryStore((s) => s.setShader)
  const setPostEffect = useGalleryStore((s) => s.setPostEffect)
  const setTileScene = useGalleryStore((s) => s.setTileScene)

  useEffect(() => {
    if (hasRun.current) return
    hasRun.current = true

    // Skip if already welcomed or if tiles already have shaders (restored from persistence)
    if (localStorage.getItem(WELCOME_KEY)) return
    const hasAnyShader = tiles.some(
      (t) => t.shader !== null || t.postEffects.length > 0
    )
    if (hasAnyShader) {
      localStorage.setItem(WELCOME_KEY, '1')
      return
    }

    // Apply welcome presets to the first N tiles
    const count = Math.min(WELCOME_PRESETS.length, tiles.length)
    for (let i = 0; i < count; i++) {
      const { presetId, sceneType } = WELCOME_PRESETS[i]
      const preset = getPresetById(presetId)
      if (!preset) continue

      const tileId = tiles[i].id
      setTileScene(tileId, sceneType)

      if (preset.shader.type === 'material') {
        setShader(tileId, preset.shader as ShaderConfig)
      } else {
        setPostEffect(tileId, [preset.shader as PostEffectConfig])
      }
    }

    localStorage.setItem(WELCOME_KEY, '1')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
