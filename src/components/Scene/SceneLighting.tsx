import { Environment } from '@react-three/drei'

export function SceneLighting() {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.3} />
      <hemisphereLight args={['#87ceeb', '#444444', 0.2]} />
    </>
  )
}
