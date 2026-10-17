/** 编辑器布局共用文案：同一键在英文、德文和中文中保持相同操作含义，不写入项目内容。 */
export const studioLayoutCopy = {
  en: {
    resolveDraftConflict:'Review the saved-asset conflict before saving this draft.',resizePalette:'Resize node palette',resizeDetails:'Resize details',resizeExplorer:'Resize script explorer',resizeInspector:'Resize script inspector',
    focusCanvas:'Maximize canvas',restorePanels:'Restore panels',focusCode:'Maximize code',commands:'More commands',compactNodes:'Compact nodes',compactToolbar:'Compact toolbar',scriptDetails:'Script details',
    routingRunning:'Calculating wire routes… Dashed previews are provisional.',arrangeAll:'Arrange all nodes',pinSelected:'Pin selected positions',unpinSelected:'Unpin selected positions',arrangeIncludingPinned:'Rearrange including pinned nodes',pinnedPosition:'Position pinned',arrangeSelected:'Arrange selected nodes',cancelLayout:'Cancel layout',layoutRunning:'Arranging nodes…',
    layoutChanged:'The graph changed during arrangement. Run Arrange again.',layoutCancelled:'Arrangement cancelled.',
    findSymbol:'Find a graph node or symbol…',nodeNavigation:'Graph nodes',pinConnect:'Connect pin',disconnect:'Disconnect selected wire',clearReroutes:'Reset wire route',
    wires:'Wires',routingPoint:'Routing point',addRoutingPoint:'Add routing point',removeRoutingPoint:'Remove routing point',selectWire:'Select a wire',wireSelected:'Wire selected',wireConnected:'Pins connected',wireMismatch:'These pins cannot connect. Choose a compatible input.',
    wireHelp:'Select an output, then an input to connect. Escape cancels. Select a wire to disconnect or add a routing point.',
    keyboardHelp:'Arrow keys move between nodes. Enter opens details. Tab reaches pins; Enter selects or connects a pin.',
  },
  de: {
    resolveDraftConflict:'Prüfen Sie den Dateikonflikt, bevor Sie diesen Entwurf speichern.',resizePalette:'Knotenpalette skalieren',resizeDetails:'Details skalieren',resizeExplorer:'Skriptübersicht skalieren',resizeInspector:'Skriptinspektor skalieren',
    focusCanvas:'Arbeitsfläche maximieren',restorePanels:'Bereiche wiederherstellen',focusCode:'Code maximieren',commands:'Weitere Befehle',compactNodes:'Kompakte Knoten',compactToolbar:'Kompakte Werkzeugleiste',scriptDetails:'Skriptdetails',
    routingRunning:'Verbindungswege werden berechnet… Gestrichelte Vorschauen sind vorläufig.',arrangeAll:'Alle Knoten anordnen',pinSelected:'Ausgewählte Positionen fixieren',unpinSelected:'Ausgewählte Positionen freigeben',arrangeIncludingPinned:'Auch fixierte Knoten neu anordnen',pinnedPosition:'Position fixiert',arrangeSelected:'Ausgewählte Knoten anordnen',cancelLayout:'Anordnung abbrechen',layoutRunning:'Knoten werden angeordnet…',
    layoutChanged:'Der Graph wurde während der Anordnung geändert. Starten Sie erneut.',layoutCancelled:'Anordnung abgebrochen.',
    findSymbol:'Knoten oder Symbol suchen…',nodeNavigation:'Graphknoten',pinConnect:'Anschluss verbinden',disconnect:'Ausgewählte Verbindung trennen',clearReroutes:'Verbindungsweg zurücksetzen',
    wires:'Verbindungen',routingPoint:'Wegpunkt',addRoutingPoint:'Wegpunkt hinzufügen',removeRoutingPoint:'Wegpunkt entfernen',selectWire:'Verbindung auswählen',wireSelected:'Verbindung ausgewählt',wireConnected:'Anschlüsse verbunden',wireMismatch:'Diese Anschlüsse passen nicht. Wählen Sie einen kompatiblen Eingang.',
    wireHelp:'Erst einen Ausgang, dann einen Eingang auswählen. Escape bricht ab. Verbindung zum Trennen oder Umleiten auswählen.',
    keyboardHelp:'Pfeiltasten wechseln Knoten. Enter öffnet Details. Tab erreicht Anschlüsse; Enter wählt oder verbindet sie.',
  },
  zh: {
    resolveDraftConflict:'请先处理已保存资源与草稿的冲突，再保存草稿。',resizePalette:'调整节点库宽度',resizeDetails:'调整详情大小',resizeExplorer:'调整脚本列表宽度',resizeInspector:'调整脚本检查器大小',
    focusCanvas:'最大化画布',restorePanels:'恢复面板',focusCode:'最大化代码',commands:'更多命令',compactNodes:'紧凑节点',compactToolbar:'紧凑工具栏',scriptDetails:'脚本详情',
    routingRunning:'正在计算连线路径… 虚线仅为临时预览。',arrangeAll:'整理所有节点',pinSelected:'固定选中节点位置',unpinSelected:'取消选中节点固定',arrangeIncludingPinned:'重新布局（含固定节点）',pinnedPosition:'位置已固定',arrangeSelected:'整理选中节点',cancelLayout:'取消整理',layoutRunning:'正在整理节点…',
    layoutChanged:'整理过程中图形已更改。请重新整理。',layoutCancelled:'已取消整理。',
    findSymbol:'查找图节点或符号…',nodeNavigation:'图节点',pinConnect:'连接端口',disconnect:'断开选中连线',clearReroutes:'重置连线路径',
    wires:'连线',routingPoint:'路径点',addRoutingPoint:'添加路径点',removeRoutingPoint:'移除路径点',selectWire:'选择连线',wireSelected:'已选择连线',wireConnected:'端口已连接',wireMismatch:'这些端口不兼容。请选择兼容的输入端口。',
    wireHelp:'先选择输出端口，再选择输入端口进行连接。按 Escape 取消。选择连线可断开或添加路径点。',
    keyboardHelp:'方向键切换节点，Enter 打开详情。Tab 移至端口，Enter 选择或连接端口。',
  },
} as const
