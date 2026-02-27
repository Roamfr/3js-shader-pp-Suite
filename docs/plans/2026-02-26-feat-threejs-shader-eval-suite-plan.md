---
title: "feat: Three.js Shader & Post-Processing Eval Suite"
type: feat
status: active
date: 2026-02-26
---

# Three.js Shader & Post-Processing Eval Suite

## Overview

A React + React Three Fiber gallery application for systematically evaluating shader and post-processing effects in Three.js. Users prompt Claude to generate GLSL shaders, which are compiled and rendered live across a grid of 4-9 tiles — each showing a different effect on the same (or different) 3D scene. The tool enables visual comparison, iterative refinement, parameter tweaking, and import of existing shaders to understand the limits of Three.js rendering quality.

## Problem Statement / Motivation

There is no easy way to:
1. Systematically explore the space of Three.js shader effects and post-processing combinations
2. Quickly generate and compare GLSL shader variants side-by-side
3. Understand the practical limits of Three.js rendering quality across different effect types
4. Build a personal library of evaluated, working shader effects

This tool turns shader exploration from a manual, one-at-a-time process into a parallel, visual, LLM-assisted workflow.

## Proposed Solution

A single-page React application with:
- **Gallery grid** (4-9 tiles) using a single `<Canvas>` with drei's `<View>` component (scissored viewports, one WebGL context)
- **Prompt interface** to generate GLSL via Claude API (user-provided API key)
- **Live shader injection** — both material shaders (`ShaderMaterial`) and post-processing effects (pmndrs `postprocessing` `Effect` class)
- **Interactive uniform controls** — auto-generated sliders/pickers from shader uniforms
- **Scene switcher** — built-in test scenes + custom GLTF upload
- **Camera sync** — optional linked orbit controls across all tiles
- **Code viewer** — syntax-highlighted GLSL with inline editing
- **Persistence** — auto-save to localStorage, JSON project export

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  App Shell (React + Vite)                               │
│                                                         │
│  ┌──────────┐  ┌──────────────────────────────────────┐ │
│  │  Sidebar  │  │  Gallery Grid (CSS Grid)             │ │
│  │          │  │  ┌────────┐ ┌────────┐ ┌────────┐   │ │
│  │ Prompt   │  │  │ View 1 │ │ View 2 │ │ View 3 │   │ │
│  │ Input    │  │  │ Scene  │ │ Scene  │ │ Scene  │   │ │
│  │          │  │  │ Shader │ │ Shader │ │ Shader │   │ │
│  │ Uniform  │  │  │ PostFX │ │ PostFX │ │ PostFX │   │ │
│  │ Controls │  │  └────────┘ └────────┘ └────────┘   │ │
│  │          │  │  ┌────────┐ ┌────────┐ ┌────────┐   │ │
│  │ Scene    │  │  │ View 4 │ │ View 5 │ │ View 6 │   │ │
│  │ Selector │  │  │  ...   │ │  ...   │ │  ...   │   │ │
│  │          │  │  └────────┘ └────────┘ └────────┘   │ │
│  │ Code     │  │                                      │ │
│  │ Viewer   │  │  ┌──────────────────────────────┐    │ │
│  └──────────┘  │  │ Single <Canvas> + <View.Port>│    │ │
│                │  │ (1 WebGL context, scissored)  │    │ │
│                │  └──────────────────────────────┘    │ │
│                └──────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Canvas strategy | Single `<Canvas>` + `<View>` per tile | WebGL context limit is 8-16 per browser; `<View>` uses `gl.scissor` with zero overhead |
| Post-processing lib | pmndrs `postprocessing` via `@react-three/postprocessing` | Merges effects into single shader pass (vs. Three.js built-in multi-pass) |
| Material shaders | `THREE.ShaderMaterial` instantiated from runtime GLSL strings | Supports dynamic generation; `useMemo` recreates on string change |
| Custom post-FX | Extend `Effect` from `postprocessing` with `mainImage()` | Integrates into EffectComposer pipeline; auto-merges with other effects |
| WebGL target | WebGL 2 / GLSL ES 3.0 (fallback message for WebGL 1) | Modern feature set; near-universal desktop support |
| API access | User-provided Claude API key stored in localStorage | No backend needed; pure SPA; user controls their own usage |
| State management | Zustand | Lightweight, works great with R3F ecosystem |
| Build tool | Vite | Fast HMR, good R3F support, shaderMaterial hot-reload via `key` prop |

### Implementation Phases

#### Phase 1: Foundation — Single Tile Prototype

**Goal:** Prove the core loop: prompt → generate → compile → display → error handling.

**Tasks and deliverables:**

- [x] `src/main.tsx` — Vite + React entry point
- [x] `src/App.tsx` — Root layout with sidebar + canvas area
- [x] `src/components/Canvas/ShaderCanvas.tsx` — Single `<Canvas>` with one `<View>` (integrated into App.tsx + TileView.tsx)
- [x] `src/components/Scene/TestScene.tsx` — Procedural test scene (sphere, torus knot, ground plane)
- [x] `src/components/Shader/DynamicShaderMesh.tsx` — Accepts `vertexShader`/`fragmentShader` strings, creates `THREE.ShaderMaterial` via `useMemo`, updates `time` uniform via `useFrame`
- [x] `src/components/Shader/DynamicPostEffect.tsx` — Factory function `createDynamicEffect()` extending `Effect` from `postprocessing` with `mainImage()` interface; React wrapper component
- [x] `src/lib/claude.ts` — Claude API client (Messages API, streaming, system prompt for GLSL generation)
- [x] `src/lib/shaderPrompts.ts` — System prompts and output schema for material shaders vs. post-processing effects
- [x] `src/lib/shaderValidator.ts` — Pre-compilation GLSL validation: loop bound check, source length cap (10KB), compile via temporary WebGL shader objects, error message extraction
- [x] `src/components/Prompt/PromptInput.tsx` — Textarea with submit, streaming response display, error feedback
- [x] `src/components/Prompt/ShaderTypeSelector.tsx` — Toggle between "Material Shader" and "Post-Processing Effect" generation modes
- [x] `src/components/Error/ShaderError.tsx` — Error display with raw GLSL error + "Ask Claude to fix" button
- [x] `package.json` with deps: `react`, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `postprocessing`, `three`, `zustand`, `@anthropic-ai/sdk`

**Success criteria:**
- [ ] Can type a prompt, get GLSL back from Claude, see it rendered on a sphere
- [ ] Compilation errors shown clearly with auto-fix loop (re-prompt Claude with error)
- [ ] Both material shaders and post-processing effects work

#### Phase 2: Gallery Grid — Multi-Tile Layout

**Goal:** Render 4-9 independent tiles with different shaders, each with its own scene and controls.

**Tasks and deliverables:**

- [x] `src/components/Gallery/GalleryGrid.tsx` — CSS grid of `<View>` tracking divs with configurable column count (2x2, 3x3)
- [x] `src/components/Gallery/TileView.tsx` — Single tile: `<View>` with `<PerspectiveCamera>`, `<OrbitControls>`, scene content, shader material, optional `<EffectComposer>`
- [x] `src/components/Gallery/TileLabel.tsx` — Overlay label showing tile name, effect name, FPS
- [x] `src/components/Gallery/TileControls.tsx` — Per-tile action buttons: select, clear, duplicate, delete
- [x] `src/store/galleryStore.ts` — Zustand store: array of tile configs `{ id, label, sceneType, vertexShader, fragmentShader, postEffects[], uniforms, cameraState }`
- [x] `src/store/uiStore.ts` — Zustand store: selected tile ID, sidebar panel, grid size, camera sync toggle
- [x] Camera sync toggle — When enabled, OrbitControls changes on any tile propagate to all tiles via shared camera state in store
- [x] Grid size selector — Dropdown: 2x2, 2x3, 3x3
- [x] Tile selection model — Click tile to select (blue border), sidebar shows controls for selected tile

**Success criteria:**
- [ ] 9 tiles render simultaneously at 30+ FPS with simple shaders
- [ ] Each tile has independent shader and scene
- [ ] Camera sync toggle works (orbit one = orbit all)
- [ ] Selecting a tile highlights it and shows its controls in sidebar

#### Phase 3: Scene System — Test Scenes & GLTF Upload

**Goal:** Multiple scene types per tile, including custom model upload.

**Tasks and deliverables:**

- [x] `src/components/Scene/ProceduralScene.tsx` — Built-in: metallic sphere + rough sphere + torus knot + ground plane
- [x] `src/components/Scene/MaterialSpheres.tsx` — Grid of spheres with varying roughness/metalness (Khronos-style)
- [x] `src/components/Scene/EnvironmentScene.tsx` — Damaged Helmet or similar GLTF from Khronos samples
- [x] `src/components/Scene/CustomGLTFScene.tsx` — Load user-uploaded GLTF via `useGLTF` with Draco support
- [x] `src/components/Scene/SceneSelector.tsx` — Dropdown per-tile or global scene switch
- [x] `src/lib/gltfValidator.ts` — File size limit (50MB), basic validation, sanitization (strip embedded scripts)
- [x] `src/components/Scene/SceneLighting.tsx` — Consistent lighting setup: `<Environment preset="studio">` + directional light + ambient
- [x] Bundle built-in GLTF models in `public/models/` (DamagedHelmet.glb, Duck.glb, ClawMachine.glb)
- [x] Shared geometry instances across tiles (procedural geometries created once, reused)
- [x] Note: ClawMachine.glb is loaded as a static scene for now. Interactive game mode (physics, input, animation state) can be added later by refactoring TileView to support a `sceneMode: "viewer" | "interactive"` prop.

**Success criteria:**
- [ ] Can switch scenes per-tile and globally
- [ ] Custom GLTF upload works with drag-and-drop
- [ ] Built-in scenes load instantly (bundled assets)
- [ ] Scene switching preserves current shader on tile

#### Phase 4: Uniform Controls & Code Viewer

**Goal:** Interactive parameter tweaking and code inspection/editing.

**Tasks and deliverables:**

- [x] `src/lib/uniformParser.ts` — Parse GLSL source to extract uniform declarations: name, type (`float`, `vec2`, `vec3`, `vec4`, `bool`, `int`), infer reasonable min/max/step defaults
- [x] `src/components/Controls/UniformPanel.tsx` — Auto-generated controls: sliders for floats, color pickers for vec3 colors, number inputs for vec2/vec4, checkboxes for bools
- [x] `src/components/Controls/UniformSlider.tsx` — Range slider with label, value display, reset-to-default button
- [x] `src/components/Controls/ColorUniform.tsx` — Color picker mapped to vec3/vec4 uniform
- [x] `src/components/CodeViewer/CodePanel.tsx` — Syntax-highlighted GLSL display (vertex + fragment tabs) using a lightweight highlighter (Prism or Shiki)
- [x] `src/components/CodeViewer/CodeEditor.tsx` — Editable mode with debounced recompilation on change (500ms debounce)
- [x] Copy-to-clipboard button for shader code
- [x] Real-time uniform updates via `useFrame` (no re-render, direct uniform mutation)

**Success criteria:**
- [ ] Changing a slider immediately updates the rendered effect
- [ ] Code viewer shows syntax-highlighted GLSL
- [ ] Editing code in the viewer recompiles and displays errors inline
- [ ] Uniform panel auto-populates from any generated or imported shader

#### Phase 5: Import, Presets & Persistence

**Goal:** Import existing shaders, preset library, save/load projects.

**Tasks and deliverables:**

- [x] `src/lib/shaderImporter.ts` — Import handlers for: raw `.glsl`/`.frag`/`.vert` files, Shadertoy-format conversion (iResolution/iTime → our uniforms), paste-from-clipboard
- [x] `src/components/Import/ImportDialog.tsx` — File picker + drag-and-drop + paste area; auto-detect format
- [x] `src/data/presets/` — 10-15 curated preset effects:
  - Material: toon, holographic, wireframe, noise displacement, iridescent, dissolve
  - Post-FX: bloom, chromatic aberration, film grain + vignette, depth of field, CRT/retro, color grading LUT
- [x] `src/components/Presets/PresetLibrary.tsx` — Scrollable grid of preset thumbnails with one-click apply to selected tile
- [x] `src/lib/persistence.ts` — Auto-save full gallery state to localStorage every 30s + on change; JSON project export/import
- [x] `src/store/historyStore.ts` — Undo/redo stack (last 20 actions) for shader changes per tile
- [x] `src/components/Export/ExportDialog.tsx` — Export options: raw GLSL files, JSON project, screenshot (canvas.toDataURL)

**Success criteria:**
- [x] Can import a Shadertoy fragment shader and see it render
- [x] Preset library populates tiles with one click
- [x] Refreshing the page restores full gallery state
- [x] Undo/redo works for shader changes
- [x] Can export project as JSON and re-import it

#### Phase 6: Polish & Advanced Features

**Goal:** Performance monitoring, effect chaining UI, responsive layout, onboarding.

**Tasks and deliverables:**

- [x] `src/components/Performance/TileFPS.tsx` — Per-tile FPS counter overlay (togglable)
- [x] `src/components/Performance/PerformanceMonitor.tsx` — Adaptive DPR based on frame rate; reduce resolution on struggling tiles
- [x] `src/components/Effects/EffectChain.tsx` — Drag-and-drop reorderable list of post-processing effects per tile; toggle individual effects on/off
- [x] `src/components/Onboarding/WelcomeState.tsx` — First-load state: 4 tiles pre-loaded with example effects (holographic, toon, film grain, chromatic aberration)
- [x] `src/components/Settings/APIKeyInput.tsx` — Settings panel for API key entry with validation (test call)
- [x] `src/components/Comparison/DiffView.tsx` — Side-by-side code diff between two tiles' shaders
- [x] Responsive layout — 1-column on mobile (stacked tiles), 2-column on tablet, full grid on desktop
- [x] Performance optimization — Adaptive DPR via PerformanceMonitor (frameloop="demand" not compatible with single-Canvas multi-View + animated shaders)
- [x] Keyboard shortcuts — Tab to cycle tiles, Enter to focus prompt, Escape to deselect, Ctrl+Z undo, Ctrl+S export

**Success criteria:**
- [x] App runs smoothly with 9 tiles on mid-range hardware (M1 MacBook Air)
- [x] New users understand how to use the app without documentation
- [x] Effect chains can be reordered and toggled per tile
- [x] Idle tiles consume minimal GPU resources

## Claude GLSL Generation Contract

### System Prompt (Material Shader Mode)

```
You are a GLSL shader expert for Three.js ShaderMaterial (WebGL 2 / GLSL ES 3.0).

Generate a vertex shader and fragment shader based on the user's description.

INTERFACE CONTRACT:
- Three.js auto-provides: modelViewMatrix, projectionMatrix, viewMatrix, normalMatrix, cameraPosition
- Three.js auto-provides attributes: position, normal, uv
- You MUST declare a `uniform float time;` (elapsed seconds) — the host app updates this
- You MUST declare a `uniform vec2 resolution;` — the host app updates this
- You MAY declare additional uniforms (the host will auto-generate UI controls)

OUTPUT FORMAT (JSON):
{
  "type": "material",
  "name": "Effect Name",
  "vertexShader": "...GLSL...",
  "fragmentShader": "...GLSL...",
  "uniforms": {
    "customUniform": { "type": "float", "value": 1.0, "min": 0.0, "max": 5.0 }
  },
  "transparent": false,
  "side": "front"
}

CONSTRAINTS:
- GLSL ES 3.0 only (no compute shaders)
- Max 64 loop iterations
- All float literals must have decimal points (1.0 not 1)
- Prefer branchless math (mix, step, smoothstep) over if/else
- Output ONLY the JSON, no markdown fences, no explanation
```

### System Prompt (Post-Processing Mode)

```
You are a GLSL shader expert for Three.js post-processing effects (pmndrs/postprocessing library).

Generate a fragment shader that implements a screen-space post-processing effect.

INTERFACE CONTRACT:
- Your shader must implement: void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor)
- Built-in uniforms available: resolution, texelSize, cameraNear, cameraFar, aspect, time
- inputColor = result of previous effects in the chain
- uv = screen UV coordinates (0..1)
- You MAY declare additional uniforms

OUTPUT FORMAT (JSON):
{
  "type": "postprocessing",
  "name": "Effect Name",
  "fragmentShader": "...GLSL...",
  "uniforms": {
    "intensity": { "type": "float", "value": 1.0, "min": 0.0, "max": 3.0 }
  }
}

CONSTRAINTS:
- Do NOT write void main() — only mainImage()
- GLSL ES 3.0 compatible
- Max 64 loop iterations
- Output ONLY the JSON, no markdown fences, no explanation
```

### Error Recovery Loop

```
User prompt → Claude generates JSON → Parse JSON →
  ├─ Parse fails → Re-prompt: "Your output was not valid JSON. Output ONLY JSON."
  └─ Parse succeeds → Extract GLSL → Compile →
       ├─ Compile fails → Re-prompt: "Shader failed to compile: {error}. Fix the GLSL."
       └─ Compile succeeds → Apply to tile → Render →
            ├─ GPU hang (>100ms frame) → Kill shader, show fallback, warn user
            └─ Renders OK → Display result
```

Max retry: 3 attempts before showing error to user.

## Shader Safety Strategy

```
1. STATIC ANALYSIS (before WebGL compilation):
   - Reject shaders with loop bounds > 128 iterations
   - Reject nested loop depth > 3
   - Reject shader source > 10KB
   - Reject while() loops (require bounded for())

2. COMPILATION GUARD:
   - Compile vertex + fragment shaders via temporary WebGL shader objects
   - Check gl.getShaderParameter(shader, gl.COMPILE_STATUS)
   - Extract error log via gl.getShaderInfoLog(shader)
   - Clean up temporary shaders after validation

3. RUNTIME PROTECTION:
   - Monitor per-frame time; if a single frame > 100ms, disable the shader
   - Keep last-known-good shader per tile as fallback
   - Show magenta "shader error" placeholder on failure

4. RECOVERY:
   - WebGL context loss: listen for 'webglcontextlost'/'webglcontextrestored'
   - On restore: recompile all active shaders from stored GLSL strings
   - Auto-save state to localStorage so refresh recovers everything
```

## Dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@react-three/fiber": "^9.0.0",
    "@react-three/drei": "^9.100.0",
    "@react-three/postprocessing": "^3.0.0",
    "postprocessing": "^6.36.0",
    "three": "^0.170.0",
    "zustand": "^5.0.0",
    "@anthropic-ai/sdk": "^1.0.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.7.0",
    "@types/three": "^0.170.0",
    "r3f-perf": "^7.2.0"
  }
}
```

## File Structure

```
src/
├── main.tsx
├── App.tsx
├── components/
│   ├── Canvas/
│   │   └── ShaderCanvas.tsx          # Single <Canvas> + <View.Port>
│   ├── Gallery/
│   │   ├── GalleryGrid.tsx           # CSS grid of View tracking divs
│   │   ├── TileView.tsx              # Single tile (View + Camera + Controls + Scene + Shader)
│   │   ├── TileLabel.tsx             # Overlay label
│   │   └── TileControls.tsx          # Per-tile action buttons
│   ├── Scene/
│   │   ├── ProceduralScene.tsx       # Built-in geometry scene
│   │   ├── MaterialSpheres.tsx       # Roughness/metalness grid
│   │   ├── EnvironmentScene.tsx      # GLTF test model
│   │   ├── CustomGLTFScene.tsx       # User-uploaded GLTF
│   │   ├── SceneSelector.tsx         # Scene switcher UI
│   │   └── SceneLighting.tsx         # Consistent lighting setup
│   ├── Shader/
│   │   ├── DynamicShaderMesh.tsx     # ShaderMaterial from GLSL strings
│   │   └── DynamicPostEffect.tsx     # Dynamic postprocessing Effect
│   ├── Prompt/
│   │   ├── PromptInput.tsx           # Text input + submit
│   │   └── ShaderTypeSelector.tsx    # Material vs. Post-FX toggle
│   ├── Controls/
│   │   ├── UniformPanel.tsx          # Auto-generated uniform controls
│   │   ├── UniformSlider.tsx         # Float slider
│   │   └── ColorUniform.tsx          # Color picker for vec3
│   ├── CodeViewer/
│   │   ├── CodePanel.tsx             # Read-only highlighted GLSL
│   │   └── CodeEditor.tsx            # Editable GLSL with recompilation
│   ├── Import/
│   │   └── ImportDialog.tsx          # File/paste import
│   ├── Presets/
│   │   └── PresetLibrary.tsx         # Curated effect presets
│   ├── Export/
│   │   └── ExportDialog.tsx          # Export options
│   ├── Error/
│   │   └── ShaderError.tsx           # Compilation error display + auto-fix
│   ├── Performance/
│   │   ├── TileFPS.tsx               # Per-tile FPS overlay
│   │   └── PerformanceMonitor.tsx    # Adaptive DPR
│   ├── Effects/
│   │   └── EffectChain.tsx           # Drag-and-drop effect ordering
│   ├── Onboarding/
│   │   └── WelcomeState.tsx          # First-load example tiles
│   ├── Settings/
│   │   └── APIKeyInput.tsx           # API key configuration
│   └── Comparison/
│       └── DiffView.tsx              # Side-by-side shader code diff
├── store/
│   ├── galleryStore.ts               # Tile configs, shader state
│   ├── uiStore.ts                    # UI state (selection, panels, grid size)
│   └── historyStore.ts               # Undo/redo stack
├── lib/
│   ├── claude.ts                     # Claude API client
│   ├── shaderPrompts.ts              # System prompts for GLSL generation
│   ├── shaderValidator.ts            # GLSL static analysis + compile check
│   ├── uniformParser.ts              # Extract uniforms from GLSL source
│   ├── shaderImporter.ts             # Import handlers (.glsl, Shadertoy, etc.)
│   ├── gltfValidator.ts              # GLTF upload validation
│   └── persistence.ts                # localStorage auto-save + JSON export
├── data/
│   └── presets/                      # Curated shader presets (JSON files)
│       ├── bloom.json
│       ├── toon.json
│       ├── holographic.json
│       ├── film-grain.json
│       ├── chromatic-aberration.json
│       ├── crt-retro.json
│       ├── noise-displacement.json
│       ├── wireframe.json
│       ├── dissolve.json
│       └── depth-of-field.json
├── evals/                             # Eval task definitions (JSON)
│   ├── capability/
│   │   ├── material-shaders/          # Increasingly difficult material shader prompts
│   │   ├── post-processing/           # Post-FX generation prompts
│   │   └── combinations/              # Multi-effect chain prompts
│   └── regression/
│       ├── basic-compilation.json     # Must-always-compile prompts
│       ├── json-format.json           # Must-always-parse prompts
│       └── standard-effects.json      # Known-good effects that must still work
└── types/
    ├── shader.ts                     # ShaderConfig, PostEffectConfig types
    ├── tile.ts                       # TileConfig type
    ├── gallery.ts                    # GalleryState type
    └── eval.ts                       # EvalTranscript, EvalTask, EvalSuite types
public/
├── models/
│   ├── DamagedHelmet.glb             # Khronos sample model
│   └── Suzanne.glb                   # Blender monkey
└── index.html
```

## Shader Effect Taxonomy (Evaluation Matrix)

### Material Shaders (ShaderMaterial)

| Category | Effects | Complexity |
|----------|---------|------------|
| PBR Variants | Metallic-roughness, clear coat, anisotropic | Medium-High |
| Toon/Cel | Stepped diffuse, rim lighting, ink outlines | Low-Medium |
| Holographic | Fresnel rainbow, scanlines, flicker | Medium |
| Glass/Refraction | Refraction, frosted glass, thin film | Medium-High |
| Procedural | Perlin noise, Voronoi, FBM marble/wood | Medium |
| Wireframe | Barycentric wireframe, neon glow wireframe | Low |
| Dissolve | Noise-based dissolve with burn edges | Low-Medium |
| Iridescent | Thin-film interference, soap bubble | Medium |

### Post-Processing Effects (EffectComposer)

| Category | Effects | Complexity |
|----------|---------|------------|
| Bloom/Glow | Bloom, unreal bloom, selective bloom | Medium |
| Depth-Based | DOF (bokeh), tilt-shift | Medium-High |
| Lens | Chromatic aberration, lens distortion, flare | Low-Medium |
| Film/Analog | Film grain, scanlines, VHS/CRT, halftone | Low |
| Color | LUT grading, sepia, duotone, hue/saturation | Low |
| Vignette | Standard vignette, circular mask | Low |
| Blur | Gaussian, radial, zoom, kawase | Low-Medium |
| Edge | Sobel outline, sketch/pencil effect | Low-Medium |
| Distortion | Heat haze, underwater, shockwave | Low-Medium |
| SSAO | Screen-space ambient occlusion | High |

### Vertex Shaders (Geometry Deformation)

| Category | Effects | Complexity |
|----------|---------|------------|
| Displacement | Noise displacement, heightmap | Low-Medium |
| Wave | Sine wave, Gerstner ocean waves | Medium |
| Morph | Blend between shapes | Medium |
| Explode | Vertex scatter, face extrusion | Medium |

### Combination Presets (Material + Post-FX)

| Preset Name | Material | Post-Processing |
|-------------|----------|-----------------|
| Cinematic | Standard PBR | Bloom + Chromatic Aberration + Film Grain + Vignette |
| Retro Game | Toon/Cel | Pixelation + Scanlines + CRT Distortion |
| Sci-Fi | Holographic | Bloom + Chromatic Aberration + Glitch |
| Dreamy | Glass | DOF + Bloom + Soft Vignette |
| Sketch | Wireframe | Sobel Edge + Paper Grain |
| Horror | Dissolve | Film Grain + Vignette + Desaturation |

## Final UI Mockup

### Default Gallery View (3x3 grid, one tile selected)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Three.js Shader Eval Suite                    [2x2] [2x3] [3x3]  [⚙ Settings]     │
├────────────────────┬─────────────────────────────────────────────────────────────────┤
│                    │                                                                 │
│  PROMPT            │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  ┌──────────────┐  │  │ Toon Shading │  │  Holographic │  │ Noise Displ. │          │
│  │ Material ◉   │  │  │              │  │              │  │              │          │
│  │ Post-FX  ○   │  │  │    ╭───╮     │  │    ╭───╮     │  │    ╭~~~╮     │          │
│  ├──────────────┤  │  │   ╱ ▓▓▓ ╲    │  │   ╱ ░▒▓ ╲    │  │   ╱ ≈≈≈ ╲    │          │
│  │              │  │  │  │ ▓▓▓▓▓ │   │  │  │ ▒▓░▒▓ │   │  │  │ ≈≈≈≈≈ │   │          │
│  │ "Create a    │  │  │   ╲ ▓▓▓ ╱    │  │   ╲ ▓░▒ ╱    │  │   ╲ ≈≈≈ ╱    │          │
│  │  holographic │  │  │    ╰───╯     │  │    ╰───╯     │  │    ╰~~~╯     │          │
│  │  shader with │  │  │              │  │              │  │              │          │
│  │  scanlines"  │  │  │ 60fps  Toon  │  │ 58fps  Holo  │  │ 55fps Displ  │          │
│  │              │  │  └──────────────┘  └──────────────┘  └──────────────┘          │
│  │         [⏎]  │  │                                                                 │
│  └──────────────┘  │  ┌──────────────┐  ┌═══════════════╗  ┌──────────────┐          │
│                    │  │ Bloom + Grain │  ║  ★ SELECTED ★ ║  │   Wireframe  │          │
│  SELECTED TILE     │  │              │  ║               ║  │              │          │
│  ┌──────────────┐  │  │    ╭───╮     │  ║    ╭───╮      ║  │    ╭───╮     │          │
│  │ Chromatic Ab.│  │  │   ╱ ✦✦✦ ╲    │  ║   ╱ ◊◊◊ ╲     ║  │   ╱╱╲╲╱╲    │          │
│  │ Post-FX      │  │  │  │ ✦✦✦✦✦ │   │  ║  │ ◊◊◊◊◊ │    ║  │  │╱╲╱╲╱│   │          │
│  │              │  │  │   ╲ ✦✦✦ ╱    │  ║   ╲ ◊◊◊ ╱     ║  │   ╲╲╱╱╲╱    │          │
│  │ Scene:       │  │  │    ╰───╯     │  ║    ╰───╯      ║  │    ╰───╯     │          │
│  │ [Procedural▾]│  │  │              │  ║               ║  │              │          │
│  └──────────────┘  │  │ 45fps  Multi │  ║ 60fps Chroma  ║  │ 60fps  Wire  │          │
│                    │  └──────────────┘  ╚═══════════════╝  └──────────────┘          │
│  UNIFORMS          │                                                                 │
│  ┌──────────────┐  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ offset       │  │  │   DOF Bokeh  │  │  CRT Retro   │  │   (empty)    │          │
│  │ ──●──── 0.02 │  │  │              │  │              │  │              │          │
│  │              │  │  │    ╭───╮     │  │    ╭───╮     │  │              │          │
│  │ intensity    │  │  │   ╱ °°° ╲    │  │   ╱▐▌▐▌▐╲    │  │   + Add new  │          │
│  │ ────●── 0.75 │  │  │  │ °°°°° │   │  │  │▐▌▐▌▐▌│   │  │     shader   │          │
│  │              │  │  │   ╲ °°° ╱    │  │   ╲▐▌▐▌▐╱    │  │              │          │
│  │ color        │  │  │    ╰───╯     │  │    ╰───╯     │  │              │          │
│  │ [■ #FF6B9D] │  │  │              │  │              │  │              │          │
│  └──────────────┘  │  │ 52fps   DOF  │  │ 48fps   CRT  │  │              │          │
│                    │  └──────────────┘  └──────────────┘  └──────────────┘          │
│  CODE              │                                                                 │
│  ┌──────────────┐  │  [🔗 Sync Cameras]  [📋 Presets]  [📥 Import]  [💾 Export]     │
│  │ [Vert] [Frag]│  │                                                                 │
│  │──────────────│  │                                                                 │
│  │ void mainIma │  │  ┌────────────────────────────────────────────────────────┐     │
│  │ ge(const in  │  │  │  Single <Canvas> (fixed, full screen, pointer-events:  │     │
│  │ vec4 input.. │  │  │  none) with <View.Port /> rendering all 9 tiles via    │     │
│  │ [Copy] [Edit]│  │  │  gl.scissor — ONE WebGL context for the entire grid    │     │
│  └──────────────┘  │  └────────────────────────────────────────────────────────┘     │
├────────────────────┴─────────────────────────────────────────────────────────────────┤
│  [Tab: cycle tiles]  [Enter: focus prompt]  [Esc: deselect]  [Ctrl+Z: undo]         │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Code Editor Expanded View (after clicking [Edit] on a tile)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Three.js Shader Eval Suite  >  Tile 5: Chromatic Aberration  >  Code Editor        │
├──────────────────────────────────────────────┬───────────────────────────────────────┤
│  [Vertex Shader]  [Fragment Shader ●]        │                                       │
│──────────────────────────────────────────────│        Live Preview                   │
│  1 │ uniform float time;                     │                                       │
│  2 │ uniform vec2 resolution;                │        ┌─────────────────┐            │
│  3 │ uniform float offset;                   │        │                 │            │
│  4 │ uniform float intensity;                │        │    ╭───────╮    │            │
│  5 │                                         │        │   ╱ ◊ ◊ ◊ ◊╲   │            │
│  6 │ void mainImage(                         │        │  │ ◊ ◊ ◊ ◊ ◊│  │            │
│  7 │   const in vec4 inputColor,             │        │   ╲ ◊ ◊ ◊ ◊╱   │            │
│  8 │   const in vec2 uv,                     │        │    ╰───────╯    │            │
│  9 │   out vec4 outputColor                  │        │                 │            │
│ 10 │ ) {                                     │        └─────────────────┘            │
│ 11 │   vec2 dir = uv - 0.5;                  │                                       │
│ 12 │   float d = length(dir);                │        Uniforms                       │
│ 13 │   vec2 off = dir * d * offset;          │        ─────────                      │
│ 14 │   float r = texture(inputBuffer,        │        offset    ──●──── 0.02         │
│ 15 │     uv + off).r;                        │        intensity ────●── 0.75         │
│ 16 │   float g = inputColor.g;               │        color     [■ #FF6B9D]         │
│ 17 │   float b = texture(inputBuffer,        │                                       │
│ 18 │     uv - off).b;                        │        Status: ● Compiled OK          │
│ 19 │   outputColor = vec4(r, g, b,           │        Frame: 16.2ms (60 FPS)         │
│ 20 │     inputColor.a) * intensity;          │                                       │
│ 21 │ }                                       │        [Apply to Tile] [Revert]       │
│──────────────────────────────────────────────│───────────────────────────────────────│
│  [Copy]  [Auto-format]  [Ask Claude to Fix]  │  [← Back to Gallery]                 │
└──────────────────────────────────────────────┴───────────────────────────────────────┘
```

### Prompt Generation Flow (showing streaming + error recovery)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                      │
│  PROMPT FLOW                                                                         │
│                                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐                   │
│  │  User: "Create a holographic shader with rainbow fresnel       │                   │
│  │         and animated scanlines"                                 │                   │
│  └───────────────────────────┬────────────────────────────────────┘                   │
│                              │                                                        │
│                              ▼                                                        │
│  ┌────────────────────────────────────────────────────────────────┐                   │
│  │  ⏳ Generating...  (streaming JSON from Claude)                │                   │
│  │  {"type":"material","name":"Holographic Fres...               │                   │
│  └───────────────────────────┬────────────────────────────────────┘                   │
│                              │                                                        │
│                    ┌─────────┴─────────┐                                              │
│                    │  Parse JSON        │                                              │
│                    └────┬──────────┬────┘                                              │
│                   OK    │          │  FAIL                                             │
│                         │          │                                                   │
│                         │    ┌─────┴──────────────────────────┐                       │
│                         │    │ Re-prompt: "Invalid JSON. Fix." │ (up to 3x)           │
│                         │    └────────────────────────────────┘                       │
│                         ▼                                                              │
│              ┌────────────────────┐                                                    │
│              │  Static Analysis   │                                                    │
│              │  • Loop bounds     │                                                    │
│              │  • Source size      │                                                    │
│              │  • No while()      │                                                    │
│              └────┬──────────┬────┘                                                    │
│             PASS  │          │  FAIL                                                   │
│                   │    ┌─────┴───────────────────────────────┐                         │
│                   │    │ Re-prompt: "Loops exceed 128. Fix." │                         │
│                   │    └─────────────────────────────────────┘                         │
│                   ▼                                                                    │
│           ┌───────────────────┐                                                        │
│           │  WebGL Compile    │                                                        │
│           │  (temp shader obj)│                                                        │
│           └────┬─────────┬───┘                                                        │
│           OK   │         │ ERROR                                                       │
│                │   ┌─────┴──────────────────────────────────┐                         │
│                │   │ Show error + "Ask Claude to fix" button │                         │
│                │   │ Auto-retry with error message context   │                         │
│                │   └─────────────────────────────────────────┘                         │
│                ▼                                                                       │
│        ┌──────────────────┐                                                            │
│        │  ✅ Apply to Tile │                                                            │
│        │  Render + monitor │                                                            │
│        │  frame time       │                                                            │
│        └────┬─────────┬───┘                                                            │
│        OK   │         │ >100ms/frame                                                   │
│             │   ┌─────┴───────────────────────────┐                                   │
│             │   │ Kill shader, revert to fallback  │                                   │
│             │   │ "Shader too expensive for GPU"   │                                   │
│             │   └─────────────────────────────────┘                                   │
│             ▼                                                                          │
│     ┌─────────────────────┐                                                            │
│     │  ✨ SUCCESS          │                                                            │
│     │  Tile updated with   │                                                            │
│     │  new shader effect   │                                                            │
│     │                      │                                                            │
│     │  Log to eval store:  │                                                            │
│     │  • prompt text       │                                                            │
│     │  • GLSL generated    │                                                            │
│     │  • compile attempts  │                                                            │
│     │  • frame time        │                                                            │
│     │  • user rating       │                                                            │
│     └─────────────────────┘                                                            │
│                                                                                        │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

## Evaluation Framework (Applying Anthropic's "Demystifying Evals" Best Practices)

This project is itself an eval suite — evaluating both **how well Claude generates GLSL** and **how good the resulting visual effects are**. The framework below applies principles from [Anthropic's "Demystifying Evals for AI Agents"](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) to make this systematic rather than ad-hoc.

### Core Eval Vocabulary (Mapped to This Project)

| Anthropic Concept | Our Equivalent |
|-------------------|----------------|
| **Task** | A shader generation prompt (e.g., "Create a toon shader with 3-step lighting") |
| **Trial** | A single Claude API call + compilation attempt for that prompt |
| **Grader** | Scoring logic — compilation success, frame time, visual quality rating |
| **Transcript** | Full record: prompt → system prompt → Claude response → parse result → compile log → render screenshot |
| **Outcome** | The actual state: did the shader compile? Does it render correctly? Does it look good? (Distinct from Claude *claiming* the shader works) |

### Three Grader Types

**1. Code-Based Graders (Deterministic)**
- `compilation_pass`: Binary — does the GLSL compile via WebGL? (graded by `shaderValidator.ts`)
- `parse_pass`: Binary — is Claude's response valid JSON with the expected schema?
- `static_analysis_pass`: Binary — no loops >128, no while(), source <10KB
- `frame_time_ms`: Numeric — average frame render time (lower is better)
- `retry_count`: Numeric — how many attempts before success (0 = first try)
- `token_count`: Numeric — tokens used in Claude's response

**2. Model-Based Graders (LLM Judge)**
- `visual_quality`: 1-5 scale — "Does this shader achieve the intended visual effect described in the prompt?" (judge: Claude reviewing a screenshot)
- `code_quality`: 1-5 scale — "Is this GLSL idiomatic, efficient, and well-structured?" (judge: Claude reviewing the GLSL code)
- `prompt_fidelity`: 1-5 scale — "How closely does the output match the user's natural language description?" (judge: Claude comparing prompt to screenshot)

**3. Human Graders (User in the Gallery)**
- `user_rating`: 1-5 stars — manual rating assigned by the user per tile
- `user_favorite`: Boolean — did the user save/export this shader?
- `user_iteration_count`: Numeric — how many refinement prompts before satisfaction?

### Capability vs. Regression Eval Suites

**Capability Suite** — "What can Claude generate?"
Push the boundaries with increasingly difficult prompts:

```
src/evals/
├── capability/
│   ├── material-shaders/
│   │   ├── basic.json          # "Create a red phong shader" (easy)
│   │   ├── toon.json           # "Toon shader with 4-step lighting" (medium)
│   │   ├── holographic.json    # "Holographic with scanlines + fresnel" (hard)
│   │   ├── subsurface.json     # "Subsurface scattering for skin" (very hard)
│   │   └── pbr-custom.json     # "Custom PBR with anisotropic highlights" (expert)
│   ├── post-processing/
│   │   ├── bloom.json          # "Bloom with luminance threshold" (easy)
│   │   ├── dof.json            # "Depth-of-field with bokeh" (medium)
│   │   ├── ssao.json           # "Screen-space ambient occlusion" (hard)
│   │   └── volumetric-fog.json # "Raymarched volumetric fog" (expert)
│   └── combinations/
│       ├── cinematic.json      # Material + 3 post-FX chained (hard)
│       └── retro-game.json     # Toon + pixelation + CRT (hard)
```

**Regression Suite** — "Does Claude still generate shaders that used to work?"
Graduated from capability evals that reached high pass rates:

```
src/evals/
├── regression/
│   ├── basic-compilation.json      # 20 prompts that should always compile
│   ├── json-format.json            # 20 prompts — response must be valid JSON
│   └── standard-effects.json       # 15 known-good effects — must still work
```

### pass@k and pass^k Metrics

For each eval task, run **k=5 trials** (5 independent Claude calls with the same prompt):

- **pass@5**: "Did at least one of 5 attempts produce a working shader?"
  - Useful for measuring **what Claude can do** (capability ceiling)
  - A pass@5 of 90% means almost any prompt will eventually produce a working shader

- **pass^5**: "Did all 5 attempts produce a working shader?"
  - Useful for measuring **reliability** (can we trust first-try results?)
  - A pass^5 of 60% means the user gets a working shader on first try 60% of the time

```
┌─────────────────────────────────────────────────┐
│  Eval Dashboard (built into the app)            │
│                                                  │
│  Task: "Toon shader with rim lighting"           │
│  Trials: 5                                       │
│                                                  │
│  Trial 1: ✅ Compiled  │ 16ms │ Quality: 4/5    │
│  Trial 2: ✅ Compiled  │ 15ms │ Quality: 5/5    │
│  Trial 3: ❌ Compile error (missing semicolon)   │
│  Trial 4: ✅ Compiled  │ 18ms │ Quality: 3/5    │
│  Trial 5: ✅ Compiled  │ 16ms │ Quality: 4/5    │
│                                                  │
│  pass@5: 100% (at least one success)             │
│  pass^5:  80% (4/5 succeeded)                    │
│  pass@1:  80% (first-try success rate)           │
│  Avg quality: 4.0/5                              │
│  Avg frame time: 16.25ms                         │
└─────────────────────────────────────────────────┘
```

### Balanced Test Sets (Eval Principle: Test Both Directions)

Don't just test prompts that *should* produce effects. Also test:

- **Negative cases**: "Create a shader that does nothing" → should output passthrough
- **Ambiguous prompts**: "Make it look cool" → should still compile even if subjective
- **Adversarial prompts**: "Create a shader with while(true)" → static analysis should reject
- **Edge cases**: "Create a shader for WebGL 1 only" → should still produce valid GLSL ES 3.0
- **Over-specified**: "Create a bloom with threshold 0.5, knee 0.2, radius 8, intensity 1.5, using 6-tap Kawase blur" → should respect all params

### Transcript Logging ("Read the Transcripts")

Every shader generation attempt is logged for debugging:

```typescript
// src/lib/evalLogger.ts
interface EvalTranscript {
  id: string
  timestamp: number
  // Input
  userPrompt: string
  shaderType: 'material' | 'postprocessing'
  systemPrompt: string
  // Claude Response
  rawResponse: string
  parsedJSON: object | null
  parseError: string | null
  // Compilation
  glslVertex: string | null
  glslFragment: string
  compileSuccess: boolean
  compileError: string | null
  // Runtime
  frameTimeMs: number | null
  gpuHang: boolean
  // Grading
  retryCount: number
  tokensUsed: number
  userRating: number | null
  // Screenshot (data URL for visual comparison)
  screenshot: string | null
}
```

This maps directly to Anthropic's principle: **"Transcript review is a required expertise for agent development."** When shader generation fails, reviewing the full transcript reveals whether the failure is:
- A bad prompt (user's fault → improve prompt templates)
- Bad GLSL from Claude (model's fault → improve system prompt)
- A broken grader (our fault → fix the validator/compiler)
- A legitimate impossible task (task's fault → remove from eval suite)

### The "0% pass@100 = Broken Task" Principle

When an eval task shows 0% success across many trials, **investigate the task first, not the model**:

1. Does the prompt reference uniforms/features not in our interface contract?
2. Is the expected output format ambiguous?
3. Does the grader reject valid alternative solutions?
4. Is the task actually impossible in GLSL ES 3.0?

### Eval-Driven Development Workflow

```
1. User reports "Claude can't generate X"
   ↓
2. Create eval task in src/evals/capability/
   ↓
3. Run 5 trials → measure pass@5
   ↓
4. If pass@5 = 0%: likely broken task/prompt → fix prompt engineering
   If pass@5 > 0% but pass@1 low: model can do it but unreliably → improve system prompt
   If pass@5 high: "regression" material → add to regression suite
   ↓
5. Iterate on system prompts, validate against eval suite
   ↓
6. When capability eval saturates (>95%), promote to regression suite
```

### Implementation: Eval Store & Dashboard

Add to Phase 6 or as a parallel track:

- [ ] `src/store/evalStore.ts` — Zustand store for eval transcripts, metrics, suite definitions
- [ ] `src/lib/evalLogger.ts` — Log every generation attempt with full transcript
- [ ] `src/lib/evalRunner.ts` — Run a suite of tasks with k trials each, collect metrics
- [ ] `src/components/Eval/EvalDashboard.tsx` — View pass@k, pass^k, quality distributions, frame time distributions across the eval suite
- [ ] `src/components/Eval/TranscriptViewer.tsx` — Browse and search logged transcripts
- [ ] `src/evals/` — JSON task definitions organized by capability/regression and difficulty

### Swiss Cheese Model: Overlapping Quality Layers

Following Anthropic's recommendation, this tool provides multiple overlapping quality signals:

```
Layer 1: Automated Evals        → pass@k metrics, compilation rates, frame times
Layer 2: Visual Gallery          → Human side-by-side comparison (the primary UI)
Layer 3: Transcript Logging      → Debug why failures happen
Layer 4: User Ratings            → Subjective quality signal per tile
Layer 5: Code Viewer             → Manual code inspection
Layer 6: Performance Monitoring  → FPS overlay catches runtime issues
```

No single layer catches everything. The gallery (Layer 2) catches visual quality issues that automated evals miss. Automated evals (Layer 1) catch regressions across model updates that humans would miss. Transcripts (Layer 3) explain *why* things fail.

## Acceptance Criteria

### Functional Requirements

- [ ] Gallery renders 4-9 tiles simultaneously using a single WebGL context
- [ ] User can prompt Claude to generate a GLSL material shader and see it rendered on a tile
- [ ] User can prompt Claude to generate a post-processing effect and see it applied to a tile
- [ ] Shader compilation errors are displayed clearly with "auto-fix" re-prompt option
- [ ] User can switch between built-in test scenes (procedural, material spheres, GLTF model)
- [ ] User can upload custom GLTF files (drag-and-drop, max 50MB)
- [ ] User can view and edit generated GLSL code with syntax highlighting
- [ ] Uniform controls are auto-generated from shader code (sliders, color pickers)
- [ ] Camera sync toggle links orbit controls across all tiles
- [ ] Preset library offers 10+ curated effects with one-click apply
- [ ] Can import external .glsl/.frag files and Shadertoy-format shaders
- [ ] Gallery state persists across page refreshes (localStorage)
- [ ] JSON project export and import
- [ ] Undo/redo for shader changes (Ctrl+Z / Ctrl+Shift+Z)

### Non-Functional Requirements

- [ ] 9-tile grid runs at 30+ FPS on M1 MacBook Air with simple shaders
- [ ] Shader generation completes in < 10 seconds (Claude API response)
- [ ] No GPU hangs from generated shaders (runtime frame-time monitoring + kill switch)
- [ ] First-load experience shows working example tiles (not empty grid)
- [ ] App works in Chrome, Firefox, and Safari (WebGL 2)

### Eval Framework Requirements

- [ ] Every shader generation attempt is logged as a full transcript (prompt, response, compile result, frame time)
- [ ] Eval suite of 20+ tasks exists covering material shaders, post-FX, and combinations
- [ ] Can run k trials per task and compute pass@k and pass^k metrics
- [ ] Eval dashboard shows compilation rate, quality distribution, and per-task breakdown
- [ ] Regression suite catches system prompt changes that break previously-working generations
- [ ] Transcript viewer enables debugging failed generations (Anthropic's "read the transcripts" principle)

## Dependencies & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `<View>` + `<EffectComposer>` incompatibility | High | Test early in Phase 2; fallback to `RenderTexture` per tile if EffectComposer doesn't work inside View |
| LLM generates invalid GLSL frequently | Medium | Retry loop (3 attempts), structured output format, comprehensive system prompt |
| GPU hangs from expensive shaders | Medium | Frame-time monitoring, shader kill switch, static analysis of loop bounds |
| WebGL context loss on low-end hardware | Medium | Context loss/restore event handlers, recompile shaders from stored strings |
| 9 EffectComposers creating 9 sets of FBOs | Medium | Start with `resolutionScale={0.5}` for non-focused tiles; adaptive quality |
| Claude API key exposure in client-side SPA | Low | Acceptable for a dev/evaluation tool; document the risk; user provides own key |

## References & Research

### Framework Documentation
- [React Three Fiber Canvas API](https://docs.pmnd.rs/react-three-fiber/api/canvas)
- [drei View component](https://drei.docs.pmnd.rs/portals/view)
- [pmndrs/postprocessing Custom Effects](https://github.com/pmndrs/postprocessing/wiki/Custom-Effects)
- [drei shaderMaterial](https://drei.docs.pmnd.rs/shaders/shader-material)
- [three-custom-shader-material](https://github.com/FarazzShaikh/THREE-CustomShaderMaterial)

### Test Models
- [Khronos glTF Sample Assets](https://github.com/KhronosGroup/glTF-Sample-Assets)
- [Poly Haven (CC0 models/HDRIs)](https://polyhaven.com/models)

### GLSL Generation Research
- [14islands — AI-Generated GLSL Shaders](https://www.14islands.com/journal/ai-generated-glsl-shaders) — Claude is the most consistent model for GLSL generation
- [AI Co-Artist: LLM-Powered GLSL Evolution (arXiv:2512.08951)](https://arxiv.org/html/2512.08951v1) — Mutation prompts, retry patterns

### Security
- [ShadyShader: GPU crash vulnerability](https://www.imperva.com/blog/shadyshader-crashing-apple-m-series-with-single-click/) — Why loop bound checking matters
- [WebGL Bug Research (Truss Lab)](https://trusslab.github.io/sugar/webgl_bugs.html) — GPU hang, memory exhaustion vectors
