import { Environment } from '@react-three/drei'

export function SceneLighting() {
  return (
    <>
      <Environment preset="studio" />
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-3, 4, -2]} intensity={0.5} />
      <hemisphereLight args={['#87ceeb', '#444444', 0.4]} />
    </>
  )
}
