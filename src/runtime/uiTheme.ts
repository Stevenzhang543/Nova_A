/** Editor theme authoring facade; all value/read algorithms have one shared Runtime implementation. */
import { assetReference, createTextAsset, resolveAsset, updateTextAsset } from '../assets/AssetDatabase'
import {getEditorUiThemeReader} from '../editor/gameUiAdapter'
import {defaultUiTheme,normalizeUiThemeSource,validateUiThemeDocument,type UiThemeDocument} from './uiThemeValues'
export * from './uiThemeValues'



/** 结构说明（自动提取）：createUiTheme；输入 name；直接调用 defaultUiTheme、name.slice、createTextAsset、JSON.stringify、assetReference；写入 theme.name。 */ export function createUiTheme(name = 'Nova UI'): string {
  const theme = defaultUiTheme(); theme.name = name.slice(0, 120)
  const asset = createTextAsset(theme.name, 'uiTheme', JSON.stringify(theme, null, 2), 'Assets/UI Themes')
  return assetReference(asset.uuid)
}

/** 结构说明（自动提取）：writeUiTheme；输入 reference、theme；直接调用 resolveAsset、validateUiThemeDocument、Error、errors.join、themeInheritanceChain 等；包含显式抛错路径。 */ export function writeUiTheme(reference: string, theme: UiThemeDocument): boolean {
  const asset = resolveAsset(reference)
  const errors = validateUiThemeDocument(theme); if (errors.length) throw new Error(errors.join('\n'))
  if (theme.parentTheme) { const chain = themeInheritanceChain(theme.parentTheme); if (chain.cycle || chain.missing.length || chain.references.includes(asset?.uuid ?? '')) throw new Error('Theme parent is missing, cyclic or exceeds the inheritance limit.') }
  return Boolean(asset?.assetType === 'uiTheme' && updateTextAsset(asset.uuid, JSON.stringify(normalizeUiThemeSource(theme), null, 2)))
}
export function readUiThemeSource(reference:string|null|undefined):UiThemeDocument|null{return getEditorUiThemeReader().readUiThemeSource(reference)}
export function readUiTheme(reference:string|null|undefined,visited=new Set<string>()):UiThemeDocument|null{return getEditorUiThemeReader().readUiTheme(reference,visited)}
export function themeInheritanceChain(reference:string|null|undefined):{references:string[];cycle:boolean;missing:string[]}{return getEditorUiThemeReader().themeInheritanceChain(reference)}
