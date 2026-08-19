import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

process.env.NOVA_EVIDENCE_VERSION = '3.5.0'
await import('./generate-v3.3-release-evidence.mjs')

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const evidencePath = join(root, 'release-audits', 'v3.5.0-known-issues.json')
const evidence = JSON.parse(await readFile(evidencePath, 'utf8'))
evidence.items = [
  {
    severity: 'S2',
    area: 'script debugger',
    issue: 'Step into, over, and out pause at safe script callback boundaries; arbitrary statement-level suspension inside the Rhai VM is not exposed by the current embedded VM adapter.',
    workaround: 'Use line/function/conditional/log breakpoints, watches, stack frames, and callback-boundary stepping to isolate the statement.'
  },
  {
    severity: 'S2',
    area: 'script profiler',
    issue: 'Per-script allocation values are deterministic estimates because the embedded Rhai allocator does not expose exact allocation telemetry.',
    workaround: 'Use calls, last/total/maximum duration and capture comparisons for optimization; treat allocation values as relative indicators.'
  },
  {
    severity: 'S2',
    area: 'release qualification',
    issue: 'A 24-hour wall-clock soak and clean Linux/macOS installer qualification remain external release-engineering tasks.',
    workaround: 'Run the supplied stability and platform procedures on named target hardware before claiming those qualifications.'
  }
]
await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
console.log('Wrote v3.5 release environment, SBOM, platform, localization, and exact known-issue evidence.')
