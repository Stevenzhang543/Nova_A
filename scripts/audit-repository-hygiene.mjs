import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const source = await readFile(join(root, '.gitignore'), 'utf8')
const rules = source.split(/\r?\n/).map(line => line.trim()).filter(line => line && !line.startsWith('#'))
const activeRules = new Set(rules.filter(rule => !rule.startsWith('!')))

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const requiredRules = [
  'logs', '*.log', 'node_modules', '.pnpm-store/', '.VSCodeCounter/', 'dist', 'dist-ssr',
  '.vite/', '.cache/', '.turbo/', 'coverage/', 'playwright-report/', 'test-results/',
  'release-audits/', 'stage*/', '*.tsbuildinfo', '*.tmp', '*.temp', 'nova_core/target/',
  '/target/', '/src-tauri/target/', '/src-tauri/gen/', '/releases/', '/instructions.txt',
  '.env', '.env.*', '.vscode', '.idea', '.DS_Store', 'Thumbs.db', 'Desktop.ini'
]
for (const rule of requiredRules) assert(activeRules.has(rule), '.gitignore is missing required transient/private rule: ' + rule)
assert(rules.includes('!.env.example'), '.gitignore must retain the documented environment example')

function regexEscape(character) {
  return /[\^$+?.()|{}\[\]]/.test(character) ? '\\' + character : character
}

function matcher(rawPattern) {
  let pattern = rawPattern.replaceAll('\\', '/')
  const negative = pattern.startsWith('!')
  if (negative) pattern = pattern.slice(1)
  const anchored = pattern.startsWith('/')
  if (anchored) pattern = pattern.slice(1)
  const directory = pattern.endsWith('/')
  if (directory) pattern = pattern.slice(0, -1)
  const containsSlash = pattern.includes('/')
  let body = ''
  for (let index = 0; index < pattern.length; index++) {
    if (pattern[index] === '*' && pattern[index + 1] === '*') { body += '.*'; index++; continue }
    if (pattern[index] === '*') { body += '[^/]*'; continue }
    if (pattern[index] === '?') { body += '[^/]'; continue }
    body += regexEscape(pattern[index])
  }
  const prefix = anchored || containsSlash ? '^' : '(?:^|.*/)'
  const suffix = directory || !containsSlash ? '(?:/.*)?$' : '$'
  return { negative, expression: new RegExp(prefix + body + suffix) }
}

const matchers = rules.map(matcher)
function isIgnored(path) {
  const normalized = path.replaceAll('\\', '/').replace(/^\/+/, '')
  let ignored = false
  for (const rule of matchers) if (rule.expression.test(normalized)) ignored = !rule.negative
  return ignored
}

const protectedPaths = [
  'src/main.ts',
  'src/runtime/jobScheduler.ts',
  'src-tauri/Cargo.toml',
  'crates/nova_format/src/lib.rs',
  'scripts/package-release.ps1',
  'package.json',
  'pnpm-lock.yaml',
  'Cargo.toml',
  'Cargo.lock',
  'README.md',
  'README.zh-CN.md',
  'docs/ROADMAP_26_01_TO_26_10.md',
  'manual/MANUAL.en.md',
  'manual/MANUAL.de.md',
  'manual/MANUAL.zh-CN.md'
]
for (const path of protectedPaths) assert(!isIgnored(path), '.gitignore would discard required source or documentation: ' + path)

const ignoredExamples = [
  'instructions.txt',
  'stage2610/src/main.ts',
  'dist/index.html',
  'release-audits/evidence-v26.10/evidence-manifest.json',
  'src-tauri/target/release/nova_a.exe',
  'nova_core/target/release/nova_core.dll',
  '.cache/index',
  '.vite/deps/index.js',
  'test-results/layout.json',
  'scratch.tmp'
]
for (const path of ignoredExamples) assert(isIgnored(path), '.gitignore does not cover expected generated/private path: ' + path)

let authority = 'portable matcher'
if (existsSync(join(root, '.git'))) {
  const candidates = [...protectedPaths, ...ignoredExamples]
  const result = spawnSync('git', ['-C', root, 'check-ignore', '--no-index', '--stdin'], { input: candidates.join('\n') + '\n', encoding: 'utf8' })
  if (result.error || ![0, 1].includes(result.status)) throw result.error ?? new Error('git check-ignore failed: ' + result.stderr.trim())
  const ignored = new Set(result.stdout.split(/\r?\n/).filter(Boolean).map(path => path.replaceAll('\\', '/')))
  for (const path of protectedPaths) assert(!ignored.has(path), 'Git confirms that a required source/documentation path is ignored: ' + path)
  for (const path of ignoredExamples) assert(ignored.has(path), 'Git does not ignore expected generated/private path: ' + path)
  authority = 'portable matcher + git check-ignore'
}

const report = { format: 'nova-repository-hygiene-audit', version: 1, generatedAt: new Date().toISOString(), authority, requiredRules: requiredRules.length, protectedPaths: protectedPaths.length, ignoredExamples: ignoredExamples.length, instructionsIgnored: isIgnored('instructions.txt'), severity0Open: 0, severity1Open: 0, status: 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, 'release-audits/repository-hygiene.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log('Repository hygiene audit passed: ' + requiredRules.length + ' required rules and ' + protectedPaths.length + ' protected paths (' + authority + ').')
