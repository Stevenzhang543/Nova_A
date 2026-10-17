/** Fixed Runtime HUD reads. This lease owns no media, locale, input collector, clock, World or Renderer. */
import { RuntimeProjectCatalog } from '../runtime/runtimeProjectCatalog'
import { RuntimeMediaBinding } from '../runtime/runtimeMediaBinding'
import { RuntimeLocalizationOwner } from '../runtime/runtimeLocalizationOwner'
import { InputPromptOwner } from '../runtime/inputPromptOwner'
import type { InputPromptClock } from '../runtime/inputPromptOwner'
import type { AssetRecord } from '../runtime/runtimeAssetRecordContracts'
import type { UiReadPorts, UiFontMetadata } from '../runtime/uiReadPorts'

export interface RuntimeUiGamepadRead { getGamepads(): ArrayLike<Gamepad | null> | null }
export interface RuntimeUiReadPortsOptions {
  readonly catalog: RuntimeProjectCatalog<AssetRecord>
  readonly mediaBinding: RuntimeMediaBinding
  readonly localization: RuntimeLocalizationOwner
  readonly inputPrompt: InputPromptOwner
  readonly clock: InputPromptClock
  readonly gamepads: RuntimeUiGamepadRead
  readonly signal?: AbortSignal
}
export interface RuntimeUiReadPorts extends UiReadPorts {
  readonly token: object
  readonly revision: number
  readonly isDisposed: boolean
  assertCurrent(): void
  /** Releases only this read lease and its Abort listener; upstream Owners remain caller-owned. */
  dispose(): void
}

// Only explicit reader leases claim prompt presentation; no default/global Owner or clock exists.
const promptClaims = new WeakMap<InputPromptOwner, { catalog: object; leases: number }>()

export function createRuntimeUiReadPorts(options: RuntimeUiReadPortsOptions): RuntimeUiReadPorts {
  if (!options) throw new Error('RUNTIME_UI_READ_PORTS_REQUIRED')
  const { catalog, mediaBinding, localization, inputPrompt, clock, gamepads, signal } = options
  if (!(catalog instanceof RuntimeProjectCatalog) || !(mediaBinding instanceof RuntimeMediaBinding) || !(localization instanceof RuntimeLocalizationOwner) || !(inputPrompt instanceof InputPromptOwner)) throw new Error('RUNTIME_UI_OWNERS_REQUIRED')
  if (!clock || typeof clock.nowMilliseconds !== 'function' || !gamepads || typeof gamepads.getGamepads !== 'function') throw new Error('RUNTIME_UI_PLATFORM_PORTS_REQUIRED')
  const revision = catalog.revision(), projectId = catalog.projectId, mediaToken = mediaBinding.token, promptToken = inputPrompt.token
  if (mediaBinding.catalog !== catalog || mediaBinding.clock !== clock || mediaBinding.revision !== revision || mediaBinding.media.catalog.identity !== catalog || localization.identity !== catalog || localization.projectId !== projectId || localization.catalogRevision !== revision) throw new Error('RUNTIME_UI_CATALOG_OWNER_MISMATCH')
  const oldClaim = promptClaims.get(inputPrompt)
  if (oldClaim && oldClaim.catalog !== catalog) throw new Error('RUNTIME_UI_PROMPT_CATALOG_MISMATCH')
  let closed = false, claimed = false, listening = false
  const token = Object.freeze({})
  const assertCurrent = () => {
    if (closed || signal?.aborted) throw new Error('RUNTIME_UI_READ_PORTS_CLOSED')
    if (catalog.projectId !== projectId || catalog.revision() !== revision || mediaBinding.catalog !== catalog || mediaBinding.token !== mediaToken || mediaBinding.revision !== revision || mediaBinding.media.catalog.identity !== catalog || localization.identity !== catalog || localization.projectId !== projectId || localization.catalogRevision !== revision || localization.catalog.identity !== catalog || localization.catalog.revision() !== revision || inputPrompt.token !== promptToken) throw new Error('RUNTIME_UI_READ_PORTS_STALE')
    mediaBinding.assertCurrent()
    if (mediaBinding.media.isDisposed || localization.isDisposed || inputPrompt.isDisposed) throw new Error('RUNTIME_UI_DEPENDENCY_DISPOSED')
  }
  const dispose = () => {
    if (closed) return
    closed = true
    if (listening) { signal?.removeEventListener('abort', dispose); listening = false }
    if (claimed) {
      const claim = promptClaims.get(inputPrompt)
      if (claim?.catalog === catalog && --claim.leases === 0) promptClaims.delete(inputPrompt)
      claimed = false
    }
  }
  // Bind capabilities before returning; no later lookup of a legacy/global provider.
  const resolveAsset = catalog.resolveAsset.bind(catalog), readText = catalog.readDependencyText.bind(catalog), resolveTexture = mediaBinding.resolveTexture.bind(mediaBinding), fontMetadata = mediaBinding.fontMetadata.bind(mediaBinding)
  const locale = localization.getPreviewLocale.bind(localization), direction = localization.activeTextDirection.bind(localization), fallbackFamilies = localization.activeFontFallbackFamilies.bind(localization), localize = localization.localize.bind(localization), localizeLabel = localization.localizeUiLabel.bind(localization)
  const setModality = inputPrompt.setInputModality.bind(inputPrompt), prompt = inputPrompt.inputPromptForAction.bind(inputPrompt), formatPrompt = inputPrompt.formatInputPrompt.bind(inputPrompt), now = clock.nowMilliseconds.bind(clock), pads = gamepads.getGamepads.bind(gamepads)
  // Immutable Catalog order is authoritative, including first matching authored family.
  const projectFonts = new Map<string, string>()
  const checked = <T>(read: () => T): T => { assertCurrent(); const value = read(); assertCurrent(); return value }
  const readyFont = (reference: string): UiFontMetadata => {
    const value = fontMetadata(reference)
    if (!value) throw new Error('RUNTIME_UI_FONT_NOT_READY: ' + reference)
    return value
  }
  const mapFamily = (family: string): string => {
    const reference = projectFonts.get(family)
    return reference ? readyFont(reference).family : family
  }
  try {
    assertCurrent()
    for (const record of catalog.listIdentities()) if (record.assetType === 'font' && record.fontFamily && !projectFonts.has(record.fontFamily)) projectFonts.set(record.fontFamily, record.uuid)
    assertCurrent()
    const claim = oldClaim ?? { catalog, leases: 0 }
    claim.leases++; promptClaims.set(inputPrompt, claim); claimed = true
    if (signal) { listening = true; signal.addEventListener('abort', dispose, { once: true }) }
    assertCurrent()
    return Object.freeze({
      identity: catalog, projectId, token, revision,
      get isDisposed() { return closed }, assertCurrent, dispose,
      resolveTexture: (reference) => checked(() => resolveTexture(reference)),
      fontMetadata: (reference) => checked(() => {
        const asset = resolveAsset(reference)
        if (asset?.assetType !== 'font') return null
        const value = readyFont(asset.uuid)
        return Object.freeze({ family: value.family, fallbackFamilies: Object.freeze(value.fallbackFamilies.map(mapFamily)), outlineWidth: value.outlineWidth })
      }),
      resolveAsset: (reference) => checked(() => resolveAsset(reference)),
      readTextAsset: (reference) => checked(() => readText(reference)),
      getPreviewLocale: () => checked(locale),
      activeTextDirection: (requested) => checked(() => direction(requested)),
      activeFontFallbackFamilies: (requested) => checked(() => Object.freeze(fallbackFamilies(requested).map(mapFamily))),
      localize: (key, variables, fallback, requested) => checked(() => localize(key, variables, fallback, requested)),
      localizeUiLabel: (value, requested) => checked(() => localizeLabel(value, requested)),
      setInputModality: (modality, gamepadId) => checked(() => setModality(modality, gamepadId)),
      inputPromptForAction: (action, actions) => checked(() => prompt(action, actions)),
      formatInputPrompt: (descriptor, style) => checked(() => formatPrompt(descriptor, style)),
      nowMilliseconds: () => checked(now),
      getGamepads: () => checked(pads)
    } satisfies RuntimeUiReadPorts)
  } catch (error) { dispose(); throw error }
}
