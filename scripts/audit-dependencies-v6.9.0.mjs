import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const version = process.env.NOVA_DEPENDENCY_AUDIT_VERSION || '6.9.0', root = dirname(dirname(fileURLToPath(import.meta.url)))
const [packageSource, lockSource] = await Promise.all([readFile(join(root, 'package.json'), 'utf8'), readFile(join(root, 'pnpm-lock.yaml'), 'utf8')]), pkg = JSON.parse(packageSource)
const declared = Object.keys({ ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}), ...(pkg.optionalDependencies ?? {}) }).sort(), missing = declared.filter(name => !lockSource.includes(`  ${name}:`) && !lockSource.includes(`'${name}':`) && !lockSource.includes(`/${name}@`))
const checks = [
  { id: 'DEPENDENCY-VERSION', status: pkg.version === version ? 'passed' : 'failed', detail: `Package authority is ${pkg.version}.` },
  { id: 'DEPENDENCY-LOCKFILE', status: /^lockfileVersion:/m.test(lockSource) && /^importers:/m.test(lockSource) ? 'passed' : 'failed', detail: 'Frozen pnpm lockfile contains a version and importer graph.' },
  { id: 'DEPENDENCY-COVERAGE', status: missing.length === 0 ? 'passed' : 'failed', detail: missing.length ? `Direct declarations missing from lock text: ${missing.join(', ')}` : `${declared.length} direct declarations are represented in the lockfile.` },
  { id: 'DEPENDENCY-INTEGRITY', status: /integrity: sha(256|512)-/m.test(lockSource) ? 'passed' : 'failed', detail: 'Registry packages retain cryptographic integrity records.' }
]
const failed = checks.filter(item => item.status === 'failed'), report = { format: `nova-v${version}-dependency-lock-audit`, version: 1, engineVersion: version, generatedAt: new Date().toISOString(), packageManager: pkg.packageManager, lockfile: 'pnpm-lock.yaml', lockfileSha256: createHash('sha256').update(lockSource).digest('hex'), declaredPackages: declared.length, checks, registryAdvisories: { status: 'pending-external', claimed: false, reason: 'Live advisory lookup requires explicit authorization to send dependency metadata to the package registry. Signed offline Nova_A bulletins are tested separately.' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, `release-audits/v${version}-dependency-audit.json`), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) process.exit(1)
console.log(`Nova_A v${version} local dependency lock audit passed; live registry advisories remain pending external authorization.`)
