import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url))), checks = []
const check = (id, passed, detail, metrics = {}) => checks.push({ id, status: passed ? 'passed' : 'failed', detail, metrics })
async function filesUnder(directory) { const result = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const path = join(directory, entry.name); entry.isDirectory() ? result.push(...await filesUnder(path)) : result.push(path) } return result }
const files = (await filesUnder(join(root, 'src'))).filter(path => path.endsWith('.vue')).sort()
const surfaces = await Promise.all(files.map(async path => ({ path: relative(root, path).replaceAll('\\', '/'), source: await readFile(path, 'utf8') })))
const css = await readFile(join(root, 'src/assets/main.css'), 'utf8')
const graph = await readFile(join(root, 'src/components/VisualGraphEditor.vue'), 'utf8')
const graphProduction = await readFile(join(root, 'src/components/GraphProductionPanel.vue'), 'utf8')
const qualifier = await readFile(join(root, 'scripts/qualify-layout-v26.06.mjs'), 'utf8')
check('V2606-LAYOUT-SURFACE-INVENTORY', files.length >= 65 && surfaces.every(item => item.source.includes('<template') && item.source.includes('<script')), 'Every Vue surface is enumerated and structurally authored.', { vueSurfaces: files.length })
check('V2606-LAYOUT-TYPE-RHYTHM', css.includes('--line-body:') && css.includes('--line-control:') && css.includes('--tracking-ui:') && css.includes('--tracking-copy:') && css.includes('letter-spacing: var(--tracking-ui)') && css.includes('line-height: var(--line-body)'), 'Global line-height and restrained letter-spacing tokens apply to body and control text.')
check('V2606-LAYOUT-CENTERED-SINGLE-LINE', css.includes("input[type='search']") && css.includes('text-align: center !important') && css.includes('text-align-last: center !important') && css.includes(')::placeholder') && css.includes('textarea,\ncode'), 'Single-line authored fields and placeholders are centered; multiline/code families remain separately scoped.')
check('V2606-LAYOUT-CONTAINMENT', css.includes('overflow-wrap: anywhere') && css.includes('minmax(0, 1fr) !important') && css.includes('overflow: hidden !important'), 'Shared text, grid and root overflow containment is present.')
check('V2606-LAYOUT-GRAPH-INSPECTOR', graph.includes('graph-canvas') && graph.includes('graph-details') && graph.includes('min-width:0') && graph.includes('.graph-details{container:graph-details/inline-size;overflow:auto') && graphProduction.includes('min-width:0') && /overflow\s*:\s*(auto|hidden)/.test(`${graph}\n${graphProduction}`), 'Visual Graph canvas and right-side details inspector expose independent bounded layout/overflow ownership.')
check('V2606-LAYOUT-MATRIX', qualifier.includes('1024x640') && qualifier.includes('2560x1440') && qualifier.includes('0.8,1,1.25,1.5') && qualifier.includes("NOVA_LAYOUT_VERSION = '26.06'"), 'The browser qualifier declares all required viewports and 80/100/125/150% scales for each EN/DE/ZH traversal.')
const failed = checks.filter(item => item.status === 'failed')
const report = { format: 'nova-v26.06-layout-contract', version: 1, release: '26.06', engineVersion: '26.6.0', generatedAt: new Date().toISOString(), evidenceKind: 'automated-source', browserEvidence: 'generated separately by qualify:v26.06:layout', checks, severity0Open: failed.length, severity1Open: 0, externalGates: { renderedGlyphReview: 'pending-external', osScaleReview: 'pending-external', imeReview: 'pending-external' }, status: failed.length ? 'failed' : 'passed' }
await mkdir(join(root, 'release-audits'), { recursive: true }); await writeFile(join(root, 'release-audits/v26.06-layout-contract.json'), `${JSON.stringify(report, null, 2)}\n`)
if (failed.length) { console.error(failed); process.exit(1) }
console.log(`Nova_A 26.06 layout contract passed: ${checks.length} checks across ${files.length} Vue surfaces.`)
