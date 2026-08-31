import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const engineVersion = process.argv.find(argument => argument.startsWith('--engine-version='))?.split('=')[1] || '6.0.0'
const server = await createServer({ root, server: { middlewareMode: true }, appType: 'custom' })
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const labels = {
  en: { heading: 'Nova_A 6.0 task-oriented teaching manual', intro: 'Learn by completing real work. Every public feature below states ownership, persistence, recovery, accessibility and release behavior.', class: 'Classification', purpose: 'Purpose and when to use it', pre: 'Preconditions', steps: 'Exact workflow', result: 'Expected result', persist: 'Persistence and export', undo: 'Undo and recovery', mistakes: 'Common mistakes and fixes', a11y: 'Keyboard and accessibility', minimal: 'Minimal example', production: 'Production example', rhai: 'Rhai API', graph: 'Visual Graph API', guided: 'Complete guided projects' },
  de: { heading: 'Nova_A 6.0 aufgabenorientiertes Lehrhandbuch', intro: 'Lernen durch echte Aufgaben. Jede öffentliche Funktion erklärt Zuständigkeit, Speicherung, Wiederherstellung, Barrierefreiheit und Release-Verhalten.', class: 'Klassifikation', purpose: 'Zweck und Einsatz', pre: 'Voraussetzungen', steps: 'Exakter Ablauf', result: 'Erwartetes Ergebnis', persist: 'Speicherung und Export', undo: 'Rückgängig und Wiederherstellung', mistakes: 'Häufige Fehler und Lösungen', a11y: 'Tastatur und Barrierefreiheit', minimal: 'Minimales Beispiel', production: 'Produktionsbeispiel', rhai: 'Rhai-API', graph: 'Visual-Graph-API', guided: 'Vollständige geführte Projekte' },
  'zh-CN': { heading: 'Nova_A 6.0 任务式教学手册', intro: '通过完成真实任务学习。以下每个公开功能均说明归属、持久化、恢复、无障碍和发布行为。', class: '分类', purpose: '用途和使用时机', pre: '前提条件', steps: '准确操作流程', result: '预期结果', persist: '持久化和导出', undo: '撤销和恢复', mistakes: '常见错误和修复', a11y: '键盘和无障碍', minimal: '最小示例', production: '生产示例', rhai: 'Rhai API', graph: '可视化图 API', guided: '完整引导项目' }
}
for (const copy of Object.values(labels)) copy.heading = copy.heading.replace('6.0', engineVersion)

function replaceMarked(source, start, end, contents) {
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
  const block = `${start}\n${contents}\n${end}`
  return expression.test(source) ? source.replace(expression, block) : `${source.trimEnd()}\n\n${block}\n`
}

function markdownFor(locale, guides, localizedLearningGuide) {
  const l = labels[locale], appLocale = locale === 'zh-CN' ? 'zh' : locale, grouped = Map.groupBy(guides, guide => guide.panel)
  const lines = [`# ${l.heading}`, '', l.intro, '', `- Engine: **${engineVersion}**`, '- Stable contracts: Project Format 2/schema 29; Rhai API 2; Graph Format 1; Plugin API 2; Package Manifest 1; Build CLI 1; workspace document 3.', '- External signing, independent clean-machine evidence, two-machine reproduction, matching-host builds and a real 72-hour soak remain pending until independently captured.', '', `## ${l.guided}`, '']
  for (const guide of guides.filter(guide => guide.taskProject)) lines.push(`- [${localizedLearningGuide(guide, appLocale).title}](#${guide.id})`)
  for (const [panel, panelGuides] of grouped) {
    lines.push('', `## ${panel}`, '')
    for (const guide of panelGuides) {
      const text = localizedLearningGuide(guide, appLocale)
      lines.push(`<a id="${guide.id}"></a>`, '', `### ${text.title}`, '', `**${l.class}:** ${guide.classifications.join(' · ')}`, '', `**${l.purpose}:** ${text.purpose} ${text.whenToUse}`, '', `**${l.pre}:**`, '', ...text.prerequisites.map(item => `- ${item}`), '', `**${l.steps}:**`, '', ...text.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.result}:** ${text.expectedResult}`, '', `**${l.persist}:** ${text.persistence}`, '', `**${l.undo}:** ${text.undoRecovery}`, '', `**${l.mistakes}:**`, '', ...text.mistakes.map(item => `- ${item}`), '', `**${l.a11y}:** ${text.accessibility}`, '', `**${l.minimal}:** ${text.minimalExample}`, '', `**${l.production}:** ${text.productionExample}`, '', `**${l.rhai}:** ${text.relatedRhai.length ? text.relatedRhai.map(value => `\`${value}\``).join(', ') : 'N/A'}`, '', `**${l.graph}:** ${text.relatedGraph.length ? text.relatedGraph.map(value => `\`${value}\``).join(', ') : 'N/A'}`, '')
    }
  }
  return lines.join('\n')
}

function htmlFor(locale, guides, localizedLearningGuide) {
  const l = labels[locale], appLocale = locale === 'zh-CN' ? 'zh' : locale, grouped = Map.groupBy(guides, guide => guide.panel)
  const toc = guides.filter(guide => guide.taskProject).map(guide => `<a href="#${locale}-v6-${guide.id}">${escapeHtml(localizedLearningGuide(guide, appLocale).title)}</a>`).join('')
  const panels = [...grouped].map(([panel, panelGuides]) => `<section class="v6-panel"><h2>${escapeHtml(panel)}</h2>${panelGuides.map(guide => {
    const text = localizedLearningGuide(guide, appLocale)
    const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`
    const ordered = values => `<ol>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol>`
    return `<details id="${locale}-v6-${guide.id}" class="v6-guide"${guide.taskProject ? ' open' : ''}><summary><strong>${escapeHtml(text.title)}</strong><span>${escapeHtml(guide.classifications.join(' · '))}</span></summary><div><h3>${escapeHtml(l.purpose)}</h3><p>${escapeHtml(text.purpose)} ${escapeHtml(text.whenToUse)}</p><h3>${escapeHtml(l.pre)}</h3>${list(text.prerequisites)}<h3>${escapeHtml(l.steps)}</h3>${ordered(text.steps)}<h3>${escapeHtml(l.result)}</h3><p>${escapeHtml(text.expectedResult)}</p><h3>${escapeHtml(l.persist)}</h3><p>${escapeHtml(text.persistence)}</p><h3>${escapeHtml(l.undo)}</h3><p>${escapeHtml(text.undoRecovery)}</p><h3>${escapeHtml(l.mistakes)}</h3>${list(text.mistakes)}<h3>${escapeHtml(l.a11y)}</h3><p>${escapeHtml(text.accessibility)}</p><h3>${escapeHtml(l.minimal)}</h3><p>${escapeHtml(text.minimalExample)}</p><h3>${escapeHtml(l.production)}</h3><p>${escapeHtml(text.productionExample)}</p><h3>${escapeHtml(l.rhai)} / ${escapeHtml(l.graph)}</h3><p><code>${escapeHtml(text.relatedRhai.join(', ') || 'N/A')}</code> · <code>${escapeHtml(text.relatedGraph.join(', ') || 'N/A')}</code></p></div></details>`
  }).join('')}</section>`).join('')
  return `<article data-lang="${locale}"${locale === 'en' ? '' : ' hidden'} class="v6-teaching"><section id="${locale}-v60"><div class="hero"><span class="eyebrow">Nova_A ${engineVersion} · Project Format 2/schema 29 · external certification honestly pending</span><h1>${escapeHtml(l.heading)}</h1><p>${escapeHtml(l.intro)}</p><div class="links">${toc}</div></div>${panels}</section></article>`
}

try {
  const { CREATOR_LEARNING_GUIDES, localizedLearningGuide } = await server.ssrLoadModule('/src/runtime/creatorLearning.ts')
  for (const [locale, filename] of [['en', 'MANUAL.en.md'], ['de', 'MANUAL.de.md'], ['zh-CN', 'MANUAL.zh-CN.md']]) {
    const path = join(root, 'manual', filename), source = await readFile(path, 'utf8')
    const updated = replaceMarked(source, '<!-- NOVA_V6_TEACHING_START -->', '<!-- NOVA_V6_TEACHING_END -->', markdownFor(locale, CREATOR_LEARNING_GUIDES, localizedLearningGuide))
    await writeFile(path, updated, 'utf8')
  }
  const htmlPath = join(root, 'manual/index.html'), original = await readFile(htmlPath, 'utf8')
  let html = original
    .replace(/<title>Nova_A \d+\.\d+\.\d+ Manual<\/title>/, `<title>Nova_A ${engineVersion} Manual</title>`)
    .replace(/(<strong>Nova_A<\/strong><span>) \d+\.\d+\.\d+ Offline Teaching Manual(<\/span>)/, `$1 ${engineVersion} Offline Teaching Manual$2`)
    .replace(/Engine \d+\.\d+\.\d+ ·/g, `Engine ${engineVersion} ·`)
    .replaceAll('Nova_A 5.9 Manual', `Nova_A ${engineVersion} Manual`).replaceAll('Nova_A 6.0 Manual', `Nova_A ${engineVersion} Manual`).replaceAll('5.9.0 Offline Documentation', `${engineVersion} Offline Teaching Manual`).replaceAll('6.0.0 Offline Teaching Manual', `${engineVersion} Offline Teaching Manual`).replaceAll('Engine 5.9.0', `Engine ${engineVersion}`).replaceAll('Engine 6.0.0', `Engine ${engineVersion}`)
  const supplement = `<!-- NOVA_V6_TEACHING_START -->\n<div class="release-supplement v6-manual" aria-label="Nova_A 6.0 task-oriented teaching manual">${['en', 'de', 'zh-CN'].map(locale => htmlFor(locale, CREATOR_LEARNING_GUIDES, localizedLearningGuide)).join('')}</div>\n<!-- NOVA_V6_TEACHING_END -->`
  html = replaceMarked(html, '<!-- NOVA_V6_TEACHING_START -->', '<!-- NOVA_V6_TEACHING_END -->', supplement.replace('<!-- NOVA_V6_TEACHING_START -->\n', '').replace('\n<!-- NOVA_V6_TEACHING_END -->', ''))
  html = html.replace('</style>', `.v6-manual{padding:0 24px 40px}.v6-panel{margin:24px 0}.v6-guide{border:1px solid var(--line);border-radius:14px;margin:8px 0;background:var(--panel)}.v6-guide summary{display:flex;justify-content:space-between;gap:16px;padding:14px;cursor:pointer}.v6-guide summary span{font-size:12px;color:var(--muted);text-align:end}.v6-guide>div{padding:0 16px 16px}.v6-guide h3{font-size:14px;margin:16px 0 6px}@media(max-width:760px){.v6-manual{padding:0 12px 28px}.v6-guide summary{align-items:flex-start;flex-direction:column}}@media(prefers-reduced-motion:reduce){.v6-guide{scroll-behavior:auto}}\n</style>`)
  await writeFile(htmlPath, html, 'utf8')
  console.log(`Generated ${CREATOR_LEARNING_GUIDES.length} complete feature lessons in English, German and Chinese.`)
} finally { await server.close() }
