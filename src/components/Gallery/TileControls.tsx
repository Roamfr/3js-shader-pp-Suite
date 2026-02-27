interface TileControlsProps {
  onClear: () => void
  onDuplicate: () => void
}

export function TileControls({ onClear, onDuplicate }: TileControlsProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: 4,
        right: 4,
        display: 'flex',
        gap: 2,
        opacity: 0,
        transition: 'opacity 0.2s',
        zIndex: 2,
      }}
      className="tile-controls"
    >
      <button
        onClick={(e) => { e.stopPropagation(); onDuplicate() }}
        title="Duplicate tile"
        style={{
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.6)',
          color: '#aaa',
          border: '1px solid #444',
          borderRadius: 3,
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        dup
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onClear() }}
        title="Clear tile"
        style={{
          padding: '2px 6px',
          background: 'rgba(0,0,0,0.6)',
          color: '#ff6666',
          border: '1px solid #444',
          borderRadius: 3,
          cursor: 'pointer',
          fontSize: 11,
        }}
      >
        clr
      </button>
    </div>
  )
}
