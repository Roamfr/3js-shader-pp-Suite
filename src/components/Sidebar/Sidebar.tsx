import { PromptInput } from '../Prompt/PromptInput'
import { APIKeyInput } from '../Settings/APIKeyInput'
import { GridSizeSelector } from '../Gallery/GridSizeSelector'
import { useUIStore } from '../../store/uiStore'

export function Sidebar() {
  const cameraSyncEnabled = useUIStore((s) => s.cameraSyncEnabled)
  const toggleCameraSync = useUIStore((s) => s.toggleCameraSync)

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
        }}
      >
        <h1 style={{ margin: 0, fontSize: 14, color: '#eee', fontWeight: 600 }}>
          Shader Eval Suite
        </h1>
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>
          Three.js GLSL Gallery
        </div>
      </div>

      {/* Content — scrollable */}
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

        {/* API Key */}
        <section>
          <h2 style={{ margin: '0 0 8px', fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>
            Settings
          </h2>
          <APIKeyInput />
        </section>
      </div>
    </aside>
  )
}
