import assert from 'node:assert/strict'
import manifest from './manifest.json' with { type: 'json' }

assert.match(manifest.version, /^\d+\.\d+\.\d+/)
assert.match(manifest.engine, /[<>=]/)
assert.ok(['editor', 'build', 'importer', 'runtime', 'template'].includes(manifest.entryPointType))
assert.ok(Array.isArray(manifest.permissions))
assert.equal(Object.keys(manifest.dependencies).every(id => /^[a-f0-9]{64}$/.test(manifest.dependencyHashes[id] ?? '')), true)
