import { reactive, toRaw } from 'vue'
import { assertStudioDraftsSaved } from '../editor/studioSaveBoundary'
import { canonicalProjectText, repairProjectDocument, validateProjectDocument, type ProjectRepairReport, type ProjectValidationReport } from '../projects/projectData'
import { projectSessionState } from '../projects/projectSession'
import { getSceneJSON, loadProject, pushHistory, settlePendingDocumentEdits } from '../store/physics'
import { downloadProjectBackup, storeUpgradeRollback } from './projectUpgrade'
import { deterministicResave, refreshTransactionDiff } from './projectTransactions'

const repairPreviews = new WeakMap<ProjectRepairReport, { source: string; output: string }>()

export const projectIntegrityState = reactive({
  validation: null as ProjectValidationReport | null,
  repairPreview: null as ProjectRepairReport | null,
  lastAction: '',
  repairReadOnly: true,
  missingReferenceMappings: {} as Record<string, string>
})

export function validateCurrentProject(): ProjectValidationReport {
  const report = validateProjectDocument(getSceneJSON())
  projectIntegrityState.validation = report
  projectIntegrityState.lastAction = report.valid ? 'validated' : 'validation-failed'
  return report
}

export function deterministicCurrentProjectResave(): { changed: boolean; checksum: string } {
  const before = getSceneJSON(), result = deterministicResave(before)
  projectIntegrityState.lastAction = result.changed ? 'deterministic-resave-preview' : 'deterministic-resave-no-op'
  if (!result.changed) return { changed: false, checksum: result.checksum }
  downloadProjectBackup(before, projectSessionState.name); storeUpgradeRollback(before, `${projectSessionState.name}.nova`)
  if (!loadProject(result.source)) { loadProject(before); projectIntegrityState.lastAction = 'deterministic-resave-rolled-back'; return { changed: false, checksum: result.checksum } }
  pushHistory('Deterministic project re-save', 'project:canonical', 'project.nova'); refreshTransactionDiff(getSceneJSON()); projectIntegrityState.lastAction = 'deterministic-resaved'
  return { changed: true, checksum: result.checksum }
}

export function previewCurrentProjectRepair(): ProjectRepairReport {
  const source = getSceneJSON(), report = repairProjectDocument(source)
  repairPreviews.set(report, { source, output: canonicalProjectText(report.source) })
  projectIntegrityState.repairPreview = report
  projectIntegrityState.lastAction = 'repair-previewed'
  return report
}

export function backupCurrentProject(): void {
  const source = getSceneJSON()
  downloadProjectBackup(source, projectSessionState.name)
  storeUpgradeRollback(source, `${projectSessionState.name}.nova`)
  projectIntegrityState.lastAction = 'backed-up'
}

export function applyCurrentProjectRepair(report = projectIntegrityState.repairPreview): boolean {
  if (!report) return false
  try {
    if (!settlePendingDocumentEdits()) { projectIntegrityState.lastAction = 'repair-pending-edits'; return false }
    assertStudioDraftsSaved()
  } catch { projectIntegrityState.lastAction = 'repair-pending-edits'; return false }
  const before = getSceneJSON(), reviewed = repairPreviews.get(toRaw(report))
  if (!reviewed || reviewed.source !== before || reviewed.output !== canonicalProjectText(report.source)) {
    projectIntegrityState.lastAction = 'repair-preview-stale'
    return false
  }
  downloadProjectBackup(before, projectSessionState.name)
  storeUpgradeRollback(before, `${projectSessionState.name}.nova`)
  const repaired = canonicalProjectText(report.source)
  if (!loadProject(repaired)) {
    loadProject(before)
    projectIntegrityState.lastAction = 'repair-rolled-back'
    return false
  }
  pushHistory('Repair project')
  repairPreviews.delete(toRaw(report))
  projectIntegrityState.repairPreview = null
  projectIntegrityState.validation = validateProjectDocument(getSceneJSON())
  projectIntegrityState.lastAction = 'repaired'
  return true
}
