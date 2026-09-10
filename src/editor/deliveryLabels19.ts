import { preferencesState } from '../store/preferences'
const copy = {
  desktopRequired: ['Open this project in the Nova_A desktop application to export a desktop player. The browser can export Web packages.', 'Dieses Projekt in Nova_A Desktop öffnen, um einen Desktop-Player zu exportieren. Der Browser kann Web-Pakete exportieren.', '请在 Nova_A 桌面应用中打开此项目，以导出桌面播放器。浏览器可以导出 Web 包。'],
  nativeFailed: ['Desktop capability detection failed. Restart Nova_A and retry. Details:', 'Die Erkennung des Desktop-Hosts ist fehlgeschlagen. Nova_A neu starten und erneut versuchen. Details:', '桌面宿主能力检测失败。请重启 Nova_A 后重试。详情：'],
  base: ['Base version', 'Basisversion', '基础版本'],
  ours: ['Local version', 'Lokale Version', '本地版本'],
  theirs: ['Incoming version', 'Eingehende Version', '传入版本'],
  missing: ['Deleted / absent', 'Gelöscht / nicht vorhanden', '已删除／不存在'],
  order: ['Ordering conflict — choices keep merged property edits', 'Reihenfolgekonflikt — Eigenschaftsänderungen bleiben erhalten', '顺序冲突——选择顺序时保留已合并的属性编辑'],
  review: ['Compare the values, choose a version for every conflict, then apply. Applying is undoable. If the project changes during review, import again to refresh.', 'Werte vergleichen, jeden Konflikt entscheiden und anwenden. Die Anwendung ist rückgängig machbar. Bei Projektänderungen erneut importieren.', '比较各版本内容，为每个冲突选择版本，然后应用。应用操作可以撤销。若审阅期间项目有变化，请重新导入以刷新。'],
  editMode: ['Stop playback before applying a merge.', 'Vor der Zusammenführung die Wiedergabe stoppen.', '请先停止播放，再应用合并。'],
} as const
export function deliveryLabel19(key: keyof typeof copy): string { return copy[key][preferencesState.locale === 'de' ? 1 : preferencesState.locale === 'zh' ? 2 : 0] }
export function conflictValue19(value: unknown): string { return value === undefined ? deliveryLabel19('missing') : JSON.stringify(value, null, 2) }
