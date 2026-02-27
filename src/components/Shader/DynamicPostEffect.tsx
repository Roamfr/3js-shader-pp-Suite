import { forwardRef, useMemo } from 'react'
import { Uniform } from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { PostEffectConfig, UniformConfig } from '../../types/shader'

function uniformConfigToValue(config: UniformConfig): unknown {
  return config.value
}

// Built-in uniforms provided by the postprocessing Effect class.
// These must NOT be passed as custom uniforms or they'll cause type conflicts.
const BUILTIN_UNIFORMS = new Set([
  'inputBuffer', 'outputBuffer', 'resolution', 'texelSize',
  'cameraNear', 'cameraFar', 'aspect', 'time',
])

class DynamicEffect extends Effect {
  constructor(name: string, fragmentShader: string, customUniforms: Record<string, UniformConfig>) {
    const uniforms = new Map<string, Uniform>()
    for (const [key, config] of Object.entries(customUniforms)) {
      if (BUILTIN_UNIFORMS.has(key)) continue
      uniforms.set(key, new Uniform(uniformConfigToValue(config)))
    }

    super(name, fragmentShader, {
      blendFunction: BlendFunction.NORMAL,
      uniforms,
    })
  }
}

interface DynamicPostEffectProps {
  config: PostEffectConfig
}

export const DynamicPostEffect = forwardRef<Effect, DynamicPostEffectProps>(
  ({ config }, ref) => {
    const effect = useMemo(
      () => new DynamicEffect(config.name, config.fragmentShader, config.uniforms),
      [config.name, config.fragmentShader, config.uniforms]
    )

    return <primitive ref={ref} object={effect} dispose={null} />
  }
)

DynamicPostEffect.displayName = 'DynamicPostEffect'
