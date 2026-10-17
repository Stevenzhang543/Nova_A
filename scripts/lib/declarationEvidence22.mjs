/** Reviewed declaration ownership links. These link evidence, never invent a lifecycle pass. */
/** 把声明字段关联到真实规范字段、具体组件和场景拥有者证据，保留容器及运行时资格限制。 */ export function linkDeclarationEvidence22(rows,entityApi){
 const prefixes={
  'src/world/Entity.ts#PrefabInstanceLayer':'reference#PrefabInstanceLayer.',
  'src/world/Entity.ts#SceneInstanceLayer':'reference#SceneInstanceLayer.',
  'src/runtime/packages.ts#InstalledPackage':'package-contract#InstalledPackage.',
  'src/runtime/plugins.ts#PluginManifest':'package-contract#PluginManifest.',
  'src/world/components.ts#BonePose2D':'nested-component#BonePose2D.',
  'src/world/components.ts#AreaEffect2D':'nested-component#AreaEffect2D.',
  'src/world/components.ts#PhysicsMaterial2D':'nested-component#PhysicsMaterial2D.',
  'src/world/Transform.ts#Transform':['nested-component#Transform.','reference#Transform.'],
  'src/world/Connection.ts#Connection':'connection#Connection.',
  'src/world/Connection.ts#ConnectionAnchor':'connection#ConnectionAnchor.',
  'src/world/Connection.ts#RopeNode': 'connection#Connection.ropeNodes.0.',
  'src/runtime/packages.ts#PackageManifest':'package-contract#PackageManifest.',
  'src/projects/projectManifest.ts#ProjectManifest':'manifest#ProjectManifest.',
  'src/projects/projectManifest.ts#ProjectDirectories':'manifest#ProjectManifest.directories.',
  'src/renderer/materials.ts#Material2DResource':'material#',
  'src/renderer/materials.ts#MaterialUniformField':'material#uniformSchema.*.',
  'src/renderer/renderSettings.ts#RenderingSettings':'settings#projectSettings.rendering.',
  'src/renderer/renderSettings.ts#PostProcessValues':['settings#projectSettings.rendering.postProcessing.','settings#projectSettings.rendering.postProcessing.presets.[*].values.'],
  'src/renderer/renderSettings.ts#PostProcessPreset2D':'settings#projectSettings.rendering.postProcessing.presets.[*].',
  'src/renderer/renderSettings.ts#PostProcessVolume2D':'settings#projectSettings.rendering.postProcessing.volumes.[*].',
  'src/renderer/renderSettings.ts#RenderQualityVolume2D':'settings#projectSettings.rendering.qualityVolumes.[*].',
  'src/renderer/renderSettings.ts#TextureStreamingSettings':'settings#projectSettings.rendering.textureStreaming.',
  'src/renderer/renderSettings.ts#DeterministicCaptureSettings':'settings#projectSettings.rendering.deterministicCapture.',
  'src/runtime/buildSettings.ts#BuildSettings':'settings#projectSettings.build.',
  'src/runtime/buildSettings.ts#BuildPlatformOptions':'settings#projectSettings.build.platform.',
  'src/runtime/buildSettings.ts#BuildDeliveryOptions':'settings#projectSettings.build.delivery.',
  'src/runtime/scriptSettings.ts#ScriptProjectSettings':'settings#projectSettings.scripting.',
  'src/runtime/input.ts#InputBinding':'settings#projectSettings.inputMap.[*].bindings.[*].',
  'src/runtime/input.ts#InputAction':'settings#projectSettings.inputMap.[*].',
  'src/runtime/deviceInput.ts#Insets':'settings#projectSettings.deviceInput.customSafeArea.',
  'src/runtime/deviceInput.ts#VirtualControlSettings':'settings#projectSettings.deviceInput.virtualControls.[*].',
  'src/runtime/deviceInput.ts#GamepadAxisCalibration':'settings#projectSettings.deviceInput.gamepadCalibrations.[*].',
  'src/runtime/deviceInput.ts#DeviceInputSettings':'settings#projectSettings.deviceInput.',
  'src/world/Entity.ts#Entity':['metadata#Entity.','reference#Entity.'],
  'src/renderer/materialGraph.ts#MaterialGraphNode':'material#graph.nodes.*.',
  'src/renderer/materialGraph.ts#MaterialGraphEdge':'material#graph.edges.*.',
  'src/renderer/materialGraph.ts#MaterialGraphDocument':'material#graph.',
  'src/renderer/materialGraph.ts#MaterialLayer2D':'material#layers.*.',
  'src/runtime/eventSheets.ts#ObjectEventHandler':'script-assets#EventSheet.handlers.0.',
  'src/runtime/eventSheets.ts#EventSheetDocument':'script-assets#EventSheet.',
  'src/runtime/objectBlueprints.ts#ObjectBlueprintDocument':'script-assets#ObjectBlueprint.',
  'src/world/Entity.ts#AuthoringMetadata2D':'metadata#Entity.authoring.',
  'src/world/SceneManager.ts#SceneDocument':'metadata#Scene.',
  'src/editor/sceneAuthoring.ts#SceneAuthoringSettings':'metadata#Scene.settings.',
  'src/editor/sceneAuthoring.ts#NamedSceneLayer':'metadata#Scene.settings.namedLayers.0.'
 };
 let direct=0,containers=0;
 const evidenceRows=rows.filter(/* 返回 row.declaration 的逻辑取反结果。 */ row=>!row.declaration),mediaRows=rows.filter(/* 比较 row.family 与 'media'，返回严格相等的判断结果。 */ row=>row.family==='media');
 for(const row of rows){
  if(!row.declaration||row.disposition!=='requires explicit authored/runtime/derived/transport classification')continue;
  const media=mediaRows.find(/* 先计算 target.source===row.source；仅当其为真值时求右侧 target.id==='media#'+row.declaration+'.'+row.field，返回短路求值结果。 */ target=>target.source===row.source&&target.id==='media#'+row.declaration+'.'+row.field);
  const prefix=prefixes[row.source+'#'+row.declaration],ids=(Array.isArray(prefix)?prefix:prefix?[prefix]:[]).map(/* 计算表达式 value+row.field 并返回结果，沿用操作数的原有类型规则。 */ value=>value+row.field);
  const exact=media?[media]:evidenceRows.filter(/* 调用 ids.includes(target.id) 并返回调用结果。 */ target=>ids.includes(target.id));
  const children=!exact.length?evidenceRows.filter(/* 调用 ids.some(id=>target.id.startsWith(id+'.')) 并返回调用结果。 */ target=>ids.some(/* 调用 target.id.startsWith(id+'.') 并返回调用结果。 */ id=>target.id.startsWith(id+'.'))):[];
  const linked=exact.length?exact:children;if(!linked.length)continue;
  row.canonicalEvidence={scope:exact.length?'Same authored field, represented by its canonical corpus row. Existing limitations remain.':'Populated child fields only; container insertion/removal/reordering and arbitrary variants remain unqualified.',links:linked.map(/** 复制规范字段的证据、生命周期及独立叶子信息。 */ target=>({id:target.id,disposition:target.disposition,cases:target.developmentProbeCases||[],lifecycle:target.lifecycle,independentLeafEvidence:target.independentLeafEvidence}))};
  row.disposition=exact.length?'Declaration alias; canonical field disposition, lifecycle evidence and remaining limitations are recorded in canonicalEvidence.':'Authored container; populated child evidence linked, structural operations remain pending.';
  if(exact.length){direct++;row.lifecycle={...row.lifecycle,...exact[0].lifecycle};if(exact.length>1)row.lifecycle.evidenceNote='All instances/case links are retained in canonicalEvidence; the first instance does not represent every variant.'}
  else{containers++;row.lifecycle.mutation='Authored container at '+ids.join(' / ')+'; populated child owners linked in canonicalEvidence'}
 }
 // The abstract envelope repeats concrete component metadata; retain every concrete owner's evidence.
 for(const row of rows.filter(/** 筛选抽象组件共有的标识、类型和启用字段。 */ row=>row.source==='src/world/components.ts'&&['Component2D','ComponentBase'].includes(row.declaration)&&['uuid','kind','enabled'].includes(row.field))){
  const owners=rows.filter(/** 筛选具有实际探测或构造身份的具体组件字段拥有者。 */ owner=>owner.source===row.source&&!['Component2D','ComponentBase'].includes(owner.declaration)&&owner.field===row.field&&(owner.developmentProbeCases?.length||owner.constructorIdentityEvidence));
  if(!owners.length)throw Error('Missing concrete component envelope '+row.id);
  row.disposition='Inherited component envelope alias; concrete identities own creation, enablement and tombstone state. Each concrete owner and its existing limitations are linked.';
  row.canonicalEvidence={scope:'Inherited declaration; no independent abstract component instance or invented field pass.',links:owners.map(/** 为具体拥有者保留标识、处置和生命周期证据。 */ owner=>({id:owner.id,disposition:owner.disposition,cases:owner.developmentProbeCases,lifecycle:owner.lifecycle}))};for(const key of ['mutation','validation','history','persistence','export'])if(owners.every(/* 先计算 owner.lifecycle[key]；仅当其为真值时求右侧 !/^pending/i.test(owner.lifecycle[key])，返回短路求值结果。 */ owner=>owner.lifecycle[key]&&!/^pending/i.test(owner.lifecycle[key])))row.lifecycle[key]='Concrete inherited owners in canonicalEvidence: '+owners.map(/* 返回 owner.id 的当前值。 */ owner=>owner.id).join(', ')+'; retain each owner limitation';direct++;
 }
 for(const declaration of ['Component2D','ComponentBase']){const row=rows.find(/* 比较 row.id 与 'src/world/components.ts#'+declaration+'.removed'，返回严格相等的判断结果。 */ row=>row.id==='src/world/components.ts#'+declaration+'.removed'),check=entityApi?.checks.find(/** 要求命名组件移除与恢复用例已经通过。 */ check=>check.name==='Removed component records keep identity while live collider replacement and optional accessors stay correct'&&check.status==='passed');if(!row||!check)throw Error('Missing executed tombstone-owner case');row.disposition='Component tombstone maintained by Entity.removeComponent/addComponent; not an independently edited property. Identity/revival behavior is checked on real component records.';row.ownerEvidence={report:'release-audits/v26.22-entity-api.json',case:check.name,scope:'Concrete component removal/revival and identity assertions; not exhaustive component-kind or history coverage.'};row.lifecycle.mutation='Entity.removeComponent / Entity.addComponent';row.lifecycle.persistence='serializeComponent envelope / applyStoredComponents preserve tombstone records; mandatory Transform is a separate fixed invariant';}
 for(const field of ['position','velocity']){const row=rows.find(/* 比较 row.id 与 'src/world/Connection.ts#RopeNode.'+field，返回严格相等的判断结果。 */ row=>row.id==='src/world/Connection.ts#RopeNode.'+field),owner=rows.find(/* 比较 row.id 与 'connection#Connection.ropeNodes'，返回严格相等的判断结果。 */ row=>row.id==='connection#Connection.ropeNodes');if(!row||!owner)throw Error('Missing rope checkpoint owner');row.disposition='Nested rope checkpoint '+field+' stored in Connection.ropeNodes; normalization/whole-checkpoint history/native/export cases are linked. This is not an independent Inspector field or a solver-effect pass.';row.canonicalEvidence={scope:'Nested checkpoint ownership; other rope-node variants remain separately reviewed.',links:[{id:owner.id,cases:owner.developmentProbeCases,lifecycle:owner.lifecycle}]};row.lifecycle={...row.lifecycle,...owner.lifecycle,mutation:owner.lifecycle.mutation+'; nested '+field+' checkpoint',evidenceNote:'Whole checkpoint evidence only; independent solver behavior is not inferred.'};containers++;}
 for(const field of ['layer','isStatic','isKinematic']){const row=rows.find(/* 比较 row.id 与 'src/world/Entity.ts#Entity.'+field，返回严格相等的判断结果。 */ row=>row.id==='src/world/Entity.ts#Entity.'+field),check=entityApi?.checks.find(/** 要求指定实体转发用例已通过且明确覆盖当前字段。 */ check=>check.name==='Body-mode aliases preserve unrelated modes and layer writes update all retained renderers'&&check.status==='passed'&&check.covers.includes(row?.id));if(!row||!check)throw Error('Missing executed forwarding case '+field);const owners=(field==='layer'?['ShapeRenderer2D.sortingLayer','SpriteRenderer2D.sortingLayer','TextRenderer2D.sortingLayer']:['RigidBody2D.bodyType']).map(/** 按具体组件字段名称查找规范证据行。 */ name=>rows.find(/* 比较 row.id 与 'src/world/components.ts#'+name，返回严格相等的判断结果。 */ row=>row.id==='src/world/components.ts#'+name));if(owners.some(/* 返回 owner 的逻辑取反结果。 */ owner=>!owner))throw Error('Missing forwarding target');row.disposition='Public forwarding property; '+(field==='layer'?'writes all retained renderers and reads the active renderer sorting layer.':'maps the RigidBody2D.bodyType enum without replacing an unrelated mode.');row.ownerEvidence={report:'release-audits/v26.22-entity-api.json',case:check.name,scope:'Actual getter/setter and rejection assertions. Concrete canonical owner lifecycle and remaining limitations apply.'};row.canonicalEvidence={scope:'Forwarding owner references; no new independent stored field.',links:owners.map(/** 复制转发目标的标识、生命周期和用例引用。 */ owner=>({id:owner.id,lifecycle:owner.lifecycle,cases:owner.developmentProbeCases}))};row.lifecycle.mutation='Entity.'+field+' / '+owners.map(/* 返回 owner.id 的当前值。 */ owner=>owner.id).join(', ');direct++;}
 return {direct,containers};
}

/** 要求对应场景拥有者命名报告通过，再关联容器、加载和导航状态的有限证据。 */ export function linkSceneOwnerEvidence22(rows,reports){
 const definitions=[
  [
    "src/world/Entity.ts#Entity.objectBlueprintAsset",
    "script-assets-corpus",
    "Actual blueprint instantiation applies required components, tags, groups, position and event binding",
    "Authored blueprint reference assigned by instantiateObjectBlueprint; creation and binding are checked. In-place arbitrary UUID replacement is not a supported field edit.",
    "instantiateObjectBlueprint / Entity serialization"
  ],
  [
    "src/world/Entity.ts#Entity.componentMap",
    "component-order",
    "Fifty project hydrations preserve component order identities removed records and exact authored values",
    "Authored component container owned by Entity add/remove and stored-component hydration. Concrete child fields carry separate validation/history/runtime rows.",
    "Entity.addComponent / Entity.removeComponent / applyStoredComponents"
  ],
  [
    "src/world/SceneManager.ts#SceneDocument.loaded",
    "scene-ownership",
    "Scene creation captures outgoing entity data and native/export retain inactive load flags",
    "Persisted editor load flag; navigation and fallback activation own changes. Not an independently Undoable property.",
    "SceneManager.captureActive / create / setActive / setLoaded / importProject / serialize"
  ],
  [
    "src/world/SceneManager.ts#SceneDocument.data",
    "scene-ownership",
    "Scene creation captures outgoing entity data and native/export retain inactive load flags",
    "Authored scene container; outgoing World capture and native/export reopen are checked. Child properties retain their separate transaction contracts.",
    "SceneManager.captureActive / create / setActive / setLoaded / importProject / serialize"
  ],
  [
    "src/world/SceneManager.ts#SceneManager.scenes",
    "scene-ownership",
    "Scene creation captures outgoing entity data and native/export retain inactive load flags",
    "Authored scene container; outgoing World capture and native/export reopen are checked. Child properties retain their separate transaction contracts.",
    "SceneManager.captureActive / create / setActive / setLoaded / importProject / serialize"
  ],
  [
    "src/world/SceneManager.ts#SceneManager.activeSceneUuid",
    "scene-ownership",
    "Scene creation captures outgoing entity data and native/export retain inactive load flags",
    "Persisted active scene selection; Back/Forward owns navigation history, separate from authored property Undo.",
    "SceneManager.captureActive / create / setActive / setLoaded / importProject / serialize"
  ]
 ];
 for(const [id,reportName,caseName,disposition,owner] of definitions){const row=rows.find(/* 比较 row.id 与 id，返回严格相等的判断结果。 */ row=>row.id===id),report=reports[reportName];if(!row||report?.status!=='passed'||!report.checks.some(/* 先计算 check.name===caseName；仅当其为真值时求右侧 check.status==='passed'，返回短路求值结果。 */ check=>check.name===caseName&&check.status==='passed'))throw Error('Missing scene ownership evidence '+id);row.disposition=disposition;row.ownerEvidence={report:'release-audits/v26.22-'+reportName+'.json',case:caseName,scope:disposition};row.lifecycle.mutation=owner;if(reportName==='scene-ownership'){row.lifecycle.persistence='Whole-project native WASM reopen in named scene-ownership case';row.lifecycle.export='Whole-project NovaPak reopen, exact decoded source bytes in named scene-ownership case';row.lifecycle.history=id.endsWith('.loaded')||id.endsWith('.activeSceneUuid')?'Editor load/navigation state; explicit Back/Forward, not document property Undo':'Container child transactions carry their own history evidence; scene creation/navigation itself is not an Inspector field edit';row.lifecycle.validation='Scene-ownership checks reject nonboolean loaded flags, reject unloading the sole loaded scene and preserve captured data isolation';row.lifecycle.runtime='Editor World changes checked by stable entity UUID; runtime scene transitions are separately tested by retained world suites';}}
 return definitions.length;
}
