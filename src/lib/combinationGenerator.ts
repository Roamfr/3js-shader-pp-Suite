import { PRESETS, type PresetDefinition } from '../data/presets/index'

export interface EffectCombination {
  id: string
  label: string
  category: 'baseline' | 'postfx' | 'material' | 'combo'
  material: PresetDefinition | null
  postEffect: PresetDefinition | null
}

export function generateAllCombinations(): EffectCombination[] {
  const materials = PRESETS.filter((p) => p.category === 'material')
  const postEffects = PRESETS.filter((p) => p.category === 'postprocessing')
  const combos: EffectCombination[] = []

  // 1. Baseline — no effects
  combos.push({
    id: 'baseline',
    label: 'Baseline (no effects)',
    category: 'baseline',
    material: null,
    postEffect: null,
  })

  // 2. Post-FX only (6)
  for (const fx of postEffects) {
    combos.push({
      id: `postfx-${fx.id}`,
      label: fx.name,
      category: 'postfx',
      material: null,
      postEffect: fx,
    })
  }

  // 3. Material only (6)
  for (const mat of materials) {
    combos.push({
      id: `mat-${mat.id}`,
      label: mat.name,
      category: 'material',
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
        category: 'combo',
        material: mat,
        postEffect: fx,
      })
    }
  }

  return combos
}
