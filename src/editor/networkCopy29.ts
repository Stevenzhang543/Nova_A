/** 26.29 联网诊断文案：明确恢复边界和已接受权威状态的新鲜度。 */
import { preferencesState } from '../store/preferences'
const labels = {
 contract: ['Recovery contract', 'Wiederherstellungsvertrag', '恢复范围'],
 mode: ['Transform-delta correction', 'Transformationsdelta-Korrektur', '变换增量修正'],
 limits: ['Reapplies recorded position, rotation and velocity deltas. Does not resimulate physics contacts, scripts, RNG, audio or external side effects.', 'Wendet aufgezeichnete Positions-, Rotations- und Geschwindigkeitsdeltas erneut an. Keine erneute Simulation von Physikkontakten, Skripten, Zufall, Audio oder externen Effekten.', '重放已记录的位置、旋转和速度增量。不重新模拟物理接触、脚本、随机数、音频或外部副作用。'],
 age: ['Last applied snapshot age', 'Alter des zuletzt angewandten Zustands', '最近应用快照的年龄'],
 tick: ['Authoritative tick', 'Autoritativer Tick', '权威刻'],
 peer: ['Accepted authority peer', 'Akzeptierter Autoritäts-Peer', '已接受权威对等端'],
 none: ['No snapshot packet applied in this session', 'Kein Zustandsdatenpaket in dieser Sitzung angewandt', '本会话尚未应用快照数据包'],
 ageHint: ['Local monotonic time since an authorized snapshot packet was applied; not peer clock latency or whole-world completeness.', 'Lokale monotone Zeit seit Anwendung eines autorisierten Zustandsdatenpakets; keine Peer-Latenz und keine Aussage über vollständigen Weltzustand.', '使用本地单调时钟，表示授权快照数据包应用后的时间；不代表远端时钟延迟或完整世界状态。'],
 deltaFrames: ['Reapplied transform frames', 'Erneut angewandte Transformationsframes', '已重放变换帧']
} as const
/** 根据当前编辑器语言返回稳定文案，不缓存旧语言。 */ export function networkCopy29(key: keyof typeof labels): string { return labels[key][preferencesState.locale === 'de' ? 1 : preferencesState.locale === 'zh' ? 2 : 0] }

