import type { ShaderConfig, PostEffectConfig, ShaderOrEffect } from '../types/shader'
import { parseUniforms } from './uniformParser'

const MAX_FILE_SIZE = 100 * 1024 // 100KB
const ALLOWED_EXTENSIONS = ['.glsl', '.frag', '.vert', '.json']

export type ImportFormat = 'shadertoy' | 'material-fragment' | 'postprocessing' | 'vertex' | 'project-json' | 'unknown'

export interface ImportResult {
  success: boolean
  shader?: ShaderOrEffect
  error?: string
  detectedFormat: ImportFormat
}

// Default passthrough vertex shader for fragment-only imports
const DEFAULT_VERTEX_SHADER = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`.trim()

// Detect if source contains Shadertoy signatures
function isShadertoy(source: string): boolean {
  return (
    /void\s+mainImage\s*\(\s*out\s+vec4\s+\w+\s*,\s*in\s+vec2\s+\w+\s*\)/.test(source) ||
    (/iResolution/.test(source) && /iTime/.test(source))
  )
}

// Detect if this is a postprocessing mainImage (our format)
function isPostprocessingFormat(source: string): boolean {
  return /void\s+mainImage\s*\(\s*const\s+in\s+vec4/.test(source)
}

// Detect if this looks like a vertex shader
function isVertexShader(source: string): boolean {
  return /gl_Position\s*=/.test(source)
}

export function detectFormat(source: string): ImportFormat {
  if (isShadertoy(source)) return 'shadertoy'
  if (isPostprocessingFormat(source)) return 'postprocessing'
  if (isVertexShader(source)) return 'vertex'
  // Has void main() but no gl_Position → material fragment shader
  if (/void\s+main\s*\(\s*\)/.test(source)) return 'material-fragment'
  return 'unknown'
}

// Convert Shadertoy shader to our postprocessing format
function convertShadertoy(source: string): string {
  let converted = source

  // Replace iResolution with resolution
  converted = converted.replace(/iResolution/g, 'resolution')
  // Replace iTime with time
  converted = converted.replace(/iTime/g, 'time')
  // Replace iMouse with vec4(0) (we don't support mouse input)
  converted = converted.replace(/iMouse/g, 'vec4(0.0)')
  // Replace iChannel0 with inputBuffer reference
  converted = converted.replace(/iChannel0/g, 'inputBuffer')
  // Replace iFrame with 0
  converted = converted.replace(/iFrame/g, '0')

  // Replace the mainImage signature
  // Shadertoy: void mainImage(out vec4 fragColor, in vec2 fragCoord)
  // Ours: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
  converted = converted.replace(
    /void\s+mainImage\s*\(\s*out\s+vec4\s+(\w+)\s*,\s*in\s+vec2\s+(\w+)\s*\)/,
    (_match, fragColorName, fragCoordName) => {
      // We'll replace references in the body
      // fragCoord → uv * resolution (since Shadertoy uses pixel coords)
      // fragColor → outputColor
      converted = converted.replace(
        new RegExp(`\\b${fragCoordName}\\b`, 'g'),
        '(uv * resolution.xy)'
      )
      converted = converted.replace(
        new RegExp(`\\b${fragColorName}\\b`, 'g'),
        'outputColor'
      )
      return 'void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)'
    }
  )

  return converted
}

function importAsMaterial(fragmentShader: string, name: string): ShaderConfig {
  const uniforms = parseUniforms(fragmentShader)
  return {
    type: 'material',
    name,
    vertexShader: DEFAULT_VERTEX_SHADER,
    fragmentShader,
    uniforms,
  }
}

function importAsPostEffect(fragmentShader: string, name: string): PostEffectConfig {
  const uniforms = parseUniforms(fragmentShader)
  return {
    type: 'postprocessing',
    name,
    fragmentShader,
    uniforms,
  }
}

export function importShaderSource(source: string, name: string = 'Imported Shader'): ImportResult {
  const format = detectFormat(source)

  switch (format) {
    case 'shadertoy': {
      const converted = convertShadertoy(source)
      return {
        success: true,
        shader: importAsPostEffect(converted, name),
        detectedFormat: 'shadertoy',
      }
    }
    case 'postprocessing':
      return {
        success: true,
        shader: importAsPostEffect(source, name),
        detectedFormat: 'postprocessing',
      }
    case 'material-fragment':
      return {
        success: true,
        shader: importAsMaterial(source, name),
        detectedFormat: 'material-fragment',
      }
    case 'vertex':
      return {
        success: false,
        error: 'Vertex-only shaders are not supported. Please provide a fragment shader.',
        detectedFormat: 'vertex',
      }
    case 'unknown':
      // Try as material fragment (most permissive)
      return {
        success: true,
        shader: importAsMaterial(source, name),
        detectedFormat: 'unknown',
      }
  }
}

export function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${(file.size / 1024).toFixed(1)}KB). Maximum is 100KB.`
  }
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
  }
  return null
}

export async function importFromFile(file: File): Promise<ImportResult> {
  const error = validateFile(file)
  if (error) {
    return { success: false, error, detectedFormat: 'unknown' }
  }

  const text = await file.text()
  const name = file.name.replace(/\.\w+$/, '')

  // If it's a JSON file, try parsing as project
  if (file.name.endsWith('.json')) {
    return { success: false, error: 'JSON project import should use the project import flow.', detectedFormat: 'project-json' }
  }

  return importShaderSource(text, name)
}

export async function importFromClipboard(): Promise<ImportResult> {
  try {
    const text = await navigator.clipboard.readText()
    if (!text.trim()) {
      return { success: false, error: 'Clipboard is empty.', detectedFormat: 'unknown' }
    }
    return importShaderSource(text, 'Clipboard Shader')
  } catch {
    return { success: false, error: 'Could not read clipboard. Please paste manually.', detectedFormat: 'unknown' }
  }
}

export const FORMAT_LABELS: Record<ImportFormat, string> = {
  'shadertoy': 'Shadertoy',
  'material-fragment': 'Material Fragment',
  'postprocessing': 'Post-Processing',
  'vertex': 'Vertex Shader',
  'project-json': 'Project JSON',
  'unknown': 'Unknown Format',
}
