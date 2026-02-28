import { create } from 'zustand'
import {
  generateAllCombinations,
  type EffectCombination,
} from '../lib/combinationGenerator'

export type EvalFilter = 'all' | 'postfx' | 'material' | 'combo'

interface EvalStore {
  isEvalMode: boolean
  allCombinations: EffectCombination[]
  filter: EvalFilter
  currentPage: number
  pageSize: number

  // Derived getters
  filteredCombinations: () => EffectCombination[]
  totalPages: () => number
  currentPageCombinations: () => EffectCombination[]

  // Actions
  startEval: (pageSize: number) => void
  stopEval: () => void
  setFilter: (filter: EvalFilter) => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
}

export const useEvalStore = create<EvalStore>((set, get) => ({
  isEvalMode: false,
  allCombinations: [],
  filter: 'all',
  currentPage: 0,
  pageSize: 4,

  filteredCombinations: () => {
    const { allCombinations, filter } = get()
    if (filter === 'all') return allCombinations
    return allCombinations.filter((c) => {
      if (filter === 'postfx') return c.category === 'postfx'
      if (filter === 'material') return c.category === 'material'
      if (filter === 'combo') return c.category === 'combo'
      return true
    })
  },

  totalPages: () => {
    const filtered = get().filteredCombinations()
    return Math.max(1, Math.ceil(filtered.length / get().pageSize))
  },

  currentPageCombinations: () => {
    const { currentPage, pageSize } = get()
    const filtered = get().filteredCombinations()
    const start = currentPage * pageSize
    return filtered.slice(start, start + pageSize)
  },

  startEval: (pageSize) =>
    set({
      isEvalMode: true,
      allCombinations: generateAllCombinations(),
      currentPage: 0,
      pageSize,
    }),

  stopEval: () =>
    set({
      isEvalMode: false,
      allCombinations: [],
      currentPage: 0,
      filter: 'all',
    }),

  setFilter: (filter) => set({ filter, currentPage: 0 }),

  nextPage: () =>
    set((state) => {
      const total = state.totalPages()
      return { currentPage: Math.min(state.currentPage + 1, total - 1) }
    }),

  prevPage: () =>
    set((state) => ({
      currentPage: Math.max(state.currentPage - 1, 0),
    })),

  goToPage: (page) =>
    set((state) => {
      const total = state.totalPages()
      return { currentPage: Math.max(0, Math.min(page, total - 1)) }
    }),
}))
