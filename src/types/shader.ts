import type { Side } from 'three'

export interface UniformConfig {
  type: 'float' | 'int' | 'bool' | 'vec2' | 'vec3' | 'vec4'
  value: number | number[] | boolean
  min?: number
  max?: number
  step?: number
}

export interface ShaderConfig {
  type: 'material'
  name: string
  vertexShader: string
  fragmentShader: string
  uniforms: Record<string, UniformConfig>
  transparent?: boolean
  side?: 'front' | 'back' | 'double'
}

export interface PostEffectConfig {
  type: 'postprocessing'
  name: string
  fragmentShader: string
  uniforms: Record<string, UniformConfig>
}

export type ShaderOrEffect = ShaderConfig | PostEffectConfig
