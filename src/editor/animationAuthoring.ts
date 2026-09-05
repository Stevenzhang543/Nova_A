import { normalizeAnimationClip, normalizeAnimationMask, normalizeAnimatorController, type AnimationClipDocument, type AnimationMaskDocument, type AnimatorControllerDocument } from '../runtime/animation'
import { normalizeRig, normalizeSkin, type RigDocument, type SkinDocument } from '../runtime/rigging'
import { normalizeTimeline, type TimelineDocument } from '../runtime/timeline'

export type AnimationStudioAssetType = 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline'
export type AnimationStudioDocument = AnimationClipDocument | AnimatorControllerDocument | AnimationMaskDocument | RigDocument | SkinDocument | TimelineDocument
export interface AnimationDraftIssue { path: string; code: string; message: string }
export const animationStudioAssetTypes: readonly AnimationStudioAssetType[] = ['animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline']
export function isAnimationStudioAssetType(value: string): value is AnimationStudioAssetType { return animationStudioAssetTypes.includes(value as AnimationStudioAssetType) }

export function normalizeAnimationDocument(type: AnimationStudioAssetType, value: unknown): AnimationStudioDocument {
  if (type === 'animation') return normalizeAnimationClip(value)
  if (type === 'controller') return normalizeAnimatorController(value)
  if (type === 'animationMask') return normalizeAnimationMask(value)
  if (type === 'rig') return normalizeRig(value)
  if (type === 'skin') return normalizeSkin(value)
  return normalizeTimeline(value)
}

/** Report the raw field that normalization would discard or alter. Added defaults are safe.
 * Inputs are detached before normalization, so refusal never repairs or mutates the draft. */
export function inspectAnimationDraft(type: AnimationStudioAssetType, document: AnimationStudioDocument): { normalized: AnimationStudioDocument | null; issues: AnimationDraftIssue[] } {
  const issues: AnimationDraftIssue[] = [], seen = new WeakSet<object>()
  let visited = 0
  const inspect = (value: unknown, path: string): void => {
    if (++visited > 8_000_000) throw new Error('ANIMATION_DRAFT_BUDGET: Document exceeds the bounded validation budget.')
    if (typeof value === 'number' && !Number.isFinite(value)) issues.push({ path, code: 'ANIMATION_DRAFT_FINITE', message: 'A finite number is required.' })
    if (!value || typeof value !== 'object') return
    if (seen.has(value)) throw new Error('ANIMATION_DRAFT_CYCLE: Cyclic documents cannot be saved.')
    seen.add(value)
    for (const [key, entry] of Object.entries(value)) inspect(entry, Array.isArray(value) ? `${path}[${key}]` : `${path}.${key}`)
    seen.delete(value)
  }
  try {
    inspect(document, '$')
    if (issues.length) return { normalized: null, issues }
    const serialized = JSON.stringify(document)
    if (serialized.length > 16 * 1024 * 1024) throw new Error('ANIMATION_DRAFT_SIZE: Document exceeds 16 MiB.')
    const normalized = normalizeAnimationDocument(type, JSON.parse(serialized))
    const compare = (before: unknown, after: unknown, path: string): void => {
      if (before === undefined || Object.is(before, after)) return
      if (Array.isArray(before) && Array.isArray(after)) {
        if (before.length !== after.length) { issues.push({ path, code: 'ANIMATION_DRAFT_COUNT', message: `Saving would change the list from ${before.length} to ${after.length} entries.` }); return }
        before.forEach((value, index) => compare(value, after[index], `${path}[${index}]`)); return
      }
      if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
        for (const [key, value] of Object.entries(before)) compare(value, (after as Record<string, unknown>)[key], `${path}.${key}`)
        return
      }
      issues.push({ path, code: 'ANIMATION_DRAFT_VALUE', message: `Saving would replace ${JSON.stringify(before)} with ${JSON.stringify(after)}.` })
    }
    compare(document, normalized, '$')
    return { normalized, issues }
  } catch (error) {
    return { normalized: null, issues: [{ path: '$', code: 'ANIMATION_DRAFT_INVALID', message: error instanceof Error ? error.message : String(error) }] }
  }
}
/** Recovery uses a tagged envelope so invalid numeric drafts survive unmount exactly. */
export function encodeAnimationDraft(document: AnimationStudioDocument): string {
  return JSON.stringify({format:'nova-animation-draft',version:1,document}, (_key,value) => typeof value==='number'&&!Number.isFinite(value)?{__novaAnimationNumber:String(value)}:value)
}
export function decodeAnimationDraft(source: string): AnimationStudioDocument {
  const envelope=JSON.parse(source,(_key,value)=>value&&typeof value==='object'&&Object.keys(value).length===1&&typeof value.__novaAnimationNumber==='string'&&['NaN','Infinity','-Infinity'].includes(value.__novaAnimationNumber)?Number(value.__novaAnimationNumber):value)
  if(envelope?.format!=='nova-animation-draft'||envelope.version!==1||!envelope.document)throw new Error('ANIMATION_DRAFT_FORMAT: Unsupported recovery document.')
  return envelope.document as AnimationStudioDocument
}