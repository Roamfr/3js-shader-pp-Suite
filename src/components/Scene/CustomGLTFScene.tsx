import { useMemo, useState, useCallback } from 'react'
import { useGLTF } from '@react-three/drei'
import { SceneLighting } from './SceneLighting'
import { validateGLTFBinary } from '../../lib/gltfValidator'
import type { ShaderConfig } from '../../types/shader'

interface CustomGLTFSceneProps {
  shader: ShaderConfig | null
  modelUrl: string | null
  onModelLoad?: (url: string) => void
  onError?: (error: string) => void
}

function LoadedModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  const clonedScene = useMemo(() => scene.clone(true), [scene])
  return <primitive object={clonedScene} />
}

export function CustomGLTFScene({ shader: _shader, modelUrl, onError: _onError }: CustomGLTFSceneProps) {
  return (
    <group>
      {modelUrl ? (
        <LoadedModel url={modelUrl} />
      ) : (
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#666" wireframe />
        </mesh>
      )}
      <SceneLighting />
    </group>
  )
}

/**
 * Hook for handling GLTF file upload via drag-and-drop or file picker.
 * Returns the object URL and a handler for File input.
 */
export function useGLTFUpload() {
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    const result = await validateGLTFBinary(file)
    if (!result.valid) {
      setError(result.error ?? 'Invalid file')
      return
    }
    // Revoke previous URL to avoid memory leak
    if (modelUrl) URL.revokeObjectURL(modelUrl)
    const url = URL.createObjectURL(file)
    setModelUrl(url)
  }, [modelUrl])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
  }, [])

  return { modelUrl, error, handleFile, handleDrop, handleDragOver }
}
