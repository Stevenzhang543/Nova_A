/** 测试夹具：为 v26.22-settings-populated.mjs 提供受控数据或执行环境，限定于对应验证场景。 */
/** Populated persistence fixtures. Runtime/device behavior is audited separately. */
/** 结构说明（自动提取）：populateSettingsFixture22；输入 modules；直接调用 packages.enableOfficialPackage、Error、assets.createTextAsset、JSON.stringify、materials.defaultMaterial 等；写入 refs[…]、asset.assetType、asset.source、asset.mimeType 等；返回路径包含 refs；包含循环处理；包含显式抛错路径。 */ export function populateSettingsFixture22(modules){
 const {physics:p,assets,materials,box,packages}=modules,refs={}
 if(!packages.enableOfficialPackage(packages.OFFICIAL_NETWORKING_PACKAGE_ID))throw Error('Networking fixture package could not be enabled')
 for(const type of ['image','audio','material','resource','script']){
  refs[type]=[]
  for(let index=0;index<2;index++){
   const asset=assets.createTextAsset('Settings '+type+' '+index,type==='image'||type==='audio'?'script':type,type==='material'?JSON.stringify(materials.defaultMaterial('Settings material')):type==='script'?'fn setup() {} fn teardown() {}':'{}','Assets/SettingsFixtures')
   if(type==='image'){asset.assetType='image';asset.source='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="'+(index?'red':'blue')+'"/></svg>').toString('base64');asset.mimeType='image/svg+xml';asset.path=asset.path.replace(/\.rhai$/,'.svg');asset.width=1;asset.height=1}
   if(type==='audio'){const wave=Buffer.alloc(46);wave.write('RIFF');wave.writeUInt32LE(38,4);wave.write('WAVEfmt ',8);wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(48000,24);wave.writeUInt32LE(96000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(2,40);wave.writeInt16LE(index?100:0,44);asset.assetType='audio';asset.source='data:audio/wav;base64,'+wave.toString('base64');asset.mimeType='audio/wav';asset.path=asset.path.replace(/\.rhai$/,'.wav');asset.duration=1/48000}
   asset.settings.atlas=false;refs[type].push('asset://'+asset.uuid)
  }
 }
 const entity=new box.BoxEntity(9900,{x:0,y:0},{x:2,y:2});p.physicsState.world.entities.push(entity,new box.BoxEntity(9901,{x:4,y:0},{x:2,y:2}))
 const document=JSON.parse(p.getSceneJSON()),settings=document.projectSettings,scene=document.activeSceneUuid
 settings.inputMap[0].bindings[0].chord=['KeyA'];settings.inputMap[0].bindings[0].modifiers=['Shift'];settings.inputMap[0].schemes=['Keyboard']
 settings.deviceInput.gamepadCalibrations=[{deviceId:'audit-pad',axis:0,minimum:-1,center:0,maximum:1,deadzone:.1,invert:false}]
 settings.deviceInput.virtualControls=[{id:'audit-control',label:'Audit',accessibleLabel:'Audit control',action:settings.inputMap[0].name,kind:'button',anchor:'bottom-left',offsetX:24,offsetY:24,size:64,opacity:.8,value:1,deadzone:.1,hapticMs:10}]
 const mixer=settings.audio.mixer;mixer.snapshots.push({...structuredClone(mixer.snapshots[0]),id:'alternate-snapshot',name:'Alternate snapshot'});mixer.buses.unshift({id:'Audit',name:'Audit',gain:.8,mute:false,solo:false,parent:'Master',voiceLimit:8,sends:[{target:'Music',gain:.3,enabled:true}],effects:[{id:'filter',kind:'LowPass',enabled:true,wet:.4,frequency:800,q:.7,threshold:-12,ratio:4,time:.1,feedback:.2}],automation:[{time:0,gain:1},{time:1,gain:.5}],automationLoopSeconds:2});mixer.activeSnapshot=mixer.snapshots[0].id;mixer.ducking=[{id:'duck',triggerBus:'SFX',targetBus:'Music',reductionDb:-12,attack:.04,release:.35,enabled:true}]
 settings.build.platform.iconAsset=refs.image[0];settings.build.platform.splashAsset=refs.image[0];settings.build.platform.manifestAsset=refs.resource[0];settings.build.platform.permissions=['android.permission.INTERNET'];settings.build.platform.versionMetadata={channel:'audit'}
 settings.scripting.customSignals=['audit_signal']
 const rendering=settings.rendering;rendering.postProcessing.presets.push({...structuredClone(rendering.postProcessing.presets[0]),id:'alternate-post',name:'Alternate post'});rendering.postProcessing.userMaterial=refs.material[0];rendering.postProcessing.presets[0].values.userMaterial=refs.material[0];rendering.postProcessing.volumes=[{id:'post-volume',name:'Post volume',enabled:true,center:{x:0,y:0},size:{x:4,y:4},blendDistance:1,priority:1,presetId:rendering.postProcessing.presets[0].id}];rendering.qualityVolumes=[{id:'quality-volume',name:'Quality volume',enabled:true,center:{x:0,y:0},size:{x:4,y:4},priority:1,preset:'High',maximumPixelRatio:1.5,particleBudget:100,shadowQuality:'Soft'}]
 for(const field of ['hover','press','focus','cancel'])settings.presentation.uiAudio[field]=refs.audio[0]
 settings.production.data.saveMigrations=[{fromVersion:1,toVersion:3,renames:{old_score:'score'},defaults:{score:0,enabled:true,label:'Audit'},remove:['obsolete']}];settings.production.data.saveSchemaVersion=3
 settings.production.networking.replicatedEntities=[{entityUuid:entity.uuid,authority:'server',properties:['transform'],interpolate:true,predict:false,ownerPeerId:'peer-1',alwaysRelevant:false,interestRadius:10,sceneUuid:scene}];settings.production.networking.rpcContracts=[{name:'audit_rpc',channelId:settings.production.networking.channels[0].id,direction:'bidirectional',authority:'server',payloadSchema:'number',maximumPayloadBytes:1024,callsPerSecond:10}]
 settings.production.testing.tests=[{id:'audit-test',name:'Audit test',kind:'scene',sceneUuid:scene,steps:60,timeoutMs:1000,captureScreenshot:false,tags:['audit'],fixture:'settings-fixture',setup:'setup',teardown:'teardown',seed:1,retries:1,flakyInfrastructure:true,assertions:[{kind:'finitePhysics',target:'',expected:'true'}]}]
 if(!p.loadProject(JSON.stringify(document)))throw Error('Populated settings fixture rejected')
 return refs
}
