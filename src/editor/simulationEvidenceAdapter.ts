/** Explicit Editor composition of bounded history and the same fixed-World AI checksum port. */
import { toRaw } from 'vue'
import { physicsState } from '../store/physics'
import type { AiOwner } from '../runtime/aiOwner'
import { getLegacySimulationEvidenceRawState, simulationEvidenceState } from '../runtime/simulationAuthoring26'
import { SimulationEvidenceOwner, type SimulationEvidenceWorld } from '../runtime/simulationEvidenceOwner'

/** No registry or eager World access: each runtime composition owns its actual service. */
export function createEditorSimulationEvidenceOwner(world: SimulationEvidenceWorld, options: { legacyRoot: boolean }, ai: Pick<AiOwner, 'world' | 'blackboardSnapshot'>): SimulationEvidenceOwner {
  if (!options || typeof options.legacyRoot !== 'boolean') throw new Error('SIMULATION_EVIDENCE_COMPOSITION_REQUIRED: Choose the explicit legacy root or a fresh runtime state.')
  if (!ai || ai.world !== world || typeof ai.blackboardSnapshot !== 'function') throw new Error('SIMULATION_EVIDENCE_AI_WORLD_REQUIRED: Bind this history to its fixed AI Owner.')
  const aiPort = { scope: 'fixed-world' as const, world, blackboardSnapshot: ai.blackboardSnapshot.bind(ai) }
  if (options.legacyRoot) {
    if (world !== physicsState.world) throw new Error('SIMULATION_EVIDENCE_LEGACY_ROOT_REQUIRED: Only the original Editor World uses the shared view.')
    if (toRaw(simulationEvidenceState) !== getLegacySimulationEvidenceRawState()) throw new Error('SIMULATION_EVIDENCE_SAME_RAW_REQUIRED: Preserve the original legacy evidence view.')
    return new SimulationEvidenceOwner(world, aiPort, simulationEvidenceState)
  }
  return new SimulationEvidenceOwner(world, aiPort)
}
