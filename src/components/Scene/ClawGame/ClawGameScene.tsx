import { useMemo, useEffect, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from '../SceneLighting'
import { useClawMachineSetup } from '../../../hooks/useClawMachineSetup'
import { useClawInput } from '../../../hooks/useClawInput'
import { useShaderOverride } from '../../../hooks/useShaderOverride'
import { useClawGameState } from './useClawGameState'
import { ClawController } from './ClawController'
import { useClawGameStore } from './clawGameStore'
import { useUIStore } from '../../../store/uiStore'
import type { ShaderConfig } from '../../../types/shader'

useGLTF.preload('/models/clawMachine.glb')

interface ClawGameSceneProps {
  shader: ShaderConfig | null
  tileId: string
}

export function ClawGameScene({ shader, tileId }: ClawGameSceneProps) {
  const { scene } = useGLTF('/models/clawMachine.glb')
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const isActive = selectedTileId === tileId

  const clonedScene = useMemo(() => scene.clone(true), [scene])
  const refs = useClawMachineSetup(clonedScene)
  const shaderActive = useShaderOverride(clonedScene, shader)
  const inputRef = useClawInput(tileId)

  const { state: gameState, startPositioning, startDescending, startAscending, showResult, reset } =
    useClawGameState()

  // Sync game state to zustand store for HTML HUD
  const setTileState = useClawGameStore((s) => s.setTileState)
  const setTileInputs = useClawGameStore((s) => s.setTileInputs)
  const removeTile = useClawGameStore((s) => s.removeTile)

  useEffect(() => {
    setTileState(tileId, {
      phase: gameState.phase,
      statusText: gameState.statusText,
      grabSuccess: gameState.grabSuccess,
    })
  }, [tileId, gameState.phase, gameState.statusText, gameState.grabSuccess, setTileState])

  // Register input callbacks for HUD buttons
  const setMoveDir = useCallback((x: number, z: number) => {
    inputRef.current.moveDir.x = x
    inputRef.current.moveDir.z = z
  }, [inputRef])

  const triggerAction = useCallback(() => {
    inputRef.current.actionPressed = true
  }, [inputRef])

  useEffect(() => {
    setTileInputs(tileId, { setMoveDir, triggerAction })
  }, [tileId, setMoveDir, triggerAction, setTileInputs])

  useEffect(() => {
    return () => removeTile(tileId)
  }, [tileId, removeTile])

  return (
    <group>
      <primitive object={clonedScene} />
      <ClawController
        refs={refs}
        inputRef={inputRef}
        isActive={isActive}
        shaderActive={shaderActive}
        gameState={gameState}
        onStartPositioning={startPositioning}
        onStartDescending={startDescending}
        onStartAscending={startAscending}
        onShowResult={showResult}
        onReset={reset}
      />
      <SceneLighting />
    </group>
  )
}
