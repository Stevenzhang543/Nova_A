import { copyFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
process.env.NOVA_DEPENDENCY_AUDIT_VERSION = '26.6.0'
await import('./audit-dependencies-v6.9.0.mjs')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
await copyFile(join(root, 'release-audits/v26.6.0-dependency-audit.json'), join(root, 'release-audits/v26.06-dependency-audit.json'))
