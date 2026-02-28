import { useEvalStore } from '../../store/evalStore'

const overlayStyle: React.CSSProperties = {
  position: 'absolute',
  bottom: 12,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '6px 12px',
  background: 'rgba(0, 0, 0, 0.75)',
  borderRadius: 8,
  zIndex: 10,
  pointerEvents: 'auto',
}

const arrowBtn: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 14,
  fontWeight: 700,
  background: 'rgba(255,255,255,0.1)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 4,
  color: '#fff',
  cursor: 'pointer',
}

export function EvalPageControls() {
  const isEvalMode = useEvalStore((s) => s.isEvalMode)
  const currentPage = useEvalStore((s) => s.currentPage)
  const totalPages = useEvalStore((s) => s.totalPages)
  const nextPage = useEvalStore((s) => s.nextPage)
  const prevPage = useEvalStore((s) => s.prevPage)

  if (!isEvalMode) return null

  const total = totalPages()

  return (
    <div style={overlayStyle}>
      <button
        onClick={prevPage}
        disabled={currentPage === 0}
        style={{
          ...arrowBtn,
          opacity: currentPage === 0 ? 0.3 : 1,
          cursor: currentPage === 0 ? 'default' : 'pointer',
        }}
      >
        &larr;
      </button>
      <span style={{ fontSize: 12, color: '#ddd', minWidth: 80, textAlign: 'center' }}>
        {currentPage + 1} / {total}
      </span>
      <button
        onClick={nextPage}
        disabled={currentPage >= total - 1}
        style={{
          ...arrowBtn,
          opacity: currentPage >= total - 1 ? 0.3 : 1,
          cursor: currentPage >= total - 1 ? 'default' : 'pointer',
        }}
      >
        &rarr;
      </button>
    </div>
  )
}
