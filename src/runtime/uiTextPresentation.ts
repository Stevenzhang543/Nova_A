/** Editor-compatible text calls delegate the same required-port text presenter. */
import type {Text} from '../world/components'
import type {RuntimeAccessibilitySettings} from './presentationOwner'
import {runtimeAccessibilitySettings} from './presentation'
import type {UiTextLayout} from './uiTextLayout'
import type {UiRect} from './uiLayout'
import {getEditorUiTextPresenter} from '../editor/gameUiAdapter'
export function uiTextPresentation(text:Text,scale:number,locale:string,fontSize=text.fontSize,fontWeight=text.fontWeight,accessibility:RuntimeAccessibilitySettings=runtimeAccessibilitySettings){return getEditorUiTextPresenter().uiTextPresentation(text,scale,locale,fontSize,fontWeight,accessibility)}
export function measureUiText(text:Text,scale:number,locale:string,width:number,context?:CanvasRenderingContext2D|null,accessibility:RuntimeAccessibilitySettings=runtimeAccessibilitySettings):{width:number;height:number}{return getEditorUiTextPresenter().measureUiText(text,scale,locale,width,context,accessibility)}
export function drawUiText(context:CanvasRenderingContext2D,text:Text,rect:UiRect,scale:number,locale:string,value?:string,fontSize?:number,fontWeight?:number,accessibility:RuntimeAccessibilitySettings=runtimeAccessibilitySettings):UiTextLayout{return getEditorUiTextPresenter().drawUiText(context,text,rect,scale,locale,value,fontSize,fontWeight,accessibility)}
