import { preferencesState } from '../store/preferences'
const en = {
  metadataHint: 'Inspect source settings, dependency ownership and import diagnostics here.', resourceObject: 'Resource overrides must be a JSON object.', uniqueVariant: 'Choose a new variant name using 1–80 letters, numbers, dots, underscores or hyphens.', saveBeforeOverride: 'Save this resource before creating an inherited override.',
  sourceBindings: 'Original source bindings', chooseSource: 'Choose a source', openSource: 'Open source', imageSource: 'Image', tilesetSource: 'Tileset',
  sourceOwnedTiles: 'These tile definitions belong to the imported map. Make an independent editable copy to customize them; source reimports continue to update the original.', editableTileSet: 'Make editable TileSet copy', savedResourceValues: 'Saved runtime values',
  createTilemap: 'Create tilemap in scene', mapSource: 'Imported tilemap',
  preview: 'Image preview', loading: 'Loading preview', unavailable: 'Preview unavailable',
  extracted: 'Linked sprite frame', original: 'Open original source', extract: 'Extract or update frames',
  animation: 'Create animation from frames', extractFirst: 'Extract the source frames first.',
  sourceLink: 'Frames share source pixels and retain their identities when reimported.',
  memory: 'This image exceeds the preview memory budget. Enable atlas packing or import a smaller source.',
  decode: 'The image could not be decoded. Reimport its original source to retry.',
  missing: 'Repair the missing original image or atlas in Dependencies.',
  bounds: 'The frame does not fit its image. Restore or reimport the matching source.',
  operationFailed: 'The asset operation could not complete. Your previous source is retained.',
  extracting: 'Extracting frames', framesReady: 'Frames ready', animateReady: 'Animation created',
  browse: 'Browse', previewDetails: 'Preview and details', progress: 'Batch import progress', cancel: 'Cancel batch',
  completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', sourceFrames: 'Source frames',
}
const de: Record<keyof typeof en, string> = {
  metadataHint: 'Prüfe hier Quelleinstellungen, Abhängigkeiten und Importdiagnosen.', resourceObject: 'Ressourcenüberschreibungen müssen ein JSON-Objekt sein.', uniqueVariant: 'Wähle einen neuen Variantennamen aus 1–80 Buchstaben (A–Z), Ziffern, Punkten, Unterstrichen oder Bindestrichen.', saveBeforeOverride: 'Speichere die Ressource, bevor du eine abgeleitete Überschreibung erstellst.',
  sourceBindings: 'Verknüpfte Originalquellen', chooseSource: 'Quelle auswählen', openSource: 'Quelle öffnen', imageSource: 'Bild', tilesetSource: 'Tileset',
  sourceOwnedTiles: 'Diese Kacheldefinitionen gehören zur importierten Karte. Erstelle zum Anpassen eine unabhängige Kopie. Erneute Quellimporte aktualisieren weiterhin das Original.', editableTileSet: 'Bearbeitbare TileSet-Kopie erstellen', savedResourceValues: 'Gespeicherte Laufzeitwerte',
  createTilemap: 'Tilemap in der Szene erstellen', mapSource: 'Importierte Tilemap',
  preview: 'Bildvorschau', loading: 'Vorschau wird geladen', unavailable: 'Vorschau nicht verfügbar',
  extracted: 'Verknüpfter Sprite-Frame', original: 'Originalquelle öffnen', extract: 'Frames extrahieren oder aktualisieren',
  animation: 'Animation aus Frames erstellen', extractFirst: 'Extrahiere zuerst die Quellframes.',
  sourceLink: 'Frames teilen die Quellpixel und behalten beim erneuten Import ihre Identität.',
  memory: 'Dieses Bild überschreitet das Vorschau-Speicherbudget. Aktiviere den Atlas oder importiere eine kleinere Quelle.',
  decode: 'Das Bild konnte nicht dekodiert werden. Importiere die Originalquelle erneut.',
  missing: 'Repariere das fehlende Originalbild oder den Atlas unter Abhängigkeiten.',
  bounds: 'Der Frame passt nicht zum Bild. Stelle die passende Quelle wieder her oder importiere sie erneut.',
  operationFailed: 'Der Vorgang konnte nicht abgeschlossen werden. Die vorherige Quelle bleibt erhalten.',
  extracting: 'Frames werden extrahiert', framesReady: 'Frames bereit', animateReady: 'Animation erstellt',
  browse: 'Durchsuchen', previewDetails: 'Vorschau und Details', progress: 'Fortschritt des Stapelimports', cancel: 'Stapel abbrechen',
  completed: 'Abgeschlossen', failed: 'Fehlgeschlagen', cancelled: 'Abgebrochen', sourceFrames: 'Quellframes',
}
const zh: Record<keyof typeof en, string> = {
  metadataHint: '在此检查来源设置、依赖归属与导入诊断。', resourceObject: '资源覆盖数据必须是 JSON 对象。', uniqueVariant: '请使用 1–80 个英文字母、数字、点、下划线或连字符创建未使用的变体名称。', saveBeforeOverride: '创建继承覆盖前请先保存此资源。',
  sourceBindings: '原始来源关联', chooseSource: '选择来源', openSource: '打开来源', imageSource: '图像', tilesetSource: '瓦片集',
  sourceOwnedTiles: '这些瓦片定义属于导入的地图。请创建独立可编辑副本以进行自定义；重新导入来源时仍更新原始地图。', editableTileSet: '创建可编辑瓦片集副本', savedResourceValues: '已保存的运行时值',
  createTilemap: '在场景中创建瓦片地图', mapSource: '导入的瓦片地图',
  preview: '图像预览', loading: '正在加载预览', unavailable: '预览不可用',
  extracted: '关联精灵帧', original: '打开原始来源', extract: '提取或更新帧',
  animation: '从帧创建动画', extractFirst: '请先提取来源中的帧。',
  sourceLink: '各帧共享原图像素，重新导入时保留原有身份。',
  memory: '此图像超出预览内存预算。请启用图集或导入尺寸较小的来源。',
  decode: '无法解码图像。请重新导入原始来源后重试。',
  missing: '请在依赖关系中修复缺失的原始图像或图集。',
  bounds: '帧区域超出原图。请恢复或重新导入匹配的来源。',
  operationFailed: '资源操作未能完成，之前的来源已保留。',
  extracting: '正在提取帧', framesReady: '帧已准备好', animateReady: '已创建动画',
  browse: '浏览', previewDetails: '预览与详情', progress: '批量导入进度', cancel: '取消批次',
  completed: '已完成', failed: '失败', cancelled: '已取消', sourceFrames: '来源帧',
}
export function assetWorkflowCopy(key: keyof typeof en): string { return ({ en, de, zh }[preferencesState.locale] ?? en)[key] }
export function textureProblemCopy(diagnostic: string): string {
  if (!diagnostic) return ''
  if (diagnostic.startsWith('TEXTURE_MEMORY_BUDGET')) return assetWorkflowCopy('memory')
  if (diagnostic.startsWith('TEXTURE_DECODE_FAILED')) return assetWorkflowCopy('decode')
  if (diagnostic.startsWith('TEXTURE_FRAME_BOUNDS')) return assetWorkflowCopy('bounds')
  if (/^TEXTURE_.*MISSING/.test(diagnostic)) return assetWorkflowCopy('missing')
  return assetWorkflowCopy('unavailable')
}