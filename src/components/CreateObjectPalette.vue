<template>
  <Teleport to="body">
    <div v-if="estate.createObjectPaletteOpen" class="authoring-scrim" @mousedown.self="close">
      <section class="authoring-palette" role="dialog" aria-modal="true" :aria-label="t('createObject')" @keydown.escape="close">
        <header>
          <div><span>{{ t('authoringPalette') }}</span><h2>{{ t('createObject') }}</h2></div>
          <button :aria-label="t('cancel')" @click="close">×</button>
        </header>
        <div class="palette-search">
          <span>⌕</span><input ref="searchInput" v-model="authoringState.query" type="search" :placeholder="t('searchObjectTypes')">
        </div>
        <nav :aria-label="t('objectCategories')">
          <button v-for="category in categories" :key="category" :class="{ active: authoringState.category === category }" @click="authoringState.category = category">{{ category === 'All' ? t('all') : category }}</button>
        </nav>
        <div class="palette-body">
          <section v-for="group in groups" :key="group.name" class="type-group">
            <h3><span>{{ group.name }}</span><small>{{ group.items.length }}</small></h3>
            <article v-for="item in group.items" :key="item.kind" class="type-card" role="button" tabindex="0" @dblclick="choose(item.kind)" @click="activeKind = item.kind" @keydown.enter="choose(item.kind)">
              <i class="glyph">{{ item.glyph }}</i>
              <span class="type-copy">
                <strong>{{ objectLabel(item.kind) }}</strong>
                <small>{{ objectSummary(item.kind, item.summary) }}</small>
                <em><b :class="item.compatibility.toLowerCase()">{{ statusLabel(item.compatibility) }}</b><template v-if="item.required.length"> · {{ t('requires') }} {{ item.required.join(', ') }}</template></em>
              </span>
              <button class="favorite" :class="{ active: authoringState.favorites.includes(item.kind) }" :aria-label="t('favorite')" @click.stop="toggleAuthoringFavorite(item.kind)">★</button>
            </article>
          </section>
          <p v-if="!groups.length" class="empty">{{ t('noObjectTypesFound') }}</p>
        </div>
        <footer>
          <p>{{ selected?.required.length ? `${t('requiredComponents')}: ${selected.required.join(', ')}` : t('transformIncluded') }}</p>
          <div><button @click="close">{{ t('cancel') }}</button><button class="primary" :disabled="!selected" @click="selected && choose(selected.kind)">{{ t('createObject') }}</button></div>
        </footer>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as estate } from '../store/editor'
import { AUTHORING_OBJECTS, authoringState, createAuthoringObject, toggleAuthoringFavorite, type AuthoringCategory } from '../editor/authoring2d'
import type { AuthoringObjectKind } from '../world/Entity'

const categories: Array<AuthoringCategory | 'All'> = ['All', 'Core', '2D', 'Physics', 'UI', 'Audio', 'Camera', 'Navigation', 'Script', 'Packages']
const searchInput = ref<HTMLInputElement | null>(null)
const activeKind = ref<AuthoringObjectKind>('Sprite')
const objectLabel = (kind: AuthoringObjectKind) => t(`object${kind}`)
const objectSummary = (kind: AuthoringObjectKind, fallback: string) => { const value = t(`object${kind}Summary`); return value === `object${kind}Summary` ? fallback : value }
const statusLabel = (status: 'Stable' | 'Experimental' | 'Package') => t(`compatibility${status}`)
const filtered = computed(() => {
  const needle = authoringState.query.trim().toLocaleLowerCase()
  return AUTHORING_OBJECTS.filter(item => (authoringState.category === 'All' || item.category === authoringState.category) && (!needle || `${objectLabel(item.kind)} ${item.kind} ${item.category} ${item.required.join(' ')} ${objectSummary(item.kind, item.summary)}`.toLocaleLowerCase().includes(needle)))
})
const groups = computed(() => {
  const result: Array<{ name: string; items: typeof AUTHORING_OBJECTS[number][] }> = []
  const append = (name: string, kinds: AuthoringObjectKind[]) => {
    const items = kinds.flatMap(kind => filtered.value.find(item => item.kind === kind) ?? [])
    if (items.length) result.push({ name, items })
  }
  if (authoringState.category === 'All' && !authoringState.query) {
    append(t('favorites'), authoringState.favorites)
    append(t('recentlyUsed'), authoringState.recent.filter(kind => !authoringState.favorites.includes(kind)))
  }
  for (const category of categories.slice(1)) {
    const items = filtered.value.filter(item => item.category === category)
    if (items.length) result.push({ name: category, items: [...items] })
  }
  return result
})
const selected = computed(() => filtered.value.find(item => item.kind === activeKind.value) ?? filtered.value[0])
function close() { estate.createObjectPaletteOpen = false }
function choose(kind: AuthoringObjectKind) { createAuthoringObject(kind, estate.lastCanvasWorldPoint); close() }
watch(() => estate.createObjectPaletteOpen, open => { if (!open) return; authoringState.query = ''; authoringState.category = 'All'; void nextTick(() => searchInput.value?.focus()) })
</script>

<style scoped>
.authoring-scrim{position:fixed;inset:0;z-index:2100;display:grid;place-items:center;padding:22px;background:rgba(4,7,12,.66);backdrop-filter:blur(7px)}
.authoring-palette{width:min(850px,94vw);height:min(700px,88vh);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border-strong);border-radius:16px;background:var(--surface-1);box-shadow:0 28px 90px rgba(0,0,0,.44)}
header{min-height:68px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--border-subtle)}header span{color:var(--accent);font-size:11px;font-weight:750;letter-spacing:.1em;text-transform:uppercase}h2{margin:2px 0 0;font-size:18px}header button{width:32px;height:32px;border:0;border-radius:8px;color:var(--text-muted);background:transparent;font-size:20px}
.palette-search{height:40px;margin:12px 14px 7px;padding:0 10px;display:flex;align-items:center;gap:8px;border:1px solid var(--border-strong);border-radius:10px;background:var(--input-bg)}.palette-search input{min-width:0;width:100%;border:0;background:transparent;outline:0}
nav{padding:0 14px 10px;display:flex;gap:5px;overflow:auto}nav button{min-height:29px;padding:0 10px;white-space:nowrap;border:1px solid var(--border-subtle);border-radius:99px;color:var(--text-muted);background:var(--surface-2);font-size:11px}nav button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
.palette-body{min-height:0;padding:3px 14px 14px;flex:1;overflow:auto}.type-group h3{height:29px;margin:8px 0 4px;display:flex;align-items:center;gap:7px;color:var(--text-muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}.type-group h3 small{padding:1px 6px;border-radius:20px;background:var(--surface-3)}.type-group{display:grid;grid-template-columns:1fr 1fr;gap:7px}.type-group h3{grid-column:1/-1}.type-card{position:relative;min-width:0;min-height:83px;padding:10px;display:flex;align-items:flex-start;gap:10px;text-align:left;border:1px solid var(--border-subtle);border-radius:11px;color:var(--text-secondary);background:var(--surface-2)}.type-card:hover,.type-card:focus-visible{border-color:color-mix(in srgb,var(--accent) 52%,var(--border-subtle));background:var(--surface-hover)}.glyph{width:33px;height:33px;flex:0 0 33px;display:grid;place-items:center;border-radius:8px;color:var(--accent);background:var(--accent-soft);font-size:17px;font-style:normal}.type-copy{min-width:0;display:flex;flex-direction:column}.type-copy strong{color:var(--text-primary);font-size:12px}.type-copy small{margin-top:2px;color:var(--text-muted);font-size:11px;line-height:1.35}.type-copy em{margin-top:5px;color:var(--text-muted);font-size:11px;font-style:normal}.type-copy b{color:var(--success);font-weight:700}.type-copy b.experimental{color:var(--warning)}.type-copy b.package{color:var(--accent)}.favorite{position:absolute;right:6px;top:5px;width:25px;height:25px;border:0;color:var(--text-muted);background:transparent;opacity:.42}.favorite.active{color:#f4c95d;opacity:1}.empty{grid-column:1/-1;padding:40px;text-align:center;color:var(--text-muted)}
footer{min-height:62px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:1px solid var(--border-subtle)}footer p{margin:0;color:var(--text-muted);font-size:11px}footer>div{display:flex;gap:7px}footer button{min-height:33px;padding:0 14px;border:1px solid var(--border-subtle);border-radius:8px;color:var(--text-secondary);background:var(--surface-2)}footer button.primary{color:var(--button-primary-text);border-color:var(--accent);background:var(--accent)}footer button:disabled{opacity:.45}
@media(max-width:660px){.type-group{grid-template-columns:1fr}.authoring-palette{height:94vh}.authoring-scrim{padding:8px}footer p{display:none}}
</style>
