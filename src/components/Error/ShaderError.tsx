interface ShaderErrorProps {
  error: string
  onFixRequest: () => void
  isFixing: boolean
}

export function ShaderError({ error, onFixRequest, isFixing }: ShaderErrorProps) {
  return (
    <div
      style={{
        background: '#1a0000',
        border: '1px solid #ff4444',
        borderRadius: 6,
        padding: 12,
        marginTop: 8,
        fontSize: 12,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ color: '#ff6666', marginBottom: 8, fontWeight: 600 }}>
        Shader Compilation Error
      </div>
      <pre
        style={{
          color: '#ffaaaa',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
          margin: 0,
          maxHeight: 120,
          overflow: 'auto',
        }}
      >
        {error}
      </pre>
      <button
        onClick={onFixRequest}
        disabled={isFixing}
        style={{
          marginTop: 8,
          padding: '6px 12px',
          background: isFixing ? '#333' : '#ff4444',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: isFixing ? 'default' : 'pointer',
          fontSize: 12,
        }}
      >
        {isFixing ? 'Fixing...' : 'Ask Claude to Fix'}
      </button>
    </div>
  )
}
