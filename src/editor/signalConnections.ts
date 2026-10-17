/** 节点信号连接：在**既有**脚本资源 signalConnections 模型之上提供节点级连接的增删与校验。
 *
 * 不新建第二套连接模型（主指令 §31：不得两套信号派发）。运行时已在
 * `GameplayRuntimeCore.dispatchSignals` 中按 `signal/source/target` 过滤并调用 `callback`，
 * 因此这里只是把同一份数据结构做成可校验、可测试的编辑入口。
 *
 * 语义：一条连接属于**接收方**的脚本资源；`source` 限定发出信号的对象，
 * `target` 限定接收对象，`callback` 是接收方脚本里的函数名。 */

export interface SignalConnectionLike {
  signal: string
  source: string
  target: string
  callback: string
  enabled?: boolean
}

export interface ScriptAssetLike {
  script?: { signalConnections?: SignalConnectionLike[] }
}

export interface NodeSignalConnectionInput {
  signal: string
  source: string
  target: string
  callback: string
}

export type ConnectionRejection = 'invalid-signal' | 'invalid-source' | 'invalid-target' | 'invalid-callback' | 'duplicate'

const CALLBACK_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

/** 校验一条待建立的连接；通过返回 null，否则返回拒绝原因键。 */
export function validateNodeSignalConnection(input: NodeSignalConnectionInput): ConnectionRejection | null {
  if (!input.signal.trim() || input.signal.length > 128) return 'invalid-signal'
  if (!input.source.trim()) return 'invalid-source'
  if (!input.target.trim()) return 'invalid-target'
  if (!CALLBACK_PATTERN.test(input.callback.trim())) return 'invalid-callback'
  return null
}

/** 确保脚本资源上有可写的连接数组；没有则创建。 */
function connectionsOf(asset: ScriptAssetLike): SignalConnectionLike[] {
  asset.script ??= {}
  asset.script.signalConnections ??= []
  return asset.script.signalConnections
}

/** 建立一条连接。重复（同 signal/source/target/callback）会被拒绝而不是静默叠加。 */
export function addNodeSignalConnection(asset: ScriptAssetLike, input: NodeSignalConnectionInput): ConnectionRejection | null {
  const invalid = validateNodeSignalConnection(input)
  if (invalid) return invalid
  const connections = connectionsOf(asset)
  const normalized: SignalConnectionLike = {
    signal: input.signal.trim().slice(0, 128),
    source: input.source.trim(),
    target: input.target.trim(),
    callback: input.callback.trim(),
    enabled: true,
  }
  const duplicate = connections.some(/** 与既有连接完全一致即视为重复。 */ connection =>
    connection.signal === normalized.signal && connection.source === normalized.source
    && connection.target === normalized.target && connection.callback === normalized.callback)
  if (duplicate) return 'duplicate'
  connections.push(normalized)
  return null
}

/** 删除指定索引的连接；索引非法返回 false。 */
export function removeNodeSignalConnection(asset: ScriptAssetLike, index: number): boolean {
  const connections = asset.script?.signalConnections
  if (!connections || !Number.isInteger(index) || index < 0 || index >= connections.length) return false
  connections.splice(index, 1)
  return true
}

/** 列出指向某接收对象的连接，供 Signals 区展示当前连接。 */
export function nodeConnectionsFor(asset: ScriptAssetLike, targetUuid: string): readonly SignalConnectionLike[] {
  return (asset.script?.signalConnections ?? []).filter(/** 只取指向该接收对象的连接。 */ connection => connection.target === targetUuid)
}

/** 统计某信号在该脚本资源上的连接数，用于 Signals 区展示徽标。 */
export function connectionCountForSignal(asset: ScriptAssetLike, signal: string): number {
  return (asset.script?.signalConnections ?? []).filter(/** 只统计同名信号。 */ connection => connection.signal === signal).length
}
