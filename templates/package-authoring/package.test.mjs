/** 源码模块 templates/package-authoring/package.test.mjs：文件内函数说明记录接口、调用与状态处理。 */
import assert from 'node:assert/strict'
import manifest from './manifest.json' with { type: 'json' }

assert.match(manifest.version, /^\d+\.\d+\.\d+/)
assert.match(manifest.engine, /[<>=]/)
assert.ok(['editor', 'build', 'importer', 'runtime', 'template'].includes(manifest.entryPointType))
assert.ok(Array.isArray(manifest.permissions))
assert.equal(Object.keys(manifest.dependencies).every(/* 调用 /^[a-f0-9]{64}$/.test(manifest.dependencyHashes[id] ?? '') 并返回调用结果。 */ id => /^[a-f0-9]{64}$/.test(manifest.dependencyHashes[id] ?? '')), true)
