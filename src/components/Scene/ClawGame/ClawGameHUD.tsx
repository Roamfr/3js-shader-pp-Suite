import { useCallback } from 'react'
import { useClawGameStore } from './clawGameStore'

interface ClawGameHUDProps {
  tileId: string
}

export function ClawGameHUD({ tileId }: ClawGameHUDProps) {
  const tileState = useClawGameStore((s) => s.tileStates[tileId])
  const tileInputs = useClawGameStore((s) => s.tileInputs[tileId])

  const handleMove = useCallback(
    (x: number, z: number) => {
      tileInputs?.setMoveDir(x, z)
    },
    [tileInputs]
  )

  const handleMoveStop = useCallback(() => {
    tileInputs?.setMoveDir(0, 0)
  }, [tileInputs])

  const handleDrop = useCallback(() => {
    tileInputs?.triggerAction()
  }, [tileInputs])

  if (!tileState) return null

  const isPositioning = tileState.phase === 'POSITIONING'
  const showResult = tileState.phase === 'RESULT'

  return (
    <div style={containerStyle}>
      {/* Result overlay */}
      {showResult && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: tileState.grabSuccess
              ? 'rgba(34, 197, 94, 0.3)'
              : 'rgba(239, 68, 68, 0.3)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              textAlign: 'center',
            }}
          >
            {tileState.statusText}
          </div>
        </div>
      )}

      {/* Bottom controls area */}
      <div style={controlsRowStyle}>
        {/* D-pad */}
        <div
          style={{
            ...dpadGridStyle,
            pointerEvents: isPositioning ? 'auto' : 'none',
            opacity: isPositioning ? 1 : 0.4,
          }}
        >
          <div />
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleMove(0, -1) }}
            onPointerUp={handleMoveStop}
            onPointerLeave={handleMoveStop}
            style={dpadBtnStyle}
          >
            &#9650;
          </button>
          <div />
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleMove(-1, 0) }}
            onPointerUp={handleMoveStop}
            onPointerLeave={handleMoveStop}
            style={dpadBtnStyle}
          >
            &#9664;
          </button>
          <div />
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleMove(1, 0) }}
            onPointerUp={handleMoveStop}
            onPointerLeave={handleMoveStop}
            style={dpadBtnStyle}
          >
            &#9654;
          </button>
          <div />
          <button
            onPointerDown={(e) => { e.stopPropagation(); handleMove(0, 1) }}
            onPointerUp={handleMoveStop}
            onPointerLeave={handleMoveStop}
            style={dpadBtnStyle}
          >
            &#9660;
          </button>
          <div />
        </div>

        {/* Status text */}
        <div style={statusTextStyle}>
          {tileState.statusText}
        </div>

        {/* DROP button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDrop()
          }}
          disabled={!isPositioning}
          style={{
            ...dropBtnStyle,
            opacity: isPositioning ? 1 : 0.4,
            pointerEvents: isPositioning ? 'auto' : 'none',
          }}
        >
          DROP
        </button>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 3,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  alignItems: 'center',
}

const controlsRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-end',
  gap: 16,
  padding: '0 12px 12px',
  width: '100%',
  justifyContent: 'space-between',
}

const dpadGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '44px 44px 44px',
  gridTemplateRows: '44px 44px 44px',
  gap: 2,
}

const statusTextStyle: React.CSSProperties = {
  fontSize: 13,
  color: '#fff',
  textShadow: '0 1px 4px rgba(0,0,0,0.9)',
  textAlign: 'center',
  flex: 1,
  paddingBottom: 8,
}

const dpadBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.3)',
  background: 'rgba(0,0,0,0.5)',
  color: '#fff',
  fontSize: 16,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
  touchAction: 'none',
}

const dropBtnStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: '50%',
  border: '2px solid rgba(255, 100, 100, 0.6)',
  background: 'rgba(200, 50, 50, 0.5)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 'bold',
  cursor: 'pointer',
  backdropFilter: 'blur(4px)',
  touchAction: 'none',
}
