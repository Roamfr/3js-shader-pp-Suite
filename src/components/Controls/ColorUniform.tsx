import { useCallback } from 'react'
import type { UniformConfig } from '../../types/shader'

interface ColorUniformProps {
  name: string
  config: UniformConfig
  onChange: (name: string, value: number[]) => void
}

function vec3ToHex(v: number[]): string {
  const r = Math.round((v[0] ?? 0) * 255)
  const g = Math.round((v[1] ?? 0) * 255)
  const b = Math.round((v[2] ?? 0) * 255)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function hexToVec3(hex: string): number[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  return [r, g, b]
}

export function ColorUniform({ name, config, onChange }: ColorUniformProps) {
  const value = config.value as number[]
  const hexColor = vec3ToHex(value)

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const rgb = hexToVec3(e.target.value)
      // Preserve alpha for vec4
      if (config.type === 'vec4' && value.length >= 4) {
        onChange(name, [...rgb, value[3]])
      } else {
        onChange(name, rgb)
      }
    },
    [name, config.type, value, onChange]
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <label style={{ fontSize: 12, color: '#aaa', flex: 1 }}>{name}</label>
      <input
        type="color"
        value={hexColor}
        onChange={handleChange}
        style={{
          width: 32,
          height: 24,
          border: '1px solid #333',
          borderRadius: 3,
          cursor: 'pointer',
          background: 'none',
          padding: 0,
        }}
      />
      <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace' }}>
        {hexColor}
      </span>
    </div>
  )
}
