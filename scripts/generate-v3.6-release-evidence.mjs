import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_EVIDENCE_VERSION = '3.6.0'
await import('./generate-v3.3-release-evidence.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url))), path = join(root,'release-audits','v3.6.0-known-issues.json'), evidence = JSON.parse(await readFile(path,'utf8'))
evidence.items = [{ severity:'S2', area:'screen reader integration', issue:'Tier-1 semantic hooks expose names, roles, states, values, focus and live-region metadata; operating-system accessibility bridges require target-platform adapters.', workaround:'Use the shipped DOM/ARIA overlay on web and qualify native bridges on each target platform.' }, { severity:'S2', area:'release qualification', issue:'A 24-hour wall-clock soak and clean Linux/macOS installer qualification remain external release-engineering tasks.', workaround:'Run the supplied stability and platform procedures on named target hardware.' }, { severity:'S3', area:'optional updater integration', issue:'Tauri 2.9.6 reports that its optional __TAURI_BUNDLE_TYPE marker is absent while patching MSI/NSIS output. Nova_A 3.6 does not enable the updater plugin; both installers complete.', workaround:'Normal portable/MSI/NSIS installation is unaffected. Requalify the marker before enabling automatic updates.' }]
await writeFile(path,`${JSON.stringify(evidence,null,2)}\n`)
console.log('Wrote v3.6 build, SBOM, platform, accessibility/localization and known-issue evidence.')
