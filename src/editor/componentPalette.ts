import { reactive } from 'vue'
import type { ComponentKind } from '../world/components'

export type ComponentPaletteCategory = 'Core' | '2D' | 'Physics' | 'UI' | 'Audio' | 'Camera' | 'Navigation' | 'Script' | 'Packages'
export interface ComponentPaletteMetadata { category: ComponentPaletteCategory; compatibility: 'Stable' | 'Experimental' | 'Package'; required: ComponentKind[] }

const physics = new Set<ComponentKind>(['RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D', 'FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D', 'Rope2D', 'Area2D'])
const ui = new Set<ComponentKind>(['Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput'])
const audio = new Set<ComponentKind>(['AudioSource', 'AudioListener'])
const navigation = new Set<ComponentKind>(['NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D'])
const packages = new Set<ComponentKind>(['BehaviorTree2D', 'StateMachine2D'])

export function componentPaletteMetadata(kind: ComponentKind): ComponentPaletteMetadata {
  const category: ComponentPaletteCategory = kind === 'Transform2D' ? 'Core' : kind === 'Camera2D' ? 'Camera' : kind === 'Script2D' ? 'Script' : physics.has(kind) ? 'Physics' : ui.has(kind) ? 'UI' : audio.has(kind) ? 'Audio' : navigation.has(kind) ? 'Navigation' : packages.has(kind) ? 'Packages' : '2D'
  const required: ComponentKind[] = kind.endsWith('Joint2D') || kind === 'CharacterBody2D' ? ['RigidBody2D'] : kind === 'AreaEffector2D' ? ['Area2D'] : kind !== 'RectTransform' && ui.has(kind) && kind !== 'Canvas' ? ['RectTransform'] : []
  return { category, compatibility: packages.has(kind) ? 'Package' : ['NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D'].includes(kind) ? 'Experimental' : 'Stable', required }
}

const STORAGE_KEY = 'nova-a-component-palette-v1'
function load() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as { favorites?: unknown; recent?: unknown }
    const clean = (source: unknown) => Array.isArray(source) ? source.filter((item): item is ComponentKind => typeof item === 'string').slice(0, 20) : []
    return { favorites: clean(value.favorites), recent: clean(value.recent) }
  } catch { return { favorites: [] as ComponentKind[], recent: [] as ComponentKind[] } }
}
export const componentPaletteState = reactive(load())
function persist() { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(componentPaletteState)) } catch { /* optional user preference */ } }
export function toggleComponentFavorite(kind: ComponentKind) { const index = componentPaletteState.favorites.indexOf(kind); if (index >= 0) componentPaletteState.favorites.splice(index, 1); else componentPaletteState.favorites.unshift(kind); componentPaletteState.favorites.splice(20); persist() }
export function markComponentRecent(kind: ComponentKind) { const index = componentPaletteState.recent.indexOf(kind); if (index >= 0) componentPaletteState.recent.splice(index, 1); componentPaletteState.recent.unshift(kind); componentPaletteState.recent.splice(12); persist() }
