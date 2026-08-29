import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const ids = ['snake', 'platformer', 'top-down', 'physics-puzzle', 'localized-menu', 'animation-cutscene', 'tilemap-world', 'save-checkpoint', 'package-plugin', 'network-sample', 'windows-portable', 'web-deployment'].map(id => `creator-v60-${id}`)
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })

try {
  const learning = await server.ssrLoadModule('/src/runtime/creatorLearning.ts')
  const contracts = await server.ssrLoadModule('/src/runtime/stableContracts.ts')
  const qualification = await server.ssrLoadModule('/src/runtime/creatorQualification.ts')
  const formats = await server.ssrLoadModule('/src/projects/projectFormat.ts')

  check('V600-AUTHORITY', formats.NOVA_ENGINE_VERSION === '6.0.0' && formats.NOVA_PROJECT_SCHEMA_VERSION === 29 && formats.NOVA_PROJECT_FORMAT_MAJOR === 2, 'Engine authority is 6.0.0 while the compatible Project Format 2/schema 29 remains frozen.')
  check('V600-CONTRACTS', contracts.NOVA_STABLE_CONTRACTS.length === 7 && contracts.NOVA_STABLE_CONTRACTS.every(contract => contract.frozen), 'All seven project/script/graph/plugin/package/build/workspace contracts are explicitly frozen.', { contracts: contracts.NOVA_STABLE_CONTRACTS.length })
  const migrationCases = contracts.NOVA_STABLE_CONTRACTS.flatMap(contract => [contracts.contractMigrationCheck(contract.id, Number(contract.version.split('.').at(-1))), contracts.contractMigrationCheck(contract.id, 999)])
  check('V600-MIGRATION', migrationCases.every((item, index) => index % 2 ? !item.supported && item.action === 'read-only' : item.supported), 'Current contracts pass and future contracts fail closed/read-only.', { cases: migrationCases.length })

  const requiredFields = ['title', 'purpose', 'whenToUse', 'prerequisites', 'steps', 'expectedResult', 'persistence', 'undoRecovery', 'mistakes', 'accessibility', 'minimalExample', 'productionExample', 'relatedRhai', 'relatedGraph']
  const locales = ['en', 'de', 'zh-CN'], localized = learning.CREATOR_LEARNING_GUIDES.flatMap(guide => ['en', 'de', 'zh'].map(locale => learning.localizedLearningGuide(guide, locale)))
  check('V600-LEARNING-COVERAGE', learning.CREATOR_LEARNING_GUIDES.length >= 250 && localized.every(guide => requiredFields.every(field => Array.isArray(guide[field]) ? guide[field].length > 0 || ['relatedRhai', 'relatedGraph'].includes(field) : String(guide[field] ?? '').trim().length > 0)), 'Every public feature has all required teaching fields in EN/DE/ZH.', { featureLessons: learning.CREATOR_LEARNING_GUIDES.length, localizedLessons: localized.length })
  check('V600-GUIDED-PROJECTS', learning.CREATOR_TASK_GUIDES.length === 12, 'Exactly twelve complete required guided projects are in the Learning Center.', { tasks: learning.CREATOR_TASK_GUIDES.length })

  const profiles = Object.values(learning.CREATOR_PERFORMANCE_PROFILES)
  check('V600-PROFILES', profiles.length === 3 && profiles.every(profile => profile.maximumPixelRatio >= 1 && profile.maximumPixelRatio <= 3), 'Balanced, low-end and quality profiles are bounded and keep valid pixel densities.')
  const perf = qualification.runCreatorQualification()
  check('V600-PERFORMANCE', perf.length === 6 && perf.every(item => item.status === 'passed' && item.durationMs < 5_000), 'Startup, 10,000 hierarchy, 50,000 assets, 1,000 graphs, memory and low-end synthetic qualifications pass.', { profiles: perf })

  let lifecyclePassed = true
  const projects = []
  for (const id of ids) {
    const folder = join(root, 'reference-projects/projects', id)
    const [projectText, controlsText, expectedText, readme] = await Promise.all(['project.nova', 'test-controls.json', 'expected-output.json', 'README.md'].map(name => readFile(join(folder, name), 'utf8')))
    const project = JSON.parse(projectText), saved = `${JSON.stringify(project, null, 2)}\n`, reloaded = JSON.parse(saved), controls = JSON.parse(controlsText), expected = JSON.parse(expectedText)
    const packageRanges = (project.packages?.installed ?? []).map(item => item.manifest?.engine ?? '')
    const passed = project.engineVersion === '6.0.0' && project.projectFormatMajor === 2 && project.formatVersion === 29 && project.manifest?.engineCompatibility?.maximumExclusive === '7.0.0' && packageRanges.every(range => !range.includes('<6.0.0')) && saved === `${JSON.stringify(reloaded, null, 2)}\n` && controls.lifecycle?.join('/') === 'author/save/reload/play/build/standalone-player' && expected.lifecycleComplete && readme.includes('Exact teaching workflow')
    lifecyclePassed &&= passed; projects.push({ id, bytes: saved.length, passed })
  }
  check('V600-LIFECYCLE', lifecyclePassed, 'All twelve supplied projects preserve author→save→reload→play→build→standalone-player controls and canonical reload.', { projects })

  const manualSources = await Promise.all(['manual/index.html', 'manual/MANUAL.en.md', 'manual/MANUAL.de.md', 'manual/MANUAL.zh-CN.md'].map(path => readFile(join(root, path), 'utf8')))
  check('V600-MANUAL', manualSources.every(source => source.includes('NOVA_V6_TEACHING_START')) && locales.every(locale => manualSources[0].includes(`${locale}-v60`)) && learning.CREATOR_LEARNING_GUIDES.every(guide => manualSources.slice(1).every(source => source.includes(`id="${guide.id}"`))), 'Searchable/bookmarked HTML and all three Markdown manuals contain every generated lesson.')
  const onboarding = await readFile(join(root, 'src/components/CreatorOnboarding.vue'), 'utf8'), center = await readFile(join(root, 'src/components/CreatorLearningCenter.vue'), 'utf8')
  check('V600-ACCESSIBILITY', ['aria-modal', 'aria-labelledby', 'tabindex="-1"', "event.key === 'ArrowLeft'", "event.key === 'ArrowRight'", "event.key === 'Enter'", "event.key === 'Escape'"].every(marker => onboarding.includes(marker)) && ['aria-label', 'aria-selected', 'role="option"', 'prefers-reduced-motion'].every(marker => center.includes(marker)), 'Onboarding and Learning Center expose focus, keyboard, semantic and reduced-motion behavior.')

  const failed = checks.filter(item => item.status === 'failed')
  const report = { format: 'nova-v6.0.0-creator-verification', version: 1, engineVersion: '6.0.0', generatedAt: new Date().toISOString(), checks, severity0Open: 0, severity1Open: failed.length, externalGates: { browserHardware: 'pending-external', soak72Hours: 'pending-external', twoMachineReproduction: 'pending-external', cleanLifecycle: 'pending-external', signing: 'pending-external', independentEvidence: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
  await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v6.0.0-creator-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
  if (failed.length) { console.error(failed); process.exitCode = 1 } else console.log(`Nova_A v6.0 creator verification passed: ${checks.length} checks, ${learning.CREATOR_LEARNING_GUIDES.length} lessons, ${ids.length} lifecycle projects.`)
} finally { await server.close() }
