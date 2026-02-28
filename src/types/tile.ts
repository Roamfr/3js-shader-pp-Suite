import type { ShaderConfig, PostEffectConfig } from './shader'

export type SceneType = 'procedural' | 'materialSpheres' | 'environment' | 'customGLTF' | 'clawGame'

export type BuiltinModel = 'DamagedHelmet' | 'Duck' | 'clawMachine' | 'lowPolyCity'

export interface CameraState {
  position: [number, number, number]
  target: [number, number, number]
}

export interface TileConfig {
  id: string
  label: string
  sceneType: SceneType
  builtinModel: BuiltinModel
  customModelUrl: string | null
  shader: ShaderConfig | null
  postEffects: PostEffectConfig[]
  cameraState: CameraState
  isGenerating: boolean
  error: string | null
  lastGoodShader: ShaderConfig | null
}
