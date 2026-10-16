/** Scene frontend services. Hosts retain the unique asset, tile, particle and rig owners. */
import { defaultRendererEnvironment, type RendererAssetSource } from './RendererEnvironment'
import type { RenderingSettings } from './renderSettingsSchema'
import type { Renderer2D, SpriteRenderCommand, TileChunkRenderCommand } from './types'
import type { Entity } from '../world/Entity'
import type { SpriteRenderer2D, TileMap2D } from '../world/components'
import type { Vec2 } from '../world/types'

export interface SceneRendererEnvironment {
  settings: RenderingSettings
  assets: RendererAssetSource
  assetKind(reference: string | null | undefined): string | null
  fontMetadata(reference: string | null | undefined): { family: string; fallbackFamilies: readonly string[]; outlineWidth: number } | null
  publishPostProcess(position: { x: number; y: number }): void
  publishRenderQuality(position: { x: number; y: number }): void
  tileChunkCommands(entity: Entity, component: TileMap2D, entities: Entity[],
    visibleBounds?: { minX: number; minY: number; maxX: number; maxY: number }, cameraPosition?: Vec2): TileChunkRenderCommand[]
  /** Third argument is the unfiltered source of this renderWorld call, never its visible subset. */
  submitParticles(renderer: Renderer2D, entities: Entity[], sourceEntities?: Entity[]): void
  deformSkin(entity: Entity, sprite: SpriteRenderer2D): NonNullable<SpriteRenderCommand['mesh']> | null
}

let migrationEnvironment: SceneRendererEnvironment | null = null

function validateEnvironment(environment: SceneRendererEnvironment): void {
  if (!environment.settings || !environment.assets) throw new Error('SCENE_ENVIRONMENT_REQUIRED: settings and asset owner are required')
  for (const name of ['assetKind', 'fontMetadata', 'publishPostProcess', 'publishRenderQuality', 'tileChunkCommands', 'submitParticles', 'deformSkin'] as const) {
    if (typeof environment[name] !== 'function') throw new Error(`SCENE_ENVIRONMENT_REQUIRED: missing ${name} owner`)
  }
}

/** Temporary complete legacy bridge; it never imports or creates its service owners.
 * Remove after every production renderWorld host passes the fourth argument and camera/lighting/
 * timeline policy queries inject their settings. Runtime/Player must not depend on Editor install.
 */
export function installMigrationSceneRendererEnvironment(environment: SceneRendererEnvironment): void {
  validateEnvironment(environment)
  migrationEnvironment = environment
}

export function resolveSceneRendererEnvironment(environment?: SceneRendererEnvironment): SceneRendererEnvironment {
  const selected = environment ?? migrationEnvironment
  if (!selected) throw new Error('SCENE_ENVIRONMENT_REQUIRED: renderWorld requires complete injected scene services')
  validateEnvironment(selected)
  return selected
}

/** Camera-only compatibility queries need settings, never substitute empty draw services. */
export function sceneRenderingSettings(environment?: SceneRendererEnvironment): RenderingSettings {
  return environment?.settings ?? migrationEnvironment?.settings ?? defaultRendererEnvironment().settings
}
