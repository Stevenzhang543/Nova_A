import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=dirname(dirname(fileURLToPath(import.meta.url))),projectsRoot=join(root,'reference-projects/projects')
const readJson=async path=>JSON.parse(await readFile(path,'utf8')),writeJson=(path,value)=>writeFile(path,`${JSON.stringify(value,null,2)}\n`)
const base=await readJson(join(projectsRoot,'gameplay-v54-platformer/project.nova'))
function identify(project,name,template){
  project.engineVersion='6.7.0';project.projectName=name;project.projectMetadata.name=name;project.projectMetadata.template=template;project.projectMetadata.updatedAt='2026-09-01T00:00:00.000Z';project.projectMetadata.description='No-code touch, keyboard and gamepad platformer with safe-area and accessibility evidence.'
  project.manifest.name=name;project.manifest.engineCompatibility.maximumExclusive='7.0.0';project.assets=project.assets.filter(asset=>asset.assetType!=='script')
  project.projectSettings.build.gameName=name;project.projectSettings.build.platform.version='6.7.0';project.projectSettings.build.platform.identifier=`top.whitelists.novaa.${template.replace(/[^a-z0-9]/g,'')}`
  project.projectSettings.build.delivery={...project.projectSettings.build.delivery,deterministic:true,incremental:true,patchManifest:true,provenance:true,sbom:true,exportTemplate:'web-es2022-v1'}
  project.projectSettings.presentation.accessibility={...project.projectSettings.presentation.accessibility,keyboardNavigation:true,gamepadNavigation:true,screenReaderMetadata:true,announceFocusChanges:true,textScale:1,captionScale:1,minimumTargetSize:44}
}
function binding(device,code,extra={}){return{device,code,scale:1,x:0,y:0,gamepad:0,deadzone:.15,modifiers:[],chord:[],threshold:.01,invert:false,responseCurve:'linear',deviceId:'',...extra}}
const touch=structuredClone(base);identify(touch,'Nova 6.7 Touch Platformer','creator-v670-touch-platformer')
const horizontal=touch.projectSettings.inputMap.find(action=>action.name==='MoveHorizontal'),jump=touch.projectSettings.inputMap.find(action=>action.name==='Jump')
horizontal.bindings.push(binding('gamepad-axis','0',{deadzone:.16}),binding('gesture','pan-x'))
jump.bindings.push(binding('gamepad-button','0'),binding('gesture','tap'))
touch.projectSettings.deviceInput={
  virtualControlsEnabled:true,showVirtualControls:'always',safeAreaMode:'system',customSafeArea:{left:0,top:0,right:0,bottom:0},orientation:'landscape',referenceDpi:160,hapticsEnabled:true,motionSensorsEnabled:false,sensorFrequency:30,
  gamepadCalibrations:[{deviceId:'*',axis:0,minimum:-1,center:0,maximum:1,deadzone:.16,invert:false}],
  virtualControls:[
    {id:'v670-move',label:'Move',accessibleLabel:'Move player',action:'MoveHorizontal',kind:'stick',anchor:'bottom-left',offsetX:28,offsetY:28,size:132,opacity:.82,value:1,deadzone:.16,hapticMs:8},
    {id:'v670-jump',label:'Jump',accessibleLabel:'Jump',action:'Jump',kind:'button',anchor:'bottom-right',offsetX:34,offsetY:34,size:76,opacity:.86,value:1,deadzone:.1,hapticMs:14}
  ]
}
for(const entity of touch.scenes.flatMap(scene=>scene.entities)){
  const canvas=entity.components.find(component=>component.kind==='Canvas')
  if(canvas)Object.assign(canvas.data,{safeArea:true,safeAreaInsets:{left:47,top:0,right:47,bottom:21},dpiScale:3,localePreview:'en'})
}
const touchDir=join(projectsRoot,'creator-v670-touch-platformer');await mkdir(touchDir,{recursive:true});await writeJson(join(touchDir,'project.nova'),touch)
await writeFile(join(touchDir,'README.md'),`# Nova_A 6.7 no-code touch platformer

Engine **6.7.0** · Project Format 2/schema 29 · no Script2D component and no script asset.

Open Game view and press Play. Move with **A/D**, left gamepad axis, or the safe-area-aware virtual stick. Jump with **Space**, gamepad button 0, tap, or the virtual Jump button. The existing PlatformController2D component drives the same named actions, so this proves touch controls do not need code. Rotate Mobile portrait/landscape in Settings → Devices & mobile input; the controls must stay inside the safe area. Remap MoveHorizontal or Jump, calibrate axis 0, save/reload, and confirm all inputs still operate the same component.

In Presentation → Accessibility, traverse by keyboard/gamepad, test 200%, 300%, and 400% text, high contrast, reduced motion, RTL, English/German/Chinese, then export semantic evidence. Android remains optional: enable Nova Android Export and open Build → Platform. With no toolchain, the exact missing JDK/SDK/NDK/template list is the expected honest result. With a qualified local toolchain, Build must create an APK before explicit device install/log actions become available.
`)
await writeJson(join(touchDir,'test-controls.json'),{engineVersion:'6.7.0',reference:'creator-v670-touch-platformer',scriptAssets:0,scriptComponents:0,controls:{keyboard:'A/D + Space',gamepad:'axis 0 + button 0',touch:'virtual stick + Jump',gestures:'pan-x + tap'},workflow:['play no-code scene','move and jump with each device','remap and calibrate','rotate portrait and landscape','save and reload','test 200/300/400% text','switch en/de/zh and RTL','export semantic snapshot','open Android target and observe build or exact blocker'],expected:{playable:true,safeArea:true,hapticsExplicit:true,sensorsPermissionExplicit:true,semanticEvidence:true,frozenSchema:29}})
await writeJson(join(touchDir,'expected-output.json'),{engineVersion:'6.7.0',status:'passed',noCode:true,inputParity:['keyboard','gamepad','touch','gesture'],virtualControls:2,gamepadCalibrations:1,android:'toolchain-gated',ios:'matching-host-deferred'})

const android=structuredClone(touch);identify(android,'Nova 6.7 Android Delivery Gate','delivery-v670-android-gated')
android.projectSettings.build.target='android';android.projectSettings.build.architecture='aarch64';android.projectSettings.build.packageIntoExecutable=false;android.projectSettings.build.delivery.exportTemplate='android-aarch64-gated-v1';android.projectSettings.build.platform.orientation='landscape';android.projectSettings.build.platform.permissions=['android.permission.VIBRATE'];android.projectSettings.build.platform.versionMetadata={...(android.projectSettings.build.platform.versionMetadata??{}),'mobile.qualification':'toolchain-and-device-gated'}
const androidDir=join(projectsRoot,'delivery-v670-android-gated');await mkdir(androidDir,{recursive:true});await writeJson(join(androidDir,'project.nova'),android)
await writeFile(join(androidDir,'README.md'),`# Nova_A 6.7 Android delivery gate

Engine **6.7.0** · Project Format 2/schema 29.

This is the same playable no-code touch platformer with Android aarch64 selected, VIBRATE as its only permission, no implicit deployment, and no embedded credential. First enable the optional verified **Nova Android Export 6.7.0** package. Build is allowed only after live discovery finds JDK 17, Android SDK/API 35, build-tools, NDK, and a validated NOVA_A_ANDROID_TEMPLATE Gradle wrapper. Debug produces a debug APK. Manual release signing additionally needs a keystore path plus NOVA_ANDROID_KEYSTORE_PASSWORD, NOVA_ANDROID_KEY_ALIAS, and NOVA_ANDROID_KEY_PASSWORD in the local environment. Device install and logcat each require a separate click. Missing toolchain is a correct blocker, not a failed qualification.
`)
await writeJson(join(androidDir,'test-controls.json'),{engineVersion:'6.7.0',reference:'delivery-v670-android-gated',steps:['enable optional Android package','discover toolchain','review manifest and least permissions','build debug APK or record exact blocker','refresh devices','explicitly install APK','capture bounded logcat','play touch controls'],expected:{target:'android',architecture:'aarch64',permissions:['android.permission.VIBRATE'],implicitInstall:false,implicitLogs:false,credentialsSerialized:false}})
await writeJson(join(androidDir,'expected-output.json'),{engineVersion:'6.7.0',status:'passed-with-toolchain-gate',manifest:'generated-and-escaped',gradle:'offline-no-daemon',apk:'created-only-when-qualified',external:['physical hardware input/audio/sensor matrix','production signing','store review','clean-device lifecycle']})

const indexPath=join(root,'reference-projects/README.md'),start='<!-- NOVA_V670_REFERENCES_START -->',end='<!-- NOVA_V670_REFERENCES_END -->'
let index=await readFile(indexPath,'utf8')
const block=`${start}
## Nova_A 6.7.0 device/mobile/accessibility projects

- [No-code touch platformer](projects/creator-v670-touch-platformer/README.md) — one action map across keyboard, gamepad, gestures, virtual controls, safe areas and semantic evidence.
- [Android delivery gate](projects/delivery-v670-android-gated/README.md) — least-permission manifest, exact toolchain discovery, real Gradle/APK path, explicit deploy/log actions and honest external gates.
${end}`
const expression=new RegExp(`${start}[\\s\\S]*?${end}`,'m');index=expression.test(index)?index.replace(expression,block):`${index.trimEnd()}\n\n${block}\n`;await writeFile(indexPath,index)
console.log('Generated Nova_A v6.7.0 touch platformer and Android delivery references.')

