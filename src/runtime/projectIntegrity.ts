import { reactive } from 'vue'
import { canonicalProjectText, repairProjectDocument, validateProjectDocument, type ProjectRepairReport, type ProjectValidationReport } from '../projects/projectData'
import { projectSessionState } from '../projects/projectSession'
import { getSceneJSON, loadProject, pushHistory } from '../store/physics'
import { downloadProjectBackup, storeUpgradeRollback } from './projectUpgrade'

export const projectIntegrityState = reactive({
  validation: null as ProjectValidationReport | null,
  repairPreview: null as ProjectRepairReport | null,
  lastAction: ''
})

export function validateCurrentProject(): ProjectValidationReport {
  const report = validateProjectDocument(getSceneJSON())
  projectIntegrityState.validation = report
  projectIntegrityState.lastAction = report.valid ? 'validated' : 'validation-failed'
  return report
}

export function previewCurrentProjectRepair(): ProjectRepairReport {
  const report = repairProjectDocument(getSceneJSON())
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
  const before = getSceneJSON()
  downloadProjectBackup(before, projectSessionState.name)
  storeUpgradeRollback(before, `${projectSessionState.name}.nova`)
  const repaired = canonicalProjectText(report.source)
  if (!loadProject(repaired)) {
    loadProject(before)
    projectIntegrityState.lastAction = 'repair-rolled-back'
    return false
  }
  pushHistory('Repair project')
  projectIntegrityState.repairPreview = null
  projectIntegrityState.validation = validateProjectDocument(getSceneJSON())
  projectIntegrityState.lastAction = 'repaired'
  return true
}
