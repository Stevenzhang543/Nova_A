export const settingsExclusions22={
 'projectSettings.build.outputDirectory':'Machine-local destination; serializeBuildSettings intentionally omits it and persistBuildLocalSettings owns local storage.',
 'projectSettings.build.platform.signingIdentity':'Machine-local signing identity; intentionally omitted from portable project settings.',
 'projectSettings.build.platform.notarizationProfile':'Machine-local notarization profile; intentionally omitted from portable project settings.',
 'projectSettings.build.delivery.ciMatrixVersion':'Fixed CI contract identity 1, not an editable authoring value.',
 'projectSettings.physics.layers.[*].id':'Fixed collision-layer slot identity; normalizePhysicsLayers assigns each array index, while its name/color/description are authored.',
}
export function canonicalSettingsCandidate22(row,candidate,baseline,discovery){
 const id=row.id
 if(id==='projectSettings.production.networking.replicatedEntities.[*].ownerPeerId')return 'peer-2'
 if(id==='projectSettings.build.platform.identifier')return row.default+'.audit'
 if(row.path.at(-1)==='entityUuid')return baseline.scenes.flatMap(scene=>scene.entities).find(entity=>entity.uuid!==row.default).uuid
 if(row.path.at(-1)==='sceneUuid')return baseline.scenes.find(scene=>scene.uuid!==row.default).uuid
 if(id==='projectSettings.deviceInput.virtualControls.[*].action')return baseline.projectSettings.inputMap.find(action=>action.name!==row.default).name
 if(id==='projectSettings.inputMap.[*].bindings.[*].chord.[*]')return 'KeyB'
 if(typeof row.default==='string'&&row.default.startsWith('asset://')){const owner=baseline.assets.find(asset=>'asset://'+asset.uuid===row.default),other=baseline.assets.find(asset=>asset.assetType===owner.assetType&&asset.uuid!==owner.uuid);return 'asset://'+other.uuid}
 if(id==='projectSettings.audio.mixer.activeSnapshot')return baseline.projectSettings.audio.mixer.snapshots.find(snapshot=>snapshot.id!==row.default).id
 if(id==='projectSettings.audio.mixer.buses.[*].parent')return 'Music'
 if(id==='projectSettings.audio.mixer.buses.[*].sends.[*].target')return 'SFX'
 if(id==='projectSettings.audio.mixer.ducking.[*].targetBus'||id==='projectSettings.audio.mixer.ducking.[*].triggerBus')return 'UI'
 if(id==='projectSettings.production.networking.rpcContracts.[*].channelId')return baseline.projectSettings.production.networking.channels.find(channel=>channel.id!==row.default).id
 if(id==='projectSettings.production.networking.replicatedEntities.[*].properties.[*]')return row.default==='transform'?'rotation':'transform'
 if(id==='projectSettings.rendering.postProcessing.activePreset'||id==='projectSettings.rendering.postProcessing.volumes.[*].presetId')return baseline.projectSettings.rendering.postProcessing.presets.find(preset=>preset.id!==row.default).id
 const prior=discovery.cases.find(test=>test.field===id&&test.status!=='retained')
 if(id==='projectSettings.physics.collisionMatrix.[*]')return 2
 if(id==='projectSettings.physics.layers.[*].color'||id==='projectSettings.presentation.accessibility.focusRingColor')return '#446688'
 if(id.startsWith('projectSettings.physics.')||id.startsWith('projectSettings.audio.buses.'))return candidate
 if(id==='projectSettings.build.sceneOrder.[*]'||id==='projectSettings.build.startupSceneUuid')return baseline.scenes.find(scene=>scene.uuid!==row.default).uuid
 if(id==='projectSettings.scripting.remoteDebug.tokenHash')return 'a'.repeat(64)
 if(['sourceLocale','previewLocale','fallbackChain.[*]','buildLocales.[*]'].some(field=>id==='projectSettings.presentation.localization.'+field))return 'de'
 if(id==='projectSettings.presentation.localization.currency')return 'EUR'
 if(row.acceptedEnum.length)return candidate
 if(prior&&typeof candidate==='number'&&typeof prior.output==='number')return prior.output===row.default?row.default+1:prior.output
 if(prior&&typeof candidate==='string'&&typeof prior.output==='string')return prior.output!==row.default?prior.output:row.default+'-audit'
 return candidate
}
export function applySettingsCandidate22(document,row,candidate){
 const set=(root,path,value)=>{for(const key of path.slice(0,-1))root=root[key];root[path.at(-1)]=value};set(document,row.path,candidate)
 if(row.id==='projectSettings.build.delivery.telemetryEnabled'&&candidate){document.projectSettings.build.delivery.telemetryEndpoint='https://example.invalid/events';document.projectSettings.build.delivery.privacyPolicyUrl='https://example.invalid/privacy'}
 if((row.id==='projectSettings.production.networking.authentication.mode'&&candidate==='hook')||(row.id==='projectSettings.production.networking.authentication.requireVerifiedPeers'&&candidate)){document.projectSettings.production.networking.authentication.mode='hook';document.projectSettings.production.networking.authentication.providerId='audit-provider'}
 if(row.family==='physics'){
  const globals=document.scenes.find(scene=>scene.uuid===document.activeSceneUuid).globalSettings,path=row.path.slice(2);set(globals,path,candidate)
  if(path[0]==='profile'&&['tickRate','maxCatchUpSteps','interpolation'].includes(path[1]))globals[path[1]]=candidate
 }
 if(row.id.startsWith('projectSettings.audio.buses.'))document.projectSettings.audio.mixer.buses.find(bus=>bus.id===row.path.at(-1)).gain=candidate
 if(row.id==='projectSettings.build.developmentBuild')document.projectSettings.build.profile=candidate?'debug':'release'
}
