import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const output = join(root, 'release-fixtures/v6.8.0')
await mkdir(output, { recursive: true })

function fingerprint(count, seed) {
  let hash = 0x811c9dc5, state = seed >>> 0
  for (let index = 0; index < count; index++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const x = (state & 0xffff) - 32768
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    const y = (state & 0xffff) - 32768
    hash = Math.imul(hash ^ index, 0x01000193) >>> 0
    hash = Math.imul(hash ^ x, 0x01000193) >>> 0
    hash = Math.imul(hash ^ y, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

for (const count of [10_000, 50_000, 100_000]) {
  const fixture = {
    format: 'nova-large-world-fixture', version: 1, engineVersion: '6.8.0', count, seed: 0x4e4f5641,
    generator: 'lcg-1664525-1013904223', spatialCellSize: 128, layout: 'deterministic-point-grid',
    expectedFingerprint: fingerprint(count, 0x4e4f5641),
    assertions: ['finite coordinates', 'stable UUID order', 'deterministic spatial queries', 'bounded component columns', 'no fixed-step semantic change']
  }
  await writeFile(join(output, `${count}.json`), `${JSON.stringify(fixture, null, 2)}\n`)
}
await writeFile(join(output, 'README.md'), `# Nova_A 6.8.0 large-world fixtures

These compact manifests generate 10,000, 50,000 and 100,000 deterministic point records during verification. They avoid committing hundreds of megabytes while still validating the complete generated population, fingerprint, spatial order, bounded scheduler behavior and memory trend. They are performance fixtures, not authored scenes and not hardware certification.
`)
console.log('Generated Nova_A v6.8.0 deterministic 10k/50k/100k fixture manifests.')
