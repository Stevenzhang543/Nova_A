<!-- 瓦片地图工作室：编辑图集、笔刷、地图层及烘焙结果。 -->
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
        <div v-if="importedMap" class="imported-map-ownership"><p>{{ ac('sourceOwnedTiles') }}</p><button @click="makeEditableCopy">{{ ac('editableTileSet') }}</button></div>
        <p v-if="tileSetError" role="alert">{{ tileSetError }}</p>
        <fieldset class="tile-definition-fields" :disabled="importedMap">
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
        </fieldset>
        <p>{{ t('tilePaintHint') }}</p>
        <p v-if="tilemapEditorState.selection">{{ t('tileSelection') }}: {{ tilemapEditorState.selection.start.x }},{{ tilemapEditorState.selection.start.y }} → {{ tilemapEditorState.selection.end.x }},{{ tilemapEditorState.selection.end.y }}<template v-if="selectionWorld"> · {{ t('worldCoordinates') }} {{ selectionWorld.x.toFixed(2) }}, {{ selectionWorld.y.toFixed(2) }}</template></p>
        <section class="layers"><strong>{{ t('tileLayers') }}</strong><button v-for="(layer, index) in tileMap.layers" :key="layer.id" :class="{ active: index === tileMap.activeLayer }" @click="activateLayer(index)"><input v-model="layer.visible" type="checkbox" @click.stop><input v-model="layer.name" @change="changedLayer"><span>{{ layer.locked ? '🔒' : '' }}</span></button><div><button @click="addLayer">+</button><button @click="duplicateLayer">⧉</button><button :disabled="tileMap.layers.length <= 1" @click="removeLayer">−</button></div><template v-if="activeLayer"><label><span>{{ t('locked') }}</span><input v-model="activeLayer.locked" type="checkbox"></label><label><span>{{ t('blendMode') }}</span><select v-model="activeLayer.blendMode" @change="changedLayer"><option>Alpha</option><option>Additive</option><option>Multiply</option><option>Screen</option></select></label><label><span>{{ t('parallax') }}</span><div><input v-model.number="activeLayer.parallax.x" type="number" step="0.05" @change="changedLayer"><input v-model.number="activeLayer.parallax.y" type="number" step="0.05" @change="changedLayer"></div></label><label><span>{{ t('zOrder') }}</span><input v-model.number="activeLayer.zOrder" type="number" @change="changedLayer"></label><label><span>{{ t('tileCollision') }}</span><input v-model="activeLayer.collisionEnabled" type="checkbox"></label><label><span>{{ t('navigation') }}</span><input v-model="activeLayer.navigationEnabled" type="checkbox"></label><label><span>{{ t('occluders') }}</span><input v-model="activeLayer.occlusionEnabled" type="checkbox"></label></template></section>
        <section class="baking"><strong>{{ t('tileBaking') }}</strong><label><span>{{ t('tileCollision') }}</span><input v-model="tileMap.bakeCollision" type="checkbox"></label><label><span>{{ t('navigation') }}</span><input v-model="tileMap.bakeNavigation" type="checkbox"></label><label><span>{{ t('occluders') }}</span><input v-model="tileMap.bakeOccluders" type="checkbox"></label><label><span>{{ t('streamingEnabled') }}</span><input v-model="tileMap.streamingEnabled" type="checkbox"></label><p>{{ t('streamingBoundaries') }}: {{ streamingBoundaryCount }}</p><progress :value="tileBakeState.progress" max="1"></progress><div class="bake-actions"><button :disabled="tileBakeState.active" @click="bake">{{ t('bakeTileMap') }}</button><button :disabled="!tileBakeState.active" @click="cancelTileMapBake">{{ t('cancel') }}</button></div><button @click="copyDeterministicStorage">{{ t('copyDeterministicStorage') }}</button><p v-if="bakeResult">{{ bakeResult }}</p><code v-if="tileBakeState.artifactHash">{{ t('artifactHash') }}: {{ tileBakeState.artifactHash }}</code></section>
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
import { assetWorkflowCopy as ac } from '../assets/assetWorkflowCopy'
import { isTiledMapAsset } from '../assets/tiledMapAssets'
import { createTileMapEntity, physicsState, pushHistory } from '../store/physics'
import type { TileMap2D } from '../world/components'
import {
  addTileLayer,
  cancelTileMapBake,
  copyTileSelection,
  createBrushPreset,
  createTerrainRules,
  createTilePalette,
  createTileSet,
  copyEditableTileSet,
  deterministicTileMapStorage,
  duplicateTileLayer,
  diagnoseTileMap,
  requestTileMapBake,
  tileBakeState,
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
const selectedEntity = computed(/** 查找当前选中实体。 */ () => physicsState.world.entities.find(/* 比较 entity.id 与 physicsState.selectedEntityId，返回严格相等的判断结果。 */ entity => entity.id === physicsState.selectedEntityId) ?? null)
const tileMap = computed(/* 当 selectedEntity.value?.getComponent<TileMap2D>('TileMap2D') 为 null 或 undefined 时返回 null，否则保留左侧值。 */ () => selectedEntity.value?.getComponent<TileMap2D>('TileMap2D') ?? null)
const images = computed(/** 筛选图片资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'image'，返回严格相等的判断结果。 */ asset => asset.assetType === 'image'))
const tileSets = computed(/** 筛选图集资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'tileset'，返回严格相等的判断结果。 */ asset => asset.assetType === 'tileset'))
const palettes = computed(/** 筛选瓦片调色板资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'tilePalette'，返回严格相等的判断结果。 */ asset => asset.assetType === 'tilePalette'))
const brushes = computed(/** 筛选笔刷预设资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'brushPreset'，返回严格相等的判断结果。 */ asset => asset.assetType === 'brushPreset'))
const terrains = computed(/** 筛选地形规则资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'terrainRules'，返回严格相等的判断结果。 */ asset => asset.assetType === 'terrainRules'))
const sceneAssets = computed(/** 筛选场景资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'scene'，返回严格相等的判断结果。 */ asset => asset.assetType === 'scene'))
const prefabAssets = computed(/** 筛选预制体资源。 */ () => assetState.records.filter(/* 比较 asset.assetType 与 'prefab'，返回严格相等的判断结果。 */ asset => asset.assetType === 'prefab'))
const sourceImage = computed(/** 查找当前选中的源图片。 */ () => images.value.find(/* 比较 asset.uuid 与 sourceImageUuid.value，返回严格相等的判断结果。 */ asset => asset.uuid === sourceImageUuid.value) ?? null)
const tileSetAsset = computed(/** 按当前地图图集引用查找对应资源。 */ () => tileSets.value.find(/* 比较 assetReference(asset.uuid) 与 tileMap.value?.tileSetAsset，返回严格相等的判断结果。 */ asset => assetReference(asset.uuid) === tileMap.value?.tileSetAsset) ?? null)
const tileSet = computed(/* 调用 readTileSet(tileMap.value?.tileSetAsset) 并返回调用结果。 */ () => readTileSet(tileMap.value?.tileSetAsset))
const importedMap = computed(/* 先计算 !!tileSetAsset.value；仅当其为真值时求右侧 isTiledMapAsset(tileSetAsset.value)，返回短路求值结果。 */ () => !!tileSetAsset.value && isTiledMapAsset(tileSetAsset.value))
const tileSetError = ref('')
const selectedDefinition = computed(/* 当 tileSet.value?.tiles[tilemapEditorState.tileIndex] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ () => tileSet.value?.tiles[tilemapEditorState.tileIndex] ?? null)
const activeSourceId = ref('primary')
watch(tileSet, /** 图集变化后，当前来源不存在则回退第一个来源。 */ value => { if (value && !value.sources.some(/* 比较 source.id 与 activeSourceId.value，返回严格相等的判断结果。 */ source => source.id === activeSourceId.value)) activeSourceId.value = value.sources[0]?.id ?? '' }, { immediate: true })
const activeSource = computed(/** 查找当前图集来源，缺失回退首项。 */ () => tileSet.value?.sources.find(/* 比较 source.id 与 activeSourceId.value，返回严格相等的判断结果。 */ source => source.id === activeSourceId.value) ?? tileSet.value?.sources[0] ?? null)
const activeLayer = computed(/* 当 tileMap.value?.layers[tileMap.value.activeLayer] 为 null 或 undefined 时返回 null，否则保留左侧值。 */ () => tileMap.value?.layers[tileMap.value.activeLayer] ?? null)
const polygonText = computed(/* 当 selectedDefinition.value?.polygon.map(point => `${point.x},${point.y}`).join(' ') 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ () => selectedDefinition.value?.polygon.map(/** 将碰撞多边形点格式化为二维坐标文本。 */ point => `${point.x},${point.y}`).join(' ') ?? '')
const navigationPolygonText = computed(/* 当 selectedDefinition.value?.navigationPolygon.map(point => `${point.x},${point.y}`).join(' ') 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ () => selectedDefinition.value?.navigationPolygon.map(/** 将导航多边形点格式化为二维坐标文本。 */ point => `${point.x},${point.y}`).join(' ') ?? '')
const occlusionPolygonText = computed(/* 当 selectedDefinition.value?.occlusionPolygon.map(point => `${point.x},${point.y}`).join(' ') 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ () => selectedDefinition.value?.occlusionPolygon.map(/** 将遮挡多边形点格式化为二维坐标文本。 */ point => `${point.x},${point.y}`).join(' ') ?? '')
const metadataText = computed(/* 调用 JSON.stringify(selectedDefinition.value?.metadata ?? {}, null, 2) 并返回调用结果。 */ () => JSON.stringify(selectedDefinition.value?.metadata ?? {}, null, 2))
const animationFrames = computed(/* 当 selectedDefinition.value?.animation?.frames.join(',') 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ () => selectedDefinition.value?.animation?.frames.join(',') ?? '')
const variantsText = computed(/* 当 selectedDefinition.value?.variants.map(variant => `${variant.tile}:${variant.weight}`).join(', ') 为 null 或 undefined 时返回 ''，否则保留左侧值。 */ () => selectedDefinition.value?.variants.map(/** 将随机变体格式化为瓦片编号和权重。 */ variant => `${variant.tile}:${variant.weight}`).join(', ') ?? '')
const visibleTiles = computed(/** 先按调色板限定候选，再按瓦片名、编号或地形搜索。 */ () => {
  const palette = readTilePalette(paletteRef.value), query = tileSearch.value.trim().toLocaleLowerCase()
  const candidates = palette ? tileSet.value?.tiles.filter(/* 调用 palette.tiles.includes(tile.index) 并返回调用结果。 */ tile => palette.tiles.includes(tile.index)) ?? [] : tileSet.value?.tiles ?? []
  return query ? candidates.filter(/** 匹配瓦片名称、编号或地形中的查询文本。 */ tile => tile.name.toLocaleLowerCase().includes(query) || String(tile.index).includes(query) || tile.terrain.toLocaleLowerCase().includes(query)) : candidates
})
const brushRotation = computed(/** 读取笔刷变换低两位作为旋转状态。 */ () => tilemapEditorState.transform & 3)
const brushMirrorX = computed(/* 比较 (tilemapEditorState.transform & 4) 与 0，返回严格不等的判断结果。 */ () => (tilemapEditorState.transform & 4) !== 0)
const brushMirrorY = computed(/* 比较 (tilemapEditorState.transform & 8) 与 0，返回严格不等的判断结果。 */ () => (tilemapEditorState.transform & 8) !== 0)
const autoRegion = computed(/** 根据选中瓦片编号、列数及瓦片尺寸计算默认图像区域位置。 */ () => ({ x: (tilemapEditorState.tileIndex % (tileSet.value?.columns ?? 1)) * (tileSet.value?.tileWidth ?? 1), y: Math.floor(tilemapEditorState.tileIndex / (tileSet.value?.columns ?? 1)) * (tileSet.value?.tileHeight ?? 1) }))
const terrainPreview = computed(/** 按所选瓦片地形及诊断返回规则就绪、无效或未配置说明。 */ () => selectedDefinition.value?.terrain ? `${selectedDefinition.value.terrain} · ${diagnostics.value.some(/* 比较 issue.code 与 'invalid-terrain'，返回严格相等的判断结果。 */ issue => issue.code === 'invalid-terrain') ? t('terrainRulesInvalid') : t('terrainRulesReady')}` : t('noTerrainRules'))
const selectionWorld = computed(/** 存在地图和选择时计算选择起点的世界坐标。 */ () => selectedEntity.value && tileMap.value && tilemapEditorState.selection
  ? tileWorldCoordinate(selectedEntity.value, tileMap.value, tilemapEditorState.selection.start, physicsState.world.entities)
  : null)
const streamingBoundaryCount = computed(/* 根据 tileMap.value 的真假，分别返回 tileStreamingBoundaries(tileMap.value).length 或 0。 */ () => tileMap.value ? tileStreamingBoundaries(tileMap.value).length : 0)

watch(selectedEntity, /** 实体选择变化时仅为瓦片地图设置编辑目标并启用编辑器。 */ entity => {
  tilemapEditorState.selectedEntityUuid = entity?.getComponent<TileMap2D>('TileMap2D') ? entity.uuid : null
  tilemapEditorState.active = Boolean(tilemapEditorState.selectedEntityUuid)
}, { immediate: true })

/** 创建瓦片地图实体并启用编辑器。 */ function createMap() { createTileMapEntity(); tilemapEditorState.active = true }
/** 从源图片创建图集，按需绑定地图并使缓存失效，记录历史。 */ function createSet() {
  if (!sourceImage.value) return
  const asset = createTileSet(sourceImage.value, tilePixels.x, tilePixels.y)
  if (tileMap.value) { tileMap.value.tileSetAsset = assetReference(asset.uuid); tileMap.value.revision++; invalidateTileMap(tileMap.value) }
  pushHistory('Create TileSet')
}
/** 为当前地图及选中瓦片创建调色板，选中并记录历史。 */ function createPalette() { if (!tileMap.value) return; const asset = createTilePalette(tileMap.value.tileSetAsset, [tilemapEditorState.tileIndex]); paletteRef.value = assetReference(asset.uuid); pushHistory('Create tile palette') }
/** 创建笔刷预设，选中并记录历史。 */ function createBrush() { const asset = createBrushPreset(); brushRef.value = assetReference(asset.uuid); pushHistory('Create brush preset') }
/** 创建地形规则，选中并记录历史。 */ function createTerrain() { const asset = createTerrainRules(); terrainRef.value = assetReference(asset.uuid); pushHistory('Create terrain rules') }
/** 调色板有瓦片时选中首项。 */ function applyPalette() { const palette = readTilePalette(paletteRef.value); if (palette?.tiles.length) tilemapEditorState.tileIndex = palette.tiles[0] }
/** 设置当前笔刷预设资源引用或空值。 */ function applyBrush() { tilemapEditorState.brushPresetAsset = brushRef.value || null }
/** 设置当前地形规则引用或空值。 */ function applyTerrain() { tilemapEditorState.terrainRulesAsset = terrainRef.value || null }
/** 激活指定瓦片层成功后记录历史。 */ function activateLayer(index: number) { if (tileMap.value && setActiveTileLayer(tileMap.value, index)) pushHistory('Switch tile layer') }
/** 向地图添加瓦片层并记录历史。 */ function addLayer() { if (!tileMap.value) return; addTileLayer(tileMap.value); pushHistory('Add tile layer') }
/** 复制当前瓦片层并记录历史。 */ function duplicateLayer() { if (!tileMap.value) return; duplicateTileLayer(tileMap.value); pushHistory('Duplicate tile layer') }
/** 删除当前瓦片层成功后记录历史。 */ function removeLayer() { if (tileMap.value && removeTileLayer(tileMap.value)) pushHistory('Remove tile layer') }
/** 层属性变化时递增地图修订、失效缓存并记录历史。 */ function changedLayer() { if (!tileMap.value) return; tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory('Edit tile layer') }
/** 烘焙当前地图，显示取消或碰撞、导航、遮挡和分块数量。 */ async function bake() { if (!tileMap.value) return; const result = await requestTileMapBake(tileMap.value); bakeResult.value = result.cancelled ? t('cancelled') : `${result.collision} collision · ${result.navigation} navigation · ${result.occluders} occluders · ${result.chunks} chunks` }
/** 复制确定性存储文本，剪贴板失败时直接在结果区显示文本。 */ async function copyDeterministicStorage() { if (!tileMap.value) return; const text = deterministicTileMapStorage(tileMap.value); try { await navigator.clipboard.writeText(text); bakeResult.value = t('deterministicStorageCopied') } catch { bakeResult.value = text } }
/** 切换图集绑定，递增修订、失效缓存并记录历史。 */ function selectTileSet(event: Event) {
  if (!tileMap.value) return
  tileMap.value.tileSetAsset = (event.target as HTMLSelectElement).value || null
  tileMap.value.revision++
  invalidateTileMap(tileMap.value)
  pushHistory('Assign TileSet')
}
/** 选择瓦片工具并启用编辑器。 */ function activateTool(tool: TileTool) { tilemapEditorState.tool = tool; tilemapEditorState.active = true }
/** 保留镜像位，循环递增两位旋转状态。 */ function rotateBrush() { tilemapEditorState.transform = (((tilemapEditorState.transform & 12) | ((tilemapEditorState.transform + 1) & 3)) & 15) as typeof tilemapEditorState.transform }
/** 按指定镜像位翻转笔刷变换状态。 */ function toggleBrushMirror(bit: 4 | 8) { tilemapEditorState.transform = (tilemapEditorState.transform ^ bit) as typeof tilemapEditorState.transform }
/** 复制地图选区成功后记录历史。 */ function copySelection() { if (tileMap.value && copyTileSelection(tileMap.value)) pushHistory('Copy tile selection') }
/** 旋转或镜像选区成功后更新修订及缓存并记录历史。 */ function transformSelection(operation: 'rotate' | 'mirrorX' | 'mirrorY') { if (tileMap.value && transformTileSelection(tileMap.value, operation)) { tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory(`Transform tile selection: ${operation}`) } }
/** 重新生成地图诊断，无地图时清空。 */ function runDiagnostics() { diagnostics.value = tileMap.value ? diagnoseTileMap(tileMap.value) : [] }
/** 复制图集为可编辑资源并重新绑定地图，更新缓存和历史，失败显示错误。 */ function makeEditableCopy() {
  if (!tileMap.value || !tileSetAsset.value) return
  try {
    const asset = copyEditableTileSet(tileSetAsset.value.uuid)
    tileMap.value.tileSetAsset = assetReference(asset.uuid)
    tileMap.value.revision++; invalidateTileMap(tileMap.value)
    tileSetError.value = ''; pushHistory('Make editable TileSet copy')
  } catch (error) { tileSetError.value = error instanceof Error ? error.message : String(error) }
}
/** 仅保存可编辑图集，成功更新地图修订及历史，失败显示操作错误。 */ function saveSet() {
  if (importedMap.value || !tileSetAsset.value || !tileSet.value) return
  if (saveTileSet(tileSetAsset.value.uuid, tileSet.value)) {
    tileSetError.value = ''; if (tileMap.value) { tileMap.value.revision++; invalidateTileMap(tileMap.value) }
    pushHistory('Edit TileSet')
  } else tileSetError.value = ac('operationFailed')
}
/** 从选中图片添加新图集来源，选中并保存图集。 */ function addAtlasSource() { if (!tileSet.value || !sourceImage.value) return; const id = `atlas-${crypto.randomUUID().slice(0, 8)}`; tileSet.value.sources.push({ id, name: sourceImage.value.name, textureAsset: assetReference(sourceImage.value.uuid), margin: 0, spacing: 0 }); activeSourceId.value = id; saveSet() }
/** 读取区域输入并归一化为非负整数，宽高至少一，更新后保存。 */ function updateRegion(field: 'x' | 'y' | 'width' | 'height', event: Event) { if (!selectedDefinition.value || !tileSet.value) return; const current = selectedDefinition.value.region ?? { x: autoRegion.value.x, y: autoRegion.value.y, width: tileSet.value.tileWidth, height: tileSet.value.tileHeight }; current[field] = Math.max(field === 'width' || field === 'height' ? 1 : 0, Math.round(Number((event.target as HTMLInputElement).value) || 0)); selectedDefinition.value.region = current; saveSet() }
/** 多边形碰撞点不足时创建默认矩形，保存图集并使地图缓存失效。 */ function collisionChanged() {
  if (selectedDefinition.value?.collision === 'Polygon' && selectedDefinition.value.polygon.length < 3) selectedDefinition.value.polygon = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
  saveSet()
  if (tileMap.value) { tileMap.value.revision++; invalidateTileMap(tileMap.value) }
}
/** 解析并限制最多四个归一化点，至少三个才替换碰撞多边形，再刷新碰撞设置。 */ function updatePolygon(event: Event) {
  if (!selectedDefinition.value) return
  const points = (event.target as HTMLTextAreaElement).value.trim().split(/\s+/).flatMap(/** 解析单个有限坐标对并钳制至零到一，无效忽略。 */ pair => {
    const [x, y] = pair.split(',').map(Number)
    return Number.isFinite(x) && Number.isFinite(y) ? [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }] : []
  }).slice(0, 4)
  if (points.length >= 3) selectedDefinition.value.polygon = points
  collisionChanged()
}
/** 解析导航或遮挡多边形，少于三个有效点时清空，然后保存。 */ function updateTypedPolygon(field: 'navigationPolygon' | 'occlusionPolygon', event: Event) { if (!selectedDefinition.value) return; const points = parsePolygon((event.target as HTMLTextAreaElement).value); selectedDefinition.value[field] = points.length >= 3 ? points : []; saveSet() }
/** 解析空白分隔坐标文本并限制最多四点。 */ function parsePolygon(value: string) { return value.trim().split(/\s+/).flatMap(/** 将单个有限坐标对钳制至零到一，无效忽略。 */ pair => { const [x, y] = pair.split(',').map(Number); return Number.isFinite(x) && Number.isFinite(y) ? [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }] : [] }).slice(0, 4) }
/** 解析对象元数据，仅保留基础值最多六十四项后保存，JSON 异常则运行诊断。 */ function updateMetadata(event: Event) { if (!selectedDefinition.value) return; try { const value = JSON.parse((event.target as HTMLTextAreaElement).value) as unknown; if (value && typeof value === 'object' && !Array.isArray(value)) selectedDefinition.value.metadata = Object.fromEntries(Object.entries(value as Record<string, unknown>).filter(/* 调用 ['boolean','number','string'].includes(typeof item) 并返回调用结果。 */ ([,item]) => ['boolean','number','string'].includes(typeof item)).slice(0,64)) as Record<string, boolean | number | string>; saveSet() } catch { runDiagnostics() } }
/** 解析合法图集瓦片索引作为最多二百五十六帧的动画，空列表删除动画，再保存。 */ function updateAnimationFrames(event: Event) { if (!selectedDefinition.value || !tileSet.value) return; const frames = (event.target as HTMLInputElement).value.split(',').map(Number).filter(/* 先计算 Number.isInteger(value) && value >= 0；仅当其为真值时求右侧 value < tileSet.value!.tiles.length，返回短路求值结果。 */ value => Number.isInteger(value) && value >= 0 && value < tileSet.value!.tiles.length).slice(0,256); selectedDefinition.value.animation = frames.length ? { frames, framesPerSecond: selectedDefinition.value.animation?.framesPerSecond ?? 8, mode: selectedDefinition.value.animation?.mode ?? 'Loop' } : null; saveSet() }
/** 解析有效正权重瓦片变体，最多六十四项后保存。 */ function updateVariants(event: Event) { if (!selectedDefinition.value || !tileSet.value) return; selectedDefinition.value.variants = (event.target as HTMLTextAreaElement).value.split(',').flatMap(/** 校验瓦片索引在图集范围且权重有限为正，合法返回变体。 */ pair => { const [tile,weight] = pair.trim().split(':').map(Number); return Number.isInteger(tile) && tile >= 0 && tile < tileSet.value!.tiles.length && Number.isFinite(weight) && weight > 0 ? [{ tile, weight }] : [] }).slice(0,64); saveSet() }
/** 查找瓦片来源图片和区域，计算背景图、缩放和位置样式，缺失资源返回空样式。 */ function tileStyle(index: number) {
  const set = tileSet.value, tile = set?.tiles[index]
  if (!set || !tile) return {}
  const source = set.sources.find(/* 比较 value.id 与 tile.sourceId，返回严格相等的判断结果。 */ value => value.id === tile.sourceId), reference = source?.textureAsset ?? set.textureAsset
  const image = images.value.find(/* 先计算 reference === assetReference(asset.uuid)；仅当其为假值时求右侧 reference === asset.uuid，返回短路求值结果。 */ asset => reference === assetReference(asset.uuid) || reference === asset.uuid)
  if (!image) return {}
  const region = tile.region ?? { x: (source?.margin ?? 0) + index % set.columns * (set.tileWidth + (source?.spacing ?? 0)), y: (source?.margin ?? 0) + Math.floor(index / set.columns) * (set.tileHeight + (source?.spacing ?? 0)), width: set.tileWidth, height: set.tileHeight }
  return { backgroundImage: 'url(' + image.source + ')', backgroundSize: (image.width / region.width * 100) + '% ' + (image.height / region.height * 100) + '%', backgroundPosition: (image.width === region.width ? 0 : region.x / (image.width - region.width) * 100) + '% ' + (image.height === region.height ? 0 : region.y / (image.height - region.height) * 100) + '%' }
}
onBeforeUnmount(/** 卸载时停用瓦片编辑器。 */ () => { tilemapEditorState.active = false })
</script>

<style scoped>
.tile-definition-fields{border:0;min-width:0;margin:0;padding:0}.tile-definition-fields:disabled{opacity:.7}.imported-map-ownership{display:grid;gap:6px;padding:8px;background:var(--surface-2);border:1px solid var(--border-subtle);border-radius:8px}.imported-map-ownership button{min-height:32px;white-space:normal;overflow-wrap:anywhere}

.asset-selects { margin: 7px 0; display: grid; gap: 4px; }.asset-selects select,.asset-selects input { min-width: 0; width:100%; }.layers, .baking,.animation-settings,.diagnostics,.tile-history { margin-top: 12px; padding-top: 8px; display: grid; gap: 4px; border-top: 1px solid var(--border-subtle); }.layers > button { min-height: 28px; display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; border: 1px solid transparent; border-radius: 6px; background: transparent; }.layers > button.active { border-color: var(--accent); background: var(--accent-soft); }.layers > button input:not([type=checkbox]) { width: 100%; min-width: 0; border: 0; background: transparent; }.layers > div { display: flex; gap: 4px; }.baking > button,.diagnostics>button { min-height: 30px; }.diagnostics article{padding:5px;display:grid;gap:2px;border-left:3px solid var(--text-muted);background:var(--surface-2)}.diagnostics article.error{border-color:var(--danger)}.diagnostics article.warning{border-color:var(--warning)}.diagnostics article.info{border-color:var(--success)}.diagnostics article span{overflow-wrap:anywhere;color:var(--text-muted)}.tile-history ol{margin:0;padding-left:18px}.tile-history li{display:grid;grid-template-columns:minmax(70px,1fr) auto;gap:6px;color:var(--text-muted);font-size:var(--type-caption)}
.baking progress{width:100%;height:6px;accent-color:var(--accent)}.bake-actions{display:grid;grid-template-columns:1fr auto;gap:4px}.baking code{overflow:hidden;text-overflow:ellipsis;color:var(--text-muted)}
.tilemap-panel { height: 100%; min-width: 0; display: flex; flex-direction: column; }.tilemap-toolbar { min-height: 42px; padding: 5px 7px; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; border-bottom: 1px solid var(--border-subtle); }.tilemap-toolbar > span { flex: 1; }.tilemap-toolbar button, .tilemap-toolbar select, .tilemap-toolbar input { min-height: 30px; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--surface-2); color: var(--text-secondary); font-size: 11px; }.tilemap-toolbar button { padding: 0 8px; }.tilemap-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.tilemap-toolbar button.active { color: var(--accent); border-color: var(--accent); background: var(--accent-soft); }.tilemap-toolbar label { display: flex; align-items: center; gap: 4px; color: var(--text-muted); font-size:11px; }.tilemap-toolbar label input { width: 54px; padding: 0 4px; }.tilemap-workspace { min-height: 0; flex: 1; display: grid; grid-template-columns: minmax(180px, 1fr) 260px; }.tilemap-workspace aside { min-width: 0; padding: 8px; overflow: auto; }.tilemap-workspace strong { color: var(--text-primary); font-size: 12px; }.palette-grid { margin-top: 7px; display: grid; gap: 3px; }.palette-grid button { width: 32px; height: 32px; padding: 2px; border: 1px solid var(--border-subtle); border-radius: 5px; background: var(--surface-3); }.palette-grid button.selected { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }.palette-grid span { width: 100%; height: 100%; display: block; background-repeat: no-repeat; image-rendering: pixelated; }.tile-properties { padding: 8px 10px; overflow: auto; border-left: 1px solid var(--border-subtle); }.tile-properties label { min-height: 34px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size: 11px; }.tile-properties label.stacked { padding: 6px 0; align-items: stretch; flex-direction: column; }.tile-properties input, .tile-properties select, .tile-properties textarea { width: 140px; min-width: 0; }.tile-properties textarea { width: 100%; resize: vertical; }.tile-properties p, .empty { color: var(--text-muted); font-size: 11px; line-height: 1.5; }.empty { margin: auto; padding: 18px; text-align: center; }.empty p { margin: 5px 0 0; }
.atlas-settings,.region-settings { margin-top:12px; padding-top:8px; display:grid; gap:4px; border-top:1px solid var(--border-subtle); }.region-settings label>div { display:flex; gap:4px; }.region-settings label>div input { width:66px; }.terrain-preview { display:grid; gap:3px; padding:6px; border-radius:6px; background:var(--surface-2); }.tilemap-toolbar .compact-toggle input { width:16px; min-height:16px; padding:0; }
@media (max-width: 700px) { .tilemap-workspace { grid-template-columns: minmax(150px, 1fr) minmax(180px, 220px); }.tilemap-toolbar > span { display: none; } }
@media (max-width: 520px) { .tilemap-panel { overflow: auto; }.tilemap-workspace { flex: 0 0 auto; grid-template-columns: 1fr; }.tilemap-workspace aside { min-height: 110px; }.tile-properties { min-height: 120px; border-top: 1px solid var(--border-subtle); border-left: 0; } }
</style>
