import { reactive } from 'vue'
import { exportTemplateState } from './exportTemplates'

export type AndroidPermissionRisk = 'normal' | 'runtime' | 'restricted'
export interface AndroidPermissionDefinition { id: string; label: string; risk: AndroidPermissionRisk; purposeRequired: boolean }
export interface AndroidToolchainStatus {
  available: boolean; jdkReady: boolean; sdkReady: boolean; platformReady: boolean; buildToolsReady: boolean; ndkReady: boolean; adbReady: boolean; templateReady: boolean
  sdkRoot: string | null; javaHome: string | null; adbPath: string | null; templatePath: string | null; missing: string[]
}
export interface AndroidDevice { serial: string; state: string; description: string }
export interface AndroidPermissionIssue { code: string; severity: 'error' | 'warning'; permission: string; message: string }
export interface AndroidCommandResult { success: boolean; output: string }

export const ANDROID_PERMISSIONS: readonly AndroidPermissionDefinition[] = Object.freeze([
  { id:'android.permission.INTERNET', label:'Internet access', risk:'normal', purposeRequired:false },
  { id:'android.permission.ACCESS_NETWORK_STATE', label:'Network status', risk:'normal', purposeRequired:false },
  { id:'android.permission.VIBRATE', label:'Haptic vibration', risk:'normal', purposeRequired:false },
  { id:'android.permission.POST_NOTIFICATIONS', label:'Notifications', risk:'runtime', purposeRequired:true },
  { id:'android.permission.CAMERA', label:'Camera', risk:'runtime', purposeRequired:true },
  { id:'android.permission.RECORD_AUDIO', label:'Microphone', risk:'runtime', purposeRequired:true },
  { id:'android.permission.ACCESS_FINE_LOCATION', label:'Precise location', risk:'runtime', purposeRequired:true },
  { id:'android.permission.READ_MEDIA_IMAGES', label:'Photos', risk:'runtime', purposeRequired:true },
  { id:'android.permission.BLUETOOTH_CONNECT', label:'Bluetooth devices', risk:'runtime', purposeRequired:true }
])

export const androidDeliveryState = reactive({
  loading:false, deploying:false, error:'', output:'', selectedSerial:'', devices:[] as AndroidDevice[],
  status: { available:false,jdkReady:false,sdkReady:false,platformReady:false,buildToolsReady:false,ndkReady:false,adbReady:false,templateReady:false,sdkRoot:null,javaHome:null,adbPath:null,templatePath:null,missing:['Discovery has not run.'] } as AndroidToolchainStatus
})

export function validateAndroidPermissions(permissions: readonly string[], purposes: Readonly<Record<string,string>> = {}): AndroidPermissionIssue[] {
  const issues: AndroidPermissionIssue[] = [], seen = new Set<string>(), catalog = new Map(ANDROID_PERMISSIONS.map(item=>[item.id,item]))
  for (const permission of permissions.slice(0,64)) {
    if (!/^android\.permission\.[A-Z0-9_]{1,80}$/.test(permission)) { issues.push({code:'NOVA-ANDROID-PERMISSION-ID',severity:'error',permission,message:'Permission identifier is malformed.'}); continue }
    if (seen.has(permission)) { issues.push({code:'NOVA-ANDROID-PERMISSION-DUPLICATE',severity:'warning',permission,message:'Permission is duplicated.'}); continue }; seen.add(permission)
    const definition=catalog.get(permission)
    if(!definition)issues.push({code:'NOVA-ANDROID-PERMISSION-UNKNOWN',severity:'warning',permission,message:'Permission is not in the reviewed Nova catalog; verify it against Android documentation.'})
    else if(definition.purposeRequired&&!String(purposes[permission]??'').trim())issues.push({code:'NOVA-ANDROID-PERMISSION-PURPOSE',severity:'error',permission,message:'Runtime-sensitive permission needs a user-facing purpose before build.'})
  }
  return issues.sort((a,b)=>a.permission.localeCompare(b.permission)||a.code.localeCompare(b.code))
}

function xml(value:string):string{return value.replace(/[&<>"']/g,character=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;' }[character]??character))}
export function androidManifestPreview(options:{identifier:string;version:string;orientation:string;permissions:readonly string[]}):string{
  const orientation=options.orientation==='portrait'?'portrait':options.orientation==='landscape'?'landscape':'unspecified'
  const permissions=[...new Set(options.permissions)].filter(value=>/^android\.permission\.[A-Z0-9_]{1,80}$/.test(value)).sort()
  return `<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n${permissions.map(value=>`  <uses-permission android:name="${xml(value)}" />`).join('\n')}${permissions.length?'\n':''}  <application android:label="@string/app_name" android:icon="@mipmap/ic_launcher">\n    <activity android:name=".MainActivity" android:screenOrientation="${orientation}" android:exported="true" />\n  </application>\n</manifest>\n<!-- Application ID: ${xml(options.identifier)} · Version: ${xml(options.version)} -->\n`
}

async function synchronizeAndroidGates(options:{device?:boolean;installLaunch?:boolean}={}):Promise<void>{
  const status=androidDeliveryState.status
  Object.assign(exportTemplateState.androidGates,{jdk:status.jdkReady,sdk:status.sdkReady&&status.platformReady&&status.buildToolsReady,ndk:status.ndkReady,template:status.templateReady})
  if(options.device!==undefined)exportTemplateState.androidGates.device=options.device
  if(options.installLaunch!==undefined)exportTemplateState.androidGates.installLaunch=options.installLaunch
  const template=exportTemplateState.templates.find(item=>item.id==='android-aarch64-gated-v1')
  if(template){template.installed=status.templateReady;template.templateVersion='6.7.0';template.limitations=['Production signing, clean-device lifecycle, physical touch/gamepad/audio/sensor qualification and store review remain external gates.']}
}

export async function refreshAndroidToolchain():Promise<AndroidToolchainStatus>{
  androidDeliveryState.loading=true;androidDeliveryState.error=''
  try{const{invoke}=await import('@tauri-apps/api/core');androidDeliveryState.status=await invoke<AndroidToolchainStatus>('android_toolchain_status');await synchronizeAndroidGates()}
  catch(error){androidDeliveryState.error=error instanceof Error?error.message:String(error)}
  finally{androidDeliveryState.loading=false}
  return androidDeliveryState.status
}
export async function refreshAndroidDevices():Promise<AndroidDevice[]>{
  androidDeliveryState.loading=true;androidDeliveryState.error=''
  try{const{invoke}=await import('@tauri-apps/api/core');androidDeliveryState.devices=await invoke<AndroidDevice[]>('android_devices');if(!androidDeliveryState.devices.some(item=>item.serial===androidDeliveryState.selectedSerial))androidDeliveryState.selectedSerial=androidDeliveryState.devices.find(item=>item.state==='device')?.serial??'';await synchronizeAndroidGates({device:androidDeliveryState.devices.some(item=>item.state==='device')})}
  catch(error){androidDeliveryState.error=error instanceof Error?error.message:String(error);androidDeliveryState.devices=[]}
  finally{androidDeliveryState.loading=false}
  return androidDeliveryState.devices
}
export async function deployAndroidApk(apkPath:string,deviceSerial=androidDeliveryState.selectedSerial):Promise<AndroidCommandResult>{
  androidDeliveryState.deploying=true;androidDeliveryState.error=''
  try{const{invoke}=await import('@tauri-apps/api/core');const result=await invoke<AndroidCommandResult>('android_deploy_apk',{request:{apkPath:apkPath.trim(),deviceSerial:deviceSerial.trim()}});androidDeliveryState.output=result.output;if(!result.success)androidDeliveryState.error='adb install returned a failure.';await synchronizeAndroidGates({installLaunch:result.success});return result}
  catch(error){androidDeliveryState.error=error instanceof Error?error.message:String(error);return{success:false,output:androidDeliveryState.error}}
  finally{androidDeliveryState.deploying=false}
}
export async function captureAndroidLogs(deviceSerial=androidDeliveryState.selectedSerial):Promise<AndroidCommandResult>{
  androidDeliveryState.loading=true;androidDeliveryState.error=''
  try{const{invoke}=await import('@tauri-apps/api/core');const result=await invoke<AndroidCommandResult>('android_logcat_snapshot',{deviceSerial:deviceSerial.trim()});androidDeliveryState.output=result.output;return result}
  catch(error){androidDeliveryState.error=error instanceof Error?error.message:String(error);return{success:false,output:androidDeliveryState.error}}
  finally{androidDeliveryState.loading=false}
}
export const iosDeliveryStatus=Object.freeze({available:false,reason:'iOS export requires a matching macOS host, Xcode, Apple signing, and physical-device qualification; it remains deferred in Nova_A 6.7.0.'})

