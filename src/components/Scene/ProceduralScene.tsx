import { DynamicShaderMesh } from '../Shader/DynamicShaderMesh'
import { SceneLighting } from './SceneLighting'
import type { ShaderConfig } from '../../types/shader'

interface ProceduralSceneProps {
  shader: ShaderConfig | null
}

export function ProceduralScene({ shader }: ProceduralSceneProps) {
  return (
    <group>
      {/* Main sphere */}
      {shader ? (
        <group position={[0, 1, 0]}>
          <DynamicShaderMesh config={shader}>
            <sphereGeometry args={[1, 64, 64]} />
          </DynamicShaderMesh>
        </group>
      ) : (
        <mesh position={[0, 1, 0]}>
          <sphereGeometry args={[1, 64, 64]} />
          <meshStandardMaterial color="#4488ff" metalness={0.7} roughness={0.2} />
        </mesh>
      )}

      {/* Rough sphere */}
      {shader ? (
        <group position={[-2.5, 0.6, -0.5]}>
          <DynamicShaderMesh config={shader}>
            <sphereGeometry args={[0.6, 48, 48]} />
          </DynamicShaderMesh>
        </group>
      ) : (
        <mesh position={[-2.5, 0.6, -0.5]}>
          <sphereGeometry args={[0.6, 48, 48]} />
          <meshStandardMaterial color="#cc8844" metalness={0.1} roughness={0.9} />
        </mesh>
      )}

      {/* Torus knot */}
      {shader ? (
        <group position={[2.5, 0.8, -1]}>
          <DynamicShaderMesh config={shader}>
            <torusKnotGeometry args={[0.6, 0.2, 128, 32]} />
          </DynamicShaderMesh>
        </group>
      ) : (
        <mesh position={[2.5, 0.8, -1]}>
          <torusKnotGeometry args={[0.6, 0.2, 128, 32]} />
          <meshStandardMaterial color="#ff6644" metalness={0.5} roughness={0.3} />
        </mesh>
      )}

      {/* Ground plane */}
      {shader ? (
        <group rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <DynamicShaderMesh config={shader}>
            <planeGeometry args={[20, 20]} />
          </DynamicShaderMesh>
        </group>
      ) : (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#888888" roughness={0.8} />
        </mesh>
      )}

      <SceneLighting />
    </group>
  )
}
