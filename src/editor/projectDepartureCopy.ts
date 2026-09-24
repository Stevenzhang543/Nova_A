/** 离开或替换项目时的多语言草稿确认文案。 */
import { preferencesState } from '../store/preferences'
const copy = {
  en: { title: 'Unsaved authoring drafts', message: 'Replacing this project will discard the drafts below. Cancel, then Continue current project to review and save them in their editors.', discard: 'Discard drafts and replace project', cancel: 'Cancel', stale: 'A draft changed while confirmation was open. Review it and try again.', restoreFailed: 'Some authoring drafts could not be restored after the failed project replacement.' },
  de: { title: 'Ungespeicherte Entwürfe', message: 'Beim Ersetzen dieses Projekts gehen die folgenden Entwürfe verloren. Abbrechen und das aktuelle Projekt fortsetzen, um sie im jeweiligen Editor zu prüfen und zu speichern.', discard: 'Entwürfe verwerfen und Projekt ersetzen', cancel: 'Abbrechen', stale: 'Ein Entwurf wurde während der Bestätigung geändert. Bitte prüfen und erneut versuchen.', restoreFailed: 'Einige Entwürfe konnten nach dem fehlgeschlagenen Projektwechsel nicht wiederhergestellt werden.' },
  zh: { title: '尚未保存的编辑草稿', message: '替换项目将放弃以下草稿。取消后点击“继续当前项目”，在对应编辑器中检查并保存。', discard: '放弃草稿并替换项目', cancel: '取消', stale: '确认期间草稿已发生更改，请检查后重试。', restoreFailed: '项目替换失败后，部分编辑草稿无法恢复。' }
} as const
/* 返回 copy[preferencesState.locale] 的当前值。 */ export function projectDepartureCopy() { return copy[preferencesState.locale] }
