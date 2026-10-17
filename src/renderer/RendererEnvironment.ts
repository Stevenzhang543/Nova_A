/** Renderer-owned inputs. Hosts inject assets and events; graphics code imports no editor/framework. */
import { DEFAULT_RENDERING_SETTINGS, normalizeRenderingSettings, type PostProcessValues, type RenderingSettings } from './renderSettingsSchema'
import type { TextureFilter, TextureRegion } from './types'
import type { GpuDiagnosticsBudget } from './GpuDiagnosticsBudget'

export interface RendererAssetSource {
  readonly generation: number
  readonly atlasPageCount: number
  resolveTexture(reference: string | null | undefined, filter?: TextureFilter): TextureRegion | null
  readMaterialSource(reference: string): string | null
}

export interface RendererEnvironment {
  settings: RenderingSettings
  postProcessing: PostProcessValues
  assets: RendererAssetSource
  rendererCreated?(backend: 'WebGL2' | 'Canvas2D', requestedPath: RenderingSettings['rendererPath']): void
  contextLost?(): void
  contextRestored?(): void
  /** Owner caches the current host policy; only finite candidates 1, 2 or 3 are valid. */
  submissionCreditLimit?(): number
  /** At most one notification per renderer instance; host rebuilds instead of treating failure as completion. */
  submissionFault?(reason: string): void
  /** Latched once per admitted frame. Unspecified preserves sampled every8/max4. */
  gpuDiagnosticsBudget?(): Readonly<GpuDiagnosticsBudget>
  /** Explicit diagnostic A/B or compatibility choice. Production defaults to sprite instancing.
   * The geometry control is removable after retained image/platform validation covers instancing;
   * complex/custom geometry still has one explicit production compatibility path. */
  spriteInstancing?: boolean
}

const migrationEnvironment: RendererEnvironment = {
  settings: normalizeRenderingSettings(DEFAULT_RENDERING_SETTINGS),
  postProcessing: { ...DEFAULT_RENDERING_SETTINGS.postProcessing },
  assets: { generation: 0, atlasPageCount: 0, resolveTexture: () => null, readMaterialSource: () => null }
}

/** Valid standalone defaults with no host imports; installed legacy values retain their existing sharing. */
export function defaultRendererEnvironment(): RendererEnvironment { return { ...migrationEnvironment } }

/** Temporary legacy-new-renderer bridge. Explicit production hosts inject a complete environment.
 * Remove this registry when all direct constructors/frozen compatibility fixtures pass explicit
 * environments, production Runtime/Player owners use tryBeginFrame exclusively, and the authoring
 * scene frontend has its own injected asset/particle/tile services.
 * The registry must never import its Editor providers or become a second RuntimeWorld owner.
 */
export function installMigrationRendererEnvironment(values: Partial<RendererEnvironment>): void { Object.assign(migrationEnvironment, values) }
