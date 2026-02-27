interface TileLabelProps {
  label: string
  effectName?: string
  isGenerating: boolean
}

export function TileLabel({ label, effectName, isGenerating }: TileLabelProps) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '4px 8px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    >
      <span style={{ fontSize: 11, color: '#ccc', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: 10, color: '#888' }}>
        {isGenerating ? '⏳ Generating...' : effectName ?? 'No shader'}
      </span>
    </div>
  )
}
