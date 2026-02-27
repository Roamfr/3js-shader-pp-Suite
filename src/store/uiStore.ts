import { create } from 'zustand'

type SidebarPanel = 'prompt' | 'controls' | 'code'
type ShaderMode = 'material' | 'postprocessing'

interface UIStore {
  selectedTileId: string | null
  sidebarPanel: SidebarPanel
  shaderMode: ShaderMode
  cameraSyncEnabled: boolean
  apiKey: string

  selectTile: (id: string | null) => void
  setSidebarPanel: (panel: SidebarPanel) => void
  setShaderMode: (mode: ShaderMode) => void
  toggleCameraSync: () => void
  setApiKey: (key: string) => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedTileId: null,
  sidebarPanel: 'prompt',
  shaderMode: 'material',
  cameraSyncEnabled: false,
  apiKey: localStorage.getItem('anthropic-api-key') ?? '',

  selectTile: (id) => set({ selectedTileId: id }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  setShaderMode: (mode) => set({ shaderMode: mode }),
  toggleCameraSync: () => set((state) => ({ cameraSyncEnabled: !state.cameraSyncEnabled })),
  setApiKey: (key) => {
    localStorage.setItem('anthropic-api-key', key)
    set({ apiKey: key })
  },
}))
