/** 验证脚本（v26.10-readiness）：组织对应功能与边界场景检查，断言行为并汇总验证结果。 */
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const release = '26.10'
const machineVersion = '26.10.0'
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const compiled = await mkdtemp(join(tmpdir(), 'nova-v2610-readiness-'))
const checks = []
const check = /* 调用 checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics }) 并返回调用结果。 */ (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
const source = /* 调用 readFile(join(root, path), 'utf8') 并返回调用结果。 */ path => readFile(join(root, path), 'utf8')
const exists = /** 检查项目根目录下指定路径是否可以访问。 */ async path => { try { await access(join(root, path)); return true } catch { return false } }

globalThis.crypto ??= (await import('node:crypto')).webcrypto
globalThis.localStorage ??= { /* 返回固定值 null。 */ getItem() { return null }, /** 隔离存储桩忽略写入，不持久化生成过程数据。 */ setItem() {}, /** 隔离存储桩忽略删除请求。 */ removeItem() {} }

try {
  await build({
    configFile: false,
    root,
    logLevel: 'warn',
    ssr: { noExternal: true },
    build: {
      ssr: true,
      outDir: compiled,
      emptyOutDir: true,
      rollupOptions: {
        input: {
          platform: join(root, 'src/runtime/stableCreatorPlatform.ts'),
          gaps: join(root, 'src/runtime/platformGapRegister.ts'),
          learning: join(root, 'src/runtime/creatorLearning.ts')
        },
        output: { entryFileNames: '[name].mjs', chunkFileNames: 'chunks/[name]-[hash].mjs' }
      }
    }
  })

  const load = /* 调用 import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`) 并返回调用结果。 */ name => import(`${pathToFileURL(join(compiled, `${name}.mjs`)).href}?v=${Date.now()}`)
  const [platform, gaps, learning] = await Promise.all(['platform', 'gaps', 'learning'].map(load))

  check('V2610-RELEASE-AUTHORITY', platform.CREATOR_PLATFORM_SUMMARY.release === release && platform.CREATOR_PLATFORM_SUMMARY.machineVersion === machineVersion && platform.CREATOR_CONTRACT_REVIEW.release === release && platform.CREATOR_CONTRACT_REVIEW.machineVersion === machineVersion, 'Readiness and contract authorities use 26.10 / 26.10.0 rather than a stale release route.')
  check('V2610-CONTRACT-DECISION', platform.CREATOR_CONTRACT_REVIEW.reviewedContracts === 7 && platform.CREATOR_CONTRACT_REVIEW.currentContractsFrozen === true && platform.CREATOR_CONTRACT_REVIEW.schemaChangeApproved === false && platform.CREATOR_CONTRACT_REVIEW.breakingChangesApproved === 0 && platform.CREATOR_CONTRACT_REVIEW.nextContractDecision === 'deferred', 'All seven additive contracts remain frozen and no breaking migration is inferred from the calendar version.')

  const allowedStatuses = new Set(['covered', 'not-applicable', 'external'])
  const allowedAuthorities = new Set(['implementation', 'validation', 'transaction', 'serialization', 'runtime-export', 'documentation', 'automated-test', 'scope-contract', 'external-evidence'])
  const expectedDimensions = ['binding', 'validation', 'undo', 'persistence', 'runtimeExport', 'documentation', 'tests']
  const policyPrefixes = platform.CREATOR_READINESS_POLICIES.map(/* 返回 item.catalogPrefix 的当前值。 */ item => item.catalogPrefix)
  const uniquePolicyPrefixes = new Set(policyPrefixes)
  const exactPolicyCoverage = learning.CREATOR_LEARNING_GUIDES.every(/* 比较 policyPrefixes.filter(prefix => guide.id === prefix || guide.id.startsWith(`${prefix}-`)).length 与 1，返回严格相等的判断结果。 */ guide => policyPrefixes.filter(/* 先计算 guide.id === prefix；仅当其为假值时求右侧 guide.id.startsWith(`${prefix}-`)，返回短路求值结果。 */ prefix => guide.id === prefix || guide.id.startsWith(`${prefix}-`)).length === 1)
  check('V2610-POLICY-COVERAGE', uniquePolicyPrefixes.size === policyPrefixes.length && exactPolicyCoverage && platform.CREATOR_PLATFORM_READINESS.length === learning.CREATOR_LEARNING_GUIDES.length, 'Every catalog operation matches exactly one named domain policy and no catch-all policy exists.', { policies: policyPrefixes.length, operations: learning.CREATOR_LEARNING_GUIDES.length })

  const readinessProblems = []
  for (const item of platform.CREATOR_PLATFORM_READINESS) {
    const dimensionKeys = Object.keys(item.dimensions).sort()
    if (JSON.stringify(dimensionKeys) !== JSON.stringify([...expectedDimensions].sort())) readinessProblems.push(`${item.id}: dimension keys ${dimensionKeys.join(',')}`)
    for (const dimension of expectedDimensions) {
      const value = item.dimensions[dimension]
      if (!value) { readinessProblems.push(`${item.id}/${dimension}: missing`); continue }
      if (!allowedStatuses.has(value.status)) readinessProblems.push(`${item.id}/${dimension}: status ${value.status}`)
      if (!allowedAuthorities.has(value.authority)) readinessProblems.push(`${item.id}/${dimension}: authority ${value.authority}`)
      if (!value.source || !value.route || !value.detail) readinessProblems.push(`${item.id}/${dimension}: incomplete evidence`)
      if (!value.route.includes(item.id)) readinessProblems.push(`${item.id}/${dimension}: route is not operation-specific`)
      if (/creator-learning:|preconditions:|platform-inventory|v26\.06/i.test(value.route)) readinessProblems.push(`${item.id}/${dimension}: stale or generic route ${value.route}`)
      if (value.status === 'external' && (!value.gapId || !gaps.PLATFORM_GAP_REGISTER.some(/* 先计算 gap.id === value.gapId；仅当其为真值时求右侧 gap.status === 'deferred-external'，返回短路求值结果。 */ gap => gap.id === value.gapId && gap.status === 'deferred-external'))) readinessProblems.push(`${item.id}/${dimension}: external route lacks deferred gap`)
      if (value.status === 'not-applicable' && value.authority !== 'scope-contract') readinessProblems.push(`${item.id}/${dimension}: N/A lacks scope authority`)
      if (value.status === 'covered' && ['scope-contract', 'external-evidence'].includes(value.authority)) readinessProblems.push(`${item.id}/${dimension}: covered uses non-local authority`)
    }
  }
  check('V2610-SEVEN-DIMENSIONS', readinessProblems.length === 0 && platform.CREATOR_PLATFORM_SUMMARY.uncovered === 0, 'Every operation has all seven non-generic, operation-specific dispositions with a source and authority.', { problems: readinessProblems.slice(0, 30), summary: platform.CREATOR_PLATFORM_SUMMARY })

  const sourcePaths = new Set(platform.CREATOR_PLATFORM_READINESS.flatMap(/** 提取各预期验收维度对应的证据来源。 */ item => expectedDimensions.map(/* 返回 item.dimensions[dimension].source 的当前值。 */ dimension => item.dimensions[dimension].source)).filter(/* 返回 path.startsWith('pending-external/') 的逻辑取反结果。 */ path => !path.startsWith('pending-external/')))
  const missingSources = []
  for (const path of sourcePaths) if (!(await exists(path))) missingSources.push(path)
  check('V2610-EVIDENCE-SOURCES', missingSources.length === 0, 'Every local readiness source resolves inside the release tree.', { checked: sourcePaths.size, missing: missingSources })

  const gapStatuses = new Set(['closed', 'intentional-scope', 'deferred-external', 'open-blocking'])
  const requiredGapIds = [
    'contracts-seven-frozen-authorities', 'windows-web-local-delivery', 'package-native-execution-boundary',
    'arbitrary-vm-suspension', 'static-rhai-type-system', 'public-remote-debug-service', 'multi-instance-process-isolation',
    'full-simulation-network-rollback', 'windowless-dedicated-server', 'mandatory-cloud-services', 'three-dimensional-production',
    'proprietary-console-sdks', 'publisher-signing-identity', 'disposable-clean-machine-lifecycle',
    'second-machine-byte-reproduction', 'linux-matching-host', 'macos-matching-host', 'android-production-device',
    'ios-production-host', 'firefox-webkit-browser-matrix', 'native-assistive-technology',
    'independent-beginner-expert-study', 'real-low-end-hardware', 'public-relay-hostile-network',
    'independent-security-review', 'ecosystem-production-adoption', 'seventy-two-hour-soak'
  ]
  const gapIds = gaps.PLATFORM_GAP_REGISTER.map(/* 返回 item.id 的当前值。 */ item => item.id)
  const gapProblems = []
  for (const item of gaps.PLATFORM_GAP_REGISTER) {
    if (!gapStatuses.has(item.status)) gapProblems.push(`${item.id}: unknown status ${item.status}`)
    if (!item.id || !item.area || !item.title || !item.currentBoundary || !item.decision || !item.owner || !item.target || !Array.isArray(item.evidence) || !item.evidence.length) gapProblems.push(`${item.id || '<missing-id>'}: incomplete record`)
    if (item.status === 'deferred-external' && !item.evidence.some(/* 调用 path.startsWith('pending-external/') 并返回调用结果。 */ path => path.startsWith('pending-external/'))) gapProblems.push(`${item.id}: deferred item lacks pending-external evidence identity`)
    if (item.status !== 'deferred-external' && item.evidence.some(/* 调用 path.startsWith('pending-external/') 并返回调用结果。 */ path => path.startsWith('pending-external/'))) gapProblems.push(`${item.id}: local/scope item incorrectly cites pending evidence`)
  }
  const duplicateGapIds = gapIds.filter(/* 比较 gapIds.indexOf(id) 与 index，返回严格不等的判断结果。 */ (id, index) => gapIds.indexOf(id) !== index)
  const missingGapIds = requiredGapIds.filter(/* 返回 gapIds.includes(id) 的逻辑取反结果。 */ id => !gapIds.includes(id))
  check('V2610-GAP-TYPING', gapProblems.length === 0 && duplicateGapIds.length === 0 && missingGapIds.length === 0, 'Every known gap has one complete closed, intentional-scope, deferred-external or open-blocking classification.', { problems: gapProblems, duplicates: duplicateGapIds, missing: missingGapIds, summary: gaps.PLATFORM_GAP_SUMMARY })
  check('V2610-ZERO-LOCAL-BLOCKERS', gaps.PLATFORM_GAP_SUMMARY.openBlocking === 0 && !gaps.PLATFORM_GAP_REGISTER.some(/* 比较 item.status 与 'open-blocking'，返回严格相等的判断结果。 */ item => item.status === 'open-blocking') && platform.CREATOR_CONTRACT_REVIEW.openBlockingGaps === 0, 'The current local readiness register contains zero open-blocking items; external work remains deferred rather than passed.')

  const docPaths = [
    'docs/PLATFORM_GAP_REGISTER_26_10.md', 'docs/STABLE_CREATOR_PLATFORM_26_10.md', 'docs/SUPPORT_MATRIX_26_10.md',
    'docs/REPRODUCIBILITY_26_10.md', 'docs/CLEAN_MACHINE_QUALIFICATION_26_10.md', 'docs/INDEPENDENT_USABILITY_26_10.md',
    'docs/MIGRATION_26_10.md', 'docs/TROUBLESHOOTING_26_10.md', 'docs/API_SDK_26_10.md'
  ]
  const docs = new Map(await Promise.all(docPaths.map(/* 返回按声明顺序构造的数组 [path, await source(path)]。 */ async path => [path, await source(path)])))
  const missingCurrentHeadings = [...docs].filter(/* 返回 text.split('\n', 1)[0].includes('26.10') 的逻辑取反结果。 */ ([, text]) => !text.split('\n', 1)[0].includes('26.10')).map(/* 返回 path 的当前值。 */ ([path]) => path)
  const gapDocument = docs.get('docs/PLATFORM_GAP_REGISTER_26_10.md') ?? ''
  const undocumentedGaps = gapIds.filter(/* 返回 gapDocument.includes(`\`${id}\``) 的逻辑取反结果。 */ id => !gapDocument.includes(`\`${id}\``))
  const requiredTerms = ['closed', 'intentional-scope', 'deferred-external', 'open-blocking']
  check('V2610-CURRENT-DOCUMENTS', missingCurrentHeadings.length === 0 && undocumentedGaps.length === 0 && requiredTerms.every(/* 调用 gapDocument.includes(`\`${term}\``) 并返回调用结果。 */ term => gapDocument.includes(`\`${term}\``)), 'All 26.10 readiness documents identify the current release and the gap document covers every typed entry/status.', { missingCurrentHeadings, undocumentedGaps })

  const markdownLinks = new Set()
  for (const text of docs.values()) {
    for (const match of text.matchAll(/`((?:docs\/)?[A-Za-z0-9_.-]+\.md)`/g)) markdownLinks.add(match[1])
  }
  const missingLinks = []
  for (const link of markdownLinks) {
    const path = link.startsWith('docs/') ? link : `docs/${link}`
    if (!(await exists(path))) missingLinks.push(link)
  }
  check('V2610-DOCUMENT-LINKS', missingLinks.length === 0, 'Every backticked Markdown document reference in the 26.10 readiness set resolves.', { checked: markdownLinks.size, missing: missingLinks })

  const manuals = new Map(await Promise.all(['en', 'de', 'zh-CN'].map(/* 返回按声明顺序构造的数组 [locale, await source(`manual/MANUAL.${locale}.md`)]。 */ async locale => [locale, await source(`manual/MANUAL.${locale}.md`)])))
  const missingManualAnchors = []
  for (const [locale, text] of manuals) {
    for (const item of platform.CREATOR_PLATFORM_READINESS) if (!text.includes(`<a id="${item.id}"></a>`)) missingManualAnchors.push(`${locale}:${item.id}`)
  }
  check('V2610-MANUAL-ANCHORS', missingManualAnchors.length === 0, 'Every readiness operation resolves to the same stable anchor in English, German and Chinese manuals.', { operations: platform.CREATOR_PLATFORM_READINESS.length, missing: missingManualAnchors.slice(0, 30) })

  const support = platform.CREATOR_SUPPORT_MATRIX
  check('V2610-SUPPORT-MATRIX', support.length === 7 && support.some(/* 先计算 item.target.startsWith('Windows')；仅当其为真值时求右侧 item.status === 'tier-1-local'，返回短路求值结果。 */ item => item.target.startsWith('Windows') && item.status === 'tier-1-local') && support.some(/* 先计算 item.target.startsWith('Web')；仅当其为真值时求右侧 item.status === 'tier-1-local'，返回短路求值结果。 */ item => item.target.startsWith('Web') && item.status === 'tier-1-local') && support.some(/* 先计算 item.target.includes('Linux')；仅当其为真值时求右侧 item.status === 'matching-host-external'，返回短路求值结果。 */ item => item.target.includes('Linux') && item.status === 'matching-host-external') && support.some(/* 先计算 item.target.includes('iOS')；仅当其为真值时求右侧 item.status === 'deferred-or-excluded'，返回短路求值结果。 */ item => item.target.includes('iOS') && item.status === 'deferred-or-excluded') && support.some(/* 先计算 item.target.includes('3D')；仅当其为真值时求右侧 item.status === 'out-of-scope'，返回短路求值结果。 */ item => item.target.includes('3D') && item.status === 'out-of-scope'), 'The runtime matrix separates locally qualified, matching-host, optional, deferred and out-of-scope targets.')
} finally {
  await rm(compiled, { recursive: true, force: true })
}

const failed = checks.filter(/* 比较 item.status 与 'failed'，返回严格相等的判断结果。 */ item => item.status === 'failed')
const report = { format: 'nova-v26.10-readiness-verification', version: 1, release, machineVersion, engineVersion: machineVersion, generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/v26.10-readiness-verification.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) {
  console.error(JSON.stringify(report, null, 2))
  process.exit(1)
}
console.log(`Nova_A ${release} readiness verification passed: ${checks.length} checks, ${checks.find(/* 比较 item.id 与 'V2610-POLICY-COVERAGE'，返回严格相等的判断结果。 */ item => item.id === 'V2610-POLICY-COVERAGE')?.metrics.operations ?? 0} operations, zero open-blocking gaps.`)
