import { useEffect, useRef } from 'react'
import { useUIStore } from '../store/uiStore'

export interface ClawInput {
  moveDir: { x: number; z: number }
  actionPressed: boolean
}

const GAME_KEYS = new Set([
  'w', 'a', 's', 'd',
  'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  ' ',
])

export function useClawInput(tileId: string): React.MutableRefObject<ClawInput> {
  const inputRef = useRef<ClawInput>({ moveDir: { x: 0, z: 0 }, actionPressed: false })
  const heldKeys = useRef(new Set<string>())
  const actionFired = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const selectedTileId = useUIStore.getState().selectedTileId
      if (selectedTileId !== tileId) return

      // Skip if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (!GAME_KEYS.has(e.key)) return

      e.preventDefault()
      e.stopPropagation()

      heldKeys.current.add(e.key)

      // Space = single action press (not hold)
      if (e.key === ' ' && !actionFired.current) {
        inputRef.current.actionPressed = true
        actionFired.current = true
      }

      // Update movement direction from held keys
      updateMoveDir()
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      heldKeys.current.delete(e.key)

      if (e.key === ' ') {
        actionFired.current = false
      }

      updateMoveDir()
    }

    function updateMoveDir() {
      let x = 0
      let z = 0
      const keys = heldKeys.current
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1
      if (keys.has('d') || keys.has('ArrowRight')) x += 1
      if (keys.has('w') || keys.has('ArrowUp')) z -= 1
      if (keys.has('s') || keys.has('ArrowDown')) z += 1
      inputRef.current.moveDir.x = x
      inputRef.current.moveDir.z = z
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [tileId])

  return inputRef
}
