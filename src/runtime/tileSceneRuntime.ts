/** Noarg authoring compatibility only; real Runtime has its fixed World child. */
import type {Entity} from '../world/Entity'
import type {Vec2} from '../world/types'
import {createInitialTileSceneState,type TileSceneOwner,type TileSceneState} from './tileSceneOwner'
import type {StreamLifecycleOwner} from './streamLifecycle'
const raw=createInitialTileSceneState()
export let tileSceneRuntimeState:TileSceneState=raw
let provider:(()=>TileSceneOwner)|null=null
export function getLegacyTileSceneRawState(){return raw}
export function installLegacyTileScenePort(port:{stateView:TileSceneState;unwrap(value:TileSceneState):TileSceneState;getOwner():TileSceneOwner}){if(provider)throw new Error('TILE_SCENE_LEGACY_ALREADY_INSTALLED');if(port.unwrap(port.stateView)!==raw||typeof port.getOwner!=='function')throw new Error('TILE_SCENE_LEGACY_PORT_REQUIRED');tileSceneRuntimeState=port.stateView;provider=port.getOwner.bind(port)}
function requireOwner(){if(!provider)throw new Error('TILE_SCENE_LEGACY_PORT_REQUIRED');return provider()}
export function updateTileSceneRuntime(entities:Entity[],focus:Vec2,lifecycle?:StreamLifecycleOwner):void {const owner=requireOwner();if(lifecycle&&lifecycle.lifetimes.world!==owner.world)throw new Error('TILE_SCENE_OWNER_WORLD_MISMATCH');owner.updateTileSceneRuntime(entities,focus)}
export function resetTileSceneRuntime(detachOnly=false):void{requireOwner().resetTileSceneRuntime(detachOnly)}
