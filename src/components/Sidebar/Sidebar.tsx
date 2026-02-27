import { PromptInput } from '../Prompt/PromptInput'
import { APIKeyInput } from '../Settings/APIKeyInput'
import { GridSizeSelector } from '../Gallery/GridSizeSelector'
import { SceneSelector } from '../Scene/SceneSelector'
import { UniformPanel } from '../Controls/UniformPanel'
import { CodePanel } from '../CodeViewer/CodePanel'
import { PresetLibrary } from '../Presets/PresetLibrary'
import { EffectChain } from '../Effects/EffectChain'
import { useUIStore } from '../../store/uiStore'

type SidebarPanel = 'prompt' | 'controls' | 'code'

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#666',
  cursor: 'pointer',
}

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: '#eee',
  borderBottomColor: '#3b82f6',
}

const actionBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 0',
  fontSize: 12,
  fontWeight: 600,
  background: '#1a1a2e',
  border: '1px solid #333',
  borderRadius: 6,
  color: '#ccc',
  cursor: 'pointer',
}

export function Sidebar() {
  const sidebarPanel = useUIStore((s) => s.sidebarPanel) as SidebarPanel
  const setSidebarPanel = useUIStore((s) => s.setSidebarPanel)
  const cameraSyncEnabled = useUIStore((s) => s.cameraSyncEnabled)
  const toggleCameraSync = useUIStore((s) => s.toggleCameraSync)
  const showFPS = useUIStore((s) => s.showFPS)
  const toggleFPS = useUIStore((s) => s.toggleFPS)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const setImportDialogOpen = useUIStore((s) => s.setImportDialogOpen)
  const setExportDialogOpen = useUIStore((s) => s.setExportDialogOpen)
  const setDiffDialogOpen = useUIStore((s) => s.setDiffDialogOpen)

  return (
    <aside
      style={{
        width: 300,
        minWidth: 300,
        height: '100vh',
        background: '#111',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #222',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 14, color: '#eee', fontWeight: 600 }}>
            Shader Eval Suite
          </h1>
          <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
            Three.js GLSL Gallery
          </div>
        </div>
        <button
          onClick={toggleSidebar}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: 16,
            padding: '4px',
          }}
          title="Collapse sidebar"
        >
          &#x2039;
        </button>
      </div>

      {/* Panel tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid #222' }}>
        <button
          style={sidebarPanel === 'prompt' ? activeTabStyle : tabStyle}
          onClick={() => setSidebarPanel('prompt')}
        >
          Prompt
        </button>
        <button
          style={sidebarPanel === 'controls' ? activeTabStyle : tabStyle}
          onClick={() => setSidebarPanel('controls')}
        >
          Controls
        </button>
        <button
          style={sidebarPanel === 'code' ? activeTabStyle : tabStyle}
          onClick={() => setSidebarPanel('code')}
        >
          Code
        </button>
      </div>

      {/* Panel content — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {sidebarPanel === 'prompt' && (
          <>
            {/* Prompt section */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Prompt
              </h2>
              <PromptInput />
            </section>

            {/* Grid controls */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Grid
              </h2>
              <GridSizeSelector />
            </section>

            {/* Scene selector */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Scene
              </h2>
              <SceneSelector />
            </section>

            {/* Presets */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Presets
              </h2>
              <PresetLibrary />
            </section>

            {/* Import / Export */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Import / Export
              </h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  style={actionBtnStyle}
                  onClick={() => setImportDialogOpen(true)}
                >
                  Import
                </button>
                <button
                  style={actionBtnStyle}
                  onClick={() => setExportDialogOpen(true)}
                >
                  Export
                </button>
                <button
                  style={actionBtnStyle}
                  onClick={() => setDiffDialogOpen(true)}
                >
                  Diff
                </button>
              </div>
            </section>

            {/* Camera sync */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Camera
              </h2>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#ccc',
                }}
              >
                <input
                  type="checkbox"
                  checked={cameraSyncEnabled}
                  onChange={toggleCameraSync}
                  style={{ accentColor: '#3b82f6' }}
                />
                Sync cameras across tiles
              </label>
            </section>

            {/* API Key & Settings */}
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Settings
              </h2>
              <APIKeyInput />
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  color: '#ccc',
                  marginTop: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={showFPS}
                  onChange={toggleFPS}
                  style={{ accentColor: '#3b82f6' }}
                />
                Show FPS overlay
              </label>
            </section>
          </>
        )}

        {sidebarPanel === 'controls' && (
          <>
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Uniforms
              </h2>
              <UniformPanel />
            </section>
            <section>
              <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
                Effect Chain
              </h2>
              <EffectChain />
            </section>
          </>
        )}

        {sidebarPanel === 'code' && (
          <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CodePanel />
          </section>
        )}
      </div>
    </aside>
  )
}
