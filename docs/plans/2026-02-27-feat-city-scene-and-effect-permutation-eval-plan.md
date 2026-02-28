---
title: "feat: Low-Poly City Default Scene & Effect Permutation Evaluator"
type: feat
status: completed
date: 2026-02-27
---

# Low-Poly City Default Scene & Effect Permutation Evaluator

## Overview

Two-phase feature: (1) Add the low-poly city FBX model as a new built-in scene type and make it the default model inspection scene for evaluating effects, and (2) build an automated effect permutation evaluator that systematically applies every post-processing effect solo, every material shader solo, and every material+post-processing combination — displaying results in the tile grid with navigation controls.

## Problem Statement / Motivation

1. The current default scene (`procedural`) uses simple geometry (sphere, torus knot, ground plane) which doesn't showcase effects on realistic architecture
2. There's no way to systematically preview all 48+ effect combinations — users must manually apply each one, tile by tile
3. A complex city model with diverse geometry (buildings, roads, vehicles, foliage) is ideal for evaluating how effects perform on varied surfaces

## Proposed Solution

### Phase 1: City Scene Integration

Add `lowPolyCity` as a new `BuiltinModel` and create a `CityScene` component that loads the FBX model using drei's `useFBX`. Register it in the scene selector and make it the default scene for new tiles.

### Phase 2: Effect Permutation Evaluator

Build an "Auto Eval" mode accessible from the sidebar that generates the full matrix of effect combinations, loads them into tiles page-by-page, and lets users step through pages to inspect each combination.

## Technical Approach

### Phase 1: City Scene as Default Model Inspection Scene

**Goal:** Load the low-poly city FBX, add it as a scene option, and set it as the default.

#### 1.1 — Add `useFBX` model loader for the city

The city model is an FBX file at `public/models/low-poly-city/source/citta lowpoly.fbx` with textures in `public/models/low-poly-city/textures/`. Since the existing `EnvironmentScene` uses `useGLTF`, we need to either:

- **Option A (recommended):** Convert the FBX to GLB offline (via Blender or `fbx2gltf`) and load it with the existing `useGLTF` pattern
- **Option B:** Use `useFBX` from drei, which supports FBX natively

**Recommendation:** Option A — convert to GLB for consistency and smaller file size. If conversion is problematic, fall back to Option B.

**Files to modify/create:**

- `public/models/low-poly-city/low-poly-city.glb` — converted model (Option A)
- `src/components/Scene/CityScene.tsx` — new scene component
- `src/types/tile.ts:3` — add `'lowPolyCity'` to `BuiltinModel` union
- `src/components/Scene/EnvironmentScene.tsx:8` — add `lowPolyCity` path to `MODEL_PATHS`
- `src/components/Scene/SceneSelector.tsx:13-17` — add `lowPolyCity` to `MODEL_OPTIONS`

```tsx
// src/components/Scene/CityScene.tsx (if going Option B route)
import { useMemo } from 'react'
import { useFBX } from '@react-three/drei'
import { SceneLighting } from './SceneLighting'
import type { ShaderConfig } from '../../types/shader'

interface CitySceneProps {
  shader: ShaderConfig | null
}

export function CityScene({ shader: _shader }: CitySceneProps) {
  const fbx = useFBX('/models/low-poly-city/source/citta lowpoly.fbx')
  const scene = useMemo(() => fbx.clone(true), [fbx])

  return (
    <group>
      <primitive object={scene} scale={0.01} />
      <SceneLighting />
    </group>
  )
}
```

#### 1.2 — Register in type system and store

**`src/types/tile.ts`** — extend `BuiltinModel`:

```typescript
export type BuiltinModel = 'DamagedHelmet' | 'Duck' | 'clawMachine' | 'lowPolyCity'
```

**`src/components/Scene/EnvironmentScene.tsx`** — add to `MODEL_PATHS`:

```typescript
const MODEL_PATHS: Record<BuiltinModel, string> = {
  DamagedHelmet: '/models/DamagedHelmet.glb',
  Duck: '/models/Duck.glb',
  clawMachine: '/models/clawMachine.glb',
  lowPolyCity: '/models/low-poly-city/low-poly-city.glb', // or FBX path
}
```

#### 1.3 — Update SceneSelector dropdown

**`src/components/Scene/SceneSelector.tsx`** — add city model to the `MODEL_OPTIONS` array:

```typescript
const MODEL_OPTIONS: { value: BuiltinModel; label: string }[] = [
  { value: 'lowPolyCity', label: 'Low-Poly City' },  // first = default visual
  { value: 'DamagedHelmet', label: 'Damaged Helmet' },
  { value: 'Duck', label: 'Duck' },
  { value: 'clawMachine', label: 'Claw Machine' },
]
```

#### 1.4 — Change default tile scene

**`src/store/galleryStore.ts:17`** — update `createDefaultTile`:

```typescript
function createDefaultTile(label: string): TileConfig {
  return {
    // ...
    sceneType: 'environment',        // was 'procedural'
    builtinModel: 'lowPolyCity',     // was 'DamagedHelmet'
    // ...
  }
}
```

#### 1.5 — Camera positioning for city

The city model will need a wider camera angle. Add a city-specific default camera:

```typescript
const CITY_CAMERA: CameraState = {
  position: [30, 20, 30],
  target: [0, 0, 0],
}
```

Adjust TileView or createDefaultTile to use this camera when the scene is set to `lowPolyCity`.

#### 1.6 — Handle FBX texture loading

If using FBX directly, textures should auto-resolve from the same relative directory. If converting to GLB, textures will be embedded. Verify textures load correctly:
- `uv_vetri_barbieree.png`
- `lowpoly_tex-2.png`
- `uvportee.png`
- `stradecittaa.png`

**Phase 1 Success Criteria:**
- [x] Low-poly city loads and renders in a tile
- [x] Textures display correctly
- [x] City appears in the model dropdown
- [x] New tiles default to city scene
- [x] Camera position provides a good overview of the city

---

### Phase 2: Effect Permutation Evaluator

**Goal:** Automatically generate all effect combinations and display them in pages through the tile grid.

#### 2.1 — Combination matrix definition

The existing presets (`src/data/presets/index.ts`) define:
- **6 material shaders:** toon, holographic, wireframe-glow, noise-displacement, iridescent, dissolve
- **6 post-processing effects:** film-grain, chromatic-aberration, crt-retro, pixelate, warm-color-grading, sobel-edge

**Combination categories:**

| Category | Count | Description |
|----------|-------|-------------|
| Baseline | 1 | No effects (city with default materials) |
| Post-FX only | 6 | Each post-processing effect solo, original materials |
| Material only | 6 | Each material shader solo, no post-processing |
| Material + Post-FX | 6 x 6 = 36 | Every material paired with every post-FX |
| **Total** | **49** | All permutations |

#### 2.2 — Combination generator

**`src/lib/combinationGenerator.ts`** — new file:

```typescript
import { PRESETS, type PresetDefinition } from '../data/presets/index'
import type { ShaderConfig, PostEffectConfig } from '../types/shader'

export interface EffectCombination {
  id: string
  label: string
  material: PresetDefinition | null    // null = use default scene materials
  postEffect: PresetDefinition | null  // null = no post-processing
}

export function generateAllCombinations(): EffectCombination[] {
  const materials = PRESETS.filter(p => p.category === 'material')
  const postEffects = PRESETS.filter(p => p.category === 'postprocessing')
  const combos: EffectCombination[] = []

  // 1. Baseline — no effects
  combos.push({
    id: 'baseline',
    label: 'Baseline (no effects)',
    material: null,
    postEffect: null,
  })

  // 2. Post-FX only (6)
  for (const fx of postEffects) {
    combos.push({
      id: `postfx-${fx.id}`,
      label: fx.name,
      material: null,
      postEffect: fx,
    })
  }

  // 3. Material only (6)
  for (const mat of materials) {
    combos.push({
      id: `mat-${mat.id}`,
      label: mat.name,
      material: mat,
      postEffect: null,
    })
  }

  // 4. Material + Post-FX combinations (36)
  for (const mat of materials) {
    for (const fx of postEffects) {
      combos.push({
        id: `${mat.id}+${fx.id}`,
        label: `${mat.name} + ${fx.name}`,
        material: mat,
        postEffect: fx,
      })
    }
  }

  return combos
}
```

#### 2.3 — Eval store

**`src/store/evalStore.ts`** — new Zustand store for evaluation mode:

```typescript
import { create } from 'zustand'
import { generateAllCombinations, type EffectCombination } from '../lib/combinationGenerator'

interface EvalStore {
  isEvalMode: boolean
  combinations: EffectCombination[]
  currentPage: number
  pageSize: number      // matches grid tile count (4, 6, or 9)
  totalPages: number

  startEval: (pageSize: number) => void
  stopEval: () => void
  nextPage: () => void
  prevPage: () => void
  goToPage: (page: number) => void
  getCurrentPageCombinations: () => EffectCombination[]
}
```

#### 2.4 — Eval mode UI

**`src/components/Eval/EvalPanel.tsx`** — sidebar panel with:
- "Start Auto Eval" button — enters eval mode, overrides gallery tiles
- Page navigation: prev/next buttons + "Page 3 of 13" label
- Category filter: checkboxes for "Post-FX only", "Materials only", "Combinations"
- "Stop Eval" button — returns to normal gallery mode

**`src/components/Eval/EvalPageControls.tsx`** — overlay controls on the gallery:
- Left/right arrow buttons
- Page indicator
- Current combination labels per tile

#### 2.5 — Integration with tile system

When eval mode is active:
1. Override gallery tiles with computed combinations for the current page
2. All tiles use `sceneType: 'environment'` with `builtinModel: 'lowPolyCity'`
3. Apply `material` from combination as `tile.shader`
4. Apply `postEffect` from combination as `tile.postEffects[0]`
5. Camera sync is auto-enabled so all tiles share the same view angle
6. Tile labels show the combination name (e.g., "Toon + Film Grain")

**Modify `src/components/Gallery/GalleryGrid.tsx`:**
- Check `evalStore.isEvalMode`
- If active, render eval-generated tiles instead of gallery tiles
- Still use `TileView` component — just different tile configs

#### 2.6 — Sidebar integration

**`src/components/Sidebar/Sidebar.tsx`** — add "Auto Eval" tab/section:
- Shows the EvalPanel
- Collapsible section below existing preset/scene controls

**Phase 2 Success Criteria:**
- [x] "Start Auto Eval" button generates all 49 combinations
- [x] Tiles display with correct combination of material + post-FX
- [x] Page navigation works: prev/next/go-to
- [x] Tile labels show combination name
- [x] Camera sync across all eval tiles
- [x] Can filter by category (post-FX only, materials only, combos)
- [x] "Stop Eval" returns to normal gallery mode
- [x] City scene is used as the base for all eval tiles

## Critical Prerequisite: Fix EnvironmentScene Shader Application

**`EnvironmentScene` currently ignores the `shader` prop** — it's destructured as `_shader` and never applied. Only `ClawGameScene` uses `useShaderOverride` to apply material shaders to GLTF models.

Before eval mode can work with material shaders on the city scene, `EnvironmentScene` must wire up `useShaderOverride`:

**`src/components/Scene/EnvironmentScene.tsx`** — add shader override:

```tsx
import { useShaderOverride } from '../../hooks/useShaderOverride'

export function EnvironmentScene({ shader, model = 'DamagedHelmet' }: EnvironmentSceneProps) {
  const { scene } = useGLTF(MODEL_PATHS[model])
  const clonedScene = useMemo(() => scene.clone(true), [scene])

  // Apply material shader override to GLTF meshes
  useShaderOverride(clonedScene, shader)

  return (
    <group>
      <primitive object={clonedScene} />
      <SceneLighting />
    </group>
  )
}
```

This is a **blocking prerequisite** for Phase 2 — without it, material presets will have no visible effect on the city scene.

## GPU Resource Cleanup (from 3JS-Roam-POC learnings)

When rapidly switching between effect combinations in eval mode, WebGL resources (textures, geometries, shader programs) can leak. Key mitigations:

1. **Clone scenes per tile, not per page transition** — reuse cloned instances across page changes
2. **Dispose ShaderMaterials** when `useShaderOverride` swaps materials — it already handles cleanup on unmount
3. **PostEffectLayer FBO cleanup** — verify the render target is disposed when effects change
4. **Monitor frame time** — if a combination causes >100ms frames, skip/flag it

## Acceptance Criteria

### Functional Requirements
- [x] Low-poly city model loads and renders with textures
- [x] City is the default scene for new tiles
- [x] Material shaders apply correctly to GLTF models (EnvironmentScene fix)
- [x] All 49 effect combinations are generated correctly
- [x] Eval mode pages through combinations in the gallery grid
- [x] Each tile correctly applies its assigned material and/or post-FX

### Non-Functional Requirements
- [x] City model loads within 3 seconds
- [x] Eval mode page transitions are instant (pre-built tile configs)
- [ ] No WebGL context leaks when paging through all 49 combinations
- [ ] No frame rate collapse when displaying 9 tiles with effects

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `public/models/low-poly-city/low-poly-city.glb` | Converted city model (if Option A) |
| `src/components/Scene/CityScene.tsx` | City scene component (if Option B / FBX route) |
| `src/lib/combinationGenerator.ts` | Generate all effect permutation combos |
| `src/store/evalStore.ts` | Zustand store for eval mode state |
| `src/components/Eval/EvalPanel.tsx` | Sidebar panel for eval controls |
| `src/components/Eval/EvalPageControls.tsx` | Overlay page navigation |

### Modified Files
| File | Change |
|------|--------|
| `src/types/tile.ts:3` | Add `'lowPolyCity'` to `BuiltinModel` |
| `src/components/Scene/EnvironmentScene.tsx:8-12` | Add city model path |
| `src/components/Scene/SceneSelector.tsx:13-17` | Add city to dropdown |
| `src/store/galleryStore.ts:17` | Change default tile to city scene |
| `src/components/Gallery/GalleryGrid.tsx` | Eval mode tile override |
| `src/components/Sidebar/Sidebar.tsx` | Add eval panel section |
| `src/components/Gallery/TileView.tsx` | Minor: handle eval tile labels |

## References

- Existing scene system: `src/components/Scene/EnvironmentScene.tsx`
- Preset definitions: `src/data/presets/index.ts` (6 material + 6 post-FX)
- Gallery store: `src/store/galleryStore.ts`
- Tile type: `src/types/tile.ts`
- Original project plan: `docs/plans/2026-02-26-feat-threejs-shader-eval-suite-plan.md`
