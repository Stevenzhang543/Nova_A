import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd(), manuals = ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md']
const components = ['Transform2D', 'Camera2D', 'SpriteRenderer2D', 'ShapeRenderer2D', 'TextRenderer2D', 'RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D', 'FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D', 'Rope2D', 'Script2D', 'Animator', 'AudioSource', 'AudioListener', 'ParticleEmitter2D', 'Canvas', 'RectTransform', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'Skeleton2D', 'TimelinePlayer']
const requiredConcepts = [/Project (?:Manager|Format 2)|Projektmanager|项目管理器/i, /Project Format 2/i, /Save|Spielstand|存档/i, /WASM/i, /Build|构建/i, /Physics|Physik|物理/i, /Prefab|预制体/i, /Animation|动画/i, /Audio|音频/i, /TileMap/i, /Profiler|性能分析/i, /Console|Konsole|控制台/i]
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const file of manuals) {
  const source = await readFile(resolve(root, 'manual', file), 'utf8')
  assert(Buffer.byteLength(source, 'utf8') > 100_000, `${file} is not a complete v6 teaching manual`)
  assert((source.match(/^## /gm) ?? []).length >= 35, `${file} must include legacy reference and v6 task panels`)
  assert(!/\b(?:TODO|TBD|FIXME)\b/i.test(source), `${file} contains unfinished documentation`)
  assert(source.includes('NOVA_V6_TEACHING_START'), `${file} is missing the generated v6 lesson catalog`)
  for (const component of components) assert(source.includes(component), `${file} does not document ${component}`)
  for (const concept of requiredConcepts) assert(concept.test(source), `${file} does not cover ${concept}`)
}

const html = await readFile(resolve(root, 'manual', 'index.html'), 'utf8')
assert(!/Vervollst\?ndigung|g\?ltige|\?{3,}/.test(html), 'Localized HTML contains encoding replacement characters')
assert(html.includes('<title>Nova_A 6.1.0 Manual</title>') && html.includes('6.1.0 Offline Teaching Manual') && html.includes('Engine 6.1.0'), 'HTML manual metadata is stale')
for (const language of ['en', 'de', 'zh-CN']) assert(html.includes(`data-lang="${language}"`) && html.includes(`${language}-v60`), `HTML manual is missing v6 ${language}`)
for (const file of manuals) assert(html.includes(file), `HTML manual does not link ${file}`)
for (const marker of ['first-game', 'project-health', 'script-studio', 'migration', 'package-sdk', 'build-export', 'platform-support', 'security-privacy', 'localization-accessibility', 'troubleshooting', 'release-engineering', 'en-v59', 'de-v59', 'zh-CN-v59']) assert(html.includes(marker), `HTML manual lost retained bookmark ${marker}`)
assert((html.match(/id="(?:en|de|zh-CN)-v6-/g) ?? []).length >= 750, 'HTML manual does not expose every localized v6 feature bookmark')
assert(html.includes('setLanguage') && html.includes('location.hash'), 'HTML manual language/bookmark navigation is missing')
console.log(`Manual audit passed: ${manuals.length} complete Markdown editions and one multilingual task-oriented webpage.`)
