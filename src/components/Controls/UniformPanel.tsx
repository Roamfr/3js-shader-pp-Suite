import { useCallback } from 'react'
import { useGalleryStore } from '../../store/galleryStore'
import { useUIStore } from '../../store/uiStore'
import { UniformSlider } from './UniformSlider'
import { ColorUniform } from './ColorUniform'
import type { UniformConfig } from '../../types/shader'

function isColorUniform(name: string, config: UniformConfig): boolean {
  if (config.type !== 'vec3' && config.type !== 'vec4') return false
  const lower = name.toLowerCase()
  return lower.includes('color') || lower.includes('colour') || lower.includes('tint')
}

export function UniformPanel() {
  const selectedTileId = useUIStore((s) => s.selectedTileId)
  const tiles = useGalleryStore((s) => s.tiles)
  const updateTile = useGalleryStore((s) => s.updateTile)

  const selectedTile = tiles.find((t) => t.id === selectedTileId)

  if (!selectedTile) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        Select a tile to view its uniform controls
      </div>
    )
  }

  // Gather uniforms from both material shader and post effects
  const shaderUniforms = selectedTile.shader?.uniforms ?? {}
  const postUniforms: Record<string, UniformConfig> = {}
  for (const effect of selectedTile.postEffects) {
    for (const [key, config] of Object.entries(effect.uniforms)) {
      postUniforms[`${effect.name}.${key}`] = config
    }
  }

  const allUniforms = { ...shaderUniforms, ...postUniforms }
  const uniformEntries = Object.entries(allUniforms)

  if (uniformEntries.length === 0) {
    return (
      <div style={{ fontSize: 12, color: '#666' }}>
        No custom uniforms. Generate a shader first.
      </div>
    )
  }

  const handleShaderUniformChange = useCallback(
    (name: string, value: number | number[] | boolean) => {
      if (!selectedTile.shader) return
      const updated = {
        ...selectedTile.shader,
        uniforms: {
          ...selectedTile.shader.uniforms,
          [name]: { ...selectedTile.shader.uniforms[name], value },
        },
      }
      updateTile(selectedTile.id, { shader: updated })
    },
    [selectedTile, updateTile]
  )

  const handlePostUniformChange = useCallback(
    (compoundName: string, value: number | number[] | boolean) => {
      // compoundName is "effectName.uniformName"
      const dotIdx = compoundName.indexOf('.')
      const effectName = compoundName.slice(0, dotIdx)
      const uniformName = compoundName.slice(dotIdx + 1)

      const updatedEffects = selectedTile.postEffects.map((effect) => {
        if (effect.name !== effectName) return effect
        return {
          ...effect,
          uniforms: {
            ...effect.uniforms,
            [uniformName]: { ...effect.uniforms[uniformName], value },
          },
        }
      })
      updateTile(selectedTile.id, { postEffects: updatedEffects })
    },
    [selectedTile, updateTile]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {uniformEntries.map(([name, config]) => {
        const isPost = name.includes('.')
        const onChange = isPost ? handlePostUniformChange : handleShaderUniformChange

        if (isColorUniform(name, config)) {
          return (
            <ColorUniform
              key={name}
              name={name}
              config={config}
              onChange={onChange as (name: string, value: number[]) => void}
            />
          )
        }

        if (config.type === 'float' || config.type === 'int') {
          return (
            <UniformSlider
              key={name}
              name={name}
              config={config}
              onChange={onChange as (name: string, value: number) => void}
            />
          )
        }

        if (config.type === 'bool') {
          return (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 12, color: '#aaa', flex: 1 }}>{name}</label>
              <input
                type="checkbox"
                checked={config.value as boolean}
                onChange={(e) => onChange(name, e.target.checked as any)}
                style={{ accentColor: '#3b82f6' }}
              />
            </div>
          )
        }

        // vec2/vec3/vec4 that aren't colors: show individual component sliders
        const components = config.value as number[]
        const labels = config.type === 'vec2' ? ['x', 'y'] : config.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y', 'z', 'w']
        return (
          <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 12, color: '#aaa' }}>{name}</span>
            {labels.map((label, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 10, color: '#555', width: 12 }}>{label}</span>
                <input
                  type="range"
                  min={config.min ?? 0}
                  max={config.max ?? 1}
                  step={config.step ?? 0.01}
                  value={components[i] ?? 0}
                  onChange={(e) => {
                    const newComponents = [...components]
                    newComponents[i] = parseFloat(e.target.value)
                    onChange(name, newComponents as any)
                  }}
                  style={{ flex: 1, accentColor: '#3b82f6', height: 4 }}
                />
                <span style={{ fontSize: 10, color: '#666', fontFamily: 'monospace', width: 36 }}>
                  {(components[i] ?? 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
