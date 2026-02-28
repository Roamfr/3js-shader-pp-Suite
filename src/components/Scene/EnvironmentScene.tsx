import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from './SceneLighting'
import { useShaderOverride } from '../../hooks/useShaderOverride'
import type { ShaderConfig } from '../../types/shader'

export type BuiltinModel = 'DamagedHelmet' | 'Duck' | 'clawMachine' | 'lowPolyCity'

const MODEL_PATHS: Record<BuiltinModel, string> = {
  DamagedHelmet: '/models/DamagedHelmet.glb',
  Duck: '/models/Duck.glb',
  clawMachine: '/models/clawMachine.glb',
  lowPolyCity: '/models/low-poly-city/low-poly-city.glb',
}

// Preload all built-in models
for (const path of Object.values(MODEL_PATHS)) {
  useGLTF.preload(path)
}

interface EnvironmentSceneProps {
  shader: ShaderConfig | null
  model?: BuiltinModel
}

export function EnvironmentScene({ shader, model = 'DamagedHelmet' }: EnvironmentSceneProps) {
  const { scene } = useGLTF(MODEL_PATHS[model])

  // Clone the scene so each tile gets its own instance
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Apply material shader override to GLTF meshes
  useShaderOverride(clonedScene, shader)

  return (
    <group>
      <primitive object={clonedScene} />
      <SceneLighting />
    </group>
  )
}
