import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const specs = [
  { id: 'ecosystem-v59-wasm-api-matrix', base: 'package-v50-extension-sdk', title: 'WASM Plugin API Matrix', focus: ['ten permission-scoped contribution families', 'WASM bounds and failure isolation', 'reload/unload generation cancellation'] },
  { id: 'ecosystem-v59-malicious-corpus', base: 'package-v50-extension-sdk', title: 'Malicious Package Corpus', focus: ['path traversal and archive bomb rejection', 'hidden executable and permission rejection', 'native sidecar separation'] },
  { id: 'delivery-v59-offline-registry', base: 'build-v50-release-pipeline', title: 'Offline Registry Delivery', focus: ['canonical package manifest and Ed25519 request', 'bounded offline registry import', 'no download or implicit execution'] },
  { id: 'delivery-v59-platform-matrix', base: 'build-v50-platform-matrix', title: 'Platform Template Matrix', focus: ['Windows/Web pinned templates', 'Linux/macOS matching-host gates', 'Android SDK/template/device fail-closed gates'] }
]

for (const spec of specs) {
  const source = join(root, 'reference-projects/projects', spec.base), output = join(root, 'reference-projects/projects', spec.id)
  await rm(output, { recursive: true, force: true }); await mkdir(output, { recursive: true }); await cp(source, output, { recursive: true })
  const projectPath = join(output, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
  project.engineVersion = '5.9.0'; project.projectFormatMajor = 2; project.formatVersion = 29; project.projectName = spec.title
  project.projectSettings ??= {}; project.projectSettings.ecosystem = { pluginApi: 2, packageManifest: 1, nativeAbi: 1, exportTemplate: 1, ciMatrix: 1, offline: true, implicitExecution: false, implicitNetworkOperation: false, focus: spec.focus }
  if (project.projectSettings.build?.releaseEngineering) project.projectSettings.build.releaseEngineering.release = '5.9.0'
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(output, 'README.md'), `# ${spec.title}\n\nEngine **5.9.0**, Project Format 2/schema 29. This reference covers ${spec.focus.join(', ')}.\n\n## Test workflow\n\n1. Open **Ecosystem Studio** and select the matching Extensions, Package Lab, Templates, Delivery or Audit tab.\n2. Inspect every permission and qualification gate before loading, trusting or preparing a plan.\n3. Confirm that blocked samples remain blocked and that opening the project performs no network or process action.\n4. Save, reload and repeat the local verification.\n\n## External boundary\n\nPublisher signing, independent clean-machine lifecycle and matching-host Linux/macOS evidence remain pending until captured on those systems. Android remains blocked until every SDK, template, signing, device, install/launch, input and audio gate passes.\n`)
  await writeFile(join(output, 'test-controls.json'), `${JSON.stringify({ engineVersion: '5.9.0', reference: spec.id, actions: spec.focus, expected: { localOnly: true, implicitExecution: false, implicitNetworkOperation: false } }, null, 2)}\n`)
  await writeFile(join(output, 'expected-output.json'), `${JSON.stringify({ engineVersion: '5.9.0', status: 'passed', projectFormat: 2, schema: 29, pluginApi: 2, packageManifest: 1, nativeAbi: 1, exportTemplate: 1, ciMatrix: 1, externalCertification: 'pending' }, null, 2)}\n`)
}
console.log('Generated four Nova_A v5.9.0 ecosystem and platform-delivery reference projects.')
