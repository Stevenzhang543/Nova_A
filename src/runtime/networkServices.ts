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

function https(value: string): boolean { return /^https:\/\/[^\s]+$/i.test(value) }

export function networkServiceReviewIssues(review: NetworkServiceReview): string[] {
  const issues: string[] = [], allowed = permissionByKind[review.kind]
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)+$/.test(review.id)) issues.push('Service ID must be reverse-domain style.')
  if (!['identity', 'lobby', 'relay'].includes(review.kind)) issues.push('Service kind is unsupported.')
  if (!/^\d+\.\d+\.\d+$/.test(review.version)) issues.push('Service version must use semantic versioning.')
  if (!review.label.trim() || !review.publisher.trim() || review.reviewedBy !== 'Whitelist') issues.push('Service publisher review is missing.')
  if (!/^[a-f0-9]{64}$/.test(review.sha256)) issues.push('Service SHA-256 is invalid.')
  if (!review.permissions.length || review.permissions.some(permission => !allowed?.has(permission)) || requiredPermissionByKind[review.kind]?.some(permission => !review.permissions.includes(permission))) issues.push('Service permissions are missing or exceed the selected service kind.')
  if (!https(review.documentationUrl) || !https(review.securityUrl)) issues.push('Service documentation and security policy must use HTTPS.')
  if (review.kind === 'relay' && !review.encrypted) issues.push('Reviewed relay services must declare encrypted transport.')
  return issues
}

export function registerReviewedNetworkService(provider: ReviewedNetworkServiceProvider): () => void {
  const issues = networkServiceReviewIssues(provider.review)
  if (issues.length) throw new Error(`Network service provider rejected: ${issues.join(' ')}`)
  if (providers.has(provider.review.id)) throw new Error(`Network service provider ${provider.review.id} is already registered.`)
  const review: NetworkServiceReview = Object.freeze({ ...provider.review, permissions: Object.freeze([...provider.review.permissions]) })
  const id = review.id
  providers.set(id, Object.freeze({ review, open: provider.open.bind(provider) }))
  return () => providers.delete(id)
}

export function reviewedNetworkServices(kind?: NetworkServiceKind): ReadonlyArray<NetworkServiceReview> {
  return Object.freeze([...providers.values()].map(provider => provider.review).filter(review => !kind || review.kind === kind).sort((a, b) => a.label.localeCompare(b.label)))
}

export function selectedNetworkServiceIds(settings: Readonly<ProductionProjectSettings['networking']>): Record<NetworkServiceKind, string> {
  return { identity: settings.services.identityProviderId, lobby: settings.services.lobbyProviderId, relay: settings.services.relayProviderId }
}

export function networkServiceSelectionIssues(settings: Readonly<ProductionProjectSettings['networking']>): string[] {
  const issues: string[] = []
  for (const [kind, id] of Object.entries(selectedNetworkServiceIds(settings)) as Array<[NetworkServiceKind, string]>) {
    if (!id) continue
    const provider = providers.get(id)
    if (!provider || provider.review.kind !== kind) issues.push(`${kind} service ${id} is not registered with the required reviewed kind.`)
  }
  return issues
}

export async function openReviewedNetworkService(kind: NetworkServiceKind, settings: Readonly<ProductionProjectSettings['networking']>, context: Readonly<NetworkServiceContext>): Promise<NetworkServiceHandle> {
  if (!settings.enabled || !settings.permissionGranted) throw new Error('Explicit project networking permission is required before a service can open.')
  const id = selectedNetworkServiceIds(settings)[kind]
  if (!id) throw new Error(`No reviewed ${kind} service is selected.`)
  const provider = providers.get(id)
  if (!provider || provider.review.kind !== kind) throw new Error(`Reviewed ${kind} service ${id} is not registered.`)
  if ((context.role === 'host' || context.role === 'server') && kind !== 'identity' && !provider.review.permissions.includes('network.listen')) throw new Error(`Reviewed ${kind} service ${id} has no network.listen permission for an authoritative role.`)
  if ((context.role === 'host' || context.role === 'server') && kind === 'lobby' && !provider.review.permissions.includes('lobby.write')) throw new Error(`Reviewed lobby service ${id} has no lobby.write permission for publication.`)
  if (context.signal.aborted) throw new DOMException('Network service opening was cancelled.', 'AbortError')
  const handle = await provider.open(Object.freeze({ ...context }))
  if (handle.kind !== kind) { await handle.close().catch(() => undefined); throw new Error(`Network service ${id} returned the wrong service kind.`) }
  return handle
}
