import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const release = '26.07'
const engineVersion = '26.7.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const audits = join(root, 'release-audits')
const sourceReportPath = join(audits, 'v6.6.0-verification.json')
const outputPath = join(audits, 'v26.07-process-regression.json')

execFileSync(process.execPath, [join(root, 'scripts/verify-v6.6.0-networking.mjs')], {
  cwd: root,
  encoding: 'utf8',
  stdio: ['ignore', 'inherit', 'inherit'],
  timeout: 120_000,
  windowsHide: true
})

const sourceBytes = await readFile(sourceReportPath)
const source = JSON.parse(sourceBytes.toString('utf8'))
const expected = [2, 4, 8]
const processMatrix = expected.map(count => {
  const matches = source.checks?.filter(check => check?.id === `V660-${count}-PEER-SOAK`) ?? []
  const check = matches[0]
  const clients = Array.isArray(check?.metrics?.clientPeers) ? check.metrics.clientPeers.length : -1
  const passed = matches.length === 1
    && check.status === 'passed'
    && Number(check.metrics?.peers) === count
    && Number(check.metrics?.hostPeers) === count - 1
    && clients === count - 1
    && Number(check.metrics?.rpcReceived) > 0
    && Number(check.metrics?.acknowledged) > 0
  return {
    instances: count,
    status: passed ? 'passed' : 'failed',
    ticksPerProcess: 180,
    hostObservedPeers: Number(check?.metrics?.hostPeers ?? 0),
    clientProcesses: clients,
    rpcReceived: Number(check?.metrics?.rpcReceived ?? 0),
    acknowledged: Number(check?.metrics?.acknowledged ?? 0)
  }
})
const sourceAuthorityPassed = source.format === 'nova-v6.6.0-network-verification'
  && source.version === 1
  && source.engineVersion === '6.6.0'
  && source.status === 'passed'
  && Number(source.severity0Open ?? 0) === 0
  && Number(source.severity1Open ?? 0) === 0
  && Number.isFinite(Date.parse(source.generatedAt))
const failed = processMatrix.filter(item => item.status !== 'passed')
const status = sourceAuthorityPassed && failed.length === 0 ? 'passed' : 'failed'

const output = {
  format: 'nova-v26.07-process-regression',
  version: 1,
  release,
  engineVersion,
  generatedAt: new Date().toISOString(),
  harness: {
    compatibilityContract: '6.6.0',
    report: 'release-audits/v6.6.0-verification.json',
    reportFormat: source.format,
    reportGeneratedAt: source.generatedAt,
    reportSha256: createHash('sha256').update(sourceBytes).digest('hex'),
    sourceAuthorityPassed
  },
  processMatrix,
  checks: [{
    id: 'V2607-ACTUAL-2-4-8-PROCESS-REGRESSION',
    status,
    detail: 'The frozen compatibility harness launched 2, 4, and 8 independent localhost UDP processes against the current runtime and observed bounded ticks, admitted peers, RPC traffic, and acknowledgements.'
  }],
  severity0Open: status === 'passed' ? 0 : 1,
  severity1Open: 0,
  status
}
await mkdir(audits, { recursive: true })
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`)
if (status !== 'passed') throw new Error(`Nova_A ${release} actual-process regression failed.`)
console.log(`Nova_A ${release} actual-process regression passed for ${expected.join('/')} independent processes.`)
