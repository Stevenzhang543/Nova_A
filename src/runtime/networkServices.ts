/** 网络服务连接配置：组织会话和服务信息及相关连接操作。 */
import type { ProductionProjectSettings } from './production'

export type NetworkServiceKind = 'identity' | 'lobby' | 'relay'
export type NetworkServicePermission = 'network.client' | 'network.listen' | 'identity.read' | 'lobby.read' | 'lobby.write' | 'relay.use'

export interface NetworkServiceReview {
  readonly id: string
  readonly kind: NetworkServiceKind
  readonly label: string
  readonly version: string
  readonly publisher: string
  readonly sha256: string
  readonly reviewedBy: 'Whitelist'
  readonly permissions: readonly NetworkServicePermission[]
  readonly encrypted: boolean
  readonly documentationUrl: string
  readonly securityUrl: string
}

export interface NetworkServiceContext {
  sessionId: string
  localPeerId: string
  role: 'client' | 'server' | 'host'
  signal: AbortSignal
}

export interface NetworkServiceHandle {
  readonly kind: NetworkServiceKind
  request(operation: string, payload: unknown): Promise<unknown>
  close(): Promise<void>
}

export interface ReviewedNetworkServiceProvider {
  readonly review: NetworkServiceReview
  open(context: Readonly<NetworkServiceContext>): Promise<NetworkServiceHandle>
}

const providers = new Map<string, Readonly<ReviewedNetworkServiceProvider>>()
const permissionByKind: Record<NetworkServiceKind, ReadonlySet<NetworkServicePermission>> = {
  identity: new Set(['network.client', 'identity.read']),
  lobby: new Set(['network.client', 'network.listen', 'lobby.read', 'lobby.write']),
  relay: new Set(['network.client', 'network.listen', 'relay.use'])
}
const requiredPermissionByKind: Record<NetworkServiceKind, readonly NetworkServicePermission[]> = {
  identity: ['network.client', 'identity.read'],
  lobby: ['network.client', 'lobby.read'],
  relay: ['network.client', 'relay.use']
}

/* 调用 /^https:\/\/[^\s]+$/i.test(value) 并返回调用结果。 */ function https(value: string): boolean { return /^https:\/\/[^\s]+$/i.test(value) }

/** 结构说明（自动提取）：networkServiceReviewIssues；输入 review；直接调用 test、issues.push、includes、review.label.trim、review.publisher.trim 等；返回路径包含 issues。 */ export function networkServiceReviewIssues(review: NetworkServiceReview): string[] {
  const issues: string[] = [], allowed = permissionByKind[review.kind]
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(review.id)) issues.push('Service ID must be reverse-domain style.')
  if (!['identity', 'lobby', 'relay'].includes(review.kind)) issues.push('Service kind is unsupported.')
  if (!/^\d+\.\d+\.\d+$/.test(review.version)) issues.push('Service version must use semantic versioning.')
  if (!review.label.trim() || !review.publisher.trim() || review.reviewedBy !== 'Whitelist') issues.push('Service publisher review is missing.')
  if (!/^[a-f0-9]{64}$/.test(review.sha256)) issues.push('Service SHA-256 is invalid.')
  if (!review.permissions.length || review.permissions.some(/* 返回 allowed?.has(permission) 的逻辑取反结果。 */ permission => !allowed?.has(permission)) || requiredPermissionByKind[review.kind]?.some(/* 返回 review.permissions.includes(permission) 的逻辑取反结果。 */ permission => !review.permissions.includes(permission))) issues.push('Service permissions are missing or exceed the selected service kind.')
  if (!https(review.documentationUrl) || !https(review.securityUrl)) issues.push('Service documentation and security policy must use HTTPS.')
  if (review.kind === 'relay' && !review.encrypted) issues.push('Reviewed relay services must declare encrypted transport.')
  return issues
}

/** 结构说明（自动提取）：registerReviewedNetworkService；输入 provider；直接调用 networkServiceReviewIssues、Error、issues.join、providers.has、Object.freeze 等；包含显式抛错路径。 */ export function registerReviewedNetworkService(provider: ReviewedNetworkServiceProvider): () => void {
  const issues = networkServiceReviewIssues(provider.review)
  if (issues.length) throw new Error(`Network service provider rejected: ${issues.join(' ')}`)
  if (providers.has(provider.review.id)) throw new Error(`Network service provider ${provider.review.id} is already registered.`)
  const review: NetworkServiceReview = Object.freeze({ ...provider.review, permissions: Object.freeze([...provider.review.permissions]) })
  const id = review.id
  providers.set(id, Object.freeze({ review, open: provider.open.bind(provider) }))
  return /* 调用 providers.delete(id) 并返回调用结果。 */ () => providers.delete(id)
}

/** 结构说明（自动提取）：reviewedNetworkServices；输入 kind；直接调用 Object.freeze、sort、filter、map、providers.values。 */ export function reviewedNetworkServices(kind?: NetworkServiceKind): ReadonlyArray<NetworkServiceReview> {
  return Object.freeze([...providers.values()].map(/* 返回 provider.review 的当前值。 */ provider => provider.review).filter(/* 先计算 !kind；仅当其为假值时求右侧 review.kind === kind，返回短路求值结果。 */ review => !kind || review.kind === kind).sort(/* 调用 a.label.localeCompare(b.label) 并返回调用结果。 */ (a, b) => a.label.localeCompare(b.label)))
}

/** 构造并返回记录 { identity: settings.services.identityProviderId, lobby: settings.services.lobbyProviderId, relay: settings.services.relayProviderId }，字段按当前实参及捕获状态求值。 */ export function selectedNetworkServiceIds(settings: Readonly<ProductionProjectSettings['networking']>): Record<NetworkServiceKind, string> {
  return { identity: settings.services.identityProviderId, lobby: settings.services.lobbyProviderId, relay: settings.services.relayProviderId }
}

/** 结构说明（自动提取）：networkServiceSelectionIssues；输入 settings；直接调用 Object.entries、selectedNetworkServiceIds、providers.get、issues.push；返回路径包含 issues；包含循环处理。 */ export function networkServiceSelectionIssues(settings: Readonly<ProductionProjectSettings['networking']>): string[] {
  const issues: string[] = []
  for (const [kind, id] of Object.entries(selectedNetworkServiceIds(settings)) as Array<[NetworkServiceKind, string]>) {
    if (!id) continue
    const provider = providers.get(id)
    if (!provider || provider.review.kind !== kind) issues.push(`${kind} service ${id} is not registered with the required reviewed kind.`)
  }
  return issues
}

/** 结构说明（自动提取）：openReviewedNetworkService；输入 kind、settings、context；直接调用 Error、selectedNetworkServiceIds、providers.get、provider.review.permissions.includes、DOMException 等；返回路径包含 handle；等待异步结果；包含显式抛错路径。 */ export async function openReviewedNetworkService(kind: NetworkServiceKind, settings: Readonly<ProductionProjectSettings['networking']>, context: Readonly<NetworkServiceContext>): Promise<NetworkServiceHandle> {
  if (!settings.enabled || !settings.permissionGranted) throw new Error('Explicit project networking permission is required before a service can open.')
  const id = selectedNetworkServiceIds(settings)[kind]
  if (!id) throw new Error(`No reviewed ${kind} service is selected.`)
  const provider = providers.get(id)
  if (!provider || provider.review.kind !== kind) throw new Error(`Reviewed ${kind} service ${id} is not registered.`)
  if ((context.role === 'host' || context.role === 'server') && kind !== 'identity' && !provider.review.permissions.includes('network.listen')) throw new Error(`Reviewed ${kind} service ${id} has no network.listen permission for an authoritative role.`)
  if ((context.role === 'host' || context.role === 'server') && kind === 'lobby' && !provider.review.permissions.includes('lobby.write')) throw new Error(`Reviewed lobby service ${id} has no lobby.write permission for publication.`)
  if (context.signal.aborted) throw new DOMException('Network service opening was cancelled.', 'AbortError')
  const handle = await provider.open(Object.freeze({ ...context }))
  if (context.signal.aborted) { await handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined); throw new DOMException('Network service opening was cancelled.', 'AbortError') }
  if (handle.kind !== kind) { await handle.close().catch(/* 返回 undefined 的当前值。 */ () => undefined); throw new Error(`Network service ${id} returned the wrong service kind.`) }
  return handle
}
