<template>
  <section v-if="animator && componentVisible('Animator', t('animator'))" class="runtime-component">
    <header><strong>{{ t('animator') }}</strong><button @click="remove('Animator')">×</button></header>
    <label><span>{{ t('controller') }}</span><select v-model="animator.controllerAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in controllerAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('speed') }}</span><NumericExpressionInput v-model="animator.speed" :step="0.1" :resource-key="entity.uuid + ':' + animator.uuid + ':speed'" /></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="animator.autoplay" type="checkbox"></label>
    <label><span>{{ t('currentState') }}</span><code>{{ animator.currentState || '—' }}</code></label>
    <label v-for="(value, name) in animator.parameters" :key="name"><span>{{ name }}</span><input v-if="typeof value === 'boolean'" v-model="animator.parameters[name]" type="checkbox"><NumericExpressionInput v-else :model-value="Number(animator.parameters[name])" @update:model-value="animator.parameters[name] = $event" :step="0.01" :resource-key="entity.uuid + ':' + animator.uuid + ':parameters:' + name" /></label>
  </section>

  <section v-if="skeleton && componentVisible('Skeleton2D', t('skeleton2D'))" class="runtime-component">
    <header><strong>{{ t('skeleton2D') }}</strong><button @click="remove('Skeleton2D')">×</button></header>
    <label><span>{{ t('rigAsset') }}</span><select v-model="skeleton.rigAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in rigAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('skinAsset') }}</span><select v-model="skeleton.skinAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in skinAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('previewPose') }}</span><input v-model="skeleton.previewEnabled" type="checkbox"></label>
  </section>

  <section v-if="timelinePlayer && componentVisible('TimelinePlayer', t('timelinePlayer'))" class="runtime-component">
    <header><strong>{{ t('timelinePlayer') }}</strong><button @click="remove('TimelinePlayer')">×</button></header>
    <label><span>{{ t('timelineAsset') }}</span><select v-model="timelinePlayer.timelineAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in timelineAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="timelinePlayer.autoplay" type="checkbox"></label>
    <label><span>{{ t('loop') }}</span><input v-model="timelinePlayer.loop" type="checkbox"></label>
    <label><span>{{ t('speed') }}</span><NumericExpressionInput v-model="timelinePlayer.speed" :minimum="-100" :maximum="100" :step="0.1" :resource-key="entity.uuid + ':' + timelinePlayer.uuid + ':speed'" /></label>
    <label><span>{{ t('currentTime') }}</span><NumericExpressionInput v-model="timelinePlayer.currentTime" :minimum="0" :step="0.01" :resource-key="entity.uuid + ':' + timelinePlayer.uuid + ':currentTime'" /></label>
    <label><span>{{ t('playing') }}</span><input v-model="timelinePlayer.playing" type="checkbox"></label>
    <div class="component-actions"><button @click="timelineRuntime.skip(entity.uuid, physicsState.world.entities)">{{ t('skip') }}</button><button @click="timelineRuntime.resume(entity.uuid, physicsState.world.entities)">{{ t('resume') }}</button></div>
  </section>

  <section v-if="audioSource && componentVisible('AudioSource', t('audioSource'))" class="runtime-component">
    <header><strong>{{ t('audioSource') }}</strong><button @click="remove('AudioSource')">×</button></header>
    <label><span>{{ t('audioClip') }}</span><select v-model="audioSource.audioClip"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('volume') }}</span><NumericExpressionInput v-model="audioSource.volume" :minimum="0" :maximum="1" :step="0.01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':volume'" /></label>
    <label><span>{{ t('pitch') }}</span><NumericExpressionInput v-model="audioSource.pitch" :minimum="0.25" :maximum="4" :step="0.05" :resource-key="entity.uuid + ':' + audioSource.uuid + ':pitch'" /></label>
    <label><span>{{ t('loop') }}</span><input v-model="audioSource.loop" type="checkbox"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="audioSource.autoplay" type="checkbox"></label>
    <label><span>{{ t('audioBus') }}</span><select v-model="audioSource.bus"><option v-for="bus in physicsState.audioSettings.mixer.buses" :key="bus.id" :value="bus.id">{{ bus.name }}</option></select></label>
    <label><span>{{ t('spatialBlend') }}</span><input v-model.number="audioSource.spatialBlend" type="range" min="0" max="1" step="0.01" :data-resource-key="entity.uuid + ':' + audioSource.uuid + ':audioSource.spatialBlend'"></label>
    <label><span>{{ t('distanceRange') }}</span><div><NumericExpressionInput v-model="audioSource.minDistance" :minimum="0" :step="0.1" :resource-key="entity.uuid + ':' + audioSource.uuid + ':minDistance'" /><NumericExpressionInput v-model="audioSource.maxDistance" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + audioSource.uuid + ':maxDistance'" /></div></label>
    <label><span>{{ t('attenuationCurve') }}</span><select v-model="audioSource.attenuationCurve"><option>Linear</option><option>Inverse</option><option>Exponential</option><option>Custom</option></select></label>
    <label><span>{{ t('voicePriority') }}</span><NumericExpressionInput v-model="audioSource.voicePriority" :minimum="0" :maximum="255" :step="1" :resource-key="entity.uuid + ':' + audioSource.uuid + ':voicePriority'" /></label>
    <label><span>Polyphony</span><NumericExpressionInput v-model="audioSource.polyphony" :minimum="1" :maximum="32" :step="1" :resource-key="entity.uuid + ':' + audioSource.uuid + ':polyphony'" /></label>
    <label><span>Random pitch</span><NumericExpressionInput v-model="audioSource.randomPitch" :minimum="0" :maximum="1" :step="0.01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':randomPitch'" /></label>
    <label><span>Random volume</span><NumericExpressionInput v-model="audioSource.randomVolume" :minimum="0" :maximum="1" :step="0.01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':randomVolume'" /></label>
    <label><span>Virtualize when limited</span><input v-model="audioSource.virtualizeWhenLimited" type="checkbox"></label>
    <label><span>{{ t('streamingMode') }}</span><select v-model="audioSource.streamOverride"><option>ImportSetting</option><option>Stream</option><option>Buffer</option></select></label>
    <label><span>{{ t('startOffset') }}</span><NumericExpressionInput v-model="audioSource.startOffsetSeconds" :minimum="0" :step=".01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':startOffsetSeconds'" /></label>
    <label><span>{{ t('fadeInOut') }}</span><div><NumericExpressionInput v-model="audioSource.fadeInSeconds" :minimum="0" :step=".01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':fadeInSeconds'" /><NumericExpressionInput v-model="audioSource.fadeOutSeconds" :minimum="0" :step=".01" :resource-key="entity.uuid + ':' + audioSource.uuid + ':fadeOutSeconds'" /></div></label>
    <label><span>{{ t('dopplerScale') }}</span><NumericExpressionInput v-model="audioSource.dopplerScale" :minimum="0" :maximum="4" :step=".05" title="Stereo Web Audio reports Doppler as a limited capability." :resource-key="entity.uuid + ':' + audioSource.uuid + ':dopplerScale'" /></label>
    <label><span>{{ t('playlistMode') }}</span><select v-model="audioSource.playlistMode"><option>Single</option><option>Sequential</option><option>Random</option></select></label>
    <label v-if="audioSource.playlistMode !== 'Single'"><span>{{ t('addPlaylistClip') }}</span><select value="" @change="addPlaylistClip"><option value="">Choose…</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <div v-if="audioSource.playlistMode !== 'Single'" class="playlist-list"><button v-for="(reference,index) in audioSource.playlist" :key="`${reference}:${index}`" @click="audioSource.playlist.splice(index,1)"><span>{{ resolveAsset(reference)?.name ?? reference }}</span>×</button></div>
  </section>

  <section v-if="audioListener && componentVisible('AudioListener', t('audioListener'))" class="runtime-component">
    <header><strong>{{ t('audioListener') }}</strong><button @click="remove('AudioListener')">×</button></header>
    <label><span>{{ t('active') }}</span><input v-model="audioListener.active" type="checkbox"></label>
  </section>

  <section v-if="tileMap && componentVisible('TileMap2D', t('tileMap2D'))" class="runtime-component">
    <header><strong>{{ t('tileMap2D') }}</strong><button @click="remove('TileMap2D')">×</button></header>
    <label><span>{{ t('tileSet') }}</span><select v-model="tileMap.tileSetAsset" @change="tileMapChanged"><option :value="null">{{ t('none') }}</option><option v-for="asset in tileSetAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('mapSize') }}</span><div><NumericExpressionInput :model-value="tileMap.width" :minimum="1" :maximum="2048" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':width'" @update:model-value="resizeMap('width', $event)" /><NumericExpressionInput :model-value="tileMap.height" :minimum="1" :maximum="2048" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':height'" @update:model-value="resizeMap('height', $event)" /></div></label>
    <label><span>{{ t('tileWorldSize') }}</span><div><NumericExpressionInput v-model="tileMap.tileSize.x" :minimum="0.000001" :step="0.1" @change="tileMapChanged" :resource-key="entity.uuid + ':' + tileMap.uuid + ':tileSize.x'" /><NumericExpressionInput v-model="tileMap.tileSize.y" :minimum="0.000001" :step="0.1" @change="tileMapChanged" :resource-key="entity.uuid + ':' + tileMap.uuid + ':tileSize.y'" /></div></label>
    <label><span>{{ t('chunkSize') }}</span><NumericExpressionInput v-model="tileMap.chunkSize" :minimum="4" :maximum="128" @change="tileMapChanged" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':chunkSize'" /></label>
    <label><span>{{ t('opacity') }}</span><NumericExpressionInput v-model="tileMap.opacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':opacity'" /></label>
    <label><span>{{ t('sortingLayer') }}</span><NumericExpressionInput v-model="tileMap.sortingLayer" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':sortingLayer'" /></label>
    <label><span>{{ t('orderInLayer') }}</span><NumericExpressionInput v-model="tileMap.orderInLayer" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':orderInLayer'" /></label>
    <label><span>{{ t('filterMode') }}</span><select v-model="tileMap.filterMode"><option>Nearest</option><option>Linear</option></select></label>
    <label><span>{{ t('physicsLayer') }}</span><NumericExpressionInput v-model="tileMap.physicsLayer" :minimum="0" :maximum="31" @change="tileMapChanged" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':physicsLayer'" /></label>
    <label><span>{{ t('collisionMask') }}</span><NumericExpressionInput v-model="tileMap.collisionMask" :minimum="0" :maximum="4294967295" @change="tileMapChanged" :step="1" :resource-key="entity.uuid + ':' + tileMap.uuid + ':collisionMask'" /></label>
    <button class="open-editor" @click="openTilemapEditor">{{ t('openTilemapEditor') }}</button>
  </section>

  <section v-if="particleEmitter && componentVisible('ParticleEmitter2D', t('particleEmitter2D'))" class="runtime-component">
    <header><strong>{{ t('particleEmitter2D') }}</strong><button @click="remove('ParticleEmitter2D')">×</button></header>
    <label><span>{{ t('particleTexture') }}</span><select v-model="particleEmitter.textureAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('emissionRate') }}</span><NumericExpressionInput v-model="particleEmitter.emissionRate" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':emissionRate'" /></label>
    <label><span>Emission shape</span><select v-model="particleEmitter.emissionShape"><option>Point</option><option>Box</option><option>Circle</option><option>Edge</option></select></label>
    <label v-if="particleEmitter.emissionShape === 'Box' || particleEmitter.emissionShape === 'Edge'"><span>Shape size</span><div><NumericExpressionInput v-model="particleEmitter.shapeSize.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':shapeSize.x'" /><NumericExpressionInput v-model="particleEmitter.shapeSize.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':shapeSize.y'" /></div></label>
    <label v-if="particleEmitter.emissionShape === 'Circle'"><span>Shape radius</span><NumericExpressionInput v-model="particleEmitter.shapeRadius" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':shapeRadius'" /></label>
    <label><span>{{ t('burst') }}</span><NumericExpressionInput v-model="particleEmitter.burst" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':burst'" /></label>
    <label><span>{{ t('lifetime') }}</span><NumericExpressionInput v-model="particleEmitter.lifetime" :minimum="0.0001" :step="0.1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':lifetime'" /></label>
    <label><span>{{ t('velocityMin') }}</span><div><NumericExpressionInput v-model="particleEmitter.initialVelocityMin.x" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':initialVelocityMin.x'" /><NumericExpressionInput v-model="particleEmitter.initialVelocityMin.y" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':initialVelocityMin.y'" /></div></label>
    <label><span>{{ t('velocityMax') }}</span><div><NumericExpressionInput v-model="particleEmitter.initialVelocityMax.x" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':initialVelocityMax.x'" /><NumericExpressionInput v-model="particleEmitter.initialVelocityMax.y" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':initialVelocityMax.y'" /></div></label>
    <label><span>{{ t('particleGravity') }}</span><div><NumericExpressionInput v-model="particleEmitter.gravity.x" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':gravity.x'" /><NumericExpressionInput v-model="particleEmitter.gravity.y" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':gravity.y'" /></div></label>
    <label><span>{{ t('rotationRange') }}</span><div><NumericExpressionInput v-model="particleEmitter.rotationMin" :step="0.1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':rotationMin'" /><NumericExpressionInput v-model="particleEmitter.rotationMax" :step="0.1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':rotationMax'" /></div></label>
    <label><span>{{ t('angularVelocityRange') }}</span><div><NumericExpressionInput v-model="particleEmitter.angularVelocityMin" :step="0.1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':angularVelocityMin'" /><NumericExpressionInput v-model="particleEmitter.angularVelocityMax" :step="0.1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':angularVelocityMax'" /></div></label>
    <label><span>{{ t('scaleOverLifetime') }}</span><div><NumericExpressionInput v-model="particleEmitter.startScale" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':startScale'" /><NumericExpressionInput v-model="particleEmitter.endScale" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':endScale'" /></div></label>
    <label><span>{{ t('colorOverLifetime') }}</span><div><input type="color" :value="rgbHex(particleEmitter.startColor)" @input="setColor(particleEmitter.startColor, $event)"><input type="color" :value="rgbHex(particleEmitter.endColor)" @input="setColor(particleEmitter.endColor, $event)"></div></label>
    <label><span>{{ t('opacityOverLifetime') }}</span><div><NumericExpressionInput v-model="particleEmitter.startOpacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':startOpacity'" /><NumericExpressionInput v-model="particleEmitter.endOpacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':endOpacity'" /></div></label>
    <label><span>{{ t('maxParticles') }}</span><NumericExpressionInput v-model="particleEmitter.maxParticles" :minimum="0" :maximum="100000" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':maxParticles'" /></label>
    <label><span>Editor preview</span><input v-model="particleEmitter.previewInEditor" type="checkbox"></label>
    <label><span>Subemitter UUID</span><input v-model="particleEmitter.subEmitterUuid" placeholder="optional component UUID"></label>
    <label><span>Subemitter count</span><NumericExpressionInput v-model="particleEmitter.subEmitterCount" :minimum="0" :maximum="1000" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':subEmitterCount'" /></label>
    <label><span>Collision</span><select v-model="particleEmitter.collisionMode"><option>None</option><option>Bounce</option><option>Stop</option></select></label>
    <label v-if="particleEmitter.collisionMode === 'Bounce'"><span>Restitution</span><input v-model.number="particleEmitter.collisionRestitution" type="range" min="0" max="1" step=".01" :data-resource-key="entity.uuid + ':' + particleEmitter.uuid + ':particleEmitter.collisionRestitution'"></label>
    <label v-if="particleEmitter.collisionMode !== 'None'"><span>Collision layer mask</span><NumericExpressionInput v-model="particleEmitter.collisionLayerMask" :minimum="0" :maximum="4294967295" :step="1" :resource-key="entity.uuid + ':' + particleEmitter.uuid + ':collisionLayerMask'" /></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="particleEmitter.autoplay" type="checkbox"></label>
    <label><span>{{ t('loop') }}</span><input v-model="particleEmitter.looping" type="checkbox"></label>
    <label><span>{{ t('worldSpace') }}</span><input v-model="particleEmitter.worldSpace" type="checkbox"></label>
    <label><span>{{ t('blendMode') }}</span><select v-model="particleEmitter.blendMode"><option>Alpha</option><option>Additive</option></select></label>
  </section>

  <section v-if="light && componentVisible('Light2D', t('light2D'))" class="runtime-component">
    <header><strong>{{ t('light2D') }}</strong><button @click="remove('Light2D')">×</button></header>
    <label><span>{{ t('lightType') }}</span><select v-model="light.lightType"><option>Point</option><option>Spot</option><option>Directional</option><option>Area</option></select></label>
    <label><span>{{ t('lightColor') }}</span><input type="color" :value="rgbHex(light.color)" @input="setColor(light.color, $event)"></label>
    <label><span>{{ t('intensity') }}</span><NumericExpressionInput v-model="light.intensity" :minimum="0" :maximum="32" :step="0.05" :resource-key="entity.uuid + ':' + light.uuid + ':intensity'" /></label>
    <label v-if="light.lightType !== 'Directional'"><span>{{ t('range') }}</span><NumericExpressionInput v-model="light.range" :minimum="0.001" :step="0.1" :resource-key="entity.uuid + ':' + light.uuid + ':range'" /></label>
    <label v-if="light.lightType === 'Spot'"><span>{{ t('spotAngles') }}</span><div><NumericExpressionInput v-model="light.innerAngle" :minimum="0" :maximum="179" :step="1" :resource-key="entity.uuid + ':' + light.uuid + ':innerAngle'" /><NumericExpressionInput v-model="light.outerAngle" :minimum="0" :maximum="179" :step="1" :resource-key="entity.uuid + ':' + light.uuid + ':outerAngle'" /></div></label>
    <label v-if="light.lightType === 'Area'"><span>{{ t('areaSize') }}</span><div><NumericExpressionInput v-model="light.areaSize.x" :minimum="0.001" :step="1" :resource-key="entity.uuid + ':' + light.uuid + ':areaSize.x'" /><NumericExpressionInput v-model="light.areaSize.y" :minimum="0.001" :step="1" :resource-key="entity.uuid + ':' + light.uuid + ':areaSize.y'" /></div></label>
    <label><span>{{ t('lightMask') }}</span><NumericExpressionInput v-model="light.layerMask" :minimum="0" :maximum="4294967295" :step="1" :resource-key="entity.uuid + ':' + light.uuid + ':layerMask'" /></label>
    <label><span>{{ t('castsShadows') }}</span><input v-model="light.castsShadows" type="checkbox" :disabled="light.lightType === 'Directional'" :aria-describedby="light.lightType === 'Directional' ? `directional-shadow-${entity.uuid}` : undefined"></label>
    <label><span>{{ t('shadowSoftness') }}</span><input v-model.number="light.shadowSoftness" type="range" min="0" max="1" step="0.05" :disabled="light.lightType === 'Directional'" :aria-describedby="light.lightType === 'Directional' ? `directional-shadow-${entity.uuid}` : undefined" :data-resource-key="entity.uuid + ':' + light.uuid + ':light.shadowSoftness'"></label>
    <p v-if="light.lightType === 'Directional'" :id="`directional-shadow-${entity.uuid}`" class="renderer-capability-hint">{{ directionalShadowHint[preferencesState.locale] }}</p>
  </section>

  <section v-if="shadowCaster && componentVisible('ShadowCaster2D', t('shadowCaster2D'))" class="runtime-component">
    <header><strong>{{ t('shadowCaster2D') }}</strong><button @click="remove('ShadowCaster2D')">×</button></header>
    <label><span>{{ t('lightMask') }}</span><NumericExpressionInput v-model="shadowCaster.layerMask" :minimum="0" :maximum="4294967295" :step="1" :resource-key="entity.uuid + ':' + shadowCaster.uuid + ':layerMask'" /></label>
    <label><span>{{ t('selfShadows') }}</span><input v-model="shadowCaster.selfShadows" type="checkbox"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="shadowCaster.opacity" type="range" min="0" max="1" step="0.05" :data-resource-key="entity.uuid + ':' + shadowCaster.uuid + ':shadowCaster.opacity'"></label>
  </section>

  <section v-for="joint in visibleJoints" :key="joint.uuid" class="runtime-component">
    <header><strong>{{ t(joint.kind) }}</strong><button @click="remove(joint.kind)">×</button></header>
    <label><span>{{ t('connectedBody') }}</span><select v-model="joint.targetEntityUuid" @change="joint.initialized = false"><option :value="null">{{ t('none') }}</option><option v-for="entity in jointTargets" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}_{{ entity.id }}</option></select></label>
    <label><span>{{ t('anchor') }}</span><div><NumericExpressionInput v-model="joint.anchor.x" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':anchor.x'" /><NumericExpressionInput v-model="joint.anchor.y" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':anchor.y'" /></div></label>
    <label><span>{{ t('connectedAnchor') }}</span><div><NumericExpressionInput v-model="joint.connectedAnchor.x" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':connectedAnchor.x'" /><NumericExpressionInput v-model="joint.connectedAnchor.y" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':connectedAnchor.y'" /></div></label>
    <label><span>{{ t('collideConnected') }}</span><input v-model="joint.collideConnected" type="checkbox"></label>
    <label v-if="joint.kind === 'DistanceJoint2D' || joint.kind === 'RopeJoint2D' || joint.kind === 'SpringJoint2D'"><span>{{ t('jointDistance') }}</span><NumericExpressionInput v-model="joint.distance" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':distance'" /></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('stiffness') }}</span><NumericExpressionInput v-model="joint.stiffness" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':stiffness'" /></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('connectionDamping') }}</span><NumericExpressionInput v-model="joint.damping" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':damping'" /></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointAxis') }}</span><div><NumericExpressionInput v-model="joint.axis.x" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':axis.x'" /><NumericExpressionInput v-model="joint.axis.y" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':axis.y'" /></div></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointLimits') }}</span><input v-model="joint.limitsEnabled" type="checkbox"></label>
    <label v-if="joint.kind === 'PrismaticJoint2D' && joint.limitsEnabled"><span>{{ t('limitRange') }}</span><div><NumericExpressionInput v-model="joint.lowerLimit" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':lowerLimit'" /><NumericExpressionInput v-model="joint.upperLimit" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':upperLimit'" /></div></label>
    <label v-if="joint.kind === 'RevoluteJoint2D' || joint.kind === 'MotorJoint2D'"><span>{{ t('jointMotor') }}</span><input v-model="joint.motorEnabled" type="checkbox"></label>
    <label v-if="joint.motorEnabled"><span>{{ t('motorSpeed') }}</span><NumericExpressionInput v-model="joint.motorSpeed" :step="0.1" :resource-key="entity.uuid + ':' + joint.uuid + ':motorSpeed'" /></label>
    <label v-if="joint.motorEnabled"><span>{{ t('maxMotorForce') }}</span><NumericExpressionInput v-model="joint.maxMotorForce" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + joint.uuid + ':maxMotorForce'" /></label>
    <label><span>{{ t('breakForce') }}</span><LimitNumberInput v-model="joint.breakForce" :resource-key="`${entity.uuid}/${joint.uuid}/breakForce`" :label="t('breakForce')" /></label>
    <label><span>{{ t('breakTorque') }}</span><LimitNumberInput v-model="joint.breakTorque" :resource-key="`${entity.uuid}/${joint.uuid}/breakTorque`" :label="t('breakTorque')" /></label>
  </section>

  <section v-if="rectTransform && componentVisible('RectTransform', t('rectTransform'))" class="runtime-component">
    <header><strong>{{ t('rectTransform') }}</strong><button @click="remove('RectTransform')">×</button></header>
    <label><span>{{ t('layoutMode') }}</span><select v-model="rectTransform.layoutMode"><option>Responsive</option><option>Fixed</option></select></label>
    <label><span>{{ t('anchorPreset') }}</span><select v-model="rectTransform.anchorPreset"><option v-for="preset in anchorPresets" :key="preset" :value="preset">{{ anchorLabel(preset) }}</option></select></label>
    <label><span>{{ t('pivot') }}</span><div><NumericExpressionInput v-model="rectTransform.pivot.x" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':pivot.x'" /><NumericExpressionInput v-model="rectTransform.pivot.y" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':pivot.y'" /></div></label>
    <label><span>{{ t('uiPosition') }}</span><div><NumericExpressionInput v-model="rectTransform.position.x" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':position.x'" /><NumericExpressionInput v-model="rectTransform.position.y" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':position.y'" /></div></label>
    <label><span>{{ t('uiSize') }}</span><div><NumericExpressionInput v-model="rectTransform.size.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':size.x'" /><NumericExpressionInput v-model="rectTransform.size.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':size.y'" /></div></label>
    <label><span>{{ t('preferredSize') }}</span><div><NumericExpressionInput v-model="rectTransform.preferredSize.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':preferredSize.x'" /><NumericExpressionInput v-model="rectTransform.preferredSize.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':preferredSize.y'" /></div></label>
    <label><span>{{ t('anchorRange') }}</span><div class="quad"><NumericExpressionInput v-model="rectTransform.anchorMin.x" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':anchorMin.x'" /><NumericExpressionInput v-model="rectTransform.anchorMin.y" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':anchorMin.y'" /><NumericExpressionInput v-model="rectTransform.anchorMax.x" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':anchorMax.x'" /><NumericExpressionInput v-model="rectTransform.anchorMax.y" :minimum="0" :maximum="1" :step="0.05" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':anchorMax.y'" /></div></label>
    <label><span>{{ t('offsets') }}</span><div class="quad"><NumericExpressionInput v-model="rectTransform.offsets.left" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':offsets.left'" /><NumericExpressionInput v-model="rectTransform.offsets.top" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':offsets.top'" /><NumericExpressionInput v-model="rectTransform.offsets.right" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':offsets.right'" /><NumericExpressionInput v-model="rectTransform.offsets.bottom" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':offsets.bottom'" /></div></label>
    <label v-if="rectTransform.anchorPreset === 'stretch'"><span>{{ t('margins') }}</span><div class="quad"><NumericExpressionInput v-model="rectTransform.margins.left" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':margins.left'" /><NumericExpressionInput v-model="rectTransform.margins.top" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':margins.top'" /><NumericExpressionInput v-model="rectTransform.margins.right" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':margins.right'" /><NumericExpressionInput v-model="rectTransform.margins.bottom" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':margins.bottom'" /></div></label>
    <label><span>{{ t('sizePolicy') }}</span><div><select v-model="rectTransform.horizontalPolicy"><option>Fixed</option><option>Fill</option><option>Content</option></select><select v-model="rectTransform.verticalPolicy"><option>Fixed</option><option>Fill</option><option>Content</option></select></div></label>
    <label><span>{{ t('minimumSize') }}</span><div><NumericExpressionInput v-model="rectTransform.minSize.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':minSize.x'" /><NumericExpressionInput v-model="rectTransform.minSize.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':minSize.y'" /></div></label>
    <label><span>{{ t('maximumSize') }}</span><div><NumericExpressionInput v-model="rectTransform.maxSize.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':maxSize.x'" /><NumericExpressionInput v-model="rectTransform.maxSize.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':maxSize.y'" /></div></label>
    <label><span>{{ t('aspectConstraint') }}</span><div><select v-model="rectTransform.aspectConstraint"><option>None</option><option>Fit</option><option>WidthControlsHeight</option><option>HeightControlsWidth</option></select><NumericExpressionInput v-model="rectTransform.aspectRatio" :minimum="0" :step="0.01" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':aspectRatio'" /></div></label>
    <label><span>{{ t('zOrder') }}</span><NumericExpressionInput v-model="rectTransform.zOrder" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':zOrder'" /></label>
    <label><span>{{ t('mirrorInRtl') }}</span><input v-model="rectTransform.mirrorInRtl" type="checkbox"></label>
    <label><span>{{ t('reusableComponent') }}</span><div><input v-model="rectTransform.componentSource" placeholder="asset://GUID"><input v-model="rectTransform.componentVariant" placeholder="default"></div></label>
    <label><span>{{ t('focusable') }}</span><input v-model="rectTransform.focusable" type="checkbox"></label>
    <label><span>{{ t('tabIndex') }}</span><NumericExpressionInput v-model="rectTransform.tabIndex" :minimum="-1" :maximum="100000" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':tabIndex'" /></label>
    <label><span>{{ t('focusNavigation') }}</span><div class="quad"><input v-model="rectTransform.focusUp" :placeholder="t('upUuid')"><input v-model="rectTransform.focusDown" :placeholder="t('downUuid')"><input v-model="rectTransform.focusLeft" :placeholder="t('leftUuid')"><input v-model="rectTransform.focusRight" :placeholder="t('rightUuid')"></div></label>
    <label><span>{{ t('accessibilityRole') }}</span><input v-model="rectTransform.accessibilityRole"></label>
    <label><span>{{ t('accessibilityLabel') }}</span><input v-model="rectTransform.accessibilityLabel"></label>
    <label><span>{{ t('accessibilityDescription') }}</span><input v-model="rectTransform.accessibilityDescription"></label>
    <label><span>{{ t('accessibilityState') }}</span><input v-model="rectTransform.accessibilityState"></label>
    <label><span>{{ t('accessibilityValue') }}</span><input v-model="rectTransform.accessibilityValue"></label>
    <label><span>{{ t('liveRegion') }}</span><select v-model="rectTransform.accessibilityLive"><option>Off</option><option>Polite</option><option>Assertive</option></select></label>
    <label><span>{{ t('readingOrder') }}</span><NumericExpressionInput v-model="rectTransform.readingOrder" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':readingOrder'" /></label>
    <label><span>{{ t('skipNavigation') }}</span><input v-model="rectTransform.skipNavigation" type="checkbox"></label>
    <label><span>{{ t('screenReaderHidden') }}</span><input v-model="rectTransform.accessibilityHidden" type="checkbox"></label>
    <label><span>{{ t('remapAction') }}</span><div><input v-model="rectTransform.remapAction" :placeholder="t('inputAction')"><NumericExpressionInput v-model="rectTransform.remapBindingIndex" :minimum="0" :maximum="31" :step="1" :resource-key="entity.uuid + ':' + rectTransform.uuid + ':remapBindingIndex'" /></div></label>
    <div class="breakpoint-editor"><strong>{{ t('responsiveBreakpoints') }}</strong><article v-for="(point,index) in rectTransform.breakpoints" :key="index"><NumericExpressionInput v-model="point.minWidth" :minimum="0" :step="1" :resource-key="breakpointResourceKey(point, 'minWidth')" /><NumericExpressionInput v-model="point.maxWidth" :minimum="0" :step="1" :resource-key="breakpointResourceKey(point, 'maxWidth')" /><input v-model="point.visible" type="checkbox"><button @click="rectTransform.breakpoints.splice(index,1)">×</button></article><button @click="addBreakpoint">+ {{ t('breakpoint') }}</button></div>
  </section>

  <section v-if="canvas && componentVisible('Canvas', t('uiCanvas'))" class="runtime-component">
    <header><strong>{{ t('uiCanvas') }}</strong><button @click="remove('Canvas')">×</button></header>
    <label><span>{{ t('referenceSize') }}</span><div><NumericExpressionInput v-model="canvas.referenceSize.x" :minimum="1" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':referenceSize.x'" /><NumericExpressionInput v-model="canvas.referenceSize.y" :minimum="1" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':referenceSize.y'" /></div></label>
    <label><span>{{ t('scaleWithScreen') }}</span><input v-model="canvas.scaleWithScreen" type="checkbox"></label>
    <label><span>DPI</span><NumericExpressionInput v-model="canvas.dpiScale" :minimum="0.5" :maximum="4" :step="0.25" :resource-key="entity.uuid + ':' + canvas.uuid + ':dpiScale'" /></label>
    <label><span>{{ t('liveLocalePreview') }}</span><input v-model="canvas.localePreview" placeholder="en-US / ar"></label>
    <label><span>{{ t('sortingOrder') }}</span><NumericExpressionInput v-model="canvas.sortingOrder" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':sortingOrder'" /></label>
    <label><span>{{ t('safeArea') }}</span><input v-model="canvas.safeArea" type="checkbox"></label>
    <label v-if="canvas.safeArea"><span>{{ t('safeAreaInsets') }}</span><div class="quad"><NumericExpressionInput v-model="canvas.safeAreaInsets.left" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':safeAreaInsets.left'" /><NumericExpressionInput v-model="canvas.safeAreaInsets.top" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':safeAreaInsets.top'" /><NumericExpressionInput v-model="canvas.safeAreaInsets.right" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':safeAreaInsets.right'" /><NumericExpressionInput v-model="canvas.safeAreaInsets.bottom" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + canvas.uuid + ':safeAreaInsets.bottom'" /></div></label>
    <label><span>{{ t('uiTheme') }}</span><select v-model="canvas.themeAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in themeAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('variant') }}</span><input v-model="canvas.themeVariant" placeholder="default / compact / highContrast"></label>
  </section>

  <section v-if="panel && componentVisible('Panel', t('uiPanel'))" class="runtime-component">
    <header><strong>{{ t('uiPanel') }}</strong><button @click="remove('Panel')">×</button></header>
    <label><span>{{ t('color') }}</span><input type="color" :value="rgbHex(panel.color)" @input="setColor(panel.color, $event)"></label>
    <label><span>{{ t('opacity') }}</span><NumericExpressionInput v-model="panel.opacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':opacity'" /></label>
    <label><span>{{ t('cornerRadius') }}</span><NumericExpressionInput v-model="panel.cornerRadius" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':cornerRadius'" /></label>
    <label><span>{{ t('layoutContainer') }}</span><select v-model="panel.layout"><option>None</option><option>Row</option><option>Column</option><option>Grid</option><option>Flow</option><option>Overlay</option><option>Center</option><option>Margin</option><option>Aspect</option><option>Split</option></select></label>
    <label v-if="panel.layout !== 'None'"><span>{{ t('gapColumns') }}</span><div><NumericExpressionInput v-model="panel.gap" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':gap'" /><NumericExpressionInput v-model="panel.columns" :minimum="1" :maximum="64" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':columns'" /></div></label>
    <label v-if="panel.layout !== 'None'"><span>{{ t('padding') }}</span><div class="quad"><NumericExpressionInput v-model="panel.padding.left" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':padding.left'" /><NumericExpressionInput v-model="panel.padding.top" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':padding.top'" /><NumericExpressionInput v-model="panel.padding.right" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':padding.right'" /><NumericExpressionInput v-model="panel.padding.bottom" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':padding.bottom'" /></div></label>
    <label><span>{{ t('wrap') }}</span><input v-model="panel.wrap" type="checkbox"></label>
    <label><span>{{ t('alignment') }}</span><div><select v-model="panel.align"><option>Start</option><option>Center</option><option>End</option><option>Stretch</option></select><select v-model="panel.justify"><option>Start</option><option>Center</option><option>End</option><option>SpaceBetween</option></select></div></label>
    <label><span>{{ t('clipMask') }}</span><div><input v-model="panel.clipChildren" type="checkbox"><input v-model="panel.maskChildren" type="checkbox"></div></label>
    <label><span>{{ t('scrollView') }}</span><div><input v-model="panel.scrollHorizontal" type="checkbox"><input v-model="panel.scrollVertical" type="checkbox"></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollOffset') }}</span><div><NumericExpressionInput v-model="panel.scrollOffset.x" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':scrollOffset.x'" /><NumericExpressionInput v-model="panel.scrollOffset.y" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':scrollOffset.y'" /></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollContentSize') }}</span><div><NumericExpressionInput v-model="panel.contentSize.x" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':contentSize.x'" /><NumericExpressionInput v-model="panel.contentSize.y" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':contentSize.y'" /></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollSpeed') }}</span><NumericExpressionInput v-model="panel.scrollSpeed" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + panel.uuid + ':scrollSpeed'" /></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('showScrollbars') }}</span><input v-model="panel.showScrollbars" type="checkbox"></label>
    <label><span>{{ t('uiBehavior') }}</span><select v-model="panel.behavior"><option>Normal</option><option>Modal</option><option>Popup</option><option>Tooltip</option></select></label>
    <label><span>{{ t('visible') }}</span><input v-model="panel.visible" type="checkbox"></label>
    <label v-if="panel.behavior === 'Modal' || panel.behavior === 'Popup'"><span>{{ t('closeOnOutside') }}</span><input v-model="panel.closeOnOutside" type="checkbox"></label>
    <label><span>{{ t('dragAndDrop') }}</span><div><input v-model="panel.draggable" type="checkbox"><input v-model="panel.dropGroup" :placeholder="t('group')"></div></label>
    <label v-if="panel.behavior === 'Tooltip'"><span>{{ t('tooltip') }}</span><div><input v-model="panel.tooltipText"><NumericExpressionInput v-model="panel.tooltipDelay" :minimum="0" :step="0.05" :resource-key="entity.uuid + ':' + panel.uuid + ':tooltipDelay'" /></div></label>
    <label><span>{{ t('uiStyleClass') }}</span><input v-model="panel.styleClass"></label><label><span>{{ t('overrideBackground') }}</span><input v-model="panel.styleOverrides.background" placeholder="#232934 / $surface"></label>
  </section>

  <section v-if="image && componentVisible('Image', t('uiImage'))" class="runtime-component">
    <header><strong>{{ t('uiImage') }}</strong><button @click="remove('Image')">×</button></header>
    <label><span>{{ t('spriteAsset') }}</span><select v-model="image.spriteAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <button class="component-import" @click="uiImageInput?.click()">+ {{ t('importTexture') }}</button><input ref="uiImageInput" hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" @change="importUiImage">
    <label><span>{{ t('tint') }}</span><input type="color" :value="rgbHex(image.tint)" @input="setColor(image.tint, $event)"></label><label><span>{{ t('opacity') }}</span><NumericExpressionInput v-model="image.opacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + image.uuid + ':opacity'" /></label><label><span>{{ t('preserveAspect') }}</span><input v-model="image.preserveAspect" type="checkbox"></label>
    <label><span>{{ t('nineSlice') }}</span><input v-model="image.nineSlice.enabled" type="checkbox"></label>
    <label v-if="image.nineSlice.enabled"><span>{{ t('sliceBorders') }}</span><div><NumericExpressionInput v-model="image.nineSlice.left" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + image.uuid + ':nineSlice.left'" /><NumericExpressionInput v-model="image.nineSlice.top" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + image.uuid + ':nineSlice.top'" /><NumericExpressionInput v-model="image.nineSlice.right" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + image.uuid + ':nineSlice.right'" /><NumericExpressionInput v-model="image.nineSlice.bottom" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + image.uuid + ':nineSlice.bottom'" /></div></label>
  </section>
  <section v-if="text && componentVisible('Text', t('uiText'))" class="runtime-component"><header><strong>{{ t('uiText') }}</strong><button @click="remove('Text')">×</button></header><label class="stacked"><span>{{ t('textContent') }}</span><textarea v-model="text.text" rows="2"></textarea></label><label><span>{{ t('localizationKey') }}</span><input v-model="text.localizationKey"></label><label><span>{{ t('fontAsset') }}</span><select v-model="text.fontAsset"><option :value="null">{{ t('defaultFont') }}</option><option v-for="asset in fontAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('textColor') }}</span><input type="color" :value="rgbHex(text.color)" @input="setColor(text.color, $event)"></label><label><span>{{ t('opacity') }}</span><NumericExpressionInput v-model="text.opacity" :minimum="0" :maximum="100" :step="1" :resource-key="entity.uuid + ':' + text.uuid + ':opacity'" /></label><label><span>{{ t('fontSize') }}</span><NumericExpressionInput v-model="text.fontSize" :minimum="1" :step="1" :resource-key="entity.uuid + ':' + text.uuid + ':fontSize'" /></label><label><span>{{ t('fontWeight') }}</span><NumericExpressionInput v-model="text.fontWeight" :minimum="100" :maximum="900" :step="100" :resource-key="entity.uuid + ':' + text.uuid + ':fontWeight'" /></label><label><span>{{ t('alignment') }}</span><select v-model="text.align"><option value="left">{{ t('left') }}</option><option value="center">{{ t('center') }}</option><option value="right">{{ t('right') }}</option></select></label><label><span>{{ t('textLayout') }}</span><div><select v-model="text.wrap"><option>None</option><option>Word</option><option>Character</option></select><select v-model="text.overflow"><option>Visible</option><option>Clip</option><option>Ellipsis</option></select></div></label><label><span>{{ t('inputPromptAction') }}</span><input v-model="text.inputPromptAction" :placeholder="t('inputAction')"></label><label><span>{{ t('captionCategory') }}</span><select v-model="text.captionCategory"><option value="None">{{ t('captionNone') }}</option><option value="Dialogue">{{ t('captionDialogue') }}</option><option value="Effects">{{ t('captionEffects') }}</option><option value="Music">{{ t('captionMusic') }}</option></select></label></section>
  <section v-if="button && componentVisible('Button', t('uiButton'))" class="runtime-component"><header><strong>{{ t('uiButton') }}</strong><button @click="remove('Button')">×</button></header><label><span>{{ t('interactable') }}</span><input v-model="button.interactable" type="checkbox"></label><TimelineButtonAction :entity="entity" :button="button" /><label><span>on_pressed</span><input v-model="button.onPressed"></label><label><span>on_hover_enter</span><input v-model="button.onHoverEnter"></label><label><span>on_hover_exit</span><input v-model="button.onHoverExit"></label><label><span>{{ t('normalColor') }}</span><input type="color" :value="rgbHex(button.normalColor)" @input="setColor(button.normalColor, $event)"></label><label><span>{{ t('hoveredColor') }}</span><input type="color" :value="rgbHex(button.hoveredColor)" @input="setColor(button.hoveredColor, $event)"></label><label><span>{{ t('pressedColor') }}</span><input type="color" :value="rgbHex(button.pressedColor)" @input="setColor(button.pressedColor, $event)"></label><label><span>{{ t('disabledColor') }}</span><input type="color" :value="rgbHex(button.disabledColor)" @input="setColor(button.disabledColor, $event)"></label><label><span>{{ t('pressAudio') }}</span><select v-model="button.pressAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('hoverAudio') }}</span><select v-model="button.hoverAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('focusAudio') }}</span><select v-model="button.focusAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="button.styleClass"></label><label><span>{{ t('overrideBackground') }}</span><input v-model="button.styleOverrides.background" placeholder="#4f96ff / $accent"></label></section>
  <section v-if="slider && componentVisible('Slider', t('uiSlider'))" class="runtime-component"><header><strong>{{ t('uiSlider') }}</strong><button @click="remove('Slider')">×</button></header><ValueRange :component="slider" /><label><span>{{ t('wholeNumbers') }}</span><input v-model="slider.wholeNumbers" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="slider.interactable" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="slider.styleClass"></label></section>
  <section v-if="progress && componentVisible('ProgressBar', t('uiProgressBar'))" class="runtime-component"><header><strong>{{ t('uiProgressBar') }}</strong><button @click="remove('ProgressBar')">×</button></header><ValueRange :component="progress" /><label><span>{{ t('fillColor') }}</span><input type="color" :value="rgbHex(progress.fillColor)" @input="setColor(progress.fillColor, $event)"></label><label><span>{{ t('backgroundColor') }}</span><input type="color" :value="rgbHex(progress.backgroundColor)" @input="setColor(progress.backgroundColor, $event)"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="progress.styleClass"></label></section>
  <section v-if="checkbox && componentVisible('Checkbox', t('uiCheckbox'))" class="runtime-component"><header><strong>{{ t('uiCheckbox') }}</strong><button @click="remove('Checkbox')">×</button></header><label><span>{{ t('label') }}</span><input v-model="checkbox.label"></label><label><span>{{ t('localizationKey') }}</span><input v-model="checkbox.localizationKey"></label><label><span>{{ t('checked') }}</span><input v-model="checkbox.checked" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="checkbox.interactable" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="checkbox.styleClass"></label></section>
  <section v-if="textInput && componentVisible('TextInput', t('uiTextInput'))" class="runtime-component"><header><strong>{{ t('uiTextInput') }}</strong><button @click="remove('TextInput')">×</button></header><label><span>{{ t('value') }}</span><input v-model="textInput.value"></label><label><span>{{ t('placeholder') }}</span><input v-model="textInput.placeholder"></label><label><span>{{ t('maxLength') }}</span><NumericExpressionInput v-model="textInput.maxLength" :minimum="0" :step="1" :resource-key="entity.uuid + ':' + textInput.uuid + ':maxLength'" /></label><label><span>{{ t('password') }}</span><input v-model="textInput.password" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="textInput.styleClass"></label></section>

  <section v-if="componentVisible('Canvas', t('createGameUi'))" class="ui-palette">
    <strong>{{ t('createGameUi') }}</strong>
    <p>{{ t('uiEditorHint') }}</p>
    <div><button v-for="kind in uiKinds" :key="kind" @click="create(kind)">+ {{ t(`create${kind}`) }}</button></div>
  </section>
</template>

<script setup lang="ts">
import NumericExpressionInput from './NumericExpressionInput.vue'
import LimitNumberInput from './LimitNumberInput.vue'
import TimelineButtonAction from './TimelineButtonAction.vue'
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import { assetReference, assetState, importAssetFiles, resolveAsset } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { preferencesState } from '../store/preferences'
import { directionalShadowHint } from '../editor/lightInspectorCopy'
import { beginHistoryTransaction, commitHistoryTransaction, cancelHistoryTransaction, createUiEntity, physicsState, pushHistory, type UiElementKind } from '../store/physics'
import type { Entity } from '../world/Entity'
import type {
  Animator, AudioListener, AudioSource, Button, Canvas, Checkbox, ComponentKind, Image, Joint2D, Light2D, Panel,
  ParticleEmitter2D, ProgressBar, RectTransform, ShadowCaster2D, Skeleton2D, Slider, Text, TextInput, TileMap2D, TimelinePlayer
} from '../world/components'
import type { InspectorCategory } from '../store/editor'
import { readAnimatorController } from '../runtime/animation'
import { requestConfirmation } from '../store/dialog'
import { editorState } from '../store/editor'
import { invalidateTileMap, resizeTileMap, tilemapEditorState } from '../runtime/tilemap'
import { timelineRuntime } from '../runtime/timeline'

const props = defineProps<{ entity: Entity; searchQuery?: string; category?: InspectorCategory }>()
const breakpointIds = new WeakMap<object, number>(); let nextBreakpointId = 0
function breakpointResourceKey(point: object, field: string): string { let id = breakpointIds.get(point); if (id === undefined) { id = ++nextBreakpointId; breakpointIds.set(point, id) } return props.entity.uuid + ':breakpoint:' + id + ':' + field }
const uiImageInput = ref<HTMLInputElement | null>(null)
const ValueRange = defineComponent({ props: { component: { type: Object as PropType<Slider | ProgressBar>, required: true } }, setup(componentProps) { return () => h('div', { class: 'range-values' }, [['min', 'Min'], ['max', 'Max'], ['value', t('value')]].map(([key, label]) => h('label', [h('span', label), h(NumericExpressionInput, { modelValue: componentProps.component[key as 'min'], resourceKey: props.entity.uuid + ':' + componentProps.component.uuid + ':' + key, step: 1, 'onUpdate:modelValue': (value: number) => { componentProps.component[key as 'min'] = value } })])) ) } })
const anchorPresets = ['top-left', 'top', 'top-right', 'left', 'center', 'right', 'bottom-left', 'bottom', 'bottom-right', 'stretch'] as const
const uiKinds: UiElementKind[] = ['Canvas', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput']
const imageAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'image'))
const audioAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'audio'))
const fontAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'font'))
const themeAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'uiTheme'))
const controllerAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'controller'))
const rigAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'rig'))
const skinAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'skin'))
const timelineAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'timeline'))
const tileSetAssets = computed(() => assetState.records.filter(asset => asset.assetType === 'tileset'))
const animator = computed(() => props.entity.getComponent<Animator>('Animator'))
const skeleton = computed(() => props.entity.getComponent<Skeleton2D>('Skeleton2D'))
const timelinePlayer = computed(() => props.entity.getComponent<TimelinePlayer>('TimelinePlayer'))
const audioSource = computed(() => props.entity.getComponent<AudioSource>('AudioSource'))
const audioListener = computed(() => props.entity.getComponent<AudioListener>('AudioListener'))
const rectTransform = computed(() => props.entity.getComponent<RectTransform>('RectTransform'))
const canvas = computed(() => props.entity.getComponent<Canvas>('Canvas'))
const panel = computed(() => props.entity.getComponent<Panel>('Panel'))
const image = computed(() => props.entity.getComponent<Image>('Image'))
const text = computed(() => props.entity.getComponent<Text>('Text'))
const button = computed(() => props.entity.getComponent<Button>('Button'))
const slider = computed(() => props.entity.getComponent<Slider>('Slider'))
const progress = computed(() => props.entity.getComponent<ProgressBar>('ProgressBar'))
const checkbox = computed(() => props.entity.getComponent<Checkbox>('Checkbox'))
const textInput = computed(() => props.entity.getComponent<TextInput>('TextInput'))
const tileMap = computed(() => props.entity.getComponent<TileMap2D>('TileMap2D'))
const particleEmitter = computed(() => props.entity.getComponent<ParticleEmitter2D>('ParticleEmitter2D'))
const light = computed(() => props.entity.getComponent<Light2D>('Light2D'))
const shadowCaster = computed(() => props.entity.getComponent<ShadowCaster2D>('ShadowCaster2D'))
const jointKinds = ['FixedJoint2D', 'WeldJoint2D', 'DistanceJoint2D', 'RopeJoint2D', 'RevoluteJoint2D', 'MotorJoint2D', 'PrismaticJoint2D', 'SpringJoint2D'] as const
const joints = computed(() => jointKinds.flatMap(kind => { const component = props.entity.getComponent<Joint2D>(kind); return component ? [component] : [] }))
const visibleJoints = computed(() => joints.value.filter(joint => componentVisible(joint.kind, t(joint.kind))))
const jointTargets = computed(() => physicsState.world.entities.filter(entity => entity !== props.entity && entity.hasComponent('RigidBody2D') && entity.getCollider()))

function componentCategory(kind: ComponentKind): InspectorCategory {
  if (['Canvas', 'RectTransform', 'Panel', 'Image', 'Text', 'Button', 'Slider', 'ProgressBar', 'Checkbox', 'TextInput'].includes(kind)) return 'ui'
  if (['TileMap2D', 'ParticleEmitter2D', 'Light2D', 'ShadowCaster2D'].includes(kind)) return 'render'
  if (kind.endsWith('Joint2D')) return 'physics'
  return 'gameplay'
}
function componentVisible(kind: ComponentKind, title: string): boolean {
  const category = props.category ?? 'all'
  if (category !== 'all' && category !== componentCategory(kind)) return false
  const needle = (props.searchQuery ?? '').trim().toLocaleLowerCase()
  return !needle || `${title} ${kind}`.toLocaleLowerCase().includes(needle)
}
watch(() => animator.value?.controllerAsset, reference => {
  if (!animator.value) return
  const document = readAnimatorController(reference ?? null)
  if (!document) { animator.value.parameters = {}; animator.value.currentState = ''; return }
  animator.value.parameters = Object.fromEntries(document.parameters.map(parameter => [parameter.name, animator.value!.parameters[parameter.name] ?? parameter.defaultValue]))
  animator.value.currentState = document.defaultState
})
async function remove(kind: ComponentKind) {
  const approved = await requestConfirmation({ title: t('removeComponent'), message: `${t('removeComponent')}: ${kind}?`, confirmLabel: t('confirmAction'), cancelLabel: t('cancel'), destructive: true })
  if (approved && props.entity.removeComponent(kind)) pushHistory(`Remove ${kind}`)
}
function create(kind: UiElementKind) {
  const canContainUi = props.entity.hasComponent('Canvas') || props.entity.hasComponent('Panel')
  createUiEntity(kind, canContainUi ? props.entity.uuid : props.entity.parentUuid)
}
async function importUiImage(event: Event) {
  const input = event.target as HTMLInputElement
  if (!image.value || !input.files?.length) return
  const imported = await importAssetFiles(input.files, 'Assets/Sprites')
  const asset = imported.find(candidate => candidate.assetType === 'image')
  if (asset) { image.value.spriteAsset = assetReference(asset.uuid); pushHistory('Import UI image') }
  input.value = ''
}
function rgbHex(value: { r: number; g: number; b: number }) { return `#${[value.r, value.g, value.b].map(channel => Math.round(channel).toString(16).padStart(2, '0')).join('')}` }
function setColor(target: { r: number; g: number; b: number }, event: Event) { const value = (event.target as HTMLInputElement).value; target.r = parseInt(value.slice(1, 3), 16); target.g = parseInt(value.slice(3, 5), 16); target.b = parseInt(value.slice(5, 7), 16) }
function addPlaylistClip(event: Event) { const select = event.target as HTMLSelectElement, reference = select.value; if (audioSource.value && reference && audioSource.value.playlist.length < 256) audioSource.value.playlist.push(reference); select.value = '' }
function anchorLabel(preset: typeof anchorPresets[number]) { return t(`anchor_${preset.replace(/-/g, '_')}` as Parameters<typeof t>[0]) }
function resizeMap(axis: 'width' | 'height', value: number) { const map = tileMap.value; if (!map || !beginHistoryTransaction('Resize TileMap', null, props.entity.uuid + ':' + map.uuid + ':' + axis)) return; try { resizeTileMap(map, axis === 'width' ? value : map.width, axis === 'height' ? value : map.height); commitHistoryTransaction() } catch (error) { cancelHistoryTransaction(); throw error } }
function tileMapChanged() { if (!tileMap.value) return; tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory('Edit TileMap') }
function openTilemapEditor() { tilemapEditorState.selectedEntityUuid = props.entity.uuid; tilemapEditorState.active = true; editorState.bottomPanelTab = 'tilemap'; editorState.bottomPanelOpen = true }
function addBreakpoint() { if (rectTransform.value && rectTransform.value.breakpoints.length < 32) rectTransform.value.breakpoints.push({ minWidth: 0, maxWidth: 1280, visible: true, position: { ...rectTransform.value.position }, size: { ...rectTransform.value.size } }) }
</script>

<style scoped>
.renderer-capability-hint { margin: 8px 9px; color: var(--text-muted); font-size: var(--type-caption); line-height: 1.5; overflow-wrap: anywhere; }
.runtime-component { margin-bottom: 9px; border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; background: var(--surface-2); }.runtime-component header { min-height: 34px; padding: 0 9px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }.runtime-component header strong { color: var(--text-primary); font-size:11px; }.runtime-component header button { width: 25px; height: 25px; border: 0; border-radius: 6px; color: var(--danger); background: transparent; }.runtime-component header button:hover { background: var(--danger-soft); }.runtime-component label, .range-values label { min-height: 34px; padding: 5px 9px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; line-height: 1.3; }.runtime-component label:last-child { border-bottom: 0; }.runtime-component label > span { min-width: 0; }.runtime-component label > input:not([type='checkbox']):not([type='color']), .runtime-component label > select { width: 55%; min-width: 0; min-height: 27px; }.runtime-component label > input[type='color'] { width: 42px; height: 25px; }.runtime-component label > div { width: 55%; display: flex; gap: 4px; }.runtime-component label > div input { min-width: 0; width: 50%; min-height: 27px; }.runtime-component label > .quad { display: grid; grid-template-columns: 1fr 1fr; }.runtime-component .stacked { align-items: stretch; flex-direction: column; }.runtime-component textarea { width: 100%; min-height: 58px; resize: vertical; }.range-values { display: grid; }.component-import { width: calc(100% - 18px); min-height: 28px; margin: 7px 9px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; }.ui-palette { padding: 11px; border: 1px dashed var(--border-strong); border-radius: 10px; }.ui-palette > strong { color: var(--text-secondary); font-size:11px; }.ui-palette > p { margin: 4px 0 0; color: var(--text-muted); font-size:11px; line-height: 1.4; }.ui-palette > div { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }.ui-palette button { min-width: 0; min-height: 31px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }
.open-editor { width: calc(100% - 16px); min-height: 28px; margin: 8px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent); background: var(--accent-soft); font-size:11px; }
.playlist-list{padding:6px 9px;display:grid;gap:3px}.playlist-list button{min-height:27px;padding:0 7px;display:flex;justify-content:space-between;gap:6px;overflow:hidden;border:1px solid var(--border-subtle);border-radius:6px;color:var(--text-secondary);background:var(--surface-3);font-size:11px}.playlist-list span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.breakpoint-editor { padding: 8px; display: grid; gap: 5px; border-top: 1px solid var(--border-subtle); }.breakpoint-editor > strong { color: var(--text-muted); font-size:11px; }.breakpoint-editor article { display: grid; grid-template-columns: 1fr 1fr 24px 24px; gap: 4px; }.breakpoint-editor input { min-width: 0; }.breakpoint-editor button { min-height: 26px; border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); background: var(--surface-3); font-size:11px; }
.runtime-component label{flex-wrap:wrap}.runtime-component label > .numeric-draft{width:55%;min-width:min(100%,calc(10ch + 64px))}.runtime-component label > div{flex-wrap:wrap;flex:1 1 55%;max-width:100%}.runtime-component label > .quad{grid-template-columns:repeat(auto-fit,minmax(min(100%,calc(10ch + 64px)),1fr))}.runtime-component :deep(.numeric-draft input){width:100%;min-height:28px}.breakpoint-editor article{grid-template-columns:minmax(0,1fr) 24px 24px}.breakpoint-editor article > .numeric-draft{grid-column:1 / -1}
</style>
