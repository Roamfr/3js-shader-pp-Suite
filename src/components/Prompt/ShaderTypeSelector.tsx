import { useUIStore } from '../../store/uiStore'

export function ShaderTypeSelector() {
  const shaderMode = useUIStore((s) => s.shaderMode)
  const setShaderMode = useUIStore((s) => s.setShaderMode)

  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
      <button
        onClick={() => setShaderMode('material')}
        style={{
          flex: 1,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: shaderMode === 'material' ? 600 : 400,
          background: shaderMode === 'material' ? '#3b82f6' : '#2a2a2a',
          color: shaderMode === 'material' ? '#fff' : '#aaa',
        }}
      >
        Material
      </button>
      <button
        onClick={() => setShaderMode('postprocessing')}
        style={{
          flex: 1,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: shaderMode === 'postprocessing' ? 600 : 400,
          background: shaderMode === 'postprocessing' ? '#8b5cf6' : '#2a2a2a',
          color: shaderMode === 'postprocessing' ? '#fff' : '#aaa',
        }}
      >
        Post-FX
      </button>
    </div>
  )
}
