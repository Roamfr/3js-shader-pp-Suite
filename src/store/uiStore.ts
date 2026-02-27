import { create } from 'zustand'

type SidebarPanel = 'prompt' | 'controls' | 'code'
type ShaderMode = 'material' | 'postprocessing'

interface UIStore {
  selectedTileId: string | null
  sidebarPanel: SidebarPanel
  shaderMode: ShaderMode
  cameraSyncEnabled: boolean
  apiKey: string
  importDialogOpen: boolean
  exportDialogOpen: boolean
  diffDialogOpen: boolean
  showFPS: boolean
  sidebarCollapsed: boolean

  selectTile: (id: string | null) => void
  setSidebarPanel: (panel: SidebarPanel) => void
  setShaderMode: (mode: ShaderMode) => void
  toggleCameraSync: () => void
  setApiKey: (key: string) => void
  setImportDialogOpen: (open: boolean) => void
  setExportDialogOpen: (open: boolean) => void
  setDiffDialogOpen: (open: boolean) => void
  toggleFPS: () => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  selectedTileId: null,
  sidebarPanel: 'prompt',
  shaderMode: 'material',
  cameraSyncEnabled: false,
  apiKey: localStorage.getItem('anthropic-api-key') ?? '',
  importDialogOpen: false,
  exportDialogOpen: false,
  diffDialogOpen: false,
  showFPS: false,
  sidebarCollapsed: false,

  selectTile: (id) => set({ selectedTileId: id }),
  setSidebarPanel: (panel) => set({ sidebarPanel: panel }),
  setShaderMode: (mode) => set({ shaderMode: mode }),
  toggleCameraSync: () => set((state) => ({ cameraSyncEnabled: !state.cameraSyncEnabled })),
  setApiKey: (key) => {
    localStorage.setItem('anthropic-api-key', key)
    set({ apiKey: key })
  },
  setImportDialogOpen: (open) => set({ importDialogOpen: open }),
  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),
  setDiffDialogOpen: (open) => set({ diffDialogOpen: open }),
  toggleFPS: () => set((state) => ({ showFPS: !state.showFPS })),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
}))
