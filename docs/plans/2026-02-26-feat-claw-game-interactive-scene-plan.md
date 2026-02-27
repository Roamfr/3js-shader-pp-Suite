---
title: "feat: Interactive Claw Game Scene"
type: feat
status: active
date: 2026-02-26
---

# Interactive Claw Game Scene

## Overview

An interactive claw game that runs inside a gallery tile in the existing Three.js Shader Eval Suite. Players control a procedurally-built claw over a `clawMachine.glb` model full of Sanrio plushies (Kuromi, My Melody, Hello Kitty), using keyboard/on-screen buttons to position and drop the claw. The game integrates fully with the eval suite's shader and post-processing pipeline — play with bloom, CRT effects, toon shading, or any Claude-generated shader applied on top.

## Problem Statement / Motivation

1. The claw machine model (`clawMachine.glb`) already exists as a built-in model but is only viewable statically — it's a missed opportunity for interactivity
2. The eval suite currently only supports passive scene viewing (orbit camera); an interactive scene type would demonstrate the framework's flexibility
3. A playable claw game with shader overlays creates a compelling visual showcase: imagine grabbing plushies through a CRT filter or with a holographic post-effect
4. Extends the `SceneType` system to support interactive scenes, establishing a pattern for future game-like tiles

## Proposed Solution

A new `'clawGame'` scene type that:
- **Loads the existing `clawMachine.glb`** as the machine body (glass, frame, plushies, controls)
- **Builds a claw procedurally** using Three.js geometry (cable + 3 prongs) animated via `useFrame`
- **Uses simple animation-based mechanics** — claw moves on X/Z grid, descends, closes, lifts — no physics engine
- **Accepts keyboard input** (WASD/arrows to move, space to drop) + optional on-screen buttons
- **Integrates with existing shader pipeline** — material shaders and post-FX apply on top of the game
- **Keeps rewards simple** — prize lifts, success text, prize resets to pile

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Gallery Tile (existing TileView)                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ <View> (scissored viewport)                            │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────────────────────┐   │ │
│  │  │ ClawGameScene │  │  EffectComposer (if post-FX) │   │ │
│  │  │              │  │  ┌────────────────────────┐   │   │ │
│  │  │ clawMachine  │  │  │ DynamicPostEffect(s)   │   │   │ │
│  │  │   .glb body  │  │  └────────────────────────┘   │   │ │
│  │  │              │  └──────────────────────────────┘   │ │
│  │  │ Procedural   │                                      │ │
│  │  │   Claw rig   │  Camera: fixed game view             │ │
│  │  │              │  (OrbitControls disabled when active) │ │
│  │  │ Game state   │                                      │ │
│  │  │   machine    │  ┌──────────────────────────────┐   │ │
│  │  └──────────────┘  │ HUD Overlay (HTML)            │   │ │
│  │                     │ On-screen buttons + status    │   │ │
│  │                     └──────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Physics model | Animation-based (no Rapier) | Simple state machine: IDLE → MOVING → DESCENDING → GRABBING → ASCENDING → RESULT. Prize pickup by proximity check, not collision. Keeps bundle small and frame rate high. |
| Claw construction | Procedural Three.js geometry | Cable = `CylinderGeometry`, prongs = 3x `ConeGeometry` rotated on hinges. Avoids needing another model file. Simple to animate open/close. |
| Input handling | `useKeyboard` hook + HTML overlay buttons | Keyboard events via `document.addEventListener` in a custom hook. On-screen buttons for mobile/mouse users rendered as HTML overlay on the tile div. |
| Camera during gameplay | Fixed position, no OrbitControls | Game needs a consistent overhead/angled view. Disable `OrbitControls` when `sceneType === 'clawGame'` and tile is active. Allow orbit when tile is not selected (viewing mode). |
| Shader integration | Full support via existing pipeline | ClawGameScene accepts `shader: ShaderConfig \| null` like all scenes. Shader applies to a designated "showcase" mesh (the glass or claw). Post-FX works unchanged via EffectComposer. |
| Prize detection | Proximity-based with random chance | On claw close: find nearest plushie within grab radius. Apply configurable success chance (e.g. 40%). Avoids physics complexity. |
| Game state | Local `useReducer` + optional Zustand extension | Game-specific state (claw position, phase, grabbed item) lives in component. Only persistent config (difficulty, enabled) syncs to galleryStore. |
| Model handling | `useGLTF` with no optimization | Load `clawMachine.glb` (12.7MB, 278K verts) directly. Modern GPUs handle this fine for a single tile. drei's `useGLTF` handles caching across tiles. |

### Claw Machine Model Reference

From Blender inspection of `public/models/clawMachine.glb`:

| Property | Value |
|----------|-------|
| File size | 12.7 MB |
| Total objects | 297 (222 meshes) |
| Vertices | 278,505 |
| Faces | 303,194 |
| Bounding box | X: -6.5 to 5.0 (11.5w) / Y: -8.4 to 5.0 (13.4d) / Z: 0 to 21.3 (21.3h) |
| Animations | None (static model) |
| Textures | None (all solid-color PBR) |
| Origin | Sketchfab model |

**Key Materials:**
- `rughh_met` — rose-gold metallic body (metallic=0.85, roughness=0.24)
- `steklo` — glass panels (roughness=0.0, transparent)
- `screen` — dark glossy display
- `pink` / `piiiink` / `pink_light` — accent colors
- `black` — structural parts
- `kuromi_wh` / `ruromi_pink` / `keromi_bl` — Kuromi plushies (white/pink/black)
- `melody_pink` / `mel_yel` / `melody_blue` — My Melody plushies
- `hk_pink` / `hk_red` — Hello Kitty plushies
- `zerkalo` — mirror (back panel)

**Plushie Locations:** Scattered at Z ~5.5-8.5 (inside the glass cabinet). Approximately:
- 14x Kuromi variants (3 mesh parts each: white, pink, black)
- 10x My Melody variants (5 mesh parts each: white, pink, black, yellow, blue)
- 6x Hello Kitty variants (4-5 mesh parts each: white, pink, red, black, yellow)

**Control Area:** Cube/Cylinder objects clustered near Y=-7.9, Z=5-9 (front panel with buttons/joystick).

**Claw Insertion Point:** Top of machine at approximately Z=17-18 (the overhead rail area). Claw should descend from this height into the plushie area (Z=5-9).

### Implementation Phases

#### Phase 1: Scene Integration & Static Display

**Goal:** Register the claw game as a new scene type, load the model, and render it inside a gallery tile with correct camera.

**Tasks and deliverables:**

- [ ] `src/types/tile.ts` — Add `'clawGame'` to `SceneType` union
- [ ] `src/components/Scene/ClawGameScene.tsx` — New scene component:
  - Loads `clawMachine.glb` via `useGLTF`
  - Renders full model as `<primitive object={scene} />`
  - Accepts `shader: ShaderConfig | null` prop (for future shader overlay)
  - Includes `<SceneLighting />` (reuse existing)
  - Sets up appropriate fixed camera position (angled front view showing glass + controls)
- [ ] `src/components/Gallery/TileView.tsx` — Add `case 'clawGame'` to TileScene switch
- [ ] `src/components/Scene/SceneSelector.tsx` — Add `{ value: 'clawGame', label: 'Claw Game' }` to SCENE_OPTIONS
- [ ] Verify model loads correctly in tile, materials render properly, and post-FX still apply

**Success criteria:**
- [ ] Can select "Claw Game" from scene dropdown
- [ ] Model renders in tile with correct materials (rose-gold metal, glass, plushies visible)
- [ ] Post-processing effects (e.g. bloom) still work on top
- [ ] Camera shows a good default game view

#### Phase 2: Procedural Claw & Basic Movement

**Goal:** Build a visible claw that moves on the X/Z plane above the plushies.

**Tasks and deliverables:**

- [ ] `src/components/Scene/ClawGame/ClawRig.tsx` — Procedural claw group:
  - Cable: `CylinderGeometry` stretching from ceiling rail to claw body
  - Claw body: small `BoxGeometry` or `SphereGeometry` hub
  - 3 prongs: `ConeGeometry` (or extruded shapes) attached at 120-degree intervals
  - Prongs rotate on local X-axis to open/close
  - All parts use metallic material matching `rughh_met` color
- [ ] `src/hooks/useClawInput.ts` — Custom hook for input:
  - Listens for `keydown`/`keyup` on WASD/arrows (move X/Z)
  - Space bar = drop/grab action
  - Returns `{ moveX, moveZ, actionPressed }` state
  - Only active when tile is selected (check `uiStore.selectedTileId`)
- [ ] `src/components/Scene/ClawGame/ClawController.tsx` — Movement logic:
  - Clamp claw position to machine interior bounds (X: -4 to 4, Z: -4 to 4 approximately)
  - Smooth movement via `lerp` in `useFrame`
  - Move speed: configurable (default ~3 units/sec)
- [ ] Claw renders at correct height (Z ~17, above the plushies)
- [ ] Cable length adjusts dynamically as claw moves (stays attached to ceiling)

**Success criteria:**
- [ ] Claw visible inside the machine at the correct position
- [ ] WASD/arrows move the claw smoothly across X/Z plane
- [ ] Claw stays within machine bounds
- [ ] Cable stretches/follows the claw body

#### Phase 3: Game State Machine & Grab Mechanic

**Goal:** Implement the full game loop: position → drop → grab → lift → result.

**Tasks and deliverables:**

- [ ] `src/components/Scene/ClawGame/useClawGameState.ts` — Game state reducer:
  ```
  States: IDLE → POSITIONING → DESCENDING → GRABBING → ASCENDING → RESULT → IDLE
  ```
  - `IDLE`: Claw at start position, waiting for input
  - `POSITIONING`: Player moves claw with WASD/arrows
  - `DESCENDING`: Space pressed → claw descends (animate Z from ~17 to ~7 over ~1.5s)
  - `GRABBING`: At bottom → prongs close (rotate inward), check proximity to nearest plushie
  - `ASCENDING`: Claw rises back to top (with or without prize)
  - `RESULT`: If prize grabbed → show success message, then reset. If miss → show "try again"
- [ ] `src/components/Scene/ClawGame/PrizeDetector.ts` — Proximity detection:
  - On grab: find all plushie root nodes (filter by material names: `kuromi_*`, `melody_*`, `hk_*`)
  - Calculate distance from claw to each plushie center
  - If nearest is within grab radius (~2 units): apply success chance (configurable, default 40%)
  - Return grabbed plushie reference or null
- [ ] Prize animation: if grabbed, reparent plushie mesh to claw group so it lifts with the claw
- [ ] Prize reset: after result phase, detach plushie and return to original position
- [ ] Claw open/close animation: prongs rotate ±30 degrees over 0.3s

**Success criteria:**
- [ ] Full game loop plays from start to finish
- [ ] Pressing space drops the claw, it descends, grabs, ascends
- [ ] Nearby plushies can be picked up (with success chance)
- [ ] Grabbed plushie visually lifts with the claw
- [ ] After result, everything resets for another round

#### Phase 4: HUD Overlay & Camera Management

**Goal:** On-screen controls, status display, and proper camera handling for gameplay vs. viewing.

**Tasks and deliverables:**

- [ ] `src/components/Scene/ClawGame/ClawGameHUD.tsx` — HTML overlay (positioned over tile div):
  - Directional pad: 4 arrow buttons (up/down/left/right) for touch/mouse control
  - Action button: "DROP" button mapped to same action as spacebar
  - Status text: current state ("Move the claw!", "Dropping...", "You got it!", "Try again!")
  - Style: semi-transparent, arcade-themed, positioned at bottom of tile
- [ ] Camera management in ClawGameScene:
  - When tile is selected AND sceneType is `clawGame`: disable OrbitControls, set fixed game camera
  - When tile is NOT selected: re-enable OrbitControls for passive viewing/orbit
  - Fixed game camera: position=[0, -15, 22], lookAt=[0, 0, 8] (front-angled view)
- [ ] `src/components/Gallery/TileView.tsx` — Conditional OrbitControls:
  - Pass `enabled` prop based on `sceneType !== 'clawGame' || !isSelected`
  - Or: ClawGameScene manages its own camera internally
- [ ] On-screen button events dispatch same actions as keyboard (shared via `useClawInput`)

**Success criteria:**
- [ ] On-screen buttons work for moving claw and dropping
- [ ] Status text shows current game state
- [ ] Camera is fixed during gameplay, orbitable when tile is not selected
- [ ] HUD is overlaid on the tile without interfering with other tiles

#### Phase 5: Shader Integration & Polish

**Goal:** Full shader pipeline support, visual polish, and edge case handling.

**Tasks and deliverables:**

- [ ] Shader overlay support in ClawGameScene:
  - If `shader` prop is provided: apply `DynamicShaderMesh` to the glass panels (or a designated mesh)
  - Alternative: apply shader to claw itself for visual effect
  - Post-processing effects work unchanged (EffectComposer wraps the whole scene)
- [ ] Visual polish:
  - Glass material: configure for transparency (`meshPhysicalMaterial` with transmission)
  - Add subtle glow to claw prongs when in GRABBING state (emissive material)
  - Screen mesh: render a simple "PLAY!" or credits texture on the machine's screen
  - Claw cable: slight sway animation during movement (sine wave offset)
- [ ] Sound effects (optional, stretch goal):
  - Claw motor hum during movement
  - Descend/ascend mechanical sound
  - Grab success jingle vs. miss sound
  - Use Web Audio API or Howler.js, sounds are optional and can be toggled
- [ ] Edge cases:
  - Handle tile resize: HUD repositions correctly
  - Handle rapid input: debounce state transitions
  - Handle model load failure: show error state in tile
  - Multiple claw game tiles: each has independent game state

**Success criteria:**
- [ ] Claude-generated shaders apply on top of the game (e.g. CRT filter, bloom, toon)
- [ ] Glass looks translucent and plushies are visible through it
- [ ] Claw has visual feedback for grab state
- [ ] Game works correctly in any grid size (2x2, 3x3)

## Acceptance Criteria

### Functional Requirements

- [ ] Claw game selectable as a scene type from the dropdown
- [ ] Full game loop: move → drop → grab/miss → reset
- [ ] Keyboard controls (WASD/arrows + space) work when tile is selected
- [ ] On-screen buttons provide equivalent input for mouse/touch
- [ ] Plushie proximity detection identifies nearest grabbable prize
- [ ] Shader and post-FX pipeline integrates seamlessly

### Non-Functional Requirements

- [ ] Maintains 30+ FPS with the claw game running in one tile alongside other shader tiles
- [ ] Model loads within 3 seconds on broadband connection
- [ ] Input latency under 50ms for claw movement
- [ ] Game state is self-contained (no global side effects beyond the tile config)

### Quality Gates

- [ ] Works in Chrome, Firefox, Safari (WebGL 2)
- [ ] No console errors during normal gameplay
- [ ] Tile selection/deselection transitions cleanly between game and orbit modes
- [ ] Multiple claw game tiles work independently

## Dependencies & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 278K vertex model causes frame drops with shaders | Medium | High | Profile early; can LOD later or simplify plushies if needed |
| Plushie node identification fragile (Cyrillic names in model) | High | Medium | Match by material name pattern (kuromi_*, melody_*, hk_*) rather than object names |
| Keyboard events conflict with other UI (prompt input, etc.) | Medium | Medium | Only capture when tile is selected AND focused; use `stopPropagation` |
| Glass transparency rendering order issues with post-FX | Medium | Low | Use `meshPhysicalMaterial` with `transmission`; adjust render order if needed |
| Claw position mapping to model coordinates | Low | Medium | Established from Blender inspection: plushies at Z=5-9, rail at Z=17-18 |

## References & Research

### Internal References

- Existing scene pattern: `src/components/Scene/ProceduralScene.tsx`
- Tile rendering: `src/components/Gallery/TileView.tsx`
- Type system: `src/types/tile.ts` (SceneType, TileConfig)
- Store actions: `src/store/galleryStore.ts` (setTileScene)
- Scene selector: `src/components/Scene/SceneSelector.tsx`
- Shader integration: `src/components/Shader/DynamicShaderMesh.tsx`

### Model Reference

- File: `public/models/clawMachine.glb` (12.7MB, Sketchfab origin)
- 19 unique materials, all solid-color PBR (no textures)
- Plushie types: Kuromi (14 instances), My Melody (10 instances), Hello Kitty (6 instances)
- Machine coordinate space: width=11.5, depth=13.4, height=21.3
