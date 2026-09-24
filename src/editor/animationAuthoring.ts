/** 动画草稿编辑：规范化动画文档、检查轨道数据并编码或解码可保存草稿。 */
import { normalizeAnimationClip, normalizeAnimationMask, normalizeAnimatorController, type AnimationClipDocument, type AnimationMaskDocument, type AnimatorControllerDocument } from '../runtime/animation'
import { normalizeRig, normalizeSkin, type RigDocument, type SkinDocument } from '../runtime/rigging'
import { normalizeTimeline, type TimelineDocument } from '../runtime/timeline'

export type AnimationStudioAssetType = 'animation' | 'controller' | 'animationMask' | 'rig' | 'skin' | 'timeline'
export type AnimationStudioDocument = AnimationClipDocument | AnimatorControllerDocument | AnimationMaskDocument | RigDocument | SkinDocument | TimelineDocument
export interface AnimationDraftIssue { path: string; code: string; message: string }
export const animationStudioAssetTypes: readonly AnimationStudioAssetType[] = ['animation', 'controller', 'animationMask', 'rig', 'skin', 'timeline']
/* 调用 animationStudioAssetTypes.includes(value as AnimationStudioAssetType) 并返回调用结果。 */ export function isAnimationStudioAssetType(value: string): value is AnimationStudioAssetType { return animationStudioAssetTypes.includes(value as AnimationStudioAssetType) }

/** 按动画资源类型分派规范化器，时间线作为其余类型的处理分支。 */ export function normalizeAnimationDocument(type: AnimationStudioAssetType, value: unknown): AnimationStudioDocument {
  if (type === 'animation') return normalizeAnimationClip(value)
  if (type === 'controller') return normalizeAnimatorController(value)
  if (type === 'animationMask') return normalizeAnimationMask(value)
  if (type === 'rig') return normalizeRig(value)
  if (type === 'skin') return normalizeSkin(value)
  return normalizeTimeline(value)
}

/** Report the raw field that normalization would discard or alter. Added defaults are safe.
 * Inputs are detached before normalization, so refusal never repairs or mutates the draft. */
/** 先检查循环、非有限数字及容量，再比较规范化前后每个原有字段，拒绝保存会静默改变用户数据的草稿。 */ export function inspectAnimationDraft(type: AnimationStudioAssetType, document: AnimationStudioDocument): { normalized: AnimationStudioDocument | null; issues: AnimationDraftIssue[] } {
  const issues: AnimationDraftIssue[] = [], seen = new WeakSet<object>()
  let visited = 0
  const inspect = /** 递归检查数据并记录非有限数字路径，使用当前递归链检测循环并限制访问预算。 */ (value: unknown, path: string): void => {
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
    const compare = /** 递归比较原有字段与规范化结果，记录数组数量变化或值替换，忽略原本未定义的字段。 */ (before: unknown, after: unknown, path: string): void => {
      if (before === undefined || Object.is(before, after)) return
      if (Array.isArray(before) && Array.isArray(after)) {
        if (before.length !== after.length) { issues.push({ path, code: 'ANIMATION_DRAFT_COUNT', message: `Saving would change the list from ${before.length} to ${after.length} entries.` }); return }
        before.forEach(/* 调用 compare(value, after[index], `${path}[${index}]`) 并返回调用结果。 */ (value, index) => compare(value, after[index], `${path}[${index}]`)); return
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
/** 把动画恢复草稿装入版本信封，将非有限数字编码为标记对象以避免 JSON 丢失原值。 */ export function encodeAnimationDraft(document: AnimationStudioDocument): string {
  return JSON.stringify({format:'nova-animation-draft',version:1,document}, /* 根据 typeof value==='number'&&!Number.isFinite(value) 的真假，分别返回 {__novaAnimationNumber:String(value)} 或 value。 */ (_key,value) => typeof value==='number'&&!Number.isFinite(value)?{__novaAnimationNumber:String(value)}:value)
}
/** 还原非有限数字标记并验证恢复草稿信封的格式、版本与文档存在性。 */ export function decodeAnimationDraft(source: string): AnimationStudioDocument {
  const envelope=JSON.parse(source,/** 仅把具有唯一合法数字标记字段的对象还原为 NaN 或正负无穷，其余值原样保留。 */ (_key,value)=>value&&typeof value==='object'&&Object.keys(value).length===1&&typeof value.__novaAnimationNumber==='string'&&['NaN','Infinity','-Infinity'].includes(value.__novaAnimationNumber)?Number(value.__novaAnimationNumber):value)
  if(envelope?.format!=='nova-animation-draft'||envelope.version!==1||!envelope.document)throw new Error('ANIMATION_DRAFT_FORMAT: Unsupported recovery document.')
  return envelope.document as AnimationStudioDocument
}