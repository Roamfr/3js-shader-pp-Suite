import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ShaderConfig, UniformConfig } from '../../types/shader'

interface DynamicShaderMeshProps {
  config: ShaderConfig
  children?: React.ReactNode
}

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

export function DynamicShaderMesh({ config, children }: DynamicShaderMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const material = useMemo(() => {
    const uniforms: Record<string, THREE.IUniform> = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    }

    // Add custom uniforms from config
    for (const [name, uniformConfig] of Object.entries(config.uniforms)) {
      uniforms[name] = uniformConfigToThreeUniform(uniformConfig)
    }

    return new THREE.ShaderMaterial({
      vertexShader: config.vertexShader,
      fragmentShader: config.fragmentShader,
      uniforms,
      transparent: config.transparent ?? false,
      side: getSide(config.side),
    })
  }, [config.vertexShader, config.fragmentShader, config.transparent, config.side])

  // Update time and custom uniforms every frame (no React re-render)
  useFrame((state) => {
    if (material.uniforms.time) {
      material.uniforms.time.value = state.clock.elapsedTime
    }
    if (material.uniforms.resolution) {
      material.uniforms.resolution.value.set(
        state.gl.domElement.width,
        state.gl.domElement.height
      )
    }
    // Update custom uniform values from config
    for (const [name, uniformConfig] of Object.entries(config.uniforms)) {
      if (material.uniforms[name]) {
        const val = uniformConfig.value
        const uniform = material.uniforms[name]
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

  return (
    <mesh ref={meshRef} material={material}>
      {children ?? <sphereGeometry args={[1, 64, 64]} />}
    </mesh>
  )
}
