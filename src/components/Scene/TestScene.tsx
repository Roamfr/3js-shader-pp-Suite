export function TestScene() {
  return (
    <group>
      {/* Main sphere */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial color="#4488ff" metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Torus knot */}
      <mesh position={[2.5, 0.8, -1]}>
        <torusKnotGeometry args={[0.6, 0.2, 128, 32]} />
        <meshStandardMaterial color="#ff6644" metalness={0.5} roughness={0.3} />
      </mesh>

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#888888" roughness={0.8} />
      </mesh>

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={1} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
    </group>
  )
}
