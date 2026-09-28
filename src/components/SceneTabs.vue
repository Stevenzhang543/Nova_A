<!-- 场景标签栏：切换场景并管理载入、继承和场景设置。 -->
<template>
  <section class="scene-tabs" data-control-scope="scene-tabs" :data-resource-key="`scene:${active.uuid}`" :aria-label="t('sceneTabs')">
    <div class="history-actions">
      <UiButton :disabled="sceneManager.navigationIndex <= 0" :label="t('previousScene')" @click="navigate(-1)" icon="back" />
      <UiButton :disabled="sceneManager.navigationIndex >= sceneManager.navigationHistory.length - 1" :label="t('nextScene')" @click="navigate(1)" icon="forward" />
    </div>
    <div class="tab-strip">
      <span v-for="scene in loadedScenes" :key="scene.uuid" class="scene-tab-entry"><button class="scene-tab" :class="{ active: scene.uuid === sceneManager.activeSceneUuid }" :title="tabDescription(scene)" @click="activate(scene.uuid)">
        <i :class="scene.validationState"></i><span>{{ scene.name }}</span><b v-if="scene.dirty" class="dirty-dot" :title="t('unsavedChanges')"></b><EditorIcon v-if="scene.externalState !== 'clean'" name="refresh" /><small v-if="scene.prefabState !== 'none'">P</small>
      </button><UiButton v-if="scene.uuid !== sceneManager.activeSceneUuid" type="button" class="scene-tab-close" :aria-label="`${t('closeSceneTab')} · ${scene.name}`" :label="t('closeSceneTab')" @click.stop="close(scene.uuid)" icon="close" /></span>
    </div>
    <details ref="createMenu" class="scene-menu"><summary :title="t('newSceneFromTemplate')" :aria-label="t('newSceneFromTemplate')"><EditorIcon name="add" /></summary><div><button v-for="template in templates" :key="template.id" @click="createFromTemplate(template.id)"><strong>{{ t(template.label) }}</strong><small>{{ t(template.description) }}</small></button></div></details>
    <UiButton class="settings-toggle" :class="{ active: settingsOpen }" :label="t('sceneSettings')" @click="settingsOpen = !settingsOpen" icon="settings" />
    <aside v-if="settingsOpen" class="scene-settings">
      <header><div><small>{{ t('sceneSettings') }}</small><strong>{{ active.name }}</strong></div><UiButton :label="t('close')" @click="settingsOpen = false" icon="close" /></header>
      <label><span>{{ t('sceneTemplate') }}</span><select v-model="active.settings.templateId" @change="changed('Set scene template', 'settings.templateId')"><option :value="null">{{ t('none') }}</option><option v-for="template in templates" :key="template.id" :value="template.id">{{ t(template.label) }}</option></select></label>
      <label><span>{{ t('sceneRuntimePolicy') }}</span><select v-model="active.settings.runtimePolicy" @change="changed('Set scene runtime policy', 'settings.runtimePolicy')"><option value="Replace">{{ t('sceneReplace') }}</option><option value="Additive">{{ t('sceneAdditive') }}</option><option value="Overlay">{{ t('sceneOverlay') }}</option></select></label>
<!-- 场景继承候选过滤回调排除当前活动场景。 -->      <label><span>{{ t('sceneInheritance') }}</span><select :value="active.settings.inheritanceSourceUuid ?? ''" @change="setInheritance(($event.target as HTMLSelectElement).value)"><option value="">{{ t('none') }}</option><option v-for="scene in sceneManager.scenes.filter(scene => scene.uuid !== active.uuid)" :key="scene.uuid" :value="scene.uuid">{{ scene.name }}</option></select></label>
      <label><span>{{ t('sceneTags') }}</span><input :value="active.settings.tags.join(', ')" @change="setTags(($event.target as HTMLInputElement).value)"></label>
      <section class="named-layers"><header><strong>{{ t('namedLayers') }}</strong><UiButton :label="t('addLayer')" @click="addNamedLayer" icon="add" /></header><div v-for="layer in active.settings.namedLayers" :key="layer.id"><i :style="{ background: layerColorCss(layer.id) }"></i><input v-model="layer.name" @change="renameLayer(layer.id, layer.name)"><UiButton :class="{ active: layer.visible }" :label="t('entityVisible')" @click="layer.visible = !layer.visible; changed('Toggle named layer visibility', `settings.namedLayers.${layer.id}.visible`)" icon="visible" /><UiButton :class="{ active: layer.locked }" :label="t('entityLocked')" @click="layer.locked = !layer.locked; changed('Toggle named layer lock', `settings.namedLayers.${layer.id}.locked`)" icon="lock" /></div></section>
      <section class="dependencies"><strong>{{ t('sceneDependencies') }} · {{ dependencies.length }}</strong><code v-for="dependency in dependencies" :key="dependency">{{ dependency }}</code><p v-if="!dependencies.length">{{ t('noSceneDependencies') }}</p></section>
      <footer><span>{{ t('sceneVisited') }}</span><time>{{ new Date(active.visitedAt).toLocaleString() }}</time></footer>
    </aside>
  </section>
</template>

<script setup lang="ts">
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon from './EditorIcon.vue'
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
.scene-tabs{display:flex;align-items:center;position:relative;min-width:0;flex:none;gap:var(--ui-space-xs);border-bottom:1px solid var(--border-subtle);background:var(--surface-1);padding-inline:var(--ui-space-xs)}.history-actions,.scene-tab-entry{display:flex;align-items:center;flex:none}.tab-strip{display:flex;min-width:0;flex:1;overflow:auto}.scene-tab{display:flex;align-items:center;gap:var(--ui-space-xs);max-width:24ch;border:0;background:transparent}.scene-tab>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.scene-tab.active{box-shadow:inset 0 -2px var(--accent);color:var(--accent)}.scene-tab i{width:var(--ui-space-xs);height:var(--ui-space-xs);border-radius:50%;background:var(--success)}.scene-tab b{color:var(--warning)}.scene-menu{position:relative}.scene-menu>summary{display:grid;place-items:center;width:var(--ui-control-height);height:var(--ui-control-height);list-style:none;cursor:pointer}.scene-menu>summary::-webkit-details-marker{display:none}.scene-menu>div{position:absolute;top:100%;right:0;z-index:1000;min-width:28ch;padding:var(--ui-space-xs);background:var(--surface-2);border:1px solid var(--border-subtle)}.scene-menu>div button{width:100%;display:grid;text-align:start;height:auto;min-height:var(--ui-control-height);padding:var(--ui-space-xs)}.scene-menu small{color:var(--text-muted);white-space:normal}.scene-settings{position:absolute;right:0;top:100%;width:min(28rem,90vw);max-height:70vh;overflow:auto;z-index:1000;padding:var(--ui-space-sm);background:var(--surface-1);border:1px solid var(--border-subtle)}.scene-settings>header,.named-layers>header{display:flex;align-items:center;justify-content:space-between}.scene-settings>header>div{display:grid}.scene-settings label{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:var(--ui-space-sm);align-items:center;padding-block:var(--ui-space-xs)}.named-layers>div{display:flex;align-items:center;gap:var(--ui-space-xs)}.named-layers input{min-width:0;flex:1}.dependencies{display:grid;gap:var(--ui-space-xs)}.dependencies code{overflow-wrap:anywhere}.scene-settings footer{display:flex;justify-content:space-between;color:var(--text-muted);font-size:var(--type-caption)}
.dirty-dot{inline-size:var(--ui-space-xs);block-size:var(--ui-space-xs);border-radius:50%;background:var(--warning);flex:none}
</style>
