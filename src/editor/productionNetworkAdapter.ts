import { reactive } from 'vue'
import { physicsState } from '../store/physics'
import { packageState, OFFICIAL_NETWORKING_PACKAGE_ID } from '../runtime/packages'
import { productionSettings } from '../runtime/production'
import { reportRecoverableError } from '../runtime/runtimeFaultRecords'
import { ProductionNetworkOwner } from '../runtime/productionNetworkOwner'
import { NetworkSessionOwner } from '../runtime/networkSessionOwner'
import { MultiplayerReplayOwner } from '../runtime/multiplayerReplayOwner'
import type { NetworkConfiguration, NetworkConfigurationHost } from '../runtime/networkSessionContracts'
import { createNetworkPlatformPorts } from '../platform/networkPlatformFactory'
import { getLegacyNetworkSessionOwnerRawState, installLegacyNetworkSessionOwnerPort } from '../runtime/networking'
import { getLegacyMultiplayerReplayOwnerRawState, installLegacyMultiplayerReplayOwnerPort } from '../runtime/networkReplay'
import { installLegacyProductionNetworkOwnerPort } from '../runtime/productionRuntime'

const networkingView=reactive(getLegacyNetworkSessionOwnerRawState())
const replayView=reactive(getLegacyMultiplayerReplayOwnerRawState())
const owners=new WeakMap<object,ProductionNetworkOwner>()
const sessions=new WeakMap<ProductionNetworkOwner,NetworkSessionOwner>()
let legacyOwner:ProductionNetworkOwner|null=null
interface EditorNetworkHost { readonly state:{world:NetworkConfigurationHost['world']};readEnabledPackageIds():string[] }
export function createEditorProductionNetworkOwner(suppliedHost:EditorNetworkHost,options:{legacyRoot:boolean;readConfiguration():NetworkConfiguration}):ProductionNetworkOwner {
  if(options.legacyRoot&&suppliedHost.state!==physicsState)throw new Error('PRODUCTION_NETWORK_LEGACY_ROOT_REQUIRED: The legacy bridge requires the Editor root state.')
  const world=suppliedHost.state.world
  const previous=options.legacyRoot?legacyOwner:owners.get(suppliedHost)
  if(previous?.world===world)return previous
  const host:NetworkConfigurationHost={world,readConfiguration(){
    if(suppliedHost.state.world!==world)throw new Error('PRODUCTION_NETWORK_WORLD_CHANGED: Recreate the Core after replacing its World.')
    return options.readConfiguration()
  }}
  const platform=createNetworkPlatformPorts()
  const replay=new MultiplayerReplayOwner(host,platform,options.legacyRoot?replayView:undefined)
  const session=new NetworkSessionOwner(host,platform,replay,options.legacyRoot?networkingView:undefined)
  const owner=new ProductionNetworkOwner(host,{
    packageId:OFFICIAL_NETWORKING_PACKAGE_ID,
    packageEnabled(id){return suppliedHost.readEnabledPackageIds().includes(id)},
    async loadSession(){return session},reportRecoverableError
  })
  sessions.set(owner,session)
  if(options.legacyRoot)legacyOwner=owner
  else owners.set(suppliedHost,owner)
  return owner
}
function getEditorProductionNetworkOwner():ProductionNetworkOwner {
  if(legacyOwner?.world===physicsState.world)return legacyOwner
  return createEditorProductionNetworkOwner({get state(){return physicsState},readEnabledPackageIds(){return packageState.installed.filter(item=>item.enabled&&item.project).map(item=>item.manifest.id)}},{legacyRoot:true,readConfiguration(){return productionSettings}})
}
function getEditorNetworkSessionOwner():NetworkSessionOwner { const owner=getEditorProductionNetworkOwner(),session=sessions.get(owner);if(!session)throw new Error('EDITOR_NETWORK_SESSION_MISSING');return session }
installLegacyProductionNetworkOwnerPort({getOwner:getEditorProductionNetworkOwner})
installLegacyNetworkSessionOwnerPort({stateView:networkingView,getOwner:getEditorNetworkSessionOwner})
installLegacyMultiplayerReplayOwnerPort({stateView:replayView,getOwner:()=>getEditorNetworkSessionOwner().replay})
