import { reactive } from 'vue'
import type { ComponentKind } from '../world/components'
import { componentDescriptor } from '../world/componentRegistry'

export type ComponentPaletteCategory = 'Core' | '2D' | 'Physics' | 'Gameplay' | 'UI' | 'Audio' | 'Camera' | 'Navigation' | 'Script' | 'Packages'
export interface ComponentPaletteMetadata { category: ComponentPaletteCategory; compatibility: 'Stable' | 'Experimental' | 'Package'; required: ComponentKind[]; summary: string }
export interface ComponentPreset { id: string; name: string; kind: ComponentKind; values: Record<string, unknown>; createdAt: string }

const physics = new Set<ComponentKind>(['RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D', 'FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D', 'Rope2D', 'Area2D'])
const ui = new Set<ComponentKind>(['Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput'])
const audio = new Set<ComponentKind>(['AudioSource', 'AudioListener'])
const navigation = new Set<ComponentKind>(['NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D'])
const packages = new Set<ComponentKind>(['BehaviorTree2D', 'StateMachine2D'])
const gameplay = new Set<ComponentKind>(['CharacterBody2D', 'GridMover2D', 'PlatformController2D', 'TopDownController2D', 'Health2D', 'DamageHitbox2D', 'Collectible2D', 'Projectile2D', 'Spawner2D', 'Cooldown2D', 'Lifetime2D', 'MouseFollower2D', 'CameraFollow2D', 'ObjectPool2D'])

export function componentPaletteMetadata(kind: ComponentKind): ComponentPaletteMetadata {
  const category: ComponentPaletteCategory = kind === 'Transform2D' ? 'Core' : kind === 'Camera2D' ? 'Camera' : kind === 'Script2D' ? 'Script' : physics.has(kind) ? 'Physics' : gameplay.has(kind) ? 'Gameplay' : ui.has(kind) ? 'UI' : audio.has(kind) ? 'Audio' : navigation.has(kind) ? 'Navigation' : packages.has(kind) ? 'Packages' : '2D'
  const required: ComponentKind[] = kind.endsWith('Joint2D') || kind === 'CharacterBody2D' ? ['RigidBody2D'] : kind === 'AreaEffector2D' ? ['Area2D'] : kind !== 'RectTransform' && ui.has(kind) && kind !== 'Canvas' ? ['RectTransform'] : []
  return { category, compatibility: packages.has(kind) ? 'Package' : ['NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D'].includes(kind) ? 'Experimental' : 'Stable', required, summary: componentDescriptor(kind)?.summary ?? `${kind} component.` }
}

const STORAGE_KEY = 'nova-a-component-palette-v1'
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { favorites?: unknown; recent?: unknown; presets?: unknown }
    const clean = (source: unknown) => Array.isArray(source) ? source.filter((item): item is ComponentKind => typeof item === 'string').slice(0, 20) : []
    const presets = Array.isArray(value.presets) ? value.presets.flatMap((raw): ComponentPreset[] => {
      if (!raw || typeof raw !== 'object') return []
      const preset = raw as Partial<ComponentPreset>
      if (typeof preset.id !== 'string' || typeof preset.name !== 'string' || typeof preset.kind !== 'string' || !preset.values || typeof preset.values !== 'object') return []
      return [{ id: preset.id, name: preset.name.slice(0, 80), kind: preset.kind as ComponentKind, values: JSON.parse(JSON.stringify(preset.values)) as Record<string, unknown>, createdAt: typeof preset.createdAt === 'string' ? preset.createdAt : new Date(0).toISOString() }]
    }).slice(0, 64) : []
    return { favorites: clean(value.favorites), recent: clean(value.recent), presets }
  } catch { return { favorites: [] as ComponentKind[], recent: [] as ComponentKind[], presets: [] as ComponentPreset[] } }
}
export const componentPaletteState = reactive(load())
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(componentPaletteState)) } catch { /* optional user preference */ } }
export function toggleComponentFavorite(kind: ComponentKind) { const index = componentPaletteState.favorites.indexOf(kind); if (index >= 0) componentPaletteState.favorites.splice(index, 1); else componentPaletteState.favorites.unshift(kind); componentPaletteState.favorites.splice(20); persist() }
export function markComponentRecent(kind: ComponentKind) { const index = componentPaletteState.recent.indexOf(kind); if (index >= 0) componentPaletteState.recent.splice(index, 1); componentPaletteState.recent.unshift(kind); componentPaletteState.recent.splice(12); persist() }
export function saveComponentPreset(kind: ComponentKind, name: string, values: Record<string, unknown>): ComponentPreset {
  const preset: ComponentPreset = { id: crypto.randomUUID(), name: name.trim().slice(0, 80) || `${kind} preset`, kind, values: JSON.parse(JSON.stringify(values)) as Record<string, unknown>, createdAt: new Date().toISOString() }
  componentPaletteState.presets.unshift(preset); componentPaletteState.presets.splice(64); persist(); return preset
}
export function componentPresets(kind: ComponentKind): ComponentPreset[] { return componentPaletteState.presets.filter(preset => preset.kind === kind) }
export function removeComponentPreset(id: string): boolean { const index = componentPaletteState.presets.findIndex(preset => preset.id === id); if (index < 0) return false; componentPaletteState.presets.splice(index, 1); persist(); return true }
