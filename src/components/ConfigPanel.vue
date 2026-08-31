<template>
  <div class="config-wrapper" data-doc="manual/inspector" :class="dock" :style="{ width: `${panelWidth}px` }">
    <div class="resize-handle" @mousedown="startResize"></div>
    <aside class="config-panel" :class="{ runtime: !canEdit }">
      <div v-if="selectedEntities.length" class="inspector-sticky">
        <header class="inspector-header">
          <span class="eyebrow">{{ t('entitySettings') }}</span>
          <h3>{{ selectedEntities.length > 1 ? t('multiSelected', { count: selectedEntities.length }) : `${selectedEntity?.name}_${selectedEntity?.id}` }}</h3>
        </header>
        <div class="inspector-search-row">
          <input v-model="estate.inspectorSearch" type="search" :placeholder="t('searchInspector')">
          <button v-if="selectedEntity && addableComponents.length" class="add-component-trigger" @click="openComponentPicker">+ {{ t('addComponent') }}</button>
        </div>
        <nav class="inspector-categories" :aria-label="t('inspectorCategories')">
          <button v-for="category in inspectorCategories" :key="category.id" :class="{ active: estate.inspectorCategory === category.id }" @click="estate.inspectorCategory = category.id">{{ t(category.label) }}</button>
        </nav>
        <div class="inspector-view-controls"><button :class="{ active: estate.inspectorModifiedOnly }" @click="estate.inspectorModifiedOnly = !estate.inspectorModifiedOnly">{{ t('modifiedOnly') }}</button><button :class="{ active: estate.inspectorPinnedOnly }" @click="estate.inspectorPinnedOnly = !estate.inspectorPinnedOnly">★ {{ t('pinnedOnly') }}</button></div>
      </div>
      <div v-if="selectedEntities.length > 1" class="settings-content multi-inspector">
        <InspectorSection :title="t('sharedProperties')" category="general" open>
          <PropertyRow :label="t('entityEnabled')"><button class="batch-toggle" @click="toggleAll('enabled')">{{ sharedBoolean('enabled') }}</button></PropertyRow>
          <PropertyRow :label="t('entityVisible')"><button class="batch-toggle" @click="toggleAll('editorVisible')">{{ sharedBoolean('editorVisible') }}</button></PropertyRow>
          <PropertyRow :label="t('entityLocked')"><button class="batch-toggle" @click="toggleAll('editorLocked')">{{ sharedBoolean('editorLocked') }}</button></PropertyRow>
          <PropertyRow :label="t('sortingLayer')"><select v-model="multiLayer"><option value="">{{ t('mixed') }}</option><option v-for="layer in estate.layers" :key="layer" :value="String(layer)">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('position')"><div class="pair"><NumericExpressionInput v-model="multiPositionX" /><NumericExpressionInput v-model="multiPositionY" /></div></PropertyRow>
          <PropertyRow :label="t('entityTags')"><input :value="multiTags" :placeholder="t('mixed')" @change="setMultiTags(($event.target as HTMLInputElement).value)"></PropertyRow>
          <PropertyRow :label="t('entityGroups')"><input :value="multiGroups" :placeholder="t('mixed')" @change="setMultiGroups(($event.target as HTMLInputElement).value)"></PropertyRow>
          <p class="runtime-note">{{ t('multiInspectorCommonComponents', { count: commonComponentKinds.length }) }}</p>
        </InspectorSection>
        <p class="runtime-note">{{ t('runtimeIsolation') }}</p>
      </div>
      <div v-else-if="selectedEntity" class="settings-content" @change="onConfigChange">
        <InspectorSection :title="t('entitySettings')" category="general" open>
          <PropertyRow :label="t('entityEnabled')" path="Entity.enabled"><ToggleSwitch v-model="selectedEntity.enabled" /></PropertyRow>
          <PropertyRow :label="t('entityVisible')"><ToggleSwitch v-model="selectedEntity.editorVisible" /></PropertyRow>
          <PropertyRow :label="t('renderVisibility')" path="Entity.visible"><ToggleSwitch v-model="selectedEntity.authoring.visible" /></PropertyRow>
          <PropertyRow :label="t('entityLocked')"><ToggleSwitch v-model="selectedEntity.editorLocked" /></PropertyRow>
          <PropertyRow :label="t('zOrder')" path="Authoring.zOrder"><input :value="selectedEntity.authoring.zOrder" type="number" step="1" @input="setAuthoringOrder(Number(($event.target as HTMLInputElement).value))"></PropertyRow>
          <PropertyRow :label="t('renderLayer')" path="Authoring.renderLayer"><select :value="selectedEntity.layer" @change="setAuthoringLayer(Number(($event.target as HTMLSelectElement).value))"><option v-for="layer in estate.layers" :key="layer" :value="layer">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('sortingMode')" path="Authoring.sortMode"><select v-model="selectedEntity.authoring.sortMode"><option value="LayerThenOrder">{{ t('explicitOrder') }}</option><option value="YSort">{{ t('ySort') }}</option></select></PropertyRow>
          <PropertyRow v-if="!selectedEntity.spriteRenderer" :label="t('objectOrigin')" path="Authoring.origin"><div class="pair"><input v-model.number="selectedEntity.authoring.origin.x" type="number" step="0.01"><input v-model.number="selectedEntity.authoring.origin.y" type="number" step="0.01"></div></PropertyRow>
          <template v-if="selectedEntity.authoring.kind === 'CanvasLayer'">
            <PropertyRow :label="t('screenSpaceCanvas')" path="Canvas.screenSpace"><ToggleSwitch v-model="selectedEntity.authoring.canvasLayer.screenSpace" /></PropertyRow>
            <PropertyRow :label="t('followCamera')" path="Canvas.followCamera"><ToggleSwitch v-model="selectedEntity.authoring.canvasLayer.followCamera" /></PropertyRow>
          </template>
          <template v-if="selectedEntity.authoring.kind === 'ParallaxLayer'">
            <PropertyRow :label="t('parallaxMotionScale')" path="Parallax.motionScale"><div class="pair"><input v-model.number="selectedEntity.authoring.parallax.motionScale.x" type="number" step="0.05"><input v-model.number="selectedEntity.authoring.parallax.motionScale.y" type="number" step="0.05"></div></PropertyRow>
            <PropertyRow :label="t('parallaxRepeat')" path="Parallax.repeat"><div class="pair"><input v-model.number="selectedEntity.authoring.parallax.repeat.x" type="number" min="0" step="0.1"><input v-model.number="selectedEntity.authoring.parallax.repeat.y" type="number" min="0" step="0.1"></div></PropertyRow>
            <PropertyRow :label="t('parallaxMirror')" path="Parallax.mirror"><ToggleSwitch v-model="selectedEntity.authoring.parallax.mirror" /></PropertyRow>
            <PropertyRow :label="t('parallaxDepth')" path="Parallax.depth"><input v-model.number="selectedEntity.authoring.parallax.depth" type="number" step="1"></PropertyRow>
          </template>
          <template v-if="selectedEntity.authoring.kind === 'Path'">
            <PropertyRow :label="t('reusablePath')"><select v-model="selectedEntity.authoring.path.asset" @change="loadSelectedPathAsset"><option :value="null">{{ t('inlinePath') }}</option><option v-for="asset in pathAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
            <PropertyRow :label="t('pathClosed')" path="Path.closed"><ToggleSwitch v-model="selectedEntity.authoring.path.closed" /></PropertyRow>
            <PropertyRow :label="t('pathSmoothing')" path="Path.smoothing"><NumberRange v-model="selectedEntity.authoring.path.smoothing" :min="0" :max="1" :step="0.01" /></PropertyRow>
            <label class="stacked-field"><span>{{ t('pathPoints') }}</span><textarea :value="pathPointsText" rows="3" @change="updatePathPoints"></textarea></label>
            <label class="stacked-field"><span>{{ t('pathTangents') }}</span><textarea :value="pathTangentsText" rows="3" :placeholder="t('pathTangentsHint')" @change="updatePathTangents"></textarea></label>
            <PropertyRow :label="t('pathFollower')"><select v-model="selectedEntity.authoring.path.follower.targetUuid"><option :value="null">{{ t('none') }}</option><option v-for="entity in state.world.entities.filter(entity => entity !== selectedEntity)" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}</option></select></PropertyRow>
            <PropertyRow :label="t('pathProgress')"><NumberRange v-model="selectedEntity.authoring.path.follower.progress" :min="0" :max="1" :step="0.001" /></PropertyRow>
            <PropertyRow :label="t('pathSpeed')"><input v-model.number="selectedEntity.authoring.path.follower.speed" type="number" step="0.01"></PropertyRow>
            <PropertyRow :label="t('orientToPath')"><ToggleSwitch v-model="selectedEntity.authoring.path.follower.orient" /></PropertyRow>
            <button class="secondary-action" @click="saveSelectedPathAsset">{{ t('saveReusablePath') }}</button>
          </template>
          <PropertyRow :label="t('persistentEntity')"><ToggleSwitch v-model="selectedEntity.persistentAcrossScenes" /></PropertyRow>
          <PropertyRow :label="t('entityTags')"><input v-model="tagsText" type="text"></PropertyRow>
          <PropertyRow :label="t('entityGroups')"><input v-model="groupsText" type="text"></PropertyRow>
          <PropertyRow :label="t('namedLayer')"><select v-model="selectedEntity.namedLayer"><option v-for="layer in sceneManager.activeScene.settings.namedLayers" :key="layer.id" :value="layer.name">{{ layer.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('entityOwnership')"><select v-model="selectedEntity.ownership"><option value="Scene">{{ t('sceneOwned') }}</option><option value="Prefab">{{ t('prefabOwned') }}</option><option value="Runtime">{{ t('runtimeOwned') }}</option></select></PropertyRow>
          <PropertyRow :label="t('ownerEntity')"><select v-model="selectedEntity.ownerUuid"><option :value="null">{{ t('none') }}</option><option v-for="entity in state.world.entities.filter(entity => entity !== selectedEntity)" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('editorOnlyEntity')"><ToggleSwitch v-model="selectedEntity.editorOnly" /></PropertyRow>
          <PropertyRow :label="t('runtimePersistence')"><select v-model="selectedEntity.runtimePersistence"><option value="Scene">{{ t('persistenceScene') }}</option><option value="Session">{{ t('persistenceSession') }}</option><option value="SaveGame">{{ t('persistenceSaveGame') }}</option><option value="Transient">{{ t('persistenceTransient') }}</option></select></PropertyRow>
          <div v-if="selectedValidation.length" class="authoring-validation" role="status"><strong>{{ t('componentValidation') }}</strong><button v-for="issue in selectedValidation" :key="`${issue.code}:${issue.component}`" :class="issue.severity" :title="issue.fix">{{ issue.message }}</button></div>
          <DiagnosticRow label="UUID" :value="selectedEntity.uuid" />
          <template v-if="selectedEntity.prefabAsset">
            <DiagnosticRow :label="t('prefabInstance')" :value="selectedEntity.prefabAsset" active />
            <DiagnosticRow :label="t('prefabOverrides')" :value="String(prefabOverrideCount)" />
            <details v-if="prefabComparison.length" class="prefab-compare">
              <summary>{{ t('comparePrefabOverrides') }}</summary>
              <article v-for="override in prefabComparison" :key="override.path"><code>{{ override.path }}</code><button @click="resetSelectedPrefabOverride(override.path)">{{ t('resetOverride') }}</button></article>
            </details>
            <details v-if="prefabConflicts.length" class="prefab-compare prefab-conflicts" open>
              <summary>{{ t('prefabConflicts') }} · {{ prefabConflicts.length }}</summary>
              <article v-for="conflict in prefabConflicts" :key="`${conflict.code}:${conflict.path ?? ''}`" :class="conflict.severity"><span>{{ conflict.message }}</span></article>
            </details>
            <div class="prefab-actions">
              <button @click="locateSelectedPrefab">{{ t('locatePrefabSource') }}</button>
              <button @click="applySelectedPrefab">{{ t('applyPrefab') }}</button>
              <button @click="revertSelectedPrefab">{{ t('revertPrefab') }}</button>
              <button @click="createSelectedPrefabVariant">{{ t('createPrefabVariant') }}</button>
              <button @click="unpackSelectedPrefab">{{ t('unpackPrefab') }}</button>
            </div>
          </template>
          <button v-else class="secondary-action" @click="createSelectedPrefab">{{ t('createPrefab') }}</button>
          <template v-if="selectedEntity.sceneLayers.length">
            <DiagnosticRow :label="t('sceneInstance')" :value="selectedEntity.sceneLayers[selectedEntity.sceneLayers.length - 1]?.asset ?? ''" active />
            <button class="secondary-action" @click="unpackSelectedScene">{{ t('unpackScene') }}</button>
          </template>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('rigidBody2D')" category="physics" open>
          <ComponentTools kind="RigidBody2D" />
          <select v-model="bodyType"><option value="Dynamic">{{ t('dynamic') }}</option><option value="Kinematic">{{ t('kinematic') }}</option><option value="Static">{{ t('static') }}</option></select>
          <PropertyRow :label="t('massMode')"><select v-model="selectedEntity.rigidBody.massMode"><option value="Automatic">{{ t('automatic') }}</option><option value="Manual">{{ t('manualMass') }}</option></select></PropertyRow>
          <PropertyRow :label="t('continuousCollision')"><select v-model="selectedEntity.rigidBody.continuousCollision"><option value="Discrete">{{ t('discreteMode') }}</option><option value="Continuous">{{ t('continuousMode') }}</option></select></PropertyRow>
          <PropertyRow :label="t('transformOwnership')"><select v-model="selectedEntity.rigidBody.transformOwnership"><option value="Physics">{{ t('physicsOwned') }}</option><option value="Animation">{{ t('animationOwned') }}</option></select></PropertyRow>
          <PropertyRow :label="t('sleepingAllowed')"><ToggleSwitch v-model="selectedEntity.rigidBody.sleepingAllowed" /></PropertyRow>
          <PropertyRow :label="t('freezeRotation')"><ToggleSwitch v-model="selectedEntity.rigidBody.freezeRotation" /></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('connections')" category="physics" open>
          <div v-if="selectedConnections.length" class="connection-list">
            <article v-for="connection in selectedConnections" :key="connection.id" class="connection-item" :class="connection.breakState">
              <button class="connection-main" :title="connection.binding ? t('boundAsCompound') : undefined" @click="openConnection(connection.id)">
                <span class="connection-dot"></span>
                <span>
                  <strong>{{ connection.name }}</strong>
                  <small>
                    {{ connection.binding ? t('compound') : !connectionSharesLayer(connection, state.world.entities) ? t('layerIsolated') : t(connection.breakState) }}
                    <template v-if="connection.breakState !== 'intact' && connection.breakLink >= 0"> · {{ t('breakLocation', { link: connection.breakLink + 1 }) }}</template>
                    · {{ connection.anchors.length }} {{ t('entities').toLowerCase() }}
                  </small>
                </span>
              </button>
              <button v-if="!connection.binding && connection.breakState !== 'intact'" class="mini-button" :title="t('repairConnection')" @click="repair(connection.id)">↻</button>
              <button v-if="connection.binding" class="mini-button separate" :title="t('separateBinding')" @click="separate(connection.id)">⇄</button>
              <button class="mini-button danger" :title="t('deleteConnection')" @click="removeConnection(connection.id)">×</button>
            </article>
          </div>
          <p v-else class="empty-state">{{ t('noConnections') }}</p>
          <button class="primary-action" @click="openConnection(null)"><span>＋</span>{{ t('addConnection') }}</button>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('ShapeRenderer2D') && !selectedEntity.hasComponent('RectTransform')" :title="t('shapeRenderer2D')" category="render">
          <ComponentTools kind="ShapeRenderer2D" />
          <PropertyRow :label="t('sortingLayer')"><select v-model.number="selectedEntity.layer" @change="onLayerChange"><option v-for="layer in estate.layers" :key="layer" :value="layer">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('orderInLayer')"><input v-model.number="selectedEntity.renderer.orderInLayer" type="number" step="1"></PropertyRow>
          <PropertyRow :label="t('colorRgb')"><button class="color-well" :style="{ background: entityColor }" :aria-label="t('pickColor')" @click="openColorPicker"></button></PropertyRow>
          <PropertyRow :label="t('transparency')"><NumberRange v-model="selectedEntity.transparency" :min="0" :max="100" :step="1" /></PropertyRow>
          <PropertyRow :label="t('strokeColor')"><input type="color" :value="rgbHex(selectedEntity.renderer.strokeColor)" @input="setRgb(selectedEntity.renderer.strokeColor, $event)"></PropertyRow>
          <PropertyRow :label="t('strokeWidth')"><input v-model.number="selectedEntity.renderer.strokeWidth" type="number" min="0" step="0.1"></PropertyRow>
          <PropertyRow :label="t('strokeOpacity')"><NumberRange v-model="selectedEntity.renderer.strokeOpacity" :min="0" :max="100" :step="1" /></PropertyRow>
          <PropertyRow :label="t('material')"><select v-model="selectedEntity.renderer.material"><option value="Default">{{ t('default') }}</option><option v-for="asset in materialAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('filterMode')"><select v-model="selectedEntity.renderer.filterMode"><option value="Linear">{{ t('linear') }}</option><option value="Nearest">{{ t('nearest') }}</option></select></PropertyRow>
          <PropertyRow :label="t('imageTexture')"><select v-model="selectedEntity.renderer.textureAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <label class="stacked-field"><span>{{ t('importTexture') }}</span><input ref="textureInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" @change="applyTexture"></label>
          <button v-if="selectedEntity.renderer.textureAsset || selectedEntity.texture" class="secondary-action" @click="clearTexture">{{ t('removeTexture') }}</button>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.spriteRenderer" :title="t('spriteRenderer2D')" category="render" open>
          <ComponentTools kind="SpriteRenderer2D" />
          <PropertyRow :label="t('spriteAsset')"><select v-model="selectedEntity.spriteRenderer.spriteAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('tint')"><input type="color" :value="rgbHex(selectedEntity.spriteRenderer.tint)" @input="setRgb(selectedEntity.spriteRenderer!.tint, $event)"></PropertyRow>
          <PropertyRow :label="t('opacity')" path="Sprite.opacity"><NumberRange v-model="selectedEntity.spriteRenderer.opacity" :min="0" :max="100" :step="1" /></PropertyRow>
          <PropertyRow :label="t('spriteSize')" path="Sprite.size"><div class="pair"><input v-model.number="selectedEntity.spriteRenderer.size.x" type="number" min="0.000001" step="0.1"><input v-model.number="selectedEntity.spriteRenderer.size.y" type="number" min="0.000001" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('pivot')" path="Sprite.pivot"><div class="pair"><input v-model.number="selectedEntity.spriteRenderer.pivot.x" type="number" min="0" max="1" step="0.05"><input v-model.number="selectedEntity.spriteRenderer.pivot.y" type="number" min="0" max="1" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('flipX')" path="Sprite.flipX"><ToggleSwitch v-model="selectedEntity.spriteRenderer.flipX" /></PropertyRow>
          <PropertyRow :label="t('flipY')" path="Sprite.flipY"><ToggleSwitch v-model="selectedEntity.spriteRenderer.flipY" /></PropertyRow>
          <PropertyRow :label="t('sortingLayer')"><select v-model.number="selectedEntity.spriteRenderer.sortingLayer"><option v-for="layer in estate.layers" :key="layer" :value="layer">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('orderInLayer')"><input v-model.number="selectedEntity.spriteRenderer.orderInLayer" type="number" step="1"></PropertyRow>
          <PropertyRow :label="t('material')"><select v-model="selectedEntity.spriteRenderer.material"><option value="Default">{{ t('default') }}</option><option v-for="asset in materialAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('filterMode')"><select v-model="selectedEntity.spriteRenderer.filterMode"><option value="Linear">{{ t('linear') }}</option><option value="Nearest">{{ t('nearest') }}</option></select></PropertyRow>
          <PropertyRow :label="t('normalMap')"><select v-model="selectedEntity.spriteRenderer.normalMapAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('lightMask')"><input v-model.number="selectedEntity.spriteRenderer.lightMask" type="number" min="0" max="4294967295" step="1"></PropertyRow>
          <PropertyRow :label="t('nineSlice')"><ToggleSwitch v-model="selectedEntity.spriteRenderer.nineSlice.enabled" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.spriteRenderer.nineSlice.enabled" :label="t('sliceBorders')"><div class="quad"><input v-model.number="selectedEntity.spriteRenderer.nineSlice.left" type="number" min="0"><input v-model.number="selectedEntity.spriteRenderer.nineSlice.top" type="number" min="0"><input v-model.number="selectedEntity.spriteRenderer.nineSlice.right" type="number" min="0"><input v-model.number="selectedEntity.spriteRenderer.nineSlice.bottom" type="number" min="0"></div></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.textRenderer" :title="t('textRenderer2D')" category="render" open>
          <ComponentTools kind="TextRenderer2D" />
          <label class="stacked-field"><span>{{ t('textContent') }}</span><textarea v-model="selectedEntity.textRenderer.text" rows="3"></textarea></label>
          <PropertyRow :label="t('fontAsset')"><select v-model="selectedEntity.textRenderer.fontAsset"><option :value="null">{{ t('defaultFont') }}</option><option v-for="asset in fontAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('fontSize')"><input v-model.number="selectedEntity.textRenderer.fontSize" type="number" min="0.000001" step="0.1"></PropertyRow>
          <PropertyRow :label="t('fontWeight')"><input v-model.number="selectedEntity.textRenderer.fontWeight" type="number" min="100" max="900" step="100"></PropertyRow>
          <PropertyRow :label="t('lineHeight')"><input v-model.number="selectedEntity.textRenderer.lineHeight" type="number" min="0.1" max="10" step="0.1"></PropertyRow>
          <PropertyRow :label="t('alignment')"><select v-model="selectedEntity.textRenderer.align"><option value="left">{{ t('left') }}</option><option value="center">{{ t('center') }}</option><option value="right">{{ t('right') }}</option></select></PropertyRow>
          <PropertyRow :label="t('textColor')"><input type="color" :value="rgbHex(selectedEntity.textRenderer.color)" @input="setRgb(selectedEntity.textRenderer!.color, $event)"></PropertyRow>
          <PropertyRow :label="t('opacity')"><NumberRange v-model="selectedEntity.textRenderer.opacity" :min="0" :max="100" :step="1" /></PropertyRow>
          <PropertyRow :label="t('maxWidth')"><input v-model.number="selectedEntity.textRenderer.maxWidth" type="number" min="0" step="0.1"></PropertyRow>
          <PropertyRow :label="t('sortingLayer')"><select v-model.number="selectedEntity.textRenderer.sortingLayer"><option v-for="layer in estate.layers" :key="layer" :value="layer">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('orderInLayer')"><input v-model.number="selectedEntity.textRenderer.orderInLayer" type="number" step="1"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.camera2D" :title="t('camera2D')" category="render" open>
          <ComponentTools kind="Camera2D" />
          <PropertyRow :label="t('activeCamera')"><ToggleSwitch v-model="selectedEntity.camera2D.active" /></PropertyRow>
          <PropertyRow :label="t('orthographicSize')" path="Camera.orthographicSize"><input v-model.number="selectedEntity.camera2D.orthographicSize" type="number" min="0.000001" step="0.1"></PropertyRow>
          <PropertyRow :label="t('cameraZoom')" path="Camera.zoom"><input v-model.number="selectedEntity.camera2D.zoom" type="number" min="0.000001" step="0.1"></PropertyRow>
          <PropertyRow :label="t('backgroundColor')"><input type="color" :value="rgbHex(selectedEntity.camera2D.backgroundColor)" @input="setRgb(selectedEntity.camera2D!.backgroundColor, $event)"></PropertyRow>
          <PropertyRow :label="t('pixelPerfect')" path="Camera.pixelPerfect"><ToggleSwitch v-model="selectedEntity.camera2D.pixelPerfect" /></PropertyRow>
          <PropertyRow :label="t('cameraPreview')"><ToggleSwitch v-model="selectedEntity.camera2D.previewInEditor" /></PropertyRow>
          <PropertyRow :label="t('cameraFollowTarget')"><select v-model="selectedEntity.camera2D.followTargetUuid"><option :value="null">{{ t('none') }}</option><option v-for="entity in state.world.entities.filter(entity => entity !== selectedEntity)" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('cameraSmoothing')"><ToggleSwitch v-model="selectedEntity.camera2D.smoothing.enabled" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.camera2D.smoothing.enabled" :label="t('smoothingSpeed')" path="Camera.smoothingSpeed"><input v-model.number="selectedEntity.camera2D.smoothing.speed" type="number" min="0" step="0.1"></PropertyRow>
          <PropertyRow :label="t('cameraLimits')"><ToggleSwitch v-model="selectedEntity.camera2D.limits.enabled" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.camera2D.limits.enabled" :label="t('limitLeftRight')"><div class="pair"><input v-model.number="selectedEntity.camera2D.limits.left" type="number"><input v-model.number="selectedEntity.camera2D.limits.right" type="number"></div></PropertyRow>
          <PropertyRow v-if="selectedEntity.camera2D.limits.enabled" :label="t('limitBottomTop')"><div class="pair"><input v-model.number="selectedEntity.camera2D.limits.bottom" type="number"><input v-model.number="selectedEntity.camera2D.limits.top" type="number"></div></PropertyRow>
          <PropertyRow :label="t('dragMargins')"><ToggleSwitch v-model="selectedEntity.camera2D.dragMargins.enabled" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.camera2D.dragMargins.enabled" :label="t('dragMarginLeftRight')"><div class="pair"><input v-model.number="selectedEntity.camera2D.dragMargins.left" type="number" min="0" max="1" step="0.01"><input v-model.number="selectedEntity.camera2D.dragMargins.right" type="number" min="0" max="1" step="0.01"></div></PropertyRow>
          <PropertyRow v-if="selectedEntity.camera2D.dragMargins.enabled" :label="t('dragMarginTopBottom')"><div class="pair"><input v-model.number="selectedEntity.camera2D.dragMargins.top" type="number" min="0" max="1" step="0.01"><input v-model.number="selectedEntity.camera2D.dragMargins.bottom" type="number" min="0" max="1" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('viewportOrigin')"><div class="pair"><input v-model.number="selectedEntity.camera2D.viewport.x" type="number" min="0" max="1" step="0.05"><input v-model.number="selectedEntity.camera2D.viewport.y" type="number" min="0" max="1" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('viewportSize')"><div class="pair"><input v-model.number="selectedEntity.camera2D.viewport.width" type="number" min="0.01" max="1" step="0.05"><input v-model.number="selectedEntity.camera2D.viewport.height" type="number" min="0.01" max="1" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('sortingRange')"><div class="pair"><input v-model.number="selectedEntity.camera2D.nearSortingLayer" type="number" step="1"><input v-model.number="selectedEntity.camera2D.farSortingLayer" type="number" step="1"></div></PropertyRow>
          <PropertyRow :label="t('cameraPriority')"><div class="pair"><input v-model.number="selectedEntity.camera2D.priority" type="number" step="1"><input v-model.number="selectedEntity.camera2D.stackOrder" type="number" step="1"></div></PropertyRow>
          <PropertyRow :label="t('cullingMask')"><input v-model.number="selectedEntity.camera2D.cullingMask" type="number" min="0" max="4294967295" step="1"></PropertyRow>
          <PropertyRow :label="t('renderTexture')"><input v-model="selectedEntity.camera2D.renderTexture" type="text" :placeholder="t('renderTextureName')"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.script2D" :title="t('script2D')" category="gameplay" open>
          <ComponentTools kind="Script2D" />
          <PropertyRow :label="t('scriptAsset')"><select v-model="selectedEntity.script2D.scriptAsset" @change="synchronizeScriptProperties"><option :value="null">{{ t('none') }}</option><option v-for="asset in scriptAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }} · {{ asset.assetType === 'visualScript' ? t('visualGraph') : 'Rhai' }}</option></select></PropertyRow>
          <button class="secondary-action" @click="synchronizeScriptProperties">{{ t('refreshScriptProperties') }}</button>
          <div v-for="group in scriptPropertyGroups" :key="group.name" class="script-property-group">
            <h4>{{ group.name }}</h4>
            <div v-for="property in group.properties" :key="property.name" :title="property.metadata?.tooltip || property.name">
              <PropertyRow :label="property.name" :path="`Script.${property.name}`">
                <ToggleSwitch v-if="typeof property.value === 'boolean'" :model-value="property.value" @update:model-value="setScriptProperty(property.name, $event)" />
                <select v-else-if="property.metadata?.enumValues.length" :value="property.value" @change="setScriptProperty(property.name, ($event.target as HTMLSelectElement).value)"><option v-for="option in property.metadata.enumValues" :key="option" :value="option">{{ option }}</option></select>
                <select v-else-if="property.metadata?.resourceType" :value="property.value" @change="setScriptProperty(property.name, ($event.target as HTMLSelectElement).value)"><option value="">{{ t('none') }}</option><option v-for="asset in compatibleScriptResources(property.metadata.resourceType)" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select>
                <select v-else-if="property.metadata?.valueType === 'entity'" :value="property.value" @change="setScriptProperty(property.name, ($event.target as HTMLSelectElement).value)"><option value="">{{ t('none') }}</option><option v-for="entity in state.world.entities" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}</option></select>
                <input v-else-if="typeof property.value === 'number'" :value="property.value" type="number" :min="property.metadata?.minimum ?? undefined" :max="property.metadata?.maximum ?? undefined" :step="property.metadata?.step ?? 0.01" @change="setScriptProperty(property.name, Number(($event.target as HTMLInputElement).value))">
                <div v-else-if="isScriptVec2(property.value)" class="pair"><input :value="property.value[0]" type="number" step="0.01" @change="setScriptVectorPart(property.name, 0, $event)"><input :value="property.value[1]" type="number" step="0.01" @change="setScriptVectorPart(property.name, 1, $event)"></div>
                <textarea v-else-if="property.value === null || typeof property.value === 'object'" class="script-data-value" :value="scriptDataText(property.value)" rows="3" spellcheck="false" @change="setScriptDataProperty(property.name, $event)"></textarea>
                <input v-else :value="property.value" type="text" @change="setScriptProperty(property.name, ($event.target as HTMLInputElement).value)">
              </PropertyRow>
              <small v-if="property.metadata?.tooltip" class="script-property-help">{{ property.metadata.tooltip }}</small>
            </div>
          </div>
          <p v-if="selectedEntity.script2D.lastError" class="script-error">{{ selectedEntity.script2D.lastError }}</p>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('ShapeRenderer2D') && !selectedEntity.hasComponent('RectTransform')" :title="t('shapeSize')" category="render">
          <PropertyRow :label="t('absoluteSize')"><div class="pair"><input v-model.number="absoluteSizeX" type="number" min="0.000001" step="0.1"><input v-model.number="absoluteSizeY" type="number" min="0.000001" step="0.1"></div></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('transform2D')" category="transform" open>
          <ComponentTools kind="Transform2D" />
          <PropertyRow :label="t('parentEntity')"><select v-model="selectedParentUuid"><option value="">{{ t('noParent') }}</option><option v-for="entity in parentCandidates" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}_{{ entity.id }}</option></select></PropertyRow>
          <PropertyRow :label="t('position')" path="Transform.position"><div class="pair"><NumericExpressionInput v-model="selectedEntity.transform.position.x" /><NumericExpressionInput v-model="selectedEntity.transform.position.y" /></div></PropertyRow>
          <PropertyRow :label="t('rotationDegrees')" path="Transform.rotation"><NumberRange v-model="rotationDegrees" :min="-180" :max="180" :step="1" /></PropertyRow>
          <PropertyRow :label="t('scale')" path="Transform.scale"><div class="pair"><NumericExpressionInput v-model="selectedEntity.transform.scale.x" :minimum="0.000001" /><NumericExpressionInput v-model="selectedEntity.transform.scale.y" :minimum="0.000001" /></div></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('transformMotion')" category="physics">
          <PropertyRow :label="t('linearVelocity')"><div class="pair"><input v-model.number="selectedEntity.velocity.x" type="number" step="0.01"><input v-model.number="selectedEntity.velocity.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('accelerationXY')"><div class="pair"><input v-model.number="selectedEntity.acceleration.x" type="number" step="0.01"><input v-model.number="selectedEntity.acceleration.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('angularVelocity')"><input v-model.number="selectedEntity.angularVelocity" type="number" step="0.01"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('dampingFriction')" category="physics">
          <PropertyRow :label="t('linearDamping')"><NumberRange v-model="selectedEntity.linearDamping" :min="0" :max="Math.max(1, selectedEntity.linearDamping)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('angularDamping')"><NumberRange v-model="selectedEntity.angularDamping" :min="0" :max="Math.max(1, selectedEntity.angularDamping)" :step="0.01" /></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('massProperties')" category="physics">
          <DiagnosticRow :label="t('invMass')" :value="selectedEntity.mass > 0 && bodyType === 'Dynamic' ? (1 / selectedEntity.mass).toPrecision(6) : `0 (${t('infinite')})`" />
          <DiagnosticRow :label="t('invInertia')" :value="effectiveEntityInertia > 0 && bodyType === 'Dynamic' ? (1 / effectiveEntityInertia).toPrecision(6) : `0 (${t('infinite')})`" />
          <DiagnosticRow :label="t('surfaceArea')" :value="selectedEntityArea.toPrecision(7)" />
          <PropertyRow :label="t('density')"><NumberRange v-model="selectedEntity.density" :min="0.000001" :max="Math.max(10, selectedEntity.density)" :step="0.000001" @update:model-value="onDensityChange" /></PropertyRow>
          <PropertyRow :label="t('mass')"><NumberRange v-model="selectedEntity.mass" :min="0.000001" :max="Math.max(100, selectedEntity.mass)" :step="0.000001" @update:model-value="onMassChange" /></PropertyRow>
          <PropertyRow :label="t('automaticInertia')"><ToggleSwitch v-model="selectedEntity.autoInertia" /></PropertyRow>
          <PropertyRow v-if="!selectedEntity.autoInertia" :label="t('momentInertia')"><input v-model.number="selectedEntity.inertia" type="number" min="1e-24" step="0.1"></PropertyRow>
          <PropertyRow :label="t('gravityScale')"><NumberRange v-model="selectedEntity.gravityScale" :min="Math.min(0, selectedEntity.gravityScale)" :max="Math.max(5, selectedEntity.gravityScale)" :step="0.1" /></PropertyRow>
          <PropertyRow :label="t('localGravity')"><input v-model.number="selectedEntity.gravity" type="number" step="0.1"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('continuousForces')" category="physics">
          <PropertyRow :label="t('forceXY')"><div class="pair"><input v-model.number="selectedEntity.force.x" type="number" step="0.01"><input v-model.number="selectedEntity.force.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('torque')"><input v-model.number="selectedEntity.torque" type="number" step="0.01"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('RigidBody2D')" :title="t('interactiveImpulses')" category="physics">
          <div class="pair"><input v-model.number="impulseX" type="number" :placeholder="t('impulseX')"><input v-model.number="impulseY" type="number" :placeholder="t('impulseY')"></div>
          <div class="pair"><input v-model.number="offsetX" type="number" :placeholder="t('offsetX')"><input v-model.number="offsetY" type="number" :placeholder="t('offsetY')"></div>
          <button class="primary-action" :disabled="bodyType !== 'Dynamic'" @click="applyImpulse">{{ t('applyLinearImpulse') }}</button>
          <input v-model.number="angularImpulse" type="number" :placeholder="t('angularImpulse')">
          <button class="primary-action" :disabled="bodyType !== 'Dynamic'" @click="applyAngularImpulse">{{ t('applyAngularImpulse') }}</button>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.getCollider()" :title="t('collider2D')" category="physics">
          <ComponentTools :kind="selectedEntity.collider.kind" />
          <PropertyRow :label="t('colliderShape')"><select v-model="colliderShapeModel"><option v-for="kind in colliderShapeKinds" :key="kind" :value="kind">{{ kind }}</option></select></PropertyRow>
          <p class="physics-support-note">{{ colliderShapeSupport }}</p>
          <details class="compound-shapes">
            <summary><span>{{ t('additionalShapes') }} ({{ selectedEntity.collider.shapes.length }})</span><button type="button" :disabled="selectedEntity.collider.shapes.length >= 7" @click.prevent="addColliderShape">＋</button></summary>
            <article v-for="(shape, index) in selectedEntity.collider.shapes" :key="shape.id">
              <header><select v-model="shape.kind"><option v-for="kind in colliderShapeKinds" :key="kind">{{ kind }}</option></select><label><input v-model="shape.enabled" type="checkbox">{{ t('componentEnabled') }}</label><button type="button" @click="removeColliderShape(index)">×</button></header>
              <label><span>{{ t('colliderOffset') }}</span><div class="pair"><input v-model.number="shape.offset.x" type="number" step="0.01"><input v-model.number="shape.offset.y" type="number" step="0.01"></div></label>
              <label><span>{{ t('colliderSize') }}</span><div class="pair"><input v-model.number="shape.size.x" type="number" min="0.000001" step="0.1"><input v-model.number="shape.size.y" type="number" min="0.000001" step="0.1"></div></label>
              <label><span>{{ t('colliderRotation') }}</span><input v-model.number="shape.rotation" type="number" step="0.01"></label>
            </article>
            <p>{{ t('compoundShapeHint') }}</p>
          </details>
          <PropertyRow :label="t('colliderOffset')"><div class="pair"><input v-model.number="selectedEntity.collider.offset.x" type="number" step="0.01"><input v-model.number="selectedEntity.collider.offset.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('colliderSize')"><div class="pair"><input v-model.number="colliderSizeX" type="number" min="0.000001" step="0.1"><input v-model.number="colliderSizeY" type="number" min="0.000001" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('colliderRotation')"><input v-model.number="colliderRotationDegrees" type="number" step="1"></PropertyRow>
          <PropertyRow :label="t('physicsLayer')"><select v-model.number="selectedEntity.collider.physicsLayer"><option v-for="layer in state.globalSettings.layers" :key="layer.id" :value="layer.id">{{ layer.name }}</option></select></PropertyRow>
          <PropertyRow :label="t('collisionMask')"><input v-model.number="selectedEntity.collider.collisionMask" type="number" min="0" max="4294967295" step="1" :title="collisionMaskNames"></PropertyRow>
          <PropertyRow :label="t('isSensor')"><ToggleSwitch v-model="selectedEntity.isSensor" /></PropertyRow>
          <PropertyRow :label="t('oneWayCollider')"><ToggleSwitch v-model="selectedEntity.collider.oneWay" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.collider.oneWay" :label="t('oneWayNormal')"><div class="field-pair"><input v-model.number="selectedEntity.collider.oneWayNormal.x" type="number" step="0.1"><input v-model.number="selectedEntity.collider.oneWayNormal.y" type="number" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('physicsMaterial')"><select v-model="selectedEntity.collider.materialAsset" @change="applySelectedPhysicsMaterial"><option :value="null">{{ t('inlineMaterial') }}</option><option v-for="asset in physicsMaterialAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ physicsMaterialName(asset.uuid) }}</option></select></PropertyRow>
          <PropertyRow :label="t('restitution')"><NumberRange v-model="selectedEntity.restitution" :min="0" :max="1" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('restitutionThreshold')"><input v-model.number="selectedEntity.restitutionThreshold" type="number" min="0" step="0.1"></PropertyRow>
          <PropertyRow :label="t('staticFriction')"><NumberRange v-model="selectedEntity.staticFriction" :min="0" :max="Math.max(1, selectedEntity.staticFriction)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('dynamicFriction')"><NumberRange v-model="selectedEntity.dynamicFriction" :min="0" :max="Math.max(1, selectedEntity.dynamicFriction)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('frictionCombine')"><select v-model="selectedEntity.collider.material.frictionCombine"><option v-for="mode in materialCombineModes" :key="mode">{{ mode }}</option></select></PropertyRow>
          <PropertyRow :label="t('restitutionCombine')"><select v-model="selectedEntity.collider.material.restitutionCombine"><option v-for="mode in materialCombineModes" :key="mode">{{ mode }}</option></select></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="prefs.showDiagnostics && selectedEntity.hasComponent('RigidBody2D')" :title="t('collisionDiagnostics')" category="physics">
          <DiagnosticRow :label="t('contacts')" :value="String(selectedEntity.contactCount)" :active="selectedEntity.contactCount > 0" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('normal')" :value="`[${selectedEntity.contactNormal.x.toFixed(3)}, ${selectedEntity.contactNormal.y.toFixed(3)}]`" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('penetration')" :value="`${selectedEntity.penetrationDepth.toPrecision(5)} m`" />
        </InspectorSection>

        <RuntimeComponentsInspector :entity="selectedEntity" :search-query="estate.inspectorSearch" :category="estate.inspectorCategory" />
        <WorldComponentsInspector :entity="selectedEntity" />
        <GameplayComponentsInspector :entity="selectedEntity" />
        <InspectorSection v-if="pluginInspectorContributions.length" :title="t('extensionActions')" category="general">
          <div class="plugin-inspector-actions">
            <button v-for="item in pluginInspectorContributions" :key="`${item.pluginId}:${item.kind}:${item.id}`" :title="item.description" @click="invokePluginInspector(item.kind,item.id,item.pluginId)"><span>{{ item.label }}</span><small>{{ item.pluginName }} · {{ t(`contribution_${item.kind}`) }}</small></button>
          </div>
        </InspectorSection>
        <p v-if="!inspectorHasMatches" class="inspector-no-results">{{ t('noInspectorResults') }}</p>
      </div>
      <div v-else class="empty-inspector"><span class="eyebrow">{{ t('entitySettings') }}</span><p>{{ t('noEntitiesFound') }}</p><button class="primary empty-create" @click="estate.createObjectPaletteOpen = true">＋ {{ t('createObject') }}</button></div>
    </aside>

    <div v-if="showColorPicker" class="modal-scrim" @mousedown.self="showColorPicker = false"><div class="color-modal"><h4>{{ t('selectColor') }}</h4><input v-model="tempColor" type="color"><div><button @click="showColorPicker = false">{{ t('cancel') }}</button><button class="primary" @click="applyColor">{{ t('apply') }}</button></div></div></div>
    <Teleport to="body">
      <div v-if="estate.componentPickerOpen && selectedEntity" class="modal-scrim component-picker-scrim" @mousedown.self="closeComponentPicker">
        <section class="component-picker" role="dialog" aria-modal="true" :aria-label="t('addComponent')" @keydown.escape="closeComponentPicker">
          <header><div><span class="eyebrow">{{ t('addComponent') }}</span><h4>{{ selectedEntity.name }}</h4></div><button :aria-label="t('cancel')" @click="closeComponentPicker">×</button></header>
          <input ref="componentSearchInput" v-model="componentSearch" type="search" :placeholder="t('searchComponents')">
          <div class="component-picker-list">
            <section v-for="group in componentGroups" :key="group.name"><h5>{{ group.name }} <small>{{ group.kinds.length }}</small></h5><article v-for="kind in group.kinds" :key="kind"><button class="component-main" @click="chooseComponent(kind)"><span>{{ componentGlyph(kind) }}</span><span><strong>{{ componentTitle(kind) }}</strong><small>{{ componentPaletteMetadata(kind).category }} · {{ t(`compatibility${componentPaletteMetadata(kind).compatibility}`) }}<template v-if="componentAuthoringRule(kind).required.length"> · {{ t('requires') }} {{ componentAuthoringRule(kind).required.join(', ') }}</template><template v-if="componentAuthoringRule(kind).conflicts.length"> · {{ t('conflictsWith') }} {{ componentAuthoringRule(kind).conflicts.join(', ') }}</template></small><small>{{ componentPaletteMetadata(kind).summary }}</small></span><i>＋</i></button><button class="component-favorite" :class="{ active: componentPaletteState.favorites.includes(kind) }" :title="`${t('favorite')} · ${componentAuthoringRule(kind).documentation}`" @click="toggleComponentFavorite(kind)">★</button></article></section>
            <p v-if="!componentGroups.length">{{ t('noComponentsFound') }}</p>
          </div>
        </section>
      </div>
      <div v-if="propertyMenu.visible" class="property-menu" :style="{ left: `${propertyMenu.x}px`, top: `${propertyMenu.y}px` }"><strong>{{ propertyMenu.path }}</strong><button @click="resetPropertyValue">↻ {{ t('resetProperty') }}</button><button @click="revertPropertyOverride">↩ {{ t('revertOverride') }}</button><button @click="copyPropertyValue">{{ t('copyValue') }}</button><button :disabled="!propertyClipboard" @click="pastePropertyValue">{{ t('pasteValue') }}</button><button @click="copyPropertyPath">{{ t('copyPropertyPath') }}</button><button @click="keyframeProperty">◆ {{ t('keyframeProperty') }}</button><button @click="togglePropertyPin">★ {{ isCurrentPropertyPinned ? t('unpinProperty') : t('pinProperty') }}</button><p v-if="currentPropertyMetadata">{{ currentPropertyMetadata.help }}<template v-if="currentPropertyMetadata.unit"> · {{ currentPropertyMetadata.unit }}</template><template v-if="currentPropertyMetadata.minimum !== undefined"> · {{ currentPropertyMetadata.minimum }}…{{ currentPropertyMetadata.maximum ?? '∞' }}</template></p></div>
    </Teleport>
    <ConnectionBuilder v-if="selectedEntity && builderOpen" :selected-id="selectedEntity.id" :connection-id="editingConnectionId" @close="builderOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as estate, type InspectorCategory } from '../store/editor'
import { deleteConnection, physicsState as state, pushHistory, repairConnection, sceneManager } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'
import { requestConfirmation } from '../store/dialog'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import { effectiveInertia, entityArea, finiteNumber, MIN_AREA, MIN_SIZE, normalizeEntity, syncDensityFromMass, syncMassFromDensity } from '../world/geometry'
import ConnectionBuilder from './ConnectionBuilder.vue'
import RuntimeComponentsInspector from './RuntimeComponentsInspector.vue'
import WorldComponentsInspector from './WorldComponentsInspector.vue'
import GameplayComponentsInspector from './GameplayComponentsInspector.vue'
import { connectionSharesLayer } from '../world/Connection'
import { Animator, Area2D, AreaEffector2D, AudioListener, AudioSource, BehaviorTree2D, Button, Camera2D, CameraFollow2D, Canvas, CharacterBody2D, Checkbox, Collider2D, Collectible2D, Cooldown2D, DamageHitbox2D, GridMover2D, Health2D, Image as UIImage, Joint2D, Lifetime2D, Light2D, MouseFollower2D, NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, Panel, ParticleEmitter2D, PlatformController2D, Portal2D, ProgressBar, Projectile2D, RectTransform, RigidBody2D, Script2D, ShadowCaster2D, ShapeRenderer2D, Skeleton2D, Slider, Spawner2D, SpriteRenderer2D, StateMachine2D, Text as UIText, TextInput, TextRenderer2D, TileMap2D, TimelinePlayer, TopDownController2D, WorldChunk2D, copyComponentValues, pasteComponentValues, type Component2D, type ComponentKind, type JointKind2D, type ScriptPropertyMetadata, type ScriptPropertyValue } from '../world/components'
import { Transform } from '../world/Transform'
import { setParent, wouldCreateParentCycle } from '../world/hierarchy'
import { applyTranslation, captureTransforms } from '../editor/gizmo'
import { selectionCenter } from '../editor/selection'
import { assetGuid, assetReference, assetState, createTextAsset, importAssetFiles, readTextAsset } from '../assets/AssetDatabase'
import { normalizePhysicsMaterial, PHYSICS_SHAPE_SUPPORT, type PhysicsShapeKind } from '../runtime/physicsProduction'
import { createUuid } from '../world/identity'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { recordEntityProperties } from '../editor/animationStudioState'
import { applyPrefabFromInstance, capturePrefabOverrides, comparePrefabInstance, createPrefabFromEntities, createPrefabVariantFromInstance, prefabConflictReport, resetPrefabOverride, revertPrefabInstance, unpackPrefabInstance } from '../runtime/prefabs'
import { unpackSceneInstance } from '../runtime/sceneInstances'
import { propertyMetadata, type PropertyMetadata } from '../editor/propertyMetadata'
import { componentPaletteMetadata, componentPaletteState, componentPresets, markComponentRecent, saveComponentPreset, toggleComponentFavorite, type ComponentPaletteCategory } from '../editor/componentPalette'
import { componentAuthoringRule, evaluateNumericExpression, validateEntityAuthoring } from '../editor/sceneAuthoring'
import { OFFICIAL_AI_PACKAGE_ID, OFFICIAL_OBJECT_POOL_PACKAGE_ID, packageEnabled } from '../runtime/packages'
import { configureUiAccessibility } from '../runtime/uiAccessibility'
import { pluginRuntime, pluginState, type PluginContributionKind } from '../runtime/plugins'

const InspectorSection = defineComponent({ props: { title: { type: String, required: true }, category: { type: String, default: 'general' }, open: Boolean }, setup(props, { slots }) { return () => h('details', { class: 'inspector-section', open: props.open, style: { display: inspectorSectionVisible(props.title, props.category as InspectorCategory) ? '' : 'none' } }, [h('summary', [h('span', props.title), h('i', '⌄')]), h('div', { class: 'section-body' }, slots.default?.())]) } })
const PropertyRow = defineComponent({ props: { label: { type: String, required: true }, path: { type: String, default: '' } }, setup(props, { slots }) { return () => {
  if (estate.inspectorPinnedOnly && (!props.path || !estate.pinnedInspectorProperties.includes(props.path))) return null
  if (estate.inspectorModifiedOnly && (!props.path || !modifiedPropertyPaths.value.has(props.path))) return null
  const metadata = props.path ? propertyMetadata(props.path) : undefined
  return h('label', { class: ['property-row', { modified: props.path && modifiedPropertyPaths.value.has(props.path), pinned: props.path && estate.pinnedInspectorProperties.includes(props.path) }], 'data-property-path': props.path || undefined, title: metadata?.help, onContextmenu: props.path ? (event: MouseEvent) => openPropertyMenu(event, props.path) : undefined }, [h('span', [props.path && estate.pinnedInspectorProperties.includes(props.path) ? h('i', '★') : null, props.label, metadata?.unit ? h('small', metadata.unit) : null]), h('div', { class: 'property-control' }, slots.default?.())])
} } })
const DiagnosticRow = defineComponent({ props: { label: { type: String, required: true }, value: { type: String, required: true }, active: Boolean }, setup(props) { return () => h('div', { class: ['diagnostic-row', { active: props.active }] }, [h('span', props.label), h('code', props.value)]) } })
const ToggleSwitch = defineComponent({ props: { modelValue: { type: Boolean, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { return () => h('button', { class: ['toggle', { active: props.modelValue }], role: 'switch', 'aria-checked': props.modelValue, onClick: () => { emit('update:modelValue', !props.modelValue); onConfigChange() } }, h('i')) } })
const NumberRange = defineComponent({ props: { modelValue: { type: Number, required: true }, min: { type: Number, required: true }, max: { type: Number, required: true }, step: { type: Number, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { const update = (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)); return () => h('div', { class: 'number-range' }, [h('input', { type: 'range', value: props.modelValue, min: props.min, max: props.max, step: props.step, onInput: update }), h('input', { type: 'number', value: props.modelValue, step: props.step, onChange: update })]) } })
const NumericExpressionInput = defineComponent({ props: { modelValue: { type: Number, required: true }, minimum: { type: Number, default: Number.NEGATIVE_INFINITY }, maximum: { type: Number, default: Number.POSITIVE_INFINITY } }, emits: ['update:modelValue'], setup(props, { emit }) { const draft = ref(String(props.modelValue)); watch(() => props.modelValue, value => { if (document.activeElement?.getAttribute('data-numeric-expression') !== draft.value) draft.value = String(value) }); const commit = () => { const value = evaluateNumericExpression(draft.value, props.modelValue); if (value === null) { draft.value = String(props.modelValue); return } const bounded = Math.min(props.maximum, Math.max(props.minimum, value)); draft.value = String(bounded); emit('update:modelValue', bounded) }; return () => h('input', { value: draft.value, type: 'text', inputmode: 'decimal', 'data-numeric-expression': draft.value, title: t('numericExpressionHelp'), onInput: (event: Event) => { draft.value = (event.target as HTMLInputElement).value }, onChange: commit, onBlur: commit, onKeydown: (event: KeyboardEvent) => { if (event.key === 'Enter') commit() } }) } })
const ComponentTools = defineComponent({
  props: { kind: { type: String, required: true } },
  setup(props) {
    return () => {
      const kind = props.kind as ComponentKind
      const component = selectedEntity.value?.getComponent(kind, true)
      if (!component) return null
      return h('div', { class: 'component-tools' }, [
        kind === 'Transform2D' ? null : h('button', { class: { active: component.enabled }, title: t('componentEnabled'), onClick: () => toggleComponent(kind) }, component.enabled ? 'On' : 'Off'),
        h('button', { title: t('resetComponent'), onClick: () => resetComponent(kind) }, '↻'),
        h('button', { title: t('copyComponent'), onClick: () => copyComponent(kind) }, 'Copy'),
        h('button', { disabled: componentClipboard.value?.kind !== kind, title: t('pasteComponent'), onClick: () => pasteComponent(kind) }, 'Paste'),
        h('button', { title: t('componentPreset'), onClick: () => useComponentPreset(kind) }, componentPresets(kind).length ? 'Preset' : '+Preset'),
        kind === 'Transform2D' ? null : h('button', { title: t('moveComponentUp'), onClick: () => reorderComponent(kind, -1) }, '↑'),
        kind === 'Transform2D' ? null : h('button', { title: t('moveComponentDown'), onClick: () => reorderComponent(kind, 1) }, '↓'),
        kind === 'Transform2D' ? null : h('button', { class: 'danger', title: t('removeComponent'), onClick: () => removeComponent(kind) }, '×')
      ])
    }
  }
})

const pluginInspectorContributions = computed(() => pluginState.contributions.filter(item => ['menus', 'inspectors', 'gizmos', 'components'].includes(item.kind)))
function invokePluginInspector(kind: PluginContributionKind, id: string, pluginId: string): void {
  pluginRuntime.invokeContribution(kind, id, pluginId)
}

const selectedEntities = computed(() => {
  const ids = new Set(state.selectedEntityIds)
  return state.world.entities.filter(entity => ids.has(entity.id))
})
const selectedEntity = computed(() => state.selectedEntityId === null ? null : state.world.entities.find(entity => entity.id === state.selectedEntityId) ?? null)
const physicsMaterialAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'material' && physicsMaterialDocument(asset.uuid)))
const colliderShapeKinds: PhysicsShapeKind[] = ['Box', 'Circle', 'Capsule', 'Segment', 'Chain', 'WorldBoundary', 'ConvexPolygon', 'ConcavePolygon']
const materialCombineModes = ['Average', 'Minimum', 'Maximum', 'Multiply'] as const
const colliderShapeSupport = computed(() => { const model = selectedEntity.value?.collider.shapeModel ?? 'Box'; const support = PHYSICS_SHAPE_SUPPORT[model]; return `${support.simulation}: ${support.note}` })
const colliderShapeModel = computed({ get: () => selectedEntity.value?.collider.shapeModel ?? 'Box', set: (kind: PhysicsShapeKind) => { const entity = selectedEntity.value; if (!entity) return; entity.collider.shapeModel = kind; if (kind === 'WorldBoundary') { entity.rigidBody.bodyType = 'Static'; entity.collider.sensor = false; entity.rigidBody.freezeRotation = true } normalizeEntity(entity); pushHistory('Change collider shape') } })
function addColliderShape() { const collider = selectedEntity.value?.getCollider(); if (!collider || collider.shapes.length >= 7) return; collider.shapes.push({ id: createUuid(), kind: 'Box', offset: { x: 0, y: 0 }, rotation: 0, size: { x: 1, y: 1 }, radius: .5, points: [], enabled: true }); pushHistory('Add collider shape') }
function removeColliderShape(index: number) { const collider = selectedEntity.value?.getCollider(); if (!collider || index < 0 || index >= collider.shapes.length) return; collider.shapes.splice(index, 1); pushHistory('Remove collider shape') }
const collisionMaskNames = computed(() => { const mask = selectedEntity.value?.collider.collisionMask ?? 0; return state.globalSettings.layers.filter(layer => (mask & ((2 ** layer.id) >>> 0)) !== 0).map(layer => layer.name).join(', ') })
const canEdit = computed(() => state.playMode === 'editing')
const selectedConnections = computed(() => selectedEntity.value ? state.world.connections.filter(connection => connection.anchors.some(anchor => anchor.entityId === selectedEntity.value!.id)) : [])
const entityColor = computed(() => selectedEntity.value ? `rgb(${selectedEntity.value.color.r}, ${selectedEntity.value.color.g}, ${selectedEntity.value.color.b})` : 'transparent')
const selectedEntityArea = computed(() => selectedEntity.value ? entityArea(selectedEntity.value) : 0)
const effectiveEntityInertia = computed(() => selectedEntity.value ? effectiveInertia(selectedEntity.value) : 0)
const componentClipboard = ref<{ kind: ComponentKind; values: Record<string, unknown> } | null>(null)
const modifiedPropertyPaths = ref(new Set<string>())
const propertyClipboard = ref<Array<string | number | boolean> | null>(null)
const propertyMenu = reactive({ visible: false, x: 0, y: 0, path: '', row: null as HTMLElement | null })
const currentPropertyMetadata = computed<PropertyMetadata | undefined>(() => propertyMetadata(propertyMenu.path))
const isCurrentPropertyPinned = computed(() => estate.pinnedInspectorProperties.includes(propertyMenu.path))
const props = withDefaults(defineProps<{ dock?: 'left' | 'right' }>(), { dock: 'right' })
const dock = computed(() => props.dock)
const panelWidth = ref(estate.inspectorWidth)
const imageAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const fontAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'font'))
const scriptAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'script' || asset.assetType === 'visualScript'))
const pathAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'path'))
const pathPointsText = computed(() => selectedEntity.value?.authoring.path.points.map(point => `${point.x},${point.y}`).join(' ') ?? '')
const pathTangentsText = computed(() => selectedEntity.value?.authoring.path.tangents.map(tangent => `${tangent.incoming.x},${tangent.incoming.y}:${tangent.outgoing.x},${tangent.outgoing.y}`).join(' ') ?? '')
const scriptPropertyGroups = computed(() => {
  const script = selectedEntity.value?.script2D
  if (!script) return []
  const groups = new Map<string, Array<{ name: string; value: ScriptPropertyValue; metadata: ScriptPropertyMetadata | null }>>()
  for (const [name, value] of Object.entries(script.properties)) {
    const metadata = script.propertyMetadata[name] ?? null, group = metadata?.group || t('script2D')
    groups.set(group, [...(groups.get(group) ?? []), { name, value, metadata }])
  }
  return [...groups].map(([name, properties]) => ({ name, properties }))
})
const materialAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'material'))

function compatibleScriptResources(resourceType: string) {
  const expected: Record<string, string[]> = { Texture2D: ['image'], AudioClip: ['audio'], Font: ['font'], Scene: ['scene'], Prefab: ['prefab'], AnimationClip: ['animation'], AnimatorController: ['controller'], Material: ['material'], Script: ['script'] }
  const types = expected[resourceType] ?? []
  return types.length ? assetState.records.filter(asset => types.includes(asset.assetType)) : assetState.records
}
const optionalComponents: ComponentKind[] = ['SpriteRenderer2D', 'TextRenderer2D', 'Camera2D', 'Light2D', 'ShadowCaster2D', 'Script2D', 'Animator', 'Skeleton2D', 'TimelinePlayer', 'AudioSource', 'AudioListener', 'Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'ParticleEmitter2D', 'CharacterBody2D', 'GridMover2D', 'PlatformController2D', 'TopDownController2D', 'Health2D', 'DamageHitbox2D', 'Collectible2D', 'Projectile2D', 'Spawner2D', 'Cooldown2D', 'Lifetime2D', 'MouseFollower2D', 'CameraFollow2D', 'Area2D', 'AreaEffector2D', 'NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D', 'BehaviorTree2D', 'StateMachine2D', 'WorldChunk2D', 'Portal2D', 'ObjectPool2D', 'FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D']
const inspectorCategories = [
  { id: 'all' as const, label: 'all' as const }, { id: 'general' as const, label: 'categoryGeneral' as const },
  { id: 'transform' as const, label: 'categoryTransform' as const }, { id: 'render' as const, label: 'categoryRendering' as const },
  { id: 'physics' as const, label: 'categoryPhysics' as const }, { id: 'gameplay' as const, label: 'categoryGameplay' as const },
  { id: 'ui' as const, label: 'categoryUi' as const }
]
const componentSearch = ref('')
const componentSearchInput = ref<HTMLInputElement | null>(null)
const addableComponents = computed(() => {
  if (!selectedEntity.value) return []
  const removed = [...selectedEntity.value.componentMap.values()].filter(component => component.removed && component.kind !== 'Transform2D').map(component => component.kind)
  const packageAvailable = (kind: ComponentKind) => !['BehaviorTree2D', 'StateMachine2D'].includes(kind) ? kind !== 'ObjectPool2D' || packageEnabled(OFFICIAL_OBJECT_POOL_PACKAGE_ID) : packageEnabled(OFFICIAL_AI_PACKAGE_ID)
  const missing = optionalComponents.filter(kind => packageAvailable(kind) && !selectedEntity.value!.componentMap.has(kind))
  return [...new Set([...removed, ...missing])]
})
const filteredAddableComponents = computed(() => {
  const needle = componentSearch.value.trim().toLocaleLowerCase()
  return addableComponents.value.filter(kind => !needle || `${componentTitle(kind)} ${kind} ${t(componentCategoryLabel(componentCategory(kind)))}`.toLocaleLowerCase().includes(needle))
})
const componentGroups = computed(() => {
  const groups: Array<{ name: string; kinds: ComponentKind[] }> = []
  const append = (name: string, source: ComponentKind[]) => { const kinds = source.filter(kind => filteredAddableComponents.value.includes(kind)); if (kinds.length) groups.push({ name, kinds }) }
  if (!componentSearch.value.trim()) { append(t('favorites'), componentPaletteState.favorites); append(t('recentlyUsed'), componentPaletteState.recent.filter(kind => !componentPaletteState.favorites.includes(kind))) }
  for (const category of ['Core', '2D', 'Physics', 'Gameplay', 'UI', 'Audio', 'Camera', 'Navigation', 'Script', 'Packages'] as ComponentPaletteCategory[]) append(category, filteredAddableComponents.value.filter(kind => componentPaletteMetadata(kind).category === category))
  return groups
})
const coreInspectorSections = computed(() => {
  if (!selectedEntity.value) return []
  const entity = selectedEntity.value
  return [
    [t('entitySettings'), 'general'], [t('connections'), 'physics'], [t('transform2D'), 'transform'],
    entity.hasComponent('ShapeRenderer2D') && !entity.hasComponent('RectTransform') ? [t('shapeRenderer2D'), 'render'] : null,
    entity.spriteRenderer ? [t('spriteRenderer2D'), 'render'] : null, entity.textRenderer ? [t('textRenderer2D'), 'render'] : null,
    entity.camera2D ? [t('camera2D'), 'render'] : null, entity.script2D ? [t('script2D'), 'gameplay'] : null,
    entity.hasComponent('RigidBody2D') ? [t('rigidBody2D'), 'physics'] : null, entity.getCollider() ? [t('collider2D'), 'physics'] : null
  ].filter((entry): entry is [string, string] => entry !== null)
})
const inspectorHasMatches = computed(() => {
  if (coreInspectorSections.value.some(([title, category]) => inspectorSectionVisible(title, category as InspectorCategory))) return true
  if (!selectedEntity.value) return false
  return [...selectedEntity.value.componentMap.values()].some(component => !component.removed && inspectorSectionVisible(componentTitle(component.kind), componentCategory(component.kind)))
})

function inspectorSectionVisible(title: string, category: InspectorCategory): boolean {
  if (estate.inspectorCategory !== 'all' && estate.inspectorCategory !== category) return false
  const needle = estate.inspectorSearch.trim().toLocaleLowerCase()
  return !needle || title.toLocaleLowerCase().includes(needle)
}

function componentCategory(kind: ComponentKind): InspectorCategory {
  if (['Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput'].includes(kind)) return 'ui'
  if (['SpriteRenderer2D', 'TextRenderer2D', 'Camera2D', 'TileMap2D', 'ParticleEmitter2D', 'Light2D', 'ShadowCaster2D'].includes(kind)) return 'render'
  if (['Area2D'].includes(kind)) return 'physics'
  if (kind.endsWith('Joint2D')) return 'physics'
  return 'gameplay'
}
function componentCategoryLabel(category: InspectorCategory): 'categoryGeneral' | 'categoryTransform' | 'categoryRendering' | 'categoryPhysics' | 'categoryGameplay' | 'categoryUi' {
  const labels: Record<InspectorCategory, 'categoryGeneral' | 'categoryTransform' | 'categoryRendering' | 'categoryPhysics' | 'categoryGameplay' | 'categoryUi'> = { general: 'categoryGeneral', transform: 'categoryTransform', render: 'categoryRendering', physics: 'categoryPhysics', gameplay: 'categoryGameplay', ui: 'categoryUi', all: 'categoryGeneral' }
  return labels[category]
}
function componentGlyph(kind: ComponentKind): string {
  const category = componentCategory(kind)
  return ({ ui: '▣', render: '◇', physics: '◎', gameplay: '{}', general: '•', transform: '↗', all: '•' })[category]
}
function openComponentPicker(): void {
  componentSearch.value = ''
  estate.componentPickerOpen = true
  void nextTick(() => componentSearchInput.value?.focus())
}
function closeComponentPicker(): void { estate.componentPickerOpen = false }
function chooseComponent(kind: ComponentKind): void { addComponent(kind); markComponentRecent(kind); closeComponentPicker() }
const parentCandidates = computed(() => selectedEntity.value
  ? state.world.entities.filter(entity => entity !== selectedEntity.value && !wouldCreateParentCycle(selectedEntity.value!, entity.uuid, state.world.entities))
  : [])
const selectedParentUuid = computed({
  get: () => selectedEntity.value?.parentUuid ?? '',
  set: value => {
    if (!selectedEntity.value) return
    if (setParent(selectedEntity.value, value || null, state.world.entities)) pushHistory()
  }
})
const tagsText = computed({
  get: () => selectedEntity.value?.tags.join(', ') ?? '',
  set: value => {
    if (!selectedEntity.value) return
    selectedEntity.value.tags = [...new Set(value.split(',').map(tag => tag.trim()).filter(Boolean))].slice(0, 32)
  }
})
const groupsText = computed({
  get: () => selectedEntity.value?.groups.join(', ') ?? '',
  set: value => { if (selectedEntity.value) selectedEntity.value.groups = cleanList(value) }
})
function cleanList(value: string): string[] { return [...new Set(value.split(',').map(item => item.trim()).filter(Boolean))].slice(0, 32) }
const prefabOverrideCount = computed(() => selectedEntity.value ? Object.keys(selectedEntity.value.prefabOverrides).length : 0)
const prefabComparison = computed(() => selectedEntity.value?.prefabAsset ? comparePrefabInstance(selectedEntity.value) : [])
const prefabConflicts = computed(() => selectedEntity.value ? prefabConflictReport(selectedEntity.value) : [])
const selectedValidation = computed(() => selectedEntity.value ? validateEntityAuthoring(selectedEntity.value, state.world.entities) : [])

function componentTitle(kind: ComponentKind): string {
  if (kind === 'Transform2D') return t('transform2D')
  if (kind === 'ShapeRenderer2D') return t('shapeRenderer2D')
  if (kind === 'SpriteRenderer2D') return t('spriteRenderer2D')
  if (kind === 'TextRenderer2D') return t('textRenderer2D')
  if (kind === 'Camera2D') return t('camera2D')
  if (kind === 'Script2D') return t('script2D')
  if (kind === 'RigidBody2D') return t('rigidBody2D')
  if (kind === 'Animator') return t('animator')
  if (kind === 'Skeleton2D') return t('skeleton2D')
  if (kind === 'TimelinePlayer') return t('timelinePlayer')
  if (kind === 'AudioSource') return t('audioSource')
  if (kind === 'AudioListener') return t('audioListener')
  if (kind === 'RectTransform') return t('rectTransform')
  if (kind === 'Canvas') return t('uiCanvas')
  if (kind === 'Panel') return t('uiPanel')
  if (kind === 'Image') return t('uiImage')
  if (kind === 'Text') return t('uiText')
  if (kind === 'Button') return t('uiButton')
  if (kind === 'Slider') return t('uiSlider')
  if (kind === 'ProgressBar') return t('uiProgressBar')
  if (kind === 'Checkbox') return t('uiCheckbox')
  if (kind === 'TextInput') return t('uiTextInput')
  if (kind === 'TileMap2D') return t('tileMap2D')
  if (kind === 'ParticleEmitter2D') return t('particleEmitter2D')
  if (kind === 'Light2D') return t('light2D')
  if (kind === 'ShadowCaster2D') return t('shadowCaster2D')
  if (kind === 'CharacterBody2D') return t('characterBody2D')
  if (kind === 'Area2D') return t('area2D')
  if (kind === 'AreaEffector2D') return t('areaEffector2D')
  if (kind === 'NavigationRegion2D') return t('navigationRegion2D')
  if (kind === 'NavigationObstacle2D') return t('navigationObstacle2D')
  if (kind === 'NavigationAgent2D') return t('navigationAgent2D')
  if (kind === 'BehaviorTree2D') return t('behaviorTree2D')
  if (kind === 'StateMachine2D') return t('stateMachine2D')
  if (kind === 'GridMover2D') return t('gridMover2D')
  if (kind === 'PlatformController2D') return t('platformController2D')
  if (kind === 'TopDownController2D') return t('topDownController2D')
  if (kind === 'Health2D') return t('health2D')
  if (kind === 'DamageHitbox2D') return t('damageHitbox2D')
  if (kind === 'Collectible2D') return t('collectible2D')
  if (kind === 'Projectile2D') return t('projectile2D')
  if (kind === 'Spawner2D') return t('spawner2D')
  if (kind === 'Cooldown2D') return t('cooldown2D')
  if (kind === 'Lifetime2D') return t('lifetime2D')
  if (kind === 'MouseFollower2D') return t('mouseFollower2D')
  if (kind === 'CameraFollow2D') return t('cameraFollow2D')
  if (kind === 'WorldChunk2D') return t('worldChunk2D')
  if (kind === 'Portal2D') return t('portal2D')
  if (kind === 'ObjectPool2D') return t('objectPool2D')
  if (kind.endsWith('Joint2D')) return t(kind as Parameters<typeof t>[0])
  return t('collider2D')
}

function newOptionalComponent(kind: ComponentKind): Component2D | null {
  if (kind === 'Animator') return new Animator()
  if (kind === 'Skeleton2D') return new Skeleton2D()
  if (kind === 'TimelinePlayer') return new TimelinePlayer()
  if (kind === 'AudioSource') return new AudioSource()
  if (kind === 'AudioListener') return new AudioListener()
  if (kind === 'Canvas') return new Canvas()
  if (kind === 'RectTransform') return new RectTransform()
  if (kind === 'Panel') return new Panel()
  if (kind === 'Image') return new UIImage()
  if (kind === 'Text') return new UIText()
  if (kind === 'Button') return new Button()
  if (kind === 'Slider') return new Slider()
  if (kind === 'ProgressBar') return new ProgressBar()
  if (kind === 'Checkbox') return new Checkbox()
  if (kind === 'TextInput') return new TextInput()
  if (kind === 'TileMap2D') return new TileMap2D()
  if (kind === 'ParticleEmitter2D') return new ParticleEmitter2D()
  if (kind === 'Light2D') return new Light2D()
  if (kind === 'ShadowCaster2D') return new ShadowCaster2D()
  if (kind === 'CharacterBody2D') return new CharacterBody2D()
  if (kind === 'Area2D') return new Area2D()
  if (kind === 'AreaEffector2D') return new AreaEffector2D()
  if (kind === 'NavigationRegion2D') return new NavigationRegion2D()
  if (kind === 'NavigationObstacle2D') return new NavigationObstacle2D()
  if (kind === 'NavigationAgent2D') return new NavigationAgent2D()
  if (kind === 'BehaviorTree2D') return new BehaviorTree2D()
  if (kind === 'StateMachine2D') return new StateMachine2D()
  if (kind === 'GridMover2D') return new GridMover2D()
  if (kind === 'PlatformController2D') return new PlatformController2D()
  if (kind === 'TopDownController2D') return new TopDownController2D()
  if (kind === 'Health2D') return new Health2D()
  if (kind === 'DamageHitbox2D') return new DamageHitbox2D()
  if (kind === 'Collectible2D') return new Collectible2D()
  if (kind === 'Projectile2D') return new Projectile2D()
  if (kind === 'Spawner2D') return new Spawner2D()
  if (kind === 'Cooldown2D') return new Cooldown2D()
  if (kind === 'Lifetime2D') return new Lifetime2D()
  if (kind === 'MouseFollower2D') return new MouseFollower2D()
  if (kind === 'CameraFollow2D') return new CameraFollow2D()
  if (kind === 'WorldChunk2D') return new WorldChunk2D()
  if (kind === 'Portal2D') return new Portal2D()
  if (kind === 'ObjectPool2D') return new ObjectPool2D()
  if (kind.endsWith('Joint2D')) return new Joint2D(kind as JointKind2D)
  return null
}
function toggleComponent(kind: ComponentKind) {
  const component = selectedEntity.value?.getComponent(kind, true)
  if (!component || kind === 'Transform2D') return
  component.enabled = !component.enabled
  pushHistory()
}
function reorderComponent(kind: ComponentKind, direction: -1 | 1) {
  const entity = selectedEntity.value; if (!entity || kind === 'Transform2D') return
  const entries = [...entity.componentMap.entries()], index = entries.findIndex(([candidate]) => candidate === kind), destination = index + direction
  if (index < 0 || destination < 1 || destination >= entries.length) return
  const [entry] = entries.splice(index, 1); entries.splice(destination, 0, entry)
  entity.componentMap.clear(); for (const [entryKind, component] of entries) entity.componentMap.set(entryKind, component)
  pushHistory('Reorder component', `components:${entity.uuid}`)
}

function propertyControls(row: HTMLElement | null): Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement> {
  return row ? [...row.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input,select,textarea,button[role="switch"]')] : []
}
function readControl(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement): string | number | boolean {
  if (control instanceof HTMLButtonElement) return control.getAttribute('aria-checked') === 'true'
  if (control instanceof HTMLInputElement && control.type === 'checkbox') return control.checked
  if (control instanceof HTMLInputElement && (control.type === 'number' || control.type === 'range')) return Number(control.value)
  return control.value
}
function writeControl(control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement, value: string | number | boolean): void {
  if (control instanceof HTMLButtonElement) { if ((control.getAttribute('aria-checked') === 'true') !== Boolean(value)) control.click(); return }
  if (control instanceof HTMLInputElement && control.type === 'checkbox') control.checked = Boolean(value)
  else control.value = String(value)
  control.dispatchEvent(new Event('input', { bubbles: true })); control.dispatchEvent(new Event('change', { bubbles: true }))
}
function openPropertyMenu(event: MouseEvent, path: string) { event.preventDefault(); propertyMenu.visible = true; propertyMenu.x = Math.min(event.clientX, window.innerWidth - 230); propertyMenu.y = Math.min(event.clientY, window.innerHeight - 330); propertyMenu.path = path; propertyMenu.row = event.currentTarget as HTMLElement }
function closePropertyMenu() { propertyMenu.visible = false; propertyMenu.row = null }
function resetPropertyValue() { const metadata = currentPropertyMetadata.value, controls = propertyControls(propertyMenu.row); if (!metadata) return; controls.forEach((control, index) => writeControl(control, metadata.defaults[Math.min(index, metadata.defaults.length - 1)])); modifiedPropertyPaths.value.delete(propertyMenu.path); modifiedPropertyPaths.value = new Set(modifiedPropertyPaths.value); pushHistory('Reset property', `property:${propertyMenu.path}`); closePropertyMenu() }
function revertPropertyOverride() { const entity = selectedEntity.value; if (entity?.prefabAsset) resetPrefabOverride(entity, propertyMenu.path); modifiedPropertyPaths.value.delete(propertyMenu.path); modifiedPropertyPaths.value = new Set(modifiedPropertyPaths.value); pushHistory('Revert property override', `property:${propertyMenu.path}`); closePropertyMenu() }
function copyPropertyValue() { propertyClipboard.value = propertyControls(propertyMenu.row).map(readControl); closePropertyMenu() }
function pastePropertyValue() { const values = propertyClipboard.value; if (!values) return; propertyControls(propertyMenu.row).forEach((control, index) => writeControl(control, values[Math.min(index, values.length - 1)])); modifiedPropertyPaths.value.add(propertyMenu.path); modifiedPropertyPaths.value = new Set(modifiedPropertyPaths.value); pushHistory('Paste property value', `property:${propertyMenu.path}`); closePropertyMenu() }
function copyPropertyPath() { void navigator.clipboard?.writeText(propertyMenu.path).catch(() => undefined); estate.statusText = propertyMenu.path; closePropertyMenu() }
function keyframeProperty() { if (selectedEntity.value) { recordEntityProperties([selectedEntity.value]); estate.bottomPanelTab = 'animation'; estate.bottomPanelOpen = true; estate.statusText = t('propertyKeyframed') } closePropertyMenu() }
function togglePropertyPin() { const index = estate.pinnedInspectorProperties.indexOf(propertyMenu.path); if (index >= 0) estate.pinnedInspectorProperties.splice(index, 1); else estate.pinnedInspectorProperties.push(propertyMenu.path); closePropertyMenu() }
function copyComponent(kind: ComponentKind) {
  const component = selectedEntity.value?.getComponent(kind, true)
  if (!component) return
  componentClipboard.value = { kind, values: copyComponentValues(component) }
  estate.statusText = t('componentCopied')
}
function pasteComponent(kind: ComponentKind) {
  const component = selectedEntity.value?.getComponent(kind, true)
  if (!component || componentClipboard.value?.kind !== kind) return
  pasteComponentValues(component, componentClipboard.value.values)
  normalizeEntity(selectedEntity.value!)
  pushHistory()
  estate.statusText = t('componentPasted')
}
function useComponentPreset(kind: ComponentKind) {
  const component = selectedEntity.value?.getComponent(kind, true)
  if (!component) return
  const existing = componentPresets(kind)[0]
  if (existing) { pasteComponentValues(component, existing.values); normalizeEntity(selectedEntity.value!); pushHistory(`Apply ${kind} preset`, `component:${selectedEntity.value!.uuid}:${kind}`); estate.statusText = t('componentPresetApplied'); return }
  saveComponentPreset(kind, `${selectedEntity.value?.name ?? kind} ${kind}`, copyComponentValues(component))
  estate.statusText = t('componentPresetSaved')
}
function resetComponent(kind: ComponentKind) {
  const entity = selectedEntity.value
  const component = entity?.getComponent(kind, true)
  if (!entity || !component) return
  if (component instanceof Transform) pasteComponentValues(component, copyComponentValues(new Transform()))
  else if (component instanceof ShapeRenderer2D) {
    const fresh = new ShapeRenderer2D(component.shape)
    fresh.vertices = component.vertices.map(vertex => ({ ...vertex }))
    fresh.radiusX = component.radiusX
    fresh.radiusY = component.radiusY
    pasteComponentValues(component, copyComponentValues(fresh))
  } else if (component instanceof SpriteRenderer2D) pasteComponentValues(component, copyComponentValues(new SpriteRenderer2D()))
  else if (component instanceof TextRenderer2D) pasteComponentValues(component, copyComponentValues(new TextRenderer2D()))
  else if (component instanceof Camera2D) pasteComponentValues(component, copyComponentValues(new Camera2D()))
  else if (component instanceof Script2D) pasteComponentValues(component, copyComponentValues(new Script2D()))
  else if (component instanceof RigidBody2D) pasteComponentValues(component, copyComponentValues(new RigidBody2D()))
  else if (component instanceof Collider2D) {
    const fresh = new Collider2D(component.kind)
    fresh.size = { ...component.size }
    fresh.vertices = component.vertices.map(vertex => ({ ...vertex }))
    fresh.radiusX = component.radiusX
    fresh.radiusY = component.radiusY
    pasteComponentValues(component, copyComponentValues(fresh))
  } else {
    const fresh = newOptionalComponent(kind)
    if (fresh) pasteComponentValues(component, copyComponentValues(fresh))
  }
  component.enabled = true
  component.removed = false
  normalizeEntity(entity)
  pushHistory()
  estate.statusText = t('componentReset')
}
async function removeComponent(kind: ComponentKind) {
  const entity = selectedEntity.value
  if (!entity || kind === 'Transform2D') return
  const approved = await requestConfirmation({ title: t('removeComponent'), message: `${t('removeComponent')}: ${componentTitle(kind)}?`, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
  if (!approved || !entity.removeComponent(kind)) return
  pushHistory()
  estate.statusText = t('componentRemoved')
}
function addRemovedComponent(kind: ComponentKind) {
  const component = selectedEntity.value?.getComponent(kind, true)
  if (!component) return
  component.removed = false
  component.enabled = true
  pushHistory()
  estate.statusText = t('componentAdded')
}
function addComponent(kind: ComponentKind) {
  const entity = selectedEntity.value
  if (!entity) return
  const existing = entity.getComponent(kind, true)
  if (existing) { addRemovedComponent(kind); return }
  const rule = componentAuthoringRule(kind)
  if (rule.conflicts.some(conflict => entity.hasComponent(conflict))) { estate.statusText = t('componentConflictWarning', { component: kind, conflict: rule.conflicts.find(conflict => entity.hasComponent(conflict)) ?? '' }); return }
  if (kind === 'SpriteRenderer2D') { const component = entity.addComponent(new SpriteRenderer2D()); component.sortingLayer = entity.layer }
  else if (kind === 'TextRenderer2D') { const component = entity.addComponent(new TextRenderer2D()); component.sortingLayer = entity.layer }
  else if (kind === 'Camera2D') entity.addComponent(new Camera2D())
  else if (kind === 'Script2D') entity.addComponent(new Script2D())
  else {
    const component = newOptionalComponent(kind)
    if (!component) return
    entity.addComponent(component)
    if (kind === 'CharacterBody2D') {
      const body = entity.getComponent<RigidBody2D>('RigidBody2D', true) ?? entity.addComponent(new RigidBody2D())
      body.removed = false; body.enabled = true; body.bodyType = 'Kinematic'; body.gravityScale = 0
    }
    if (kind === 'Area2D') {
      const collider = entity.getCollider(true)
      if (collider) { collider.removed = false; collider.enabled = true; collider.sensor = true }
    }
  }
  for (const dependency of rule.required) if (!entity.hasComponent(dependency)) addComponent(dependency)
  if (kind === 'Button' || kind === 'Slider' || kind === 'Checkbox' || kind === 'TextInput') {
    const rect = entity.getComponent<RectTransform>('RectTransform')
    if (rect) rect.skipNavigation = false
  }
  configureUiAccessibility(entity, state.world.entities)
  normalizeEntity(entity)
  pushHistory('Add component', `component:${entity.uuid}:${kind}`)
  estate.statusText = t('componentAdded')
}

const builderOpen = ref(false)
const editingConnectionId = ref<number | null>(null)
function openConnection(id: number | null) { editingConnectionId.value = id; builderOpen.value = true }
async function confirmConnectionAction(title: string, message: string): Promise<boolean> { return !prefs.confirmDestructiveActions || requestConfirmation({ title, message, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true }) }
async function removeConnection(id: number) { if (!await confirmConnectionAction(t('deleteConnectionTitle'), t('confirmConnectionDelete'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('connectionDeleted') }
async function separate(id: number) { if (!await confirmConnectionAction(t('separateBindingTitle'), t('confirmSeparateBinding'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('bindingSeparated') }
function repair(id: number) { repairConnection(id); pushHistory() }

function onConfigChange(event?: Event) { if (!canEdit.value || !selectedEntity.value) return; const path = (event?.target as HTMLElement | null)?.closest<HTMLElement>('[data-property-path]')?.dataset.propertyPath; if (path) { modifiedPropertyPaths.value.add(path); modifiedPropertyPaths.value = new Set(modifiedPropertyPaths.value) } if (selectedEntity.value.isStatic) selectedEntity.value.isKinematic = false; normalizeEntity(selectedEntity.value); if (selectedEntity.value.prefabAsset) capturePrefabOverrides(selectedEntity.value); recordEntityProperties([selectedEntity.value]); pushHistory('Set property', `property:${selectedEntity.value.uuid}`) }
function physicsMaterialDocument(uuid: string) { const source = readTextAsset(uuid); if (!source) return null; try { const value = JSON.parse(source) as Record<string, unknown>; return value.format === 'nova-physics-material' ? normalizePhysicsMaterial(value) : null } catch { return null } }
function physicsMaterialName(uuid: string) { return physicsMaterialDocument(uuid)?.name ?? t('physicsMaterial') }
function applySelectedPhysicsMaterial() { const entity = selectedEntity.value; if (!entity?.collider.materialAsset) return; const material = physicsMaterialDocument(entity.collider.materialAsset.replace(/^asset:\/\//, '')); if (!material) return; Object.assign(entity.collider.material, material); if (entity.rigidBody.massMode === 'Automatic') entity.rigidBody.density = material.density; onConfigChange() }
function setAuthoringOrder(value: number) { const entity = selectedEntity.value; if (!entity || !Number.isFinite(value)) return; entity.authoring.zOrder = Math.trunc(value) }
function setAuthoringLayer(value: number) { const entity = selectedEntity.value; if (!entity || !estate.layers.includes(value)) return; entity.layer = value; entity.authoring.renderLayer = value; estate.activeLayer = value }
function updatePathPoints(event: Event) { const entity = selectedEntity.value; if (!entity) return; const points = (event.target as HTMLTextAreaElement).value.trim().split(/\s+/).flatMap(pair => { const [x, y] = pair.split(',').map(Number); return Number.isFinite(x) && Number.isFinite(y) ? [{ x, y }] : [] }).slice(0, 10_000); if (points.length < 2) return; entity.authoring.path.points = points; entity.renderer.vertices = points.map(point => ({ ...point })); entity.authoring.path.tangents = entity.authoring.path.tangents.slice(0, points.length); onConfigChange(event) }
function updatePathTangents(event: Event) { const entity = selectedEntity.value; if (!entity) return; entity.authoring.path.tangents = (event.target as HTMLTextAreaElement).value.trim().split(/\s+/).flatMap(pair => { const [incoming, outgoing] = pair.split(':'); const [ix, iy] = (incoming ?? '').split(',').map(Number), [ox, oy] = (outgoing ?? '').split(',').map(Number); return [ix, iy, ox, oy].every(Number.isFinite) ? [{ incoming: { x: ix, y: iy }, outgoing: { x: ox, y: oy } }] : [] }).slice(0, entity.authoring.path.points.length); onConfigChange(event) }
function pathDocument(source: string) { try { const value = JSON.parse(source) as Record<string, unknown>; if (value.format !== 'nova-path-2d' || value.version !== 1 || !Array.isArray(value.points)) return null; return value } catch { return null } }
function loadSelectedPathAsset() { const entity = selectedEntity.value, source = readTextAsset(entity?.authoring.path.asset); if (!entity || !source) return; const document = pathDocument(source); if (!document) { estate.statusText = t('invalidPathAsset'); return } const points = (document.points as Array<Record<string, unknown>>).slice(0, 10_000).map(point => ({ x: finiteNumber(point.x), y: finiteNumber(point.y) })); if (points.length < 2) return; entity.authoring.path.points = points; entity.authoring.path.closed = document.closed === true; entity.authoring.path.smoothing = Math.min(1, Math.max(0, finiteNumber(document.smoothing, .5))); entity.authoring.path.tangents = Array.isArray(document.tangents) ? (document.tangents as Array<Record<string, Record<string, unknown>>>).slice(0, points.length).map(tangent => ({ incoming: { x: finiteNumber(tangent.incoming?.x), y: finiteNumber(tangent.incoming?.y) }, outgoing: { x: finiteNumber(tangent.outgoing?.x), y: finiteNumber(tangent.outgoing?.y) } })) : []; entity.renderer.vertices = points.map(point => ({ ...point })); pushHistory('Load reusable path', `path:${entity.uuid}`) }
function saveSelectedPathAsset() { const entity = selectedEntity.value; if (!entity || entity.authoring.path.points.length < 2) return; const source = JSON.stringify({ format: 'nova-path-2d', version: 1, closed: entity.authoring.path.closed, smoothing: entity.authoring.path.smoothing, points: entity.authoring.path.points, tangents: entity.authoring.path.tangents }, null, 2); const asset = createTextAsset(`${entity.name} Path`, 'path', source, 'Assets/Paths'); entity.authoring.path.asset = assetReference(asset.uuid); assetState.selectedGuid = asset.uuid; pushHistory('Save reusable path', `path:${entity.uuid}`); estate.statusText = t('reusablePathSaved') }
function synchronizeScriptProperties() {
  if (!selectedEntity.value?.script2D) return
  const error = gameplayRuntime.synchronizeExports(selectedEntity.value)
  estate.statusText = error ?? t('scriptPropertiesUpdated')
  if (!error) pushHistory('Refresh script properties')
}
function setScriptProperty(name: string, value: ScriptPropertyValue) {
  if (!selectedEntity.value?.script2D) return
  selectedEntity.value.script2D.properties[name] = value
  onConfigChange()
}
function isScriptVec2(value: ScriptPropertyValue): value is [number, number] { return Array.isArray(value) && value.length === 2 && value.every(item => typeof item === 'number' && Number.isFinite(item)) }
function scriptDataText(value: ScriptPropertyValue): string { try { return JSON.stringify(value, null, 2) } catch { return 'null' } }
function setScriptVectorPart(name: string, index: 0 | 1, event: Event) { const value = selectedEntity.value?.script2D?.properties[name]; if (value === undefined || !isScriptVec2(value)) return; const number = Number((event.target as HTMLInputElement).value); if (!Number.isFinite(number)) return; const next: [number, number] = [value[0], value[1]]; next[index] = number; setScriptProperty(name, next) }
function setScriptDataProperty(name: string, event: Event) { try { const value = JSON.parse((event.target as HTMLTextAreaElement).value) as ScriptPropertyValue; setScriptProperty(name, value); estate.statusText = t('scriptPropertiesUpdated') } catch { estate.statusText = t('invalidGraphData') } }
function createSelectedPrefab() {
  if (!selectedEntity.value) return
  const reference = createPrefabFromEntities([selectedEntity.value.id], selectedEntity.value.name)
  estate.statusText = reference ? t('prefabCreated') : t('prefabFailed')
}
function applySelectedPrefab() { if (selectedEntity.value && applyPrefabFromInstance(selectedEntity.value)) estate.statusText = t('prefabApplied') }
function revertSelectedPrefab() { if (selectedEntity.value && revertPrefabInstance(selectedEntity.value)) estate.statusText = t('prefabReverted') }
function unpackSelectedPrefab() { if (selectedEntity.value && unpackPrefabInstance(selectedEntity.value)) estate.statusText = t('prefabUnpacked') }
function createSelectedPrefabVariant() { const entity = selectedEntity.value; if (!entity) return; const reference = createPrefabVariantFromInstance(entity); estate.statusText = reference ? t('prefabVariantCreated') : t('prefabFailed') }
function locateSelectedPrefab() { const guid = assetGuid(selectedEntity.value?.prefabAsset); if (!guid) return; assetState.selectedGuid = guid; estate.bottomPanelTab = 'assets'; estate.bottomPanelVisible = true; estate.bottomPanelOpen = true; estate.statusText = selectedEntity.value?.prefabAsset ?? '' }
function resetSelectedPrefabOverride(path: string) { if (selectedEntity.value && resetPrefabOverride(selectedEntity.value, path)) estate.statusText = t('prefabOverrideReset') }
function unpackSelectedScene() { if (selectedEntity.value && unpackSceneInstance(selectedEntity.value)) estate.statusText = t('sceneUnpacked') }
function onLayerChange() { if (selectedEntity.value) estate.activeLayer = selectedEntity.value.layer }
const bodyType = computed({ get: () => !selectedEntity.value ? 'Dynamic' : selectedEntity.value.isStatic ? 'Static' : selectedEntity.value.isKinematic ? 'Kinematic' : 'Dynamic', set: value => { if (!selectedEntity.value) return; selectedEntity.value.isStatic = value === 'Static'; selectedEntity.value.isKinematic = value === 'Kinematic'; normalizeEntity(selectedEntity.value) } })
function onDensityChange() { if (selectedEntity.value) { selectedEntity.value.rigidBody.massMode = 'Automatic'; syncMassFromDensity(selectedEntity.value) } }
function onMassChange() { if (selectedEntity.value) { selectedEntity.value.rigidBody.massMode = 'Manual'; syncDensityFromMass(selectedEntity.value) } }
watch(selectedEntityArea, area => { if (selectedEntity.value && area > MIN_AREA && selectedEntity.value.rigidBody.massMode === 'Automatic') syncMassFromDensity(selectedEntity.value) })

const textureInput = ref<HTMLInputElement | null>(null)
async function applyTexture(event: Event) { const entity = selectedEntity.value; const file = (event.target as HTMLInputElement).files?.[0]; if (!entity || !file) return; try { const [asset] = await importAssetFiles([file], 'Assets/Sprites'); if (!asset) return; entity.renderer.textureAsset = assetReference(asset.uuid); entity.texture = null; entity.textureImage = undefined; pushHistory('Import texture asset') } catch { estate.statusText = t('textureFailed') } }
function clearTexture() { if (!selectedEntity.value) return; selectedEntity.value.renderer.textureAsset = null; selectedEntity.value.texture = null; selectedEntity.value.textureImage = undefined; if (textureInput.value) textureInput.value.value = ''; pushHistory() }
function rgbHex(color: { r: number; g: number; b: number }): string { return `#${[color.r, color.g, color.b].map(value => Math.min(255, Math.max(0, Math.round(value))).toString(16).padStart(2, '0')).join('')}` }
function setRgb(target: { r: number; g: number; b: number }, event: Event) { const value = Number.parseInt((event.target as HTMLInputElement).value.slice(1), 16); target.r = value >> 16 & 255; target.g = value >> 8 & 255; target.b = value & 255; onConfigChange() }

const impulseX = ref(0), impulseY = ref(0), offsetX = ref(0), offsetY = ref(0), angularImpulse = ref(0)
function applyImpulse() { const entity = selectedEntity.value; if (!entity || bodyType.value !== 'Dynamic') return; normalizeEntity(entity); const x = finiteNumber(impulseX.value), y = finiteNumber(impulseY.value); entity.velocity.x += x / entity.mass; entity.velocity.y += y / entity.mass; entity.angularVelocity += (finiteNumber(offsetX.value) * y - finiteNumber(offsetY.value) * x) / effectiveInertia(entity); normalizeEntity(entity); pushHistory() }
function applyAngularImpulse() { const entity = selectedEntity.value; if (!entity || bodyType.value !== 'Dynamic') return; entity.angularVelocity += finiteNumber(angularImpulse.value) / effectiveInertia(entity); normalizeEntity(entity); pushHistory() }

const showColorPicker = ref(false), tempColor = ref('#ffffff')
function openColorPicker() { if (!selectedEntity.value) return; const { r, g, b } = selectedEntity.value.color; tempColor.value = `#${[r, g, b].map(value => Math.round(value).toString(16).padStart(2, '0')).join('')}`; showColorPicker.value = true }
function applyColor() { if (selectedEntity.value) { const value = Number.parseInt(tempColor.value.slice(1), 16); selectedEntity.value.color = { r: value >> 16 & 255, g: value >> 8 & 255, b: value & 255 }; pushHistory() } showColorPicker.value = false }

const rotationDegrees = computed({ get: () => selectedEntity.value ? Number((-selectedEntity.value.transform.rotation * 180 / Math.PI).toFixed(4)) : 0, set: value => { if (selectedEntity.value && Number.isFinite(value)) selectedEntity.value.transform.rotation = -value * Math.PI / 180 } })
const colliderRotationDegrees = computed({ get: () => selectedEntity.value ? Number((-selectedEntity.value.collider.rotation * 180 / Math.PI).toFixed(4)) : 0, set: value => { if (selectedEntity.value && Number.isFinite(value)) selectedEntity.value.collider.rotation = -value * Math.PI / 180 } })
function colliderDimension(axis: 'x' | 'y'): number {
  const collider = selectedEntity.value?.getCollider()
  if (!collider) return 0
  if (collider.kind === 'EllipseCollider2D') return (axis === 'x' ? collider.radiusX : collider.radiusY) * 2
  const values = collider.vertices.map(vertex => vertex[axis])
  return values.length ? Math.max(...values) - Math.min(...values) : collider.size[axis]
}
function setColliderDimension(axis: 'x' | 'y', value: number) {
  const collider = selectedEntity.value?.getCollider()
  if (!collider || !Number.isFinite(value) || value < MIN_SIZE) return
  if (collider.kind === 'EllipseCollider2D') {
    if (axis === 'x') collider.radiusX = value / 2
    else collider.radiusY = value / 2
  } else {
    const current = colliderDimension(axis)
    if (current > 0) collider.vertices.forEach(vertex => { vertex[axis] *= value / current })
    collider.size[axis] = value
  }
}
const colliderSizeX = computed({ get: () => colliderDimension('x'), set: value => setColliderDimension('x', value) })
const colliderSizeY = computed({ get: () => colliderDimension('y'), set: value => setColliderDimension('y', value) })
function entityDimension(axis: 'x' | 'y'): number { const entity = selectedEntity.value; if (!entity) return 0; if (entity instanceof CircleEntity) return (axis === 'x' ? entity.radiusX * entity.transform.scale.x : entity.radiusY * entity.transform.scale.y) * 2; if (!(entity instanceof BoxEntity || entity instanceof TriangleEntity)) return 0; const values = entity.vertices.map(vertex => vertex[axis]); return (Math.max(...values) - Math.min(...values)) * entity.transform.scale[axis] }
function setEntityDimension(axis: 'x' | 'y', value: number) { const entity = selectedEntity.value; if (!entity || !Number.isFinite(value) || value < MIN_SIZE) return; if (entity instanceof CircleEntity) entity.transform.scale[axis] = value / ((axis === 'x' ? entity.radiusX : entity.radiusY) * 2); else if (entity instanceof BoxEntity || entity instanceof TriangleEntity) { const values = entity.vertices.map(vertex => vertex[axis]); entity.transform.scale[axis] = value / (Math.max(...values) - Math.min(...values)) } }
const absoluteSizeX = computed({ get: () => entityDimension('x'), set: value => setEntityDimension('x', value) })
const absoluteSizeY = computed({ get: () => entityDimension('y'), set: value => setEntityDimension('y', value) })

type SharedBooleanProperty = 'enabled' | 'editorVisible' | 'editorLocked'
function sharedBoolean(property: SharedBooleanProperty): string {
  const values = new Set(selectedEntities.value.map(entity => entity[property]))
  if (values.size !== 1) return t('mixed')
  return values.has(true) ? t('yes') : t('no')
}
function toggleAll(property: SharedBooleanProperty) {
  if (!canEdit.value) return
  const next = !selectedEntities.value.every(entity => entity[property])
  for (const entity of selectedEntities.value) entity[property] = next
  pushHistory('Set shared property', `multi:${property}`)
}
const multiLayer = computed({
  get: () => {
    const layers = new Set(selectedEntities.value.map(entity => entity.layer))
    return layers.size === 1 ? String([...layers][0]) : ''
  },
  set: value => {
    if (!canEdit.value || value === '') return
    const layer = Number(value)
    if (!estate.layers.includes(layer)) return
    for (const entity of selectedEntities.value) entity.layer = layer
    pushHistory('Set shared sorting layer', 'multi:layer')
  }
})
function setMultiPosition(axis: 'x' | 'y', value: number) {
  if (!canEdit.value || !Number.isFinite(value)) return
  const ids = selectedEntities.value.map(entity => entity.id)
  const center = selectionCenter(ids, state.world.entities)
  const delta = { x: 0, y: 0 }
  delta[axis] = value - center[axis]
  applyTranslation(captureTransforms(ids, state.world.entities), delta, state.world.entities)
  pushHistory('Move entities', `multi-position:${axis}`)
}
const multiPositionX = computed({ get: () => Number(selectionCenter(selectedEntities.value.map(entity => entity.id), state.world.entities).x.toFixed(4)), set: value => setMultiPosition('x', value) })
const multiPositionY = computed({ get: () => Number(selectionCenter(selectedEntities.value.map(entity => entity.id), state.world.entities).y.toFixed(4)), set: value => setMultiPosition('y', value) })
function sharedList(selector: (entity: typeof selectedEntities.value[number]) => string[]): string {
  const values = selectedEntities.value.map(entity => selector(entity).join(', '))
  return new Set(values).size === 1 ? values[0] ?? '' : ''
}
const multiTags = computed(() => sharedList(entity => entity.tags))
const multiGroups = computed(() => sharedList(entity => entity.groups))
const commonComponentKinds = computed(() => {
  const [first, ...rest] = selectedEntities.value
  return first ? first.components.map(component => component.kind).filter(kind => rest.every(entity => entity.hasComponent(kind))) : []
})
function setMultiTags(value: string) { if (!canEdit.value) return; const tags = cleanList(value); for (const entity of selectedEntities.value) entity.tags = [...tags]; pushHistory('Set shared tags', 'multi:tags') }
function setMultiGroups(value: string) { if (!canEdit.value) return; const groups = cleanList(value); for (const entity of selectedEntities.value) entity.groups = [...groups]; pushHistory('Set shared groups', 'multi:groups') }

let resizeStartX = 0
let resizeStartWidth = 0
function startResize(event: MouseEvent) { resizeStartX = event.clientX; resizeStartWidth = panelWidth.value; document.addEventListener('mousemove', resizePanel); document.addEventListener('mouseup', stopResize); document.body.style.cursor = 'ew-resize' }
function resizePanel(event: MouseEvent) { const delta = event.clientX - resizeStartX; panelWidth.value = Math.min(480, Math.max(252, resizeStartWidth + (props.dock === 'right' ? -delta : delta))) }
function stopResize() { document.removeEventListener('mousemove', resizePanel); document.removeEventListener('mouseup', stopResize); document.body.style.cursor = 'default'; estate.inspectorWidth = panelWidth.value }
onBeforeUnmount(stopResize)
</script>

<style scoped>
.config-wrapper { position: relative; min-width: 252px; max-width: 38vw; flex: 0 0 auto; z-index: 180; background: var(--surface-1); }.config-wrapper.right{border-left:1px solid var(--border-subtle)}.config-wrapper.left{border-right:1px solid var(--border-subtle)}
.resize-handle { position: absolute; inset: 0 auto 0 -4px; width: 8px; cursor: ew-resize; z-index: 6; }
.config-wrapper.left .resize-handle { inset: 0 -4px 0 auto; }
.config-panel { position: absolute; inset: 0; overflow: auto; contain: layout paint; color: var(--text-secondary); background: var(--surface-1); font-family: inherit; font-size: var(--type-dense); }
.config-panel :deep(button), .config-panel :deep(input), .config-panel :deep(select), .config-panel :deep(textarea) { font-family: inherit; font-size:11px; }
.config-panel.runtime { pointer-events: none; opacity: .72; }
.settings-content { min-height: 100%; padding: 8px 11px 26px; display: flex; flex-direction: column; gap: 8px; }
.inspector-sticky { position: sticky; top: 0; z-index: 12; padding: 10px 11px 7px; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 96%, transparent); backdrop-filter: var(--glass-blur); }
.inspector-search-row { display: flex; gap: 6px; }.inspector-search-row input { min-width: 0; height: 30px; min-height: 30px; flex: 1; }.add-component-trigger { min-width: 96px; min-height: 30px; padding: 0 8px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent-contrast); background: var(--accent); font-size:11px !important; white-space: nowrap; }
.inspector-categories { margin-top: 7px; display: flex; gap: 3px; overflow-x: auto; scrollbar-width: none; }.inspector-categories::-webkit-scrollbar { display: none; }.inspector-categories button { height: 24px; padding: 0 8px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 999px; color: var(--text-muted); background: transparent; font-size:11px !important; white-space: nowrap; }.inspector-categories button:hover, .inspector-categories button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: var(--accent-soft); }
.inspector-view-controls{margin-top:5px;display:flex;gap:4px}.inspector-view-controls button{min-height:25px;padding:0 7px;border:1px solid var(--border-subtle);border-radius:6px;color:var(--text-muted);background:transparent;font-size:11px!important}.inspector-view-controls button.active{color:var(--accent);border-color:var(--accent);background:var(--accent-soft)}
.empty-inspector { height: 100%; padding: 18px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-muted); text-align: center; }.empty-inspector p { font-size: 11px; }.empty-inspector > strong { margin-top: 12px; color: var(--text-secondary); font-size:11px; }.empty-ui-actions { width: 100%; margin-top: 7px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }.empty-ui-actions button { min-height: 28px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }.runtime-note { color: var(--text-muted); font-size:11px; line-height: 1.45; }
.authoring-validation{padding:7px;display:grid;gap:4px;border:1px solid color-mix(in srgb,var(--warning) 40%,var(--border-subtle));border-radius:8px;background:color-mix(in srgb,var(--warning) 7%,transparent)}.authoring-validation strong{color:var(--warning);font-size:11px}.authoring-validation button{min-height:26px;padding:4px 7px;text-align:left;border:0;border-radius:6px;color:var(--text-secondary);background:var(--surface-2);font-size:11px}.authoring-validation button.error{color:var(--danger)}
.batch-toggle { min-width: 76px; height: 28px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); }
.inspector-header { padding: 0 3px 8px; }.eyebrow { color: var(--accent); font-size:11px; font-weight: 720; letter-spacing: .11em; text-transform: uppercase; }h3 { margin: 3px 0 0; color: var(--text-primary); font-family: inherit; font-size: 14px; font-weight: 650; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }h3 small { color: var(--text-muted); font-size: 11px; font-weight: 500; }
:deep(.inspector-section) { border: 1px solid var(--border-subtle); border-radius: 12px; background: color-mix(in srgb, var(--surface-2) 72%, transparent); overflow: hidden; }
:deep(.inspector-section summary) { min-height: 37px; padding: 0 10px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; list-style: none; color: var(--text-primary); font-family: inherit; font-size:11px; font-weight: 680; letter-spacing: .055em; text-transform: uppercase; }
:deep(.inspector-section summary::-webkit-details-marker) { display: none; }:deep(.inspector-section summary i) { font-style: normal; transition: transform 160ms ease; }:deep(.inspector-section[open] summary i) { transform: rotate(180deg); }
:deep(.section-body) { padding: 4px 10px 11px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle); }
:deep(.section-body > select), :deep(.section-body > input) { width: 100%; }
:deep(.component-tools) { min-height: 31px; display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
:deep(.component-tools button) { min-width: 30px; height: 25px; padding: 0 7px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-muted); background: var(--surface-3); font-size:11px; }
:deep(.component-tools button:hover:not(:disabled)), :deep(.component-tools button.active) { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 42%, var(--border-subtle)); }
:deep(.component-tools button.danger:hover) { color: var(--danger); border-color: var(--danger); }
:deep(.component-tools button:disabled) { opacity: .36; }
:deep(.property-row) { min-height: 37px; display: flex; align-items: center; justify-content: space-between; gap: 9px; border-bottom: 1px solid var(--border-subtle); color: var(--text-secondary); font-family: inherit; font-size: 11px; font-weight: 450; }
:deep(.property-row.modified>span::after){content:'•';margin-left:5px;color:var(--warning);font-size:11px}:deep(.property-row>span i){margin-right:4px;color:#f4c95d;font-style:normal}:deep(.property-row>span small){margin-left:4px;color:var(--text-muted);font-size:11px}
:deep(.property-row:last-child) { border-bottom: 0; }:deep(.property-control) { width: 58%; display: flex; justify-content: flex-end; }:deep(.property-control > input), :deep(.property-control > select) { width: 100%; min-width: 0; }
.pair { width: 100%; display: flex; gap: 6px; }.pair input { width: 50%; min-width: 0; }
.physics-support-note { margin: -2px 0 2px; padding: 7px 8px; overflow-wrap: anywhere; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-muted); background: var(--surface-1); font-size: 11px; line-height: 1.4; }
.compound-shapes { border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-1); }.compound-shapes>summary{min-height:31px;padding:3px 5px 3px 8px;display:flex;align-items:center;justify-content:space-between;list-style:none;color:var(--text-secondary);cursor:pointer}.compound-shapes>summary::-webkit-details-marker{display:none}.compound-shapes>summary button,.compound-shapes article header button{width:25px;min-width:25px;height:25px;border:1px solid var(--border-subtle);border-radius:6px;color:var(--accent);background:var(--surface-3)}.compound-shapes article{margin:6px;padding:7px;display:grid;gap:6px;border:1px solid var(--border-subtle);border-radius:7px}.compound-shapes article header{display:grid;grid-template-columns:minmax(0,1fr) auto 25px;align-items:center;gap:5px}.compound-shapes article header label{display:flex;align-items:center;gap:4px;white-space:nowrap}.compound-shapes article>label{display:grid;grid-template-columns:minmax(70px,.8fr) minmax(0,1.2fr);align-items:center;gap:6px}.compound-shapes article input{min-width:0;width:100%}.compound-shapes>p{margin:6px 8px 8px;color:var(--text-muted);font-size:11px;line-height:1.4}
:deep(.number-range) { width: 100%; display: flex; align-items: center; gap: 7px; }:deep(.number-range input[type='range']) { min-width: 0; flex: 1; accent-color: var(--accent); }:deep(.number-range input[type='number']) { width: 72px; min-width: 60px; }
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); }:deep(.toggle i) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms ease; }:deep(.toggle.active) { background: var(--accent); }:deep(.toggle.active i) { transform: translateX(16px); background: var(--accent-contrast); }
:deep(.diagnostic-row) { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-family: inherit; font-size:11px; }:deep(.diagnostic-row code) { color: var(--accent); font-family: var(--font-mono); font-size:11px; }:deep(.diagnostic-row.active code) { color: var(--warning); }
.stacked-field { display: flex; flex-direction: column; gap: 6px; color: var(--text-secondary); font-family: inherit; font-size: 11px; }.stacked-field input, .stacked-field textarea { width: 100%; color: var(--text-secondary); font: inherit; }.stacked-field textarea { min-height: 58px; padding: 7px; resize: vertical; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--input-bg); }
.color-well { width: 48px; height: 25px; border: 3px solid var(--surface-3); border-radius: 8px; box-shadow: 0 0 0 1px var(--border-strong); }
.primary-action, .secondary-action { min-height: 33px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; border: 1px solid var(--accent); color: var(--accent-contrast); background: var(--accent); font-size: 11px; }.secondary-action { border-color: var(--border-subtle); color: var(--text-secondary); background: var(--surface-3); }
.prefab-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.prefab-actions button { min-width: 0; min-height: 30px; padding: 4px 5px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }
.prefab-actions button:hover { color: var(--accent); border-color: var(--accent); }
.prefab-compare{padding:6px;border:1px solid var(--border-subtle);border-radius:8px}.prefab-compare summary{cursor:pointer;color:var(--text-secondary)}.prefab-compare article{min-width:0;display:flex;align-items:center;gap:5px;padding-top:5px}.prefab-compare code{min-width:0;flex:1;overflow:hidden;color:var(--accent);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.prefab-compare button{min-height:24px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);color:var(--text-secondary);font-size:11px}.prefab-conflicts article{font-size:11px;line-height:1.35}.prefab-conflicts article.error{color:var(--danger)}.prefab-conflicts article.warning{color:var(--warning)}
.script-error { margin: 0; padding: 8px; overflow-wrap: anywhere; border: 1px solid color-mix(in srgb, var(--danger) 50%, var(--border-subtle)); border-radius: 7px; color: var(--danger); background: var(--danger-soft); font-family: var(--font-mono); font-size:11px; line-height: 1.45; }
.script-property-group{display:grid;gap:6px;padding-top:4px}.script-property-group h4{margin:0;padding:7px 2px 3px;border-bottom:1px solid var(--border-subtle);color:var(--text-muted);font-size:11px;font-weight:750;letter-spacing:.04em;text-transform:uppercase}.script-property-help{display:block;margin:-2px 4px 5px;color:var(--text-muted);font-size:11px;line-height:1.35;overflow-wrap:anywhere}
.inspector-no-results { margin: 14px 4px; padding: 18px 10px; border: 1px dashed var(--border-strong); border-radius: 10px; color: var(--text-muted); text-align: center; font-size:11px; line-height: 1.45; }
.plugin-inspector-actions { display: grid; gap: 5px; }.plugin-inspector-actions button { min-width: 0; padding: 7px 9px; display: flex; flex-direction: column; align-items: flex-start; border: 1px solid var(--border-subtle); border-radius: 8px; color: var(--text-primary); background: var(--surface-3); text-align: left; }.plugin-inspector-actions button:hover { border-color: var(--accent); background: var(--accent-soft); }.plugin-inspector-actions span, .plugin-inspector-actions small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.plugin-inspector-actions small { color: var(--text-muted); font-size: var(--type-caption); }
.empty-state { margin: 5px 0; color: var(--text-muted); font-size: 11px; text-align: center; }.connection-list { display: flex; flex-direction: column; gap: 6px; }.connection-item { display: flex; align-items: center; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-1); }.connection-main { min-width: 0; flex: 1; padding: 7px; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; }.connection-main > span:last-child { min-width: 0; display: flex; flex-direction: column; }.connection-main strong, .connection-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.connection-main strong { color: var(--text-primary); font-size: 11px; }.connection-main small { color: var(--text-muted); font-size:11px; }.connection-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: var(--connection); box-shadow: 0 0 7px var(--connection); }.connection-item.snapped .connection-dot, .connection-item.torn .connection-dot { background: var(--connection-broken); box-shadow: 0 0 7px var(--connection-broken); }.mini-button { width: 26px; height: 28px; border: 0; background: transparent; color: var(--text-muted); }.mini-button:hover { color: var(--accent); }.mini-button.danger:hover { color: var(--danger); }
.modal-scrim { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; background: var(--scrim); pointer-events: auto; backdrop-filter: blur(6px); }.color-modal { width: 250px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 14px; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-2); box-shadow: var(--shadow-lg); }.color-modal h4 { margin: 0; }.color-modal input { width: 100px; height: 76px; border: 0; background: transparent; }.color-modal > div { width: 100%; display: flex; gap: 8px; }.color-modal button { flex: 1; min-height: 34px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-3); }.color-modal button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
.component-picker-scrim { z-index: 1400; }.component-picker { width: min(620px, calc(100vw - 30px)); max-height: min(700px, calc(100vh - 60px)); padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 16px; background: var(--surface-1); box-shadow: var(--shadow-lg); }.component-picker > header { display: flex; align-items: center; justify-content: space-between; }.component-picker > header h4 { margin: 3px 0 0; font-size: 14px; }.component-picker > header > button { width: 30px; height: 30px; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }.component-picker > header > button:hover { color: var(--text-primary); background: var(--surface-hover); }.component-picker > input { width: 100%; }.component-picker-list { min-height: 60px;overflow:auto;display:block}.component-picker-list>section{display:grid;grid-template-columns:1fr 1fr;gap:5px}.component-picker-list h5{grid-column:1/-1;margin:9px 3px 3px;color:var(--text-muted);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.component-picker-list h5 small{padding:1px 5px;border-radius:20px;background:var(--surface-3)}.component-picker-list article{position:relative;min-width:0}.component-main{width:100%;min-width:0;min-height:52px;padding:6px 31px 6px 8px;display:grid;grid-template-columns:29px 1fr 18px;align-items:center;gap:7px;border:1px solid var(--border-subtle);border-radius:9px;color:var(--text-secondary);background:var(--surface-2);text-align:left}.component-main:hover{border-color:color-mix(in srgb,var(--accent) 55%,var(--border-subtle));background:var(--accent-soft)}.component-main>span:first-child{width:28px;height:28px;display:grid;place-items:center;border-radius:7px;color:var(--accent);background:var(--surface-3);font:600 11px/1 var(--font-mono)}.component-main>span:nth-child(2){min-width:0;display:flex;flex-direction:column;gap:2px}.component-main strong{overflow:hidden;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.component-main small{color:var(--text-muted);font-size:11px;line-height:1.25}.component-main i{color:var(--accent);font-size:15px;font-style:normal}.component-favorite{position:absolute;right:3px;top:3px;width:25px;height:25px;border:0;color:var(--text-muted);background:transparent;opacity:.4}.component-favorite.active{color:#f4c95d;opacity:1}.component-picker-list>p{padding:24px;color:var(--text-muted);text-align:center;font-size:11px}
.property-menu{position:fixed;z-index:1600;width:220px;padding:7px;display:flex;flex-direction:column;gap:3px;border:1px solid var(--border-strong);border-radius:10px;background:var(--surface-1);box-shadow:0 16px 36px rgba(0,0,0,.34)}.property-menu>strong{padding:5px 7px;color:var(--accent);font:600 11px/1.3 var(--font-mono);overflow-wrap:anywhere}.property-menu>button{min-height:28px;padding:0 7px;text-align:left;border:0;border-radius:6px;color:var(--text-secondary);background:transparent;font-size:11px}.property-menu>button:hover{background:var(--surface-hover)}.property-menu>button:disabled{opacity:.4}.property-menu>p{margin:4px;padding:7px;border-top:1px solid var(--border-subtle);color:var(--text-muted);font-size:11px;line-height:1.4}
@media (max-width: 760px) { .config-wrapper { max-width: 46vw; } }
@media (max-width: 560px) { .component-picker-list>section { grid-template-columns: 1fr; } }
</style>
