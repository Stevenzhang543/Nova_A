<template>
  <section class="tilemap-panel">
    <header class="tilemap-toolbar">
      <button class="primary" @click="createMap">+ {{ t('createTileMap') }}</button>
      <select v-if="tileMap" :value="tileMap.tileSetAsset ?? ''" @change="selectTileSet">
        <option value="">{{ t('selectTileSet') }}</option>
        <option v-for="asset in tileSets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option>
      </select>
      <select v-model="sourceImageUuid">
        <option value="">{{ t('selectSourceImage') }}</option>
        <option v-for="asset in images" :key="asset.uuid" :value="asset.uuid">{{ asset.name }}</option>
      </select>
      <label>{{ t('tilePixels') }} <input v-model.number="tilePixels.x" type="number" min="1"><input v-model.number="tilePixels.y" type="number" min="1"></label>
      <button :disabled="!sourceImage" @click="createSet">+ {{ t('createTileSet') }}</button>
      <span></span>
      <button v-for="tool in tools" :key="tool" :class="{ active: tilemapEditorState.tool === tool }" :disabled="!tileMap" @click="activateTool(tool)">{{ t(`tileTool_${tool}`) }}</button>
    </header>

    <div v-if="!tileMap" class="empty"><strong>{{ t('tilemap') }}</strong><p>{{ t('tilemapEmpty') }}</p></div>
    <div v-else-if="!tileSet" class="empty"><strong>{{ t('selectTileSet') }}</strong><p>{{ t('tileSetHint') }}</p></div>
    <div v-else class="tilemap-workspace">
      <aside>
        <strong>{{ t('tilePalette') }}</strong>
        <div class="palette-grid" :style="{ gridTemplateColumns: `repeat(${Math.min(tileSet.columns, 12)}, 30px)` }">
          <button v-for="tile in tileSet.tiles" :key="tile.index" :class="{ selected: tilemapEditorState.tileIndex === tile.index }" :title="tile.name" @click="tilemapEditorState.tileIndex = tile.index">
            <span :style="tileStyle(tile.index)"></span>
          </button>
        </div>
      </aside>
      <section class="tile-properties">
        <strong>{{ selectedDefinition?.name ?? t('tileProperties') }}</strong>
        <label><span>{{ t('tileName') }}</span><input v-if="selectedDefinition" v-model="selectedDefinition.name" @change="saveSet"></label>
        <label><span>{{ t('tileCollision') }}</span><select v-if="selectedDefinition" v-model="selectedDefinition.collision" @change="collisionChanged"><option>None</option><option>Box</option><option>Polygon</option><option>OneWay</option></select></label>
        <label v-if="selectedDefinition?.collision === 'Polygon'" class="stacked"><span>{{ t('collisionPolygon') }}</span><textarea :value="polygonText" rows="3" @change="updatePolygon"></textarea></label>
        <p>{{ t('tilePaintHint') }}</p>
        <p v-if="tilemapEditorState.selection">{{ t('tileSelection') }}: {{ tilemapEditorState.selection.start.x }},{{ tilemapEditorState.selection.start.y }} → {{ tilemapEditorState.selection.end.x }},{{ tilemapEditorState.selection.end.y }}</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { assetReference, assetState } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { createTileMapEntity, physicsState, pushHistory } from '../store/physics'
import type { TileMap2D } from '../world/components'
import {
  createTileSet,
  invalidateTileMap,
  readTileSet,
  saveTileSet,
  tilemapEditorState,
  type TileTool
} from '../runtime/tilemap'

const tools: TileTool[] = ['brush', 'rectangle', 'eraser', 'fill', 'eyedropper', 'selection']
const sourceImageUuid = ref('')
const tilePixels = reactive({ x: 32, y: 32 })
const selectedEntity = computed(() => physicsState.world.entities.find(entity => entity.id === physicsState.selectedEntityId) ?? null)
const tileMap = computed(() => selectedEntity.value?.getComponent<TileMap2D>('TileMap2D') ?? null)
const images = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const tileSets = computed(() => assetState.records.filter(asset => asset.assetType === 'tileset'))
const sourceImage = computed(() => images.value.find(asset => asset.uuid === sourceImageUuid.value) ?? null)
const tileSetAsset = computed(() => tileSets.value.find(asset => assetReference(asset.uuid) === tileMap.value?.tileSetAsset) ?? null)
const tileSet = computed(() => readTileSet(tileMap.value?.tileSetAsset))
const selectedDefinition = computed(() => tileSet.value?.tiles[tilemapEditorState.tileIndex] ?? null)
const polygonText = computed(() => selectedDefinition.value?.polygon.map(point => `${point.x},${point.y}`).join(' ') ?? '')

watch(selectedEntity, entity => {
  tilemapEditorState.selectedEntityUuid = entity?.getComponent<TileMap2D>('TileMap2D') ? entity.uuid : null
  tilemapEditorState.active = Boolean(tilemapEditorState.selectedEntityUuid)
}, { immediate: true })

function createMap() { createTileMapEntity(); tilemapEditorState.active = true }
function createSet() {
  if (!sourceImage.value) return
  const asset = createTileSet(sourceImage.value, tilePixels.x, tilePixels.y)
  if (tileMap.value) { tileMap.value.tileSetAsset = assetReference(asset.uuid); tileMap.value.revision++; invalidateTileMap(tileMap.value) }
  pushHistory('Create TileSet')
}
function selectTileSet(event: Event) {
  if (!tileMap.value) return
  tileMap.value.tileSetAsset = (event.target as HTMLSelectElement).value || null
  tileMap.value.revision++
  invalidateTileMap(tileMap.value)
  pushHistory('Assign TileSet')
}
function activateTool(tool: TileTool) { tilemapEditorState.tool = tool; tilemapEditorState.active = true }
function saveSet() { if (tileSetAsset.value && tileSet.value) saveTileSet(tileSetAsset.value.uuid, tileSet.value) }
function collisionChanged() {
  if (selectedDefinition.value?.collision === 'Polygon' && selectedDefinition.value.polygon.length < 3) selectedDefinition.value.polygon = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
  saveSet()
  if (tileMap.value) { tileMap.value.revision++; invalidateTileMap(tileMap.value) }
}
function updatePolygon(event: Event) {
  if (!selectedDefinition.value) return
  const points = (event.target as HTMLTextAreaElement).value.trim().split(/\s+/).flatMap(pair => {
    const [x, y] = pair.split(',').map(Number)
    return Number.isFinite(x) && Number.isFinite(y) ? [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }] : []
  }).slice(0, 4)
  if (points.length >= 3) selectedDefinition.value.polygon = points
  collisionChanged()
}
function tileStyle(index: number) {
  const set = tileSet.value, image = sourceImageForSet.value
  if (!set || !image) return {}
  const column = index % set.columns, row = Math.floor(index / set.columns)
  return {
    backgroundImage: `url(${image.source})`,
    backgroundSize: `${set.columns * 100}% ${set.rows * 100}%`,
    backgroundPosition: `${set.columns <= 1 ? 0 : column / (set.columns - 1) * 100}% ${set.rows <= 1 ? 0 : row / (set.rows - 1) * 100}%`
  }
}
const sourceImageForSet = computed(() => {
  const reference = tileSet.value?.textureAsset
  return images.value.find(asset => reference === assetReference(asset.uuid) || reference === asset.uuid) ?? null
})
onBeforeUnmount(() => { tilemapEditorState.active = false })
</script>

<style scoped>
.tilemap-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; }.tilemap-toolbar { min-height: 38px; padding: 5px 7px; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; border-bottom: 1px solid var(--border-subtle); }.tilemap-toolbar > span { flex: 1; }.tilemap-toolbar button, .tilemap-toolbar select, .tilemap-toolbar input { min-height: 26px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--surface-2); color: var(--text-secondary); font-size: 9px; }.tilemap-toolbar button { padding: 0 8px; }.tilemap-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.tilemap-toolbar button.active { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }.tilemap-toolbar label { display: flex; align-items: center; gap: 3px; color: var(--text-muted); font-size: 8.5px; }.tilemap-toolbar label input { width: 48px; padding: 0 4px; }.tilemap-workspace { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(180px, 1fr) 250px; }.tilemap-workspace aside { min-width: 0; padding: 8px; overflow: auto; }.tilemap-workspace strong { color: var(--text-primary); font-size: 10px; }.palette-grid { margin-top: 7px; display: grid; gap: 3px; }.palette-grid button { width: 30px; height: 30px; padding: 2px; border: 1px solid var(--border-subtle); border-radius: 5px; background: var(--surface-3); }.palette-grid button.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }.palette-grid span { width: 100%; height: 100%; display: block; background-repeat: no-repeat; image-rendering: pixelated; }.tile-properties { padding: 8px 10px; overflow: auto; border-left: 1px solid var(--border-subtle); }.tile-properties label { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 9px; }.tile-properties label.stacked { padding: 6px 0; align-items: stretch; flex-direction: column; }.tile-properties input, .tile-properties select, .tile-properties textarea { width: 130px; min-width: 0; }.tile-properties textarea { width: 100%; resize: vertical; }.tile-properties p, .empty { color: var(--text-muted); font-size: 9px; line-height: 1.5; }.empty { margin: auto; padding: 18px; text-align: center; }.empty p { margin: 5px 0 0; }
</style>
