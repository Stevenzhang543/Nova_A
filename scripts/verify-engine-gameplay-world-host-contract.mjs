import assert from 'node:assert/strict'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import ts from 'typescript'
import { canonicalCoreBeforeWorldHost, canonicalCompatBeforeWorldHost } from './lib/gameplayWorldHostContract.mjs'
import {canonicalBeforeAudioOwner} from './lib/audioOwnerContract.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const reportSuffix = process.argv.find(value => value.startsWith('--report-dir='))?.slice('--report-dir='.length) ?? '.cache/engine-overhaul/gameplay-world-host'
assert.ok(reportSuffix.startsWith('.cache/engine-overhaul/') && !reportSuffix.includes('..') && !reportSuffix.startsWith('/'), 'Keep the chosen report inside the audit workspace')
const directory = join(root, reportSuffix)
const checks = [], graphs = [], sourceHashes = {}
const sha = value => createHash('sha256').update(value).digest('hex'), check = (name, fn) => { fn(); checks.push(name) }
let passed = false, failure = null
try {
  const current = await readFile(join(root, 'src/runtime/GameplayRuntimeCore.ts'), 'utf8'), original = await canonicalCoreBeforeWorldHost(current)
  check('entire-Core-byte-exact-inverse-whitelist-preserves-every-other-body-and-default', () => assert.equal(sha(original), 'a2695bbf0f4877c690baa41a14c026a28b7e252e57006ae0286c433cedf5fc07'))
  const facade = await readFile(join(root, 'src/runtime/GameplayRuntime.ts'), 'utf8'), oldFacade = await canonicalCompatBeforeWorldHost(facade)
  check('entire-compat-retains-public-API-and-only-adds-original-owner-composition', () => assert.equal(sha(oldFacade), '76103adb1fe75a0bbcec52ee51bc5ac273dc6b783b8fb6dbf2f3df284678ce38'))
  const audio = canonicalBeforeAudioOwner(await readFile(join(root, 'src/runtime/audio.ts'), 'utf8'), 'src/runtime/audio.ts'), pureAudio = await readFile(join(root, 'src/runtime/audioSettingsContracts.ts'), 'utf8')
  const names = [...pureAudio.matchAll(/export (?:type|interface) (\w+)/g)].map(item => item[1])
  check('all-eight-audio-settings-declarations-move-byte-exact-with-legacy-reexports', () => { assert.equal(names.length, 8); assert.equal(sha(pureAudio), 'bb3fb1eade7c84083032a36252698e9608d6d9f608412aa15099895ad9bfbe38'); assert(audio.includes(`export type { ${names.join(', ')} } from './audioSettingsContracts'`)) })
  const restoredAudio = audio.replace(`import type { ${names.join(', ')} } from './audioSettingsContracts'\nexport type { ${names.join(', ')} } from './audioSettingsContracts'\n\n`, pureAudio)
  check('all-audio-runtime-functions-and-defaults-remain-byte-exact', () => assert.equal(sha(restoredAudio), '63fa89167bb702767ff93a939264270d092f9a23a41b7fc18572001259694847'))
  const scene = await readFile(join(root, 'src/runtime/runtimeSceneTransition.ts'), 'utf8'), pureScene = await readFile(join(root, 'src/runtime/runtimeSceneContracts.ts'), 'utf8'), declaration = pureScene.slice(0, -1)
  check('Prepared-three-member-contract-moves-exact-and-preserves-old-public-path', () => { assert.equal(sha(pureScene), 'ec7306349547f62278ea220ed93d7fa4d90b62b307d43723ff34275531020696'); assert.equal(sha(scene.replace("import type { PreparedRuntimeSceneTransition } from './runtimeSceneContracts'\nexport type { PreparedRuntimeSceneTransition } from './runtimeSceneContracts'", declaration)), '66b2b9adf8925a05ec89c3773fefd15dfff4edea1fb06cc9fb49c8373dfec1da') })
  const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile), options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options
  for (const entry of ['src/runtime/gameplayWorldHost.ts', 'src/runtime/audioSettingsContracts.ts', 'src/runtime/runtimeSceneContracts.ts']) {
    const pending = [resolve(root, entry)], visited = new Set(), forbidden = []
    for (let index = 0; index < pending.length; index++) {
      const path = pending[index]
      if (visited.has(path)) continue
      visited.add(path)
      const source = await readFile(path, 'utf8'), ast = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true)
      sourceHashes[relative(root, path).replaceAll('\\', '/')] = sha(source)
      const references = new Set(), add = node => { if (node && ts.isStringLiteralLike(node)) references.add(node.text) }
      const visit = node => {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier)
        if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal)
        if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression)
        if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')) add(node.arguments[0])
        ts.forEachChild(node, visit)
      }
      visit(ast)
      for (const specifier of references) {
        if (!specifier) continue
        const resolved = ts.resolveModuleName(specifier, path, options, ts.sys).resolvedModule, target = resolved?.resolvedFileName, id = target ? relative(root, target).replaceAll('\\', '/') : specifier
        if (/^(?:vue|@vue\/|pinia)/.test(specifier) || /^src\/(?:editor|store|components|layout|ui)\//.test(id) || /^src\/assets\/(?:AssetDatabase|importPipeline)\./.test(id)) forbidden.push({ path, specifier, target })
        else if (target && !id.startsWith('..') && !id.startsWith('node_modules/')) pending.push(resolve(target))
        else if (!resolved && specifier.startsWith('.')) forbidden.push({ path, specifier, unresolved: true })
      }
    }
    graphs.push({ entry, reachableLocalModules: visited.size, forbidden, scope: 'Source graph includes erased type imports; type-only contract is not a fake compiled runtime entry.' })
    check('pure-source-type-graph-' + entry, () => assert.deepEqual(forbidden, []))
  }
  for (const path of ['src/runtime/GameplayRuntimeCore.ts', 'src/runtime/GameplayRuntime.ts', 'src/editor/gameplayWorldHost.ts', 'scripts/fixtures/gameplay-world-host-transform-v1.json']) sourceHashes[path] = sha(await readFile(join(root, path)))
  passed = true
} catch (error) { failure = error.stack ?? String(error); throw error }
finally { await mkdir(directory, { recursive: true }); await writeFile(join(directory, 'source-contract.json'), JSON.stringify({ status: passed ? 'passed' : 'failed', generatedAt: new Date().toISOString(), checks, graphs, sourceHashes, failure, limits: ['Does not certify full Core/Player isolation, foreign-world or multi-session safety, Rust world authority or Engine Worker execution.'] }, null, 2)) }
console.log(`Gameplay WorldHost source contract: ${checks.length} passed`)
