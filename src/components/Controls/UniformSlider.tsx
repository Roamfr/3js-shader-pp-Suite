import { useCallback } from 'react'
import type { UniformConfig } from '../../types/shader'

interface UniformSliderProps {
  name: string
  config: UniformConfig
  onChange: (name: string, value: number) => void
}

export function UniformSlider({ name, config, onChange }: UniformSliderProps) {
  const value = config.value as number
  const min = config.min ?? 0
  const max = config.max ?? 5
  const step = config.step ?? 0.01

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(name, parseFloat(e.target.value))
    },
    [name, onChange]
  )

  const handleReset = useCallback(() => {
    // Reset to midpoint of range
    onChange(name, (min + max) / 2)
  }, [name, min, max, onChange])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: 12, color: '#aaa' }}>{name}</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
            {typeof value === 'number' ? value.toFixed(2) : value}
          </span>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: 'none',
              color: '#555',
              cursor: 'pointer',
              fontSize: 10,
              padding: '0 2px',
            }}
            title="Reset"
          >
            ↺
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        style={{
          width: '100%',
          accentColor: '#3b82f6',
          height: 4,
        }}
      />
    </div>
  )
}
