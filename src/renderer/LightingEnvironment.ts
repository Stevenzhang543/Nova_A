/** Lighting consumes the same host-owned policy and assets as the scene and graphics owners. */
import type { RendererEnvironment } from './RendererEnvironment'
import type { SceneRendererEnvironment } from './SceneRendererEnvironment'
import type { ShadowQuality } from './renderSettingsSchema'

export interface LightingEnvironment extends Pick<RendererEnvironment, 'settings' | 'postProcessing' | 'assets'> {
  renderQuality: { readonly shadowQuality: ShadowQuality }
  scene: SceneRendererEnvironment
}

let migrationEnvironment: LightingEnvironment | null = null

function validateEnvironment(environment: LightingEnvironment): void {
  if (!environment.settings || !environment.postProcessing || !environment.renderQuality
    || typeof environment.assets?.resolveTexture !== 'function' || !environment.scene) {
    throw new Error('LIGHTING_ENVIRONMENT_REQUIRED: lighting needs settings, post, quality, asset and scene owners')
  }
  if (environment.scene.settings !== environment.settings || environment.scene.assets !== environment.assets) {
    throw new Error('LIGHTING_ENVIRONMENT_MISMATCH: lighting and scene must share settings and asset owners')
  }
}

/** Temporary complete bridge for old authoring fixtures/callers. It imports no host itself.
 * Remove after all lighting/debug/post/filter callers pass an explicit environment and Runtime/
 * Player install their own complete owners. Production Editor already passes one explicit object.
 */
export function installMigrationLightingEnvironment(environment: LightingEnvironment): void {
  validateEnvironment(environment)
  migrationEnvironment = environment
}

export function resolveLightingEnvironment(environment?: LightingEnvironment): LightingEnvironment {
  const selected = environment ?? migrationEnvironment
  if (!selected) throw new Error('LIGHTING_ENVIRONMENT_REQUIRED: pass complete lighting services')
  validateEnvironment(selected)
  return selected
}
