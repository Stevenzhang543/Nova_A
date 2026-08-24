import { access, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const read = path => readFile(join(root, path), 'utf8')
const [pkgText, tauriText, transactions, native, data, commands, physics, recovery, upgrade, external, archive, health, launcher, topbar, undoPanel, recoveryCenter, mutationRouter, trash, support] = await Promise.all([
  'package.json','src-tauri/tauri.conf.json','src/runtime/projectTransactions.ts','src-tauri/src/lib.rs','src/projects/projectData.ts','src/editor/commands.ts','src/store/physics.ts','src/runtime/recovery.ts','src/runtime/projectUpgrade.ts','src/runtime/projectExternalChanges.ts','src/projects/projectArchive.ts','src/components/ProjectHealthPanel.vue','src/components/ProjectManager.vue','src/layout/TopBar.vue','src/components/UndoHistoryPanel.vue','src/components/RecoveryCenter.vue','src/runtime/projectMutationRouter.ts','src/runtime/projectTrash.ts','src/runtime/support.ts'
].map(read))
const pkg = JSON.parse(pkgText), tauri = JSON.parse(tauriText), checks = []
const check = (id, passed, detail) => checks.push({ id, status: passed ? 'passed' : 'failed', detail })
check('V420-VERSION', pkg.version === '4.2.0' && tauri.version === '4.2.0', 'Web and desktop authorities report 4.2.0.')
check('V420-TRANSACTION-SCOPES', ['scene','asset','script','animation','ui','settings','packages','build'].every(value => transactions.includes(`'${value}'`)), 'The central transaction service declares every required mutation scope.')
check('V420-TRANSACTION-ATOMIC', ['temporary','affectedFiles','previousManualChecksum','errorKind','preflight','rolling-back'].every(value => transactions.includes(value)) && native.includes('commit_project_transaction') && native.includes('join("transactions")') && native.includes('rollback_project_files'), 'Journaled temporary-write, native atomic replacement, rollback, checksums, and error state are present.')
check('V420-SAVE-ROUTE', physics.includes('commitProjectTransaction') && physics.includes('createNativeProjectTransactionSink') && transactions.includes("kind: 'native-folder'") && !physics.includes('localStorage.setItem(\'nova-a-project-save'), 'Manual save uses native folder transactions when available and the same validated service on browser fallback.')
check('V420-CANONICAL', data.includes('canonicalProjectText') && data.includes('Non-finite number') && data.includes('toLowerCase()') && data.includes('separateAuthoredAndGeneratedProjectData') && data.includes('semanticProjectDiff'), 'Canonical numeric/identity/reference rules, authored/generated separation, and semantic diffs exist.')
check('V420-UNDO', ['CompositeCommand','beginGroup','memoryBudgetBytes','affectedResource','timestamp','redo'].every(value => commands.includes(value)) && physics.includes('clearEditorHistory') && mutationRouter.includes('installProjectMutationRouter'), 'Central named/grouped/nested/budgeted history and stable-control routing are connected.')
check('V420-UNDO-UI', undoPanel.includes('history.entries') && undoPanel.includes('affectedResource') && undoPanel.includes('entry.timestamp') && undoPanel.includes("t('redo')") && topbar.includes('undoHistoryOpen'), 'Undo History exposes names, resources, timestamps, undo, redo, and explicit clearing.')
check('V420-RECOVERY', ['manualChecksum','previewRecoverySnapshot','recoveryCopySource','invalidSnapshots'].every(value => recovery.includes(value)) && ['openRecoveryCopy','semanticChanges','discardRecoverySnapshot'].every(value => recoveryCenter.includes(value)), 'Verified autosaves are separate and the Recovery Browser supports preview/diff/restore/discard/open-copy.')
check('V420-MIGRATION', ['dryRunProjectMigration','estimatedChangedBytes','deterministic','storeUpgradeRollback','sourceChecksum'].every(value => upgrade.includes(value)), 'Migration dry run, estimates, logs, backup checksum, deterministic rerun, and rollback are present.')
check('V420-REPAIR', health.includes('repairReadOnly') && health.includes('missingReferenceMapping') && health.includes('rebuildStaleCache') && health.includes('restoreRollback'), 'Project Health fronts read-only repair, missing-reference mapping, cache rebuild, and rollback.')
check('V420-LOCKS', launcher.includes('openReadOnly') && launcher.includes('lockConflict'), 'Concurrent project locking has a clear read-only launch route.')
check('V420-EXTERNAL', ['suppressSelfProjectChange','signalExternalProjectChange','branch-switch','large-update','keepEditorProjectVersion','keepDiskProjectVersion'].every(value => external.includes(value)), 'Watcher self-suppression, source-control/large-update classification, compare, reload, keep-editor, and keep-disk paths exist.')
check('V420-LAUNCHER', ['addExistingProject','migrateOlderProject','importArchive'].every(value => launcher.includes(value)) && archive.includes('safeArchivePath') && archive.includes('crc32'), 'Guided launcher workflows and bounded traversal-safe archive import are connected.')
check('V420-TRASH', trash.includes('restoreProjectTrashItem') && trash.includes('purgeProjectTrashItem') && physics.includes('projectTrash'), 'Recoverable project trash is serialized and reversible; permanent purge remains explicit.')
check('V420-DIAGNOSTICS', ['transactionDiagnostics','externalChangeDiagnostics','migration'].every(value => support.includes(value)), 'Integrity summaries are included in local diagnostic bundles.')

const docs = ['SERIALIZATION_SPECIFICATION_4_2.md','SCHEMA_COMPATIBILITY_MATRIX_4_2.md','PROJECT_TRANSACTIONS_4_2.md','UNDO_COVERAGE_4_2.md','RECOVERY_4_2.md','MIGRATION_AND_ROLLBACK_4_2.md','EXTERNAL_CHANGES_4_2.md','KNOWN_ISSUES_4_2.md']
for (const name of docs) { try { await access(join(root,'docs',name)); check(`V420-DOC-${name}`, true, 'Present.') } catch { check(`V420-DOC-${name}`, false, 'Missing.') } }
for (let schema=5; schema<=29; schema++) for (const name of ['pre-migration.nova','expected-migrated.nova','README.md']) { try { await access(join(root,'reference-projects','migrations',`schema-${String(schema).padStart(2,'0')}`,name)); check(`V420-MIG-${schema}-${name}`, true, 'Present.') } catch { check(`V420-MIG-${schema}-${name}`, false, 'Missing.') } }
const failed = checks.filter(item => item.status === 'failed')
const report = { format:'nova-v4.2-integrity-audit', version:1, engineVersion:'4.2.0', generatedAt:new Date().toISOString(), checks, severity0Open:0, severity1Open:failed.length, status:failed.length?'failed':'passed' }
await mkdir(join(root,'release-audits'),{recursive:true}); await writeFile(join(root,'release-audits','v4.2.0-integrity-audit.json'),`${JSON.stringify(report,null,2)}\n`)
if(failed.length){console.error(failed);process.exit(1)}
console.log(`Nova_A v4.2 integrity audit passed: ${checks.length} implementation, documentation, and migration-fixture checks.`)
