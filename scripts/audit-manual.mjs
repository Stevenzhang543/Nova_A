import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = process.cwd(), manuals = ['MANUAL.en.md', 'MANUAL.de.md', 'MANUAL.zh-CN.md']
const engineVersion = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8')).version
const publicRelease = new Map([['26.8.0', '26.08'], ['26.9.0', '26.09'], ['26.10.0', '26.10']]).get(engineVersion) ?? engineVersion
const requiredReleaseLessons = engineVersion === '26.10.0'
  ? ['v2608-device-mobile-accessibility', 'v2609-large-world-performance', 'v2610-stable-platform']
  : engineVersion === '26.9.0'
    ? ['v2608-device-mobile-accessibility', 'v2609-large-world-performance']
    : engineVersion === '26.8.0'
      ? ['v2608-device-mobile-accessibility']
      : []
const components = ['Transform2D', 'Camera2D', 'SpriteRenderer2D', 'ShapeRenderer2D', 'TextRenderer2D', 'RigidBody2D', 'BoxCollider2D', 'EllipseCollider2D', 'PolygonCollider2D', 'FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D', 'Rope2D', 'Script2D', 'Animator', 'AudioSource', 'AudioListener', 'ParticleEmitter2D', 'Canvas', 'RectTransform', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'Skeleton2D', 'TimelinePlayer']
const requiredConcepts = [/Project (?:Manager|Format 2)|Projektmanager|项目管理器/i, /Project Format 2/i, /Save|Spielstand|存档/i, /WASM/i, /Build|构建/i, /Physics|Physik|物理/i, /Prefab|预制体/i, /Animation|动画/i, /Audio|音频/i, /TileMap/i, /Profiler|性能分析/i, /Console|Konsole|控制台/i]
const assert = (condition, message) => { if (!condition) throw new Error(message) }

for (const file of manuals) {
  const source = await readFile(resolve(root, 'manual', file), 'utf8')
  assert(Buffer.byteLength(source, 'utf8') > 100_000, `${file} is not a complete v6 teaching manual`)
  assert((source.match(/^## /gm) ?? []).length >= 35, `${file} must include legacy reference and v6 task panels`)
  assert(!/\b(?:TODO|TBD|FIXME)\b/i.test(source), `${file} contains unfinished documentation`)
  assert(source.includes('NOVA_V6_TEACHING_START'), `${file} is missing the generated v6 lesson catalog`)
  assert(source.startsWith(`# Nova_A ${publicRelease}`), `${file} does not present the canonical public release label ${publicRelease}`)
  assert(source.includes(`Engine: **${engineVersion}**`), `${file} does not identify machine engine ${engineVersion}`)
  for (const lesson of requiredReleaseLessons) assert(source.includes(`<a id="${lesson}"></a>`), `${file} is missing cumulative release lesson ${lesson}`)
  for (const component of components) assert(source.includes(component), `${file} does not document ${component}`)
  for (const concept of requiredConcepts) assert(concept.test(source), `${file} does not cover ${concept}`)
}

const html = await readFile(resolve(root, 'manual', 'index.html'), 'utf8')
assert(!/Vervollst\?ndigung|g\?ltige|\?{3,}/.test(html), 'Localized HTML contains encoding replacement characters')
assert(html.includes(`<title>Nova_A ${publicRelease} Manual</title>`) && html.includes(`${publicRelease} Offline Teaching Manual`) && new RegExp(`Engine\\s+${engineVersion.replaceAll('.', '\\.')}`).test(html), 'HTML manual release/engine metadata is stale')
assert((html.match(/NOVA_V6_TEACHING_STYLE_START/g) ?? []).length === 1 && (html.match(/NOVA_V6_TEACHING_STYLE_END/g) ?? []).length === 1, 'HTML manual teaching CSS is duplicated or missing')
for (const lesson of requiredReleaseLessons) for (const language of ['en', 'de', 'zh-CN']) assert(html.includes(`id="${language}-${lesson}"`), `HTML manual is missing ${language} cumulative lesson ${lesson}`)
for (const language of ['en', 'de', 'zh-CN']) assert(html.includes(`data-lang="${language}"`) && html.includes(`${language}-v60`), `HTML manual is missing v6 ${language}`)
for (const file of manuals) assert(html.includes(file), `HTML manual does not link ${file}`)
for (const marker of ['first-game', 'project-health', 'script-studio', 'migration', 'package-sdk', 'build-export', 'platform-support', 'security-privacy', 'localization-accessibility', 'troubleshooting', 'release-engineering', 'en-v59', 'de-v59', 'zh-CN-v59']) assert(html.includes(marker), `HTML manual lost retained bookmark ${marker}`)
assert((html.match(/id="(?:en|de|zh-CN)-v6-/g) ?? []).length >= 750, 'HTML manual does not expose every localized v6 feature bookmark')
assert(html.includes('setLanguage') && html.includes('location.hash'), 'HTML manual language/bookmark navigation is missing')
console.log(`Manual audit passed: ${manuals.length} complete Markdown editions and one multilingual task-oriented webpage.`)
