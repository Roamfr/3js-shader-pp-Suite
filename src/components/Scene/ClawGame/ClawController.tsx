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

interface ClawControllerProps {
  refs: ClawMachineRefs
  inputRef: React.MutableRefObject<ClawInput>
  isActive: boolean
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
  gameState,
  onStartPositioning,
  onStartDescending,
  onStartAscending,
  onShowResult,
  onReset,
}: ClawControllerProps) {
  const { carriageRef, clawArmRef, moveBounds, armRestLocalY, validPrizes, floorBounds } = refs
  const initialized = useRef(false)
  const resultTimer = useRef(0)
  const descentTarget = useRef(0)
  const originalPrizeParent = useRef<THREE.Object3D | null>(null)
  const originalPrizePos = useRef(new THREE.Vector3())
  const homePosition = useRef(new THREE.Vector3())

  // Store carriage home position on init
  useEffect(() => {
    homePosition.current.copy(carriageRef.position)
  }, [carriageRef])

  // Compute descent target Y (in carriage local space)
  useEffect(() => {
    const targetWorldY = floorBounds.max.y + 1.0
    const carriageWorldY = new THREE.Vector3()
    carriageRef.getWorldPosition(carriageWorldY)
    descentTarget.current = armRestLocalY - (carriageWorldY.y - targetWorldY)
  }, [floorBounds, carriageRef, armRestLocalY])

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

      resultTimer.current = 0
      onReset()
    }
  }, [isActive, gameState.phase, gameState.grabbedPrize, clawArmRef, armRestLocalY, onReset])

  useFrame((_, delta) => {
    if (!isActive) return

    switch (gameState.phase) {
      case 'POSITIONING': {
        const { moveDir, actionPressed } = inputRef.current

        // Move carriage on X/Z
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

        // Space = start descent
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

          // Check proximity to prizes
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

          // Release grabbed prize back to original position
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
