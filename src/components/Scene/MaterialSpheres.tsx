import { useMemo } from 'react'
import { DynamicShaderMesh } from '../Shader/DynamicShaderMesh'
import { SceneLighting } from './SceneLighting'
import type { ShaderConfig } from '../../types/shader'

interface MaterialSpheresProps {
  shader: ShaderConfig | null
}

const GRID_SIZE = 5
const SPACING = 1.4
const RADIUS = 0.5

export function MaterialSpheres({ shader }: MaterialSpheresProps) {
  const spheres = useMemo(() => {
    const items: { key: string; position: [number, number, number]; roughness: number; metalness: number }[] = []
    const offset = ((GRID_SIZE - 1) * SPACING) / 2

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        items.push({
          key: `sphere-${row}-${col}`,
          position: [col * SPACING - offset, row * SPACING - offset + 1.5, 0],
          roughness: col / (GRID_SIZE - 1),
          metalness: row / (GRID_SIZE - 1),
        })
      }
    }
    return items
  }, [])

  return (
    <group>
      {spheres.map((s) =>
        shader ? (
          <group key={s.key} position={s.position}>
            <DynamicShaderMesh config={shader}>
              <sphereGeometry args={[RADIUS, 48, 48]} />
            </DynamicShaderMesh>
          </group>
        ) : (
          <mesh key={s.key} position={s.position}>
            <sphereGeometry args={[RADIUS, 48, 48]} />
            <meshStandardMaterial
              color="#aaaaaa"
              roughness={s.roughness}
              metalness={s.metalness}
            />
          </mesh>
        )
      )}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#555555" roughness={0.9} />
      </mesh>

      <SceneLighting />
    </group>
  )
}
