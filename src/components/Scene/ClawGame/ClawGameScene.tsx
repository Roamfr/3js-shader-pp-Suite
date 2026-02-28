import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from '../SceneLighting'
import { useClawMachineSetup } from '../../../hooks/useClawMachineSetup'
import type { ShaderConfig } from '../../../types/shader'

// Only preload when this module is imported (lazy)
useGLTF.preload('/models/clawMachine.glb')

interface ClawGameSceneProps {
  shader: ShaderConfig | null
  tileId: string
}

export function ClawGameScene({ shader: _shader, tileId: _tileId }: ClawGameSceneProps) {
  const { scene } = useGLTF('/models/clawMachine.glb')

  // Clone so each tile gets its own instance
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Extract node references and configure the model
  const _refs = useClawMachineSetup(clonedScene)

  return (
    <group>
      <primitive object={clonedScene} />
      <SceneLighting />
    </group>
  )
}
