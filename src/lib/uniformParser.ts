import type { UniformConfig } from '../types/shader'

// Matches: uniform <type> <name>;
// Also captures optional // comment with hints like min:0 max:10 step:0.1
const UNIFORM_RE = /^\s*uniform\s+(float|int|bool|vec2|vec3|vec4)\s+(\w+)\s*;(?:\s*\/\/\s*(.*))?$/gm

// Built-in uniforms that the host app manages (skip these)
const BUILTIN_UNIFORMS = new Set([
  'time',
  'resolution',
  'modelViewMatrix',
  'projectionMatrix',
  'viewMatrix',
  'normalMatrix',
  'cameraPosition',
  'cameraNear',
  'cameraFar',
  'texelSize',
  'aspect',
  'inputBuffer',
  'depthBuffer',
])

function parseComment(comment: string): { min?: number; max?: number; step?: number } {
  const result: { min?: number; max?: number; step?: number } = {}
  const minMatch = comment.match(/min:\s*(-?[\d.]+)/)
  const maxMatch = comment.match(/max:\s*(-?[\d.]+)/)
  const stepMatch = comment.match(/step:\s*(-?[\d.]+)/)
  if (minMatch) result.min = parseFloat(minMatch[1])
  if (maxMatch) result.max = parseFloat(maxMatch[1])
  if (stepMatch) result.step = parseFloat(stepMatch[1])
  return result
}

function getDefaults(type: UniformConfig['type']): { value: number | number[] | boolean; min: number; max: number; step: number } {
  switch (type) {
    case 'float':
      return { value: 1.0, min: 0.0, max: 5.0, step: 0.01 }
    case 'int':
      return { value: 1, min: 0, max: 10, step: 1 }
    case 'bool':
      return { value: true, min: 0, max: 1, step: 1 }
    case 'vec2':
      return { value: [0.5, 0.5], min: 0.0, max: 1.0, step: 0.01 }
    case 'vec3':
      return { value: [0.5, 0.5, 0.5], min: 0.0, max: 1.0, step: 0.01 }
    case 'vec4':
      return { value: [0.5, 0.5, 0.5, 1.0], min: 0.0, max: 1.0, step: 0.01 }
  }
}

export function parseUniforms(glsl: string): Record<string, UniformConfig> {
  const result: Record<string, UniformConfig> = {}

  let match: RegExpExecArray | null
  while ((match = UNIFORM_RE.exec(glsl)) !== null) {
    const type = match[1] as UniformConfig['type']
    const name = match[2]
    const comment = match[3] ?? ''

    if (BUILTIN_UNIFORMS.has(name)) continue

    const defaults = getDefaults(type)
    const hints = comment ? parseComment(comment) : {}

    result[name] = {
      type,
      value: defaults.value,
      min: hints.min ?? defaults.min,
      max: hints.max ?? defaults.max,
      step: hints.step ?? defaults.step,
    }
  }

  return result
}

/**
 * Merge parsed uniforms with existing config, preserving user-set values.
 */
export function mergeUniforms(
  existing: Record<string, UniformConfig>,
  parsed: Record<string, UniformConfig>
): Record<string, UniformConfig> {
  const merged: Record<string, UniformConfig> = {}
  for (const [name, config] of Object.entries(parsed)) {
    if (existing[name] && existing[name].type === config.type) {
      // Keep user's current value, update range hints
      merged[name] = {
        ...config,
        value: existing[name].value,
      }
    } else {
      merged[name] = config
    }
  }
  return merged
}
