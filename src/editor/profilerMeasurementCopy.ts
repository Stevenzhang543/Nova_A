import type { PerformanceSamplingScope } from '../runtime/profiler'
import type { ScriptProfileCollectionEvidence } from '../runtime/profilerCollectionBudget'

/** Distinguish collection admission from displayed ranking; metadata budgeting is not a heap measurement. */
export function scriptProfileCollectionCopy(value: Readonly<ScriptProfileCollectionEvidence> | null, locale: 'en' | 'de' | 'zh'): string {
 if (!value) return {
  en: 'Collection limits and rejection data are unavailable in this capture. Completeness has not been verified.',
  de: 'Erfassungsgrenzen und abgelehnte Aufrufe sind für diese Aufnahme nicht bekannt. Vollständigkeit wurde nicht bestätigt.',
  zh: '此捕获没有采集容量与拒绝调用记录，完整性尚未验证。'
 }[locale]
 const { admittedEntries, maxEntries, estimatedMetadataBytes, maxEstimatedMetadataBytes, rejectedCalls, rejectedCallsSaturated, displayLimit, displayTruncated, collectionTruncated } = value
 return {
  en: `${admittedEntries}/${maxEntries} functions retained; estimated UTF-16 metadata ${estimatedMetadataBytes}/${maxEstimatedMetadataBytes} B (not measured heap usage). ${rejectedCalls} calls to new functions were not recorded${rejectedCallsSaturated ? ' (counter saturated)' : ''}. Rankings cover admitted functions, displaying up to ${displayLimit}.${displayTruncated ? ' Display is truncated.' : ''}${collectionTruncated ? ' Collection is incomplete.' : ' No capacity rejection recorded.'}`,
  de: `${admittedEntries}/${maxEntries} Funktionen gespeichert; geschätzte UTF-16-Metadaten ${estimatedMetadataBytes}/${maxEstimatedMetadataBytes} B (kein gemessener Heap-Verbrauch). ${rejectedCalls} Aufrufe neuer Funktionen wurden nicht erfasst${rejectedCallsSaturated ? ' (Zähler gesättigt)' : ''}. Rangfolge innerhalb zugelassener Funktionen, Anzeige bis ${displayLimit}.${displayTruncated ? ' Anzeige gekürzt.' : ''}${collectionTruncated ? ' Erfassung unvollständig.' : ' Keine kapazitätsbedingte Ablehnung erfasst.'}`,
  zh: `保留 ${admittedEntries}/${maxEntries} 个函数；UTF-16 元数据预算估算 ${estimatedMetadataBytes}/${maxEstimatedMetadataBytes} B（并非实测堆占用）。${rejectedCalls} 次新函数调用未记录${rejectedCallsSaturated ? '（计数已饱和）' : ''}。仅对已接纳函数排名，至多显示 ${displayLimit} 项。${displayTruncated ? '展示已截断。' : ''}${collectionTruncated ? '采集不完整。' : '未记录容量拒绝。'}`
 }[locale]
}

/** Preserve the historical mixed-unit number without labelling it as actual allocated bytes. */
export const scriptAllocationEstimateCopy = {
 en: 'Allocation values are the historical source/JSON length heuristic, not measured allocated bytes.',
 de: 'Allokationswerte sind die bisherige Heuristik aus Quelltext-/JSON-Längen, keine gemessenen allokierten Bytes.',
 zh: '分配估算沿用历史源码/JSON 长度启发值，并非实测分配字节数。'
} as const

/** Units belong only to finite measured values, including a genuinely measured zero. */
export function formatMeasuredValue(value: number | null | undefined, unit: string, unavailable: string, digits = 2): string {
 return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? `${value.toFixed(digits)} ${unit}` : unavailable
}
/** These windows deliberately retain their existing different histories and sampling denominators. */
export function profilerSamplingWindowCopy(scope: PerformanceSamplingScope, locale: 'en' | 'de' | 'zh'): { profiler: string; runtime: string } {
 const { profilerIntervalSummaryCapacity: summary, rafIntervalCapacity: raf, runtimePublishEveryHostFramesAtCapture: publish, profilerSampleEveryHostFramesAtCapture: sample } = scope
 const held = !scope.profilerEnabledAtCapture || scope.profilerFrozenAtCapture || sample === null
 const copy = {
  en: { profiler: `Frame/FPS show the last recorded host frame. Median/p95/p99 use up to ${summary} recorded adjacent rAF intervals. ${held ? 'Recording is paused; retained samples remain visible.' : `Current mode records every ${sample} host frame(s).`} FPS is not the reciprocal of CPU work time.`, runtime: `Worst frame and 1% low use up to ${raf} measured adjacent rAF intervals. Runtime metrics publish every ${publish} host frame(s) and can lag. Clear samples clears only Profiler history; Play/Stop do not reset rAF history. Retained history can include earlier modes and settings.` },
  de: { profiler: `Frame/FPS zeigen den zuletzt erfassten Host-Frame. Median/p95/p99 verwenden bis zu ${summary} erfasste benachbarte rAF-Intervalle. ${held ? 'Aufzeichnung pausiert; bisherige Samples bleiben sichtbar.' : `Aktueller Modus erfasst jeden ${sample}. Host-Frame.`} FPS ist nicht der Kehrwert der CPU-Arbeitszeit.`, runtime: `Langsamster Frame und 1%-Minimum verwenden bis zu ${raf} gemessene benachbarte rAF-Intervalle. Laufzeitwerte erscheinen alle ${publish} Host-Frames und können verzögert sein. Samples löschen leert nur den Profiler; Play/Stop setzt die rAF-Historie nicht zurück. Die Historie kann frühere Modi und Einstellungen enthalten.` },
  zh: { profiler: `Frame/FPS 显示最后记录的 Host 帧。median/p95/p99 使用最近至多 ${summary} 个已记录的相邻 rAF 间隔。${held ? '当前暂停记录，仍显示保留样本。' : `当前模式每 ${sample} 个 Host 帧记录一次。`}FPS 不是 CPU 工作耗时的倒数。`, runtime: `最慢帧与 1% 低帧使用最近至多 ${raf} 个实测相邻 rAF 间隔。运行时指标每 ${publish} 个 Host 帧发布一次，可能滞后。清空样本只清 Profiler；Play/Stop 不重置 rAF 历史。保留历史可能包含此前模式和设置。` }
 }
 return copy[locale]
}

/** 性能诊断三语文案：区分帧间隔、CPU 提交和真实 GPU 查询，避免未测量数值冒充零耗时。 */
export const profilerMeasurementCopy={
 en:{title:'Measured presentation',interval:'Recent frame intervals',scope:'Last 240 recorded frames; intervals are not GPU completion times. Sampling mode can skip frames.',backend:'Actual backend',resolution:'Backing resolution',samples:'Actual AA samples',fallback:'AA limited / shader fallbacks',gpu:'GPU query time',unavailable:'Unavailable / not measured',cpu:'CPU submission time',pass:'Render pass',disabled:'Disabled',quality:'Project quality belongs to saved/exported games. Editor presentation overrides do not change authored quality.',memory:'Heap growth is a wall-clock trend, not proof of a memory leak.',budget:'Texture residency / budget'},
 de:{title:'Gemessene Darstellung',interval:'Letzte Frame-Intervalle',scope:'Letzte 240 erfasste Frames; Intervalle sind keine GPU-Abschlusszeiten. Der Abtastmodus kann Frames auslassen.',backend:'Tatsächliches Backend',resolution:'Renderauflösung',samples:'Tatsächliche AA-Samples',fallback:'AA begrenzt / Shader-Rückfälle',gpu:'GPU-Abfragezeit',unavailable:'Nicht verfügbar / nicht gemessen',cpu:'CPU-Übermittlungszeit',pass:'Renderdurchlauf',disabled:'Deaktiviert',quality:'Projektqualität gilt für gespeicherte und exportierte Spiele. Editor-Darstellung überschreibt keine Autorenqualität.',memory:'Heap-Wachstum ist ein Trend über reale Zeit, kein Beweis für ein Speicherleck.',budget:'Texturspeicher / Budget'},
 zh:{title:'实测呈现诊断',interval:'近期帧间隔',scope:'最近240个记录帧；间隔不代表GPU完成时间，采样模式可能跳过帧。',backend:'实际后端',resolution:'实际绘制分辨率',samples:'实际抗锯齿采样数',fallback:'抗锯齿受限 / 着色器回退',gpu:'GPU查询耗时',unavailable:'不可用 / 尚未测量',cpu:'CPU提交耗时',pass:'渲染通道',disabled:'已禁用',quality:'项目画质随保存和导出游戏保留，编辑器呈现偏好不会改变作者画质。',memory:'堆增长按真实墙钟时间计算，仅为趋势，不代表已确认内存泄漏。',budget:'纹理驻留 / 预算'}
} as const

export const profilerStartupCopy = {
 en: { moduleWall: 'Module load to first host frame', prefetchWall: 'Workspace prefetch wall time', scope: 'Module time includes Launcher selection wait and ends at host-frame completion, without a Ready or API-submission check. Prefetch time includes idle waits; it does not certify successful loads. Request-to-Ready cold/warm startup is not measured.' },
 de: { moduleWall: 'Modulladen bis zum ersten Host-Frame', prefetchWall: 'Gesamtzeit der Arbeitsbereich-Vorabladung', scope: 'Modulzeit enthält die Launcher-Auswahlwartezeit und endet am Host-Frame ohne Ready- oder API-Prüfung. Vorabladezeit enthält Leerlaufwartezeit und bestätigt keinen Ladeerfolg. Kalt-/Warmstart von Anfrage bis Ready wurde nicht gemessen.' },
 zh: { moduleWall: '模块加载至首个 Host 帧', prefetchWall: '工作区预载墙钟时间', scope: '模块耗时包含启动页选择等待，终点是 Host 帧完成，未检查 Ready 或 API 提交。预载耗时包含空闲等待，不证明资源加载成功。请求至 Ready 的真实冷、暖启动尚未测量。' }
} as const
