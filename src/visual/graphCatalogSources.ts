/** Graph node contributions from active plugins. The host that owns plugin state (Editor or Player)
 * registers its reader; the graph catalog and compiler never import a host's plugin store. */
import type { PluginContribution } from '../runtime/pluginRuntimeOwner'

export type GraphPluginContribution = PluginContribution & { readonly pluginId: string; readonly pluginName: string }
let pluginContributions: () => readonly GraphPluginContribution[] = () => []

/** Replaces the contribution reader; returns a restore function for tests and short-lived hosts. */
export function setGraphPluginContributionSource(read: () => readonly GraphPluginContribution[]): () => void {
  if (typeof read !== 'function') throw new TypeError('GRAPH_PLUGIN_SOURCE_REQUIRED')
  const previous = pluginContributions
  pluginContributions = read
  return () => { if (pluginContributions === read) pluginContributions = previous }
}
export function graphPluginContributions(): readonly GraphPluginContribution[] { return pluginContributions() }
