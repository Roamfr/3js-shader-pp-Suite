import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ClawMachineRefs } from '../../../hooks/useClawMachineSetup'
import type { ClawInput } from '../../../hooks/useClawInput'

const CARRIAGE_SPEED = 3.0 // units per second

interface ClawControllerProps {
  refs: ClawMachineRefs
  inputRef: React.MutableRefObject<ClawInput>
  isActive: boolean
}

export function ClawController({ refs, inputRef, isActive }: ClawControllerProps) {
  const { carriageRef, moveBounds } = refs
  const initialized = useRef(false)

  // Spawn random prizes on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const count = 8 + Math.floor(Math.random() * 5) // 8-12
    const shuffled = [...refs.validPrizes].sort(() => Math.random() - 0.5)
    const chosen = shuffled.slice(0, count)
    for (const prize of chosen) {
      prize.visible = true
    }
  }, [refs.validPrizes])

  useFrame((_, delta) => {
    if (!isActive) return

    const { moveDir } = inputRef.current

    // Apply movement with smooth interpolation
    if (moveDir.x !== 0 || moveDir.z !== 0) {
      const speed = CARRIAGE_SPEED * delta
      carriageRef.position.x += moveDir.x * speed
      carriageRef.position.z += moveDir.z * speed

      // Clamp to machine interior bounds
      carriageRef.position.x = Math.max(
        moveBounds.minX,
        Math.min(moveBounds.maxX, carriageRef.position.x)
      )
      carriageRef.position.z = Math.max(
        moveBounds.minZ,
        Math.min(moveBounds.maxZ, carriageRef.position.z)
      )
    }
  })

  return null
}
