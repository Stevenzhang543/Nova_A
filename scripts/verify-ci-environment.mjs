/** Check source/toolchain identities and reject obsolete release audits in automatic CI. */
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { assertReleaseSourceVersions } from './release-source-snapshot.mjs'

const root = process.cwd(), pkg = JSON.parse(await readFile('package.json', 'utf8'))
const release = pkg.version.replace(/\.0$/, ''), checks = []
await assertReleaseSourceVersions(root, release)
checks.push('Frontend, Rust, Tauri and lockfile release identities agree')
assert.equal((await readFile('.node-version', 'utf8')).trim(), pkg.engines.node)
assert.equal(pkg.packageManager, `pnpm@${pkg.engines.pnpm}`)
const rust = (await readFile('rust-toolchain.toml', 'utf8')).match(/^channel\s*=\s*"([^"]+)"/m)?.[1]
assert.ok(rust)
for (const name of ['ci.yml', 'nova-validation.yml', 'release-matrix.yml', 'platform-recipes.yml']) {
  const source = await readFile(`.github/workflows/${name}`, 'utf8')
  const actions = source.match(/uses: dtolnay\/rust-toolchain@/g) ?? []
  const pins = [...source.matchAll(/toolchain:\s*([\d.]+)/g)].map(match => match[1])
  assert.equal(pins.length, actions.length, `${name}: every Rust setup must use the repository pin`)
  assert.ok(pins.every(pin => pin === rust), `${name}: Rust setup differs from rust-toolchain.toml`)
  assert.ok(source.includes('node-version-file: .node-version'), name)
  assert.ok(!/pnpm audit:v\d|node scripts\/audit-v\d/.test(source), `${name}: obsolete hard-coded release audit`)
  if (name === 'release-matrix.yml') assert.ok(source.includes('run: pnpm run audit'), 'Explicitly invoke the project audit script; pnpm audit is a different built-in command')
  checks.push(`${name}: explicit matching Rust/Node setup; no obsolete release audit command`)
}
assert.ok(!/audit:v\d/.test(pkg.scripts.audit), 'Default audit must not require historical release evidence')
await mkdir('release-audits', { recursive: true })
await writeFile(`release-audits/v${release}-ci-environment.json`, JSON.stringify({ format: 'nova-ci-environment-verification', version: 1, release, engineVersion: pkg.version, generatedAt: new Date().toISOString(), status: 'passed', checks, scope: 'Local configuration/source assertions. Hosted GitHub Actions and non-Windows toolchains were not executed.' }, null, 2) + '\n')
console.log(`Environment/source checks passed: ${checks.length}; hosted CI execution remains unverified.`)
