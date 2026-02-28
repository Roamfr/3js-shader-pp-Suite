import { useMemo } from 'react'
import * as THREE from 'three'

export interface ClawMachineRefs {
  carriageRef: THREE.Object3D
  clawArmRef: THREE.Object3D
  cableRef: THREE.Object3D
  floorRef: THREE.Object3D
  validPrizes: THREE.Object3D[]
  floorBounds: THREE.Box3
  armRestLocalY: number
  moveBounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}

// Outlier plushies that are outside the machine (low Y)
const OUTLIER_NAMES = new Set(['Plane.043_43', 'Plane.045_56', 'Plane.044_71'])

export function useClawMachineSetup(scene: THREE.Group): ClawMachineRefs {
  return useMemo(() => {
    let carriage: THREE.Object3D | null = null
    let clawArm: THREE.Object3D | null = null
    let cable: THREE.Object3D | null = null
    let floor: THREE.Object3D | null = null
    const planeNodes: THREE.Object3D[] = []

    // Single traversal to extract all references
    scene.traverse((node) => {
      if (node.name === 'Cube.014_23' || node.name === 'Cube014_23') {
        carriage = node
      } else if (node.name === 'Cylinder.022_25' || node.name === 'Cylinder022_25') {
        clawArm = node
      } else if (node.name === 'Cylinder.038_24' || node.name === 'Cylinder038_24') {
        cable = node
      } else if (node.name === 'Object_10') {
        floor = node
      } else if (node.name.startsWith('Plane')) {
        planeNodes.push(node)
      }
    })

    if (!carriage || !clawArm || !cable || !floor) {
      console.warn('ClawMachineSetup: Missing critical nodes', {
        carriage: !!carriage,
        clawArm: !!clawArm,
        cable: !!cable,
        floor: !!floor,
      })
    }

    // Use non-null assertions — if model structure is wrong, we fail fast
    const carriageRef = carriage!
    const clawArmRef = clawArm!
    const cableRef = cable!
    const floorRef = floor!

    // Hide ALL Plane.* nodes first
    for (const node of planeNodes) {
      node.visible = false
    }

    // Filter valid prizes (exclude outliers)
    const validPrizes = planeNodes.filter((node) => !OUTLIER_NAMES.has(node.name))

    // Compute floor bounding box for prize spawn height
    const floorBounds = new THREE.Box3().setFromObject(floorRef)

    // Compute carriage movement bounds from the machine interior
    // Read from model geometry: approximate the glass cabinet interior
    const machineBounds = new THREE.Box3().setFromObject(scene)
    const moveBounds = {
      minX: machineBounds.min.x + 1,
      maxX: machineBounds.max.x - 1,
      minZ: machineBounds.min.z + 1,
      maxZ: machineBounds.max.z - 1,
    }

    // Clone materials on arm meshes so emissive glow is per-instance
    clawArmRef.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        if (mesh.material instanceof THREE.Material) {
          mesh.material = mesh.material.clone()
        }
      }
    })

    // Ensure world matrices are computed before reparenting
    scene.updateMatrixWorld(true)

    // Reparent clawArm under carriage so X/Z movement cascades
    const armWorldPos = new THREE.Vector3()
    clawArmRef.getWorldPosition(armWorldPos)

    // Detach from current parent, attach to carriage
    clawArmRef.removeFromParent()
    carriageRef.add(clawArmRef)

    // Convert world position to carriage's local space
    carriageRef.updateMatrixWorld(true)
    const armLocalPos = carriageRef.worldToLocal(armWorldPos.clone())
    clawArmRef.position.copy(armLocalPos)

    // Store the arm's rest local Y for descent animation baseline
    const armRestLocalY = armLocalPos.y

    // Also reparent cable under carriage
    const cableWorldPos = new THREE.Vector3()
    cableRef.getWorldPosition(cableWorldPos)
    cableRef.removeFromParent()
    carriageRef.add(cableRef)
    carriageRef.updateMatrixWorld(true)
    const cableLocalPos = carriageRef.worldToLocal(cableWorldPos.clone())
    cableRef.position.copy(cableLocalPos)

    return {
      carriageRef,
      clawArmRef,
      cableRef,
      floorRef,
      validPrizes,
      floorBounds,
      armRestLocalY,
      moveBounds,
    }
  }, [scene])
}
