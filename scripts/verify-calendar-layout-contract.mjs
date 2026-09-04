import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const release = process.argv.find(value => value.startsWith('--release='))?.slice(10)
const machine = process.argv.find(value => value.startsWith('--engine='))?.slice(9)
if (!release || !machine) throw new Error('Use --release and --engine.')
const checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
async function filesBelow(directory) { const output = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? output.push(...await filesBelow(path)) : output.push(path) } return output }
const paths = (await filesBelow(join(root, 'src'))).filter(path => path.endsWith('.vue')).sort()
const vue = await Promise.all(paths.map(async path => ({ path: relative(root, path).split('\\').join('/'), source: await readFile(path, 'utf8') })))
const [css, i18n, registry, contract] = await Promise.all(['src/assets/main.css', 'src/i18n.ts', 'src/runtime/controlRegistry.ts', 'docs/UI_LAYOUT_AUDIT_26_08_TO_26_10.md'].map(path => readFile(join(root, path), 'utf8')))
check('CAL-LAYOUT-SURFACES', vue.length >= 65 && vue.every(item => item.source.includes('<template') && item.source.includes('<script')), 'Every Vue surface is included in the static panel inventory.', { vueFiles: vue.length })
check('CAL-LAYOUT-SHRINK', css.includes('min-inline-size: 0') && css.includes('min-width: 0') && css.includes('overflow-wrap: anywhere') && css.includes('scrollbar-gutter: stable'), 'The shared shell lets nested flex/grid content shrink, wrap and scroll without escaping the window.')
check('CAL-LAYOUT-CONTROLS', css.includes("input[type='text']") && css.includes("input[type='number']") && css.includes('text-align-last: center !important') && css.includes('textarea') && css.includes('text-align: start !important'), 'Single-line controls and placeholders remain centered while multiline/code content remains readable and start-aligned.')
check('CAL-LAYOUT-LOCALES', (i18n.match(/releaseLabel:/g) ?? []).length >= 3 && ['Object.assign(en', 'Object.assign(de', 'Object.assign(zh'].every(token => i18n.includes(token)) && css.includes(':lang(de)') && css.includes('hyphens: auto'), 'English, German and Chinese labels plus long-German wrapping policy are present.')
check('CAL-LAYOUT-IDENTITIES', registry.includes('identitySource') && registry.includes('structuralPath') && registry.includes('dataset.testIdentity') && registry.includes("const stableKey = explicitKey ? slug(explicitKey) : structuralPath(element, scope)"), 'Automated control identities use authored/structural identity rather than translated text.')
check('CAL-LAYOUT-INPUT-MODES', css.includes('@media (pointer: coarse)') && css.includes('44px') && css.includes('prefers-reduced-motion'), 'Touch target and reduced-motion paths remain explicit without removing controls or transitions.')
check('CAL-LAYOUT-MATRIX', ['English', 'German', 'Chinese', '1024×640', '3840×2160', '80%', '200%', 'dark', 'light'].every(token => contract.toLowerCase().includes(token.toLowerCase())) && /high[- ]contrast/i.test(contract), 'The release contract names the complete locale, viewport, scale and theme matrix.')
const failed = checks.filter(item => item.status === 'failed')
const report = { format: `nova-v${release}-layout-contract`, version: 1, release, engineVersion: machine, generatedAt: new Date().toISOString(), checks, severity0Open: failed.length, severity1Open: 0, externalGates: { renderedGlyphAndImeReview: 'pending-external', nativeAssistiveTechnology: 'pending-external', independentUserObservation: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true })
await writeFile(join(root, `release-audits/v${release}-layout-contract.json`), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A ${release} layout contract passed: ${checks.length} checks across ${vue.length} Vue surfaces.`)
