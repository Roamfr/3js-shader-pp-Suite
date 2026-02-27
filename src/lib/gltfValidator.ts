const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50 MB
const VALID_EXTENSIONS = ['.glb', '.gltf']
const GLB_MAGIC = 0x46546C67 // "glTF" in little-endian

export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateGLTFFile(file: File): ValidationResult {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
  if (!VALID_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file type: ${ext}. Expected .glb or .gltf` }
  }

  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return { valid: false, error: `File too large: ${sizeMB}MB (max ${MAX_FILE_SIZE / (1024 * 1024)}MB)` }
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty' }
  }

  return { valid: true }
}

export async function validateGLTFBinary(file: File): Promise<ValidationResult> {
  const basic = validateGLTFFile(file)
  if (!basic.valid) return basic

  if (file.name.toLowerCase().endsWith('.glb')) {
    const header = await file.slice(0, 4).arrayBuffer()
    const magic = new DataView(header).getUint32(0, true)
    if (magic !== GLB_MAGIC) {
      return { valid: false, error: 'Invalid GLB file: missing glTF magic bytes' }
    }
  }

  return { valid: true }
}
