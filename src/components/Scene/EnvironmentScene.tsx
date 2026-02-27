import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from './SceneLighting'
import type { ShaderConfig } from '../../types/shader'

export type BuiltinModel = 'DamagedHelmet' | 'Duck' | 'clawMachine'

const MODEL_PATHS: Record<BuiltinModel, string> = {
  DamagedHelmet: '/models/DamagedHelmet.glb',
  Duck: '/models/Duck.glb',
  clawMachine: '/models/clawMachine.glb',
}

// Preload all built-in models
for (const path of Object.values(MODEL_PATHS)) {
  useGLTF.preload(path)
}

interface EnvironmentSceneProps {
  shader: ShaderConfig | null
  model?: BuiltinModel
}

export function EnvironmentScene({ shader: _shader, model = 'DamagedHelmet' }: EnvironmentSceneProps) {
  const { scene } = useGLTF(MODEL_PATHS[model])

  // Clone the scene so each tile gets its own instance
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  return (
    <group>
      <primitive object={clonedScene} />
      <SceneLighting />
    </group>
  )
}
