---
title: "feat: Interactive Claw Game Scene"
type: feat
status: completed
date: 2026-02-26
---

# Interactive Claw Game Scene

## Overview

An interactive claw game that runs inside a gallery tile in the existing Three.js Shader Eval Suite. Players control the claw machine's built-in claw arm over a pit of Sanrio plushies using keyboard/on-screen buttons. The game uses the existing `clawMachine.glb` model's own nodes for the claw mechanism rather than building one procedurally. Integrates fully with the eval suite's shader and post-processing pipeline.

## Problem Statement / Motivation

1. The claw machine model (`clawMachine.glb`) already exists as a built-in model but is only viewable statically
2. The eval suite currently only supports passive scene viewing (orbit camera); an interactive scene type would demonstrate the framework's flexibility
3. A playable claw game with shader overlays creates a compelling visual showcase
4. Extends the `SceneType` system to support interactive scenes

## Proposed Solution

A new `'clawGame'` scene type that:
- **Loads the existing `clawMachine.glb`** and extracts key node references at runtime
- **Animates the model's own claw parts** — `Cube.014_23` (carriage, X/Z movement) and `Cylinder.022_25` (arm, Y descent)
- **Hides all `Plane.*` nodes** (collectables) on load, re-enables a random subset as active prizes
- **Uses `Object_10`** (inside parent node `_3`) as the prize floor surface
- **Accepts keyboard input** (WASD/arrows to move, space to drop) + optional on-screen buttons
- **Integrates with existing shader pipeline** — material shaders and post-FX apply on top

## Technical Approach

### GLB Node Map

From runtime inspection of `public/models/clawMachine.glb` (297 nodes, 222 meshes, 19 materials):

```
Sketchfab_model
  root
    GLTF_SceneRootNode            <-- 72 direct children
      │
      ├── MACHINE STRUCTURE (nodes 0-25)
      │   ├── (Cyrillic)_0          mat: rughh_met     Machine body (metal)
      │   ├── (Cyrillic)_1          mat: steklo         Glass front panel
      │   ├── (Cyrillic)_2          mat: poster          Poster/decal
      │   ├── (Cyrillic)_3 ─┐      mat: black+default   Machine interior base
      │   │   ├── Object_10 │  <── PRIZE FLOOR SURFACE (spawn prizes on top)
      │   │   └── Object_11 │
      │   ├── (Cyrillic)_4          mat: steklovnutri   Inner glass
      │   ├── (Cyrillic)_5          mat: zerkalo         Mirror (back panel)
      │   ├── (Cyrillic)_6          mat: pink            Pink trim
      │   ├── ...(.001 duplicates for other sides)
      │   ├── Cylinder.003_12       mat: rughh_met      Metal cylinder
      │   ├── Cube.005_13           mat: black           Black frame part
      │   ├── Cube.008_14           mat: pink            Pink frame part
      │   ├── Cube.009_15           mat: black           Black frame part
      │   ├── (Cyrillic)_16         mat: screen          Display screen
      │   ├── Cylinder.008-011      mat: various         Structural cylinders
      │   ├── Cube.011_21           mat: black           Black cube
      │   ├── Cylinder.018_22       mat: rughh_met      Metal cylinder
      │   │
      │   ├── Cube.014_23           mat: black    <── CLAW CARRIAGE (moves X/Z, Y≈15.4)
      │   ├── Cylinder.038_24       mat: black    <── CABLE (connects rail to carriage, Y≈17.1)
      │   └── Cylinder.022_25       mat: rughh_met <── CLAW ARM (descends on Y, Y≈14.8)
      │
      ├── KUROMI PLUSHIES (18x, 3 mesh children each)
      │   ├── Plane_26       mats: kuromi_wh, ruromi_pink, keromi_bl
      │   ├── Plane.003_27   ...
      │   └── ... through Plane.043_43
      │
      ├── MY MELODY PLUSHIES (13x, 5 mesh children each)
      │   ├── Plane.002_44   mats: kuromi_wh, melody_pink, keromi_bl, mel_yel, melody_blue
      │   └── ... through Plane.045_56
      │
      └── HELLO KITTY PLUSHIES (15x, 5 mesh children each)
          ├── Plane.001_57   mats: kuromi_wh, hk_pink, hk_red, keromi_bl, mel_yel
          └── ... through Plane.044_71
```

**Critical node roles:**

| Node Name | Role | World Position (Y-up) | Scale | Behavior |
|-----------|------|----------------------|-------|----------|
| `Cube.014_23` | Claw carriage (top) | [-3.60, 15.41, -2.99] | [1.03, 0.69, 1.04] | Moves on X/Z plane only. Always stays at rail height. 172 verts, `black` material. |
| `Cylinder.022_25` | Claw arm (bottom) | [-3.38, 14.78, -3.00] | [0.083, 0.083, 0.083] | Descends on Y to grab, then ascends. 6491 verts, `rughh_met` (rose-gold). Reparented under carriage at runtime. |
| `Cylinder.038_24` | Cable / connector | [-4.59, 17.07, -2.20] | [0.063, 0.081, 0.063] | Connects ceiling rail to carriage. 260 verts, `black`. May need to stretch/scale during descent. |
| `Object_10` (child of `_3`) | Prize floor surface | parent at [0.00, 3.08, 0.00] | parent: [4.90, 3.03, 4.78] | Static. Prizes spawn on top of its bounding box. 56 verts, `black`. |
| All `Plane.*` nodes (46 total) | Collectable plushies | Y range: 5.6 - 8.5 (see note) | ~0.48 each | Hidden on load. Random subset re-enabled as active prizes. |

**Plushie position notes:**
- Most plushies are at Y=5.6-8.5, X=-5.2 to 4.2, Z=-3.7 to 5.5 (inside the glass cabinet)
- **3 outliers at low Y (outside the machine):** `Plane.043_43` (Y=1.49), `Plane.045_56` (Y=0.62), `Plane.044_71` (Y=0.04) — these should be permanently hidden, not included in the prize pool

**Transform chain note:**
The `Sketchfab_model` root and `GLTF_SceneRootNode` each have a -90/+90 degree X-rotation matrix that cancel each other out. Each `GLTF_SceneRootNode` direct child then has its OWN scale+translation matrix. This means the `pos` and `scale` columns above are the effective world transforms for each node.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Gallery Tile (existing TileView)                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <View> (scissored viewport)                            │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │ ClawGameScene                                    │  │ │
│  │  │                                                  │  │ │
│  │  │  useGLTF('clawMachine.glb')                      │  │ │
│  │  │       │                                          │  │ │
│  │  │       ▼                                          │  │ │
│  │  │  useClawMachineSetup(scene)                      │  │ │
│  │  │       │  - traverse scene graph                  │  │ │
│  │  │       │  - extract carriageRef (Cube.014_23)     │  │ │
│  │  │       │  - extract clawArmRef (Cylinder.022_25)  │  │ │
│  │  │       │  - extract floorRef (Object_10)          │  │ │
│  │  │       │  - hide all Plane.* nodes                │  │ │
│  │  │       │  - reparent arm under carriage           │  │ │
│  │  │       │  - enable random prize subset            │  │ │
│  │  │       ▼                                          │  │ │
│  │  │  useClawGameState (reducer)                      │  │ │
│  │  │    IDLE → POSITIONING → DESCENDING →             │  │ │
│  │  │    GRABBING → ASCENDING → RESULT → IDLE          │  │ │
│  │  │       │                                          │  │ │
│  │  │       ▼                                          │  │ │
│  │  │  useFrame loop                                   │  │ │
│  │  │    - read input from useClawInput                │  │ │
│  │  │    - move carriageRef.position.x/z               │  │ │
│  │  │    - animate clawArmRef.position.y               │  │ │
│  │  │    - proximity check against active prizes       │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  │                                                        │ │
│  │  ┌────────────────────┐  ┌──────────────────────────┐  │ │
│  │  │ EffectComposer     │  │ ClawGameHUD (HTML)       │  │ │
│  │  │ (if post-FX)       │  │ D-pad + DROP btn + text  │  │ │
│  │  └────────────────────┘  └──────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Claw construction | Animate model's own nodes | `Cube.014_23` (carriage) and `Cylinder.022_25` (arm) already exist in the GLB. Reparent arm under carriage at runtime so X/Z movement cascades. Avoids building procedural geometry that won't match the model's style. |
| Physics model | Animation-based (no Rapier) | State machine: IDLE -> POSITIONING -> DESCENDING -> GRABBING -> ASCENDING -> RESULT. Prize pickup by proximity check. |
| Prize management | Hide all, re-enable subset | All 46 `Plane.*` nodes hidden on load. Random subset (e.g. 8-12) re-enabled as active prizes placed on `Object_10` surface. |
| Coordinate system | Read from model at runtime | Extract world positions from `Cube.014_23`, `Cylinder.022_25`, `Object_10` bounding boxes. No hardcoded coordinates. |
| Input handling | `useClawInput` hook + HTML overlay | Keyboard via `useEffect` on `window` inside ClawGameScene. Guards: `selectedTileId === tile.id` AND `document.activeElement` is not input/textarea. Calls `e.preventDefault()` for WASD/arrows/Space to prevent page scroll and textarea typing. On-screen buttons for mobile/mouse. |
| Keyboard conflicts | Suppress App.tsx Enter→focus-prompt when claw game is active | App.tsx line 98-105 focuses the prompt textarea on Enter. When `sceneType === 'clawGame'` and tile is selected, this must be suppressed to prevent WASD from typing into the textarea. |
| Camera sync | Exclude claw game tiles from `syncCameraToAll` | When a clawGame tile is selected (camera locked), it must be excluded from the camera sync system to prevent other tiles' orbit from overriding the game viewpoint. |
| Deselection mid-game | Immediate reset to idle | If user deselects (Escape/click outside) during descent/grab, immediately halt animation and snap claw to home position. No background animation on deselected tiles. |
| Camera during gameplay | Fixed position, no OrbitControls | Disable `OrbitControls` when `sceneType === 'clawGame'` and tile is active. Re-enable for passive viewing. |
| Shader integration | Full support via existing pipeline | ClawGameScene accepts `shader: ShaderConfig \| null` like all scenes. Post-FX works unchanged via EffectComposer. |
| Game state | Local `useReducer` | Game-specific state (claw position, phase, grabbed item) lives in component. Only persistent config syncs to galleryStore. |

### Measured Coordinate Reference (Three.js Y-up World Space)

```
Y-axis (up)
│
│  Y≈17-18  ─── Rail / ceiling area
│               Cylinder.018_22 (Y=17.20), Cube.011_21 (Y=17.04)
│               Cylinder.038_24 cable (Y=17.07)
│
│  Y≈15.4  ─── Claw carriage (Cube.014_23)
│  Y≈14.8  ─── Claw arm (Cylinder.022_25)
│
│  Y≈5.6-8.5 ─ Plushie zone (46 Plane.* nodes)
│               Most at Y=5.6-8.5
│               X range: -5.2 to 4.2
│               Z range: -3.7 to 5.5
│
│  Y≈3.1  ─── Prize floor (Object_10 parent)
│              Floor surface approx Y≈5.7 (parent.y + parent.scale.y * meshMax.y)
│
│  Y≈0    ─── Ground level
│
└──────────────────────── X-axis (width: -6.5 to 5.0)
                          Z-axis (depth: -5.0 to 8.4)
```

**Scene bounding box:** X: [-6.49, 4.98], Y: [-0.01, 21.26], Z: [-4.98, 8.37]

**Claw movement bounds (approximate):** The carriage should be constrained to the machine interior, roughly X: [-5, 4], Z: [-4, 5]. These should be read from model geometry at runtime rather than hardcoded.

### Claw Machine Model Reference

| Property | Value |
|----------|-------|
| File size | 12.7 MB |
| Total nodes | 297 (222 meshes) |
| Animations | None (static model) |
| Textures | None (all solid-color PBR) |
| Origin | Sketchfab model |

**Materials (19 total):**

| # | Material | Color (RGBA) | Metal | Rough | Purpose |
|---|----------|-------------|-------|-------|---------|
| 0 | `material_0` | default | 0.00 | 0.60 | Default/base |
| 1 | `rughh_met` | (0.68,0.61,0.59) | 0.85 | 0.24 | Rose-gold metallic body (claw arm, frame) |
| 2 | `steklo` | (0.80,0.80,0.80,0.05) | 0.00 | 0.00 | Outer glass panels (nearly transparent) |
| 3 | `poster` | (0.92,0.67,0.60) | 0.00 | 0.50 | Poster/decal |
| 4 | `black` | (0.07,0.07,0.07) | 0.00 | 0.50 | Structural parts (carriage, cable, frame) |
| 5 | `steklovnutri` | (0.80,0.80,0.80,0.25) | 0.00 | 0.50 | Inner glass (**transmission=0.79**) |
| 6 | `zerkalo` | (0.92,0.67,0.60) | 0.00 | 0.00 | Mirror (back panel, perfectly smooth) |
| 7 | `pink` | (1.00,0.27,0.30) | 0.00 | 0.50 | Pink accent |
| 8 | `screen` | (0.02,0.02,0.02) | 0.00 | 0.04 | Dark glossy display screen |
| 9 | `piiiink` | (0.89,0.05,0.14) | 0.00 | 0.50 | Deep pink accent |
| 10 | `pink_light` | (0.82,0.18,0.18) | 1.00 | 1.00 | Light pink (metallic!) |
| 11-13 | `kuromi_wh/ruromi_pink/keromi_bl` | various | 0.00 | 0.90 | Kuromi plushie parts |
| 14-16 | `melody_pink/mel_yel/melody_blue` | various | 0.00 | 0.90 | My Melody plushie parts |
| 17-18 | `hk_pink/hk_red` | various | 0.00 | 0.90 | Hello Kitty plushie parts |

**GLTF Extensions used:** `KHR_materials_transmission` (for glass), `KHR_materials_emissive_strength`

### Implementation Phases

#### Phase 1: Scene Integration & Model Setup

**Goal:** Register claw game as a new scene type, load the model, extract node references, hide collectables, and render inside a gallery tile.

**Tasks:**

- [x] `src/types/tile.ts` — Add `'clawGame'` to `SceneType` union
- [x] `src/components/Scene/ClawGameScene.tsx` — New scene component:
  - Loads `clawMachine.glb` via `useGLTF`
  - Calls `useClawMachineSetup` to extract refs and configure model
  - Renders model via `<primitive object={scene} />`
  - Accepts `shader: ShaderConfig | null` prop
  - Includes `<SceneLighting />`
  - Sets fixed camera position (angled front view)
- [x] `src/hooks/useClawMachineSetup.ts` — Model setup hook:
  - Traverses cloned scene graph once on load via `useMemo`
  - Finds `Cube.014_23` -> `carriageRef` (claw top, moves X/Z)
  - Finds `Cylinder.022_25` -> `clawArmRef` (claw bottom, descends Y)
  - Finds `Cylinder.038_24` -> `cableRef` (cable, stretches during descent)
  - Finds `Object_10` -> `floorRef` (reads world bounding box for prize floor height)
  - Finds all nodes whose name starts with `Plane` -> hides them (`visible = false`)
  - Filters out 3 outlier plushies at low Y (<3.0): `Plane.043_43`, `Plane.045_56`, `Plane.044_71` — permanently hidden
  - Reparents `Cylinder.022_25` under `Cube.014_23` (so carriage X/Z movement carries the arm):
    1. Compute arm's world position before reparent
    2. Remove from current parent, add as child of carriage
    3. Set local position to maintain same world position
  - Stores original arm local Y offset for descent animation baseline
  - Returns `{ carriageRef, clawArmRef, cableRef, floorRef, validPrizes, floorBounds }`
- [x] `src/components/Gallery/TileView.tsx` — Add `case 'clawGame'` to `TileScene` switch
- [x] `src/components/Scene/SceneSelector.tsx` — Add `{ value: 'clawGame', label: 'Claw Game' }` to `SCENE_OPTIONS`
  - Hide the model sub-selector dropdown when `sceneType === 'clawGame'` (always uses clawMachine.glb)
- [x] Lazy-load decision: `EnvironmentScene.tsx` currently preloads `clawMachine.glb` at module level for all users. Consider moving the preload to `ClawGameScene.tsx` so the 12.7MB model only loads when a clawGame tile exists. Use `useGLTF.preload()` in `ClawGameScene` module scope.

**Success criteria:**
- [ ] Can select "Claw Game" from scene dropdown
- [ ] Model renders with correct materials (rose-gold metal, glass visible)
- [ ] All `Plane.*` plushies are hidden
- [ ] Post-processing effects still work on top
- [ ] Camera shows a good default game view

#### Phase 2: Claw Movement & Prize Spawning

**Goal:** Move the model's claw carriage on X/Z, and spawn a random subset of prizes on the floor.

**Tasks:**

- [x] `src/hooks/useClawInput.ts` — Input hook:
  - Attaches `keydown`/`keyup` listeners via `useEffect` on `window`
  - Tracks held keys in a Set, derives movement direction vector each frame
  - Space bar = drop/grab action (single press, not hold)
  - Returns `{ moveDir: {x, z}, actionPressed }` — movement is directional, not per-keypress
  - Guards: only processes when `selectedTileId === tile.id` (from `uiStore`)
  - Guards: skips if `document.activeElement` is an `INPUT` or `TEXTAREA`
  - Calls `e.preventDefault()` on WASD, arrows, and Space when active (prevents page scroll and textarea typing)
  - Does NOT rely on browser key-repeat rate — uses `useFrame` for smooth per-tick movement
- [x] `src/App.tsx` — Keyboard conflict resolution:
  - Suppress Enter→focus-prompt when `selectedTile.sceneType === 'clawGame'`
  - Add `e.preventDefault()` for Space when claw game tile is active (prevents page scroll)
  - Allow Tab to still cycle tiles (game keys are only WASD/arrows/Space)
- [x] `src/components/Scene/ClawGame/ClawController.tsx` — Movement logic in `useFrame`:
  - Reads `carriageRef` from setup hook
  - Applies input to `carriageRef.position.x` and `carriageRef.position.z`
  - Clamps to machine interior bounds (derived from model bounding box at runtime)
  - Smooth movement via `lerp`, configurable speed (~3 units/sec)
  - Since arm is reparented under carriage, it moves automatically
- [x] Cable animation in `useFrame`:
  - `Cylinder.038_24` (cable) should scale on Y to visually stretch/shrink as the arm descends/ascends
  - Cable connects from rail (Y≈17) to carriage — when carriage stays at Y≈15.4, cable is short; if arm descends, cable could stretch proportionally
- [x] Prize spawning logic (in `useClawMachineSetup` or separate util):
  - From the 43 valid `Plane.*` nodes (46 total minus 3 outliers), pick a random subset (e.g. 8-12)
  - Re-enable them (`visible = true`)
  - Use their existing model positions (already naturally scattered inside the machine at Y=5.6-8.5)
  - Alternative: reposition them on the `Object_10` floor surface (floorBounds.max.y as spawn height) with random X/Z scatter within floor bounds

**Success criteria:**
- [ ] WASD/arrows move the carriage smoothly on X/Z
- [ ] Arm follows carriage movement (reparented)
- [ ] Claw stays within machine interior bounds
- [ ] Random subset of plushies visible on the floor

#### Phase 3: Game State Machine & Grab Mechanic

**Goal:** Full game loop: position -> drop -> grab -> lift -> result.

**Tasks:**

- [x] `src/components/Scene/ClawGame/useClawGameState.ts` — Game state reducer:
  ```
  IDLE → POSITIONING → DESCENDING → GRABBING → ASCENDING → RESULT → IDLE
  ```
  - `IDLE`: Claw at start position, waiting for input
  - `POSITIONING`: Player moves carriage with WASD/arrows
  - `DESCENDING`: Space pressed -> animate `clawArmRef.position.y` down from rail height (Y≈14.8) toward plushie zone (Y≈6-7, read from floorBounds at runtime) over ~1.5s
  - `GRABBING`: At bottom -> check proximity to nearest active prize
  - `ASCENDING`: Arm rises back to original Y (with or without prize)
  - `RESULT`: Show success/fail message, then reset
- [x] Proximity detection:
  - On grab: iterate active (visible) `Plane.*` nodes
  - Calculate XZ distance from arm world position to each prize world position
  - If nearest is within grab radius (configurable, default ~1.5 world units — to be tuned after seeing scale in-engine)
  - Apply flat success chance: 40% (configurable via constant)
  - Return grabbed prize reference or null
- [x] Prize grab animation: if grabbed, reparent prize mesh under `clawArmRef` so it lifts with the arm
  - Use `THREE.Object3D.attach()` (preserves world transform) instead of manual reparenting
- [x] Prize reset: after result display (2 second pause), detach prize, return to original position, re-enable visibility
  - Plushies respawn after each round (infinite supply, no permanent capture in v1)
  - "No plushies remaining" state not needed in v1

**Game constants (tune during development):**

| Constant | Default | Notes |
|----------|---------|-------|
| Carriage speed | 3.0 units/sec | Applied per-frame in `useFrame` via delta |
| Descent speed | 2.0 units/sec | Arm descends from Y≈14.8 to Y≈6.5 |
| Ascent speed | 2.0 units/sec | Same speed up |
| Grab radius | 1.5 world units | XZ distance from arm center to prize center |
| Grab chance | 40% | Flat random, distance does not affect probability |
| Result display | 2.0 seconds | Full-tile overlay then fade |
| Active prizes | 8-12 randomly chosen | From 43 valid Plane nodes |

**Success criteria:**
- [ ] Full game loop plays start to finish
- [ ] Space drops the arm, it descends, checks grab, ascends
- [ ] Nearby plushies can be picked up (with success chance)
- [ ] Grabbed plushie visually lifts with the arm
- [ ] Everything resets for another round

#### Phase 4: HUD Overlay & Camera Management

**Goal:** On-screen controls, status display, and proper camera handling.

**Tasks:**

- [x] `src/components/Scene/ClawGame/ClawGameHUD.tsx` — HTML overlay:
  - Rendered as absolutely positioned div inside TileView's container (same pattern as `TileLabel`, `TileControls`)
  - D-pad: 4 arrow buttons for touch/mouse control, min 44x44px touch targets (WCAG)
  - Use `pointerdown`/`pointerup` events (not `onClick`) for continuous hold-to-move behavior
  - All buttons call `e.stopPropagation()` to prevent triggering tile handleClick
  - Action button: "DROP" mapped to same action as spacebar
  - Status text: "Move the claw!", "Dropping...", "You got [Kuromi]!", "Try again!"
  - Result overlay: full-tile HTML overlay, visible for 2 seconds, then fades and resets
  - Only visible when `isSelected && tile.sceneType === 'clawGame'`
  - Semi-transparent, arcade-themed, positioned at bottom of tile
- [x] Camera management in ClawGameScene:
  - When tile is selected AND sceneType is `clawGame`: disable OrbitControls, snap to fixed game camera
  - When tile is NOT selected: re-enable OrbitControls for passive viewing
  - Fixed game camera: snap to position derived from model bounds (front-angled view showing glass + controls)
  - Exclude clawGame tiles from `syncCameraToAll` in galleryStore (prevent orbit sync overriding game viewpoint)
- [x] Deselection handling:
  - When tile is deselected mid-game (Escape or click outside), immediately reset game state to IDLE
  - Snap claw to home position in one frame (no transition animation)
  - Re-enable OrbitControls for passive orbit viewing
- [x] `src/components/Gallery/TileView.tsx` — Conditional OrbitControls:
  - Pass `enabled` prop based on `sceneType !== 'clawGame' || !isSelected`
- [x] On-screen button events dispatch same actions as keyboard (shared via `useClawInput`)

**Success criteria:**
- [ ] On-screen buttons work for moving claw and dropping
- [ ] Status text shows current game state
- [ ] Camera is fixed during gameplay, orbitable when not selected
- [ ] HUD overlays tile without interfering with other tiles

#### Phase 5: Shader Integration & Polish

**Goal:** Full shader pipeline support, visual polish, edge cases.

**Tasks:**

- [x] Shader overlay support:
  - If `shader` prop provided: apply `DynamicShaderMesh` to glass panels or claw
  - Post-processing effects work unchanged via EffectComposer
- [x] Visual polish:
  - Glass material: `meshPhysicalMaterial` with transmission for transparency
  - Subtle emissive glow on arm during DESCENDING/ASCENDING state
  - Cable stretches visually during descent
- [ ] Sound effects (stretch goal):
  - Motor hum, grab jingle, miss sound via Web Audio API
  - Optional, togglable
- [x] Edge cases:
  - Tile resize: HUD repositions correctly (absolute positioning)
  - Rapid input: state transitions are guarded by phase
  - Deselection: immediate reset to IDLE
  - Multiple claw game tiles: independent game state each (per-tile store + cloned scenes)

**Success criteria:**
- [ ] Shaders apply on top of the game (CRT filter, bloom, toon, etc.)
- [ ] Glass looks translucent, plushies visible through it
- [ ] Arm has visual feedback for grab state
- [ ] Works correctly in any grid size (2x2, 2x3, 3x3)

## Acceptance Criteria

### Functional Requirements

- [ ] Claw game selectable as a scene type from the dropdown
- [ ] Full game loop: move -> drop -> grab/miss -> reset
- [ ] Keyboard controls (WASD/arrows + space) work when tile is selected
- [ ] On-screen buttons provide equivalent input
- [ ] Proximity detection identifies nearest grabbable prize
- [ ] Shader and post-FX pipeline integrates seamlessly

### Non-Functional Requirements

- [ ] Maintains 30+ FPS with claw game in one tile alongside other shader tiles
- [ ] Model loads within 3 seconds on broadband
- [ ] Input latency under 50ms for claw movement
- [ ] Game state is self-contained (no global side effects beyond tile config)

### Quality Gates

- [ ] Works in Chrome, Firefox, Safari (WebGL 2)
- [ ] No console errors during normal gameplay
- [ ] Tile selection/deselection transitions cleanly between game and orbit modes
- [ ] Multiple claw game tiles work independently

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 222-mesh model causes frame drops with shaders | Medium | High | Profile early; can hide non-essential meshes. Model is 278K verts — manageable for one tile but watch combined load. |
| Reparenting `Cylinder.022_25` under `Cube.014_23` breaks transforms | Medium | High | Both nodes have per-node scale matrices (arm: 0.083 uniform, carriage: [1.03, 0.69, 1.04]). Must: (1) compute worldPosition before reparent, (2) use `worldToLocal()` on new parent to get correct local offset, (3) account for parent scale affecting child scale. Test visually in Phase 1. |
| `Cylinder.022_25` scale (0.083) means small position changes = large visual movement | Medium | Medium | Movement speed must account for the scale factor. A 1-unit change in parent space moves the arm ~12 units in mesh-local space. Calibrate in Phase 2. |
| Plushie node names are Cyrillic (fragile matching) | Low | Low | Match by `Plane` prefix — all 46 collectables confirmed to start with "Plane". Material patterns identify type (3-mesh = Kuromi, 5-mesh with melody = My Melody, 5-mesh with hk = Hello Kitty). |
| 3 outlier plushies outside machine glass | Low | Low | Filter by world Y position: exclude Plane nodes with Y < 3.0 (Plane.043_43, Plane.045_56, Plane.044_71). |
| Keyboard events conflict with prompt input | Medium | Medium | Only capture when tile is selected AND `document.activeElement` is not an input/textarea; `stopPropagation` + `preventDefault` on game keys. |
| Glass transparency rendering order issues with post-FX | Medium | Low | Model uses `KHR_materials_transmission` extension (already loaded). Material `steklovnutri` has transmission=0.79. Three.js handles this natively. |
| Runtime coordinate extraction gives unexpected values | Low | Medium | Reference coordinates documented in plan. Log bounding boxes on first load; add debug wireframe mode. |

## References

### Internal References

- Existing scene pattern: `src/components/Scene/ProceduralScene.tsx`
- Tile rendering: `src/components/Gallery/TileView.tsx` (`TileScene` switch)
- Type system: `src/types/tile.ts` (`SceneType`, `TileConfig`)
- Store actions: `src/store/galleryStore.ts` (`setTileScene`)
- Scene selector: `src/components/Scene/SceneSelector.tsx` (`SCENE_OPTIONS`)
- Shader integration: `src/components/Shader/DynamicShaderMesh.tsx`

### Model Reference

- File: `public/models/clawMachine.glb` (12.7MB, Sketchfab origin)
- 19 unique materials, all solid-color PBR (no textures), uses `KHR_materials_transmission` for glass
- Plushie types: 18 Kuromi (3 meshes each), 13 My Melody (5 meshes each), 15 Hello Kitty (5 meshes each) = 46 `Plane.*` nodes total (43 valid, 3 outliers at low Y)
- Claw mechanism: `Cube.014_23` (carriage, Y=15.4), `Cylinder.022_25` (arm, Y=14.8), `Cylinder.038_24` (cable, Y=17.1)
- Prize floor: `Object_10` parent at Y=3.1, plushie zone Y=5.6-8.5
