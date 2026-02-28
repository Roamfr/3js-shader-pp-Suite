import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ClawMachineRefs } from '../../../hooks/useClawMachineSetup'
import type { ClawInput } from '../../../hooks/useClawInput'
import type { GameState } from './useClawGameState'

// Game constants
const CARRIAGE_SPEED = 3.0
const DESCENT_SPEED = 4.0
const ASCENT_SPEED = 3.0
const GRAB_RADIUS = 2.0
const GRAB_CHANCE = 0.4
const RESULT_DURATION = 2.0
const GLOW_COLOR = new THREE.Color(1.0, 0.4, 0.6) // Pink glow

interface ClawControllerProps {
  refs: ClawMachineRefs
  inputRef: React.MutableRefObject<ClawInput>
  isActive: boolean
  shaderActive: boolean
  gameState: GameState
  onStartPositioning: () => void
  onStartDescending: () => void
  onStartAscending: (prize: THREE.Object3D | null, success: boolean) => void
  onShowResult: () => void
  onReset: () => void
}

export function ClawController({
  refs,
  inputRef,
  isActive,
  shaderActive,
  gameState,
  onStartPositioning,
  onStartDescending,
  onStartAscending,
  onShowResult,
  onReset,
}: ClawControllerProps) {
  const { carriageRef, clawArmRef, cableRef, moveBounds, armRestLocalY, validPrizes, floorBounds } = refs
  const initialized = useRef(false)
  const resultTimer = useRef(0)
  const descentTarget = useRef(0)
  const originalPrizeParent = useRef<THREE.Object3D | null>(null)
  const originalPrizePos = useRef(new THREE.Vector3())
  const homePosition = useRef(new THREE.Vector3())
  const cableRestScaleY = useRef(1)
  const armMaterials = useRef<THREE.MeshStandardMaterial[]>([])
  const needsInit = useRef(true)

  // Store carriage home position and cable rest scale on init
  useEffect(() => {
    homePosition.current.copy(carriageRef.position)
    cableRestScaleY.current = cableRef.scale.y

    // Collect arm materials for emissive glow (already cloned per-instance in setup hook)
    const mats: THREE.MeshStandardMaterial[] = []
    clawArmRef.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mat = (child as THREE.Mesh).material
        if (mat instanceof THREE.MeshStandardMaterial) {
          mats.push(mat)
        }
      }
    })
    armMaterials.current = mats
    needsInit.current = true
  }, [carriageRef, cableRef, clawArmRef])

  // Spawn random prizes on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const count = 8 + Math.floor(Math.random() * 5) // 8-12
    const shuffled = [...validPrizes].sort(() => Math.random() - 0.5)
    const chosen = shuffled.slice(0, count)
    for (const prize of chosen) {
      prize.visible = true
    }
  }, [validPrizes])

  // Auto-transition from IDLE to POSITIONING when tile becomes active
  useEffect(() => {
    if (isActive && gameState.phase === 'IDLE') {
      onStartPositioning()
    }
  }, [isActive, gameState.phase, onStartPositioning])

  // Reset game when tile is deselected
  useEffect(() => {
    if (!isActive && gameState.phase !== 'IDLE') {
      // Snap arm back to rest
      clawArmRef.position.y = armRestLocalY

      // Release any grabbed prize
      if (gameState.grabbedPrize && originalPrizeParent.current) {
        originalPrizeParent.current.attach(gameState.grabbedPrize)
        gameState.grabbedPrize.position.copy(originalPrizePos.current)
        originalPrizeParent.current = null
      }

      // Reset emissive
      for (const mat of armMaterials.current) {
        mat.emissive.setScalar(0)
        mat.emissiveIntensity = 0
      }

      resultTimer.current = 0
      onReset()
    }
  }, [isActive, gameState.phase, gameState.grabbedPrize, clawArmRef, armRestLocalY, onReset])

  useFrame((_, delta) => {
    // Compute descent target on first frame when world matrices are valid
    if (needsInit.current) {
      needsInit.current = false
      const targetWorldY = floorBounds.max.y + 1.0
      const carriageWorldY = new THREE.Vector3()
      carriageRef.getWorldPosition(carriageWorldY)
      descentTarget.current = armRestLocalY - (carriageWorldY.y - targetWorldY)
    }

    if (!isActive) return

    // Update emissive glow based on game phase (skip when shader overrides materials)
    if (!shaderActive) {
      const isGlowing = gameState.phase === 'DESCENDING' || gameState.phase === 'ASCENDING'
      for (const mat of armMaterials.current) {
        if (isGlowing) {
          mat.emissive.copy(GLOW_COLOR)
          mat.emissiveIntensity = 0.5
        } else {
          mat.emissive.setScalar(0)
          mat.emissiveIntensity = 0
        }
      }
    }

    // Update cable stretch: scale Y proportionally to arm descent
    const armDelta = armRestLocalY - clawArmRef.position.y
    const stretchFactor = 1 + armDelta * 0.15
    cableRef.scale.y = cableRestScaleY.current * Math.max(1, stretchFactor)

    switch (gameState.phase) {
      case 'POSITIONING': {
        const { moveDir, actionPressed } = inputRef.current

        if (moveDir.x !== 0 || moveDir.z !== 0) {
          const speed = CARRIAGE_SPEED * delta
          carriageRef.position.x += moveDir.x * speed
          carriageRef.position.z += moveDir.z * speed

          carriageRef.position.x = Math.max(
            moveBounds.minX,
            Math.min(moveBounds.maxX, carriageRef.position.x)
          )
          carriageRef.position.z = Math.max(
            moveBounds.minZ,
            Math.min(moveBounds.maxZ, carriageRef.position.z)
          )
        }

        if (actionPressed) {
          inputRef.current.actionPressed = false
          onStartDescending()
        }
        break
      }

      case 'DESCENDING': {
        clawArmRef.position.y -= DESCENT_SPEED * delta

        if (clawArmRef.position.y <= descentTarget.current) {
          clawArmRef.position.y = descentTarget.current

          const armWorldPos = new THREE.Vector3()
          clawArmRef.getWorldPosition(armWorldPos)

          let nearestPrize: THREE.Object3D | null = null
          let nearestDist = Infinity

          for (const prize of validPrizes) {
            if (!prize.visible) continue
            const prizeWorldPos = new THREE.Vector3()
            prize.getWorldPosition(prizeWorldPos)

            const dx = armWorldPos.x - prizeWorldPos.x
            const dz = armWorldPos.z - prizeWorldPos.z
            const dist = Math.sqrt(dx * dx + dz * dz)

            if (dist < nearestDist) {
              nearestDist = dist
              nearestPrize = prize
            }
          }

          const inRange = nearestDist <= GRAB_RADIUS && nearestPrize !== null
          const success = inRange && Math.random() < GRAB_CHANCE

          if (success && nearestPrize) {
            originalPrizeParent.current = nearestPrize.parent
            originalPrizePos.current.copy(nearestPrize.position)
            clawArmRef.attach(nearestPrize)
            onStartAscending(nearestPrize, true)
          } else {
            onStartAscending(null, false)
          }
        }
        break
      }

      case 'ASCENDING': {
        clawArmRef.position.y += ASCENT_SPEED * delta

        if (clawArmRef.position.y >= armRestLocalY) {
          clawArmRef.position.y = armRestLocalY
          onShowResult()
        }
        break
      }

      case 'RESULT': {
        resultTimer.current += delta
        if (resultTimer.current >= RESULT_DURATION) {
          resultTimer.current = 0

          if (gameState.grabbedPrize && originalPrizeParent.current) {
            originalPrizeParent.current.attach(gameState.grabbedPrize)
            gameState.grabbedPrize.position.copy(originalPrizePos.current)
            originalPrizeParent.current = null
          }

          onReset()
        }
        break
      }
    }

    // Clear actionPressed after processing
    inputRef.current.actionPressed = false
  })

  return null
}
