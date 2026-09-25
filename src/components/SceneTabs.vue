<!-- 场景标签栏：切换场景并管理载入、继承和场景设置。 -->
<template>
  <section class="scene-tabs" data-control-scope="scene-tabs" :data-resource-key="`scene:${active.uuid}`" :aria-label="t('sceneTabs')">
    <div class="history-actions">
      <button :disabled="sceneManager.navigationIndex <= 0" :title="t('previousScene')" @click="navigate(-1)">←</button>
      <button :disabled="sceneManager.navigationIndex >= sceneManager.navigationHistory.length - 1" :title="t('nextScene')" @click="navigate(1)">→</button>
    </div>
    <div class="tab-strip">
      <span v-for="scene in loadedScenes" :key="scene.uuid" class="scene-tab-entry"><button class="scene-tab" :class="{ active: scene.uuid === sceneManager.activeSceneUuid }" :title="tabDescription(scene)" @click="activate(scene.uuid)">
        <i :class="scene.validationState"></i><span>{{ scene.name }}</span><b v-if="scene.dirty">●</b><em v-if="scene.externalState !== 'clean'">↻</em><small v-if="scene.prefabState !== 'none'">P</small>
      </button><button v-if="scene.uuid !== sceneManager.activeSceneUuid" type="button" class="scene-tab-close" :aria-label="`${t('closeSceneTab')} · ${scene.name}`" :title="t('closeSceneTab')" @click.stop="close(scene.uuid)">×</button></span>
    </div>
    <details ref="createMenu" class="scene-menu"><summary :title="t('newSceneFromTemplate')">＋</summary><div><button v-for="template in templates" :key="template.id" @click="createFromTemplate(template.id)"><strong>{{ t(template.label) }}</strong><small>{{ t(template.description) }}</small></button></div></details>
    <button class="settings-toggle" :class="{ active: settingsOpen }" :title="t('sceneSettings')" @click="settingsOpen = !settingsOpen">⚙</button>
    <aside v-if="settingsOpen" class="scene-settings">
      <header><div><small>{{ t('sceneSettings') }}</small><strong>{{ active.name }}</strong></div><button @click="settingsOpen = false">×</button></header>
      <label><span>{{ t('sceneTemplate') }}</span><select v-model="active.settings.templateId" @change="changed('Set scene template', 'settings.templateId')"><option :value="null">{{ t('none') }}</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ t(template.label) }}</option></select></label>
      <label><span>{{ t('sceneRuntimePolicy') }}</span><select v-model="active.settings.runtimePolicy" @change="changed('Set scene runtime policy', 'settings.runtimePolicy')"><option value="Replace">{{ t('sceneReplace') }}</option><option value="Additive">{{ t('sceneAdditive') }}</option><option value="Overlay">{{ t('sceneOverlay') }}</option></select></label>
<!-- 场景继承候选过滤回调排除当前活动场景。 -->      <label><span>{{ t('sceneInheritance') }}</span><select :value="active.settings.inheritanceSourceUuid ?? ''" @change="setInheritance(($event.target as HTMLSelectElement).value)"><option value="">{{ t('none') }}</option><option v-for="scene in sceneManager.scenes.filter(scene => scene.uuid !== active.uuid)" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label>
      <label><span>{{ t('sceneTags') }}</span><input :value="active.settings.tags.join(', ')" @change="setTags(($event.target as HTMLInputElement).value)"></label>
      <section class="named-layers"><header><strong>{{ t('namedLayers') }}</strong><button @click="addNamedLayer">＋</button></header><div v-for="layer in active.settings.namedLayers" :key="layer.id"><i :style="{ background: layerColorCss(layer.id) }"></i><input v-model="layer.name" @change="renameLayer(layer.id, layer.name)"><button :class="{ active: layer.visible }" :title="t('entityVisible')" @click="layer.visible = !layer.visible; changed('Toggle named layer visibility', `settings.namedLayers.${layer.id}.visible`)">◉</button><button :class="{ active: layer.locked }" :title="t('entityLocked')" @click="layer.locked = !layer.locked; changed('Toggle named layer lock', `settings.namedLayers.${layer.id}.locked`)">▣</button></div></section>
      <section class="dependencies"><strong>{{ t('sceneDependencies') }} · {{ dependencies.length }}</strong><code v-for="dependency in dependencies" :key="dependency">{{ dependency }}</code><p v-if="!dependencies.length">{{ t('noSceneDependencies') }}</p></section>
      <footer><span>{{ t('sceneVisited') }}</span><time>{{ new Date(active.visitedAt).toLocaleString() }}</time></footer>
    </aside>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { t } from '../i18n'
import { createScene, physicsState, pushHistory, navigateScene, sceneManager, setActiveScene, setSceneLoaded, synchronizeHistoryBaseline } from '../store/physics'
import { createAuthoringObject } from '../editor/authoring2d'
import { validateSceneAuthoring } from '../editor/sceneAuthoring'
import { layerColorCss } from '../world/layers'
import type { SceneDocument } from '../world/SceneManager'

const settingsOpen = ref(false)
const createMenu = ref<HTMLDetailsElement | null>(null)
const templates = [
  { id: 'empty-2d', label: 'templateEmpty2D', description: 'templateEmpty2DDescription' },
  { id: 'gameplay-2d', label: 'templateGameplay2D', description: 'templateGameplay2DDescription' },
  { id: 'ui-overlay', label: 'templateUiOverlay', description: 'templateUiOverlayDescription' },
  { id: 'camera-stage', label: 'templateCameraStage', description: 'templateCameraStageDescription' }
] as const
const loadedScenes = computed(/** 仅显示当前已加载场景。 */ () => sceneManager.scenes.filter(/* 返回 scene.loaded 的当前值。 */ scene => scene.loaded))
const active = computed(/* 返回 sceneManager.activeScene 的当前值。 */ () => sceneManager.activeScene)
const dependencies = computed(/* 调用 sceneManager.inspectDependencies(active.value) 并返回调用结果。 */ () => sceneManager.inspectDependencies(active.value))
/** 组合场景名称、校验、外部变更和预制体状态作为标签说明。 */ function tabDescription(scene: SceneDocument): string { return `${scene.name} · ${scene.validationState} · ${scene.externalState} · ${scene.prefabState}` }
/** 切换场景成功后同步历史基线。 */ function activate(uuid: string) { if (setActiveScene(uuid)) synchronizeHistoryBaseline() }
/** 按前后偏移切换场景成功后同步历史基线。 */ function navigate(offset: -1 | 1) { if (navigateScene(offset)) synchronizeHistoryBaseline() }
/** 卸载场景标签成功后记录该场景历史。 */ function close(uuid: string) { if (setSceneLoaded(uuid, false)) pushHistory('Close scene tab', `scene:${uuid}`) }
/* 调用 [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 32) 并返回调用结果。 */ function cleanList(value: string) { return [...new Set(value.split(',').map(/* 调用 item.trim() 并返回调用结果。 */ item => item.trim()).filter(Boolean))].slice(0, 32) }
/** 标记场景已修改，并按设置路径记录场景范围历史。 */ function changed(label: string, path: string) { sceneManager.markDirty(); pushHistory(label, `scene-settings:${active.value.uuid}:${path}`, `scene:${active.value.uuid}`) }
/** 清理标签列表后保存并记录设置变更。 */ function setTags(value: string) { active.value.settings.tags = cleanList(value); changed('Set scene tags', 'settings.tags') }
/** 设置继承来源成功后记录设置变更。 */ function setInheritance(value: string) { if (sceneManager.setInheritance(active.value.uuid, value || null)) changed('Set scene inheritance', 'settings.inheritanceSourceUuid') }
/** 选用现有最大编号加一创建命名图层，并记录历史。 */ function addNamedLayer() { const id = Math.max(0, ...active.value.settings.namedLayers.map(/* 返回 layer.id 的当前值。 */ layer => layer.id)) + 1; active.value.settings.namedLayers.push({ id, name: `Layer ${id}`, visible: true, locked: false }); changed('Add named layer', 'settings.namedLayers') }
/** 规范化图层名称并同步同层实体显示名，再记录修改。 */ function renameLayer(id: number, name: string) { const layer = active.value.settings.namedLayers.find(/* 比较 candidate.id 与 id，返回严格相等的判断结果。 */ candidate => candidate.id === id); if (!layer) return; layer.name = name.trim().slice(0, 80) || `Layer ${id}`; for (const entity of physicsState.world.entities.filter(/* 比较 entity.layer 与 id，返回严格相等的判断结果。 */ entity => entity.layer === id)) entity.namedLayer = layer.name; changed('Rename named layer', `settings.namedLayers.${id}.name`) }
/** 创建指定模板场景并添加所需相机或界面层对象，记录历史并关闭菜单。 */ function createFromTemplate(id: typeof templates[number]['id']) {
  if (!createScene(t(templates.find(/* 比较 template.id 与 id，返回严格相等的判断结果。 */ template => template.id === id)?.label ?? 'newScene'))) return
  active.value.settings.templateId = id
  if (id === 'gameplay-2d') { createAuthoringObject('Camera', { x: 0, y: 0 }, false); createAuthoringObject('Empty', { x: 0, y: 0 }, false) }
  if (id === 'ui-overlay') createAuthoringObject('CanvasLayer', { x: 0, y: 0 }, false)
  if (id === 'camera-stage') createAuthoringObject('Camera', { x: 0, y: 0 }, false)
  pushHistory('Create scene from template', `scene:${active.value.uuid}`); createMenu.value?.removeAttribute('open')
}
watch(/** 收集实体标识、组件种类和预制体覆盖数量作为校验监听依赖。 */ () => physicsState.world.entities.map(/** 组合单个实体的标识、组件和覆盖数量为变化标记。 */ entity => `${entity.uuid}:${entity.components.map(/* 返回 component.kind 的当前值。 */ component => component.kind).join(',')}:${Object.keys(entity.prefabOverrides).length}`), /** 重新校验场景对象并更新场景错误等级及预制体状态。 */ () => {
  const issues = validateSceneAuthoring(physicsState.world.entities)
  sceneManager.setValidationState(active.value.uuid, issues.some(/* 比较 issue.severity 与 'error'，返回严格相等的判断结果。 */ issue => issue.severity === 'error') ? 'error' : issues.length ? 'warning' : 'valid')
  sceneManager.setPrefabState(active.value.uuid, physicsState.world.entities.some(/* 返回 Object.keys(entity.prefabOverrides).length 的当前值。 */ entity => Object.keys(entity.prefabOverrides).length) ? 'overridden' : physicsState.world.entities.some(/* 返回 entity.prefabAsset 的当前值。 */ entity => entity.prefabAsset) ? 'instance' : 'none')
}, { immediate: true })
</script>

<style scoped>
.scene-tabs{position:relative;min-width:0;min-height:34px;flex:0 0 34px;padding:3px 6px;display:flex;align-items:center;gap:4px;border-bottom:1px solid var(--border-subtle);background:var(--surface-1);z-index:190}.history-actions{display:flex}.history-actions button,.settings-toggle,.scene-menu summary{width:27px;height:27px;padding:0;display:grid;place-items:center;border:0;border-radius:6px;color:var(--text-muted);background:transparent}.history-actions button:hover,.settings-toggle:hover,.settings-toggle.active,.scene-menu summary:hover{color:var(--accent);background:var(--accent-soft)}.tab-strip{min-width:0;flex:1;display:flex;gap:3px;overflow-x:auto;scrollbar-width:none}.tab-strip::-webkit-scrollbar{display:none}.scene-tab{min-width:96px;max-width:210px;height:27px;padding:0 5px 0 8px;display:flex;align-items:center;gap:5px;border:1px solid transparent;border-radius:7px;color:var(--text-muted);background:transparent;font-size:11px}.scene-tab.active{color:var(--text-primary);border-color:var(--border-subtle);background:var(--surface-3)}.scene-tab>i{width:6px;height:6px;flex:0 0 6px;border-radius:50%;background:var(--success)}.scene-tab>i.warning{background:var(--warning)}.scene-tab>i.error{background:var(--danger)}.scene-tab span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-tab b{color:var(--warning);font-size:11px}.scene-tab em{color:var(--warning);font-style:normal}.scene-tab small{color:var(--accent)}.scene-tab strong{margin-left:auto;font-size:14px;font-weight:400}.scene-menu{position:relative}.scene-menu summary{list-style:none;cursor:pointer}.scene-menu summary::-webkit-details-marker{display:none}.scene-menu>div{position:fixed;z-index:1600;width:280px;margin-top:5px;padding:6px;display:grid;gap:4px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-1);box-shadow:var(--shadow-lg)}.scene-menu>div button{padding:8px;display:flex;flex-direction:column;align-items:flex-start;border:0;border-radius:7px;color:var(--text-secondary);background:transparent;text-align:left}.scene-menu>div button:hover{background:var(--surface-hover)}.scene-menu small{color:var(--text-muted)}.scene-settings{position:absolute;z-index:1500;right:6px;top:37px;width:min(360px,90vw);max-height:min(650px,75vh);padding:10px;display:grid;gap:9px;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);box-shadow:var(--shadow-lg)}.scene-settings>header,.named-layers header{display:flex;align-items:center;justify-content:space-between}.scene-settings>header div{display:flex;flex-direction:column}.scene-settings>header small,.scene-settings label span,.scene-settings footer span{color:var(--text-muted);font-size:11px}.scene-settings>header button,.named-layers header button{width:27px;height:27px;border:0;border-radius:6px;background:var(--surface-3)}.scene-settings label{display:grid;grid-template-columns:112px minmax(0,1fr);align-items:center;gap:7px}.named-layers,.dependencies{padding:7px;display:grid;gap:5px;border:1px solid var(--border-subtle);border-radius:8px}.named-layers>div{display:grid;grid-template-columns:10px minmax(0,1fr) 25px 25px;align-items:center;gap:4px}.named-layers>div i{width:9px;height:9px;border-radius:50%}.named-layers>div button{height:25px;padding:0;border:0;border-radius:5px;color:var(--text-muted);background:transparent}.named-layers>div button.active{color:var(--accent);background:var(--accent-soft)}.dependencies code{overflow:hidden;color:var(--text-muted);font-size:11px;text-overflow:ellipsis}.dependencies p{margin:0;color:var(--text-muted);font-size:11px}.scene-settings footer{display:flex;justify-content:space-between;color:var(--text-muted);font-size:11px}
/* 26.26：关闭与切换是兄弟原生按钮，避免在按钮中嵌套只能鼠标触发的强文本。 */
.scene-tab-entry{display:flex;align-items:stretch;flex:0 0 auto;max-width:250px;min-width:0}
.scene-tab-close{flex:0 0 26px;width:26px;min-height:27px;border:0;border-radius:6px;background:transparent;color:var(--text-muted)}
.scene-tab-close:hover{color:var(--danger);background:var(--surface-hover)}
</style>
