import { useReducer, useCallback } from 'react'
import * as THREE from 'three'

export type GamePhase =
  | 'IDLE'
  | 'POSITIONING'
  | 'DESCENDING'
  | 'ASCENDING'
  | 'RESULT'

export interface GameState {
  phase: GamePhase
  grabbedPrize: THREE.Object3D | null
  grabSuccess: boolean
  statusText: string
}

type GameAction =
  | { type: 'START_POSITIONING' }
  | { type: 'START_DESCENDING' }
  | { type: 'START_ASCENDING'; prize: THREE.Object3D | null; success: boolean }
  | { type: 'SHOW_RESULT' }
  | { type: 'RESET' }

function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_POSITIONING':
      return { ...state, phase: 'POSITIONING', statusText: 'Move the claw!' }
    case 'START_DESCENDING':
      return { ...state, phase: 'DESCENDING', statusText: 'Dropping...' }
    case 'START_ASCENDING':
      return {
        ...state,
        phase: 'ASCENDING',
        grabbedPrize: action.prize,
        grabSuccess: action.success,
        statusText: action.success ? 'Got one!' : 'Nothing...',
      }
    case 'SHOW_RESULT':
      return {
        ...state,
        phase: 'RESULT',
        statusText: state.grabSuccess ? 'You won a prize!' : 'Try again!',
      }
    case 'RESET':
      return {
        phase: 'IDLE',
        grabbedPrize: null,
        grabSuccess: false,
        statusText: 'Press SPACE to drop!',
      }
    default:
      return state
  }
}

const INITIAL_STATE: GameState = {
  phase: 'IDLE',
  grabbedPrize: null,
  grabSuccess: false,
  statusText: 'Press SPACE to drop!',
}

export function useClawGameState() {
  const [state, dispatch] = useReducer(gameReducer, INITIAL_STATE)

  const startPositioning = useCallback(() => dispatch({ type: 'START_POSITIONING' }), [])
  const startDescending = useCallback(() => dispatch({ type: 'START_DESCENDING' }), [])
  const startAscending = useCallback(
    (prize: THREE.Object3D | null, success: boolean) =>
      dispatch({ type: 'START_ASCENDING', prize, success }),
    []
  )
  const showResult = useCallback(() => dispatch({ type: 'SHOW_RESULT' }), [])
  const reset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return { state, startPositioning, startDescending, startAscending, showResult, reset }
}
