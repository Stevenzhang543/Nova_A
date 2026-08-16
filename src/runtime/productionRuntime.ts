import type { Entity } from '../world/Entity'
import { packageEnabled, OFFICIAL_NETWORKING_PACKAGE_ID } from './packages'
import { productionSettings } from './production'
import { reportRecoverableError } from './faultCenter'

type NetworkingModule = typeof import('./networking')
let networking: NetworkingModule | null = null
let loading: Promise<void> | null = null
let lifecycleGeneration = 0

export function beginProductionRuntime(): void {
  if (!productionSettings.networking.enabled || !packageEnabled(OFFICIAL_NETWORKING_PACKAGE_ID) || loading || networking) return
  const generation = ++lifecycleGeneration
  loading = import('./networking')
    .then(async module => {
      if (generation !== lifecycleGeneration) return
      networking = module
      await module.startNetworking()
      if (generation !== lifecycleGeneration) {
        networking = null
        await module.stopNetworking()
      }
    })
    .catch(error => {
      networking = null
      reportRecoverableError(error, 'Optional networking startup', 'Runtime')
    })
    .finally(() => {
      if (generation === lifecycleGeneration) loading = null
    })
}

export function updateProductionRuntime(entities: Entity[], fixedDelta: number): void { networking?.updateNetworking(entities, fixedDelta) }
export function stopProductionRuntime(): void {
  lifecycleGeneration++
  loading = null
  const active = networking
  networking = null
  if (active) void active.stopNetworking().catch(error => reportRecoverableError(error, 'Optional networking shutdown', 'Runtime'))
}
