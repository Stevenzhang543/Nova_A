<!-- 对象创建面板：搜索分类、收藏和最近对象，并在画布位置创建对象。 -->
<template>
  <Teleport to="body">
    <UiDialog v-if="estate.createObjectPaletteOpen" :title="t('createObject')" class="authoring-dialog" dismiss-on-backdrop @close="close">
        <div class="palette-search">
          <EditorIcon name="search" /><input ref="searchInput" v-model="authoringState.query" type="search" :placeholder="t('searchObjectTypes')">
        </div>
        <nav :aria-label="t('objectCategories')">
          <button v-for="category in categories" :key="category" :class="{ active: authoringState.category === category }" @click="authoringState.category = category">{{ category === 'All' ? t('all') : category }}</button>
        </nav>
        <div class="palette-body">
          <section v-for="group in groups" :key="group.name" class="type-group">
            <h3><span>{{ group.name }}</span><small>{{ group.items.length }}</small></h3>
            <article :class="{selected:activeKind===item.kind}" v-for="item in group.items" :key="item.kind" class="type-card" role="button" tabindex="0" @dblclick="choose(item.kind)" @click="activeKind = item.kind" @keydown.enter.self="choose(item.kind)" @keydown.space.self.prevent="activeKind = item.kind">
              <EditorIcon :name="categoryIcon(item.category)" />
              <span class="type-copy">
                <strong>{{ objectLabel(item.kind) }}</strong>
                <small>{{ objectSummary(item.kind, item.summary) }}</small>
                <em><b :class="item.compatibility.toLowerCase()">{{ statusLabel(item.compatibility) }}</b><template v-if="item.required.length"> · {{ t('requires') }} {{ item.required.join(', ') }}</template></em>
              </span>
              <UiButton icon="star" :label="t('favorite')" class="favorite" :class="{ active: authoringState.favorites.includes(item.kind) }" :aria-label="t('favorite')" @click.stop="toggleAuthoringFavorite(item.kind)" />
            </article>
          </section>
          <p v-if="!groups.length" class="empty">{{ t('noObjectTypesFound') }}</p>
        </div>
        <footer>
          <p>{{ selected?.required.length ? `${t('requiredComponents')}: ${selected.required.join(', ')}` : t('transformIncluded') }}</p>
          <div><button @click="close">{{ t('cancel') }}</button><button class="primary" :disabled="!selected" @click="selected && choose(selected.kind)">{{ t('createObject') }}</button></div>
        </footer>
    </UiDialog>
  </Teleport>
</template>

<script setup lang="ts">
import UiDialog from '../ui/components/UiDialog.vue'
import UiButton from '../ui/components/UiButton.vue'
import EditorIcon, { type EditorIconName } from './EditorIcon.vue'
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { AUTHORING_OBJECTS, authoringState, createAuthoringObject, toggleAuthoringFavorite, type AuthoringCategory } from '../editor/authoring2d'
import type { AuthoringObjectKind } from '../world/Entity'

const categoryIcon=(category:string):EditorIconName=>({Core:'hierarchy','2D':'design',Physics:'physics',UI:'ui',Audio:'audio',Camera:'camera',Navigation:'path',Script:'script',Packages:'package'} as Record<string,EditorIconName>)[category]??'design'
const categories: Array<AuthoringCategory | 'All'> = ['All', 'Core', '2D', 'Physics', 'UI', 'Audio', 'Camera', 'Navigation', 'Script', 'Packages']
const searchInput = ref<HTMLInputElement | null>(null)
const activeKind = ref<AuthoringObjectKind>('Sprite')
const objectLabel = /** 按对象种类返回本地化名称。 */ (kind: AuthoringObjectKind) => t(`object${kind}`)
const objectSummary = /** 优先使用种类专用说明，缺少翻译时使用传入摘要。 */ (kind: AuthoringObjectKind, fallback: string) => { const value = t(`object${kind}Summary`); return value === `object${kind}Summary` ? fallback : value }
const statusLabel = /** 返回稳定、实验或资源包状态的本地化标签。 */ (status: 'Stable' | 'Experimental' | 'Package') => t(`compatibility${status}`)
const filtered = computed(/** 根据类别与规范化搜索词筛选可创建对象。 */ () => {
  const needle = authoringState.query.trim().toLocaleLowerCase()
  return AUTHORING_OBJECTS.filter(/** 匹配类别及对象名称、种类、依赖或摘要搜索文本。 */ item => (authoringState.category === 'All' || item.category === authoringState.category) && (!needle || `${objectLabel(item.kind)} ${item.kind} ${item.category} ${item.required.join(' ')} ${objectSummary(item.kind, item.summary)}`.toLocaleLowerCase().includes(needle)))
})
const groups = computed(/** 组装收藏、最近使用和类别分组，仅加入具有可见条目的分组。 */ () => {
  const result: Array<{ name: string; items: typeof AUTHORING_OBJECTS[number][] }> = []
  const append = /** 从指定种类列表提取可见对象并添加非空分组。 */ (name: string, kinds: AuthoringObjectKind[]) => {
    const items = kinds.flatMap(/** 查找指定种类对应的可见对象，找不到则不产生条目。 */ kind => filtered.value.find(/* 比较 item.kind 与 kind，返回严格相等的判断结果。 */ item => item.kind === kind) ?? [])
    if (items.length) result.push({ name, items })
  }
  if (authoringState.category === 'All' && !authoringState.query) {
    append(t('favorites'), authoringState.favorites)
    append(t('recentlyUsed'), authoringState.recent.filter(/* 返回 authoringState.favorites.includes(kind) 的逻辑取反结果。 */ kind => !authoringState.favorites.includes(kind)))
  }
  for (const category of categories.slice(1)) {
    const items = filtered.value.filter(/* 比较 item.category 与 category，返回严格相等的判断结果。 */ item => item.category === category)
    if (items.length) result.push({ name: category, items: [...items] })
  }
  return result
})
const selected = computed(/** 取得当前高亮对象，缺失时回退筛选结果首项。 */ () => filtered.value.find(/* 比较 item.kind 与 activeKind.value，返回严格相等的判断结果。 */ item => item.kind === activeKind.value) ?? filtered.value[0])
/** 关闭对象创建面板。 */ function close() { estate.createObjectPaletteOpen = false }
/** 在最近画布世界坐标创建所选对象后关闭面板。 */ function choose(kind: AuthoringObjectKind) { createAuthoringObject(kind, estate.lastCanvasWorldPoint); close() }
watch(/* 返回 estate.createObjectPaletteOpen 的当前值。 */ () => estate.createObjectPaletteOpen, /** 面板打开时清空搜索及分类，等待 DOM 更新后聚焦搜索框。 */ open => { if (!open) return; authoringState.query = ''; authoringState.category = 'All'; void nextTick(/** 搜索框仍存在时设置其焦点。 */ () => searchInput.value?.focus()) })
</script>

<style scoped>.authoring-dialog :deep(.ui-dialog){width:min(76ch,calc(100vw - var(--ui-space-xl)))}.palette-search{display:flex;gap:var(--ui-space-sm);align-items:center}.palette-search input{flex:1;min-width:0}nav{display:flex;gap:var(--ui-space-xs);overflow-x:auto;padding-block:var(--ui-space-sm)}nav button{flex:none}.palette-body{max-height:50vh;overflow:auto}.type-group h3{display:flex;justify-content:space-between;padding:var(--ui-space-xs);font-size:var(--type-caption);color:var(--text-muted);border-bottom:1px solid var(--border-subtle)}.type-card{display:grid;grid-template-columns:var(--ui-icon-size) minmax(0,1fr) var(--ui-control-height);align-items:center;gap:var(--ui-space-sm);padding:var(--ui-space-xs) var(--ui-space-sm);cursor:pointer}.type-card.selected{background:var(--selection-bg)}.type-copy{display:grid;min-width:0}.type-copy small,.type-copy em{font-size:var(--type-caption);font-style:normal;color:var(--text-muted);overflow-wrap:anywhere}.type-copy b{font-weight:500}.experimental{color:var(--warning)}.package{color:var(--accent)}footer{display:flex;align-items:center;justify-content:space-between;gap:var(--ui-space-sm);border-top:1px solid var(--border-subtle);padding-top:var(--ui-space-sm)}footer p{color:var(--text-muted);font-size:var(--type-caption)}footer>div{display:flex;gap:var(--ui-space-xs);flex:none}</style>
