import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd()
const manuals = ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md']
const components = [
  'Transform2D', 'Camera2D', 'SpriteRenderer2D', 'ShapeRenderer2D', 'TextRenderer2D',
  'RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D', 'FixedJoint2D',
  'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D', 'Rope2D',
  'Script2D', 'Animator', 'AudioSource', 'AudioListener', 'ParticleEmitter2D', 'Canvas',
  'RectTransform', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox',
  'TextInput', 'TileMap2D', 'Skeleton2D', 'TimelinePlayer'
]
const requiredConcepts = [
  /Project (?:Manager|Format 2)|Projektmanager|项目管理器/i, /Project Format 2/i,
  /Save|Spielstand|存档/i, /WASM/i, /Build|构建/i, /Physics|Physik|物理/i,
  /Prefab|预制体/i, /Animation|动画/i, /Audio|音频/i, /TileMap/i,
  /Profiler|性能分析/i, /Console|Konsole|控制台/i
]

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

for (const file of manuals) {
  const source = await readFile(resolve(root, 'manual', file), 'utf8')
  assert(Buffer.byteLength(source, 'utf8') > 12_000, `${file} is not a complete manual`)
  assert((source.match(/^## /gm) ?? []).length >= 20, `${file} must contain all 20 manual sections`)
  assert(!/\b(?:TODO|TBD|FIXME)\b/i.test(source), `${file} contains unfinished documentation`)
  for (const component of components) assert(source.includes(component), `${file} does not document ${component}`)
  for (const concept of requiredConcepts) assert(concept.test(source), `${file} does not cover ${concept}`)
}

const html = await readFile(resolve(root, 'manual', 'index.html'), 'utf8')
assert(!/Vervollst\?ndigung|g\?ltige|\?{3,}/.test(html), 'localized HTML contains encoding replacement characters')
assert(html.includes('<title>Nova_A 4.0 Manual</title>') && html.includes('4.0 Documentation') && html.includes('Engine 4.0.0') && ['en-v40', 'de-v40', 'zh-CN-v40', 'en-v39', 'de-v39', 'zh-CN-v39', 'en-v38', 'de-v38', 'zh-CN-v38', 'en-v37', 'de-v37', 'zh-CN-v37', 'en-v36', 'de-v36', 'zh-CN-v36', 'en-v35', 'de-v35', 'zh-CN-v35', 'en-v34', 'de-v34', 'zh-CN-v34'].every(value => html.includes(value)), 'HTML manual metadata, v4.0 upgrade/support content, and retained build, world-data, visual/audio, presentation, scripting, or physics coverage is stale')
for (const language of ['en', 'de', 'zh-CN']) assert(html.includes(`data-lang="${language}"`), `HTML manual is missing ${language}`)
for (const file of manuals) assert(html.includes(file), `HTML manual does not link ${file}`)
assert((html.match(/<section id=/g) ?? []).length >= 50, 'HTML manual does not expose enough bookmarkable sections')
assert(html.includes('setLanguage') && html.includes('location.hash'), 'HTML manual language/bookmark navigation is missing')

console.log(`Manual audit passed: ${manuals.length} Markdown editions and one multilingual bookmarkable webpage.`)
