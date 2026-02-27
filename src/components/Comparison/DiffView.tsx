import { useState, useMemo } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { useUIStore } from '../../store/uiStore'

/**
 * Side-by-side code diff between two tiles' shaders.
 * Renders as a modal overlay similar to Import/ExportDialog.
 */
export function DiffView() {
  const isOpen = useUIStore((s) => s.diffDialogOpen)
  const close = useUIStore((s) => s.setDiffDialogOpen)
  const tiles = useGalleryStore((s) => s.tiles)
  const selectedTileId = useUIStore((s) => s.selectedTileId)

  const tilesWithShaders = tiles.filter(
    (t) => t.shader || t.postEffects.length > 0
  )

  // Default: selected tile as left, first other tile as right
  const defaultLeft = selectedTileId ?? tilesWithShaders[0]?.id ?? ''
  const defaultRight = tilesWithShaders.find((t) => t.id !== defaultLeft)?.id ?? ''

  const [leftId, setLeftId] = useState(defaultLeft)
  const [rightId, setRightId] = useState(defaultRight)

  const leftTile = tiles.find((t) => t.id === leftId)
  const rightTile = tiles.find((t) => t.id === rightId)

  const leftCode = useMemo(() => getShaderCode(leftTile), [leftTile])
  const rightCode = useMemo(() => getShaderCode(rightTile), [rightTile])

  // Simple line-based diff highlighting
  const diff = useMemo(() => computeDiff(leftCode, rightCode), [leftCode, rightCode])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
      }}
      onClick={() => close(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90vw',
          maxWidth: 1200,
          maxHeight: '80vh',
          background: '#111',
          border: '1px solid #333',
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ margin: 0, fontSize: 14, color: '#eee' }}>
            Shader Diff
          </h2>
          <button
            onClick={() => close(false)}
            style={{
              background: 'none',
              border: 'none',
              color: '#888',
              fontSize: 18,
              cursor: 'pointer',
            }}
          >
            &times;
          </button>
        </div>

        {/* Tile selectors */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '8px 16px',
            borderBottom: '1px solid #222',
          }}
        >
          <TileSelector
            label="Left"
            tiles={tiles}
            value={leftId}
            onChange={setLeftId}
          />
          <TileSelector
            label="Right"
            tiles={tiles}
            value={rightId}
            onChange={setRightId}
          />
        </div>

        {/* Diff panels */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
          }}
        >
          <DiffPanel lines={diff.left} label={leftTile?.label ?? 'None'} />
          <DiffPanel
            lines={diff.right}
            label={rightTile?.label ?? 'None'}
            borderLeft
          />
        </div>
      </div>
    </div>
  )
}

function TileSelector({
  label,
  tiles,
  value,
  onChange,
}: {
  label: string
  tiles: { id: string; label: string }[]
  value: string
  onChange: (id: string) => void
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#aaa' }}>
      {label}:
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: '#1a1a1a',
          color: '#eee',
          border: '1px solid #333',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 12,
        }}
      >
        {tiles.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </label>
  )
}

interface DiffLine {
  text: string
  type: 'same' | 'added' | 'removed' | 'empty'
}

function DiffPanel({
  lines,
  label,
  borderLeft,
}: {
  lines: DiffLine[]
  label: string
  borderLeft?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: borderLeft ? '1px solid #333' : undefined,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: '4px 12px',
          fontSize: 11,
          fontWeight: 600,
          color: '#888',
          background: '#0d0d0d',
          borderBottom: '1px solid #222',
        }}
      >
        {label}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          fontFamily: 'monospace',
          fontSize: 11,
          lineHeight: '18px',
        }}
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{
              padding: '0 12px',
              background:
                line.type === 'added'
                  ? 'rgba(74, 222, 128, 0.1)'
                  : line.type === 'removed'
                  ? 'rgba(248, 113, 113, 0.1)'
                  : 'transparent',
              color:
                line.type === 'added'
                  ? '#4ade80'
                  : line.type === 'removed'
                  ? '#f87171'
                  : line.type === 'empty'
                  ? '#333'
                  : '#aaa',
              whiteSpace: 'pre',
              minHeight: 18,
            }}
          >
            <span style={{ display: 'inline-block', width: 32, color: '#444', textAlign: 'right', marginRight: 8, userSelect: 'none' }}>
              {line.type !== 'empty' ? i + 1 : ''}
            </span>
            {line.text}
          </div>
        ))}
      </div>
    </div>
  )
}

function getShaderCode(
  tile: { shader: any; postEffects: any[] } | undefined
): string {
  if (!tile) return ''
  if (tile.shader) {
    return `// Vertex Shader\n${tile.shader.vertexShader}\n\n// Fragment Shader\n${tile.shader.fragmentShader}`
  }
  if (tile.postEffects.length > 0) {
    return tile.postEffects
      .map(
        (e: any, i: number) =>
          `// Post-Effect ${i + 1}: ${e.name}\n${e.fragmentShader}`
      )
      .join('\n\n')
  }
  return '// No shader'
}

/**
 * Simple line-based diff: marks lines as same/added/removed.
 * Not a full Myers diff, but sufficient for shader comparison.
 */
function computeDiff(
  leftText: string,
  rightText: string
): { left: DiffLine[]; right: DiffLine[] } {
  const leftLines = leftText.split('\n')
  const rightLines = rightText.split('\n')
  const left: DiffLine[] = []
  const right: DiffLine[] = []

  const leftSet = new Set(leftLines)
  const rightSet = new Set(rightLines)

  const maxLen = Math.max(leftLines.length, rightLines.length)

  for (let i = 0; i < maxLen; i++) {
    const l = leftLines[i]
    const r = rightLines[i]

    if (l === undefined) {
      left.push({ text: '', type: 'empty' })
      right.push({ text: r, type: 'added' })
    } else if (r === undefined) {
      left.push({ text: l, type: 'removed' })
      right.push({ text: '', type: 'empty' })
    } else if (l === r) {
      left.push({ text: l, type: 'same' })
      right.push({ text: r, type: 'same' })
    } else {
      left.push({ text: l, type: rightSet.has(l) ? 'same' : 'removed' })
      right.push({ text: r, type: leftSet.has(r) ? 'same' : 'added' })
    }
  }

  return { left, right }
}
