import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from '../SceneLighting'
import { useClawMachineSetup } from '../../../hooks/useClawMachineSetup'
import { useClawInput } from '../../../hooks/useClawInput'
import { ClawController } from './ClawController'
import { useUIStore } from '../../../store/uiStore'
import type { ShaderConfig } from '../../../types/shader'

// Only preload when this module is imported (lazy)
useGLTF.preload('/models/clawMachine.glb')

interface ClawGameSceneProps {
  shader: ShaderConfig | null
  tileId: string
}

export function ClawGameScene({ shader: _shader, tileId }: ClawGameSceneProps) {
  const { scene } = useGLTF('/models/clawMachine.glb')
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const isActive = selectedTileId === tileId

  // Clone so each tile gets its own instance
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Extract node references and configure the model
  const refs = useClawMachineSetup(clonedScene)

  // Input handling
  const inputRef = useClawInput(tileId)

  return (
    <group>
      <primitive object={clonedScene} />
      <ClawController refs={refs} inputRef={inputRef} isActive={isActive} />
      <SceneLighting />
    </group>
  )
}
