---
title: "fix: Apply shaders to claw game scene and enable free camera"
type: fix
status: completed
date: 2026-02-27
---

# Fix: Apply Shaders to Claw Game Scene & Enable Free Camera

## Overview

Two issues with the claw game scene:

1. **Shaders not applied** — The `shader` prop is received but unused (`_shader`). When users apply a material shader via the sidebar, it has zero visual effect on the claw game scene. Other procedural scenes (ProceduralScene, MaterialSpheres) apply shaders by wrapping geometry in `DynamicShaderMesh`, but the claw game renders a GLTF model via `<primitive>` and never touches materials.

2. **Camera locked during gameplay** — OrbitControls are disabled when the claw game tile is selected (`enabled={!clawGameActive}`). The user wants free mouse-orbit inspection of the machine while playing. Since WASD/Space control the claw (keyboard) and OrbitControls use mouse drag, there is **no input conflict** — both can coexist.

## Problem Statement / Motivation

- The eval suite's core value proposition is applying shader effects to scenes. The claw game being shader-immune breaks the experience.
- A locked camera prevents the user from finding the best viewing angle during gameplay. Being able to rotate around the machine while positioning the claw is both more fun and more useful for evaluating shader effects.

## Proposed Solution

### Fix 1: Shader Application to GLTF Meshes

Traverse all meshes in the cloned GLTF scene and replace their materials with `ShaderMaterial` instances when a `shader` config is provided. Store original materials to restore when shader is cleared.

**Approach:** Create a `useShaderOverride` hook that:
- When `shader` is non-null: traverses the scene, stores each mesh's original material in a `Map<THREE.Mesh, THREE.Material>`, replaces with a new `THREE.ShaderMaterial` built from the config (same logic as `DynamicShaderMesh`)
- When `shader` becomes null: restores original materials from the map
- Updates `time` and `resolution` uniforms per-frame via `useFrame`
- Skips meshes that should be exempt (e.g. glass panels with transmission, since `ShaderMaterial` doesn't support transmission and would make glass opaque)

**Exempt materials:** `steklo` (outer glass) and `steklovnutri` (inner glass) should keep their original materials so the machine remains see-through. All other 17 materials get the shader.

### Fix 2: Enable Free Camera During Gameplay

Simply remove the OrbitControls `enabled={!clawGameActive}` guard. Let the user orbit freely while WASD/Space controls the claw. No conflict exists.

Additionally:
- Keep the fixed camera constants as the **default starting position** for claw game tiles
- Allow camera changes to persist via `handleCameraChange` (remove the `if (isClawGame) return` early exit)
- Still exclude claw game tiles from `syncCameraToAll` (the fixed default is better than inheriting another tile's camera)

## Technical Approach

### Implementation Tasks

#### Task 1: `useShaderOverride` hook

- [x] `src/hooks/useShaderOverride.ts` — New hook:
  - Signature: `useShaderOverride(scene: THREE.Group, shader: ShaderConfig | null)`
  - On shader change:
    1. If `shader` is non-null and no override active: traverse scene, for each `Mesh`:
       - Skip if material name is `steklo` or `steklovnutri` (glass — keep transparent)
       - Store `{ mesh, originalMaterial }` in a ref Map
       - Create `THREE.ShaderMaterial` from `shader.vertexShader`, `shader.fragmentShader`, `shader.uniforms` (same uniform conversion as `DynamicShaderMesh`)
       - Assign to `mesh.material`
    2. If `shader` is null and override was active: restore all original materials from the Map, clear the Map
    3. If `shader` changed (new shader replaces old): update existing ShaderMaterials' vertex/fragment shaders OR rebuild (simpler: restore originals, then re-apply)
  - `useFrame`: update `time` and `resolution` uniforms on all active ShaderMaterials
  - Cleanup on unmount: restore originals

#### Task 2: Wire `useShaderOverride` into `ClawGameScene`

- [x] `src/components/Scene/ClawGame/ClawGameScene.tsx`:
  - Remove `_shader` prefix, use `shader` prop directly
  - Call `useShaderOverride(clonedScene, shader)` after `useClawMachineSetup`
  - No other changes needed — the hook handles everything

#### Task 3: Enable free camera during gameplay

- [x] `src/components/Gallery/TileView.tsx`:
  - Remove `enabled={!clawGameActive}` from `OrbitControls` — always enabled
  - Remove `if (isClawGame) return` from `handleCameraChange` — let orbit changes persist
  - Keep the fixed camera constants as default `position`/`target` for claw game tiles (they still provide a good starting view)
  - Keep `syncCameraToAll` exclusion for clawGame tiles (preserve in galleryStore)

#### Task 4: Verify emissive glow still works with shader override

- [x] `src/components/Scene/ClawGame/ClawController.tsx`:
  - When a shader is active, the arm's materials are replaced with ShaderMaterial. Emissive glow (`mat.emissive`, `mat.emissiveIntensity`) won't work on ShaderMaterial.
  - Options:
    - **Option A (simple):** Skip emissive glow when shader is active (shader effect IS the visual feedback)
    - **Option B:** Add a `u_emissive` uniform to the shader materials on arm meshes, set it in useFrame during glow phases
  - Recommend Option A for simplicity — shader replaces all visual treatment anyway

## Acceptance Criteria

- [x] Selecting a material shader in the sidebar visually changes the claw game scene
- [x] Glass panels remain transparent (not overridden by shader)
- [x] Clearing the shader restores original model materials
- [x] Mouse drag orbits the camera while WASD/Space still controls the claw
- [x] Camera orbit works in all game phases (positioning, descending, ascending, result)
- [x] No console errors during shader application or removal
- [x] Post-processing effects continue to work alongside material shaders

## References

### Internal References

- Shader application pattern: `src/components/Shader/DynamicShaderMesh.tsx` (uniform conversion, ShaderMaterial creation)
- Current claw game scene: `src/components/Scene/ClawGame/ClawGameScene.tsx`
- Camera controls: `src/components/Gallery/TileView.tsx:131-135`
- Camera change handler: `src/components/Gallery/TileView.tsx:62-88`
- Emissive glow: `src/components/Scene/ClawGame/ClawController.tsx:123-133`
- Glass material names: plan node map — `steklo` (outer, transmission 0.05), `steklovnutri` (inner, transmission 0.79)
