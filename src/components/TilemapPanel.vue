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
      <button :disabled="!tileMap" @click="createPalette">+ {{ t('tilePalette') }}</button>
      <button @click="createBrush">+ {{ t('brushPreset') }}</button>
      <button @click="createTerrain">+ {{ t('terrainRules') }}</button>
      <span></span>
      <button v-for="tool in tools" :key="tool" :class="{ active: tilemapEditorState.tool === tool }" :disabled="!tileMap" @click="activateTool(tool)">{{ t(`tileTool_${tool}`) }}</button>
      <label class="compact-toggle"><input v-model="tilemapEditorState.randomizeVariants" type="checkbox">{{ t('randomizeVariants') }}</label>
      <button :class="{ active: brushRotation !== 0 }" :title="t('rotateBrush')" @click="rotateBrush">↻ {{ brushRotation * 90 }}°</button>
      <button :class="{ active: brushMirrorX }" :title="t('mirrorHorizontal')" @click="toggleBrushMirror(4)">↔</button>
      <button :class="{ active: brushMirrorY }" :title="t('mirrorVertical')" @click="toggleBrushMirror(8)">↕</button>
      <button :disabled="!tilemapEditorState.selection" @click="copySelection">{{ t('copy') }}</button><button :disabled="!tilemapEditorState.selection" @click="transformSelection('rotate')">↻</button><button :disabled="!tilemapEditorState.selection" @click="transformSelection('mirrorX')">↔</button><button :disabled="!tilemapEditorState.selection" @click="transformSelection('mirrorY')">↕</button>
    </header>

    <div v-if="!tileMap" class="empty"><strong>{{ t('tilemap') }}</strong><p>{{ t('tilemapEmpty') }}</p></div>
    <div v-else-if="!tileSet" class="empty"><strong>{{ t('selectTileSet') }}</strong><p>{{ t('tileSetHint') }}</p></div>
    <div v-else class="tilemap-workspace">
      <aside>
        <strong>{{ t('tilePalette') }}</strong>
        <div class="asset-selects">
          <select v-model="paletteRef" @change="applyPalette"><option value="">{{ t('allTiles') }}</option><option v-for="asset in palettes" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select>
          <select v-model="brushRef" @change="applyBrush"><option value="">{{ t('defaultBrush') }}</option><option v-for="asset in brushes" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select>
          <select v-model="terrainRef" @change="applyTerrain"><option value="">{{ t('noTerrainRules') }}</option><option v-for="asset in terrains" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select>
          <input v-model="tileSearch" type="search" :placeholder="t('searchTiles')">
        </div>
        <div class="palette-grid" :style="{ gridTemplateColumns: `repeat(${Math.min(tileSet.columns, 12)}, 30px)` }">
          <button v-for="tile in visibleTiles" :key="tile.index" :class="{ selected: tilemapEditorState.tileIndex === tile.index }" :title="tile.name" @click="tilemapEditorState.tileIndex = tile.index">
            <span :style="tileStyle(tile.index)"></span>
          </button>
        </div>
      </aside>
      <section class="tile-properties">
        <strong>{{ selectedDefinition?.name ?? t('tileProperties') }}</strong>
        <label><span>{{ t('tileName') }}</span><input v-if="selectedDefinition" v-model="selectedDefinition.name" @change="saveSet"></label>
        <label><span>{{ t('tileCollision') }}</span><select v-if="selectedDefinition" v-model="selectedDefinition.collision" @change="collisionChanged"><option>None</option><option>Box</option><option>Polygon</option><option>OneWay</option></select></label>
        <label><span>{{ t('terrain') }}</span><input v-if="selectedDefinition" v-model="selectedDefinition.terrain" @change="saveSet"></label>
        <label><span>{{ t('navigationCost') }}</span><input v-if="selectedDefinition" v-model.number="selectedDefinition.navigationCost" type="number" min="0" @change="saveSet"></label>
        <label><span>{{ t('tileOccluder') }}</span><input v-if="selectedDefinition" v-model="selectedDefinition.occluder" type="checkbox" @change="saveSet"></label>
        <label><span>{{ t('atlasSource') }}</span><select v-if="selectedDefinition" v-model="selectedDefinition.sourceId" @change="saveSet"><option v-for="source in tileSet.sources" :key="source.id" :value="source.id">{{ source.name }}</option></select></label>
        <section class="atlas-settings"><strong>{{ t('atlasSources') }}</strong><label><span>{{ t('atlasSource') }}</span><select v-model="activeSourceId"><option v-for="source in tileSet.sources" :key="source.id" :value="source.id">{{ source.name }}</option></select></label><template v-if="activeSource"><label><span>{{ t('name') }}</span><input v-model="activeSource.name" @change="saveSet"></label><label><span>{{ t('sourceImage') }}</span><select v-model="activeSource.textureAsset" @change="saveSet"><option :value="null">{{ t('none') }}</option><option v-for="asset in images" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('atlasMargin') }}</span><input v-model.number="activeSource.margin" type="number" min="0" @change="saveSet"></label><label><span>{{ t('atlasSpacing') }}</span><input v-model.number="activeSource.spacing" type="number" min="0" @change="saveSet"></label></template><button :disabled="!sourceImage" @click="addAtlasSource">+ {{ t('atlasSource') }}</button></section>
        <section class="region-settings"><strong>{{ t('atlasRegion') }}</strong><label><span>X / Y</span><div><input :value="selectedDefinition?.region?.x ?? autoRegion.x" type="number" min="0" @change="updateRegion('x', $event)"><input :value="selectedDefinition?.region?.y ?? autoRegion.y" type="number" min="0" @change="updateRegion('y', $event)"></div></label><label><span>W / H</span><div><input :value="selectedDefinition?.region?.width ?? tileSet.tileWidth" type="number" min="1" @change="updateRegion('width', $event)"><input :value="selectedDefinition?.region?.height ?? tileSet.tileHeight" type="number" min="1" @change="updateRegion('height', $event)"></div></label></section>
        <label><span>{{ t('sceneAsset') }}</span><select v-if="selectedDefinition" v-model="selectedDefinition.sceneAsset" @change="saveSet"><option :value="null">{{ t('none') }}</option><option v-for="asset in sceneAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
        <label><span>{{ t('prefab') }}</span><select v-if="selectedDefinition" v-model="selectedDefinition.prefabAsset" @change="saveSet"><option :value="null">{{ t('none') }}</option><option v-for="asset in prefabAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
        <label class="stacked"><span>{{ t('customMetadata') }}</span><textarea :value="metadataText" rows="3" @change="updateMetadata"></textarea></label>
        <section class="animation-settings"><strong>{{ t('animatedTile') }}</strong><label><span>{{ t('frames') }}</span><input :value="animationFrames" placeholder="0,1,2" @change="updateAnimationFrames"></label><label><span>FPS</span><input v-if="selectedDefinition?.animation" v-model.number="selectedDefinition.animation.framesPerSecond" type="number" min="0.01" max="240" @change="saveSet"></label><label><span>{{ t('mode') }}</span><select v-if="selectedDefinition?.animation" v-model="selectedDefinition.animation.mode" @change="saveSet"><option>Loop</option><option>PingPong</option><option>Once</option></select></label></section>
        <label class="stacked"><span>{{ t('weightedVariants') }}</span><textarea :value="variantsText" rows="2" placeholder="12:1, 13:0.5" @change="updateVariants"></textarea></label>
        <label v-if="selectedDefinition?.collision === 'Polygon'" class="stacked"><span>{{ t('collisionPolygon') }}</span><textarea :value="polygonText" rows="3" @change="updatePolygon"></textarea></label>
        <label class="stacked"><span>{{ t('navigationPolygon') }}</span><textarea :value="navigationPolygonText" rows="3" placeholder="0,0 1,0 1,1 0,1" @change="updateTypedPolygon('navigationPolygon', $event)"></textarea></label>
        <label class="stacked"><span>{{ t('occlusionPolygon') }}</span><textarea :value="occlusionPolygonText" rows="3" placeholder="0,0 1,0 1,1 0,1" @change="updateTypedPolygon('occlusionPolygon', $event)"></textarea></label>
        <p class="terrain-preview"><b>{{ t('terrainPreview') }}</b><span>{{ terrainPreview }}</span></p>
        <p>{{ t('tilePaintHint') }}</p>
        <p v-if="tilemapEditorState.selection">{{ t('tileSelection') }}: {{ tilemapEditorState.selection.start.x }},{{ tilemapEditorState.selection.start.y }} → {{ tilemapEditorState.selection.end.x }},{{ tilemapEditorState.selection.end.y }}<template v-if="selectionWorld"> · {{ t('worldCoordinates') }} {{ selectionWorld.x.toFixed(2) }}, {{ selectionWorld.y.toFixed(2) }}</template></p>
        <section class="layers"><strong>{{ t('tileLayers') }}</strong><button v-for="(layer, index) in tileMap.layers" :key="layer.id" :class="{ active: index === tileMap.activeLayer }" @click="activateLayer(index)"><input v-model="layer.visible" type="checkbox" @click.stop><input v-model="layer.name" @change="changedLayer"><span>{{ layer.locked ? '🔒' : '' }}</span></button><div><button @click="addLayer">+</button><button @click="duplicateLayer">⧉</button><button :disabled="tileMap.layers.length <= 1" @click="removeLayer">−</button></div><template v-if="activeLayer"><label><span>{{ t('locked') }}</span><input v-model="activeLayer.locked" type="checkbox"></label><label><span>{{ t('blendMode') }}</span><select v-model="activeLayer.blendMode" @change="changedLayer"><option>Alpha</option><option>Additive</option><option>Multiply</option><option>Screen</option></select></label><label><span>{{ t('parallax') }}</span><div><input v-model.number="activeLayer.parallax.x" type="number" step="0.05" @change="changedLayer"><input v-model.number="activeLayer.parallax.y" type="number" step="0.05" @change="changedLayer"></div></label><label><span>{{ t('zOrder') }}</span><input v-model.number="activeLayer.zOrder" type="number" @change="changedLayer"></label><label><span>{{ t('tileCollision') }}</span><input v-model="activeLayer.collisionEnabled" type="checkbox"></label><label><span>{{ t('navigation') }}</span><input v-model="activeLayer.navigationEnabled" type="checkbox"></label><label><span>{{ t('occluders') }}</span><input v-model="activeLayer.occlusionEnabled" type="checkbox"></label></template></section>
        <section class="baking"><strong>{{ t('tileBaking') }}</strong><label><span>{{ t('tileCollision') }}</span><input v-model="tileMap.bakeCollision" type="checkbox"></label><label><span>{{ t('navigation') }}</span><input v-model="tileMap.bakeNavigation" type="checkbox"></label><label><span>{{ t('occluders') }}</span><input v-model="tileMap.bakeOccluders" type="checkbox"></label><label><span>{{ t('streamingEnabled') }}</span><input v-model="tileMap.streamingEnabled" type="checkbox"></label><p>{{ t('streamingBoundaries') }}: {{ streamingBoundaryCount }}</p><button @click="bake">{{ t('bakeTileMap') }}</button><button @click="copyDeterministicStorage">{{ t('copyDeterministicStorage') }}</button><p v-if="bakeResult">{{ bakeResult }}</p></section>
        <section class="tile-history"><strong>{{ t('changeHistory') }}</strong><p v-if="!tilemapEditorState.history.length">{{ t('noChangesYet') }}</p><ol v-else><li v-for="change in tilemapEditorState.history.slice(-8).reverse()" :key="change.id"><b>{{ t(`tileTool_${change.tool}`) }}</b><span>{{ change.start.x }},{{ change.start.y }} → {{ change.end.x }},{{ change.end.y }}</span></li></ol></section>
        <section class="diagnostics"><strong>{{ t('diagnostics') }}</strong><button @click="runDiagnostics">{{ t('validate') }}</button><article v-for="(issue,index) in diagnostics" :key="`${issue.code}-${index}`" :class="issue.severity"><b>{{ issue.code }}</b><span>{{ issue.message }}</span></article></section>
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
  addTileLayer,
  bakeTileMap,
  copyTileSelection,
  createBrushPreset,
  createTerrainRules,
  createTilePalette,
  createTileSet,
  deterministicTileMapStorage,
  duplicateTileLayer,
  diagnoseTileMap,
  invalidateTileMap,
  readTilePalette,
  readTileSet,
  removeTileLayer,
  saveTileSet,
  setActiveTileLayer,
  tilemapEditorState,
  tileStreamingBoundaries,
  tileWorldCoordinate,
  transformTileSelection,
  type TilemapDiagnostic,
  type TileTool
} from '../runtime/tilemap'

const tools: TileTool[] = ['brush', 'stamp', 'pattern', 'line', 'rectangle', 'eraser', 'fill', 'replace', 'eyedropper', 'selection']
const sourceImageUuid = ref('')
const tilePixels = reactive({ x: 32, y: 32 })
const paletteRef = ref(''), brushRef = ref(''), terrainRef = ref(''), bakeResult = ref(''), tileSearch = ref('')
const diagnostics = ref<TilemapDiagnostic[]>([])
const selectedEntity = computed(() => physicsState.world.entities.find(entity => entity.id === physicsState.selectedEntityId) ?? null)
const tileMap = computed(() => selectedEntity.value?.getComponent<TileMap2D>('TileMap2D') ?? null)
const images = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const tileSets = computed(() => assetState.records.filter(asset => asset.assetType === 'tileset'))
const palettes = computed(() => assetState.records.filter(asset => asset.assetType === 'tilePalette'))
const brushes = computed(() => assetState.records.filter(asset => asset.assetType === 'brushPreset'))
const terrains = computed(() => assetState.records.filter(asset => asset.assetType === 'terrainRules'))
const sceneAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'scene'))
const prefabAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'prefab'))
const sourceImage = computed(() => images.value.find(asset => asset.uuid === sourceImageUuid.value) ?? null)
const tileSetAsset = computed(() => tileSets.value.find(asset => assetReference(asset.uuid) === tileMap.value?.tileSetAsset) ?? null)
const tileSet = computed(() => readTileSet(tileMap.value?.tileSetAsset))
const selectedDefinition = computed(() => tileSet.value?.tiles[tilemapEditorState.tileIndex] ?? null)
const activeSourceId = ref('primary')
const activeSource = computed(() => tileSet.value?.sources.find(source => source.id === activeSourceId.value) ?? tileSet.value?.sources[0] ?? null)
const activeLayer = computed(() => tileMap.value?.layers[tileMap.value.activeLayer] ?? null)
const polygonText = computed(() => selectedDefinition.value?.polygon.map(point => `${point.x},${point.y}`).join(' ') ?? '')
const navigationPolygonText = computed(() => selectedDefinition.value?.navigationPolygon.map(point => `${point.x},${point.y}`).join(' ') ?? '')
const occlusionPolygonText = computed(() => selectedDefinition.value?.occlusionPolygon.map(point => `${point.x},${point.y}`).join(' ') ?? '')
const metadataText = computed(() => JSON.stringify(selectedDefinition.value?.metadata ?? {}, null, 2))
const animationFrames = computed(() => selectedDefinition.value?.animation?.frames.join(',') ?? '')
const variantsText = computed(() => selectedDefinition.value?.variants.map(variant => `${variant.tile}:${variant.weight}`).join(', ') ?? '')
const visibleTiles = computed(() => {
  const palette = readTilePalette(paletteRef.value), query = tileSearch.value.trim().toLocaleLowerCase()
  const candidates = palette ? tileSet.value?.tiles.filter(tile => palette.tiles.includes(tile.index)) ?? [] : tileSet.value?.tiles ?? []
  return query ? candidates.filter(tile => tile.name.toLocaleLowerCase().includes(query) || String(tile.index).includes(query) || tile.terrain.toLocaleLowerCase().includes(query)) : candidates
})
const brushRotation = computed(() => tilemapEditorState.transform & 3)
const brushMirrorX = computed(() => (tilemapEditorState.transform & 4) !== 0)
const brushMirrorY = computed(() => (tilemapEditorState.transform & 8) !== 0)
const autoRegion = computed(() => ({ x: (tilemapEditorState.tileIndex % (tileSet.value?.columns ?? 1)) * (tileSet.value?.tileWidth ?? 1), y: Math.floor(tilemapEditorState.tileIndex / (tileSet.value?.columns ?? 1)) * (tileSet.value?.tileHeight ?? 1) }))
const terrainPreview = computed(() => selectedDefinition.value?.terrain ? `${selectedDefinition.value.terrain} · ${diagnostics.value.some(issue => issue.code === 'invalid-terrain') ? t('terrainRulesInvalid') : t('terrainRulesReady')}` : t('noTerrainRules'))
const selectionWorld = computed(() => selectedEntity.value && tileMap.value && tilemapEditorState.selection
  ? tileWorldCoordinate(selectedEntity.value, tileMap.value, tilemapEditorState.selection.start, physicsState.world.entities)
  : null)
const streamingBoundaryCount = computed(() => tileMap.value ? tileStreamingBoundaries(tileMap.value).length : 0)

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
function createPalette() { if (!tileMap.value) return; const asset = createTilePalette(tileMap.value.tileSetAsset, [tilemapEditorState.tileIndex]); paletteRef.value = assetReference(asset.uuid); pushHistory('Create tile palette') }
function createBrush() { const asset = createBrushPreset(); brushRef.value = assetReference(asset.uuid); pushHistory('Create brush preset') }
function createTerrain() { const asset = createTerrainRules(); terrainRef.value = assetReference(asset.uuid); pushHistory('Create terrain rules') }
function applyPalette() { const palette = readTilePalette(paletteRef.value); if (palette?.tiles.length) tilemapEditorState.tileIndex = palette.tiles[0] }
function applyBrush() { tilemapEditorState.brushPresetAsset = brushRef.value || null }
function applyTerrain() { tilemapEditorState.terrainRulesAsset = terrainRef.value || null }
function activateLayer(index: number) { if (tileMap.value && setActiveTileLayer(tileMap.value, index)) pushHistory('Switch tile layer') }
function addLayer() { if (!tileMap.value) return; addTileLayer(tileMap.value); pushHistory('Add tile layer') }
function duplicateLayer() { if (!tileMap.value) return; duplicateTileLayer(tileMap.value); pushHistory('Duplicate tile layer') }
function removeLayer() { if (tileMap.value && removeTileLayer(tileMap.value)) pushHistory('Remove tile layer') }
function changedLayer() { if (!tileMap.value) return; tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory('Edit tile layer') }
function bake() { if (!tileMap.value) return; const result = bakeTileMap(tileMap.value); bakeResult.value = `${result.collision} collision · ${result.navigation} navigation · ${result.occluders} occluders · ${result.chunks} chunks` }
async function copyDeterministicStorage() { if (!tileMap.value) return; const text = deterministicTileMapStorage(tileMap.value); try { await navigator.clipboard.writeText(text); bakeResult.value = t('deterministicStorageCopied') } catch { bakeResult.value = text } }
function selectTileSet(event: Event) {
  if (!tileMap.value) return
  tileMap.value.tileSetAsset = (event.target as HTMLSelectElement).value || null
  tileMap.value.revision++
  invalidateTileMap(tileMap.value)
  pushHistory('Assign TileSet')
}
function activateTool(tool: TileTool) { tilemapEditorState.tool = tool; tilemapEditorState.active = true }
function rotateBrush() { tilemapEditorState.transform = (((tilemapEditorState.transform & 12) | ((tilemapEditorState.transform + 1) & 3)) & 15) as typeof tilemapEditorState.transform }
function toggleBrushMirror(bit: 4 | 8) { tilemapEditorState.transform = (tilemapEditorState.transform ^ bit) as typeof tilemapEditorState.transform }
function copySelection() { if (tileMap.value && copyTileSelection(tileMap.value)) pushHistory('Copy tile selection') }
function transformSelection(operation: 'rotate' | 'mirrorX' | 'mirrorY') { if (tileMap.value && transformTileSelection(tileMap.value, operation)) { tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory(`Transform tile selection: ${operation}`) } }
function runDiagnostics() { diagnostics.value = tileMap.value ? diagnoseTileMap(tileMap.value) : [] }
function saveSet() { if (tileSetAsset.value && tileSet.value) saveTileSet(tileSetAsset.value.uuid, tileSet.value) }
function addAtlasSource() { if (!tileSet.value || !sourceImage.value) return; const id = `atlas-${crypto.randomUUID().slice(0, 8)}`; tileSet.value.sources.push({ id, name: sourceImage.value.name, textureAsset: assetReference(sourceImage.value.uuid), margin: 0, spacing: 0 }); activeSourceId.value = id; saveSet(); pushHistory('Add atlas source') }
function updateRegion(field: 'x' | 'y' | 'width' | 'height', event: Event) { if (!selectedDefinition.value || !tileSet.value) return; const current = selectedDefinition.value.region ?? { x: autoRegion.value.x, y: autoRegion.value.y, width: tileSet.value.tileWidth, height: tileSet.value.tileHeight }; current[field] = Math.max(field === 'width' || field === 'height' ? 1 : 0, Math.round(Number((event.target as HTMLInputElement).value) || 0)); selectedDefinition.value.region = current; saveSet() }
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
function updateTypedPolygon(field: 'navigationPolygon' | 'occlusionPolygon', event: Event) { if (!selectedDefinition.value) return; const points = parsePolygon((event.target as HTMLTextAreaElement).value); selectedDefinition.value[field] = points.length >= 3 ? points : []; saveSet() }
function parsePolygon(value: string) { return value.trim().split(/\s+/).flatMap(pair => { const [x, y] = pair.split(',').map(Number); return Number.isFinite(x) && Number.isFinite(y) ? [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }] : [] }).slice(0, 4) }
function updateMetadata(event: Event) { if (!selectedDefinition.value) return; try { const value = JSON.parse((event.target as HTMLTextAreaElement).value) as unknown; if (value && typeof value === 'object' && !Array.isArray(value)) selectedDefinition.value.metadata = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(([,item]) => ['boolean','number','string'].includes(typeof item)).slice(0,64)) as Record<string, boolean | number | string>; saveSet() } catch { runDiagnostics() } }
function updateAnimationFrames(event: Event) { if (!selectedDefinition.value || !tileSet.value) return; const frames = (event.target as HTMLInputElement).value.split(',').map(Number).filter(value => Number.isInteger(value) && value >= 0 && value < tileSet.value!.tiles.length).slice(0,256); selectedDefinition.value.animation = frames.length ? { frames, framesPerSecond: selectedDefinition.value.animation?.framesPerSecond ?? 8, mode: selectedDefinition.value.animation?.mode ?? 'Loop' } : null; saveSet() }
function updateVariants(event: Event) { if (!selectedDefinition.value || !tileSet.value) return; selectedDefinition.value.variants = (event.target as HTMLTextAreaElement).value.split(',').flatMap(pair => { const [tile,weight] = pair.trim().split(':').map(Number); return Number.isInteger(tile) && tile >= 0 && tile < tileSet.value!.tiles.length && Number.isFinite(weight) && weight > 0 ? [{ tile, weight }] : [] }).slice(0,64); saveSet() }
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
  const reference = tileSet.value?.sources.find(source => source.id === selectedDefinition.value?.sourceId)?.textureAsset ?? tileSet.value?.textureAsset
  return images.value.find(asset => reference === assetReference(asset.uuid) || reference === asset.uuid) ?? null
})
onBeforeUnmount(() => { tilemapEditorState.active = false })
</script>

<style scoped>
.asset-selects { margin: 7px 0; display: grid; gap: 4px; }.asset-selects select,.asset-selects input { min-width: 0; width:100%; }.layers, .baking,.animation-settings,.diagnostics,.tile-history { margin-top: 12px; padding-top: 8px; display: grid; gap: 4px; border-top: 1px solid var(--border-subtle); }.layers > button { min-height: 28px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; border: 1px solid transparent; border-radius: 6px; background: transparent; }.layers > button.active { border-color: var(--accent); background: var(--accent-soft); }.layers > button input:not([type=checkbox]) { width: 100%; min-width: 0; border: 0; background: transparent; }.layers > div { display: flex; gap: 4px; }.baking > button,.diagnostics>button { min-height: 30px; }.diagnostics article{padding:5px;display:grid;gap:2px;border-left:3px solid var(--text-muted);background:var(--surface-2)}.diagnostics article.error{border-color:var(--danger)}.diagnostics article.warning{border-color:var(--warning)}.diagnostics article.info{border-color:var(--success)}.diagnostics article span{overflow-wrap:anywhere;color:var(--text-muted)}.tile-history ol{margin:0;padding-left:18px}.tile-history li{display:grid;grid-template-columns:minmax(70px,1fr) auto;gap:6px;color:var(--text-muted);font-size:var(--type-caption)}
.tilemap-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; }.tilemap-toolbar { min-height: 42px; padding: 5px 7px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; border-bottom: 1px solid var(--border-subtle); }.tilemap-toolbar > span { flex: 1; }.tilemap-toolbar button, .tilemap-toolbar select, .tilemap-toolbar input { min-height: 30px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--surface-2); color: var(--text-secondary); font-size: 11px; }.tilemap-toolbar button { padding: 0 8px; }.tilemap-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.tilemap-toolbar button.active { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }.tilemap-toolbar label { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size:11px; }.tilemap-toolbar label input { width: 54px; padding: 0 4px; }.tilemap-workspace { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(180px, 1fr) 260px; }.tilemap-workspace aside { min-width: 0; padding: 8px; overflow: auto; }.tilemap-workspace strong { color: var(--text-primary); font-size: 12px; }.palette-grid { margin-top: 7px; display: grid; gap: 3px; }.palette-grid button { width: 32px; height: 32px; padding: 2px; border: 1px solid var(--border-subtle); border-radius: 5px; background: var(--surface-3); }.palette-grid button.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }.palette-grid span { width: 100%; height: 100%; display: block; background-repeat: no-repeat; image-rendering: pixelated; }.tile-properties { padding: 8px 10px; overflow: auto; border-left: 1px solid var(--border-subtle); }.tile-properties label { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; }.tile-properties label.stacked { padding: 6px 0; align-items: stretch; flex-direction: column; }.tile-properties input, .tile-properties select, .tile-properties textarea { width: 140px; min-width: 0; }.tile-properties textarea { width: 100%; resize: vertical; }.tile-properties p, .empty { color: var(--text-muted); font-size: 11px; line-height: 1.5; }.empty { margin: auto; padding: 18px; text-align: center; }.empty p { margin: 5px 0 0; }
.atlas-settings,.region-settings { margin-top:12px; padding-top:8px; display:grid; gap:4px; border-top:1px solid var(--border-subtle); }.region-settings label>div { display:flex; gap:4px; }.region-settings label>div input { width:66px; }.terrain-preview { display:grid; gap:3px; padding:6px; border-radius:6px; background:var(--surface-2); }.tilemap-toolbar .compact-toggle input { width:16px; min-height:16px; padding:0; }
@media (max-width: 700px) { .tilemap-workspace { grid-template-columns: minmax(150px, 1fr) minmax(180px, 220px); }.tilemap-toolbar > span { display: none; } }
@media (max-width: 520px) { .tilemap-panel { overflow: auto; }.tilemap-workspace { flex: 0 0 auto; grid-template-columns: 1fr; }.tilemap-workspace aside { min-height: 110px; }.tile-properties { min-height: 120px; border-top: 1px solid var(--border-subtle); border-left: 0; } }
</style>
