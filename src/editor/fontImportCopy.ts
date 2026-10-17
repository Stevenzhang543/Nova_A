/** Explain which imported-font settings the current Canvas renderer consumes. */
import { preferencesState } from '../store/preferences'

const availability = {
  en: 'Text currently uses browser font rendering, with family fallbacks and outlines. Bitmap, SDF/MSDF, hinting, oversampling, shaping and OpenType switches are saved import metadata; they do not change rendering yet.',
  de: 'Text verwendet derzeit die Schriftwiedergabe des Browsers mit Ersatzschriften und Konturen. Bitmap, SDF/MSDF, Hinting, Überabtastung, Shaping und OpenType-Schalter werden als Importmetadaten gespeichert; sie ändern die Darstellung noch nicht.',
  zh: '文本目前使用浏览器字体渲染，支持后备字体和描边。Bitmap、SDF/MSDF、字体微调、过采样、字形塑造和 OpenType 开关仅保存为导入元数据，暂不影响渲染。'
}

export function fontImportAvailabilityCopy(): string {
  return availability[preferencesState.locale]
}
