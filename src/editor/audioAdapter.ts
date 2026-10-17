import {toRaw} from 'vue'
import {resolveAsset} from '../assets/AssetDatabase'
import {audioRuntime} from '../runtime/audio'
import {installLegacyAudioPort} from '../runtime/audioLegacy'
import {RuntimeAudioOwner} from '../runtime/audioOwner'
import {createAudioResourceReader} from '../runtime/audioResourceReader'
import {createWebAudioPlatform} from '../platform/webAudioHost'
import type {AudioWorld,AudioResources} from '../runtime/audioRuntimeContracts'
const platform=createWebAudioPlatform()
const legacyCapabilities={resources:createAudioResourceReader({resolveAsset}),platform}
installLegacyAudioPort(legacyCapabilities)
/** Explicit legacy mode shares only the existing Editor engine. Foreign catalog mode always creates an independent engine. */
export function createEditorRuntimeAudioOwner(world:AudioWorld,resources:AudioResources,options:{legacyRoot:boolean}):RuntimeAudioOwner{
 return new RuntimeAudioOwner(world,resources,{resources:createAudioResourceReader(resources),platform},toRaw,options.legacyRoot?audioRuntime:undefined)
}
