import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ShaderConfig, UniformConfig } from '../types/shader'

// Glass materials that should keep their transparency (not overridden)
const EXEMPT_MATERIALS = new Set(['steklo', 'steklovnutri'])

function uniformConfigToThreeUniform(config: UniformConfig): THREE.IUniform {
  switch (config.type) {
    case 'float':
    case 'int':
      return { value: config.value as number }
    case 'bool':
      return { value: config.value as boolean }
    case 'vec2':
      return { value: new THREE.Vector2(...(config.value as number[])) }
    case 'vec3':
      return { value: new THREE.Vector3(...(config.value as number[])) }
    case 'vec4':
      return { value: new THREE.Vector4(...(config.value as number[])) }
    default:
      return { value: config.value }
  }
}

function getSide(side?: string): THREE.Side {
  switch (side) {
    case 'back': return THREE.BackSide
    case 'double': return THREE.DoubleSide
    default: return THREE.FrontSide
  }
}

interface OverrideEntry {
  mesh: THREE.Mesh
  originalMaterial: THREE.Material | THREE.Material[]
  shaderMaterial: THREE.ShaderMaterial
}

/**
 * Traverses a scene and replaces mesh materials with ShaderMaterial
 * when a shader config is provided. Restores originals when cleared.
 * Skips glass materials (steklo, steklovnutri) to preserve transparency.
 */
export function useShaderOverride(scene: THREE.Group, shader: ShaderConfig | null) {
  const overrides = useRef<OverrideEntry[]>([])
  const activeShaderKey = useRef<string | null>(null)

  useEffect(() => {
    // Compute a key to detect shader changes
    const shaderKey = shader
      ? `${shader.vertexShader.length}:${shader.fragmentShader.length}:${shader.name}`
      : null

    // If shader hasn't changed, skip
    if (shaderKey === activeShaderKey.current) return

    // Restore any existing overrides first
    for (const entry of overrides.current) {
      entry.mesh.material = entry.originalMaterial
      entry.shaderMaterial.dispose()
    }
    overrides.current = []

    if (!shader) {
      activeShaderKey.current = null
      return
    }

    // Apply shader to all non-exempt meshes
    const entries: OverrideEntry[] = []
    scene.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return
      const mesh = child as THREE.Mesh
      const mat = mesh.material

      // Skip exempt glass materials
      if (mat instanceof THREE.Material && EXEMPT_MATERIALS.has(mat.name)) return
      if (Array.isArray(mat) && mat.some((m) => EXEMPT_MATERIALS.has(m.name))) return

      // Build uniforms (same as DynamicShaderMesh)
      const uniforms: Record<string, THREE.IUniform> = {
        time: { value: 0 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      }
      for (const [name, uniformConfig] of Object.entries(shader.uniforms)) {
        uniforms[name] = uniformConfigToThreeUniform(uniformConfig)
      }

      const shaderMaterial = new THREE.ShaderMaterial({
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader,
        uniforms,
        transparent: shader.transparent ?? false,
        side: getSide(shader.side),
      })

      entries.push({
        mesh,
        originalMaterial: mesh.material,
        shaderMaterial,
      })
      mesh.material = shaderMaterial
    })

    overrides.current = entries
    activeShaderKey.current = shaderKey

    // Cleanup on unmount
    return () => {
      for (const entry of overrides.current) {
        entry.mesh.material = entry.originalMaterial
        entry.shaderMaterial.dispose()
      }
      overrides.current = []
      activeShaderKey.current = null
    }
  }, [scene, shader])

  // Update uniforms per-frame
  useFrame((state) => {
    if (overrides.current.length === 0) return

    for (const { shaderMaterial } of overrides.current) {
      const u = shaderMaterial.uniforms
      if (u.time) u.time.value = state.clock.elapsedTime
      if (u.resolution) {
        u.resolution.value.set(
          state.gl.domElement.width,
          state.gl.domElement.height
        )
      }
    }

    // Update custom uniform values from config
    if (!shader) return
    for (const { shaderMaterial } of overrides.current) {
      for (const [name, uniformConfig] of Object.entries(shader.uniforms)) {
        const uniform = shaderMaterial.uniforms[name]
        if (!uniform) continue
        const val = uniformConfig.value
        if (uniformConfig.type === 'vec2') {
          (uniform.value as THREE.Vector2).set(...(val as [number, number]))
        } else if (uniformConfig.type === 'vec3') {
          (uniform.value as THREE.Vector3).set(...(val as [number, number, number]))
        } else if (uniformConfig.type === 'vec4') {
          (uniform.value as THREE.Vector4).set(...(val as [number, number, number, number]))
        } else {
          uniform.value = val
        }
      }
    }
  })

  // Expose whether shader is active (for emissive glow skip logic)
  return overrides.current.length > 0
}
