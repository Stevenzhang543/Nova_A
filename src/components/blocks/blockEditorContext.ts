/** 积木编辑器共享上下文：选项列表、选择与插入位置、拖放目标和编辑操作，供嵌套堆叠组件注入。 */
import type { ComputedRef, InjectionKey, Ref } from 'vue'
import type { BlockCondition, BlockDiagnostic, BlockNode } from '../../visual/blockScript'
import type { blockCopy } from '../../visual/blockScriptCopy'

export interface BlockOption { value: string; label: string }
export interface BlockEditorOptions { actions: string[]; variables: string[]; audio: BlockOption[]; video: BlockOption[]; prefabs: BlockOption[]; scenes: BlockOption[]; buses: string[] }
export interface BlockPosition { key: string; index: number }
export type BlockDragPayload = { kind: 'move'; id: string } | { kind: 'new'; type: string }

export interface BlockEditorContext {
  copy: ComputedRef<ReturnType<typeof blockCopy>>
  options: ComputedRef<BlockEditorOptions>
  valueListId: string
  objectListId: string
  selectedId: Ref<string>
  cursor: Ref<BlockPosition | null>
  drop: Ref<BlockPosition | null>
  draggingId: Ref<string>
  diagnostics: ComputedRef<Map<string, BlockDiagnostic[]>>
  problemText(problem: BlockDiagnostic): string
  /** Runs an edit with an undo snapshot and marks the script dirty. */
  mutate(edit: () => void): void
  select(node: BlockNode, key: string, index: number): void
  setCursor(key: string, index: number): void
  startDrag(event: PointerEvent, payload: BlockDragPayload): void
  remove(id: string): void
  duplicate(id: string): void
  moveRelative(id: string, delta: number): void
  toggleDisabled(node: BlockNode): void
  /** 26.45: block breakpoints, and the block the debugger is paused at ('' when none). */
  toggleBreakpoint(node: BlockNode): void
  pausedBlockId: ComputedRef<string>
  addCondition(node: BlockNode): void
  removeCondition(node: BlockNode, condition: BlockCondition): void
}

export const BLOCK_EDITOR: InjectionKey<BlockEditorContext> = Symbol('nova-block-editor')
