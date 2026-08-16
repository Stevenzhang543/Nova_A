<template>
  <div class="config-wrapper" :class="dock" :style="{ width: `${panelWidth}px` }">
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
      </div>
      <div v-if="selectedEntities.length > 1" class="settings-content multi-inspector">
        <InspectorSection :title="t('sharedProperties')" category="general" open>
          <PropertyRow :label="t('entityEnabled')"><button class="batch-toggle" @click="toggleAll('enabled')">{{ sharedBoolean('enabled') }}</button></PropertyRow>
          <PropertyRow :label="t('entityVisible')"><button class="batch-toggle" @click="toggleAll('editorVisible')">{{ sharedBoolean('editorVisible') }}</button></PropertyRow>
          <PropertyRow :label="t('entityLocked')"><button class="batch-toggle" @click="toggleAll('editorLocked')">{{ sharedBoolean('editorLocked') }}</button></PropertyRow>
          <PropertyRow :label="t('sortingLayer')"><select v-model="multiLayer"><option value="">{{ t('mixed') }}</option><option v-for="layer in estate.layers" :key="layer" :value="String(layer)">{{ t('layer') }} {{ layer }}</option></select></PropertyRow>
          <PropertyRow :label="t('position')"><div class="pair"><input v-model.number="multiPositionX" type="number" step="0.1"><input v-model.number="multiPositionY" type="number" step="0.1"></div></PropertyRow>
        </InspectorSection>
        <p class="runtime-note">{{ t('runtimeIsolation') }}</p>
      </div>
      <div v-else-if="selectedEntity" class="settings-content" @change="onConfigChange">
        <InspectorSection :title="t('entitySettings')" category="general" open>
          <PropertyRow :label="t('entityEnabled')"><ToggleSwitch v-model="selectedEntity.enabled" /></PropertyRow>
          <PropertyRow :label="t('entityVisible')"><ToggleSwitch v-model="selectedEntity.editorVisible" /></PropertyRow>
          <PropertyRow :label="t('entityLocked')"><ToggleSwitch v-model="selectedEntity.editorLocked" /></PropertyRow>
          <PropertyRow :label="t('persistentEntity')"><ToggleSwitch v-model="selectedEntity.persistentAcrossScenes" /></PropertyRow>
          <PropertyRow :label="t('entityTags')"><input v-model="tagsText" type="text"></PropertyRow>
          <DiagnosticRow label="UUID" :value="selectedEntity.uuid" />
          <template v-if="selectedEntity.prefabAsset">
            <DiagnosticRow :label="t('prefabInstance')" :value="selectedEntity.prefabAsset" active />
            <DiagnosticRow :label="t('prefabOverrides')" :value="String(prefabOverrideCount)" />
            <details v-if="prefabComparison.length" class="prefab-compare">
              <summary>{{ t('comparePrefabOverrides') }}</summary>
              <article v-for="override in prefabComparison" :key="override.path"><code>{{ override.path }}</code><button @click="resetSelectedPrefabOverride(override.path)">{{ t('resetOverride') }}</button></article>
            </details>
            <div class="prefab-actions">
              <button @click="applySelectedPrefab">{{ t('applyPrefab') }}</button>
              <button @click="revertSelectedPrefab">{{ t('revertPrefab') }}</button>
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
          <PropertyRow :label="t('opacity')"><NumberRange v-model="selectedEntity.spriteRenderer.opacity" :min="0" :max="100" :step="1" /></PropertyRow>
          <PropertyRow :label="t('spriteSize')"><div class="pair"><input v-model.number="selectedEntity.spriteRenderer.size.x" type="number" min="0.000001" step="0.1"><input v-model.number="selectedEntity.spriteRenderer.size.y" type="number" min="0.000001" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('pivot')"><div class="pair"><input v-model.number="selectedEntity.spriteRenderer.pivot.x" type="number" step="0.05"><input v-model.number="selectedEntity.spriteRenderer.pivot.y" type="number" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('flipX')"><ToggleSwitch v-model="selectedEntity.spriteRenderer.flipX" /></PropertyRow>
          <PropertyRow :label="t('flipY')"><ToggleSwitch v-model="selectedEntity.spriteRenderer.flipY" /></PropertyRow>
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
          <PropertyRow :label="t('orthographicSize')"><input v-model.number="selectedEntity.camera2D.orthographicSize" type="number" min="0.000001" step="0.1"></PropertyRow>
          <PropertyRow :label="t('cameraZoom')"><input v-model.number="selectedEntity.camera2D.zoom" type="number" min="0.000001" step="0.1"></PropertyRow>
          <PropertyRow :label="t('backgroundColor')"><input type="color" :value="rgbHex(selectedEntity.camera2D.backgroundColor)" @input="setRgb(selectedEntity.camera2D!.backgroundColor, $event)"></PropertyRow>
          <PropertyRow :label="t('pixelPerfect')"><ToggleSwitch v-model="selectedEntity.camera2D.pixelPerfect" /></PropertyRow>
          <PropertyRow :label="t('viewportOrigin')"><div class="pair"><input v-model.number="selectedEntity.camera2D.viewport.x" type="number" min="0" max="1" step="0.05"><input v-model.number="selectedEntity.camera2D.viewport.y" type="number" min="0" max="1" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('viewportSize')"><div class="pair"><input v-model.number="selectedEntity.camera2D.viewport.width" type="number" min="0.01" max="1" step="0.05"><input v-model.number="selectedEntity.camera2D.viewport.height" type="number" min="0.01" max="1" step="0.05"></div></PropertyRow>
          <PropertyRow :label="t('sortingRange')"><div class="pair"><input v-model.number="selectedEntity.camera2D.nearSortingLayer" type="number" step="1"><input v-model.number="selectedEntity.camera2D.farSortingLayer" type="number" step="1"></div></PropertyRow>
          <PropertyRow :label="t('cameraPriority')"><div class="pair"><input v-model.number="selectedEntity.camera2D.priority" type="number" step="1"><input v-model.number="selectedEntity.camera2D.stackOrder" type="number" step="1"></div></PropertyRow>
          <PropertyRow :label="t('cullingMask')"><input v-model.number="selectedEntity.camera2D.cullingMask" type="number" min="0" max="4294967295" step="1"></PropertyRow>
          <PropertyRow :label="t('renderTexture')"><input v-model="selectedEntity.camera2D.renderTexture" type="text" :placeholder="t('renderTextureName')"></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.script2D" :title="t('script2D')" category="gameplay" open>
          <ComponentTools kind="Script2D" />
          <PropertyRow :label="t('scriptAsset')"><select v-model="selectedEntity.script2D.scriptAsset" @change="synchronizeScriptProperties"><option :value="null">{{ t('none') }}</option><option v-for="asset in scriptAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></PropertyRow>
          <button class="secondary-action" @click="synchronizeScriptProperties">{{ t('refreshScriptProperties') }}</button>
          <PropertyRow v-for="(value, name) in selectedEntity.script2D.properties" :key="name" :label="String(name)">
            <ToggleSwitch v-if="typeof value === 'boolean'" :model-value="value" @update:model-value="setScriptProperty(String(name), $event)" />
            <input v-else-if="typeof value === 'number'" :value="value" type="number" step="0.01" @change="setScriptProperty(String(name), Number(($event.target as HTMLInputElement).value))">
            <input v-else :value="value" type="text" @change="setScriptProperty(String(name), ($event.target as HTMLInputElement).value)">
          </PropertyRow>
          <p v-if="selectedEntity.script2D.lastError" class="script-error">{{ selectedEntity.script2D.lastError }}</p>
        </InspectorSection>

        <InspectorSection v-if="selectedEntity.hasComponent('ShapeRenderer2D') && !selectedEntity.hasComponent('RectTransform')" :title="t('shapeSize')" category="render">
          <PropertyRow :label="t('absoluteSize')"><div class="pair"><input v-model.number="absoluteSizeX" type="number" min="0.000001" step="0.1"><input v-model.number="absoluteSizeY" type="number" min="0.000001" step="0.1"></div></PropertyRow>
        </InspectorSection>

        <InspectorSection :title="t('transform2D')" category="transform" open>
          <ComponentTools kind="Transform2D" />
          <PropertyRow :label="t('parentEntity')"><select v-model="selectedParentUuid"><option value="">{{ t('noParent') }}</option><option v-for="entity in parentCandidates" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}_{{ entity.id }}</option></select></PropertyRow>
          <PropertyRow :label="t('position')"><div class="pair"><input v-model.number="selectedEntity.transform.position.x" type="number" step="0.01"><input v-model.number="selectedEntity.transform.position.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('rotationDegrees')"><NumberRange v-model="rotationDegrees" :min="-180" :max="180" :step="1" /></PropertyRow>
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
          <PropertyRow :label="t('colliderOffset')"><div class="pair"><input v-model.number="selectedEntity.collider.offset.x" type="number" step="0.01"><input v-model.number="selectedEntity.collider.offset.y" type="number" step="0.01"></div></PropertyRow>
          <PropertyRow :label="t('colliderSize')"><div class="pair"><input v-model.number="colliderSizeX" type="number" min="0.000001" step="0.1"><input v-model.number="colliderSizeY" type="number" min="0.000001" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('colliderRotation')"><input v-model.number="colliderRotationDegrees" type="number" step="1"></PropertyRow>
          <PropertyRow :label="t('physicsLayer')"><input v-model.number="selectedEntity.collider.physicsLayer" type="number" min="0" max="31" step="1"></PropertyRow>
          <PropertyRow :label="t('collisionMask')"><input v-model.number="selectedEntity.collider.collisionMask" type="number" min="0" max="4294967295" step="1"></PropertyRow>
          <PropertyRow :label="t('isSensor')"><ToggleSwitch v-model="selectedEntity.isSensor" /></PropertyRow>
          <PropertyRow :label="t('oneWayCollider')"><ToggleSwitch v-model="selectedEntity.collider.oneWay" /></PropertyRow>
          <PropertyRow v-if="selectedEntity.collider.oneWay" :label="t('oneWayNormal')"><div class="field-pair"><input v-model.number="selectedEntity.collider.oneWayNormal.x" type="number" step="0.1"><input v-model.number="selectedEntity.collider.oneWayNormal.y" type="number" step="0.1"></div></PropertyRow>
          <PropertyRow :label="t('restitution')"><NumberRange v-model="selectedEntity.restitution" :min="0" :max="1" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('restitutionThreshold')"><input v-model.number="selectedEntity.restitutionThreshold" type="number" min="0" step="0.1"></PropertyRow>
          <PropertyRow :label="t('staticFriction')"><NumberRange v-model="selectedEntity.staticFriction" :min="0" :max="Math.max(1, selectedEntity.staticFriction)" :step="0.01" /></PropertyRow>
          <PropertyRow :label="t('dynamicFriction')"><NumberRange v-model="selectedEntity.dynamicFriction" :min="0" :max="Math.max(1, selectedEntity.dynamicFriction)" :step="0.01" /></PropertyRow>
        </InspectorSection>

        <InspectorSection v-if="prefs.showDiagnostics && selectedEntity.hasComponent('RigidBody2D')" :title="t('collisionDiagnostics')" category="physics">
          <DiagnosticRow :label="t('contacts')" :value="String(selectedEntity.contactCount)" :active="selectedEntity.contactCount > 0" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('normal')" :value="`[${selectedEntity.contactNormal.x.toFixed(3)}, ${selectedEntity.contactNormal.y.toFixed(3)}]`" />
          <DiagnosticRow v-if="selectedEntity.contactCount > 0" :label="t('penetration')" :value="`${selectedEntity.penetrationDepth.toPrecision(5)} m`" />
        </InspectorSection>

        <RuntimeComponentsInspector :entity="selectedEntity" :search-query="estate.inspectorSearch" :category="estate.inspectorCategory" />
        <p v-if="!inspectorHasMatches" class="inspector-no-results">{{ t('noInspectorResults') }}</p>
      </div>
      <div v-else class="empty-inspector"><span class="eyebrow">{{ t('entitySettings') }}</span><p>{{ t('noEntitiesFound') }}</p><strong>{{ t('createGameUi') }}</strong><div class="empty-ui-actions"><button v-for="kind in uiKinds" :key="kind" @click="createUiEntity(kind)">+ {{ t(`create${kind}`) }}</button></div></div>
    </aside>

    <div v-if="showColorPicker" class="modal-scrim" @mousedown.self="showColorPicker = false"><div class="color-modal"><h4>{{ t('selectColor') }}</h4><input v-model="tempColor" type="color"><div><button @click="showColorPicker = false">{{ t('cancel') }}</button><button class="primary" @click="applyColor">{{ t('apply') }}</button></div></div></div>
    <Teleport to="body">
      <div v-if="estate.componentPickerOpen && selectedEntity" class="modal-scrim component-picker-scrim" @mousedown.self="closeComponentPicker">
        <section class="component-picker" role="dialog" aria-modal="true" :aria-label="t('addComponent')" @keydown.escape="closeComponentPicker">
          <header><div><span class="eyebrow">{{ t('addComponent') }}</span><h4>{{ selectedEntity.name }}</h4></div><button :aria-label="t('cancel')" @click="closeComponentPicker">×</button></header>
          <input ref="componentSearchInput" v-model="componentSearch" type="search" :placeholder="t('searchComponents')">
          <div class="component-picker-list">
            <button v-for="kind in filteredAddableComponents" :key="kind" @click="chooseComponent(kind)"><span>{{ componentGlyph(kind) }}</span><span><strong>{{ componentTitle(kind) }}</strong><small>{{ t(componentCategoryLabel(componentCategory(kind))) }}</small></span><i>+</i></button>
            <p v-if="!filteredAddableComponents.length">{{ t('noComponentsFound') }}</p>
          </div>
        </section>
      </div>
    </Teleport>
    <ConnectionBuilder v-if="selectedEntity && builderOpen" :selected-id="selectedEntity.id" :connection-id="editingConnectionId" @close="builderOpen = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { t } from '../i18n'
import { editorState as estate, type InspectorCategory } from '../store/editor'
import { createUiEntity, deleteConnection, physicsState as state, pushHistory, repairConnection, type UiElementKind } from '../store/physics'
import { preferencesState as prefs } from '../store/preferences'
import { requestConfirmation } from '../store/dialog'
import { BoxEntity } from '../world/BoxEntity'
import { CircleEntity } from '../world/CircleEntity'
import { TriangleEntity } from '../world/TriangleEntity'
import { effectiveInertia, entityArea, finiteNumber, MIN_AREA, MIN_SIZE, normalizeEntity, syncDensityFromMass, syncMassFromDensity } from '../world/geometry'
import ConnectionBuilder from './ConnectionBuilder.vue'
import RuntimeComponentsInspector from './RuntimeComponentsInspector.vue'
import { connectionSharesLayer } from '../world/Connection'
import { Animator, Area2D, AreaEffector2D, AudioListener, AudioSource, BehaviorTree2D, Button, Camera2D, Canvas, CharacterBody2D, Checkbox, Collider2D, Image as UIImage, Joint2D, Light2D, NavigationAgent2D, NavigationObstacle2D, NavigationRegion2D, ObjectPool2D, Panel, ParticleEmitter2D, Portal2D, ProgressBar, RectTransform, RigidBody2D, Script2D, ShadowCaster2D, ShapeRenderer2D, Skeleton2D, Slider, SpriteRenderer2D, StateMachine2D, Text as UIText, TextInput, TextRenderer2D, TileMap2D, TimelinePlayer, WorldChunk2D, copyComponentValues, pasteComponentValues, type Component2D, type ComponentKind, type JointKind2D, type ScriptPropertyValue } from '../world/components'
import { Transform } from '../world/Transform'
import { setParent, wouldCreateParentCycle } from '../world/hierarchy'
import { applyTranslation, captureTransforms } from '../editor/gizmo'
import { selectionCenter } from '../editor/selection'
import { assetReference, assetState, importAssetFiles } from '../assets/AssetDatabase'
import { gameplayRuntime } from '../runtime/GameplayRuntime'
import { recordEntityProperties } from '../editor/animationStudioState'
import { applyPrefabFromInstance, capturePrefabOverrides, comparePrefabInstance, createPrefabFromEntities, resetPrefabOverride, revertPrefabInstance, unpackPrefabInstance } from '../runtime/prefabs'
import { unpackSceneInstance } from '../runtime/sceneInstances'

const InspectorSection = defineComponent({ props: { title: { type: String, required: true }, category: { type: String, default: 'general' }, open: Boolean }, setup(props, { slots }) { return () => h('details', { class: 'inspector-section', open: props.open, style: { display: inspectorSectionVisible(props.title, props.category as InspectorCategory) ? '' : 'none' } }, [h('summary', [h('span', props.title), h('i', '⌄')]), h('div', { class: 'section-body' }, slots.default?.())]) } })
const PropertyRow = defineComponent({ props: { label: { type: String, required: true } }, setup(props, { slots }) { return () => h('label', { class: 'property-row' }, [h('span', props.label), h('div', { class: 'property-control' }, slots.default?.())]) } })
const DiagnosticRow = defineComponent({ props: { label: { type: String, required: true }, value: { type: String, required: true }, active: Boolean }, setup(props) { return () => h('div', { class: ['diagnostic-row', { active: props.active }] }, [h('span', props.label), h('code', props.value)]) } })
const ToggleSwitch = defineComponent({ props: { modelValue: { type: Boolean, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { return () => h('button', { class: ['toggle', { active: props.modelValue }], role: 'switch', 'aria-checked': props.modelValue, onClick: () => { emit('update:modelValue', !props.modelValue); onConfigChange() } }, h('i')) } })
const NumberRange = defineComponent({ props: { modelValue: { type: Number, required: true }, min: { type: Number, required: true }, max: { type: Number, required: true }, step: { type: Number, required: true } }, emits: ['update:modelValue'], setup(props, { emit }) { const update = (event: Event) => emit('update:modelValue', Number((event.target as HTMLInputElement).value)); return () => h('div', { class: 'number-range' }, [h('input', { type: 'range', value: props.modelValue, min: props.min, max: props.max, step: props.step, onInput: update }), h('input', { type: 'number', value: props.modelValue, step: props.step, onChange: update })]) } })
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
        kind === 'Transform2D' ? null : h('button', { class: 'danger', title: t('removeComponent'), onClick: () => removeComponent(kind) }, '×')
      ])
    }
  }
})

const selectedEntities = computed(() => {
  const ids = new Set(state.selectedEntityIds)
  return state.world.entities.filter(entity => ids.has(entity.id))
})
const selectedEntity = computed(() => state.selectedEntityId === null ? null : state.world.entities.find(entity => entity.id === state.selectedEntityId) ?? null)
const canEdit = computed(() => state.playMode === 'editing')
const selectedConnections = computed(() => selectedEntity.value ? state.world.connections.filter(connection => connection.anchors.some(anchor => anchor.entityId === selectedEntity.value!.id)) : [])
const entityColor = computed(() => selectedEntity.value ? `rgb(${selectedEntity.value.color.r}, ${selectedEntity.value.color.g}, ${selectedEntity.value.color.b})` : 'transparent')
const selectedEntityArea = computed(() => selectedEntity.value ? entityArea(selectedEntity.value) : 0)
const effectiveEntityInertia = computed(() => selectedEntity.value ? effectiveInertia(selectedEntity.value) : 0)
const componentClipboard = ref<{ kind: ComponentKind; values: Record<string, unknown> } | null>(null)
const props = withDefaults(defineProps<{ dock?: 'left' | 'right' }>(), { dock: 'right' })
const dock = computed(() => props.dock)
const panelWidth = ref(estate.inspectorWidth)
const imageAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const fontAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'font'))
const scriptAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'script'))
const materialAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'material'))
const optionalComponents: ComponentKind[] = ['SpriteRenderer2D', 'TextRenderer2D', 'Camera2D', 'Light2D', 'ShadowCaster2D', 'Script2D', 'Animator', 'Skeleton2D', 'TimelinePlayer', 'AudioSource', 'AudioListener', 'Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput', 'TileMap2D', 'ParticleEmitter2D', 'CharacterBody2D', 'Area2D', 'AreaEffector2D', 'NavigationRegion2D', 'NavigationObstacle2D', 'NavigationAgent2D', 'BehaviorTree2D', 'StateMachine2D', 'WorldChunk2D', 'Portal2D', 'ObjectPool2D', 'FixedJoint2D', 'DistanceJoint2D', 'RevoluteJoint2D', 'PrismaticJoint2D', 'SpringJoint2D']
const uiKinds: UiElementKind[] = ['Canvas', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput']
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
  const missing = optionalComponents.filter(kind => !selectedEntity.value!.componentMap.has(kind))
  return [...new Set([...removed, ...missing])]
})
const filteredAddableComponents = computed(() => {
  const needle = componentSearch.value.trim().toLocaleLowerCase()
  return addableComponents.value.filter(kind => !needle || `${componentTitle(kind)} ${kind} ${t(componentCategoryLabel(componentCategory(kind)))}`.toLocaleLowerCase().includes(needle))
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
function chooseComponent(kind: ComponentKind): void { addComponent(kind); closeComponentPicker() }
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
const prefabOverrideCount = computed(() => selectedEntity.value ? Object.keys(selectedEntity.value.prefabOverrides).length : 0)
const prefabComparison = computed(() => selectedEntity.value?.prefabAsset ? comparePrefabInstance(selectedEntity.value) : [])

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
  pushHistory('Add component')
  estate.statusText = t('componentAdded')
}

const builderOpen = ref(false)
const editingConnectionId = ref<number | null>(null)
function openConnection(id: number | null) { editingConnectionId.value = id; builderOpen.value = true }
async function confirmConnectionAction(title: string, message: string): Promise<boolean> { return !prefs.confirmDestructiveActions || requestConfirmation({ title, message, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true }) }
async function removeConnection(id: number) { if (!await confirmConnectionAction(t('deleteConnectionTitle'), t('confirmConnectionDelete'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('connectionDeleted') }
async function separate(id: number) { if (!await confirmConnectionAction(t('separateBindingTitle'), t('confirmSeparateBinding'))) return; deleteConnection(id); pushHistory(); estate.statusText = t('bindingSeparated') }
function repair(id: number) { repairConnection(id); pushHistory() }

function onConfigChange() { if (!canEdit.value || !selectedEntity.value) return; if (selectedEntity.value.isStatic) selectedEntity.value.isKinematic = false; normalizeEntity(selectedEntity.value); if (selectedEntity.value.prefabAsset) capturePrefabOverrides(selectedEntity.value); recordEntityProperties([selectedEntity.value]); pushHistory('Set property', `property:${selectedEntity.value.uuid}`) }
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
function createSelectedPrefab() {
  if (!selectedEntity.value) return
  const reference = createPrefabFromEntities([selectedEntity.value.id], selectedEntity.value.name)
  estate.statusText = reference ? t('prefabCreated') : t('prefabFailed')
}
function applySelectedPrefab() { if (selectedEntity.value && applyPrefabFromInstance(selectedEntity.value)) estate.statusText = t('prefabApplied') }
function revertSelectedPrefab() { if (selectedEntity.value && revertPrefabInstance(selectedEntity.value)) estate.statusText = t('prefabReverted') }
function unpackSelectedPrefab() { if (selectedEntity.value && unpackPrefabInstance(selectedEntity.value)) estate.statusText = t('prefabUnpacked') }
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
.config-panel { position: absolute; inset: 0; overflow: auto; color: var(--text-secondary); background: var(--surface-1); backdrop-filter: var(--glass-blur); font-family: inherit; font-size: 11px; }
.config-panel :deep(button), .config-panel :deep(input), .config-panel :deep(select), .config-panel :deep(textarea) { font-family: inherit; font-size:11px; }
.config-panel.runtime { pointer-events: none; opacity: .72; }
.settings-content { min-height: 100%; padding: 8px 11px 26px; display: flex; flex-direction: column; gap: 8px; }
.inspector-sticky { position: sticky; top: 0; z-index: 12; padding: 10px 11px 7px; border-bottom: 1px solid var(--border-subtle); background: color-mix(in srgb, var(--surface-1) 96%, transparent); backdrop-filter: var(--glass-blur); }
.inspector-search-row { display: flex; gap: 6px; }.inspector-search-row input { min-width: 0; height: 30px; min-height: 30px; flex: 1; }.add-component-trigger { min-width: 96px; min-height: 30px; padding: 0 8px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent-contrast); background: var(--accent); font-size:11px !important; white-space: nowrap; }
.inspector-categories { margin-top: 7px; display: flex; gap: 3px; overflow-x: auto; scrollbar-width: none; }.inspector-categories::-webkit-scrollbar { display: none; }.inspector-categories button { height: 24px; padding: 0 8px; flex: 0 0 auto; border: 1px solid transparent; border-radius: 999px; color: var(--text-muted); background: transparent; font-size:11px !important; white-space: nowrap; }.inspector-categories button:hover, .inspector-categories button.active { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: var(--accent-soft); }
.empty-inspector { height: 100%; padding: 18px; display: flex; flex-direction: column; justify-content: center; align-items: center; color: var(--text-muted); text-align: center; }.empty-inspector p { font-size: 11px; }.empty-inspector > strong { margin-top: 12px; color: var(--text-secondary); font-size:11px; }.empty-ui-actions { width: 100%; margin-top: 7px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }.empty-ui-actions button { min-height: 28px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }.runtime-note { color: var(--text-muted); font-size:11px; line-height: 1.45; }
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
:deep(.property-row:last-child) { border-bottom: 0; }:deep(.property-control) { width: 58%; display: flex; justify-content: flex-end; }:deep(.property-control > input), :deep(.property-control > select) { width: 100%; min-width: 0; }
.pair { width: 100%; display: flex; gap: 6px; }.pair input { width: 50%; min-width: 0; }
:deep(.number-range) { width: 100%; display: flex; align-items: center; gap: 7px; }:deep(.number-range input[type='range']) { min-width: 0; flex: 1; accent-color: var(--accent); }:deep(.number-range input[type='number']) { width: 72px; min-width: 60px; }
:deep(.toggle) { width: 38px; height: 22px; padding: 3px; border: 0; border-radius: 99px; background: var(--surface-3); }:deep(.toggle i) { display: block; width: 16px; height: 16px; border-radius: 50%; background: var(--text-muted); transition: transform 180ms ease; }:deep(.toggle.active) { background: var(--accent); }:deep(.toggle.active i) { transform: translateX(16px); background: var(--accent-contrast); }
:deep(.diagnostic-row) { min-height: 30px; display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-muted); font-family: inherit; font-size:11px; }:deep(.diagnostic-row code) { color: var(--accent); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size:11px; }:deep(.diagnostic-row.active code) { color: var(--warning); }
.stacked-field { display: flex; flex-direction: column; gap: 6px; color: var(--text-secondary); font-family: inherit; font-size: 11px; }.stacked-field input, .stacked-field textarea { width: 100%; color: var(--text-secondary); font: inherit; }.stacked-field textarea { min-height: 58px; padding: 7px; resize: vertical; border: 1px solid var(--border-subtle); border-radius: 7px; background: var(--input-bg); }
.color-well { width: 48px; height: 25px; border: 3px solid var(--surface-3); border-radius: 8px; box-shadow: 0 0 0 1px var(--border-strong); }
.primary-action, .secondary-action { min-height: 33px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px; border-radius: 8px; border: 1px solid var(--accent); color: var(--accent-contrast); background: var(--accent); font-size: 11px; }.secondary-action { border-color: var(--border-subtle); color: var(--text-secondary); background: var(--surface-3); }
.prefab-actions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 5px; }
.prefab-actions button { min-width: 0; min-height: 30px; padding: 4px 5px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--text-secondary); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }
.prefab-actions button:hover { color: var(--accent); border-color: var(--accent); }
.prefab-compare{padding:6px;border:1px solid var(--border-subtle);border-radius:8px}.prefab-compare summary{cursor:pointer;color:var(--text-secondary)}.prefab-compare article{min-width:0;display:flex;align-items:center;gap:5px;padding-top:5px}.prefab-compare code{min-width:0;flex:1;overflow:hidden;color:var(--accent);font-size:11px;text-overflow:ellipsis;white-space:nowrap}.prefab-compare button{min-height:24px;border:1px solid var(--border-subtle);border-radius:6px;background:var(--surface-3);color:var(--text-secondary);font-size:11px}
.script-error { margin: 0; padding: 8px; overflow-wrap: anywhere; border: 1px solid color-mix(in srgb, var(--danger) 50%, var(--border-subtle)); border-radius: 7px; color: var(--danger); background: var(--danger-soft); font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size:11px; line-height: 1.45; }
.inspector-no-results { margin: 14px 4px; padding: 18px 10px; border: 1px dashed var(--border-strong); border-radius: 10px; color: var(--text-muted); text-align: center; font-size:11px; line-height: 1.45; }
.empty-state { margin: 5px 0; color: var(--text-muted); font-size: 11px; text-align: center; }.connection-list { display: flex; flex-direction: column; gap: 6px; }.connection-item { display: flex; align-items: center; border: 1px solid var(--border-subtle); border-radius: 9px; background: var(--surface-1); }.connection-main { min-width: 0; flex: 1; padding: 7px; display: flex; align-items: center; gap: 8px; border: 0; background: transparent; text-align: left; }.connection-main > span:last-child { min-width: 0; display: flex; flex-direction: column; }.connection-main strong, .connection-main small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.connection-main strong { color: var(--text-primary); font-size: 11px; }.connection-main small { color: var(--text-muted); font-size:11px; }.connection-dot { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; background: var(--connection); box-shadow: 0 0 7px var(--connection); }.connection-item.snapped .connection-dot, .connection-item.torn .connection-dot { background: var(--connection-broken); box-shadow: 0 0 7px var(--connection-broken); }.mini-button { width: 26px; height: 28px; border: 0; background: transparent; color: var(--text-muted); }.mini-button:hover { color: var(--accent); }.mini-button.danger:hover { color: var(--danger); }
.modal-scrim { position: fixed; inset: 0; z-index: 1300; display: grid; place-items: center; background: var(--scrim); pointer-events: auto; backdrop-filter: blur(6px); }.color-modal { width: 250px; padding: 18px; display: flex; flex-direction: column; align-items: center; gap: 14px; border: 1px solid var(--border-subtle); border-radius: 16px; background: var(--surface-2); box-shadow: var(--shadow-lg); }.color-modal h4 { margin: 0; }.color-modal input { width: 100px; height: 76px; border: 0; background: transparent; }.color-modal > div { width: 100%; display: flex; gap: 8px; }.color-modal button { flex: 1; min-height: 34px; border: 1px solid var(--border-subtle); border-radius: 8px; background: var(--surface-3); }.color-modal button.primary { color: var(--accent-contrast); border-color: var(--accent); background: var(--accent); }
.component-picker-scrim { z-index: 1400; }.component-picker { width: min(520px, calc(100vw - 30px)); max-height: min(620px, calc(100vh - 60px)); padding: 12px; display: flex; flex-direction: column; gap: 10px; overflow: hidden; border: 1px solid var(--border-strong); border-radius: 16px; background: var(--surface-1); box-shadow: var(--shadow-lg); }.component-picker > header { display: flex; align-items: center; justify-content: space-between; }.component-picker > header h4 { margin: 3px 0 0; font-size: 14px; }.component-picker > header > button { width: 30px; height: 30px; border: 0; border-radius: 7px; color: var(--text-muted); background: transparent; }.component-picker > header > button:hover { color: var(--text-primary); background: var(--surface-hover); }.component-picker > input { width: 100%; }.component-picker-list { min-height: 60px; overflow: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }.component-picker-list > button { min-width: 0; min-height: 48px; padding: 6px 8px; display: grid; grid-template-columns: 29px 1fr 18px; align-items: center; gap: 7px; border: 1px solid var(--border-subtle); border-radius: 9px; color: var(--text-secondary); background: var(--surface-2); text-align: left; }.component-picker-list > button:hover { border-color: color-mix(in srgb, var(--accent) 55%, var(--border-subtle)); background: var(--accent-soft); }.component-picker-list > button > span:first-child { width: 28px; height: 28px; display: grid; place-items: center; border-radius: 7px; color: var(--accent); background: var(--surface-3); font: 600 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace; }.component-picker-list > button > span:nth-child(2) { min-width: 0; display: flex; flex-direction: column; gap: 2px; }.component-picker-list strong { overflow: hidden; font-size:11px; text-overflow: ellipsis; white-space: nowrap; }.component-picker-list small { color: var(--text-muted); font-size:11px; }.component-picker-list i { color: var(--accent); font-size: 15px; font-style: normal; }.component-picker-list > p { grid-column: 1 / -1; padding: 24px; color: var(--text-muted); text-align: center; font-size:11px; }
@media (max-width: 760px) { .config-wrapper { max-width: 46vw; } }
@media (max-width: 560px) { .component-picker-list { grid-template-columns: 1fr; } }
</style>
