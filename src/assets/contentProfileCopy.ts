/** 内容生产档案翻译：只翻译界面描述，保留 UUID、路径、导入器版本和技术枚举值。 */
import type { ContentFeature } from './contentLibrary26'
const labels: Record<string, [string,string]> = {
 'Importer provenance':['Importer-Herkunft','导入器来源'], 'Deterministic cache':['Deterministischer Cache','确定性缓存'], 'Sprite animation slices':['Sprite-Animationsausschnitte','精灵动画切片'], 'Nine-patch borders':['Neunsegment-Ränder','九宫格边界'], 'Vector path':['Vektorpfad','矢量路径'], 'Font distance field':['Schrift-Distanzfeld','字体距离场'], 'Font language coverage':['Schrift-Sprachabdeckung','字体语言覆盖'], 'Audio delivery':['Audiobereitstellung','音频加载方式'], 'Loop regions':['Schleifenbereiche','循环区间'], 'Localization table':['Übersetzungstabelle','本地化表'], 'Reusable library Resource':['Wiederverwendbare Bibliotheksressource','可复用库资源'], 'Export content group':['Export-Inhaltsgruppe','导出内容组']
}
const values: Record<string,[string,string]> = {
 'Verified source, importer, settings, and platform cache key matched.':['Verifizierte Quelle, Importer, Einstellungen und Plattform stimmen mit dem Cache überein.','已验证源、导入器、设置和平台缓存键一致。'], 'No verified artifact matched this source/importer/settings/platform cache key.':['Kein verifiziertes Artefakt entspricht diesem Quell-/Importer-/Einstellungs-/Plattformschlüssel.','没有已验证产物与此源、导入器、设置和平台缓存键一致。'],
 'Not recorded':['Nicht erfasst','未记录'], 'Verified cache hit':['Verifizierter Cachetreffer','已验证缓存命中'], 'Not imported':['Nicht importiert','尚未导入'], 'Not configured':['Nicht konfiguriert','未配置'], 'Raster source':['Rasterquelle','位图源'], 'Scalable/bitmap source':['Skalierbare/Bitmap-Quelle','矢量或位图源'], 'No declared language coverage':['Keine Sprachabdeckung angegeben','未声明语言覆盖'], 'No loop':['Keine Schleife','无循环'], 'Shared base, named variants, and local overrides':['Gemeinsame Basis, benannte Varianten und lokale Überschreibungen','共享基类、命名变体和局部覆盖'], 'Editor-only / stripped':['Nur Editor / entfernt','仅编辑器使用／导出剔除']
}
/** 按语言转换生产概览，数量描述使用完整模板，技术值仍保持可复制。 */
export function localizeContentProfile(features: ContentFeature[], locale: string): ContentFeature[] {
 if(locale!=='de'&&locale!=='zh')return features
 const index=locale==='de'?0:1
 return features.map(/** 翻译一项可见标题和描述，不改变能力状态或资源数据。 */ feature=>{
  let value=values[feature.value]?.[index]??feature.value
  const frames=/^(\d+) stable frames?$/.exec(value),loops=/^(\d+) configured$/.exec(value)
  if(frames)value=index===0?`${frames[1]} stabile Frames`:`${frames[1]} 个稳定帧`
  if(loops)value=index===0?`${loops[1]} konfiguriert`:`已配置 ${loops[1]} 个`
  for(const [english,german,chinese] of [['external resources reviewed','externe Ressourcen geprüft','已审查外部资源'],['self-contained','eigenständig','自包含'],['streaming','Streaming','流式'],['preloaded','vorgeladen','预加载'],['range','Bereich','范围']])value=value.replace(english,index===0?german:chinese)
  return {...feature,label:labels[feature.label]?.[index]??feature.label,value}
 })
}
