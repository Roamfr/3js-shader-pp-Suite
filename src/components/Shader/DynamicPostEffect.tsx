import { forwardRef, useMemo } from 'react'
import { Uniform } from 'three'
import { Effect, BlendFunction } from 'postprocessing'
import type { PostEffectConfig, UniformConfig } from '../../types/shader'

function uniformConfigToValue(config: UniformConfig): unknown {
  return config.value
}

class DynamicEffect extends Effect {
  constructor(name: string, fragmentShader: string, customUniforms: Record<string, UniformConfig>) {
    const uniforms = new Map<string, Uniform>()
    for (const [key, config] of Object.entries(customUniforms)) {
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
