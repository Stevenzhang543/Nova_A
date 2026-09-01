import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), sourceDirectory = join(root, 'reference-projects/projects/creator-v680-large-world')
const references = [
  { id: 'creator-v690-package-shipping', uuid: '69000000-0000-4000-8000-000000000001', name: 'Nova 6.9 Offline Package Shipping', description: 'Playable project plus reproducible package, offline mirror, signed trust/update and release-candidate qualification.' },
  { id: 'creator-v690-semantic-collaboration', uuid: '69000000-0000-4000-8000-000000000002', name: 'Nova 6.9 Semantic Collaboration', description: 'Playable project plus ownership-aware change lists and a real three-way scene conflict fixture.' }
]
for (const reference of references) {
  const target = join(root, `reference-projects/projects/${reference.id}`); await rm(target, { recursive: true, force: true }); await mkdir(target, { recursive: true }); await cp(sourceDirectory, target, { recursive: true })
  const projectPath = join(target, 'project.nova'), project = JSON.parse(await readFile(projectPath, 'utf8'))
  project.engineVersion = '6.9.0'; project.projectMetadata = { ...project.projectMetadata, id: reference.uuid, name: reference.name, template: reference.id, description: reference.description, updatedAt: '2026-09-01T00:00:00.000Z' }; project.manifest = { ...project.manifest, projectUuid: reference.uuid, name: reference.name }
  project.projectSettings.build.gameName = reference.name
  if (project.projectSettings?.build?.platform) project.projectSettings.build.platform.version = '6.9.0'
  await writeFile(projectPath, `${JSON.stringify(project, null, 2)}\n`)
  await writeFile(join(target, 'README.md'), `# ${reference.name}\n\nEngine **6.9.0** · Project Format 2/schema 29.\n\n${reference.description}\n\nOpen the project, Play it, then follow \`test-controls.json\`. Network operations and application updates remain disabled until explicit opt-in. External signing and clean-machine results are intentionally not included.\n`)
  await writeFile(join(target, 'test-controls.json'), `${JSON.stringify({ engineVersion: '6.9.0', reference: reference.id, workflow: reference.id.includes('package') ? ['play reference', 'validate package fixture', 'pack twice and compare hash', 'create offline mirror', 'inspect package review and solver', 'install/update/rollback', 'import signed bulletin fixture', 'stage signed updater plan', 'build portable and web', 'inspect SBOM/provenance/patch/symbol/crash evidence'] : ['play reference', 'enable Team Workflow', 'mark baseline', 'import merge-fixtures/theirs.nova', 'inspect automatic merge', 'resolve scene-name conflict', 'create Whitelist-owned change list', 'save/reopen/play/build'], expected: { playable: true, projectFormat: 2, schema: 29, implicitNetworkOperation: false, exactReleaseArtifacts: 11, externalSigningClaimed: false } }, null, 2)}\n`)
  if (reference.id.includes('package')) {
    const fixture = join(target, 'package-fixture'); await mkdir(join(fixture, 'src'), { recursive: true })
    const contents = 'fn start() { print("Nova_A offline package fixture"); }\n', hash = 'd1f4570a9e3f19fc59b219d227c351466fa611160612620883534064d6ff6a6d'
    await writeFile(join(fixture, 'src/index.rhai'), contents)
    await writeFile(join(fixture, 'package.json'), `${JSON.stringify({ manifestVersion: 1, id: 'top.whitelists.reference.shipping', name: 'Nova Shipping Reference', version: '1.0.0', description: 'Local-only Package Manifest 1 publisher qualification.', engine: '>=6.0.0 <7.0.0', dependencies: {}, dependencyHashes: {}, entryPointType: 'runtime', apiCompatibility: '>=1 <2', pluginApi: null, native: false, sha256: hash, signature: 'ed25519-v1:external-fixture-signature', publisher: 'Whitelist', publisherVerified: false, permissions: ['log'], rating: null, securityUrl: 'https://github.com/Stevenzhang543/Nova_A/security', documentationUrl: 'https://github.com/Stevenzhang543/Nova_A/', license: 'MIT', licenseUrl: 'https://github.com/Stevenzhang543/Nova_A/blob/main/LICENSE.md', provenance: 'nova-v690-reference-source', certification: 'compatible', vulnerabilityPolicy: 'Critical and High findings block Stable publishing.', visualNodes: [] }, null, 2)}\n`)
  } else {
    const fixture = join(target, 'merge-fixtures'); await mkdir(fixture, { recursive: true }); const base = structuredClone(project), ours = structuredClone(project), theirs = structuredClone(project)
    base.scenes[0].name = 'Shared Arena'; ours.scenes[0].name = 'Ours Arena'; theirs.scenes[0].name = 'Theirs Arena'; ours.projectMetadata.description = 'Independent ours metadata change.'; theirs.projectSettings.build.gameName = 'Theirs Release Candidate'
    await Promise.all([['base.nova', base], ['ours.nova', ours], ['theirs.nova', theirs]].map(([name, value]) => writeFile(join(fixture, name), `${JSON.stringify(value, null, 2)}\n`)))
  }
}
console.log(`Generated ${references.length} Nova_A v6.9 package/shipping and semantic-collaboration references.`)
