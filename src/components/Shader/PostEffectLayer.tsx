import { useRef, useMemo, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PostEffectConfig } from '../../types/shader'

/**
 * Built-in uniforms provided by our post-processing wrapper.
 * User shader code must NOT declare these — we strip any declarations
 * to avoid type conflicts (e.g. float vs vec2 for `resolution`).
 */
const BUILTIN_NAMES = new Set([
  'inputBuffer',
  'outputBuffer',
  'resolution',
  'texelSize',
  'time',
])

/** Strip declarations of built-in uniforms from user GLSL source. */
function stripBuiltinDeclarations(source: string): string {
  let cleaned = source
  for (const name of BUILTIN_NAMES) {
    cleaned = cleaned.replace(
      new RegExp(`uniform\\s+\\w+\\s+${name}\\s*;`, 'g'),
      ''
    )
  }
  return cleaned
}

/**
 * Builds a complete fragment shader that composes one or more post-effects.
 * Each effect's `mainImage` is renamed to `mainImage_N` and called in sequence.
 *
 * The wrapper only declares built-in uniforms (inputBuffer, resolution, time).
 * Custom uniforms are left in the user's shader code (which already declares them).
 */
function buildFragmentShader(effects: PostEffectConfig[]): string {
  // Process each effect body: strip built-in declarations and rename mainImage
  const bodies: string[] = []
  for (let i = 0; i < effects.length; i++) {
    let code = stripBuiltinDeclarations(effects[i].fragmentShader)
    code = code.replace(/void\s+mainImage\s*\(/g, `void mainImage_${i}(`)
    bodies.push(code)
  }

  // Build the call chain
  const calls = effects
    .map((_, i) => `  mainImage_${i}(color, vUv, tmp); color = tmp;`)
    .join('\n')

  return `
precision highp float;

uniform sampler2D inputBuffer;
uniform vec2 resolution;
uniform float time;

varying vec2 vUv;

${bodies.join('\n\n')}

void main() {
  vec4 color = texture2D(inputBuffer, vUv);
  vec4 tmp;
${calls}
  gl_FragColor = color;
}
`.trim()
}

const FULLSCREEN_VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`.trim()

// ---------------------------------------------------------------------------

interface PostEffectLayerProps {
  effects: PostEffectConfig[]
}

/**
 * Custom per-View post-processing layer.
 *
 * Unlike @react-three/postprocessing EffectComposer (which resets the viewport
 * to the full canvas on its final output pass, breaking multi-View layouts),
 * this component renders effects via a fullscreen quad that lives inside the
 * View's virtual scene and respects the View's scissor rect.
 *
 * How it works:
 * 1. useFrame at priority 0 captures the scene to an FBO (before the View
 *    Container renders at priority 1).
 * 2. A fullscreen quad with the effect shader reads the FBO and displays the
 *    post-processed result.
 * 3. The View Container renders the scene (with the quad visible) within its
 *    scissor rect. The quad covers the viewport, showing the processed image.
 */
export function PostEffectLayer({ effects }: PostEffectLayerProps) {
  const { gl, size } = useThree()
  const quadRef = useRef<THREE.Mesh>(null!)

  // FBO sized to match the View portal
  const fbo = useMemo(() => {
    const dpr = gl.getPixelRatio()
    const w = Math.max(1, Math.floor(size.width * dpr))
    const h = Math.max(1, Math.floor(size.height * dpr))
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    })
  }, [gl, size.width, size.height])

  useEffect(() => () => fbo.dispose(), [fbo])

  // Build the effect ShaderMaterial
  const material = useMemo(() => {
    try {
      const fragmentShader = buildFragmentShader(effects)

      const uniforms: Record<string, THREE.IUniform> = {
        inputBuffer: { value: fbo.texture },
        resolution: { value: new THREE.Vector2(size.width, size.height) },
        time: { value: 0 },
      }

      for (const effect of effects) {
        for (const [key, config] of Object.entries(effect.uniforms)) {
          if (BUILTIN_NAMES.has(key) || uniforms[key]) continue
          uniforms[key] = { value: config.value }
        }
      }

      return new THREE.ShaderMaterial({
        vertexShader: FULLSCREEN_VERT,
        fragmentShader,
        uniforms,
        depthTest: false,
        depthWrite: false,
        transparent: true, // renders in transparent pass so it's last
      })
    } catch {
      return null
    }
  }, [effects, fbo.texture, size.width, size.height])

  useEffect(() => () => material?.dispose(), [material])

  // Priority 0 runs BEFORE the View Container's priority 1.
  // We capture the scene to the FBO, then show the quad for the Container's render.
  useFrame((state, delta) => {
    if (!material || !quadRef.current) return

    material.uniforms.time.value += delta
    material.uniforms.resolution.value.set(size.width, size.height)

    // Hide quad during FBO capture
    quadRef.current.visible = false

    const prevTarget = state.gl.getRenderTarget()
    const prevAutoClear = state.gl.autoClear

    state.gl.setRenderTarget(fbo)
    state.gl.autoClear = true
    state.gl.render(state.scene, state.camera)

    state.gl.setRenderTarget(prevTarget)
    state.gl.autoClear = prevAutoClear

    // Reveal quad for the Container's render pass
    quadRef.current.visible = true
  }, 0)

  if (!material) return null

  return (
    <mesh ref={quadRef} renderOrder={999999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}
