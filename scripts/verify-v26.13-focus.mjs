import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runAudit, writeAuditBundle } from './lib/milestoneAuditBundle.mjs'
import { releaseSourceInventory, sourceDigest } from './release-source-snapshot.mjs'
const root = dirname(dirname(fileURLToPath(import.meta.url))), temporary = await mkdtemp(join(root, '.cache', 'nova-2613-baseline-'))
const baselineDigest = '0d824ccfc9a79c7800fdec95a4f41bd9282b937172becc31d543cc733b2888a4'
const archive = join(root, 'releases/v26.12/Nova_A-v26.12-source.zip')
const executions = []
try {
  // The preceding separately verified source archive supplies the actual comparison baseline.
  const quote = value => "'" + value.replaceAll("'", "''") + "'"
  execFileSync('pwsh.exe', ['-NoProfile', '-NonInteractive', '-Command', `Expand-Archive -LiteralPath ${quote(archive)} -DestinationPath ${quote(temporary)}`], { stdio: 'inherit', windowsHide: true })
  assert.equal(sourceDigest(await releaseSourceInventory(temporary)), baselineDigest, '26.12 baseline must be the separately released source')
  for (const [name, args, report] of [
    ['layout', [], 'layout-engine'], ['projection', [`--baseline-root=${temporary}`], 'projection'],
    ['workspaces', [], 'workspaces'], ['panel-controls', [], 'panel-controls'],
    ['panel-accessibility', [`--baseline-root=${temporary}`], 'panel-accessibility'],
    ['studio-layout', [], 'studio-layout'], ['studio-drafts', [], 'studio-drafts'], ['project-departure', [], 'project-departure'],
  ]) {
    const execution = await runAudit(root, `scripts/verify-v26.13-${name}.mjs`, args)
    execution.reports = [`release-audits/v26.13-${report}.json`]; executions.push(execution)
  }
  for (const script of ['scripts/verify-v26.12-typed-graphs.mjs', 'scripts/verify-v26.12-syntax-slots.mjs', 'scripts/verify-v26.12-script-ui.mjs', 'scripts/verify-v26.12-release-tooling.mjs']) executions.push(await runAudit(root, script))
  executions.push(await runAudit(root, 'scripts/generate-v26.13-reference-projects.mjs', ['--verify-only']))
  const inventoryExecution = await runAudit(root, 'scripts/audit-v26.13-panels.mjs')
  inventoryExecution.reports = ['release-audits/panel-source-inventory.json']; executions.push(inventoryExecution)
  const inventory = JSON.parse(await readFile(join(root, 'release-audits/panel-source-inventory.json'), 'utf8'))
  assert.ok(inventory.sourceFiles >= 70 && inventory.records.every(record => record.file && record.sha256), 'Complete current SFC inventory')
  await writeAuditBundle(root, '26.13', 'focus', executions)
} finally { await rm(temporary, { recursive: true, force: true }) }
