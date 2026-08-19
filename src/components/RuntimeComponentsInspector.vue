<template>
  <section v-if="animator && componentVisible('Animator', t('animator'))" class="runtime-component">
    <header><strong>{{ t('animator') }}</strong><button @click="remove('Animator')">×</button></header>
    <label><span>{{ t('controller') }}</span><select v-model="animator.controllerAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in controllerAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('speed') }}</span><input v-model.number="animator.speed" type="number" step="0.1"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="animator.autoplay" type="checkbox"></label>
    <label><span>{{ t('currentState') }}</span><code>{{ animator.currentState || '—' }}</code></label>
    <label v-for="(value, name) in animator.parameters" :key="name"><span>{{ name }}</span><input v-if="typeof value === 'boolean'" v-model="animator.parameters[name]" type="checkbox"><input v-else v-model.number="animator.parameters[name]" type="number" step="0.01"></label>
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
    <label><span>{{ t('speed') }}</span><input v-model.number="timelinePlayer.speed" type="number" min="-100" max="100" step="0.1"></label>
    <label><span>{{ t('currentTime') }}</span><input v-model.number="timelinePlayer.currentTime" type="number" min="0" step="0.01"></label>
  </section>

  <section v-if="audioSource && componentVisible('AudioSource', t('audioSource'))" class="runtime-component">
    <header><strong>{{ t('audioSource') }}</strong><button @click="remove('AudioSource')">×</button></header>
    <label><span>{{ t('audioClip') }}</span><select v-model="audioSource.audioClip"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('volume') }}</span><input v-model.number="audioSource.volume" type="number" min="0" max="1" step="0.01"></label>
    <label><span>{{ t('pitch') }}</span><input v-model.number="audioSource.pitch" type="number" min="0.25" max="4" step="0.05"></label>
    <label><span>{{ t('loop') }}</span><input v-model="audioSource.loop" type="checkbox"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="audioSource.autoplay" type="checkbox"></label>
    <label><span>{{ t('audioBus') }}</span><select v-model="audioSource.bus"><option v-for="bus in physicsState.audioSettings.mixer.buses" :key="bus.id" :value="bus.id">{{ bus.name }}</option></select></label>
    <label><span>{{ t('spatialBlend') }}</span><input v-model.number="audioSource.spatialBlend" type="range" min="0" max="1" step="0.01"></label>
    <label><span>{{ t('distanceRange') }}</span><div><input v-model.number="audioSource.minDistance" type="number" min="0" step="0.1"><input v-model.number="audioSource.maxDistance" type="number" min="0" step="1"></div></label>
    <label><span>{{ t('attenuationCurve') }}</span><select v-model="audioSource.attenuationCurve"><option>Linear</option><option>Inverse</option><option>Exponential</option><option>Custom</option></select></label>
    <label><span>{{ t('voicePriority') }}</span><input v-model.number="audioSource.voicePriority" type="number" min="0" max="255"></label>
    <label><span>Polyphony</span><input v-model.number="audioSource.polyphony" type="number" min="1" max="32"></label>
    <label><span>Random pitch</span><input v-model.number="audioSource.randomPitch" type="number" min="0" max="1" step="0.01"></label>
    <label><span>Random volume</span><input v-model.number="audioSource.randomVolume" type="number" min="0" max="1" step="0.01"></label>
    <label><span>Virtualize when limited</span><input v-model="audioSource.virtualizeWhenLimited" type="checkbox"></label>
    <label><span>{{ t('streamingMode') }}</span><select v-model="audioSource.streamOverride"><option>ImportSetting</option><option>Stream</option><option>Buffer</option></select></label>
  </section>

  <section v-if="audioListener && componentVisible('AudioListener', t('audioListener'))" class="runtime-component">
    <header><strong>{{ t('audioListener') }}</strong><button @click="remove('AudioListener')">×</button></header>
    <label><span>{{ t('active') }}</span><input v-model="audioListener.active" type="checkbox"></label>
  </section>

  <section v-if="tileMap && componentVisible('TileMap2D', t('tileMap2D'))" class="runtime-component">
    <header><strong>{{ t('tileMap2D') }}</strong><button @click="remove('TileMap2D')">×</button></header>
    <label><span>{{ t('tileSet') }}</span><select v-model="tileMap.tileSetAsset" @change="tileMapChanged"><option :value="null">{{ t('none') }}</option><option v-for="asset in tileSetAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('mapSize') }}</span><div><input :value="tileMap.width" type="number" min="1" max="2048" @change="resizeMap('width', $event)"><input :value="tileMap.height" type="number" min="1" max="2048" @change="resizeMap('height', $event)"></div></label>
    <label><span>{{ t('tileWorldSize') }}</span><div><input v-model.number="tileMap.tileSize.x" type="number" min="0.000001" step="0.1" @change="tileMapChanged"><input v-model.number="tileMap.tileSize.y" type="number" min="0.000001" step="0.1" @change="tileMapChanged"></div></label>
    <label><span>{{ t('chunkSize') }}</span><input v-model.number="tileMap.chunkSize" type="number" min="4" max="128" @change="tileMapChanged"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="tileMap.opacity" type="number" min="0" max="100"></label>
    <label><span>{{ t('sortingLayer') }}</span><input v-model.number="tileMap.sortingLayer" type="number"></label>
    <label><span>{{ t('orderInLayer') }}</span><input v-model.number="tileMap.orderInLayer" type="number"></label>
    <label><span>{{ t('filterMode') }}</span><select v-model="tileMap.filterMode"><option>Nearest</option><option>Linear</option></select></label>
    <label><span>{{ t('physicsLayer') }}</span><input v-model.number="tileMap.physicsLayer" type="number" min="0" max="31" @change="tileMapChanged"></label>
    <label><span>{{ t('collisionMask') }}</span><input v-model.number="tileMap.collisionMask" type="number" min="0" max="4294967295" @change="tileMapChanged"></label>
    <button class="open-editor" @click="openTilemapEditor">{{ t('openTilemapEditor') }}</button>
  </section>

  <section v-if="particleEmitter && componentVisible('ParticleEmitter2D', t('particleEmitter2D'))" class="runtime-component">
    <header><strong>{{ t('particleEmitter2D') }}</strong><button @click="remove('ParticleEmitter2D')">×</button></header>
    <label><span>{{ t('particleTexture') }}</span><select v-model="particleEmitter.textureAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('emissionRate') }}</span><input v-model.number="particleEmitter.emissionRate" type="number" min="0"></label>
    <label><span>Emission shape</span><select v-model="particleEmitter.emissionShape"><option>Point</option><option>Box</option><option>Circle</option><option>Edge</option></select></label>
    <label v-if="particleEmitter.emissionShape === 'Box' || particleEmitter.emissionShape === 'Edge'"><span>Shape size</span><div><input v-model.number="particleEmitter.shapeSize.x" type="number" min="0"><input v-model.number="particleEmitter.shapeSize.y" type="number" min="0"></div></label>
    <label v-if="particleEmitter.emissionShape === 'Circle'"><span>Shape radius</span><input v-model.number="particleEmitter.shapeRadius" type="number" min="0"></label>
    <label><span>{{ t('burst') }}</span><input v-model.number="particleEmitter.burst" type="number" min="0"></label>
    <label><span>{{ t('lifetime') }}</span><input v-model.number="particleEmitter.lifetime" type="number" min="0.0001" step="0.1"></label>
    <label><span>{{ t('velocityMin') }}</span><div><input v-model.number="particleEmitter.initialVelocityMin.x" type="number"><input v-model.number="particleEmitter.initialVelocityMin.y" type="number"></div></label>
    <label><span>{{ t('velocityMax') }}</span><div><input v-model.number="particleEmitter.initialVelocityMax.x" type="number"><input v-model.number="particleEmitter.initialVelocityMax.y" type="number"></div></label>
    <label><span>{{ t('particleGravity') }}</span><div><input v-model.number="particleEmitter.gravity.x" type="number"><input v-model.number="particleEmitter.gravity.y" type="number"></div></label>
    <label><span>{{ t('rotationRange') }}</span><div><input v-model.number="particleEmitter.rotationMin" type="number" step="0.1"><input v-model.number="particleEmitter.rotationMax" type="number" step="0.1"></div></label>
    <label><span>{{ t('angularVelocityRange') }}</span><div><input v-model.number="particleEmitter.angularVelocityMin" type="number" step="0.1"><input v-model.number="particleEmitter.angularVelocityMax" type="number" step="0.1"></div></label>
    <label><span>{{ t('scaleOverLifetime') }}</span><div><input v-model.number="particleEmitter.startScale" type="number" min="0"><input v-model.number="particleEmitter.endScale" type="number" min="0"></div></label>
    <label><span>{{ t('colorOverLifetime') }}</span><div><input type="color" :value="rgbHex(particleEmitter.startColor)" @input="setColor(particleEmitter.startColor, $event)"><input type="color" :value="rgbHex(particleEmitter.endColor)" @input="setColor(particleEmitter.endColor, $event)"></div></label>
    <label><span>{{ t('opacityOverLifetime') }}</span><div><input v-model.number="particleEmitter.startOpacity" type="number" min="0" max="100"><input v-model.number="particleEmitter.endOpacity" type="number" min="0" max="100"></div></label>
    <label><span>{{ t('maxParticles') }}</span><input v-model.number="particleEmitter.maxParticles" type="number" min="0" max="100000"></label>
    <label><span>Editor preview</span><input v-model="particleEmitter.previewInEditor" type="checkbox"></label>
    <label><span>Subemitter UUID</span><input v-model="particleEmitter.subEmitterUuid" placeholder="optional component UUID"></label>
    <label><span>Subemitter count</span><input v-model.number="particleEmitter.subEmitterCount" type="number" min="0" max="1000"></label>
    <label><span>{{ t('autoplay') }}</span><input v-model="particleEmitter.autoplay" type="checkbox"></label>
    <label><span>{{ t('loop') }}</span><input v-model="particleEmitter.looping" type="checkbox"></label>
    <label><span>{{ t('worldSpace') }}</span><input v-model="particleEmitter.worldSpace" type="checkbox"></label>
    <label><span>{{ t('blendMode') }}</span><select v-model="particleEmitter.blendMode"><option>Alpha</option><option>Additive</option></select></label>
  </section>

  <section v-if="light && componentVisible('Light2D', t('light2D'))" class="runtime-component">
    <header><strong>{{ t('light2D') }}</strong><button @click="remove('Light2D')">×</button></header>
    <label><span>{{ t('lightType') }}</span><select v-model="light.lightType"><option>Point</option><option>Spot</option><option>Directional</option><option>Area</option></select></label>
    <label><span>{{ t('lightColor') }}</span><input type="color" :value="rgbHex(light.color)" @input="setColor(light.color, $event)"></label>
    <label><span>{{ t('intensity') }}</span><input v-model.number="light.intensity" type="number" min="0" max="32" step="0.05"></label>
    <label v-if="light.lightType !== 'Directional'"><span>{{ t('range') }}</span><input v-model.number="light.range" type="number" min="0.001" step="0.1"></label>
    <label v-if="light.lightType === 'Spot'"><span>{{ t('spotAngles') }}</span><div><input v-model.number="light.innerAngle" type="number" min="0" max="179"><input v-model.number="light.outerAngle" type="number" min="0" max="179"></div></label>
    <label v-if="light.lightType === 'Area'"><span>{{ t('areaSize') }}</span><div><input v-model.number="light.areaSize.x" type="number" min="0.001"><input v-model.number="light.areaSize.y" type="number" min="0.001"></div></label>
    <label><span>{{ t('lightMask') }}</span><input v-model.number="light.layerMask" type="number" min="0" max="4294967295"></label>
    <label><span>{{ t('castsShadows') }}</span><input v-model="light.castsShadows" type="checkbox"></label>
    <label><span>{{ t('shadowSoftness') }}</span><input v-model.number="light.shadowSoftness" type="range" min="0" max="1" step="0.05"></label>
  </section>

  <section v-if="shadowCaster && componentVisible('ShadowCaster2D', t('shadowCaster2D'))" class="runtime-component">
    <header><strong>{{ t('shadowCaster2D') }}</strong><button @click="remove('ShadowCaster2D')">×</button></header>
    <label><span>{{ t('lightMask') }}</span><input v-model.number="shadowCaster.layerMask" type="number" min="0" max="4294967295"></label>
    <label><span>{{ t('selfShadows') }}</span><input v-model="shadowCaster.selfShadows" type="checkbox"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="shadowCaster.opacity" type="range" min="0" max="1" step="0.05"></label>
  </section>

  <section v-for="joint in visibleJoints" :key="joint.uuid" class="runtime-component">
    <header><strong>{{ t(joint.kind) }}</strong><button @click="remove(joint.kind)">×</button></header>
    <label><span>{{ t('connectedBody') }}</span><select v-model="joint.targetEntityUuid" @change="joint.initialized = false"><option :value="null">{{ t('none') }}</option><option v-for="entity in jointTargets" :key="entity.uuid" :value="entity.uuid">{{ entity.name }}_{{ entity.id }}</option></select></label>
    <label><span>{{ t('anchor') }}</span><div><input v-model.number="joint.anchor.x" type="number"><input v-model.number="joint.anchor.y" type="number"></div></label>
    <label><span>{{ t('connectedAnchor') }}</span><div><input v-model.number="joint.connectedAnchor.x" type="number"><input v-model.number="joint.connectedAnchor.y" type="number"></div></label>
    <label><span>{{ t('collideConnected') }}</span><input v-model="joint.collideConnected" type="checkbox"></label>
    <label v-if="joint.kind === 'DistanceJoint2D' || joint.kind === 'RopeJoint2D' || joint.kind === 'SpringJoint2D'"><span>{{ t('jointDistance') }}</span><input v-model.number="joint.distance" type="number" min="0"></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('stiffness') }}</span><input v-model.number="joint.stiffness" type="number" min="0"></label>
    <label v-if="joint.kind === 'SpringJoint2D'"><span>{{ t('connectionDamping') }}</span><input v-model.number="joint.damping" type="number" min="0"></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointAxis') }}</span><div><input v-model.number="joint.axis.x" type="number"><input v-model.number="joint.axis.y" type="number"></div></label>
    <label v-if="joint.kind === 'PrismaticJoint2D'"><span>{{ t('jointLimits') }}</span><input v-model="joint.limitsEnabled" type="checkbox"></label>
    <label v-if="joint.kind === 'PrismaticJoint2D' && joint.limitsEnabled"><span>{{ t('limitRange') }}</span><div><input v-model.number="joint.lowerLimit" type="number"><input v-model.number="joint.upperLimit" type="number"></div></label>
    <label v-if="joint.kind === 'RevoluteJoint2D' || joint.kind === 'MotorJoint2D'"><span>{{ t('jointMotor') }}</span><input v-model="joint.motorEnabled" type="checkbox"></label>
    <label v-if="joint.motorEnabled"><span>{{ t('motorSpeed') }}</span><input v-model.number="joint.motorSpeed" type="number" step="0.1"></label>
    <label v-if="joint.motorEnabled"><span>{{ t('maxMotorForce') }}</span><input v-model.number="joint.maxMotorForce" type="number" min="0"></label>
    <label><span>{{ t('breakForce') }}</span><input v-model.number="joint.breakForce" type="number" min="0"></label>
    <label><span>{{ t('breakTorque') }}</span><input v-model.number="joint.breakTorque" type="number" min="0"></label>
  </section>

  <section v-if="rectTransform && componentVisible('RectTransform', t('rectTransform'))" class="runtime-component">
    <header><strong>{{ t('rectTransform') }}</strong><button @click="remove('RectTransform')">×</button></header>
    <label><span>{{ t('anchorPreset') }}</span><select v-model="rectTransform.anchorPreset"><option v-for="preset in anchorPresets" :key="preset" :value="preset">{{ anchorLabel(preset) }}</option></select></label>
    <label><span>{{ t('pivot') }}</span><div><input v-model.number="rectTransform.pivot.x" type="number" min="0" max="1" step="0.05"><input v-model.number="rectTransform.pivot.y" type="number" min="0" max="1" step="0.05"></div></label>
    <label><span>{{ t('uiPosition') }}</span><div><input v-model.number="rectTransform.position.x" type="number" step="1"><input v-model.number="rectTransform.position.y" type="number" step="1"></div></label>
    <label><span>{{ t('uiSize') }}</span><div><input v-model.number="rectTransform.size.x" type="number" min="0" step="1"><input v-model.number="rectTransform.size.y" type="number" min="0" step="1"></div></label>
    <label><span>{{ t('preferredSize') }}</span><div><input v-model.number="rectTransform.preferredSize.x" type="number" min="0" step="1"><input v-model.number="rectTransform.preferredSize.y" type="number" min="0" step="1"></div></label>
    <label><span>{{ t('anchorRange') }}</span><div class="quad"><input v-model.number="rectTransform.anchorMin.x" type="number" min="0" max="1" step="0.05"><input v-model.number="rectTransform.anchorMin.y" type="number" min="0" max="1" step="0.05"><input v-model.number="rectTransform.anchorMax.x" type="number" min="0" max="1" step="0.05"><input v-model.number="rectTransform.anchorMax.y" type="number" min="0" max="1" step="0.05"></div></label>
    <label><span>{{ t('offsets') }}</span><div class="quad"><input v-model.number="rectTransform.offsets.left" type="number"><input v-model.number="rectTransform.offsets.top" type="number"><input v-model.number="rectTransform.offsets.right" type="number"><input v-model.number="rectTransform.offsets.bottom" type="number"></div></label>
    <label v-if="rectTransform.anchorPreset === 'stretch'"><span>{{ t('margins') }}</span><div class="quad"><input v-model.number="rectTransform.margins.left" type="number"><input v-model.number="rectTransform.margins.top" type="number"><input v-model.number="rectTransform.margins.right" type="number"><input v-model.number="rectTransform.margins.bottom" type="number"></div></label>
    <label><span>{{ t('sizePolicy') }}</span><div><select v-model="rectTransform.horizontalPolicy"><option>Fixed</option><option>Fill</option><option>Content</option></select><select v-model="rectTransform.verticalPolicy"><option>Fixed</option><option>Fill</option><option>Content</option></select></div></label>
    <label><span>{{ t('minimumSize') }}</span><div><input v-model.number="rectTransform.minSize.x" type="number" min="0"><input v-model.number="rectTransform.minSize.y" type="number" min="0"></div></label>
    <label><span>{{ t('maximumSize') }}</span><div><input v-model.number="rectTransform.maxSize.x" type="number" min="0"><input v-model.number="rectTransform.maxSize.y" type="number" min="0"></div></label>
    <label><span>{{ t('aspectConstraint') }}</span><div><select v-model="rectTransform.aspectConstraint"><option>None</option><option>Fit</option><option>WidthControlsHeight</option><option>HeightControlsWidth</option></select><input v-model.number="rectTransform.aspectRatio" type="number" min="0" step="0.01"></div></label>
    <label><span>{{ t('focusable') }}</span><input v-model="rectTransform.focusable" type="checkbox"></label>
    <label><span>{{ t('tabIndex') }}</span><input v-model.number="rectTransform.tabIndex" type="number" min="-1" max="100000"></label>
    <label><span>{{ t('focusNavigation') }}</span><div class="quad"><input v-model="rectTransform.focusUp" :placeholder="t('upUuid')"><input v-model="rectTransform.focusDown" :placeholder="t('downUuid')"><input v-model="rectTransform.focusLeft" :placeholder="t('leftUuid')"><input v-model="rectTransform.focusRight" :placeholder="t('rightUuid')"></div></label>
    <label><span>{{ t('accessibilityRole') }}</span><input v-model="rectTransform.accessibilityRole"></label>
    <label><span>{{ t('accessibilityLabel') }}</span><input v-model="rectTransform.accessibilityLabel"></label>
    <label><span>{{ t('accessibilityDescription') }}</span><input v-model="rectTransform.accessibilityDescription"></label>
    <label><span>{{ t('accessibilityState') }}</span><input v-model="rectTransform.accessibilityState"></label>
    <label><span>{{ t('accessibilityValue') }}</span><input v-model="rectTransform.accessibilityValue"></label>
    <label><span>{{ t('liveRegion') }}</span><select v-model="rectTransform.accessibilityLive"><option>Off</option><option>Polite</option><option>Assertive</option></select></label>
    <label><span>{{ t('readingOrder') }}</span><input v-model.number="rectTransform.readingOrder" type="number" min="0"></label>
    <label><span>{{ t('skipNavigation') }}</span><input v-model="rectTransform.skipNavigation" type="checkbox"></label>
    <label><span>{{ t('screenReaderHidden') }}</span><input v-model="rectTransform.accessibilityHidden" type="checkbox"></label>
    <label><span>{{ t('remapAction') }}</span><div><input v-model="rectTransform.remapAction" :placeholder="t('inputAction')"><input v-model.number="rectTransform.remapBindingIndex" type="number" min="0" max="31"></div></label>
    <div class="breakpoint-editor"><strong>{{ t('responsiveBreakpoints') }}</strong><article v-for="(point,index) in rectTransform.breakpoints" :key="index"><input v-model.number="point.minWidth" type="number" min="0"><input v-model.number="point.maxWidth" type="number" min="0"><input v-model="point.visible" type="checkbox"><button @click="rectTransform.breakpoints.splice(index,1)">×</button></article><button @click="addBreakpoint">+ {{ t('breakpoint') }}</button></div>
  </section>

  <section v-if="canvas && componentVisible('Canvas', t('uiCanvas'))" class="runtime-component">
    <header><strong>{{ t('uiCanvas') }}</strong><button @click="remove('Canvas')">×</button></header>
    <label><span>{{ t('referenceSize') }}</span><div><input v-model.number="canvas.referenceSize.x" type="number" min="1"><input v-model.number="canvas.referenceSize.y" type="number" min="1"></div></label>
    <label><span>{{ t('scaleWithScreen') }}</span><input v-model="canvas.scaleWithScreen" type="checkbox"></label>
    <label><span>DPI</span><input v-model.number="canvas.dpiScale" type="number" min="0.5" max="4" step="0.25"></label>
    <label><span>{{ t('liveLocalePreview') }}</span><input v-model="canvas.localePreview" placeholder="en-US / ar"></label>
    <label><span>{{ t('sortingOrder') }}</span><input v-model.number="canvas.sortingOrder" type="number"></label>
    <label><span>{{ t('safeArea') }}</span><input v-model="canvas.safeArea" type="checkbox"></label>
    <label v-if="canvas.safeArea"><span>{{ t('safeAreaInsets') }}</span><div class="quad"><input v-model.number="canvas.safeAreaInsets.left" type="number" min="0"><input v-model.number="canvas.safeAreaInsets.top" type="number" min="0"><input v-model.number="canvas.safeAreaInsets.right" type="number" min="0"><input v-model.number="canvas.safeAreaInsets.bottom" type="number" min="0"></div></label>
    <label><span>{{ t('uiTheme') }}</span><select v-model="canvas.themeAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in themeAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <label><span>{{ t('variant') }}</span><input v-model="canvas.themeVariant" placeholder="default / compact / highContrast"></label>
  </section>

  <section v-if="panel && componentVisible('Panel', t('uiPanel'))" class="runtime-component">
    <header><strong>{{ t('uiPanel') }}</strong><button @click="remove('Panel')">×</button></header>
    <label><span>{{ t('color') }}</span><input type="color" :value="rgbHex(panel.color)" @input="setColor(panel.color, $event)"></label>
    <label><span>{{ t('opacity') }}</span><input v-model.number="panel.opacity" type="number" min="0" max="100"></label>
    <label><span>{{ t('cornerRadius') }}</span><input v-model.number="panel.cornerRadius" type="number" min="0"></label>
    <label><span>{{ t('layoutContainer') }}</span><select v-model="panel.layout"><option>None</option><option>Row</option><option>Column</option><option>Grid</option><option>Flow</option><option>Overlay</option><option>Center</option><option>Margin</option><option>Aspect</option><option>Split</option></select></label>
    <label v-if="panel.layout !== 'None'"><span>{{ t('gapColumns') }}</span><div><input v-model.number="panel.gap" type="number" min="0"><input v-model.number="panel.columns" type="number" min="1" max="64"></div></label>
    <label v-if="panel.layout !== 'None'"><span>{{ t('padding') }}</span><div class="quad"><input v-model.number="panel.padding.left" type="number"><input v-model.number="panel.padding.top" type="number"><input v-model.number="panel.padding.right" type="number"><input v-model.number="panel.padding.bottom" type="number"></div></label>
    <label><span>{{ t('wrap') }}</span><input v-model="panel.wrap" type="checkbox"></label>
    <label><span>{{ t('alignment') }}</span><div><select v-model="panel.align"><option>Start</option><option>Center</option><option>End</option><option>Stretch</option></select><select v-model="panel.justify"><option>Start</option><option>Center</option><option>End</option><option>SpaceBetween</option></select></div></label>
    <label><span>{{ t('clipMask') }}</span><div><input v-model="panel.clipChildren" type="checkbox"><input v-model="panel.maskChildren" type="checkbox"></div></label>
    <label><span>{{ t('scrollView') }}</span><div><input v-model="panel.scrollHorizontal" type="checkbox"><input v-model="panel.scrollVertical" type="checkbox"></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollOffset') }}</span><div><input v-model.number="panel.scrollOffset.x" type="number"><input v-model.number="panel.scrollOffset.y" type="number"></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollContentSize') }}</span><div><input v-model.number="panel.contentSize.x" type="number" min="0"><input v-model.number="panel.contentSize.y" type="number" min="0"></div></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('scrollSpeed') }}</span><input v-model.number="panel.scrollSpeed" type="number" min="0"></label>
    <label v-if="panel.scrollHorizontal || panel.scrollVertical"><span>{{ t('showScrollbars') }}</span><input v-model="panel.showScrollbars" type="checkbox"></label>
    <label><span>{{ t('uiBehavior') }}</span><select v-model="panel.behavior"><option>Normal</option><option>Modal</option><option>Popup</option><option>Tooltip</option></select></label>
    <label><span>{{ t('visible') }}</span><input v-model="panel.visible" type="checkbox"></label>
    <label v-if="panel.behavior === 'Modal' || panel.behavior === 'Popup'"><span>{{ t('closeOnOutside') }}</span><input v-model="panel.closeOnOutside" type="checkbox"></label>
    <label><span>{{ t('dragAndDrop') }}</span><div><input v-model="panel.draggable" type="checkbox"><input v-model="panel.dropGroup" :placeholder="t('group')"></div></label>
    <label v-if="panel.behavior === 'Tooltip'"><span>{{ t('tooltip') }}</span><div><input v-model="panel.tooltipText"><input v-model.number="panel.tooltipDelay" type="number" min="0" step="0.05"></div></label>
    <label><span>{{ t('uiStyleClass') }}</span><input v-model="panel.styleClass"></label><label><span>{{ t('overrideBackground') }}</span><input v-model="panel.styleOverrides.background" placeholder="#232934 / $surface"></label>
  </section>

  <section v-if="image && componentVisible('Image', t('uiImage'))" class="runtime-component">
    <header><strong>{{ t('uiImage') }}</strong><button @click="remove('Image')">×</button></header>
    <label><span>{{ t('spriteAsset') }}</span><select v-model="image.spriteAsset"><option :value="null">{{ t('none') }}</option><option v-for="asset in imageAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label>
    <button class="component-import" @click="uiImageInput?.click()">+ {{ t('importTexture') }}</button><input ref="uiImageInput" hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" @change="importUiImage">
    <label><span>{{ t('tint') }}</span><input type="color" :value="rgbHex(image.tint)" @input="setColor(image.tint, $event)"></label><label><span>{{ t('opacity') }}</span><input v-model.number="image.opacity" type="number" min="0" max="100"></label><label><span>{{ t('preserveAspect') }}</span><input v-model="image.preserveAspect" type="checkbox"></label>
    <label><span>{{ t('nineSlice') }}</span><input v-model="image.nineSlice.enabled" type="checkbox"></label>
    <label v-if="image.nineSlice.enabled"><span>{{ t('sliceBorders') }}</span><div><input v-model.number="image.nineSlice.left" type="number" min="0"><input v-model.number="image.nineSlice.top" type="number" min="0"><input v-model.number="image.nineSlice.right" type="number" min="0"><input v-model.number="image.nineSlice.bottom" type="number" min="0"></div></label>
  </section>
  <section v-if="text && componentVisible('Text', t('uiText'))" class="runtime-component"><header><strong>{{ t('uiText') }}</strong><button @click="remove('Text')">×</button></header><label class="stacked"><span>{{ t('textContent') }}</span><textarea v-model="text.text" rows="2"></textarea></label><label><span>{{ t('localizationKey') }}</span><input v-model="text.localizationKey"></label><label><span>{{ t('fontAsset') }}</span><select v-model="text.fontAsset"><option :value="null">{{ t('defaultFont') }}</option><option v-for="asset in fontAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('textColor') }}</span><input type="color" :value="rgbHex(text.color)" @input="setColor(text.color, $event)"></label><label><span>{{ t('opacity') }}</span><input v-model.number="text.opacity" type="number" min="0" max="100"></label><label><span>{{ t('fontSize') }}</span><input v-model.number="text.fontSize" type="number" min="1"></label><label><span>{{ t('fontWeight') }}</span><input v-model.number="text.fontWeight" type="number" min="100" max="900" step="100"></label><label><span>{{ t('alignment') }}</span><select v-model="text.align"><option value="left">{{ t('left') }}</option><option value="center">{{ t('center') }}</option><option value="right">{{ t('right') }}</option></select></label></section>
  <section v-if="button && componentVisible('Button', t('uiButton'))" class="runtime-component"><header><strong>{{ t('uiButton') }}</strong><button @click="remove('Button')">×</button></header><label><span>{{ t('interactable') }}</span><input v-model="button.interactable" type="checkbox"></label><label><span>on_pressed</span><input v-model="button.onPressed"></label><label><span>on_hover_enter</span><input v-model="button.onHoverEnter"></label><label><span>on_hover_exit</span><input v-model="button.onHoverExit"></label><label><span>{{ t('normalColor') }}</span><input type="color" :value="rgbHex(button.normalColor)" @input="setColor(button.normalColor, $event)"></label><label><span>{{ t('hoveredColor') }}</span><input type="color" :value="rgbHex(button.hoveredColor)" @input="setColor(button.hoveredColor, $event)"></label><label><span>{{ t('pressedColor') }}</span><input type="color" :value="rgbHex(button.pressedColor)" @input="setColor(button.pressedColor, $event)"></label><label><span>{{ t('disabledColor') }}</span><input type="color" :value="rgbHex(button.disabledColor)" @input="setColor(button.disabledColor, $event)"></label><label><span>{{ t('pressAudio') }}</span><select v-model="button.pressAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('hoverAudio') }}</span><select v-model="button.hoverAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('focusAudio') }}</span><select v-model="button.focusAudio"><option :value="null">{{ t('none') }}</option><option v-for="asset in audioAssets" :key="asset.uuid" :value="assetReference(asset.uuid)">{{ asset.name }}</option></select></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="button.styleClass"></label><label><span>{{ t('overrideBackground') }}</span><input v-model="button.styleOverrides.background" placeholder="#4f96ff / $accent"></label></section>
  <section v-if="slider && componentVisible('Slider', t('uiSlider'))" class="runtime-component"><header><strong>{{ t('uiSlider') }}</strong><button @click="remove('Slider')">×</button></header><ValueRange :component="slider" /><label><span>{{ t('wholeNumbers') }}</span><input v-model="slider.wholeNumbers" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="slider.interactable" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="slider.styleClass"></label></section>
  <section v-if="progress && componentVisible('ProgressBar', t('uiProgressBar'))" class="runtime-component"><header><strong>{{ t('uiProgressBar') }}</strong><button @click="remove('ProgressBar')">×</button></header><ValueRange :component="progress" /><label><span>{{ t('fillColor') }}</span><input type="color" :value="rgbHex(progress.fillColor)" @input="setColor(progress.fillColor, $event)"></label><label><span>{{ t('backgroundColor') }}</span><input type="color" :value="rgbHex(progress.backgroundColor)" @input="setColor(progress.backgroundColor, $event)"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="progress.styleClass"></label></section>
  <section v-if="checkbox && componentVisible('Checkbox', t('uiCheckbox'))" class="runtime-component"><header><strong>{{ t('uiCheckbox') }}</strong><button @click="remove('Checkbox')">×</button></header><label><span>{{ t('label') }}</span><input v-model="checkbox.label"></label><label><span>{{ t('localizationKey') }}</span><input v-model="checkbox.localizationKey"></label><label><span>{{ t('checked') }}</span><input v-model="checkbox.checked" type="checkbox"></label><label><span>{{ t('interactable') }}</span><input v-model="checkbox.interactable" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="checkbox.styleClass"></label></section>
  <section v-if="textInput && componentVisible('TextInput', t('uiTextInput'))" class="runtime-component"><header><strong>{{ t('uiTextInput') }}</strong><button @click="remove('TextInput')">×</button></header><label><span>{{ t('value') }}</span><input v-model="textInput.value"></label><label><span>{{ t('placeholder') }}</span><input v-model="textInput.placeholder"></label><label><span>{{ t('maxLength') }}</span><input v-model.number="textInput.maxLength" type="number" min="0"></label><label><span>{{ t('password') }}</span><input v-model="textInput.password" type="checkbox"></label><label><span>{{ t('uiStyleClass') }}</span><input v-model="textInput.styleClass"></label></section>

  <section v-if="componentVisible('Canvas', t('createGameUi'))" class="ui-palette">
    <strong>{{ t('createGameUi') }}</strong>
    <p>{{ t('uiEditorHint') }}</p>
    <div><button v-for="kind in uiKinds" :key="kind" @click="create(kind)">+ {{ t(`create${kind}`) }}</button></div>
  </section>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from 'vue'
import { assetReference, assetState, importAssetFiles } from '../assets/AssetDatabase'
import { t } from '../i18n'
import { createUiEntity, physicsState, pushHistory, type UiElementKind } from '../store/physics'
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

const props = defineProps<{ entity: Entity; searchQuery?: string; category?: InspectorCategory }>()
const uiImageInput = ref<HTMLInputElement | null>(null)
const ValueRange = defineComponent({ props: { component: { type: Object as PropType<Slider | ProgressBar>, required: true } }, setup(componentProps) { return () => h('div', { class: 'range-values' }, [['min', 'Min'], ['max', 'Max'], ['value', t('value')]].map(([key, label]) => h('label', [h('span', label), h('input', { type: 'number', value: componentProps.component[key as 'min'], onInput: (event: Event) => { componentProps.component[key as 'min'] = Number((event.target as HTMLInputElement).value) } })])) ) } })
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
function anchorLabel(preset: typeof anchorPresets[number]) { return t(`anchor_${preset.replace(/-/g, '_')}` as Parameters<typeof t>[0]) }
function resizeMap(axis: 'width' | 'height', event: Event) { if (!tileMap.value) return; const value = Number((event.target as HTMLInputElement).value); resizeTileMap(tileMap.value, axis === 'width' ? value : tileMap.value.width, axis === 'height' ? value : tileMap.value.height); pushHistory('Resize TileMap') }
function tileMapChanged() { if (!tileMap.value) return; tileMap.value.revision++; invalidateTileMap(tileMap.value); pushHistory('Edit TileMap') }
function openTilemapEditor() { tilemapEditorState.selectedEntityUuid = props.entity.uuid; tilemapEditorState.active = true; editorState.bottomPanelTab = 'tilemap'; editorState.bottomPanelOpen = true }
function addBreakpoint() { if (rectTransform.value && rectTransform.value.breakpoints.length < 32) rectTransform.value.breakpoints.push({ minWidth: 0, maxWidth: 1280, visible: true, position: { ...rectTransform.value.position }, size: { ...rectTransform.value.size } }) }
</script>

<style scoped>
.runtime-component { margin-bottom: 9px; border: 1px solid var(--border-subtle); border-radius: 10px; overflow: hidden; background: var(--surface-2); }.runtime-component header { min-height: 34px; padding: 0 9px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); }.runtime-component header strong { color: var(--text-primary); font-size:11px; }.runtime-component header button { width: 25px; height: 25px; border: 0; border-radius: 6px; color: var(--danger); background: transparent; }.runtime-component header button:hover { background: var(--danger-soft); }.runtime-component label, .range-values label { min-height: 34px; padding: 5px 9px; display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid var(--border-subtle); color: var(--text-muted); font-size:11px; line-height: 1.3; }.runtime-component label:last-child { border-bottom: 0; }.runtime-component label > span { min-width: 0; }.runtime-component label > input:not([type='checkbox']):not([type='color']), .runtime-component label > select { width: 55%; min-width: 0; min-height: 27px; }.runtime-component label > input[type='color'] { width: 42px; height: 25px; }.runtime-component label > div { width: 55%; display: flex; gap: 4px; }.runtime-component label > div input { min-width: 0; width: 50%; min-height: 27px; }.runtime-component label > .quad { display: grid; grid-template-columns: 1fr 1fr; }.runtime-component .stacked { align-items: stretch; flex-direction: column; }.runtime-component textarea { width: 100%; min-height: 58px; resize: vertical; }.range-values { display: grid; }.component-import { width: calc(100% - 18px); min-height: 28px; margin: 7px 9px; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; }.ui-palette { padding: 11px; border: 1px dashed var(--border-strong); border-radius: 10px; }.ui-palette > strong { color: var(--text-secondary); font-size:11px; }.ui-palette > p { margin: 4px 0 0; color: var(--text-muted); font-size:11px; line-height: 1.4; }.ui-palette > div { margin-top: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }.ui-palette button { min-width: 0; min-height: 31px; overflow: hidden; border: 1px solid var(--border-subtle); border-radius: 7px; color: var(--accent); background: var(--surface-3); font-size:11px; text-overflow: ellipsis; white-space: nowrap; }
.open-editor { width: calc(100% - 16px); min-height: 28px; margin: 8px; border: 1px solid var(--accent); border-radius: 7px; color: var(--accent); background: var(--accent-soft); font-size:11px; }
.breakpoint-editor { padding: 8px; display: grid; gap: 5px; border-top: 1px solid var(--border-subtle); }.breakpoint-editor > strong { color: var(--text-muted); font-size:11px; }.breakpoint-editor article { display: grid; grid-template-columns: 1fr 1fr 24px 24px; gap: 4px; }.breakpoint-editor input { min-width: 0; }.breakpoint-editor button { min-height: 26px; border: 1px solid var(--border-subtle); border-radius: 6px; color: var(--text-secondary); background: var(--surface-3); font-size:11px; }
</style>
