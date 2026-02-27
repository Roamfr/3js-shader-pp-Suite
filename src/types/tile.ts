import type { ShaderConfig, PostEffectConfig } from './shader'

export type SceneType = 'procedural' | 'materialSpheres' | 'environment' | 'customGLTF'

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export interface TileConfig {
  id: string
  label: string
  sceneType: SceneType
  shader: ShaderConfig | null
  postEffects: PostEffectConfig[]
  cameraState: CameraState
  isGenerating: boolean
  error: string | null
  lastGoodShader: ShaderConfig | null
}
