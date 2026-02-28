import type { ShaderConfig, PostEffectConfig, UniformConfig } from '../../types/shader'

export type PresetCategory = 'material' | 'postprocessing'

export interface PresetDefinition {
  id: string
  name: string
  category: PresetCategory
  description: string
  shader: ShaderConfig | PostEffectConfig
}

// ============================================================
// Helper to build uniform configs
// ============================================================
function f(value: number, min: number, max: number, step: number = 0.01): UniformConfig {
  return { type: 'float', value, min, max, step }
}

function v3(value: [number, number, number], min = 0, max = 1, step = 0.01): UniformConfig {
  return { type: 'vec3', value, min, max, step }
}

// ============================================================
// Default vertex shader for material presets
// ============================================================
const VERT = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vWorldNormal;

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`.trim()

// ============================================================
// MATERIAL PRESETS (6)
// ============================================================

const toon: PresetDefinition = {
  id: 'toon',
  name: 'Toon',
  category: 'material',
  description: 'Cel-shaded cartoon look with quantized lighting',
  shader: {
    type: 'material',
    name: 'Toon',
    vertexShader: VERT,
    fragmentShader: `
uniform float levels; // min:2 max:8 step:1
uniform vec3 baseColor; // min:0 max:1 step:0.01
uniform float edgeThreshold; // min:0 max:1 step:0.01
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 base = hasBaseMap ? texture2D(baseMap, vUv).rgb : baseColor;

  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float NdotL = dot(vNormal, lightDir);
  float intensity = floor(NdotL * levels) / levels;
  intensity = max(intensity, 0.35);

  // Edge detection via view angle
  vec3 viewDir = normalize(-vPosition);
  float edge = dot(vNormal, viewDir);
  float outline = smoothstep(edgeThreshold, edgeThreshold + 0.05, edge);

  vec3 color = base * intensity * outline;
  gl_FragColor = vec4(color, 1.0);
}
`.trim(),
    uniforms: {
      levels: { type: 'float', value: 4, min: 2, max: 8, step: 1 },
      baseColor: v3([0.4, 0.6, 1.0]),
      edgeThreshold: f(0.2, 0, 1),
    },
  },
}

const holographic: PresetDefinition = {
  id: 'holographic',
  name: 'Holographic',
  category: 'material',
  description: 'Iridescent holographic effect with scan lines',
  shader: {
    type: 'material',
    name: 'Holographic',
    vertexShader: VERT,
    fragmentShader: `
uniform float time;
uniform float scanSpeed; // min:0.5 max:5.0 step:0.1
uniform float fresnelPower; // min:0.5 max:5.0 step:0.1
uniform float scanDensity; // min:10.0 max:200.0 step:1.0
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), fresnelPower);

  // Rainbow based on normal + time
  float hue = fract(dot(vNormal, vec3(0.3, 0.6, 0.1)) + time * 0.2);
  vec3 rainbow = 0.5 + 0.5 * cos(6.28318 * (hue + vec3(0.0, 0.33, 0.67)));

  // Scanlines
  float scan = sin(vUv.y * scanDensity + time * scanSpeed) * 0.5 + 0.5;
  scan = smoothstep(0.3, 0.7, scan);

  // Blend holographic effect over original texture
  vec3 texColor = hasBaseMap ? texture2D(baseMap, vUv).rgb : vec3(0.5);
  vec3 holoColor = rainbow * (fresnel * 0.7 + 0.3) * (0.8 + 0.2 * scan);
  vec3 color = mix(texColor, holoColor, fresnel * 0.8 + 0.2);
  float alpha = fresnel * 0.6 + 0.4;

  gl_FragColor = vec4(color, alpha);
}
`.trim(),
    uniforms: {
      scanSpeed: f(2.0, 0.5, 5.0, 0.1),
      fresnelPower: f(2.0, 0.5, 5.0, 0.1),
      scanDensity: f(80.0, 10.0, 200.0, 1.0),
    },
    transparent: true,
  },
}

const wireframeGlow: PresetDefinition = {
  id: 'wireframe-glow',
  name: 'Wireframe Glow',
  category: 'material',
  description: 'Glowing wireframe with soft edges',
  shader: {
    type: 'material',
    name: 'Wireframe Glow',
    vertexShader: VERT,
    fragmentShader: `
uniform float time;
uniform vec3 glowColor; // min:0 max:1 step:0.01
uniform float thickness; // min:0.01 max:0.15 step:0.01
uniform float pulse; // min:0.0 max:1.0 step:0.01
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  // Create grid pattern from UVs
  vec2 grid = abs(fract(vUv * 10.0) - 0.5);
  float line = min(grid.x, grid.y);
  float wire = 1.0 - smoothstep(0.0, thickness, line);

  // Fresnel glow
  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);

  // Pulse animation
  float p = 1.0 + pulse * sin(time * 3.0) * 0.3;

  // Show texture through the wireframe gaps
  vec3 texColor = hasBaseMap ? texture2D(baseMap, vUv).rgb : vec3(0.0);
  vec3 wireColor = glowColor * (wire + fresnel * 0.5) * p;
  vec3 color = mix(texColor * 0.3, wireColor, max(wire, fresnel * 0.5));
  float alpha = max(wire, max(fresnel * 0.3, hasBaseMap ? 0.3 : 0.0));

  gl_FragColor = vec4(color, alpha);
}
`.trim(),
    uniforms: {
      glowColor: v3([0.0, 1.0, 0.5]),
      thickness: f(0.05, 0.01, 0.15),
      pulse: f(0.5, 0.0, 1.0),
    },
    transparent: true,
  },
}

const noiseDisplacement: PresetDefinition = {
  id: 'noise-displacement',
  name: 'Noise Displacement',
  category: 'material',
  description: 'Animated noise-driven color from normals',
  shader: {
    type: 'material',
    name: 'Noise Displacement',
    vertexShader: VERT,
    fragmentShader: `
uniform float time;
uniform float noiseScale; // min:1.0 max:20.0 step:0.5
uniform float speed; // min:0.1 max:3.0 step:0.1
uniform float colorMix; // min:0.0 max:1.0 step:0.01
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

// Simple noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  float t = time * speed;
  vec2 uv = vUv * noiseScale;

  float n1 = noise(uv + t);
  float n2 = noise(uv * 1.5 - t * 0.7);
  float n = mix(n1, n2, 0.5);

  // Use texture or normal-based coloring as base
  vec3 baseColor = hasBaseMap ? texture2D(baseMap, vUv).rgb : (vNormal * 0.5 + 0.5);
  // Noise-based coloring
  vec3 noiseColor = vec3(n, noise(uv + 5.0 + t * 0.3), noise(uv + 10.0 - t * 0.5));

  vec3 color = mix(baseColor, noiseColor, colorMix);
  gl_FragColor = vec4(color, 1.0);
}
`.trim(),
    uniforms: {
      noiseScale: f(5.0, 1.0, 20.0, 0.5),
      speed: f(1.0, 0.1, 3.0, 0.1),
      colorMix: f(0.5, 0.0, 1.0),
    },
  },
}

const iridescent: PresetDefinition = {
  id: 'iridescent',
  name: 'Iridescent',
  category: 'material',
  description: 'Soap-bubble iridescence from view angle',
  shader: {
    type: 'material',
    name: 'Iridescent',
    vertexShader: VERT,
    fragmentShader: `
uniform float time;
uniform float filmThickness; // min:0.1 max:3.0 step:0.01
uniform float saturation; // min:0.0 max:2.0 step:0.01
uniform vec3 baseColor; // min:0 max:1 step:0.01
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
  vec3 base = hasBaseMap ? texture2D(baseMap, vUv).rgb : baseColor;

  vec3 viewDir = normalize(-vPosition);
  float cosTheta = abs(dot(vNormal, viewDir));

  // Thin-film interference approximation
  float phase = cosTheta * filmThickness * 6.28318;
  vec3 film = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.189) + time * 0.5);

  // Mix base color with iridescence
  float fresnel = pow(1.0 - cosTheta, 3.0);
  vec3 color = mix(base, film, fresnel);

  // Apply saturation
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, saturation);

  gl_FragColor = vec4(color, 1.0);
}
`.trim(),
    uniforms: {
      filmThickness: f(1.5, 0.1, 3.0),
      saturation: f(1.5, 0.0, 2.0),
      baseColor: v3([0.1, 0.1, 0.15]),
    },
  },
}

const dissolve: PresetDefinition = {
  id: 'dissolve',
  name: 'Dissolve',
  category: 'material',
  description: 'Noise-based dissolve with glowing edge',
  shader: {
    type: 'material',
    name: 'Dissolve',
    vertexShader: VERT,
    fragmentShader: `
uniform float time;
uniform float progress; // min:0.0 max:1.0 step:0.01
uniform float edgeWidth; // min:0.01 max:0.2 step:0.01
uniform vec3 edgeColor; // min:0 max:1 step:0.01
uniform vec3 baseColor; // min:0 max:1 step:0.01
uniform sampler2D baseMap;
uniform bool hasBaseMap;

varying vec3 vNormal;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  vec3 base = hasBaseMap ? texture2D(baseMap, vUv).rgb : baseColor;

  float n = noise(vUv * 8.0 + time * 0.3);
  n = n * 0.5 + noise(vUv * 16.0) * 0.3 + noise(vUv * 32.0) * 0.2;

  float threshold = progress;
  if (n < threshold) discard;

  // Glowing edge
  float edge = 1.0 - smoothstep(0.0, edgeWidth, n - threshold);

  // Simple diffuse lighting
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(vNormal, lightDir), 0.15);

  vec3 color = mix(base * diff, edgeColor * 2.0, edge);
  gl_FragColor = vec4(color, 1.0);
}
`.trim(),
    uniforms: {
      progress: f(0.3, 0.0, 1.0),
      edgeWidth: f(0.05, 0.01, 0.2),
      edgeColor: v3([1.0, 0.3, 0.0]),
      baseColor: v3([0.8, 0.8, 0.85]),
    },
  },
}

// ============================================================
// POST-PROCESSING PRESETS (6)
// ============================================================

const filmGrain: PresetDefinition = {
  id: 'film-grain',
  name: 'Film Grain + Vignette',
  category: 'postprocessing',
  description: 'Analog film grain noise with vignette darkening',
  shader: {
    type: 'postprocessing',
    name: 'Film Grain + Vignette',
    fragmentShader: `
uniform float time;
uniform float grainAmount; // min:0.0 max:0.3 step:0.01
uniform float vignetteStrength; // min:0.0 max:2.0 step:0.01
uniform float vignetteRadius; // min:0.1 max:1.5 step:0.01

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Film grain
  float grain = fract(sin(dot(uv + fract(time), vec2(12.9898, 78.233))) * 43758.5453);
  grain = (grain - 0.5) * grainAmount;
  color += grain;

  // Vignette
  vec2 center = uv - 0.5;
  float dist = length(center);
  float vignette = 1.0 - smoothstep(vignetteRadius * 0.5, vignetteRadius, dist) * vignetteStrength;
  color *= vignette;

  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`.trim(),
    uniforms: {
      grainAmount: f(0.08, 0.0, 0.3),
      vignetteStrength: f(1.0, 0.0, 2.0),
      vignetteRadius: f(0.8, 0.1, 1.5),
    },
  },
}

const chromaticAberration: PresetDefinition = {
  id: 'chromatic-aberration',
  name: 'Chromatic Aberration',
  category: 'postprocessing',
  description: 'RGB channel offset for lens distortion look',
  shader: {
    type: 'postprocessing',
    name: 'Chromatic Aberration',
    fragmentShader: `
uniform float amount; // min:0.0 max:0.05 step:0.001
uniform float angle; // min:0.0 max:6.28 step:0.01

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 offset = amount * vec2(cos(angle), sin(angle));

  float r = texture2D(inputBuffer, uv + offset).r;
  float g = texture2D(inputBuffer, uv).g;
  float b = texture2D(inputBuffer, uv - offset).b;

  outputColor = vec4(r, g, b, inputColor.a);
}
`.trim(),
    uniforms: {
      amount: f(0.01, 0.0, 0.05, 0.001),
      angle: f(0.0, 0.0, 6.28),
    },
  },
}

const crtRetro: PresetDefinition = {
  id: 'crt-retro',
  name: 'CRT / Retro',
  category: 'postprocessing',
  description: 'Scanlines, curvature, and RGB subpixels',
  shader: {
    type: 'postprocessing',
    name: 'CRT / Retro',
    fragmentShader: `
uniform float time;
uniform float scanlineIntensity; // min:0.0 max:1.0 step:0.01
uniform float curvature; // min:0.0 max:0.5 step:0.01
uniform float rgbOffset; // min:0.0 max:3.0 step:0.1
uniform float screenRes; // min:100.0 max:1000.0 step:10.0

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = dot(centered, centered);
  vec2 curved = uv + centered * dist * curvature;

  // Out of bounds check
  if (curved.x < 0.0 || curved.x > 1.0 || curved.y < 0.0 || curved.y > 1.0) {
    outputColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec3 color = texture2D(inputBuffer, curved).rgb;

  // Scanlines
  float scanline = sin(curved.y * screenRes * 3.14159) * 0.5 + 0.5;
  scanline = pow(scanline, 1.5) * scanlineIntensity;
  color *= 1.0 - scanline * 0.3;

  // RGB subpixel simulation
  float px = curved.x * screenRes;
  float subpixel = mod(px, 3.0);
  if (subpixel < 1.0) color.gb *= 1.0 - rgbOffset * 0.1;
  else if (subpixel < 2.0) color.rb *= 1.0 - rgbOffset * 0.1;
  else color.rg *= 1.0 - rgbOffset * 0.1;

  // Slight flicker
  color *= 0.98 + 0.02 * sin(time * 8.0);

  outputColor = vec4(color, 1.0);
}
`.trim(),
    uniforms: {
      scanlineIntensity: f(0.5, 0.0, 1.0),
      curvature: f(0.1, 0.0, 0.5),
      rgbOffset: f(1.0, 0.0, 3.0, 0.1),
      screenRes: { type: 'float', value: 400, min: 100, max: 1000, step: 10 },
    },
  },
}

const pixelate: PresetDefinition = {
  id: 'pixelate',
  name: 'Pixelate',
  category: 'postprocessing',
  description: 'Retro pixelation with adjustable block size',
  shader: {
    type: 'postprocessing',
    name: 'Pixelate',
    fragmentShader: `
uniform float pixelSize; // min:2.0 max:32.0 step:1.0
uniform float screenRes; // min:100.0 max:1000.0 step:10.0

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  float cellSize = pixelSize / screenRes;
  vec2 pixelUv = floor(uv / cellSize) * cellSize + cellSize * 0.5;
  outputColor = texture2D(inputBuffer, pixelUv);
}
`.trim(),
    uniforms: {
      pixelSize: { type: 'float', value: 8, min: 2, max: 32, step: 1 },
      screenRes: { type: 'float', value: 512, min: 100, max: 1000, step: 10 },
    },
  },
}

const warmColorGrading: PresetDefinition = {
  id: 'warm-color-grading',
  name: 'Warm Color Grading',
  category: 'postprocessing',
  description: 'Warm sunset tones with contrast and saturation',
  shader: {
    type: 'postprocessing',
    name: 'Warm Color Grading',
    fragmentShader: `
uniform float temperature; // min:-1.0 max:1.0 step:0.01
uniform float contrast; // min:0.5 max:2.0 step:0.01
uniform float saturation; // min:0.0 max:2.0 step:0.01
uniform float brightness; // min:-0.5 max:0.5 step:0.01

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 color = inputColor.rgb;

  // Brightness
  color += brightness;

  // Contrast (around mid-gray)
  color = (color - 0.5) * contrast + 0.5;

  // Temperature shift
  color.r += temperature * 0.1;
  color.b -= temperature * 0.1;

  // Saturation
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(luma), color, saturation);

  outputColor = vec4(clamp(color, 0.0, 1.0), inputColor.a);
}
`.trim(),
    uniforms: {
      temperature: f(0.3, -1.0, 1.0),
      contrast: f(1.2, 0.5, 2.0),
      saturation: f(1.3, 0.0, 2.0),
      brightness: f(0.0, -0.5, 0.5),
    },
  },
}

const sobelEdge: PresetDefinition = {
  id: 'sobel-edge',
  name: 'Sobel Edge Detection',
  category: 'postprocessing',
  description: 'Edge detection with adjustable threshold and color',
  shader: {
    type: 'postprocessing',
    name: 'Sobel Edge Detection',
    fragmentShader: `
uniform float screenRes; // min:100.0 max:1000.0 step:10.0
uniform float threshold; // min:0.0 max:1.0 step:0.01
uniform float mixAmount; // min:0.0 max:1.0 step:0.01
uniform vec3 edgeColor; // min:0 max:1 step:0.01

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 texel = vec2(1.0) / vec2(screenRes);

  // Sample 3x3 neighborhood (luminance)
  float tl = dot(texture2D(inputBuffer, uv + vec2(-texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float t  = dot(texture2D(inputBuffer, uv + vec2(0.0, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float tr = dot(texture2D(inputBuffer, uv + vec2(texel.x, texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float l  = dot(texture2D(inputBuffer, uv + vec2(-texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float r  = dot(texture2D(inputBuffer, uv + vec2(texel.x, 0.0)).rgb, vec3(0.299, 0.587, 0.114));
  float bl = dot(texture2D(inputBuffer, uv + vec2(-texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float b  = dot(texture2D(inputBuffer, uv + vec2(0.0, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));
  float br = dot(texture2D(inputBuffer, uv + vec2(texel.x, -texel.y)).rgb, vec3(0.299, 0.587, 0.114));

  // Sobel operators
  float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
  float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
  float edge = sqrt(gx*gx + gy*gy);

  edge = smoothstep(threshold, threshold + 0.1, edge);

  vec3 original = inputColor.rgb;
  vec3 result = mix(original, edgeColor * edge + original * (1.0 - edge), mixAmount);

  outputColor = vec4(result, inputColor.a);
}
`.trim(),
    uniforms: {
      screenRes: { type: 'float', value: 512, min: 100, max: 1000, step: 10 },
      threshold: f(0.1, 0.0, 1.0),
      mixAmount: f(0.8, 0.0, 1.0),
      edgeColor: v3([1.0, 1.0, 1.0]),
    },
  },
}

// ============================================================
// Export all presets
// ============================================================
export const PRESETS: PresetDefinition[] = [
  // Materials
  toon,
  holographic,
  wireframeGlow,
  noiseDisplacement,
  iridescent,
  dissolve,
  // Post-FX
  filmGrain,
  chromaticAberration,
  crtRetro,
  pixelate,
  warmColorGrading,
  sobelEdge,
]

export function getPresetById(id: string): PresetDefinition | undefined {
  return PRESETS.find((p) => p.id === id)
}

export function getPresetsByCategory(category: PresetCategory): PresetDefinition[] {
  return PRESETS.filter((p) => p.category === category)
}
