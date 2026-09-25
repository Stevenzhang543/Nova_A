/** 导入错误呈现：按诊断类别提供本地化操作建议，原始日志单独保留为技术详情。 */
const text = {
 decode: ['The source could not be decoded. Check its format and dimensions, then import the original file again.', 'Die Quelle konnte nicht dekodiert werden. Prüfe Format und Abmessungen und importiere die Originaldatei erneut.', '无法解码源文件。请检查格式和尺寸，再重新导入原始文件。'],
 limit: ['The import exceeds a size or queue limit. Choose fewer or smaller files, or wait for current jobs to finish.', 'Der Import überschreitet eine Größen- oder Warteschlangengrenze. Wähle weniger oder kleinere Dateien oder warte auf laufende Aufträge.', '导入超过大小或队列限制。请选择更少或更小的文件，或等待当前作业完成。'],
 stale: ['The project, source, or settings changed during import. Review the current asset and retry.', 'Projekt, Quelle oder Einstellungen wurden während des Imports geändert. Prüfe die aktuelle Ressource und versuche es erneut.', '导入期间项目、来源或设置发生变化。请检查当前资源后重试。'],
 source: ['Choose the original source file. Linked frames must be reimported through their original image or atlas.', 'Wähle die Originalquelldatei. Verknüpfte Frames müssen über das Originalbild oder den Atlas neu importiert werden.', '请选择原始源文件。关联帧须通过原始图片或图集重新导入。'],
 cancelled: ['The import was cancelled. Select the files again when ready.', 'Der Import wurde abgebrochen. Wähle die Dateien erneut aus, wenn du bereit bist.', '导入已取消。准备好后请重新选择文件。'],
 invalid: ['The file contains invalid or unsupported data. Correct the source using the technical details, then retry.', 'Die Datei enthält ungültige oder nicht unterstützte Daten. Korrigiere die Quelle anhand der technischen Details und versuche es erneut.', '文件包含无效或不支持的数据。请根据技术详情修正来源后重试。'],
 failed: ['The asset operation failed. Review the technical details and retry with the correct original source.', 'Der Ressourcenvorgang ist fehlgeschlagen. Prüfe die technischen Details und versuche es mit der richtigen Originalquelle erneut.', '资源操作失败。请查看技术详情，使用正确的原始来源重试。']
} as const
/** 分类只决定界面建议，不能改变异常或把失败报告为成功。 */
export function assetImportFailureSummary(message: string, locale: string): string {
 const category = /DECODE|decode/i.test(message) ? 'decode' : /LIMIT|TOO_LARGE|exceeds|too many/i.test(message) ? 'limit' : /STALE|changed during|session/i.test(message) ? 'stale' : /ASSET_BATCH_SOURCE|original source/i.test(message) ? 'source' : /cancel|abort/i.test(message) ? 'cancelled' : /invalid|unsupported|malformed|corrupt|format|schema/i.test(message) ? 'invalid' : 'failed'
 return text[category][locale==='de'?1:locale==='zh'?2:0]
}
/** 原始诊断可复制且不做机器改写，用本地化标题与用户建议区分。 */
export function assetImportTechnicalLabel(locale: string): string { return locale==='de'?'Technische Details':locale==='zh'?'技术详情':'Technical details' }
