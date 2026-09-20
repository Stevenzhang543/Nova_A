<template>
  <main class="project-manager">
    <header class="manager-header">
      <a class="identity" href="https://whitelists.top" target="_blank" rel="noreferrer"><span>N</span><strong>Nova_A</strong></a>
      <nav :aria-label="libraryText.utilities">
        <select v-model="prefs.locale" :aria-label="t('language')"><option value="en">English</option><option value="de">Deutsch</option><option value="zh">中文</option></select>
        <button class="manual-link" type="button" @click="openBundledManual">{{ t('learnNova') }}</button>
        <span class="version">{{ NOVA_RELEASE_NAME }}</span>
      </nav>
    </header>

    <section class="manager-shell">
      <div class="welcome">
        <span class="eyebrow">{{ t('projectFormatTwo') }}</span>
        <h1>{{ t('createSomethingPlayable') }}</h1>
        <p>{{ t('projectManagerDescription') }}</p>
        <div class="quick-actions">
          <button class="new-project" :disabled="state.busy" @click="creationOpen = true">{{ t('newProject') }}</button>
          <button class="primary" :disabled="state.busy" @click="chooseProject('open')">{{ t('openProject') }}</button>
          
          
          
          <button v-if="state.currentSnapshot" :disabled="state.busy" @click="continueCurrentProject">{{ t('continueProject') }}</button>
          
        </div>
        <details class="more-project-actions"><summary>{{ moreActionsLabel }}</summary><div class="quick-actions"><button :disabled="state.busy" @click="chooseProject('add')">{{ t('addExistingProject') }}</button>
<button :disabled="state.busy" @click="chooseProject('migrate')">{{ t('migrateOlderProject') }}</button>
<button :disabled="state.busy" @click="chooseProject('archive')">{{ t('importArchive') }}</button>
<button v-if="state.rollbackAvailable" :disabled="state.busy" @click="downloadLastUpgradeRollback">{{ t('downloadRollback') }}</button></div></details>
        <p v-if="state.error" class="error" role="alert">{{ state.error }}</p>
      </div>

      <Teleport to="body"><Transition name="creation-dialog"><div v-if="creationOpen" class="creation-scrim" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('newProject')" @keydown.esc.stop.prevent="closeCreation">
      <section class="creation-card">
        <div class="creation-title"><h2>{{ t('newProject') }}</h2><button :disabled="state.busy" @click="closeCreation">{{ t('cancel') }}</button></div>
        <p v-if="state.error" class="error" role="alert">{{ state.error }}</p>
        <header><div><span>{{ t('newProject') }}</span><strong>{{ projectName || t('untitledProject') }}</strong></div><label>{{ t('projectName') }}<input v-model="projectName" maxlength="80" @keydown.enter="create"></label></header>
        <label class="project-location"><span>{{ t('projectLocation') }}</span><input v-model.trim="projectLocation" maxlength="500" :aria-invalid="Boolean(pathError)"><small :class="{ 'path-error': pathError }">{{ pathError || t('projectFolderHint') }}</small></label>
        <nav class="template-categories" role="tablist" :aria-label="t('templateCategories')">
          <button v-for="category in categories" :key="category" :data-template-category="category" type="button" role="tab" :aria-selected="selectedCategory === category" :class="{ active: selectedCategory === category }" @click="selectCategory(category)">
            <span>{{ categoryIcon[category] }}</span><strong>{{ categoryName(category) }}</strong><small>{{ templateCount(category) }}</small>
          </button>
        </nav>
        <p class="category-description">{{ selectedCategory === 'all' ? libraryText.browse : categoryDescription(selectedCategory) }}</p>
        <div class="template-library-tools">
          <label><span>{{ t('searchTemplates') }}</span><input v-model.trim="templateQuery" type="search" :placeholder="t('searchTemplatesPlaceholder')"></label>
          <label><span>{{ t('difficulty') }}</span><select v-model="templateDifficulty"><option value="all">{{ t('allDifficulties') }}</option><option value="beginner">{{ t('beginner') }}</option><option value="intermediate">{{ t('intermediate') }}</option><option value="advanced">{{ t('advanced') }}</option></select></label>
          <label><span>{{ libraryText.sort }}</span><select v-model="templateSort"><option value="catalog">{{ libraryText.catalog }}</option><option value="newest">{{ libraryText.newest }}</option><option value="name">{{ t('name') }}</option><option value="time">{{ libraryText.quickest }}</option></select></label>
        </div>
        <div class="template-results"><span role="status" aria-live="polite">{{ libraryText.results.replace('{count}', String(visibleTemplates.length)).replace('{total}', String(templates.length)) }}</span><button type="button" @click="resetTemplateFilters">{{ libraryText.reset }}</button></div>
        <div class="template-grid">
          <button v-for="template in visibleTemplates" :key="template.id" :data-template-id="template.id" :class="{ selected: selectedTemplate === template.id }" :aria-pressed="selectedTemplate === template.id" @click="selectedTemplate = template.id">
            <span class="template-preview"><img :src="templatePreview(template.id)" :alt="`${libraryText.previewOf} ${templateName(template.id, template.name)}`" loading="lazy" width="640" height="360"><small>{{ libraryText.preview }}</small></span>
            <strong>{{ templateName(template.id, template.name) }}</strong>
            <small>{{ templateDescription(template.id, template.description) }}</small>
            <span class="template-requirements" :aria-label="libraryText.requirements"><span v-for="requirement in templateGuide(template.id, prefs.locale).requirements" :key="requirement">{{ requirement }}</span></span>
            <span class="feature-list">{{ templateFeatures(template.id, template.features).join(' · ') }}</span>
            <span class="template-meta"><b>{{ t(template.difficulty) }}</b><span>{{ t('setupMinutes', { count: template.setupMinutes }) }}</span></span>
          </button>
          <p v-if="!visibleTemplates.length" class="template-empty">{{ t('noMatchingTemplates') }}</p>
        </div>
        <section v-if="selectedTemplateRecord && selectedGuide" class="template-details" :aria-label="t('templateDetails')">
          <header><strong>{{ templateName(selectedTemplateRecord.id, selectedTemplateRecord.name) }}</strong><small>{{ t(selectedTemplateRecord.difficulty) }} · {{ t('setupMinutes', { count: selectedTemplateRecord.setupMinutes }) }}</small></header>
          <p v-if="selectedGuide.foundation" class="template-foundation">{{ libraryText.foundation }}: {{ templateName(selectedGuide.foundation, selectedGuide.foundation) }}</p>
          <div class="template-instructions"><section><h3>{{ libraryText.controls }}</h3><p>{{ selectedGuide.controls }}</p></section><section><h3>{{ libraryText.expected }}</h3><p>{{ selectedGuide.expected }}</p></section></div>
          <nav class="template-help" :aria-label="t('documentation')"><button type="button" :aria-label="`${libraryText.guide}: ${templateName(selectedTemplateRecord.id, selectedTemplateRecord.name)}`" @click="openTemplateManual(selectedGuide.manualSection)">{{ libraryText.guide }}</button><button type="button" :aria-label="`${libraryText.task}: ${templateName(selectedTemplateRecord.id, selectedTemplateRecord.name)}`" @click="openTemplateManual(selectedGuide.taskSection)">{{ libraryText.task }}</button></nav>
          <small>{{ libraryText.captureHint }}</small>
        </section>
        <p class="template-selection" aria-live="polite">{{ selectedTemplateRecord ? `${libraryText.selected}: ${templateName(selectedTemplateRecord.id, selectedTemplateRecord.name)}` : t('noMatchingTemplates') }}</p>
        <button class="create-button" :disabled="state.busy || Boolean(pathError) || !projectName.trim() || !selectedTemplateRecord" :title="pathError" @click="create">{{ state.busy ? t('preparingProject') : t('createProject') }}</button>
      </section>

      </div></Transition></Teleport>

      <section class="recents-card">
        <header><div><span>{{ t('recentProjects') }}</span><strong>{{ state.recents.length }}</strong></div><small>{{ t('recentProjectsHint') }}</small></header>
        <div v-if="state.recents.length" class="recent-list">
          <article v-for="recent in state.recents" :key="recent.id">
            <button class="recent-main" :disabled="state.busy || !recent.snapshot" @click="openRecentProject(recent.id)">
              <span class="recent-mark">{{ recent.name.slice(0, 1).toUpperCase() }}</span>
              <span><strong>{{ recent.name }}</strong><small>{{ recent.template }} · {{ formatDate(recent.updatedAt) }}</small></span>
              <em>{{ recent.snapshot ? t('open') : t('selectFileRequired') }}</em>
            </button>
            <button class="remove-recent" :aria-label="t('removeRecent')" @click="removeRecentProject(recent.id)">×</button>
          </article>
        </div>
        <p v-else class="empty-recents">{{ t('noRecentProjects') }}</p>
      </section>
    </section>

    <footer><span>{{ t('managerFooter') }}</span><a href="https://github.com/Stevenzhang543/Nova_A/" target="_blank" rel="noreferrer">GitHub</a></footer>
    <div v-if="state.pendingUpgrade" class="upgrade-scrim" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('projectUpgrade')">
      <section class="upgrade-dialog">
        <header><div><span class="eyebrow">{{ t('projectUpgrade') }}</span><h2>{{ t('upgradePreview') }}</h2></div><button :aria-label="t('cancel')" @click="cancelPendingProjectUpgrade">×</button></header>
        <div class="upgrade-flow"><strong>{{ state.pendingUpgrade.preview.sourceEngine }} · Schema {{ state.pendingUpgrade.preview.sourceSchema }}</strong><span>→</span><strong>{{ state.pendingUpgrade.preview.targetEngine }} · Schema {{ state.pendingUpgrade.preview.targetSchema }}</strong></div>
        <div class="compatibility-summary"><strong>{{ state.pendingUpgrade.preview.projectName }}</strong><small>{{ state.pendingUpgrade.preview.projectFormat }} · Engine {{ state.pendingUpgrade.preview.engineCompatibility }}</small></div>
        <div class="upgrade-stats"><span>{{ t('scenes') }} <b>{{ state.pendingUpgrade.preview.sceneCount }}</b></span><span>{{ t('entities') }} <b>{{ state.pendingUpgrade.preview.entityCount }}</b></span><span>{{ t('assets') }} <b>{{ state.pendingUpgrade.preview.assetCount }}</b></span></div>
        <section class="preflight"><strong>{{ t('preflightReport') }}</strong><div v-for="check in state.pendingUpgrade.preview.preflight" :key="check.id" :class="check.status"><span>{{ check.status === 'passed' ? '✓' : check.status === 'blocked' ? '×' : check.status === 'warning' ? '!' : '…' }}</span><p><b>{{ localizedPreflightLabel(check.id) }}</b><small>{{ localizedPreflightDetail(check.id, check.status) }}</small></p></div></section>
        <section v-if="state.pendingUpgrade.preview.warnings.length" class="migration-warnings"><ul><li v-for="warning in state.pendingUpgrade.preview.warnings" :key="warning">{{ warning }}</li></ul><button @click="openBundledManual('migration')">{{ t('documentation') }}</button></section>
        <section v-if="state.pendingUpgrade.preview.packageProblems.length" class="package-audit"><strong>{{ t('packageAudit') }}</strong><p v-for="problem in state.pendingUpgrade.preview.packageProblems" :key="problem">{{ problem }}</p></section>
        <details v-if="state.pendingUpgrade.preview.migrationSteps.length" class="migration-steps"><summary>{{ t('migrationPlan') }} · {{ state.pendingUpgrade.preview.migrationSteps.length }}</summary><ol><li v-for="step in state.pendingUpgrade.preview.migrationSteps" :key="`${step.fromSchema}:${step.toSchema}:${step.name}`">{{ step.fromSchema }} → {{ step.toSchema }} · {{ step.name }}</li></ol></details>
        <label v-if="state.pendingUpgrade.preview.requiresMigration" class="backup-choice"><input checked disabled type="checkbox"><span>{{ t('backupBeforeUpgradeRequired') }}</span></label>
        <p>{{ t('upgradeAtomicHint') }}</p>
        <p v-if="state.lockConflict" class="lock-warning">{{ t('projectLockedBy',{owner:state.lockConflict.owner,time:new Date(state.lockConflict.expiresAt).toLocaleString()}) }}</p>
        <footer><button @click="cancelPendingProjectUpgrade">{{ t('cancel') }}</button><button v-if="state.lockConflict" @click="migrateAndOpen(true)">{{ t('openReadOnly') }}</button><button class="primary" :disabled="state.pendingUpgrade.preview.preflight.some(check => check.status === 'blocked') || Boolean(state.lockConflict)" @click="migrateAndOpen(false)">{{ state.pendingUpgrade.preview.requiresMigration ? t('migrateAndOpen') : t('openProject') }}</button></footer>
      </section>
    </div>
    <div v-if="state.readOnlyDocument" class="upgrade-scrim" role="dialog" aria-modal="true" v-modal-focus :aria-label="t('readOnlyCompatibility')">
      <section class="upgrade-dialog read-only-dialog">
        <header><div><span class="eyebrow">{{ t('readOnlyCompatibility') }}</span><h2>{{ state.readOnlyDocument.preview.projectName }}</h2></div><button :aria-label="t('cancel')" @click="closeReadOnlyDocument">×</button></header>
        <p>{{ t('readOnlyCompatibilityHint', { schema: state.readOnlyDocument.preview.sourceSchema, supported: state.readOnlyDocument.preview.targetSchema }) }}</p>
        <textarea readonly :value="state.readOnlyDocument.source"></textarea>
        <footer><button @click="closeReadOnlyDocument">{{ t('close') }}</button><button class="primary" @click="downloadReadOnlyDocument">{{ t('downloadOriginal') }}</button></footer>
      </section>
    </div>
    <input ref="openInput" hidden type="file" accept=".nova,.json,application/json" @change="readFile($event, false)">
    <input ref="importInput" hidden type="file" accept=".nova,.json,application/json" @change="readFile($event, true)">
    <input ref="migrationInput" hidden type="file" accept=".nova,.json,application/json" @change="readFile($event, false)">
    <input ref="archiveInput" hidden type="file" accept=".zip,.nova-archive,application/zip" @change="readArchive">
  </main>
</template>

<script setup lang="ts">
import { vModalFocus } from '../editor/modalFocus'
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { preferencesState as prefs } from '../store/preferences'
import { applyPendingProjectUpgrade, cancelPendingProjectUpgrade, closeReadOnlyDocument, continueCurrentProject, createNewProject, downloadLastUpgradeRollback, downloadReadOnlyDocument, openProjectDocument, openRecentProject, projectManagerState as state, removeRecentProject } from '../projects/projectManager'
import { PROJECT_TEMPLATE_CATEGORIES, PROJECT_TEMPLATES as templates, type ProjectTemplateCategory, type ProjectTemplateId } from '../projects/templates'
import { discoverTemplates } from '../projects/templateDiscovery'
import { templateGuide } from '../projects/templateGuides'
import { openBundledManual } from '../runtime/openManual'
import { completeTask, failTask, startTask } from '../runtime/editorFeedback'
import { watchProjectFile } from '../runtime/projectExternalChanges'
import { readProjectArchive } from '../projects/projectArchive'
import { NOVA_RELEASE_NAME } from '../projects/projectFormat'

const creationOpen = ref(false)
const moreActionsLabel = computed(() => ({ en: 'More project actions', de: 'Weitere Projektaktionen', zh: '更多项目操作' }[prefs.locale]))
function closeCreation() { if (!state.busy) creationOpen.value = false }
const projectName = ref('My Game')
const projectLocation = ref('Projects/My Game')
const selectedTemplate = ref<ProjectTemplateId | null>('empty')
const selectedCategory = ref<ProjectTemplateCategory | 'all'>('all')
const categories = ['all', ...PROJECT_TEMPLATE_CATEGORIES] as const
const templateQuery = ref('')
const templateDifficulty = ref<'all' | 'beginner' | 'intermediate' | 'advanced'>('all')
const templateSort = ref<'catalog' | 'name' | 'time' | 'newest'>('catalog')
const libraryText = computed(() => ({
  en: { browse: 'Browse all starters, or narrow the library by category, difficulty, and search.', sort: 'Sort by', catalog: 'Catalog order', newest: 'Newest first', quickest: 'Quickest setup', results: '{count} of {total} templates', reset: 'Reset filters', selected: 'Create from', utilities: 'Project manager utilities', preview: 'Runtime preview', previewOf: 'Runtime preview of', controls: 'Controls and setup', expected: 'Expected result', requirements: 'Requirements', guide: 'Feature manual', task: 'Related task', foundation: 'Uses the complete foundation', captureHint: 'Captured from the running Game view. Colors and motion may vary by renderer and frame.' },
  de: { browse: 'Alle Vorlagen durchsuchen oder nach Kategorie, Schwierigkeit und Suchbegriff filtern.', sort: 'Sortieren', catalog: 'Katalogreihenfolge', newest: 'Neueste zuerst', quickest: 'Schnellster Einstieg', results: '{count} von {total} Vorlagen', reset: 'Filter zurücksetzen', selected: 'Erstellen aus', utilities: 'Projektmanager-Werkzeuge', preview: 'Laufzeitvorschau', previewOf: 'Laufzeitvorschau von', controls: 'Steuerung und Einrichtung', expected: 'Erwartetes Ergebnis', requirements: 'Voraussetzungen', guide: 'Funktionshandbuch', task: 'Verwandte Aufgabe', foundation: 'Nutzt die vollständige Grundlage', captureHint: 'Aus der laufenden Spielansicht aufgenommen. Farben und Bewegung können je nach Renderer und Frame variieren.' },
  zh: { browse: '浏览所有模板，或按分类、难度和关键词筛选。', sort: '排序方式', catalog: '目录顺序', newest: '最新优先', quickest: '最快上手', results: '{count} / {total} 个模板', reset: '重置筛选', selected: '使用模板', utilities: '项目管理工具', preview: '运行时预览', previewOf: '运行时预览：', controls: '操作与准备', expected: '预期结果', requirements: '使用要求', guide: '功能手册', task: '相关任务', foundation: '使用完整基础项目', captureHint: '截图来自正在运行的游戏视口；颜色与运动效果可能因渲染器和帧而异。' }
}[prefs.locale]))
const openInput = ref<HTMLInputElement | null>(null)
const importInput = ref<HTMLInputElement | null>(null)
const migrationInput = ref<HTMLInputElement | null>(null)
const archiveInput = ref<HTMLInputElement | null>(null)

const categoryIcon: Record<ProjectTemplateCategory | 'all', string> = { all: '▦', scene: '◇', test: '⌁', game: '▶' }

function templateName(id: ProjectTemplateId, fallback: string): string { const translated = templates.find(value => value.id === id)?.localized?.[prefs.locale as 'de' | 'zh']; if (translated) return translated.name; const key = `template_${id}_name`, localized = t(key); return localized && localized !== key ? localized : fallback }
function templateDescription(id: ProjectTemplateId, fallback: string): string { const translated = templates.find(value => value.id === id)?.localized?.[prefs.locale as 'de' | 'zh']; if (translated) return translated.description; const key = `template_${id}_description`, localized = t(key); return localized && localized !== key ? localized : fallback }
function templateFeatures(id: ProjectTemplateId, fallback: string[]): string[] { const key = `template_${id}_features`, localized = t(key); return localized && localized !== key ? localized.split('|') : fallback }
function categoryName(category: ProjectTemplateCategory | 'all'): string { return category === 'all' ? t('all') : t(`templateCategory_${category}`) }
function categoryDescription(category: ProjectTemplateCategory): string { return t(`templateCategory_${category}_description`) }
function templateCount(category: ProjectTemplateCategory | 'all'): number { return category === 'all' ? templates.length : templates.filter(template => template.category === category).length }
function selectCategory(category: ProjectTemplateCategory | 'all'): void {
  selectedCategory.value = category
}
const visibleTemplates = computed(() => discoverTemplates(templates, { category: selectedCategory.value, difficulty: templateDifficulty.value, query: templateQuery.value, sort: templateSort.value, locale: prefs.locale }, template => `${templateName(template.id, template.name)} ${templateDescription(template.id, template.description)} ${templateFeatures(template.id, template.features).join(' ')} ${templateGuide(template.id, prefs.locale).controls} ${templateGuide(template.id, prefs.locale).expected} ${templateGuide(template.id, prefs.locale).requirements.join(' ')}`))
watch(visibleTemplates, visible => { if (!visible.some(template => template.id === selectedTemplate.value)) selectedTemplate.value = visible[0]?.id ?? null }, { flush: 'sync' })
const selectedTemplateRecord = computed(() => visibleTemplates.value.find(template => template.id === selectedTemplate.value))
const selectedGuide = computed(() => selectedTemplateRecord.value ? templateGuide(selectedTemplateRecord.value.id, prefs.locale) : null)
const previews = import.meta.glob('../assets/template-previews/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
function templatePreview(id: ProjectTemplateId): string { return previews[`../assets/template-previews/${id}.png`] ?? '' }
function openTemplateManual(section: string): void { openBundledManual(`${prefs.locale === 'zh' ? 'zh-CN' : prefs.locale}-${section}`) }
function resetTemplateFilters(): void { selectedCategory.value = 'all'; templateDifficulty.value = 'all'; templateQuery.value = ''; templateSort.value = 'catalog' }
const pathError = computed(() => {
  const value = projectLocation.value.trim()
  if (!value) return t('projectLocationRequired')
  if (/[<>"|?*\u0000-\u001f]/.test(value) || /(^|[\\/])\.\.([\\/]|$)/.test(value)) return t('projectLocationInvalid')
  if (/(^|[\\/])(con|prn|aux|nul|com[1-9]|lpt[1-9])([.\\/]|$)/i.test(value)) return t('projectLocationReserved')
  return ''
})
function create(): void { if (!state.busy && !pathError.value && projectName.value.trim() && selectedTemplateRecord.value) void createNewProject(projectName.value, selectedTemplateRecord.value.id, projectLocation.value) }
async function chooseProject(mode:'open'|'add'|'migrate'|'archive'):Promise<void>{
  if(mode==='archive'){archiveInput.value?.click();return}
  const picker=(window as unknown as {showOpenFilePicker?: (options:unknown)=>Promise<Array<{getFile():Promise<File>}>>}).showOpenFilePicker
  if(picker){try{const projectHandle=(await picker({multiple:false,types:[{description:'Nova_A Project',accept:{'application/json':['.nova','.json']}}]}))[0];if(!projectHandle)return;const file=await projectHandle.getFile();await openProjectDocument(await file.text(),file.name,mode==='add');if(mode==='open')await watchProjectFile(projectHandle)}catch(error){if(!(error instanceof DOMException&&error.name==='AbortError'))state.error=error instanceof Error?error.message:String(error)};return}
  ;(mode==='add'?importInput:mode==='migrate'?migrationInput:openInput).value?.click()
}
async function migrateAndOpen(readOnly=false): Promise<void> {
  const pending = state.pendingUpgrade
  if (!pending) return
  const task = startTask(t('projectUpgrade'), { detail: `Schema ${pending.preview.sourceSchema} → ${pending.preview.targetSchema}` })
  try {
    if (!await applyPendingProjectUpgrade(readOnly)) throw new Error(state.error || t('operationFailed'))
    completeTask(task, t('upgradeComplete'))
  } catch (error) { failTask(task, error) }
}
function formatDate(value: string): string { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(prefs.locale === 'zh' ? 'zh-CN' : prefs.locale) }

function localizedPreflightLabel(id: string): string { return t(`preflight_${id}_label`) }
function localizedPreflightDetail(id: string, status: string): string {
  const preview = state.pendingUpgrade?.preview
  if (!preview) return ''
  if (id === 'document') return t('preflight_document_detail')
  if (id === 'format') return t(status === 'blocked' ? 'preflight_format_blocked' : 'preflight_format_ok', { format: preview.projectFormat, schema: preview.sourceSchema })
  if (id === 'schema') return t(status === 'blocked' ? 'preflight_schema_blocked' : 'preflight_schema_ok', { source: preview.sourceSchema, target: preview.targetSchema })
  if (id === 'engine') return t(status === 'blocked' ? 'preflight_engine_blocked' : 'preflight_engine_ok', { range: preview.engineCompatibility, engine: preview.targetEngine })
  if (id === 'packages') return t(preview.packageProblems.length ? 'preflight_packages_warning' : 'preflight_packages_ok', { count: preview.packageProblems.length })
  if (id === 'backup') return t('preflight_backup_detail')
  if (id === 'validation') return t(status === 'blocked' ? 'preflight_validation_blocked' : 'preflight_validation_pending')
  return preview.preflight.find(check => check.id === id)?.detail ?? id
}

function readFile(event: Event, asCopy: boolean): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => { if (typeof reader.result === 'string') void openProjectDocument(reader.result, file.name, asCopy) }
  reader.onerror = () => { state.error = reader.error?.message ?? t('fileReadFailed') }
  reader.readAsText(file)
  input.value = ''
}
async function readArchive(event:Event):Promise<void>{const input=event.target as HTMLInputElement,file=input.files?.[0];if(!file)return;const task=startTask(t('importArchive'),{detail:file.name,progress:null});try{const archive=await readProjectArchive(file);await openProjectDocument(archive.source,archive.entry,true);completeTask(task,`${archive.entries} archive entries checked.`)}catch(error){state.error=error instanceof Error?error.message:String(error);failTask(task,error)}finally{input.value=''}}
</script>

<style scoped>
.project-manager { width: 100%; height: 100%; min-height: 0; display: flex; flex-direction: column; overflow-x: hidden; overflow-y: auto; scrollbar-gutter: stable; color: var(--text-primary); background: radial-gradient(circle at 12% 8%, var(--accent-soft), transparent 31%), linear-gradient(145deg, var(--bg-base), var(--surface-1)); }
.manager-header { min-height: 56px; padding: 0 clamp(18px, 4vw, 52px); display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 82%, transparent); backdrop-filter: blur(18px); position: sticky; top: 0; z-index: 2; }
.identity { display: flex; align-items: center; gap: 10px; color: inherit; text-decoration: none; }.identity span { width: 29px; height: 29px; display: grid; place-items: center; border-radius: 9px; color: var(--accent-contrast); background: linear-gradient(145deg, var(--accent), var(--accent-strong)); box-shadow: 0 7px 20px var(--accent-soft); }.identity strong { font-size: 15px; letter-spacing: -.02em; }
.manager-header nav { display: flex; align-items: center; gap: 8px; }.manager-header select, .manager-header a, .manager-header .manual-link, .version { min-height: 30px; padding: 0 10px; display: inline-flex; align-items: center; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-secondary); background: var(--surface-2); font-size:11px; text-decoration: none; }.manager-header .manual-link { cursor: pointer; }.version { color: var(--accent); }
.manager-shell { width: min(1180px, calc(100% - 32px)); margin: 0 auto; padding: 52px 0; display: grid; grid-template-columns: minmax(250px, .72fr) minmax(520px, 1.55fr); gap: 18px; }.welcome { padding: 26px 10px 20px 0; }.eyebrow, .creation-card header span, .recents-card header span { color: var(--accent); font-size:11px; font-weight: 750; letter-spacing: .09em; text-transform: uppercase; }.welcome h1 { max-width: 480px; margin: 13px 0 12px; font-size: clamp(34px, 5vw, 62px); line-height: .98; letter-spacing: -.055em; }.welcome > p { max-width: 470px; color: var(--text-muted); font-size: 12px; line-height: 1.65; }.quick-actions { margin-top: 24px; display: flex; flex-wrap: wrap; gap: 8px; }.quick-actions button, .create-button { min-height: 38px; padding: 0 15px; border: 1px solid var(--border-strong); border-radius: 10px; color: var(--text-secondary); background: var(--surface-2); font-size: 11px; }.quick-actions .primary, .create-button { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.error { padding: 10px 12px; border: 1px solid var(--danger); border-radius: 10px; color: var(--danger) !important; background: var(--danger-soft); }
.creation-card, .recents-card { border: 1px solid var(--border-subtle); border-radius: 18px; background: color-mix(in srgb, var(--surface-1) 91%, transparent); box-shadow: var(--shadow-md); overflow: hidden; }.creation-card { grid-row: span 2; padding: 18px; }.creation-card header { display: flex; align-items: end; justify-content: space-between; gap: 16px; }.creation-card header div { display: flex; flex-direction: column; gap: 5px; }.creation-card header strong { font-size: 16px; }.creation-card label { width: min(250px, 48%); display: flex; flex-direction: column; gap: 4px; color: var(--text-muted); font-size:11px; }.creation-card input { min-height: 32px; }
.creation-card .project-location{width:100%;margin-top:12px}.project-location small{min-height:18px}.project-location small.path-error{color:var(--danger)}.template-details{margin-top:10px;padding:9px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.template-details p{margin:5px 0;color:var(--text-muted)}.template-details span{color:var(--accent)}
.template-categories{margin-top:12px;padding:4px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:4px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--surface-2)}.template-categories button{min-width:0;min-height:43px;padding:5px 8px;display:grid;grid-template-columns:22px minmax(0,1fr) auto;align-items:center;gap:6px;border:1px solid transparent;border-radius:9px;color:var(--text-muted);background:transparent;text-align:left}.template-categories button:hover{color:var(--text-primary);background:var(--surface-3)}.template-categories button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft);box-shadow:0 5px 16px color-mix(in srgb,var(--accent) 10%,transparent)}.template-categories button strong{min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:12px;line-height:1.2}.template-categories button small{min-width:22px;text-align:center}.category-description{min-height:34px;margin:8px 3px 0;color:var(--text-muted);font-size:11px;line-height:1.45}
.template-library-tools{margin-top:8px;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(150px,.7fr);gap:8px}.template-library-tools label{min-width:0;display:grid;gap:4px;color:var(--text-muted)}.template-library-tools input,.template-library-tools select{width:100%;min-width:0}.template-grid { max-height:min(430px,42vh);margin-top: 8px; padding:1px 4px 8px 1px;overflow:auto;display: grid; grid-template-columns: 1fr 1fr; align-content:start;gap: 9px; }.template-grid button { min-width:0;min-height: 166px; padding: 15px; display: flex; flex-direction: column; align-items: flex-start; gap: 7px; border: 1px solid var(--border-subtle); border-radius: 13px; color: var(--text-primary); background: var(--surface-2); text-align: left; }.template-grid button:hover, .template-grid button.selected { transform: translateY(-2px); border-color: var(--accent); background: var(--accent-soft); box-shadow: 0 10px 28px color-mix(in srgb, var(--accent) 12%, transparent); }.template-icon { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; color: var(--accent); background: var(--surface-3); font-size: 20px; }.template-grid strong { font-size: 12px; }.template-grid small { color: var(--text-muted); font-size:11px; line-height: 1.45; }.feature-list { margin-top: auto; color: var(--accent); font-size:11px;overflow-wrap:anywhere}.template-meta{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;color:var(--text-muted);font-size:var(--type-caption)}.template-meta b{color:var(--text-secondary);font-weight:650}.template-empty{grid-column:1/-1;min-height:120px;margin:0;display:grid;place-items:center;color:var(--text-muted);text-align:center}.template-details{display:grid;gap:4px}.template-details small{display:block;margin-top:5px;color:var(--text-muted)}.create-button { width: 100%; margin-top: 12px; }
.recents-card { grid-column: 1; padding: 16px; }.recents-card header { display: flex; align-items: end; justify-content: space-between; gap: 10px; }.recents-card header div { display: flex; align-items: baseline; gap: 8px; }.recents-card header strong { font-size: 17px; }.recents-card header small { max-width: 190px; color: var(--text-muted); font-size:11px; text-align: right; }.recent-list { margin-top: 12px; display: grid; gap: 6px; }.recent-list article { display: grid; grid-template-columns: 1fr 28px; gap: 4px; }.recent-main { min-width: 0; min-height: 48px; padding: 5px 8px; display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 9px; color: var(--text-primary); background: var(--surface-2); text-align: left; }.recent-main:hover { border-color: var(--accent); background: var(--accent-soft); }.recent-main > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; }.recent-main strong, .recent-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.recent-main strong { font-size:11px; }.recent-main small { color: var(--text-muted); font-size:11px; }.recent-main em { color: var(--accent); font-size:11px; font-style: normal; }.recent-mark { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; color: var(--accent); background: var(--accent-soft); }.remove-recent { border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }.remove-recent:hover { color: var(--danger); background: var(--danger-soft); }.empty-recents { margin: 14px 0 0; color: var(--text-muted); font-size:11px; }.project-manager footer { min-height: 42px; padding: 0 clamp(18px, 4vw, 52px); display: flex; align-items: center; justify-content: space-between; color: var(--text-muted); border-top: 1px solid var(--border-subtle); font-size:11px; }.project-manager footer a { color: var(--accent); text-decoration: none; }
@media (max-width: 900px) { .manager-shell { grid-template-columns: 1fr; padding: 28px 0; }.welcome { padding: 10px 0; }.creation-card { grid-row: auto; }.recents-card { grid-column: auto; }.welcome h1 { font-size: 40px; } }
@media (max-width: 580px) { .manager-header { padding: 0 12px; }.identity strong, .version { display: none; }.manager-shell { width: min(100% - 20px, 560px); }.creation-card header { align-items: stretch; flex-direction: column; }.creation-card label { width: 100%; }.template-categories button{grid-template-columns:1fr;place-items:center;text-align:center}.template-categories button strong{white-space:normal}.template-categories button small{display:none}.template-library-tools{grid-template-columns:1fr}.template-grid { grid-template-columns: 1fr;max-height:min(480px,48vh) }.template-grid button { min-height: 142px; } }
.manager-header select, .manager-header a, .manager-header .manual-link, .version { min-height: 32px; font-size: 12px; }
.eyebrow, .creation-card header span, .recents-card header span { font-size: 11px; }
.welcome > p { font-size: 14px; }.quick-actions button, .create-button { min-height: 40px; font-size: 12px; }
.creation-card label { font-size: 11px; }.creation-card input { min-height: 34px; }
.template-grid strong { font-size: 13px; }.template-grid small { font-size: 11px; }.feature-list { font-size:11px; }
.recents-card header small, .recent-main small, .recent-main em { font-size:11px; }.recent-main { min-height: 52px; }.recent-main strong { font-size: 11px; }
.empty-recents, .project-manager footer { font-size: 11px; }
.upgrade-scrim{position:fixed;inset:0;z-index:40;padding:20px;display:grid;place-items:center;background:var(--scrim);backdrop-filter:blur(10px)}.upgrade-dialog{width:min(620px,100%);max-height:min(720px,calc(100vh - 40px));padding:20px;overflow:auto;border:1px solid var(--border-strong);border-radius:18px;background:var(--surface-1);box-shadow:var(--shadow-lg)}.upgrade-dialog>header{display:flex;align-items:flex-start;justify-content:space-between}.upgrade-dialog h2{margin:5px 0 0;font-size:20px}.upgrade-dialog>header button{width:32px;height:32px;border:0;border-radius:8px;background:var(--surface-3)}.upgrade-flow{margin:18px 0;padding:18px;display:flex;align-items:center;justify-content:center;gap:18px;border:1px solid var(--border-subtle);border-radius:12px;background:var(--surface-2)}.upgrade-flow span{color:var(--accent);font-size:22px}.upgrade-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}.upgrade-stats span{padding:9px;display:flex;justify-content:space-between;border-radius:9px;background:var(--surface-2);color:var(--text-muted)}.upgrade-dialog ul,.upgrade-dialog>p,.package-audit p{color:var(--text-muted);font-size:11px;line-height:1.5}.package-audit{margin-top:12px;padding:10px;border:1px solid var(--warning);border-radius:10px}.package-audit p{margin:5px 0}.backup-choice{min-height:42px;margin-top:12px;padding:9px;display:flex;align-items:center;gap:8px;border-radius:9px;background:var(--accent-soft)}.upgrade-dialog>footer{margin-top:16px;padding:0;display:flex;justify-content:flex-end;gap:8px;border:0}.upgrade-dialog>footer button{min-height:36px;padding:0 14px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-3)}.upgrade-dialog>footer .primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
.compatibility-summary{padding:9px;display:grid;gap:3px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-2)}.compatibility-summary small{color:var(--text-muted)}.migration-steps{margin-top:12px;padding:9px;border:1px solid var(--border-subtle);border-radius:9px}.migration-steps summary{cursor:pointer}.migration-steps li{margin:4px 0;color:var(--text-muted);font-size:11px}.read-only-dialog{width:min(820px,100%)}.read-only-dialog textarea{width:100%;min-height:340px;margin-top:10px;resize:vertical;font:11px/1.45 var(--font-mono)}
.preflight{margin-top:10px;padding:10px;border:1px solid var(--border-subtle);border-radius:10px;background:var(--surface-2)}.preflight>strong{display:block;margin-bottom:6px}.preflight>div{min-height:36px;display:grid;grid-template-columns:22px minmax(0,1fr);gap:7px;align-items:center;border-top:1px solid var(--border-subtle)}.preflight>div>span{width:19px;height:19px;display:grid;place-items:center;border-radius:50%;color:var(--surface-1);background:var(--success);font-weight:800}.preflight>div.warning>span,.preflight>div.pending>span{background:var(--warning)}.preflight>div.blocked>span{background:var(--danger)}.preflight p{margin:0!important;display:grid}.preflight small{color:var(--text-muted);line-height:1.35}
.lock-warning{padding:9px;border:1px solid var(--warning);border-radius:9px;color:var(--warning)!important;background:color-mix(in srgb,var(--warning) 8%,transparent)}
/* More templates remain discoverable without squeezing the creation fields. */
.creation-card { container: nova-template-library / inline-size; }
.template-categories { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.template-categories button { grid-template-columns: minmax(0, 1fr) auto; }
.template-categories button > span { display: none; }
.template-categories button strong { white-space: normal; overflow: visible; line-height: 1.4; }
.template-library-tools { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr); }
.template-results { margin-top: 9px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; color: var(--text-muted); }
.template-results button { min-height: 30px; padding: 4px 10px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--surface-2); color: var(--text-primary); }
.template-grid { grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)); max-height: min(510px, 48vh); }
.template-grid button { min-height: 190px; }
.template-grid button > :is(strong, small) { overflow-wrap: anywhere; line-height: 1.5; }
.template-meta { flex-wrap: wrap; }
.template-selection { margin: 10px 0 0; line-height: 1.5; overflow-wrap: anywhere; color: var(--text-secondary); }
@container nova-template-library (max-width: 540px) {
  .template-library-tools { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .template-library-tools > label:first-child { grid-column: 1 / -1; }
  .template-categories { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container nova-template-library (max-width: 320px) {
  .template-library-tools { grid-template-columns: minmax(0, 1fr); }
}
/* 26.15: real previews and instructions stay readable in the launcher card's own width. */
.template-grid button { gap: 9px; padding: 12px; }
.template-library-tools > label { width: 100%; }
.template-preview { width: 100%; display: grid; gap: 4px; }
.template-preview img { width: 100%; height: auto; aspect-ratio: 16 / 9; object-fit: contain; background: #141922; border-radius: 7px; }
.template-preview small { color: var(--text-muted); font-size: var(--type-caption); }
.template-requirements { display: flex; flex-wrap: wrap; gap: 4px; }
.template-requirements > span { padding: 3px 6px; border: 1px solid var(--border-subtle); border-radius: 999px; font-size: var(--type-caption); color: var(--text-secondary); background: var(--surface-1); }
.template-details { padding: 13px; gap: 10px; }
.template-details > header { display: grid; gap: 4px; }
.template-details > header strong { overflow-wrap: anywhere; font-size: var(--type-section); }
.template-instructions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.template-instructions section { min-width: 0; }
.template-instructions h3 { margin: 0 0 5px; color: var(--text-primary); font-size: var(--type-body); }
.template-instructions p, .template-foundation { margin: 0; line-height: 1.6; overflow-wrap: anywhere; font-size: var(--type-body); }
.template-help { display: flex; flex-wrap: wrap; gap: 8px; }
.template-help button { min-height: 34px; padding: 6px 10px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--surface-1); color: var(--accent); overflow-wrap: anywhere; }
.template-details > small { line-height: 1.5; overflow-wrap: anywhere; }
@container nova-template-library (max-width: 540px) { .template-instructions { grid-template-columns: minmax(0, 1fr); } }
/* One scrolling page for creation; the template grid no longer nests a small scroll pane. */
.manager-shell { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
.quick-actions .new-project { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
.more-project-actions { margin-top: 16px; color: var(--text-secondary); }
.more-project-actions summary { cursor: pointer; width: fit-content; padding: 8px 0; }
.more-project-actions .quick-actions { margin-top: 4px; }
.creation-scrim { position: fixed; inset: 0; z-index: 1100; overflow: auto; padding: 24px; background: var(--scrim); overscroll-behavior: contain; }
.creation-scrim .creation-card { width: min(1180px, 100%); margin: 0 auto; overflow: visible; background: var(--surface-1); }
.creation-title { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
.creation-title h2 { margin: 0; }
.creation-title button { padding: 8px 16px; border: 1px solid var(--border-strong); border-radius: 8px; background: var(--surface-2); color: var(--text-primary); }
.creation-scrim .template-grid { max-height: none; overflow: visible; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); }
.creation-dialog-enter-active, .creation-dialog-leave-active { transition: opacity 130ms ease; }
.creation-dialog-enter-from, .creation-dialog-leave-to { opacity: 0; }
@media(max-width: 800px) { .manager-shell { grid-template-columns: minmax(0, 1fr); } .creation-scrim { padding: 8px; } }
</style>
