<template>
  <section class="bottom-panel" data-control-scope="transient-bottom-dock" :class="{ collapsed: !estate.bottomPanelOpen, unpinned: !estate.bottomPanelPinned }" :style="panelStyle" @mouseleave="autoHide">
    <div v-if="estate.bottomPanelOpen" class="resize-handle" @mousedown="startResize"></div>
    <header class="panel-tabs">
      <select v-model="estate.bottomPanelTab" class="compact-tab-select" :aria-label="t('tools')" @change="estate.bottomPanelOpen = true"><option v-for="tab in tabs" :key="tab.id" :value="tab.id">{{ t(tab.label) }}</option></select>
      <button v-for="tab in tabs" :key="tab.id" class="panel-tab" :class="{ active: estate.bottomPanelTab === tab.id }" draggable="true" :aria-pressed="estate.bottomPanelTab === tab.id" @dragstart="draggedTab = tab.id" @dragover.prevent @drop="dropTab(tab.id)" @click="openTab(tab.id)">{{ t(tab.label) }}<i v-if="tabDirty(tab.id)">●</i></button>
      <span></span>
      <button :class="{ active: estate.bottomPanelPinned }" :aria-pressed="estate.bottomPanelPinned" :title="t(estate.bottomPanelPinned ? 'unpinPanel' : 'pinPanel')" @click="estate.bottomPanelPinned = !estate.bottomPanelPinned">⌖</button>
      <button v-if="estate.bottomPanelTab === 'console' && estate.bottomPanelOpen" :title="t('clearConsole')" @click="estate.logs.splice(0)">⌫</button>
      <button :title="t(estate.bottomPanelOpen ? 'collapsePanel' : 'expandPanel')" @click="estate.bottomPanelOpen = !estate.bottomPanelOpen">{{ estate.bottomPanelOpen ? '⌄' : '⌃' }}</button>
    </header>

    <div v-if="estate.bottomPanelOpen" class="panel-content">
      <div v-if="estate.bottomPanelTab === 'assets'" class="asset-browser" :class="{ inspecting: selectedAsset }">
        <aside class="folder-tree">
          <strong>{{ t('projectFiles') }}</strong>
          <button
            v-for="folder in visibleFolders"
            :key="folder"
            :title="folder"
            :class="{ active: assets.currentFolder === folder }"
            @click="assets.currentFolder = folder"
            @dragover.prevent
            @drop="dropOnFolder($event, folder)"
          ><span>▸</span>{{ folder }}</button>
        </aside>

        <section class="asset-workspace">
          <header class="asset-toolbar">
            <div class="asset-actions-row">
              <button class="primary" :disabled="assets.importing" @click="assetInput?.click()">＋ {{ t('importAssets') }}</button>
              <button @click="createScriptAsset">+ {{ t('newScript') }}</button>
              <button @click="createVisualGraphAsset">+ {{ t('visualGraph') }}</button>
              <button :disabled="!state.selectedEntityIds.length" @click="createSceneAssetFromSelection">+ {{ t('createSceneAsset') }}</button>
              <button @click="creatingFolder = !creatingFolder">{{ t('newFolder') }}</button>
              <details ref="assetOverflow" class="asset-overflow"><summary :title="t('moreActions')">•••</summary><section class="asset-overflow-menu"><strong>{{ t('newSharedResource') }}</strong><button v-for="kind in resourceKinds" :key="kind" type="button" :aria-label="`+ ${t(`resource_${kind}`)}`" @click="createSharedResource(kind); closeAssetOverflow()">+ {{ t(`resource_${kind}`) }}</button><button type="button" @click="exportFolder(); closeAssetOverflow()">{{ t('exportProjectFolder') }}</button><button type="button" @click="batchReimportVisible(); closeAssetOverflow()">{{ t('batchReimport') }}</button><button type="button" :disabled="!selectedAsset" @click="bulkApplyVisible(); closeAssetOverflow()">{{ t('bulkApplyVisible') }}</button><button v-for="item in pluginAssetContributions" :key="`${item.pluginId}:${item.kind}:${item.id}`" type="button" :title="`${item.pluginName} · ${item.description ?? ''}`" @click="pluginRuntime.invokeContribution(item.kind,item.id,item.pluginId); closeAssetOverflow()">{{ item.label }}</button></section></details>
              <input v-if="creatingFolder" v-model="newFolderName" class="folder-input" :placeholder="t('folderName')" @keydown.enter="createFolder" @keydown.escape="creatingFolder = false">
              <span class="path" :title="assets.currentFolder">{{ assets.currentFolder }}</span>
              <input v-model="assets.search" type="search" :placeholder="t('searchAssets')">
              <button :class="{ active: assets.viewMode === 'grid' }" :title="t('gridView')" @click="assets.viewMode = 'grid'">▦</button><button :class="{ active: assets.viewMode === 'list' }" :title="t('listView')" @click="assets.viewMode = 'list'">☷</button>
            </div>
            <div class="filter-menu" :aria-label="t('assetType')">
              <button :class="{ active: assets.typeFilter !== 'all' || assets.favoritesOnly }" @click="filterMenuOpen = !filterMenuOpen">⌕ {{ activeFilterLabel }} ▾</button>
              <section v-if="filterMenuOpen" class="filter-popover">
                <input v-model="filterQuery" type="search" :placeholder="t('searchFilters')">
                <button v-for="filter in filteredTypeFilters" :key="filter.type" :class="{ active: assets.typeFilter === filter.type }" @click="assets.typeFilter = filter.type; filterMenuOpen = false">{{ t(filter.label) }}</button>
                <button :class="{ active: assets.favoritesOnly }" @click="assets.favoritesOnly = !assets.favoritesOnly">★ {{ t('favoritesOnly') }}</button>
                <input v-model="assets.tagFilter" :placeholder="t('filterByTag')">
                <select v-model="assets.selectedCollectionId"><option value="">{{ t('allCollections') }}</option><option v-for="collection in assets.collections" :key="collection.id" :value="collection.id">{{ collection.name }}</option></select>
                <select :value="''" @change="applySavedFilter(($event.target as HTMLSelectElement).value)"><option value="">{{ t('savedFilters') }}</option><option v-for="filter in assets.savedFilters" :key="filter.id" :value="filter.id">{{ filter.name }}</option></select>
                <div><input v-model="savedFilterName" :placeholder="t('filterName')" @keydown.enter="saveFilter"><button @click="saveFilter">＋</button></div>
              </section>
            </div>
            <div class="asset-diagnostics">
              <button @click="reportUnusedAssets">{{ t('unusedAssetReport') }}</button>
              <button :disabled="!assetGraph.missingReferences.length" @click="openMissingRepair">{{ t('missingReferences') }} <span>{{ assetGraph.missingReferences.length }}</span></button>
              <span v-if="assets.atlasError" class="atlas-error" :title="assets.atlasError">{{ t('atlasRebuildFailed') }}</span>
            </div>
            <input ref="assetInput" hidden type="file" multiple accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,audio/wav,audio/ogg,audio/mpeg,audio/flac,font/ttf,font/otf,font/woff,font/woff2,.wav,.ogg,.mp3,.flac,.ttf,.otf,.woff,.woff2,.rhai,.nova-graph,.nova-prefab,.nova-scene,.nova-material,.nova-anim,.nova-controller,.nova-mask,.nova-rig,.nova-skin,.nova-timeline,.nova-tileset,.nova-atlas,.nova-resource,.atlas,.tpsheet,.tmx,.tmj,.tsx,.tsj,.json,.nova-path,.glsl,.frag,.vert,.nova-shader,.csv,.po,.arb,.nova-locale,.nova-theme" @change="importFiles">
          </header>

          <section v-if="externalChanges.length" class="external-changes" aria-live="polite">
            <article v-for="change in externalChanges" :key="change.id"><span><strong>{{ t('externalAssetChanged') }}</strong><small>{{ change.name }}</small></span><button @click="resolveExternal(change.id, 'reimport')">{{ t('reimportAsset') }}</button><button @click="resolveExternal(change.id, 'keep')">{{ t('keepCurrent') }}</button><button @click="resolveExternal(change.id, 'duplicate')">{{ t('importAsCopy') }}</button></article>
          </section>

          <div v-if="importJobs.length" class="import-queue" aria-live="polite">
            <article v-for="job in importJobs" :key="job.id">
              <span><strong>{{ job.name }}</strong><small>{{ t(`importStatus_${job.status}`) }}</small></span>
              <progress :value="job.progress" max="1"></progress>
              <button v-if="!['complete','cancelled','failed'].includes(job.status)" @click="cancelAssetImport(job.id)">{{ t('cancel') }}</button>
              <button v-else-if="job.retryable" @click="retryImport(job.id)">{{ t('retry') }}</button>
              <details v-if="job.logs.length"><summary>{{ t('importLog') }}</summary><code v-for="(line,index) in job.logs" :key="index">{{ line }}</code></details>
            </article>
          </div>

          <section v-if="repairMode && missingReferenceIds.length" class="missing-repair" aria-live="polite">
            <strong>{{ t('repairMissingReference') }}</strong>
            <select v-model="selectedMissingReference" :aria-label="t('missingReferences')">
              <option v-for="reference in missingReferenceIds" :key="reference" :value="reference">{{ reference }}</option>
            </select>
            <span>→</span>
            <select v-model="replacementAssetGuid" :aria-label="t('replacementAsset')">
              <option value="" disabled>{{ t('chooseReplacementAsset') }}</option>
              <option v-for="asset in assets.records" :key="asset.uuid" :value="asset.uuid">{{ asset.path }}</option>
            </select>
            <button class="primary" :disabled="!replacementAssetGuid" @click="repairSelectedMissingReference">{{ t('repairReference') }}</button>
            <button :title="t('close')" @click="repairMode = false">×</button>
          </section>

          <div ref="assetGrid" class="asset-grid" :class="`asset-${assets.viewMode}`" :style="assetGridStyle" @scroll.passive="updateAssetWindow">
            <article
              v-for="asset in displayedAssets"
              :key="asset.uuid"
              :class="{ selected: assets.selectedGuid === asset.uuid }"
              draggable="true"
              @dragstart="dragAsset($event, asset.uuid)"
              @click="assets.selectedGuid = asset.uuid"
              @dblclick="openAssetEditor(asset.uuid)"
            >
              <span class="asset-preview" :class="{ 'asset-icon': asset.assetType!=='image' }" :style="{ backgroundImage: `url(${contentThumbnailDataUrl(asset)})`, imageRendering: asset.settings.filterMode === 'Nearest' ? 'pixelated' : 'auto', backgroundSize: asset.assetType==='image' ? 'contain' : 'cover' }"><i v-if="asset.assetType!=='image'">{{ assetIcon(asset.assetType) }}</i></span>
              <span v-if="assetSourceStatus(asset.uuid)" :class="['source-badge', assetSourceStatus(asset.uuid)]">{{ assetSourceStatus(asset.uuid)?.slice(0, 1).toUpperCase() }}</span>
              <button class="favorite-button" :class="{ active: assets.favorites.includes(asset.uuid) }" :title="t('favorite')" @click.stop="toggleAssetFavorite(asset.uuid)">★</button>
              <input v-if="renamingGuid === asset.uuid" v-model="renameValue" @click.stop @keydown.enter="commitRename" @keydown.escape="renamingGuid = null" @blur="commitRename">
              <strong v-else>{{ asset.name }}</strong>
              <small>{{ asset.assetType }} · {{ formatBytes(asset.byteLength) }}</small>
            </article>
            <p v-if="!displayedAssets.length" class="empty">{{ t('noAssets') }}</p>
            <p v-else-if="displayedAssets.length < filteredAssetCount" class="asset-window-status">{{ t('virtualizedAssets', { shown: displayedAssets.length, total: filteredAssetCount }) }}</p>
          </div>
        </section>

        <aside v-if="selectedAsset" class="asset-inspector" @change="assetSettingsChanged">
          <header><span>{{ t('assetInspector') }}</span><strong>{{ selectedAsset.name }}</strong></header>
          <nav class="importer-tabs" :aria-label="t('assetImporter')"><button v-for="tab in importerTabs" :key="tab" :class="{ active: inspectorTab === tab }" @click="inspectorTab = tab">{{ t(`importerTab_${tab}`) }}</button></nav>
          <div v-if="selectedAsset.assetType === 'image'" class="large-preview" :style="{ backgroundImage: `url(${selectedAsset.source})`, imageRendering: selectedAsset.settings.filterMode === 'Nearest' ? 'pixelated' : 'auto' }"></div>
          <audio v-else-if="selectedAsset.assetType === 'audio'" class="asset-media-preview" :src="selectedAsset.source" controls preload="metadata"></audio>
          <div v-else-if="selectedAsset.assetType === 'font'" class="font-preview" :style="{ fontFamily: selectedAsset.fontFamily }">Nova_A Aa 123</div>
          <ContentAssetInspector :asset="selectedAsset" @open-animation="openAnimationAsset" @select-asset="assets.selectedGuid=$event" />
          <section v-show="inspectorTab === 'source'" class="inspector-pane">
            <label><span>GUID</span><code>{{ selectedAsset.uuid.slice(0, 13) }}…</code></label>
            <label><span>{{ t('assetPath') }}</span><code>{{ selectedAsset.path }}</code></label>
            <label v-if="selectedAsset.path.startsWith('.nova/')"><span>{{ t('generatedArtifact') }}</span><b>{{ t('readOnly') }}</b></label>
            <label><span>{{ t('sourceControl') }}</span><select v-model="selectedAsset.sourceControlStatus"><option>clean</option><option>added</option><option>modified</option><option>conflict</option><option>untracked</option></select></label>
            <label class="region-field"><span>{{ t('tags') }}</span><input v-model="selectedAssetTags" :placeholder="t('tagsPlaceholder')"></label>
            <label><span>{{ t('contentGroup') }}</span><select v-model="selectedAsset.contentGroup"><option v-for="group in assets.contentGroups" :key="group.id" :value="group.id">{{ group.name }} · {{ t(group.mode) }}</option></select></label>
            <label><span>{{ t('editorOnly') }}</span><input v-model="selectedAsset.editorOnly" type="checkbox"></label>
            <details class="collection-membership"><summary>{{ t('collections') }}</summary><button v-for="collection in assets.collections" :key="collection.id" :class="{ active: collection.assetUuids.includes(selectedAsset.uuid) }" @click="toggleSelectedCollection(collection.id)"><i :style="{ background: collection.color }"></i>{{ collection.name }}</button><div><input v-model="collectionName" :placeholder="t('newCollection')"><button @click="createCollection">＋</button></div></details>
            <button class="save-script secondary" @click="startRename(selectedAsset.uuid, selectedAsset.name)">{{ t('renameAsset') }}</button>
          </section>
          <section v-show="inspectorTab === 'provenance'" class="inspector-pane provenance-pane">
            <p v-if="!selectedAsset.pipeline" class="pipeline-error">{{ t('missingProvenance') }}</p>
            <template v-else><label><span>{{ t('importer') }}</span><code>{{ selectedAsset.pipeline.importerId }}@{{ selectedAsset.pipeline.importerVersion }}</code></label><label><span>{{ t('preset') }}</span><code>{{ selectedAsset.pipeline.presetId }}</code></label><label><span>{{ t('importCache') }}</span><code>{{ selectedAsset.pipeline.cacheHit ? t('cacheHit') : t('cacheWritten') }}</code></label><label><span>{{ t('cacheInvalidation') }}</span><code>{{ selectedAsset.pipeline.invalidationReason }}</code></label><label><span>{{ t('reproducible') }}</span><b :class="{ dangerText: !selectedAsset.pipeline.reproducible }">{{ selectedAsset.pipeline.reproducible ? t('yes') : t('no') }}</b></label></template>
          <details class="asset-technical">
            <summary>{{ t('technicalDetails') }}</summary>
            <div><span>GUID</span><code>{{ selectedAsset.uuid }}</code><button type="button" :title="t('copy')" @click="copyAssetDetail(selectedAsset.uuid)">⧉</button></div>
            <div><span>{{ t('assetPath') }}</span><code>{{ selectedAsset.path }}</code><button type="button" :title="t('copy')" @click="copyAssetDetail(selectedAsset.path)">⧉</button></div>
            <div v-if="selectedAsset.pipeline"><span>{{ t('sourceHash') }}</span><code>{{ selectedAsset.pipeline.sourceHash }}</code><button type="button" :title="t('copy')" @click="copyAssetDetail(selectedAsset.pipeline.sourceHash)">⧉</button></div>
            <div v-if="selectedAsset.pipeline"><span>{{ t('artifactHash') }}</span><code>{{ selectedAsset.pipeline.artifactHash }}</code><button type="button" :title="t('copy')" @click="copyAssetDetail(selectedAsset.pipeline.artifactHash)">⧉</button></div>
          </details>
            <article v-for="diagnostic in selectedProvenanceDiagnostics" :key="`${diagnostic.code}-${diagnostic.message}`" :class="['provenance-diagnostic', diagnostic.severity]"><b>{{ diagnostic.code }}</b><span>{{ diagnostic.message }}</span></article>
            <div class="provenance-actions"><button @click="compareSelectedImport">{{ t('compareImport') }}</button><button @click="revertSelectedImport">{{ t('revertImport') }}</button></div>
            <pre v-if="importComparisonText">{{ importComparisonText }}</pre>
          </section>
          <p v-if="selectedAsset.pipeline?.status === 'failed'" class="pipeline-error">{{ selectedAsset.pipeline.error }}</p>
          <section v-show="inspectorTab === 'import'" class="inspector-pane import-controls">
          <template v-if="selectedAsset.assetType === 'image'">
            <label><span>{{ t('dimensions') }}</span><b>{{ selectedAsset.width }} × {{ selectedAsset.height }}</b></label>
            <label><span>{{ t('importProfile') }}</span><select :value="selectedAsset.settings.textureProfile" @change="setTextureProfile"><option>General</option><option>PixelArt</option><option>UI</option><option>NormalMap</option></select></label>
            <label><span>{{ t('filterMode') }}</span><select v-model="selectedAsset.settings.filterMode"><option value="Linear">{{ t('linear') }}</option><option value="Nearest">{{ t('nearest') }}</option></select></label>
            <label><span>{{ t('pixelArtMode') }}</span><input :checked="selectedAsset.settings.filterMode === 'Nearest'" type="checkbox" @change="setPixelArtMode"></label>
            <label><span>{{ t('compression') }}</span><select v-model="selectedAsset.settings.compression"><option value="None">{{ t('none') }}</option><option value="Lossless">{{ t('lossless') }}</option><option value="Optimized">{{ t('optimized') }}</option></select></label>
            <label><span>{{ t('colorSpace') }}</span><select v-model="selectedAsset.settings.colorSpace"><option>sRGB</option><option>Linear</option></select></label>
            <label><span>{{ t('generateMipmaps') }}</span><input v-model="selectedAsset.settings.generateMipmaps" type="checkbox"></label>
            <label><span>{{ t('transparency') }}</span><select v-model="selectedAsset.settings.transparency"><option>Preserve</option><option>Premultiply</option><option>Discard</option></select></label>
            <label><span>{{ t('pixelsPerUnit') }}</span><input v-model.number="selectedAsset.settings.pixelsPerUnit" type="number" min="0.000001" step="1"></label>
            <label><span>{{ t('pivot') }} X/Y</span><div><input v-model.number="selectedAsset.settings.pivot.x" type="number" min="0" max="1" step="0.05"><input v-model.number="selectedAsset.settings.pivot.y" type="number" min="0" max="1" step="0.05"></div></label>
            <label><span>{{ t('pivotPreset') }}</span><select :value="''" @change="applyPivotPreset(($event.target as HTMLSelectElement).value)"><option value="">{{ t('custom') }}</option><option v-for="preset in pivotPresets" :key="preset.id" :value="preset.id">{{ t(preset.label) }}</option></select></label>
            <label><span>{{ t('useSpriteRegion') }}</span><input :checked="selectedAsset.settings.spriteRegion !== null" type="checkbox" @change="toggleSpriteRegion"></label>
            <label v-if="selectedAsset.settings.spriteRegion" class="region-field"><span>{{ t('spriteRegion') }} X/Y/W/H</span><div><input v-model.number="selectedAsset.settings.spriteRegion.x" type="number" min="0" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.y" type="number" min="0" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.width" type="number" min="1" step="1"><input v-model.number="selectedAsset.settings.spriteRegion.height" type="number" min="1" step="1"></div></label>
            <label><span>{{ t('trimTransparent') }}</span><button type="button" @click="trimSelectedImage">{{ t('trimNow') }}</button></label>
            <label><span>{{ t('spriteSheetSlicing') }}</span><input v-model="selectedAsset.settings.spriteSheet.enabled" type="checkbox"></label>
            <template v-if="selectedAsset.settings.spriteSheet.enabled"><label><span>{{ t('sheetColumnsRows') }}</span><div><input v-model.number="selectedAsset.settings.spriteSheet.columns" type="number" min="1" max="256"><input v-model.number="selectedAsset.settings.spriteSheet.rows" type="number" min="1" max="256"></div></label><label><span>{{ t('marginSpacing') }}</span><div><input v-model.number="selectedAsset.settings.spriteSheet.margin" type="number" min="0"><input v-model.number="selectedAsset.settings.spriteSheet.spacing" type="number" min="0"></div></label><button class="save-script" type="button" @click="sliceSelectedSheet">{{ t('createSpriteSlices') }}</button></template>
            <button class="save-script" type="button" @click="autoSliceSelectedImage">{{ t('automaticSpriteSlicing') }}</button>
            <label><span>{{ t('collisionGeneration') }}</span><select v-model="selectedAsset.settings.collisionGeneration.mode"><option>None</option><option>Box</option><option>Polygon</option></select></label>
            <label v-if="selectedAsset.settings.collisionGeneration.mode === 'Polygon'"><span>{{ t('polygonTolerance') }}</span><input v-model.number="selectedAsset.settings.collisionGeneration.tolerance" type="number" min="0" max="64" step="0.25"></label>
            <label class="region-field"><span>{{ t('sliceBorders') }} L/T/R/B</span><div><input v-model.number="selectedAsset.settings.borders.left" type="number" min="0"><input v-model.number="selectedAsset.settings.borders.top" type="number" min="0"><input v-model.number="selectedAsset.settings.borders.right" type="number" min="0"><input v-model.number="selectedAsset.settings.borders.bottom" type="number" min="0"></div></label>
            <label><span>{{ t('useTextureAtlas') }}</span><input v-model="selectedAsset.settings.atlas" type="checkbox"></label>
            <label><span>{{ t('atlasGroup') }}</span><input v-model="selectedAsset.settings.atlasSettings.group"></label>
            <label><span>{{ t('atlasRotation') }}</span><select v-model="selectedAsset.settings.atlasSettings.rotationPolicy"><option>Never</option><option>Allow</option></select></label>
            <label><span>{{ t('atlasTrimPolicy') }}</span><select v-model="selectedAsset.settings.atlasSettings.trimPolicy"><option>None</option><option>Transparent</option></select></label>
            <template v-if="selectedAsset.mimeType === 'image/svg+xml'"><label><span>{{ t('svgRasterization') }}</span><select v-model="selectedAsset.settings.svgSettings.rasterization"><option>ImportTime</option><option>Runtime</option><option>Disabled</option></select></label><label><span>{{ t('svgScale') }}</span><input v-model.number="selectedAsset.settings.svgSettings.scale" type="number" min="0.01" max="64" step="0.1"></label></template>
            <label v-for="platform in compressionPlatforms" :key="platform"><span>{{ t(platform) }} {{ t('compression') }}</span><select v-model="selectedAsset.settings.platformVariants[platform]"><option :value="undefined">{{ t('inherit') }}</option><option>None</option><option>Lossless</option><option>Optimized</option></select></label>
          </template>
          <template v-else-if="selectedAsset.assetType === 'audio'">
            <label><span>{{ t('duration') }}</span><b>{{ selectedAsset.duration.toFixed(2) }}s</b></label>
            <label><span>{{ t('importProfile') }}</span><select :value="selectedAsset.settings.audioSettings.profile" @change="setAudioProfile"><option>SoundEffect</option><option>Music</option><option>Voice</option><option>Streaming</option></select></label>
            <label><span>{{ t('audioCodec') }}</span><select v-model="selectedAsset.settings.audioSettings.codec"><option>Original</option><option>PCM</option><option>Vorbis</option><option>MP3</option></select></label>
            <label><span>{{ t('audioQuality') }}</span><input v-model.number="selectedAsset.settings.audioSettings.quality" type="range" min="0" max="1" step="0.01"></label>
            <label><span>{{ t('trimRange') }}</span><div><input v-model.number="selectedAsset.settings.audioSettings.trimStart" type="number" min="0" :max="selectedAsset.duration" step="0.01"><input v-model.number="selectedAsset.settings.audioSettings.trimEnd" type="number" min="0" :max="selectedAsset.duration" step="0.01"></div></label>
            <label><span>{{ t('normalizeAudio') }}</span><input v-model="selectedAsset.settings.audioSettings.normalize" type="checkbox"></label>
            <label><span>{{ t('streamAudio') }}</span><input v-model="selectedAsset.settings.audioSettings.streaming" type="checkbox"></label><label><span>{{ t('preloadAudio') }}</span><select v-model="selectedAsset.settings.audioSettings.preload"><option>Auto</option><option>Preload</option><option>Metadata</option><option>None</option></select></label>
            <label><span>{{ t('sampleRate') }}</span><select v-model.number="selectedAsset.settings.audioSettings.sampleRate"><option :value="22050">22050</option><option :value="44100">44100</option><option :value="48000">48000</option><option :value="96000">96000</option></select></label>
          </template>
          <template v-else-if="selectedAsset.assetType === 'font'">
            <label><span>{{ t('fontFamily') }}</span><b :style="{ fontFamily: selectedAsset.fontFamily }">Nova_A</b></label>
            <label><span>{{ t('fontRenderMode') }}</span><select v-model="selectedAsset.settings.fontSettings.renderMode"><option>Scalable</option><option>Bitmap</option></select></label>
            <label v-if="selectedAsset.settings.fontSettings.renderMode === 'Bitmap'"><span>{{ t('bitmapSize') }}</span><input v-model.number="selectedAsset.settings.fontSettings.bitmapSize" type="number" min="6" max="512"></label>
            <label><span>{{ t('fontOutline') }}</span><input v-model.number="selectedAsset.settings.fontSettings.outlineWidth" type="number" min="0" max="32" step="0.25"></label>
            <label><span>{{ t('textShaping') }}</span><input v-model="selectedAsset.settings.fontSettings.shaping" type="checkbox"></label>
            <label><span>{{ t('fontHinting') }}</span><select v-model="selectedAsset.settings.fontSettings.hinting"><option>Auto</option><option>None</option><option>Light</option><option>Full</option></select></label>
            <label><span>{{ t('fontOversampling') }}</span><input v-model.number="selectedAsset.settings.fontSettings.oversampling" type="number" min="1" max="8" step="0.25"></label>
            <label><span>{{ t('distanceField') }}</span><select v-model="selectedAsset.settings.fontSettings.distanceField"><option>None</option><option>SDF</option><option>MSDF</option></select></label>
            <label v-if="selectedAsset.settings.fontSettings.distanceField !== 'None'"><span>{{ t('distanceRange') }}</span><input v-model.number="selectedAsset.settings.fontSettings.distanceRange" type="number" min="1" max="64"></label>
            <label class="region-field"><span>{{ t('openTypeFeatures') }}</span><input :value="selectedAsset.settings.fontSettings.openTypeFeatures.join(', ')" @change="setOpenTypeFeatures"></label>
            <label class="region-field"><span>{{ t('declaredLanguages') }}</span><input :value="selectedAsset.settings.fontSettings.declaredLanguages.join(', ')" @change="setDeclaredLanguages"></label>
            <label><span>{{ t('editorFont') }}</span><input v-model="selectedAsset.settings.fontSettings.editorFont" type="checkbox"></label>
            <label class="region-field"><span>{{ t('fontFallbacks') }}</span><input :value="selectedAsset.settings.fontSettings.fallbackFamilies.join(', ')" @change="setFontFallbacks"></label>
            <section class="glyph-report"><strong>{{ t('glyphCoverage') }}</strong><article v-for="row in selectedGlyphReport" :key="row.language" :class="{ missing: !row.supported }"><b>{{ row.language }}</b><span>{{ row.sample }}</span><small>{{ row.supported ? t('covered') : `${t('missingGlyphs')}: ${row.missing.join(' ')}` }}</small></article></section>
          </template>
          <template v-else-if="selectedAsset.assetType === 'script'">
            <p class="drag-hint">{{ t('scriptStudioAssetHint') }}</p>
            <label><span>{{ t('module') }}</span><input v-model="selectedAsset.settings.scriptSettings.module" type="checkbox"></label>
            <label><span>{{ t('encoding') }}</span><b>UTF-8</b></label>
            <button class="save-script" @click="openInScriptStudio(selectedAsset.uuid)">{{ t('openScriptStudio') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'visualScript'">
            <label><span>{{ t('graphVersion') }}</span><b>1</b></label>
            <label><span>{{ t('scriptApiVersion') }}</span><b>API v2</b></label>
            <button class="save-script" @click="openInGraphStudio(selectedAsset.uuid)">{{ t('openVisualGraph') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'eventSheet'">
            <label><span>{{ t('eventSheetVersion') }}</span><b>1</b></label>
            <p class="drag-hint">{{ t('eventSheetAssetVisible') }}</p>
            <button class="save-script" @click="openInEventSheetStudio(selectedAsset.uuid)">{{ t('openEventSheet') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'objectBlueprint'">
            <label><span>{{ t('objectBlueprintVersion') }}</span><b>1</b></label>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'atlas'">
            <label><span>{{ t('atlasMaxSize') }}</span><select v-model.number="selectedAsset.settings.atlasSettings.maxSize"><option :value="512">512</option><option :value="1024">1024</option><option :value="2048">2048</option><option :value="4096">4096</option></select></label>
            <label><span>{{ t('atlasPadding') }}</span><input v-model.number="selectedAsset.settings.atlasSettings.padding" type="number" min="0" max="32"></label>
            <label><span>{{ t('trimTransparent') }}</span><input v-model="selectedAsset.settings.atlasSettings.trim" type="checkbox"></label>
            <section v-if="selectedAtlasReport" class="atlas-report"><strong>{{ t('atlasPackingReport') }}</strong><p>{{ t('atlasPages') }}: {{ selectedAtlasReport.pages }} · {{ t('atlasUtilization') }}: {{ (selectedAtlasReport.utilization * 100).toFixed(1) }}%</p><code>{{ selectedAtlasReport.deterministicKey.slice(0, 20) }}…</code><small v-for="message in selectedAtlasReport.diagnostics" :key="message">{{ message }}</small></section>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'tileset'">
            <label><span>{{ t('tileSize') }}</span><div><input v-model.number="selectedAsset.settings.tileSettings.tileWidth" type="number" min="1"><input v-model.number="selectedAsset.settings.tileSettings.tileHeight" type="number" min="1"></div></label>
            <label><span>{{ t('marginSpacing') }}</span><div><input v-model.number="selectedAsset.settings.tileSettings.margin" type="number" min="0"><input v-model.number="selectedAsset.settings.tileSettings.spacing" type="number" min="0"></div></label>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'shader'">
            <label><span>{{ t('shaderStage') }}</span><select v-model="selectedAsset.settings.shaderSettings.stage"><option value="fragment">Fragment</option><option value="vertex">Vertex</option></select></label>
            <label><span>{{ t('entryPoint') }}</span><input v-model="selectedAsset.settings.shaderSettings.entry"></label>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'localization'">
            <label><span>{{ t('locale') }}</span><input v-model="selectedAsset.settings.localizationSettings.locale"></label>
            <label><span>{{ t('fallbackLocale') }}</span><input v-model="selectedAsset.settings.localizationSettings.fallbackLocale"></label>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'uiTheme'">
            <p class="drag-hint">{{ t('uiThemeAssetHint') }}</p>
            <textarea class="text-preview" readonly :value="selectedTextSource"></textarea>
          </template>
          <template v-else-if="selectedAsset.assetType === 'other' && selectedAsset.path.startsWith('Assets/Tutorials/')">
            <p class="drag-hint">{{ t('projectTutorial') }}</p><textarea class="text-preview tutorial-preview" readonly :value="selectedTextSource"></textarea><button class="save-script" @click="dismissTutorial">{{ t('dismissTutorial') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'animation' && selectedAsset.animationImport">
            <p class="drag-hint">{{ t('animationImportHint') }}</p>
            <label><span>{{ t('sourceAnimation') }}</span><select v-model="selectedAsset.animationImport.sourceAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in animationSources" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
            <label><span>{{ t('sourceFrameRate') }}</span><input v-model.number="selectedAsset.animationImport.sourceFrameRate" type="number" min="1" max="240"></label>
            <label><span>{{ t('sampleRate') }}</span><input v-model.number="selectedAsset.animationImport.sampleRate" type="number" min="1" max="240"></label>
            <details class="mapping-editor"><summary>{{ t('trackMappings') }}</summary><label v-for="(mapping,index) in selectedAsset.animationImport.trackMappings" :key="index"><input v-model="mapping.source" :placeholder="t('sourceProperty')"><input v-model="mapping.target" :placeholder="t('targetProperty')"><button @click="selectedAsset.animationImport!.trackMappings.splice(index,1)">×</button></label><button @click="selectedAsset.animationImport.trackMappings.push({source:'Transform.position.x',target:'Transform.position.x'})">+ {{ t('trackMapping') }}</button></details>
            <button class="save-script" @click="reimportAnimation">{{ t('reimportAnimation') }}</button>
          </template>
          <template v-else-if="selectedAsset.assetType === 'prefab'"><button class="save-script" @click="instantiateSelectedPrefab">{{ t('instantiatePrefabAction') }}</button><button v-if="state.selectedEntityIds.length" class="save-script secondary" @click="replaceSelectionWithSelectedPrefab">{{ t('replaceSelectionWithPrefab') }}</button></template>
          <button v-else-if="selectedAsset.assetType === 'scene'" class="save-script" @click="instantiateSelectedScene">{{ t('instantiateScene') }}</button>
          </section>
          <section v-show="inspectorTab === 'import'" class="import-presets">
            <strong>{{ t('importPresets') }}</strong>
            <select :value="''" @change="applySelectedPreset(($event.target as HTMLSelectElement).value)"><option value="">{{ t('choosePreset') }}</option><option v-for="preset in compatibleImportPresets" :key="preset.id" :value="preset.id">{{ preset.name }}</option></select>
            <div><input v-model="presetName" :placeholder="t('presetName')" @keydown.enter="saveSelectedPreset"><button @click="saveSelectedPreset">＋</button></div>
          </section>
          <section v-show="inspectorTab === 'dependencies'" class="reference-summary">
            <strong>{{ t('assetReferences') }}</strong>
            <p>{{ t('referenceCount', { count: selectedReferences.length }) }}</p>
            <ul v-if="selectedReferences.length"><li v-for="owner in selectedReferences.slice(0, 8)" :key="owner"><button v-if="owner !== 'project'" @click="navigateAssetReference(owner)">{{ referenceName(owner) }}</button><span v-else>{{ referenceName(owner) }}</span></li></ul>
            <p>{{ t('dependencies') }}: {{ selectedAsset.pipeline?.dependencies.length ?? 0 }} · {{ t('reverseDependencies') }}: {{ selectedAsset.pipeline?.reverseDependencies.length ?? 0 }}</p>
            <ul v-if="selectedAsset.pipeline?.dependencies.length"><li v-for="dependency in selectedAsset.pipeline.dependencies.slice(0,8)" :key="dependency">→ <button @click="navigateAssetReference(dependency)">{{ referenceName(dependency) }}</button></li></ul>
            <ul v-if="selectedAsset.pipeline?.reverseDependencies.length"><li v-for="dependency in selectedAsset.pipeline.reverseDependencies.slice(0,8)" :key="dependency">← <button @click="navigateAssetReference(dependency)">{{ referenceName(dependency) }}</button></li></ul>
            <p v-if="selectedInclusion.length">{{ selectedInclusion.join(' · ') }}</p>
            <p v-else>{{ t('excludedFromBuild') }}</p>
            <p>{{ t('dependencyCycles') }}: {{ productionGraph.cycles.length }} · {{ t('duplicateSources') }}: {{ productionGraph.duplicateSources.length }} · {{ t('missingReferences') }}: {{ productionGraph.missingReferences.length }}</p>
            <details v-if="selectedContentClosure.length" class="content-closure"><summary>{{ t('contentClosure') }} · {{ selectedContentClosure.length }}</summary><article v-for="entry in selectedContentClosure.slice(0,32)" :key="entry.uuid" :class="{ invalid: entry.mode === 'excluded' }"><button @click="navigateAssetReference(entry.uuid)">{{ entry.path }}</button><small>{{ entry.groupId }} · {{ t(entry.mode) }}</small></article><p v-for="issue in selectedClosureIssues" :key="issue.uuid" class="pipeline-error">{{ issue.message }}</p></details>
          </section>
          <section v-show="inspectorTab === 'platform'" class="platform-overrides inspector-pane"><article v-for="platform in compressionPlatforms" :key="platform"><header><strong>{{ t(platform) }}</strong><input :checked="Boolean(selectedAsset.settings.platformOverrides[platform]?.enabled)" type="checkbox" @change="togglePlatformOverride(platform, $event)"></header><template v-if="selectedAsset.settings.platformOverrides[platform]?.enabled"><label><span>{{ t('compression') }}</span><select v-model="selectedAsset.settings.platformOverrides[platform]!.compression"><option>None</option><option>Lossless</option><option>Optimized</option></select></label><label><span>{{ t('maxSize') }}</span><select v-model.number="selectedAsset.settings.platformOverrides[platform]!.maxSize"><option :value="512">512</option><option :value="1024">1024</option><option :value="2048">2048</option><option :value="4096">4096</option><option :value="8192">8192</option></select></label><label><span>{{ t('format') }}</span><select v-model="selectedAsset.settings.platformOverrides[platform]!.format"><option>Auto</option><option>RGBA8</option><option>BC7</option><option>ASTC</option><option>ETC2</option></select></label></template></article></section>
          <div class="asset-actions"><button @click="reimportInput?.click()">{{ t('reimportAsset') }}</button><button @click="linkSelectedSource">{{ t('linkSource') }}</button><button @click="revealAsset">{{ t('revealAsset') }}</button><button class="danger" @click="removeSelectedAsset">{{ t('deleteAsset') }}</button></div>
          <input ref="reimportInput" hidden type="file" @change="reimportSelectedAsset">
          <p class="drag-hint">{{ t('dragAssetHint') }}</p>
        </aside>
      </div>

      <ConsolePanel v-else-if="estate.bottomPanelTab === 'console'" />
      <ProfilerPanel v-else-if="estate.bottomPanelTab === 'profiler'" />

      <AnimationPanel v-else-if="estate.bottomPanelTab === 'animation'" />
      <AudioSystemPanel v-else-if="estate.bottomPanelTab === 'audio'" />
      <WorldToolsPanel v-else-if="estate.bottomPanelTab === 'worldProduction'" />
      <NetworkStudioPanel v-else-if="estate.bottomPanelTab === 'networkStudio'" />
      <EcosystemStudioPanel v-else-if="estate.bottomPanelTab === 'ecosystem'" />
      <TilemapPanel v-else-if="estate.bottomPanelTab === 'tilemap'" />
      <div v-else class="empty">{{ t('selectObject') }}</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { t } from '../i18n'
import { addEditorLog, editorState as estate } from '../store/editor'
import { clearAssetReferences, countAssetReferences, getSceneJSON, physicsState as state, pushHistory, replaceAssetReferences } from '../store/physics'
import { requestConfirmation } from '../store/dialog'
import {
  applyAssetFilter, applyImportPreset, assetReference, assetState as assets, createAssetCollection, createAssetFolder, createTextAsset, deleteAsset, filteredAssets, importAssetFiles,
  linkAssetSource, moveAsset, queueTextureAtlasRebuild, readTextAsset, reimportAsset, renameAsset, resolveExternalAssetChange, retryFailedAssetImport,
  saveCurrentAssetFilter, saveImportPreset, sliceSpriteSheet, toggleAssetFavorite, toggleAssetInCollection, trimTransparentImage
} from '../assets/AssetDatabase'
import type { AssetPipelineMetadata, AssetType } from '../assets/types'
import type { AudioImportProfile, TextureImportProfile } from '../assets/types'
import { applyBulkAssetSettings, buildContentClosure, buildProductionAssetGraph, compareImportMetadata, detectOpaqueRegions, fontGlyphCoverage, packAtlasDeterministic, polygonOutlineForRegion, provenanceDiagnostics, revertToVerifiedArtifact, validateContentClosure } from '../assets/assetProduction'
import { contentThumbnailDataUrl } from '../assets/contentLibrary26'
import { applyAudioImportProfile, applyTextureImportProfile, normalizedFontFallbacks } from '../assets/importProfiles'
import { exportProjectFolder } from '../assets/projectFolder'
import { DEFAULT_SCRIPT_SOURCE } from '../editor/scriptTemplates'
import { openScriptAsset } from '../editor/scriptStudioState'
import { defaultVisualGraph } from '../visual/graphCatalog'
import { openEventSheetAsset, openGraphAsset } from '../visual/graphStudioState'
import { serializeGraphDocument } from '../visual/graphTypes'
import { applyEditorWorkspace, reorderBottomTab, workspaceState } from '../editor/workspaces'
import { instantiatePrefab, replaceEntitiesWithPrefab } from '../runtime/prefabs'
import { createSceneAssetFromEntities, instantiateSceneAsset } from '../runtime/sceneInstances'
import { reimportAnimationClip } from '../runtime/animation'
import ContentAssetInspector from './ContentAssetInspector.vue'
import { buildAssetDependencyGraph, explainAssetBuildInclusion, findAssetReferences, repairMissingAssetReference, unusedAssetReport } from '../assets/assetGraph'
import { cancelAssetImport, importPipelineState } from '../assets/importPipeline'
import { sourceStatusFor } from '../runtime/teamWorkflow'
import { moveAssetToProjectTrash } from '../runtime/projectTrash'
import { projectScopeDirty } from '../runtime/projectTransactions'
import { pluginRuntime, pluginState } from '../runtime/plugins'
import { createResourceAsset, type ResourceKind } from '../runtime/resources'

// Bottom tools are substantial, mutually exclusive workspaces. Loading the
// inactive tools only when selected reduces cold-start parsing without changing
// a control, animation, or persisted panel state.
const AnimationPanel = defineAsyncComponent(() => import('./AnimationPanel.vue'))
const AudioSystemPanel = defineAsyncComponent(() => import('./AudioSystemPanel.vue'))
const ConsolePanel = defineAsyncComponent(() => import('./ConsolePanel.vue'))
const ProfilerPanel = defineAsyncComponent(() => import('./ProfilerPanel.vue'))
const NetworkStudioPanel = defineAsyncComponent(() => import('./NetworkStudioPanel.vue'))
const EcosystemStudioPanel = defineAsyncComponent(() => import('./EcosystemStudioPanel.vue'))
const TilemapPanel = defineAsyncComponent(() => import('./TilemapPanel.vue'))
const WorldToolsPanel = defineAsyncComponent(() => import('./WorldToolsPanel.vue'))

const permanentTabs = [
  { id: 'assets' as const, label: 'assets' as const }, { id: 'console' as const, label: 'console' as const },
  { id: 'animation' as const, label: 'animation' as const }, { id: 'audio' as const, label: 'audioMixer' as const }, { id: 'worldProduction' as const, label: 'worldStudio' as const }, { id: 'networkStudio' as const, label: 'networkStudio' as const }, { id: 'ecosystem' as const, label: 'ecosystemStudio' as const }, { id: 'profiler' as const, label: 'profiler' as const }
]
const pluginAssetContributions = computed(() => pluginState.contributions.filter(item => item.kind === 'importers' || item.kind === 'assetEditors'))
const tabs = computed(() => {
  const selected = state.world.entities.find(entity => entity.id === state.selectedEntityId)
  const contextual = selected?.hasComponent('TileMap2D') ? [{ id: 'tilemap' as const, label: 'tilemap' as const }] : []
  const available = [...permanentTabs, ...contextual]
  return [...available].sort((a, b) => workspaceState.bottomTabOrder.indexOf(a.id) - workspaceState.bottomTabOrder.indexOf(b.id))
})
const assetFilters: Array<{ type: AssetType | 'all'; label: Parameters<typeof t>[0] }> = [
  { type: 'all', label: 'allAssets' }, { type: 'image', label: 'images' }, { type: 'audio', label: 'audioAssets' },
  { type: 'font', label: 'fontAssets' }, { type: 'scene', label: 'scenes' }, { type: 'prefab', label: 'prefabs' },
  { type: 'script', label: 'scripts' }, { type: 'material', label: 'materials' }, { type: 'animation', label: 'animations' },
  { type: 'visualScript', label: 'visualGraphs' },
  { type: 'controller', label: 'controllers' }, { type: 'animationMask', label: 'animationMasks' }, { type: 'rig', label: 'rigs' },
  { type: 'skin', label: 'skins' }, { type: 'timeline', label: 'timelines' }, { type: 'tileset', label: 'tileSets' }, { type: 'atlas', label: 'atlases' },
  { type: 'shader', label: 'shaders' }, { type: 'localization', label: 'localizationFiles' }, { type: 'uiTheme', label: 'uiThemes' },
  { type: 'dataSchema', label: 'dataSchema' }, { type: 'dataTable', label: 'dataTable' }, { type: 'resource', label: 'sharedResources' }, { type: 'replay', label: 'replayAssets' }, { type: 'path', label: 'pathAssets' }, { type: 'other', label: 'otherAssets' }
]
const resourceKinds:ResourceKind[]=['Material','AnimationLibrary','InputMap','PhysicsMaterial','Theme','DataTable']
const compressionPlatforms = ['windows', 'linux', 'macos', 'web'] as const
const pivotPresets = [
  { id: 'top-left', label: 'pivotTopLeft', value: { x: 0, y: 0 } }, { id: 'top', label: 'pivotTop', value: { x: .5, y: 0 } }, { id: 'top-right', label: 'pivotTopRight', value: { x: 1, y: 0 } },
  { id: 'left', label: 'pivotLeft', value: { x: 0, y: .5 } }, { id: 'center', label: 'center', value: { x: .5, y: .5 } }, { id: 'right', label: 'pivotRight', value: { x: 1, y: .5 } },
  { id: 'bottom-left', label: 'pivotBottomLeft', value: { x: 0, y: 1 } }, { id: 'bottom', label: 'pivotBottom', value: { x: .5, y: 1 } }, { id: 'bottom-right', label: 'pivotBottomRight', value: { x: 1, y: 1 } }
] as const
const panelStyle = computed(() => ({ height: estate.bottomPanelOpen ? `min(${estate.bottomPanelHeight}px, 42vh)` : '34px' }))
const assetGrid = ref<HTMLElement | null>(null)
const assetScrollTop = ref(0)
const assetViewportHeight = ref(320)
const assetViewportWidth = ref(800)
const assetOverscanRows = 4
const filteredAssetRecords = computed(() => { void assets.generation; return filteredAssets() })
const filteredAssetCount = computed(() => filteredAssetRecords.value.length)
const assetColumnCount = computed(() => assets.viewMode === 'list' ? 1 : Math.max(1, Math.floor((Math.max(118, assetViewportWidth.value - 18) + 7) / (Math.max(118, assets.thumbnailSize) + 7))))
const assetRowStride = computed(() => assets.viewMode === 'list' ? 56 : 65)
const assetStartRow = computed(() => Math.max(0, Math.floor(assetScrollTop.value / assetRowStride.value) - assetOverscanRows))
const assetVisibleRows = computed(() => Math.max(1, Math.ceil(assetViewportHeight.value / assetRowStride.value) + assetOverscanRows * 2))
const assetWindowStart = computed(() => Math.min(filteredAssetCount.value, assetStartRow.value * assetColumnCount.value))
const assetWindowEnd = computed(() => Math.min(filteredAssetCount.value, assetWindowStart.value + assetVisibleRows.value * assetColumnCount.value))
const displayedAssets = computed(() => filteredAssetRecords.value.slice(assetWindowStart.value, assetWindowEnd.value))
const assetTotalRows = computed(() => Math.ceil(filteredAssetCount.value / assetColumnCount.value))
const assetGridStyle = computed(() => ({
  '--asset-size': `${assets.thumbnailSize}px`,
  paddingTop: `${9 + assetStartRow.value * assetRowStride.value}px`,
  paddingBottom: `${9 + Math.max(0, assetTotalRows.value - Math.ceil(assetWindowEnd.value / assetColumnCount.value)) * assetRowStride.value}px`
}))
const visibleFolders = computed(() => assets.folders.filter(folder => !folder.startsWith('.nova/')))
const selectedAsset = computed(() => assets.records.find(asset => asset.uuid === assets.selectedGuid) ?? null)
const projectSnapshot = computed(() => { void assets.generation; try { return JSON.parse(getSceneJSON()) as unknown } catch { return null } })
const assetGraph = computed(() => buildAssetDependencyGraph(assets.records, projectSnapshot.value))
const productionGraph = computed(() => buildProductionAssetGraph(assets.records, projectSnapshot.value))
const selectedReferences = computed(() => selectedAsset.value ? findAssetReferences(selectedAsset.value.uuid, assets.records, projectSnapshot.value) : [])
const selectedInclusion = computed(() => selectedAsset.value ? explainAssetBuildInclusion(selectedAsset.value.uuid, assets.records, projectSnapshot.value) : [])
const selectedTextSource = computed(() => selectedAsset.value ? readTextAsset(selectedAsset.value.uuid) ?? '' : '')
const importJobs = computed(() => importPipelineState.jobs)
const externalChanges = computed(() => importPipelineState.externalChanges)
const missingReferenceIds = computed(() => [...new Set(assetGraph.value.missingReferences.map(item => item.reference))])
const animationSources = computed(() => assets.records.filter(asset => asset.assetType === 'animation' && asset.uuid !== selectedAsset.value?.uuid))
const assetInput = ref<HTMLInputElement | null>(null)
const reimportInput = ref<HTMLInputElement | null>(null)
const assetOverflow = ref<HTMLDetailsElement | null>(null)
const creatingFolder = ref(false), newFolderName = ref('')
const renamingGuid = ref<string | null>(null), renameValue = ref('')
const repairMode = ref(false), selectedMissingReference = ref(''), replacementAssetGuid = ref('')
const filterMenuOpen = ref(false), filterQuery = ref(''), savedFilterName = ref(''), presetName = ref(''), collectionName = ref('')
const importerTabs = ['source', 'import', 'dependencies', 'provenance', 'platform'] as const
const inspectorTab = ref<(typeof importerTabs)[number]>('source')
const previousPipeline = ref<AssetPipelineMetadata | null>(null), importComparisonText = ref('')
const draggedTab = ref<(typeof permanentTabs)[number]['id'] | 'tilemap' | null>(null)
const filteredTypeFilters = computed(() => assetFilters.filter(filter => t(filter.label).toLowerCase().includes(filterQuery.value.trim().toLowerCase())))
const activeFilterLabel = computed(() => t(assetFilters.find(filter => filter.type === assets.typeFilter)?.label ?? 'allAssets'))
const compatibleImportPresets = computed(() => selectedAsset.value ? assets.importPresets.filter(preset => preset.assetType === 'all' || preset.assetType === selectedAsset.value?.assetType) : [])
const selectedAssetTags = computed({ get: () => selectedAsset.value?.tags?.join(', ') ?? '', set: value => { if (selectedAsset.value) selectedAsset.value.tags = [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))].sort().slice(0, 64) } })
const selectedProvenanceDiagnostics = computed(() => selectedAsset.value ? provenanceDiagnostics(selectedAsset.value) : [])
const selectedGlyphReport = computed(() => selectedAsset.value?.assetType === 'font' ? fontGlyphCoverage(selectedAsset.value) : [])
const selectedContentClosure = computed(() => selectedAsset.value ? buildContentClosure(assets.records, assets.contentGroups, [selectedAsset.value.uuid], projectSnapshot.value) : [])
const selectedClosureIssues = computed(() => validateContentClosure(selectedContentClosure.value))
const selectedAtlasReport = computed(() => {
  const asset = selectedAsset.value
  if (asset?.assetType !== 'atlas') return null
  const group = asset.settings.atlasSettings.group || 'default'
  return packAtlasDeterministic(assets.records.filter(candidate => candidate.assetType === 'image' && candidate.settings.atlas && (candidate.settings.atlasSettings.group || 'default') === group).map(candidate => ({ uuid: candidate.uuid, width: candidate.width, height: candidate.height, group })), { maxSize: asset.settings.atlasSettings.maxSize, padding: asset.settings.atlasSettings.padding, rotationPolicy: asset.settings.atlasSettings.rotationPolicy })
})
watch(() => [assets.search, assets.currentFolder, assets.typeFilter, assets.tagFilter, assets.selectedCollectionId, assets.favoritesOnly, assets.viewMode, assets.thumbnailSize], () => {
  assetScrollTop.value = 0
  if (assetGrid.value) assetGrid.value.scrollTop = 0
})
let assetResizeObserver: ResizeObserver | null = null
onMounted(() => {
  const update = () => {
    if (!assetGrid.value) return
    assetViewportHeight.value = Math.max(1, assetGrid.value.clientHeight)
    assetViewportWidth.value = Math.max(1, assetGrid.value.clientWidth)
  }
  update()
  if (typeof ResizeObserver !== 'undefined') { assetResizeObserver = new ResizeObserver(update); if (assetGrid.value) assetResizeObserver.observe(assetGrid.value) }
})
onBeforeUnmount(() => assetResizeObserver?.disconnect())
function clonePipelineMetadata(value: AssetPipelineMetadata | undefined): AssetPipelineMetadata | null {
  // Asset records are exposed through Vue's reactive database. The import
  // metadata itself is JSON-owned project data, so clone it across that
  // boundary without handing a Proxy to the browser structured-clone API.
  return value ? JSON.parse(JSON.stringify(value)) as AssetPipelineMetadata : null
}
watch(() => selectedAsset.value?.uuid, () => { inspectorTab.value = 'source'; importComparisonText.value = ''; previousPipeline.value = clonePipelineMetadata(selectedAsset.value?.pipeline) })
function openTab(id: (typeof permanentTabs)[number]['id'] | 'tilemap') { estate.bottomPanelTab = id; estate.bottomPanelOpen = true }
function tabDirty(id:(typeof permanentTabs)[number]['id']|'tilemap'){return id==='assets'?projectScopeDirty('asset'):id==='animation'?projectScopeDirty('animation'):id==='audio'?projectScopeDirty('settings'):id==='tilemap'?projectScopeDirty('scene'):false}
function dropTab(target: (typeof permanentTabs)[number]['id'] | 'tilemap') {
  if (draggedTab.value) reorderBottomTab(draggedTab.value, target)
  draggedTab.value = null
}
function autoHide() {
  if (!estate.bottomPanelPinned && !document.activeElement?.closest('.bottom-panel')) estate.bottomPanelOpen = false
}
async function importFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length) return
  const imported = await importAssetFiles(input.files, assets.currentFolder === 'Assets' ? undefined : assets.currentFolder)
  if (imported.length) {
    const latest = imported[imported.length - 1]
    assets.selectedGuid = latest.uuid
    assets.currentFolder = latest.path.slice(0, latest.path.lastIndexOf('/'))
    pushHistory('Import assets')
    addEditorLog(t('assetsImported', { count: imported.length }), 'Assets')
  }
  input.value = ''
}
function dragAsset(event: DragEvent, guid: string) { event.dataTransfer?.setData('application/x-nova-asset-guid', guid); if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copyMove' }
async function dropOnFolder(event: DragEvent, folder: string) {
  const guid = event.dataTransfer?.getData('application/x-nova-asset-guid'), asset = assets.records.find(record => record.uuid === guid)
  if (!guid || !asset || asset.path.startsWith('.nova/')) return
  const references = findAssetReferences(guid, assets.records, projectSnapshot.value)
  const approved = await requestConfirmation({ title: t('moveAssetPreview'), message: `${asset.path}\n→ ${folder}/${asset.name}\n\n${t('referencesPreserved', { count: references.length })}\n${references.slice(0,8).map(referenceName).join('\n')}`, confirmLabel: t('moveAsset'), cancelLabel: t('cancel'), destructive: false })
  if (approved && moveAsset(guid, folder)) { pushHistory('Move asset'); addEditorLog(t('assetMoved'), 'Assets') }
}
function createFolder() { if (createAssetFolder(assets.currentFolder, newFolderName.value)) { addEditorLog(t('folderCreated'), 'Assets'); newFolderName.value = ''; creatingFolder.value = false; pushHistory('Create asset folder') } }
function createScriptAsset() {
  const asset = createTextAsset(t('newScriptName'), 'script', DEFAULT_SCRIPT_SOURCE, 'Assets/Scripts')
  assets.selectedGuid = asset.uuid
  pushHistory('Create script asset')
  addEditorLog(t('scriptCreated', { name: asset.name }), 'Assets')
}
function createVisualGraphAsset() {
  const graph = defaultVisualGraph(t('newVisualGraph'))
  const asset = createTextAsset(t('newVisualGraph'), 'visualScript', serializeGraphDocument(graph), 'Assets/Visual Scripts')
  assets.selectedGuid = asset.uuid
  pushHistory('Create visual graph asset')
  addEditorLog(t('visualGraphCreated', { name: asset.name }), 'Assets')
  openInGraphStudio(asset.uuid)
}
function createSceneAssetFromSelection() {
  const reference = createSceneAssetFromEntities(state.selectedEntityIds, t('newSceneAssetName'))
  if (!reference) return
  assets.selectedGuid = reference.slice('asset://'.length)
  assets.currentFolder = 'Assets/Scenes'
  addEditorLog(t('sceneAssetCreated'), 'Assets')
}
function createSharedResource(kind:ResourceKind){const label=t(`resource_${kind}` as Parameters<typeof t>[0]),asset=createResourceAsset(kind,label);assets.selectedGuid=asset.uuid;assets.currentFolder=asset.path.slice(0,asset.path.lastIndexOf('/'));pushHistory('Create shared resource',`resource:${asset.uuid}`)}
function closeAssetOverflow(){assetOverflow.value?.removeAttribute('open')}
function openInScriptStudio(uuid: string) { openScriptAsset(uuid); applyEditorWorkspace('script') }
function openInGraphStudio(uuid: string) { openGraphAsset(uuid); applyEditorWorkspace('script') }
function openInEventSheetStudio(uuid: string) { openEventSheetAsset(uuid); applyEditorWorkspace('script') }
function openAnimationAsset(uuid:string){assets.selectedGuid=uuid;estate.bottomPanelTab='animation';estate.bottomPanelOpen=true;applyEditorWorkspace('animation')}
function openAssetEditor(uuid: string) {
  const asset = assets.records.find(record => record.uuid === uuid); if (!asset) return
  assets.selectedGuid = uuid
  if (asset.assetType === 'visualScript') { openInGraphStudio(uuid); return }
  if (asset.assetType === 'eventSheet') { openInEventSheetStudio(uuid); return }
  if (asset.assetType === 'script' || asset.assetType === 'shader') { openInScriptStudio(uuid); return }
  if (['animation','controller','animationMask','rig','skin','timeline'].includes(asset.assetType)) { openAnimationAsset(uuid); return }
  if (asset.assetType === 'audio') { estate.bottomPanelTab = 'audio'; return }
  inspectorTab.value = asset.assetType === 'image' || asset.assetType === 'font' || asset.assetType === 'atlas' || asset.assetType === 'tileset' ? 'import' : 'source'
}
function updateAssetWindow(event: Event) {
  const element = event.currentTarget as HTMLElement
  assetScrollTop.value = Math.max(0, element.scrollTop)
  assetViewportHeight.value = Math.max(1, element.clientHeight)
  assetViewportWidth.value = Math.max(1, element.clientWidth)
}
function createCollection() { const collection = createAssetCollection(collectionName.value); if (!collection) return; collectionName.value = ''; if (selectedAsset.value) toggleAssetInCollection(selectedAsset.value.uuid, collection.id); assets.generation++ }
function toggleSelectedCollection(collectionId: string) { if (!selectedAsset.value) return; toggleAssetInCollection(selectedAsset.value.uuid, collectionId); assets.generation++ }
function dismissTutorial() { const asset = selectedAsset.value; if (!asset || !asset.path.startsWith('Assets/Tutorials/')) return; deleteAsset(asset.uuid); assets.selectedGuid = null; addEditorLog(t('tutorialDismissed'), 'Project') }
async function copyAssetDetail(value: string) { try { await navigator.clipboard.writeText(value); estate.statusText = t('copied') } catch { estate.statusText = value } }
function instantiateSelectedPrefab() {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'prefab' || state.playMode !== 'editing') return
  const canvas = document.querySelector<HTMLElement>('.canvas-container')
  const rect = canvas?.getBoundingClientRect()
  const point = rect
    ? state.camera.screenToWorld({ x: rect.width / 2, y: rect.height / 2 })
    : { x: 0, y: 0 }
  const entities = instantiatePrefab(assetReference(asset.uuid), point)
  if (!entities.length) return
  pushHistory('Instantiate prefab')
  addEditorLog(t('prefabInstantiated', { name: asset.name }), 'Assets')
}
function replaceSelectionWithSelectedPrefab() {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'prefab' || state.playMode !== 'editing' || !state.selectedEntityIds.length) return
  const replacements = replaceEntitiesWithPrefab([...state.selectedEntityIds], assetReference(asset.uuid))
  if (replacements.length) addEditorLog(t('selectionReplacedWithPrefab', { count: replacements.length }), 'Assets')
}
function instantiateSelectedScene() {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'scene' || state.playMode !== 'editing') return
  const canvas = document.querySelector<HTMLElement>('.canvas-container')
  const rect = canvas?.getBoundingClientRect()
  const point = rect ? state.camera.screenToWorld({ x: rect.width / 2, y: rect.height / 2 }) : { x: 0, y: 0 }
  const entities = instantiateSceneAsset(assetReference(asset.uuid), point)
  if (!entities.length) return
  pushHistory('Instantiate scene')
  addEditorLog(t('sceneInstantiated', { name: asset.name }), 'Assets')
}
function startRename(guid: string, name: string) { renamingGuid.value = guid; renameValue.value = name; void nextTick(() => document.querySelector<HTMLInputElement>('.asset-grid article input')?.select()) }
async function commitRename() {
  const guid = renamingGuid.value, asset = assets.records.find(record => record.uuid === guid)
  if (!guid || !asset) return
  renamingGuid.value = null
  if (asset.path.startsWith('.nova/') || renameValue.value.trim() === asset.name) return
  const references = findAssetReferences(guid, assets.records, projectSnapshot.value)
  const approved = await requestConfirmation({ title: t('renameAssetPreview'), message: `${asset.name} → ${renameValue.value.trim()}\n\n${t('referencesPreserved', { count: references.length })}\n${references.slice(0,8).map(referenceName).join('\n')}`, confirmLabel: t('renameAsset'), cancelLabel: t('cancel'), destructive: false })
  if (approved && renameAsset(guid, renameValue.value)) { pushHistory('Rename asset'); addEditorLog(t('assetRenamed'), 'Assets') }
}
async function removeSelectedAsset() {
  const asset = selectedAsset.value
  if (!asset) return
  const referenceCount = countAssetReferences(asset.uuid)
  const owners = findAssetReferences(asset.uuid, assets.records, projectSnapshot.value)
  const approved = await requestConfirmation({ title: t('deleteAsset'), message: `${t('deleteAssetConfirm', { name: asset.name, count: referenceCount })}\n\n${owners.slice(0,12).map(referenceName).join('\n') || t('noReferences')}`, confirmLabel: t('deleteAsset'), cancelLabel: t('cancel'), destructive: true })
  if (!approved) return
  clearAssetReferences(asset.uuid)
  if (!moveAssetToProjectTrash(asset.uuid, referenceCount)) return
  pushHistory('Move asset to project trash', `asset:${asset.uuid}`, asset.path); addEditorLog(t('assetMovedToTrash'), 'Assets', 'warning')
}
function revealAsset() { const asset = selectedAsset.value; if (!asset) return; assets.currentFolder = asset.path.slice(0, asset.path.lastIndexOf('/')); estate.statusText = asset.path }
function setPixelArtMode(event: Event) { if (selectedAsset.value?.assetType === 'image') selectedAsset.value.settings.filterMode = (event.target as HTMLInputElement).checked ? 'Nearest' : 'Linear' }
function setTextureProfile(event: Event) { const asset = selectedAsset.value; if (asset?.assetType === 'image') applyTextureImportProfile(asset.settings, (event.target as HTMLSelectElement).value as TextureImportProfile) }
function setAudioProfile(event: Event) { const asset = selectedAsset.value; if (asset?.assetType === 'audio') applyAudioImportProfile(asset.settings, (event.target as HTMLSelectElement).value as AudioImportProfile) }
function setFontFallbacks(event: Event) { const asset = selectedAsset.value; if (asset?.assetType === 'font') asset.settings.fontSettings.fallbackFamilies = normalizedFontFallbacks((event.target as HTMLInputElement).value) }
function setOpenTypeFeatures(event: Event) { const asset = selectedAsset.value; if (asset?.assetType === 'font') asset.settings.fontSettings.openTypeFeatures = [...new Set((event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(value => /^[a-z0-9]{4}$/i.test(value)))].sort().slice(0, 64) }
function setDeclaredLanguages(event: Event) { const asset = selectedAsset.value; if (asset?.assetType === 'font') asset.settings.fontSettings.declaredLanguages = [...new Set((event.target as HTMLInputElement).value.split(',').map(value => value.trim()).filter(Boolean))].sort().slice(0, 64) }
function togglePlatformOverride(platform: typeof compressionPlatforms[number], event: Event) {
  const asset = selectedAsset.value; if (!asset) return
  if ((event.target as HTMLInputElement).checked) asset.settings.platformOverrides[platform] = { enabled: true, compression: asset.settings.platformVariants[platform] ?? asset.settings.compression, maxSize: asset.settings.atlasSettings.maxSize, format: 'Auto' }
  else delete asset.settings.platformOverrides[platform]
}
async function autoSliceSelectedImage() {
  const asset = selectedAsset.value; if (!asset || asset.assetType !== 'image') return
  try {
    const blob = await (await fetch(asset.source)).blob(), bitmap = await createImageBitmap(blob), canvas = document.createElement('canvas')
    canvas.width = bitmap.width; canvas.height = bitmap.height
    const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) throw new Error('2D canvas is unavailable')
    context.drawImage(bitmap, 0, 0); bitmap.close()
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data, alpha = new Uint8Array(canvas.width * canvas.height)
    for (let index = 0; index < alpha.length; index++) alpha[index] = rgba[index * 4 + 3]
    const regions = detectOpaqueRegions(canvas.width, canvas.height, alpha).slice(0, 4096)
    asset.settings.extractedAnimationFrames = regions
    if (regions[0]) { asset.settings.spriteRegion = regions[0]; asset.settings.polygonOutline = polygonOutlineForRegion(regions[0]) }
    assets.generation++; pushHistory('Automatically slice sprite', `asset:${asset.uuid}`); addEditorLog(t('automaticSlicesCreated', { count: regions.length }), 'Assets', regions.length ? 'info' : 'warning')
  } catch (error) { addEditorLog(error instanceof Error ? error.message : String(error), 'Assets', 'error') }
}
function toggleSpriteRegion(event: Event) {
  const asset = selectedAsset.value
  if (!asset || asset.assetType !== 'image') return
  asset.settings.spriteRegion = (event.target as HTMLInputElement).checked
    ? { x: 0, y: 0, width: Math.max(1, asset.width), height: Math.max(1, asset.height) }
    : null
}
function assetSettingsChanged() { queueTextureAtlasRebuild(); pushHistory('Change import settings', `asset:${selectedAsset.value?.uuid}`) }
function reimportAnimation() {
  const asset = selectedAsset.value
  if (!asset?.animationImport) return
  if (!reimportAnimationClip(asset)) { addEditorLog(t('animationReimportFailed'), 'Assets', 'error'); return }
  assets.generation++
  pushHistory('Reimport animation', `asset:${asset.uuid}`)
  addEditorLog(t('animationReimported', { name: asset.name }), 'Assets')
}
function applyPivotPreset(id: string) { const asset = selectedAsset.value, preset = pivotPresets.find(candidate => candidate.id === id); if (!asset || !preset) return; asset.settings.pivot = { ...preset.value }; pushHistory('Set sprite pivot preset', `asset:${asset.uuid}`) }
async function trimSelectedImage() { const asset = selectedAsset.value; if (!asset) return; if (await trimTransparentImage(asset)) { pushHistory('Trim transparent sprite', `asset:${asset.uuid}`); addEditorLog(t('transparentTrimApplied'), 'Assets') } }
function sliceSelectedSheet() { const asset = selectedAsset.value; if (!asset) return; const generated = sliceSpriteSheet(asset); if (generated.length) { assets.selectedGuid = generated[0].uuid; pushHistory('Slice sprite sheet'); addEditorLog(t('spriteSlicesCreated', { count: generated.length }), 'Assets') } }
async function reimportSelectedAsset(event: Event) {
  const input = event.target as HTMLInputElement, file = input.files?.[0]; input.value = ''
  const asset = selectedAsset.value
  if (!asset || !file) return
  previousPipeline.value = clonePipelineMetadata(asset.pipeline)
  const success = await reimportAsset(asset.uuid, file)
  addEditorLog(t(success ? 'assetReimported' : 'assetReimportFailed', { name: asset.name }), 'Assets', success ? 'info' : 'error')
  if (success) pushHistory('Reimport asset', `asset:${asset.uuid}`)
}
function compareSelectedImport() { const current = selectedAsset.value?.pipeline; importComparisonText.value = compareImportMetadata(previousPipeline.value, current).map(row => `${row.changed ? '●' : '○'} ${row.field}: ${row.before || '—'} → ${row.after || '—'}`).join('\n') }
function revertSelectedImport() { const asset = selectedAsset.value; if (!asset || !revertToVerifiedArtifact(asset)) { addEditorLog(t('noVerifiedArtifact'), 'Assets', 'warning'); return } assets.generation++; importComparisonText.value = ''; addEditorLog(t('importReverted'), 'Assets') }
async function batchReimportVisible() {
  const candidates = filteredAssetRecords.value.filter(asset => asset.pipeline && /^(data:|blob:)/.test(asset.source)).slice(0, 2000); let complete = 0, failed = 0
  for (const asset of candidates) { try { const response = await fetch(asset.source), blob = await response.blob(), file = new File([blob], asset.name, { type: asset.mimeType, lastModified: asset.sourceModified }); if (await reimportAsset(asset.uuid, file)) complete++; else failed++ } catch { failed++ } }
  addEditorLog(t('batchReimportComplete', { complete, failed }), 'Assets', failed ? 'warning' : 'info')
}
async function bulkApplyVisible() {
  const source = selectedAsset.value
  if (!source || !filteredAssetRecords.value.length) return
  const approved = await requestConfirmation({ title: t('bulkApplyVisible'), message: t('bulkApplyVisibleConfirm', { count: filteredAssetRecords.value.length }), confirmLabel: t('apply'), cancelLabel: t('cancel'), destructive: false })
  if (!approved) return
  const count = applyBulkAssetSettings(filteredAssetRecords.value, { contentGroup: source.contentGroup, editorOnly: source.editorOnly, tags: source.tags, collectionIds: source.collectionIds })
  assets.generation++; pushHistory('Bulk edit asset production metadata'); addEditorLog(t('bulkApplyComplete', { count }), 'Assets')
}
function reportUnusedAssets() {
  const unused = unusedAssetReport(assets.records, projectSnapshot.value)
  addEditorLog(unused.length ? t('unusedAssetsFound', { count: unused.length, names: unused.slice(0, 12).map(asset => asset.name).join(', ') }) : t('noUnusedAssets'), 'Assets', unused.length ? 'warning' : 'info')
}
function openMissingRepair() {
  const missing = assetGraph.value.missingReferences
  repairMode.value = missing.length > 0
  selectedMissingReference.value = missing[0]?.reference ?? ''
  replacementAssetGuid.value = ''
  addEditorLog(missing.length ? t('missingReferencesFound', { count: missing.length, names: missing.slice(0, 12).map(item => item.reference).join(', ') }) : t('noMissingReferences'), 'Assets', missing.length ? 'error' : 'info')
}
function repairSelectedMissingReference() {
  if (!selectedMissingReference.value || !replacementAssetGuid.value) return
  const projectChanges = replaceAssetReferences(selectedMissingReference.value, replacementAssetGuid.value)
  const assetChanges = repairMissingAssetReference(assets.records, selectedMissingReference.value, replacementAssetGuid.value)
  if (assetChanges) assets.generation++
  const count = projectChanges + assetChanges
  pushHistory('Repair missing asset reference')
  addEditorLog(t('missingReferenceRepaired', { count }), 'Assets', count ? 'info' : 'warning')
  selectedMissingReference.value = missingReferenceIds.value[0] ?? ''
  replacementAssetGuid.value = ''
  repairMode.value = missingReferenceIds.value.length > 0
}
function referenceName(owner: string): string { return owner === 'project' ? t('project') : assets.records.find(asset => asset.uuid === owner)?.path ?? owner }
function navigateAssetReference(guid: string) { const asset = assets.records.find(candidate => candidate.uuid === guid); if (!asset) return; assets.selectedGuid = asset.uuid; const separator = asset.path.lastIndexOf('/'); assets.currentFolder = separator > 0 ? asset.path.slice(0, separator) : 'Assets' }
function saveFilter() { const saved = saveCurrentAssetFilter(savedFilterName.value); if (saved) { savedFilterName.value = ''; addEditorLog(t('filterSaved', { name: saved.name }), 'Assets') } }
function applySavedFilter(id: string) { if (id) applyAssetFilter(id) }
function saveSelectedPreset() { const asset = selectedAsset.value; if (!asset) return; const preset = saveImportPreset(presetName.value, asset.assetType, asset.settings); if (preset) { presetName.value = ''; addEditorLog(t('presetSaved', { name: preset.name }), 'Assets') } }
function applySelectedPreset(id: string) { const asset = selectedAsset.value; if (asset && id && applyImportPreset(id, asset)) { pushHistory('Apply import preset', `asset:${asset.uuid}`); addEditorLog(t('presetApplied'), 'Assets') } }
async function linkSelectedSource() { const asset = selectedAsset.value; if (!asset) return; const result = await linkAssetSource(asset.uuid); estate.statusText = t(result === 'linked' ? 'sourceLinked' : result === 'unsupported' ? 'sourceLinkUnsupported' : 'saveCancelled') }
async function resolveExternal(id: string, choice: 'reimport' | 'keep' | 'duplicate') { if (await resolveExternalAssetChange(id, choice)) addEditorLog(t('externalChangeResolved'), 'Assets') }
async function retryImport(id: number) { const asset = await retryFailedAssetImport(id, assets.currentFolder); addEditorLog(t(asset ? 'assetReimported' : 'assetReimportFailed', { name: asset?.name ?? '' }), 'Assets', asset ? 'info' : 'error') }
async function exportFolder() {
  try {
    const result = await exportProjectFolder(getSceneJSON(), assets.records, assets.folders)
    estate.statusText = t(result === 'saved' ? 'projectFolderExported' : result === 'unsupported' ? 'projectFolderUnsupported' : 'saveCancelled')
    if (result === 'saved') addEditorLog(t('projectFolderExported'), 'Project')
  } catch (error) {
    estate.statusText = t('projectFolderFailed', { message: error instanceof Error ? error.message : t('unknownError') })
    addEditorLog(estate.statusText, 'Project', 'error')
  }
}
function assetIcon(type: AssetType): string { return type === 'audio' ? '♫' : type === 'font' ? 'Aa' : type === 'scene' ? '◇' : type === 'prefab' ? '⬡' : type === 'visualScript' ? '⌘' : type === 'animation' ? '▶' : type === 'controller' ? '⌘' : type === 'animationMask' ? '◐' : type === 'rig' ? '◍' : type === 'skin' ? '▧' : type === 'timeline' ? '⏱' : type === 'material' ? '◩' : '◆' }
function formatBytes(value: number): string { return value < 1024 ? `${value} B` : value < 1024 ** 2 ? `${(value / 1024).toFixed(1)} KB` : `${(value / 1024 ** 2).toFixed(1)} MB` }
function assetSourceStatus(uuid: string) { return sourceStatusFor(uuid) }

let startY = 0, startHeight = 0
function startResize(event: MouseEvent) { startY = event.clientY; startHeight = estate.bottomPanelHeight; document.addEventListener('mousemove', resizePanel); document.addEventListener('mouseup', stopResize); document.body.style.cursor = 'ns-resize' }
function resizePanel(event: MouseEvent) { estate.bottomPanelHeight = Math.min(520, Math.max(120, startHeight + startY - event.clientY)) }
function stopResize() { document.removeEventListener('mousemove', resizePanel); document.removeEventListener('mouseup', stopResize); document.body.style.cursor = 'default' }
onBeforeUnmount(stopResize)
</script>

<style scoped>
.asset-inspector label.region-field { padding: 6px 0; flex-direction: column; align-items: stretch; }.asset-inspector label.region-field > div { max-width: none; }.asset-inspector label.region-field input { width: 25%; min-width: 0; }
.bottom-panel { position: relative; flex: 0 0 auto; min-height: 34px; display: flex; flex-direction: column; border-top: 1px solid var(--border-subtle); background: var(--surface-1); container-type: inline-size; }
.resize-handle { position: absolute; inset: -4px 0 auto; height: 8px; cursor: ns-resize; z-index: 5; }
.panel-tabs { min-height: 34px; flex: 0 0 auto; padding: 3px 5px; display: flex; align-items: center; flex-wrap: wrap; gap: 2px; overflow: hidden; border-bottom: 1px solid var(--border-subtle); }
.panel-tabs span { min-width: 4px; flex: 1; }.panel-tabs button { height: 29px; padding: 0 clamp(7px, .9vw, 12px); flex: 0 1 auto; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; font-size: clamp(10px, .82vw, 12px); white-space: nowrap; word-break: keep-all; writing-mode: horizontal-tb; }.panel-tabs button:hover, .panel-tabs button.active { color: var(--text-primary); background: var(--surface-hover); }.panel-tabs button.active { color: var(--accent); }
.compact-tab-select{display:none;width:min(240px,calc(100% - 76px));min-height:28px;height:28px;padding-block:2px}
@container(max-width:760px){.panel-tabs{flex-wrap:nowrap}.panel-tabs .panel-tab{display:none}.compact-tab-select{display:block}.panel-tabs>span{display:block}}
.panel-content { flex: 1; min-width: 0; min-height: 0; overflow: hidden; }.asset-browser { height: 100%; min-height: 120px; display: grid; grid-template-columns: minmax(145px,18%) minmax(180px,1fr); overflow: hidden; }.asset-browser.inspecting { grid-template-columns: minmax(145px,18%) minmax(160px,1fr) minmax(205px,25%); }.folder-tree, .asset-inspector { min-height: 0; padding: 9px; overflow: auto; background: var(--surface-2); }.folder-tree { border-right: 1px solid var(--border-subtle); }.folder-tree strong { display: block; padding: 3px 7px 8px; color: var(--text-muted); font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }.folder-tree button { width: 100%; min-width:0; min-height: 29px; padding: 0 7px; display: flex; align-items: center; gap: 5px; overflow:hidden; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; font-size: 12px; text-align: left; text-overflow:ellipsis; white-space:nowrap; }.folder-tree button span{flex:0 0 auto}.folder-tree button.active, .folder-tree button:hover { color: var(--accent); background: var(--accent-soft); }
.asset-workspace { position: relative; min-width: 0; overflow: hidden; display: flex; flex-direction: column; }.asset-toolbar { min-height: 86px; padding: 6px 8px; display: grid; grid-template-columns:minmax(0,1fr) auto; gap: 5px; overflow: visible; border-bottom: 1px solid var(--border-subtle); }.asset-actions-row, .asset-filters { min-width: 0; display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }.asset-actions-row{grid-column:1/-1}.asset-toolbar button { height: 31px; padding: 0 8px; flex: 0 0 auto; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-2); font-size: 11px; white-space: nowrap; word-break: keep-all; writing-mode: horizontal-tb; }.asset-toolbar button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }.asset-toolbar .path { min-width: 45px; flex: 1 1 80px; overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.asset-toolbar input { width: 140px; min-width: 100px; min-height: 31px; flex: 0 1 140px; font-size: 11px; }.asset-toolbar .folder-input { width: 105px; }.asset-filters button { height: 25px; padding-inline: 8px; border-radius: 999px; font-size: 11px; }.asset-filters button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 65%, var(--border-subtle)); background: var(--accent-soft); }.asset-diagnostics{display:flex;align-items:center;gap:4px}.asset-diagnostics button{height:25px;font-size:11px}.asset-diagnostics span{color:var(--danger)}.asset-diagnostics .atlas-error{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.import-queue{position:absolute;z-index:6;top:87px;right:8px;width:min(360px,calc(100% - 16px));padding:6px;display:grid;gap:4px;border:1px solid var(--border-strong);border-radius:9px;background:var(--surface-1);box-shadow:var(--shadow-md)}.import-queue article{min-width:0;display:grid;grid-template-columns:minmax(80px,1fr) 90px auto;align-items:center;gap:6px}.import-queue article>span{min-width:0;display:grid}.import-queue strong,.import-queue small,.import-queue em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.import-queue small,.import-queue em{color:var(--text-muted);font-size:11px}.import-queue progress{width:100%;accent-color:var(--accent)}.import-queue button{min-height:25px}
.missing-repair{margin:7px 8px 0;padding:6px;display:flex;align-items:center;gap:6px;border:1px solid var(--warning);border-radius:8px;background:color-mix(in srgb,var(--warning) 7%,var(--surface-2));font-size:11px}.missing-repair strong{flex:0 0 auto}.missing-repair select{min-width:0;min-height:28px;flex:1;font-size:11px}.missing-repair button{min-height:28px;padding:0 8px;white-space:nowrap}.missing-repair button.primary{color:var(--accent-contrast);border-color:var(--accent);background:var(--accent)}
.asset-grid { min-height: 0; flex: 1; padding: 9px; display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); grid-auto-rows: 58px; gap: 7px; overflow: auto; }.asset-grid article { position: relative; min-width: 0; padding: 7px; display: grid; grid-template-columns: 42px 1fr; grid-template-rows: 1fr 1fr; column-gap: 7px; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-2); cursor: grab; }.asset-grid article:hover, .asset-grid article.selected { border-color: color-mix(in srgb, var(--accent) 60%, var(--border-subtle)); background: var(--accent-soft); }.asset-preview { grid-row: 1 / 3; width: 42px; height: 42px; border-radius: 7px; background-color: var(--surface-3); background-position: center; background-repeat: no-repeat; background-size: cover; }.asset-icon { display: grid; place-items: center; color: white; font-size: 17px; font-weight: 750; }.asset-icon i{display:grid;place-items:center;width:23px;height:23px;border-radius:7px;background:color-mix(in srgb,var(--surface-1) 62%,transparent);box-shadow:0 3px 10px rgba(0,0,0,.2);font-style:normal;backdrop-filter:blur(5px)}.asset-grid strong, .asset-grid small, .asset-grid input { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.asset-grid strong { align-self: end; font-size: 11px; }.asset-grid small { color: var(--text-muted); font-size:11px; }.asset-grid input { width: 100%; height: 22px; min-height: 22px; font-size:11px; }.source-badge{position:absolute;top:4px;right:4px;width:18px;height:18px;display:grid;place-items:center;border-radius:5px;font-size:11px;font-weight:750;box-shadow:0 2px 8px rgba(0,0,0,.2)}.source-badge.added{color:var(--success);background:color-mix(in srgb,var(--success) 18%,var(--surface-1))}.source-badge.modified{color:var(--warning);background:color-mix(in srgb,var(--warning) 18%,var(--surface-1))}.source-badge.deleted,.source-badge.conflict{color:var(--danger);background:color-mix(in srgb,var(--danger) 18%,var(--surface-1))}
.asset-inspector { border-left: 1px solid var(--border-subtle); }.asset-inspector header { padding: 2px 2px 8px; display: flex; flex-direction: column; gap: 2px; }.asset-inspector header span { color: var(--accent); font-size:11px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; }.asset-inspector header strong { overflow: hidden; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.large-preview { width: 100%; aspect-ratio: 16 / 9; margin-bottom: 7px; border: 1px solid var(--border-subtle); border-radius: 8px; background-color: var(--surface-3); background-position: center; background-repeat: no-repeat; background-size: contain; }.asset-media-preview{width:100%;height:34px;margin-bottom:7px}.font-preview{min-height:60px;margin-bottom:7px;padding:10px;display:grid;place-items:center;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3);font-size:20px}.asset-inspector label { min-height: 29px; display: flex; align-items: center; justify-content: space-between; gap: 7px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; }.asset-inspector label > *:last-child { max-width: 58%; }.asset-inspector label code { overflow: hidden; color: var(--accent); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }.asset-inspector label input:not([type='checkbox']), .asset-inspector label select { width: 105px; min-height: 24px; font-size:11px; }.asset-inspector label div { display: flex; gap: 3px; }.asset-inspector label div input { width: 50%; }.asset-actions { margin-top: 8px; display: flex; gap: 5px; }.asset-actions button { min-width:0;min-height:32px;padding:0 4px;flex:1;overflow:hidden;border:1px solid var(--border-subtle);border-radius:7px;color:var(--text-secondary);background:var(--surface-3);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.asset-actions button.danger { color: var(--danger); }.drag-hint { color: var(--text-muted); font-size:11px; line-height: 1.45; }.text-preview{width:100%;min-height:82px;margin:7px 0;resize:vertical;font:11px/1.45 var(--font-mono)}.pipeline-error{padding:6px;border:1px solid var(--danger);border-radius:7px;color:var(--danger);font-size:11px}.reference-summary{margin-top:8px;padding:7px;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-3)}.reference-summary strong{font-size:11px}.reference-summary p,.reference-summary li{margin:4px 0;color:var(--text-muted);font-size:11px;line-height:1.35}.reference-summary ul{margin:3px 0;padding-left:16px}
.asset-technical{margin:6px 0;border:1px solid var(--border-subtle);border-radius:var(--radius-control-small);background:var(--surface-3)}.asset-technical summary{padding:7px;cursor:pointer;color:var(--text-secondary);font-size:var(--type-caption)}.asset-technical>div{display:grid;grid-template-columns:minmax(70px,auto) minmax(0,1fr) 26px;align-items:center;gap:6px;padding:5px 7px;border-top:1px solid var(--border-subtle);font-size:var(--type-caption)}.asset-technical code{max-width:none!important;overflow:auto!important;white-space:nowrap!important;text-overflow:clip!important}.asset-technical button{width:24px;min-height:24px;padding:0;border:1px solid var(--border-subtle);border-radius:var(--radius-control-small);background:var(--surface-2);color:var(--text-secondary)}
.asset-overflow{position:relative;z-index:20}.asset-overflow>summary{width:34px;height:31px;display:grid;place-items:center;border:1px solid var(--border-subtle);border-radius:8px;background:var(--surface-2);cursor:pointer;list-style:none}.asset-overflow>summary::-webkit-details-marker{display:none}.asset-overflow[open]{filter:drop-shadow(var(--shadow-md))}.asset-overflow-menu{position:absolute;top:35px;right:0;z-index:30;width:clamp(190px,24vw,280px);max-height:min(260px,calc(42vh - 48px));padding:7px;display:grid;grid-template-columns:minmax(0,1fr);gap:4px;overflow-x:hidden;overflow-y:auto;overscroll-behavior:contain;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-popover);box-shadow:var(--shadow-md)}.asset-overflow-menu>strong{padding:5px 7px;color:var(--text-muted);font-size:11px;line-height:1.3}.asset-overflow-menu>button{width:100%;min-width:0;height:auto;min-height:31px;padding:6px 8px;overflow-wrap:anywhere;white-space:normal;text-align:left;background:var(--surface-2)}
.asset-actions-row>button.active{color:var(--accent);border-color:color-mix(in srgb,var(--accent) 55%,var(--border-subtle));background:var(--accent-soft)}
.asset-grid{grid-template-columns:repeat(auto-fill,minmax(var(--asset-size,112px),1fr))}.asset-grid.asset-list{display:flex;flex-direction:column;gap:4px}.asset-grid.asset-list article{min-height:52px;flex:0 0 52px;grid-template-columns:38px minmax(0,1fr) minmax(80px,auto);grid-template-rows:1fr}.asset-grid.asset-list .asset-preview{grid-row:1;width:36px;height:36px}.asset-grid.asset-list article>small{align-self:center;text-align:right}.asset-window-status{grid-column:1/-1;margin:0;padding:8px;color:var(--text-muted);font-size:var(--type-caption);text-align:center}
.importer-tabs{margin:0 0 8px;padding:3px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;border:1px solid var(--border-subtle);border-radius:11px;background:var(--surface-3)}.importer-tabs button{min-width:0;min-height:28px;padding:0 3px;overflow:hidden;border:0;border-radius:8px;background:transparent;color:var(--text-muted);font-size:var(--type-caption);text-overflow:ellipsis;white-space:nowrap}.importer-tabs button.active{color:var(--text-primary);background:var(--surface-raised);box-shadow:var(--shadow-xs)}.inspector-pane{animation:nova-panel-in var(--motion-panel) var(--ease-spring) both}.collection-membership{margin:7px 0;padding:7px;border:1px solid var(--border-subtle);border-radius:9px}.collection-membership summary{cursor:pointer;color:var(--text-secondary)}.collection-membership>button{width:100%;min-height:28px;margin-top:4px;display:flex;align-items:center;gap:6px;border:0;border-radius:7px;background:transparent;color:var(--text-muted)}.collection-membership>button.active{color:var(--accent);background:var(--accent-soft)}.collection-membership i{width:8px;height:8px;border-radius:50%}.collection-membership>div{margin-top:5px;display:grid;grid-template-columns:1fr 30px;gap:4px}.collection-membership input{width:100%!important;max-width:none!important}
.provenance-diagnostic{margin:4px 0;padding:7px;display:grid;gap:2px;border-left:3px solid var(--accent);border-radius:6px;background:var(--surface-3);font-size:var(--type-caption)}.provenance-diagnostic.warning{border-color:var(--warning)}.provenance-diagnostic.error{border-color:var(--danger)}.provenance-diagnostic span{overflow-wrap:anywhere;color:var(--text-muted)}.provenance-actions{display:grid;grid-template-columns:1fr 1fr;gap:5px}.provenance-actions button{min-height:30px}.provenance-pane pre{max-height:150px;overflow:auto;padding:7px;border-radius:7px;background:var(--surface-inset);font:var(--type-caption)/1.45 var(--font-mono);white-space:pre-wrap}.dangerText{color:var(--danger)}
.glyph-report{margin-top:8px;display:grid;gap:4px}.glyph-report article{padding:6px;display:grid;grid-template-columns:auto 1fr;gap:2px 7px;border:1px solid var(--border-subtle);border-radius:7px;background:var(--surface-3);font-size:var(--type-caption)}.glyph-report article.missing{border-color:color-mix(in srgb,var(--warning) 55%,var(--border-subtle))}.glyph-report small{grid-column:1/-1;color:var(--text-muted)}.platform-overrides>article{margin-bottom:7px;padding:7px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-3)}.platform-overrides>article>header{padding:0;flex-direction:row;align-items:center;justify-content:space-between}
.script-source { padding: 6px 0; flex-direction: column; align-items: stretch !important; }.script-source textarea { width: 100%; min-height: 130px; resize: vertical; font: 11px/1.5 var(--font-mono); white-space: pre; }.script-validation { margin: 5px 0; color: var(--success); font-size:11px; }.script-validation.error { color: var(--danger); }.save-script { width: 100%; min-height: 32px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent); background: var(--accent-soft); font-size:11px; }
.mapping-editor{margin:7px 0}.mapping-editor label{display:grid;grid-template-columns:1fr 1fr 24px}.mapping-editor input{width:100%!important}.mapping-editor button{min-height:26px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);color:var(--text-secondary)}
:global(html[lang='zh-CN']) .asset-toolbar, :global(html[lang='zh-CN']) .panel-tabs { line-height: 1; writing-mode: horizontal-tb; }
.console-list { min-width: 600px; font-family: var(--font-mono); font-size:11px; }.log-entry { min-height: 29px; padding: 4px 10px; display: grid; grid-template-columns: 72px 70px 1fr; gap: 8px; align-items: center; border-bottom: 1px solid var(--border-subtle); }.log-entry time { color: var(--text-muted); }.log-entry strong { color: var(--accent); }.log-entry.warning strong { color: var(--warning); }.log-entry.error strong { color: var(--danger); }
.metric-grid { padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(145px, 1fr)); gap: 8px; }.metric-grid article, .project-summary article { padding: 9px; display: flex; justify-content: space-between; gap: 10px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-2); font-size:11px; }.metric-grid span, .project-summary span { color: var(--text-muted); }.metric-grid strong, .project-summary strong { color: var(--accent); }.project-summary { height: 100%; padding: 10px; display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; overflow: auto; }.project-summary p { grid-column: 1 / -1; margin: 2px; color: var(--text-muted); font-size:11px; }.future-panel, .empty { padding: 18px; color: var(--text-muted); font-size: 11px; }.future-panel strong { color: var(--text-primary); }.future-panel p { margin: 5px 0 0; }
@media (max-width: 1050px) {
  .asset-browser { grid-template-columns: 105px minmax(140px, 1fr); }
  .asset-browser.inspecting { grid-template-columns: 105px minmax(140px, 1fr) 195px; }
  .folder-tree, .asset-inspector { padding: 6px; }
  .folder-tree button { padding-inline: 5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .asset-toolbar .path { flex-basis: 60px; }
  .asset-toolbar{grid-template-columns:1fr}.asset-diagnostics{grid-column:1}.asset-filters{max-height:58px;overflow:auto}.asset-inspector label>span:first-child{max-width:46%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .missing-repair{flex-wrap:wrap}.missing-repair strong{width:100%}.missing-repair select{flex-basis:140px}
}
@media (max-width: 760px) {
  .asset-browser { position: relative; grid-template-columns: 92px minmax(130px, 1fr); }
  .asset-browser.inspecting { grid-template-columns: 92px minmax(130px, 1fr); }
  .asset-inspector { position: absolute; inset: 0 0 0 auto; z-index: 4; display: block; width: min(230px, 70%); box-shadow: var(--shadow-lg); }
}
.filter-menu{position:relative;align-self:start}.filter-menu>button.active,.filter-popover button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}.filter-popover{position:absolute;z-index:20;top:34px;left:0;width:250px;max-height:290px;padding:7px;display:grid;grid-template-columns:1fr 1fr;gap:4px;overflow:auto;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);box-shadow:var(--shadow-lg)}.filter-popover>input,.filter-popover>select,.filter-popover>div{grid-column:1/-1;width:100%;min-height:29px}.filter-popover>button{height:27px}.filter-popover>div{display:flex;gap:4px}.filter-popover>div input{min-width:0;flex:1}.external-changes{padding:5px 8px;display:grid;gap:4px;border-bottom:1px solid var(--warning);background:color-mix(in srgb,var(--warning) 7%,var(--surface-1))}.external-changes article{display:flex;align-items:center;gap:5px}.external-changes article>span{min-width:0;display:grid;flex:1}.external-changes small{overflow:hidden;color:var(--text-muted);text-overflow:ellipsis;white-space:nowrap}.external-changes button{min-height:27px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-2);color:var(--text-secondary);font-size:11px}.import-queue{width:min(420px,calc(100% - 16px))}.import-queue details{grid-column:1/-1;max-height:90px;overflow:auto;color:var(--text-muted);font-size:11px}.import-queue details code{display:block;white-space:normal}.favorite-button{position:absolute;top:2px;left:2px;width:20px!important;height:20px!important;padding:0!important;border:0!important;background:transparent!important;color:var(--text-muted);opacity:.35}.favorite-button:hover,.favorite-button.active{color:var(--warning);opacity:1}.import-presets{margin-top:8px;padding:7px;display:grid;gap:5px;border:1px solid var(--border-subtle);border-radius:8px}.import-presets>div{display:flex;gap:4px}.import-presets input,.import-presets select{min-width:0;width:100%;min-height:28px}.import-presets button{width:30px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);color:var(--accent)}
.reference-summary button{max-width:100%;padding:0;border:0;color:var(--accent);background:transparent;font:inherit;text-align:left;overflow-wrap:anywhere}.reference-summary button:hover{text-decoration:underline}
.atlas-report,.content-closure{margin:7px 0;padding:7px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-3);font-size:var(--type-caption)}.atlas-report p{margin:0;color:var(--text-muted)}.atlas-report code{overflow:hidden;color:var(--accent);text-overflow:ellipsis;white-space:nowrap}.atlas-report small{color:var(--warning);overflow-wrap:anywhere}.content-closure summary{cursor:pointer;color:var(--text-secondary)}.content-closure article{padding:4px 0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;border-top:1px solid var(--border-subtle)}.content-closure article.invalid{color:var(--danger)}.content-closure article button{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.content-closure article small{color:var(--text-muted)}
.atlas-report,.content-closure{margin:7px 0;padding:7px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-3);font-size:var(--type-caption)}.atlas-report p{margin:0;color:var(--text-muted)}.atlas-report code{overflow:hidden;color:var(--accent);text-overflow:ellipsis;white-space:nowrap}.atlas-report small{color:var(--warning);overflow-wrap:anywhere}.content-closure summary{cursor:pointer;color:var(--text-secondary)}.content-closure article{padding:4px 0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;border-top:1px solid var(--border-subtle)}.content-closure article.invalid{color:var(--danger)}.content-closure article button{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.content-closure article small{color:var(--text-muted)}
.atlas-report,.content-closure{margin:7px 0;padding:7px;display:grid;gap:4px;border:1px solid var(--border-subtle);border-radius:9px;background:var(--surface-3);font-size:var(--type-caption)}.atlas-report p{margin:0;color:var(--text-muted)}.atlas-report code{overflow:hidden;color:var(--accent);text-overflow:ellipsis;white-space:nowrap}.atlas-report small{color:var(--warning);overflow-wrap:anywhere}.content-closure summary{cursor:pointer;color:var(--text-secondary)}.content-closure article{padding:4px 0;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px;border-top:1px solid var(--border-subtle)}.content-closure article.invalid{color:var(--danger)}.content-closure article button{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.content-closure article small{color:var(--text-muted)}
</style>
