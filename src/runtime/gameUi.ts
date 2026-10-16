/** Editor compatibility HUD constructor and singleton; foreign consumers use GameUiOwner with required read ports. */
import {GameUiOwner} from './gameUiOwner'
import type {UiAudioRead,UiPresentationRead} from './uiReadPorts'
import {getEditorUiAudio,getEditorUiPresentation,getEditorUiReadPorts} from '../editor/gameUiAdapter'
export type {UiRect,GameUiRenderOptions,UiAccessibilityNode} from './gameUiOwner'
export class GameUiRuntime extends GameUiOwner {constructor(audio:UiAudioRead=getEditorUiAudio(),presentation:UiPresentationRead=getEditorUiPresentation){super(audio,presentation,getEditorUiReadPorts())}}
export const gameUiRuntime=new GameUiRuntime()
