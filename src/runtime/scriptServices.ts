/** Read-only script resource views and explicit authoring writes supplied by the host. */
import type { ScriptModuleAsset } from './scriptModules'
export type { ScriptDebugCounterOwner, ScriptDebugCounterSession } from './scriptDebugCounterOwner'

export interface ScriptBreakpoint {
  readonly id: string
  readonly line: number
  readonly functionName: string
  readonly condition: string
  readonly hitCondition: number
  readonly logMessage: string
  readonly enabled: boolean
  readonly hitCount: number
}

export interface ScriptResource {
  readonly uuid: string
  readonly name: string
  readonly path: string
  readonly assetType: string
  readonly script?: {
    readonly apiVersion: 1 | 2
    readonly reloadPolicy: 'preserve' | 'recreate' | 'disabled'
    readonly breakpoints: readonly number[]
    readonly breakpointDetails: readonly ScriptBreakpoint[]
    readonly signalConnections: readonly { readonly signal: string; readonly source: string; readonly target: string; readonly callback: string; readonly enabled: boolean }[]
  }
}

export interface GameplayScriptServices {
  /** Identity lookup retains the existing UUID/asset:// semantics. */
  resolveAsset(reference: string | null | undefined): ScriptResource | null
  /** Module lookup additionally permits source paths; it never broadens identity lookup. */
  resolveModuleAsset(reference: string): ScriptModuleAsset | null
  readSource(reference: string | null | undefined): string | null
  revision(): number
  listIdentities(): readonly { readonly uuid: string; readonly path: string }[]
  compileVisual(source: string): string
  /** Optional authoring capability. A Player catalog can be strictly read-only. */
  writeSource?(uuid: string, source: string): boolean
  recordBreakpointHit?(uuid: string, index: number, breakpoint: ScriptBreakpoint): number
}
