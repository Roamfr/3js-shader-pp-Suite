import { useState, useCallback } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { useUIStore } from '../../store/uiStore'
import { CodeEditor } from './CodeEditor'

type Tab = 'vertex' | 'fragment'

function highlightGLSL(code: string): string {
  // Simple GLSL syntax highlighting via HTML spans
  return code
    // Keywords
    .replace(
      /\b(uniform|varying|attribute|in|out|flat|const|void|return|if|else|for|while|break|continue|discard|struct|precision|highp|mediump|lowp)\b/g,
      '<span style="color:#c678dd">$1</span>'
    )
    // Types
    .replace(
      /\b(float|int|uint|bool|vec2|vec3|vec4|ivec2|ivec3|ivec4|mat2|mat3|mat4|sampler2D|samplerCube)\b/g,
      '<span style="color:#e5c07b">$1</span>'
    )
    // Built-in functions
    .replace(
      /\b(mix|step|smoothstep|clamp|min|max|abs|sign|floor|ceil|fract|mod|pow|exp|log|sqrt|inversesqrt|length|distance|dot|cross|normalize|reflect|refract|texture|textureLod|sin|cos|tan|asin|acos|atan|radians|degrees)\b/g,
      '<span style="color:#61afef">$1</span>'
    )
    // Numbers
    .replace(
      /\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/g,
      '<span style="color:#d19a66">$1</span>'
    )
    // Preprocessor
    .replace(
      /^(\s*#\w+.*)/gm,
      '<span style="color:#56b6c2">$1</span>'
    )
    // Comments
    .replace(
      /(\/\/.*)/g,
      '<span style="color:#5c6370;font-style:italic">$1</span>'
    )
}

const tabStyle: React.CSSProperties = {
  padding: '4px 12px',
  fontSize: 12,
  background: 'none',
  border: 'none',
  borderBottom: '2px solid transparent',
  color: '#888',
  cursor: 'pointer',
}

const activeTabStyle: React.CSSProperties = {
  ...tabStyle,
  color: '#eee',
  borderBottomColor: '#3b82f6',
}

export function CodePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('fragment')
  const [editMode, setEditMode] = useState(false)
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const updateTile = useGalleryStore((s) => s.updateTile)

  const selectedTile = tiles.find((t) => t.id === selectedTileId)

  if (!selectedTile?.shader) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        No shader code. Generate a shader to view its GLSL.
      </div>
    )
  }

  const code = activeTab === 'vertex'
    ? selectedTile.shader.vertexShader
    : selectedTile.shader.fragmentShader

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code)
  }, [code])

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (!selectedTile.shader) return
      const updated = {
        ...selectedTile.shader,
        [activeTab === 'vertex' ? 'vertexShader' : 'fragmentShader']: newCode,
      }
      updateTile(selectedTile.id, { shader: updated })
    },
    [selectedTile, activeTab, updateTile]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid #333', gap: 0 }}>
        <button
          style={activeTab === 'vertex' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('vertex')}
        >
          Vertex
        </button>
        <button
          style={activeTab === 'fragment' ? activeTabStyle : tabStyle}
          onClick={() => setActiveTab('fragment')}
        >
          Fragment
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setEditMode(!editMode)}
          style={{
            ...tabStyle,
            color: editMode ? '#3b82f6' : '#888',
          }}
        >
          {editMode ? 'View' : 'Edit'}
        </button>
        <button onClick={handleCopy} style={tabStyle} title="Copy to clipboard">
          Copy
        </button>
      </div>

      {/* Code area */}
      <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        {editMode ? (
          <CodeEditor code={code} onChange={handleCodeChange} />
        ) : (
          <pre
            style={{
              margin: 0,
              padding: 8,
              fontSize: 11,
              lineHeight: 1.5,
              fontFamily: '"SF Mono", "Fira Code", "Cascadia Code", monospace',
              color: '#abb2bf',
              background: '#1a1a1a',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
            dangerouslySetInnerHTML={{ __html: highlightGLSL(code) }}
          />
        )}
      </div>
    </div>
  )
}
