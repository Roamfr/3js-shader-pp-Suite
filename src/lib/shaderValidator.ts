export interface ValidationResult {
  valid: boolean
  errors: string[]
}

// Static analysis checks
export function staticAnalysis(source: string): ValidationResult {
  const errors: string[] = []

  // Check source size
  if (source.length > 10240) {
    errors.push(`Shader source exceeds 10KB limit (${source.length} bytes)`)
  }

  // Check for while loops
  if (/\bwhile\s*\(/.test(source)) {
    errors.push('while() loops are not allowed — use bounded for() loops instead')
  }

  // Check loop bounds
  const forLoops = source.matchAll(/\bfor\s*\([^;]*;\s*\w+\s*[<>=!]+\s*(\d+)/g)
  for (const match of forLoops) {
    const bound = parseInt(match[1], 10)
    if (bound > 128) {
      errors.push(`Loop bound ${bound} exceeds maximum of 128 iterations`)
    }
  }

  // Check nested loop depth
  let maxDepth = 0
  let currentDepth = 0
  const tokens = source.split(/(\bfor\s*\(|{|})/g)
  let inFor = false
  for (const token of tokens) {
    if (/\bfor\s*\(/.test(token)) {
      inFor = true
    } else if (token === '{' && inFor) {
      currentDepth++
      maxDepth = Math.max(maxDepth, currentDepth)
      inFor = false
    } else if (token === '}') {
      currentDepth = Math.max(0, currentDepth - 1)
    }
  }
  if (maxDepth > 3) {
    errors.push(`Nested loop depth ${maxDepth} exceeds maximum of 3`)
  }

  return { valid: errors.length === 0, errors }
}

// WebGL compilation check
export function compileShader(
  gl: WebGL2RenderingContext,
  source: string,
  type: 'vertex' | 'fragment'
): ValidationResult {
  const shaderType = type === 'vertex' ? gl.VERTEX_SHADER : gl.FRAGMENT_SHADER
  const shader = gl.createShader(shaderType)
  if (!shader) return { valid: false, errors: ['Failed to create shader object'] }

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
  const errors: string[] = []

  if (!success) {
    const log = gl.getShaderInfoLog(shader)
    if (log) errors.push(log)
  }

  gl.deleteShader(shader)
  return { valid: success, errors }
}

// Full validation pipeline
export function validateShader(
  gl: WebGL2RenderingContext,
  vertexSource: string | null,
  fragmentSource: string
): ValidationResult {
  const allErrors: string[] = []

  // Static analysis on fragment
  const fragStatic = staticAnalysis(fragmentSource)
  allErrors.push(...fragStatic.errors)

  // Static analysis on vertex if present
  if (vertexSource) {
    const vertStatic = staticAnalysis(vertexSource)
    allErrors.push(...vertStatic.errors)
  }

  // If static analysis fails, don't bother compiling
  if (allErrors.length > 0) {
    return { valid: false, errors: allErrors }
  }

  // Compile fragment
  const fragCompile = compileShader(gl, fragmentSource, 'fragment')
  allErrors.push(...fragCompile.errors)

  // Compile vertex if present
  if (vertexSource) {
    const vertCompile = compileShader(gl, vertexSource, 'vertex')
    allErrors.push(...vertCompile.errors)
  }

  return { valid: allErrors.length === 0, errors: allErrors }
}
