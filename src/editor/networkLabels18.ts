import { preferencesState } from '../store/preferences'
const labels = {
  interestX: ['Interest X', 'Interessenmittelpunkt X', '关注中心 X'],
  interestY: ['Interest Y', 'Interessenmittelpunkt Y', '关注中心 Y'],
  reconnect: ['Reconnect', 'Erneut verbinden', '重新连接'],
  reconnectEdited: ['Connection settings changed. Reconnect to apply the new session contract.', 'Verbindungseinstellungen geändert. Erneut verbinden, um die neuen Sitzungsregeln anzuwenden.', '连接设置已更改。请重新连接以应用新的会话配置。'],
  identityHint: ['Changing the role, session identity, transport, authentication or channel identity stops the current connection. Reconnect after editing; Undo restores the authored settings.', 'Änderungen an Rolle, Sitzungskennung, Transport, Authentifizierung oder Kanalkennung beenden die Verbindung. Danach erneut verbinden; Rückgängig stellt die bearbeiteten Einstellungen wieder her.', '更改角色、会话标识、传输、身份验证或通道标识会停止当前连接。编辑后请重新连接；撤销可恢复编辑设置。'],
  roleClient: ['Client: receives server state and sends input for explicitly owned objects. An unassigned object does not grant ownership.', 'Client: empfängt Serverzustand und sendet Eingaben für ausdrücklich zugewiesene Objekte. Ein nicht zugewiesenes Objekt erteilt keine Besitzrechte.', '客户端：接收服务器状态，并为明确分配给自己的对象发送输入。未分配的对象不会自动授予控制权。'],
  roleHost: ['Host: plays locally and provides authority for the session. Assign player ownership explicitly and verify both peers.', 'Host: spielt lokal und verwaltet die Sitzungshoheit. Spielerbesitz ausdrücklich zuweisen und beide Teilnehmer prüfen.', '主机：在本地游玩的同时管理会话权威。请明确分配玩家对象的控制权，并检查双方状态。'],
  roleServer: ['Server: provides authority without a local player. The current server export runs a fixed update loop in a renderer-disabled WebView.', 'Server: verwaltet die Sitzung ohne lokalen Spieler. Der aktuelle Serverexport nutzt feste Aktualisierungsschritte in einer WebView mit deaktivierter Darstellung.', '服务器：不作为本地玩家，负责会话权威。当前服务器导出在关闭渲染的 WebView 中运行固定更新循环。'],
  rollbackTitle: ['Correction and replay scope', 'Umfang von Korrektur und Wiedergabe', '校正与回放范围'],
  rollbackHint: ['Prediction correction reapplies recorded transform and velocity deltas. Physics constraints, Rhai variables, timers, audio, UI, files and external side effects are not rewound. Full simulation rollback is not available.', 'Vorhersagekorrektur wendet aufgezeichnete Transformations- und Geschwindigkeitsdifferenzen erneut an. Physikbedingungen, Rhai-Variablen, Timer, Audio, UI, Dateien und externe Seiteneffekte werden nicht zurückgesetzt. Vollständiges Simulations-Rollback ist nicht verfügbar.', '预测校正重新应用记录的变换与速度差值。物理约束、Rhai 变量、计时器、音频、界面、文件和外部副作用不会回退。目前不提供完整模拟回滚。'],
  restoreHint: ['Restoring a session save changes its recorded entity state. During a live connection, network time and unacknowledged reliable traffic are preserved.', 'Eine Sitzungswiederherstellung ändert den aufgezeichneten Objektzustand. Bei aktiver Verbindung bleiben Netzwerkzeit und noch unbestätigte zuverlässige Nachrichten erhalten.', '恢复会话存档会更改其中记录的实体状态。连接期间会保留网络时钟和尚未确认的可靠消息。'],
  instanceScope: ['These Logs show events observed by this editor for the selected instance; Inspector shows process identity and status. Inspect gameplay state in the running player. Raw process output is not collected here.', 'Diese Protokolle zeigen vom Editor beobachtete Ereignisse der gewählten Instanz; der Inspektor zeigt Prozesskennung und Status. Spielzustand im laufenden Player prüfen. Rohe Prozessausgabe wird hier nicht erfasst.', '这里的日志显示编辑器观察到的所选实例事件；检查器显示进程标识和状态。请在运行中的播放器检查游戏状态；此处不收集进程原始输出。'],
  bounds: ['Enter a finite value within the displayed range and step. The saved value has been restored.', 'Einen endlichen Wert innerhalb des angezeigten Bereichs und Schritts eingeben. Der gespeicherte Wert wurde wiederhergestellt.', '请输入符合所示范围与步长的有限数值。已恢复保存的值。'],
  name: ['Name', 'Name', '名称'],
  delivery: ['Delivery', 'Zustellung', '传递方式'],
  direction: ['Direction', 'Richtung', '方向'],
  schema: ['Payload type', 'Nutzdatentyp', '载荷类型'],
  remove: ['Remove', 'Entfernen', '移除'],
  ownerId: ['Authored owner peer ID', 'Bearbeitete Besitzerkennung', '编辑的所有者对端标识'],
  pageEntities: ['Entities in the latest snapshot page', 'Objekte in der letzten Snapshot-Seite', '最新快照页中的实体数'],
  deferredEntities: ['Entities for later pages', 'Objekte für spätere Seiten', '等待后续页面的实体数'],
  pagesHint: ['Large replication sets rotate through bounded pages at the configured snapshot cadence. Each entity may update less often than the packet rate. These counts describe the latest target peer.', 'Große Replikationsmengen wechseln im eingestellten Snapshot-Takt durch begrenzte Seiten. Einzelne Objekte können seltener als die Paketrate aktualisiert werden. Die Zähler beziehen sich auf den letzten Zielteilnehmer.', '大量复制实体按配置的快照频率轮流分批发送。每个实体的更新频率可能低于数据包频率。这些计数对应最近的目标对端。'],
  technicalDetails: ['Technical details', 'Technische Details', '技术详情'],
  failure: ['The connection needs attention. Check the selected transport, peer and settings, then reconnect.', 'Die Verbindung erfordert eine Prüfung. Transport, Teilnehmer und Einstellungen prüfen, dann erneut verbinden.', '连接需要检查。请检查所选传输、对端与设置，然后重新连接。'],
  baselineFailure: ['The initial state could not be accepted. Check matching projects and replication settings, then reconnect.', 'Der Anfangszustand konnte nicht übernommen werden. Übereinstimmende Projekte und Replikationseinstellungen prüfen, dann erneut verbinden.', '无法接受初始状态。请检查双方项目与复制设置是否匹配，然后重新连接。'],
  reliableFailure: ['A peer did not acknowledge reliable traffic. Check packet loss and retry limits, then reconnect that peer.', 'Ein Teilnehmer hat zuverlässige Nachrichten nicht bestätigt. Paketverlust und Wiederholungsgrenzen prüfen, dann diesen Teilnehmer erneut verbinden.', '对端未确认可靠消息。请检查丢包与重试限制，然后重新连接该对端。'],
  epochFailure: ['Traffic from an old or changed connection was rejected. Reconnect through the normal session handshake.', 'Nachrichten einer alten oder geänderten Verbindung wurden abgewiesen. Über den normalen Sitzungsaufbau erneut verbinden.', '已拒绝来自旧连接或已变更连接的消息。请通过正常会话握手重新连接。']
} as const
export type NetworkLabel18 = keyof typeof labels
export function networkLabel18(key: NetworkLabel18): string { return labels[key][preferencesState.locale === 'de' ? 1 : preferencesState.locale === 'zh' ? 2 : 0] }
export function networkFailure18(message: string): string {
  return networkLabel18(/baseline|resync/i.test(message) ? 'baselineFailure' : /reliable|acknowledg/i.test(message) ? 'reliableFailure' : /epoch|replay protection/i.test(message) ? 'epochFailure' : 'failure')
}
