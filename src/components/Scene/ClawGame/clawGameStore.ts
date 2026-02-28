import { create } from 'zustand'
import type { GamePhase } from './useClawGameState'

interface ClawGameTileState {
  phase: GamePhase
  statusText: string
  grabSuccess: boolean
}

interface ClawGameInputCallbacks {
  setMoveDir: (x: number, z: number) => void
  triggerAction: () => void
}

interface ClawGameStore {
  tileStates: Record<string, ClawGameTileState>
  tileInputs: Record<string, ClawGameInputCallbacks>
  setTileState: (tileId: string, state: ClawGameTileState) => void
  setTileInputs: (tileId: string, inputs: ClawGameInputCallbacks) => void
  removeTile: (tileId: string) => void
}

export const useClawGameStore = create<ClawGameStore>((set) => ({
  tileStates: {},
  tileInputs: {},
  setTileState: (tileId, state) =>
    set((prev) => ({
      tileStates: { ...prev.tileStates, [tileId]: state },
    })),
  setTileInputs: (tileId, inputs) =>
    set((prev) => ({
      tileInputs: { ...prev.tileInputs, [tileId]: inputs },
    })),
  removeTile: (tileId) =>
    set((prev) => {
      const { [tileId]: _s, ...restStates } = prev.tileStates
      const { [tileId]: _i, ...restInputs } = prev.tileInputs
      return { tileStates: restStates, tileInputs: restInputs }
    }),
}))
