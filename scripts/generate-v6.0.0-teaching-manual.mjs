import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const engineVersion = process.argv.find(argument => argument.startsWith('--engine-version='))?.split('=')[1] || '6.0.0'
const server = await createServer({ root, server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
async function writeReliable(path, value) {
  let lastError
  for (let attempt = 0; attempt < 5; attempt++) {
    try { await writeFile(path, value, 'utf8'); return }
    catch (error) { lastError = error; await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1))) }
  }
  throw lastError
}
const labels = {
  en: { heading: 'Nova_A 6.0 task-oriented teaching manual', intro: 'Learn by completing real work. Every public feature below states ownership, persistence, recovery, accessibility and release behavior.', class: 'Classification', purpose: 'Purpose and when to use it', pre: 'Preconditions', steps: 'Exact workflow', result: 'Expected result', persist: 'Persistence and export', undo: 'Undo and recovery', mistakes: 'Common mistakes and fixes', a11y: 'Keyboard and accessibility', minimal: 'Minimal example', production: 'Production example', rhai: 'Rhai API', graph: 'Visual Graph API', guided: 'Complete guided projects' },
  de: { heading: 'Nova_A 6.0 aufgabenorientiertes Lehrhandbuch', intro: 'Lernen durch echte Aufgaben. Jede öffentliche Funktion erklärt Zuständigkeit, Speicherung, Wiederherstellung, Barrierefreiheit und Release-Verhalten.', class: 'Klassifikation', purpose: 'Zweck und Einsatz', pre: 'Voraussetzungen', steps: 'Exakter Ablauf', result: 'Erwartetes Ergebnis', persist: 'Speicherung und Export', undo: 'Rückgängig und Wiederherstellung', mistakes: 'Häufige Fehler und Lösungen', a11y: 'Tastatur und Barrierefreiheit', minimal: 'Minimales Beispiel', production: 'Produktionsbeispiel', rhai: 'Rhai-API', graph: 'Visual-Graph-API', guided: 'Vollständige geführte Projekte' },
  'zh-CN': { heading: 'Nova_A 6.0 任务式教学手册', intro: '通过完成真实任务学习。以下每个公开功能均说明归属、持久化、恢复、无障碍和发布行为。', class: '分类', purpose: '用途和使用时机', pre: '前提条件', steps: '准确操作流程', result: '预期结果', persist: '持久化和导出', undo: '撤销和恢复', mistakes: '常见错误和修复', a11y: '键盘和无障碍', minimal: '最小示例', production: '生产示例', rhai: 'Rhai API', graph: '可视化图 API', guided: '完整引导项目' }
}
for (const copy of Object.values(labels)) copy.heading = copy.heading.replace('6.0', engineVersion)
const v65 = {
  en: { title: 'Exact compound physics and renderer quality', intro: 'Use this release workflow when one body needs multiple collision pieces or a camera region needs a different quality budget.', steps: [
    'Select a body, open Inspector → Physics → Collider children, and add Box/Circle/Convex children. Set each child sensor, layer, mask and one-way policy; the primary collider is child 0.',
    'For terrain, use a Chain or simple Concave polygon only on Static/Kinematic bodies. If Project Health blocks a dynamic concave body, replace it with convex children instead of ignoring the error.',
    'Enable physics debug and confirm every child, contact, anchor and rope segment matches the rendered world. One grid unit must equal one Inspector unit and one physics meter.',
    'For Rope2D, choose both owners, tune stretch/bend/break values, and enable world collision. The rope ignores both owners but collides with eligible third-party children and transfers force through its anchors.',
    'Open Rendering → Quality volumes, add a camera box and priority, choose a preset/overrides, then inspect Rendering → Diagnostics while moving the camera inside and outside the box.'
  ], recovery: 'Malformed/self-intersecting paths and unsafe dynamic concavity fail closed. Repair the points or use convex children. Shader fallback/context recovery counters identify the affected renderer path without deleting an effect.' },
  de: { title: 'Exakte Compound-Physik und Renderer-Qualität', intro: 'Dieser Ablauf gilt für Körper mit mehreren Collider-Teilen und Kamerabereiche mit eigenem Qualitätsbudget.', steps: [
    'Körper wählen, Inspector → Physik → Collider-Kinder öffnen und Box/Kreis/konvexe Kinder anlegen. Sensor, Ebene, Maske und Einwegregel gelten pro Kind; der primäre Collider ist Kind 0.',
    'Chain oder einfache konkave Polygone nur für statische/kinematische Körper verwenden. Einen blockierten dynamischen konkaven Körper in konvexe Kinder zerlegen.',
    'Physik-Debug aktivieren und prüfen, dass Kinder, Kontakte, Anker und Seilsegmente die gerenderte Welt treffen. Eine Rastereinheit entspricht einer Inspector-Einheit und einem Meter.',
    'Bei Rope2D beide Besitzer wählen, Dehnung/Biegung/Bruch einstellen und Weltkollision aktivieren. Das Seil ignoriert seine Besitzer, kollidiert aber mit geeigneten Drittkörper-Kindern.',
    'Rendering → Qualitätsvolumen öffnen, Kamerabox/Priorität und Preset festlegen; in Diagnose die Kamera hinein und hinaus bewegen.'
  ], recovery: 'Fehlerhafte oder sich schneidende Pfade und dynamische Konkavität werden sicher blockiert. Punkte reparieren oder konvexe Kinder nutzen; Shader-/Kontextzähler nennen den Wiederherstellungspfad.' },
  'zh-CN': { title: '精确组合体物理与渲染质量', intro: '当一个刚体需要多个碰撞片段，或相机区域需要独立质量预算时，使用本流程。', steps: [
    '选择物体，打开“检查器 → 物理 → 子碰撞器”，添加矩形、圆形或凸多边形；分别设置传感器、层、掩码和单向策略，主碰撞器的子 ID 为 0。',
    'Chain 或简单 Concave 只用于静态／运动学刚体；若“项目健康”阻止动态凹多边形，请改用多个凸子碰撞器。',
    '启用物理调试，确认每个子形状、接触点、锚点和绳段与画面一致；一格必须等于检查器的一单位和物理一米。',
    'Rope2D 选择两个所属物体，设置拉伸、弯曲和断裂并启用世界碰撞；绳索忽略两个所属物体，但与符合策略的第三方子碰撞器交互。',
    '打开“渲染 → 质量区域”，添加相机方框、优先级和预设／覆盖；移动相机进出区域并查看诊断计数。'
  ], recovery: '畸形／自交路径和不安全动态凹形会安全阻止；修复顶点或改用凸子形状。着色器回退与上下文恢复计数会指出故障路径，且不会删除特效。' }
}
const v66 = {
  en: { title: 'Production multiplayer workflow', intro: 'Use this workflow to host, join, inspect, export, and recover a bounded local-first multiplayer game without enabling any implicit cloud service.', steps: [
    'Install the reviewed Nova Networking package, open Network Studio → Session, enable networking, grant the explicit project permission, choose Local lobby for same-device testing, and set a unique session name.',
    'Define reliable event/RPC channels and sequenced state/input channels in Protocol. Keep packet, payload, message-rate, reliable-window, replay-age, and replay-window bounds enabled; never place passwords, tokens, keys, or cookies in payloads.',
    'In Replication, add each gameplay object, choose Server or Owner authority, properties, interpolation/prediction, scene, and relevance radius. In Orchestration, enable authority transfer, interest management, and scene handoff only when the game design needs them.',
    'Press Host local lobby or Discover local lobbies for an explicit same-device session. For a built Windows game, choose 2–8 instances and use Build and launch; the exported project must already contain permission and auto-start settings.',
    'Use Ownership, replication diffs, rollback timeline, packet/channel counters, and network simulation to reproduce latency/loss/reorder/duplicate behavior. Stop, revoke permission, reconnect, late-join, save/reload, and confirm offline Play remains unchanged.',
    'For direct Internet transport, use WSS or a reviewed encrypted adapter and a reviewed authentication provider. Nova_A does not supply credentials, NAT traversal, relay hosting, certificates, or a mandatory cloud account.'
  ], recovery: 'A missing package, denied permission, unregistered adapter/provider, insecure required transport, malformed/version-mismatched packet, stale peer, or oversized/rate-limited payload fails visibly. Restore the reviewed dependency or bounded configuration; timed-out ownership returns to host/server authority.' },
  de: { title: 'Produktiver Mehrspieler-Ablauf', intro: 'Dieser Ablauf hostet, verbindet, untersucht, exportiert und repariert ein begrenztes lokal-zuerst Mehrspielerspiel ohne impliziten Cloud-Dienst.', steps: [
    'Geprüftes Nova-Networking-Paket installieren, Network Studio → Sitzung öffnen, Networking und ausdrückliche Projektberechtigung aktivieren, lokale Lobby wählen und einen eindeutigen Sitzungsnamen setzen.',
    'Zuverlässige Ereignis/RPC-Kanäle und sequenzierte Zustands/Eingabekanäle definieren. Paket-, Nutzlast-, Raten-, Reliable-, Replay-Alter- und Replay-Fenstergrenzen beibehalten; keine Geheimnisse in Nutzlasten speichern.',
    'In Replikation Objekte mit Server/Owner-Autorität, Eigenschaften, Interpolation/Prediction, Szene und Relevanzradius hinzufügen. Autoritätswechsel, Interest und Szenenübergabe nur bei Bedarf aktivieren.',
    'Lokale Lobby hosten/finden. Für ein gebautes Windows-Spiel 2–8 Instanzen wählen und Bauen und starten verwenden; Berechtigung und Autostart müssen bereits im Projekt gespeichert sein.',
    'Besitz, Replikationsdifferenz, Rollback-Zeitleiste, Kanalzähler und Netzwerksimulation für Latenz, Verlust, Reihenfolge und Duplikate prüfen. Stoppen, Berechtigung entziehen, neu verbinden, spät beitreten und speichern/laden.',
    'Für direkten Internettransport WSS oder einen geprüften verschlüsselten Adapter sowie einen geprüften Authentifizierungsanbieter verwenden. Nova_A liefert keine Anmeldedaten, NAT/Relay-Cloud oder Zertifikate.'
  ], recovery: 'Fehlendes Paket, verweigerte Berechtigung, unbekannter Adapter/Anbieter, unsicherer Pflichttransport, fehlerhafte Version/Nutzlast, veralteter Peer und Ratenüberschreitung werden sichtbar blockiert. Besitz eines getrennten Peers fällt an Host/Server zurück.' },
  'zh-CN': { title: '生产级多人游戏流程', intro: '本流程用于在不启用任何隐式云服务的前提下，创建、加入、检查、导出和恢复有边界的本地优先多人游戏。', steps: [
    '安装已审核的 Nova Networking 软件包，打开“网络工作室 → 会话”，启用网络并明确授予项目权限；同设备测试请选择“本地大厅”，并设置唯一会话名。',
    '在“协议”中创建可靠事件／RPC 通道和有序状态／输入通道。保留数据包、载荷、消息速率、可靠窗口、重放时限与重放窗口上限；不得把密码、令牌、密钥或 Cookie 放入载荷。',
    '在“复制”中添加游戏对象，配置服务器／所有者权威、属性、插值／预测、场景和相关性半径；仅在玩法需要时启用权威转移、兴趣管理和场景交接。',
    '点击“创建本地大厅”或“发现本地大厅”进行显式同设备连接。要测试已构建的 Windows 游戏，选择 2–8 个实例并点击“构建并启动”；项目必须预先保存权限和自动启动设置。',
    '使用所有权、复制差异、回滚时间线、数据包／通道计数和网络模拟复现延迟、丢包、乱序与重复。测试停止、撤销权限、重连、后加入、保存／重载，并确认离线运行不受影响。',
    '直接互联网传输应使用 WSS 或已审核的加密适配器，以及已审核的身份验证提供器。Nova_A 不提供凭据、NAT 穿透、云中继、证书或强制云账户。'
  ], recovery: '软件包缺失、权限拒绝、适配器／提供器未注册、强制加密不满足、数据包畸形／版本错误、节点超时、载荷越界或限速都会明确失败。修复依赖或配置；断线节点的所有权会返回主机／服务器。' }
}

const v67 = {
  en: { title: 'Touch, gamepad, mobile delivery, and accessibility workflow', intro: 'Build one no-code game that remains controllable and understandable across desktop, touch, controller, safe-area, and assistive-technology paths.', steps: [
    'Open Settings → Devices & mobile input. In Preview choose Mobile portrait/landscape, rotate it, and inspect the safe-area and 44 × 44 target overlays before placing controls.',
    'Enable virtual controls, add a Stick/D-pad for a vector or axis action and a Button for a button action, choose anchors/offsets/size/opacity/haptic duration, then Play. These controls feed the same Input Map actions as keyboard and gamepad; they are not a second gameplay system.',
    'In Gamepad capture a binding, then add per-device or wildcard axis calibration with minimum, center, maximum, dead zone, and inversion. Record/replay the Input Map and save/reload to prove persistence. Sensors stay disabled until enabled and their permission button is clicked.',
    'Open Presentation → Accessibility. Use keyboard and gamepad traversal, inspect role/name/state/value/live metadata, export the semantic snapshot, and test high contrast, reduced motion, RTL, EN/DE/ZH, and text/caption scale at 200%, 300%, and 400%.',
    'For Android, enable the optional verified package and open Build → Platform → Android delivery. Discover JDK 17, SDK/API 35, build-tools, NDK, adb, and the validated template; select only justified permissions and supply purposes for runtime-sensitive permissions.',
    'Build an APK only when discovery is ready. Debug/local signing needs no serialized secret; manual release signing uses a keystore path and environment-only passwords/alias. Refresh devices, install the selected APK, and capture bounded logcat only with separate explicit clicks. iOS remains matching-host/deferred.'
  ], recovery: 'Synthetic mouse events after touch are deduplicated; cancel/blur releases controls. Invalid calibration, permissions, identifiers, paths, APKs, serials, missing toolchains, and failed Gradle output fail visibly. No credential, automatic install, automatic log collection, or unsupported iOS claim is stored.' },
  de: { title: 'Touch-, Gamepad-, Mobile- und Barrierefreiheits-Ablauf', intro: 'Ein codefreies Spiel bleibt über Desktop, Touch, Controller, sicheren Bereich und assistive Technik steuerbar.', steps: [
    'Einstellungen → Geräte & mobile Eingabe öffnen. Mobile Hoch-/Querformat wählen, drehen und sicheren Bereich sowie 44 × 44-Ziel prüfen.',
    'Virtuelle Steuerung aktivieren: Stick/Steuerkreuz einer Vektor-/Achsenaktion und Taste einer Button-Aktion zuordnen; Anker, Versatz, Größe, Deckkraft und Haptik setzen. Alle speisen dieselbe Input Map.',
    'Im Gamepad eine Belegung erfassen und Achsenminimum, Mitte, Maximum, Totzone sowie Umkehrung kalibrieren. Aufzeichnen/Wiedergeben und Speichern/Laden prüfen. Sensoren benötigen Aktivierung und ausdrückliche Berechtigungsanfrage.',
    'Präsentation → Barrierefreiheit öffnen. Mit Tastatur/Gamepad traversieren, Rolle/Name/Zustand/Wert/Live-Daten prüfen, semantischen Snapshot exportieren und Kontrast, reduzierte Bewegung, RTL, EN/DE/ZH sowie 200–400 % Text testen.',
    'Für Android das optionale geprüfte Paket aktivieren. JDK 17, SDK/API 35, Build-Tools, NDK, adb und Vorlage erkennen; nur begründete Berechtigungen auswählen und sensible Zwecke angeben.',
    'APK nur bei bereitem Toolchain-Status bauen. Release-Passwörter/Alias bleiben in Umgebungsvariablen. Geräteaktualisierung, Installation und Logcat erfordern getrennte Klicks; iOS bleibt Matching-Host/verschoben.'
  ], recovery: 'Synthetische Mausereignisse nach Touch werden entfernt und Abbruch/Fokusverlust löst Steuerungen. Ungültige Kalibrierung, Berechtigungen, IDs, Pfade, APKs, Seriennummern, Toolchains und Gradle-Ausgaben scheitern sichtbar; keine Geheimnisse oder impliziten Geräteaktionen.' },
  'zh-CN': { title: '触控、手柄、移动交付与无障碍流程', intro: '让一个无代码游戏在桌面、触控、手柄、安全区域和辅助技术下保持可控、可理解。', steps: [
    '打开“设置 → 设备与移动输入”。选择移动竖屏／横屏并旋转，先检查安全区域和 44 × 44 点击目标覆盖层。',
    '启用虚拟控制：将摇杆／方向键绑定到向量或轴动作，将按钮绑定到按钮动作；设置锚点、偏移、大小、不透明度和触觉时长。它们与键盘／手柄共用同一 Input Map。',
    '在“手柄”中捕获绑定，设置按设备或通用的最小值、中心、最大值、死区和反转。测试录制／回放、保存／重载。传感器必须先启用，再由用户点击请求权限。',
    '打开“呈现 → 无障碍”，用键盘／手柄遍历，检查角色、名称、状态、数值和实时区域并导出语义快照；测试高对比度、减少动态效果、RTL、英／德／中和 200–400% 文字。',
    'Android 需要先启用可选的已审核包，然后检测 JDK 17、SDK/API 35、Build Tools、NDK、adb 和已验证模板；只选必要权限，敏感权限必须写明用途。',
    '仅在工具链就绪时构建 APK。发布签名密码与别名只从环境变量读取。刷新设备、安装 APK、捕获有限 logcat 都必须分别点击；iOS 仍需匹配 macOS 主机，当前延期。'
  ], recovery: '触控后的合成鼠标事件会去重，取消／失焦会释放控件。非法校准、权限、标识符、路径、APK、序列号、缺失工具链和 Gradle 失败都会明确报告；不会保存凭据、自动安装、自动收集日志或虚假声明 iOS 支持。' }
}

const v68 = {
  en: { title: 'Large-world and low-end performance workflow', intro: 'Measure and tune a 10k–100k-object project while preserving exact fixed-step gameplay, authored effects, editor controls and exported behavior.', steps: [
    'Open Debug → Profiler → Trace. Record cold start, warm workspace switches, main-thread/worker/queue time, cache hit rate, allocations, worst frame, 1% low FPS and input-to-pixel latency before changing a budget.',
    'Keep adaptive presentation quality enabled for low-end testing, then set bounded background, streaming, command, metric-publication and spatial-cell budgets. Adaptive quality changes only pixel density and particle presentation capacity; it never changes physics, script, animation or authored values.',
    'Open the v6.8 large-world reference. Search Hierarchy and Assets, drag/select while navigation or streaming is pending, repeatedly change workspaces, and confirm lists stay virtualized and cancelled generations never apply.',
    'Use Jobs to test the worker path. Animation sampling, particle stepping and spatial-grid preparation must match the local fallback exactly; cancel or supersede a keyed job and confirm its stale result is rejected.',
    'Run the 10k, 50k and 100k fixtures. Compare checksums, deterministic query order, fixed-step output, 1% lows and memory trends. Save/reload, Play/Pause/Step and build the standalone player.',
    'If a target misses its frame budget, tune presentation and background budgets with evidence. Never hide a control, remove an animation/effect, lower fixed timestep or claim unmeasured hardware performance.'
  ], recovery: 'Cancel background work or restore defaults if interaction latency grows. Worker failure uses the bounded local implementation. Stale generations are discarded, streaming resumes in later frames, and project data stays authoritative.' },
  de: { title: 'Großwelt- und Low-End-Leistungsablauf', intro: 'Ein Projekt mit 10.000–100.000 Objekten messen und abstimmen, ohne Physik, Effekte, Bedienelemente oder Exportverhalten zu verändern.', steps: [
    'Debug → Profiler → Trace öffnen. Kalt-/Warmstart, Main-Thread, Worker, Queue, Cache, Allokationen, langsamsten Frame, 1%-Minimum und Eingabe-bis-Pixel vor Änderungen aufzeichnen.',
    'Adaptive Darstellungsqualität aktivieren und begrenzte Hintergrund-, Streaming-, Befehls-, Messwert- und Raumzellenbudgets setzen. Nur Pixeldichte/Partikelbudget ändern sich; Physik, Skripte, Animation und Autorendaten nicht.',
    'Das v6.8-Großweltprojekt öffnen. Hierarchie/Assets suchen, während Navigation/Streaming auswählen und ziehen, Arbeitsbereiche wechseln und Virtualisierung sowie Abbruch veralteter Ergebnisse prüfen.',
    'Unter Jobs Worker und lokalen Rückfall vergleichen. Animationssampling, Partikelschritt und Raumgitter müssen identisch sein; ersetzte Generationen werden verworfen.',
    '10k-, 50k- und 100k-Fixtures ausführen. Prüfsummen, deterministische Reihenfolge, Fixed-Step-Ausgabe, 1%-Minimum und Speichertrend vergleichen; speichern/laden und Player bauen.',
    'Bei Budgetüberschreitung nur nach Messung Präsentations- und Hintergrundbudgets ändern. Keine Bedienung/Effekte entfernen oder Fixed-Step senken.'
  ], recovery: 'Hintergrundarbeit abbrechen oder Standardwerte wiederherstellen. Worker-Fehler nutzen den begrenzten lokalen Pfad; veraltete Ergebnisse werden verworfen und Streaming später fortgesetzt.' },
  'zh-CN': { title: '大型世界与低端设备性能流程', intro: '在不改变固定步进玩法、创作特效、编辑器控制和导出行为的前提下，测量并调优 1 万至 10 万对象项目。', steps: [
    '打开“调试 → 分析器 → 帧追踪”。调整前先记录冷／热启动、主线程、工作线程、队列、缓存、分配、最慢帧、1% 低帧和输入到像素延迟。',
    '启用自适应显示质量，并设置有界后台、流式、命令、指标发布和空间单元预算。自适应只改变像素密度与粒子显示容量，不改变物理、脚本、动画或创作值。',
    '打开 v6.8 大型世界参考项目；在导航或流式任务运行时搜索层级／资源、拖动和选择对象、反复切换工作区，确认列表虚拟化且取消后的旧结果不会生效。',
    '在“任务”中测试工作线程。动画采样、粒子步进和空间网格必须与本地回退完全一致；取消或替换带键任务后，旧代结果必须被拒绝。',
    '运行 1 万、5 万和 10 万对象夹具；对比校验和、确定性查询顺序、固定步进输出、1% 低帧和内存趋势；保存／重载、播放／暂停／单步并构建独立播放器。',
    '若目标设备超出帧预算，只能依据证据调整显示和后台预算；不得隐藏控件、删除动画／特效、降低固定时间步或虚假声明未测硬件。'
  ], recovery: '若交互延迟升高，请取消后台任务或恢复默认值。工作线程失败会自动使用有界本地实现；旧代结果会丢弃，流式任务在后续帧继续，项目文档始终是权威数据。' }
}

const v70 = {
  en: { title: 'Nova_A 7 stable creator-platform workflow', intro: 'Use this release workflow to learn, migrate, verify and ship a complete project while keeping every stable contract and every external limitation visible.', steps: [
    'Open Manage → Learning Center → Platform readiness. Search for the feature you intend to use and inspect Binding, Validation, Undo, Persistence, Runtime/export, Documentation and Tests before authoring. A circle means the dimension does not apply; a dash means external evidence is still required.',
    'Start with a guided project or the creator-v700-stable-platform reference. Follow each lesson in order: prerequisites, exact workflow, expected result, save/reload, undo/recovery, Play/Step, standalone build and accessibility checks.',
    'When opening a 6.x project, review the migration preview before applying. Confirm the source/target engines, semantic diff, backup path and deterministic checksum. The 7.0 seal changes only the supported-engine ceiling to <8.0.0; it does not rewrite schema 29 gameplay data.',
    'For code or Visual Graph behavior, edit either representation, save, inspect the synchronized counterpart and run parity/tests. Unsupported Rhai remains in a lossless Code block. Review the API browser or docs/API_REFERENCE_7_0.md before relying on a runtime call.',
    'Run Project Health, template/reference checks and Build validation. Build Windows on Windows and Web locally. Treat Linux/macOS as matching-host, Android as toolchain-gated experimental and iOS/console as deferred; do not turn an unavailable target into a false pass.',
    'Exercise keyboard and pointer paths in English, German and Chinese at 100–200% UI scale, high contrast and reduced motion. Save, close, reopen, recover from one intentional invalid value, then inspect release evidence and the exact eleven artifacts.'
  ], recovery: 'Cancel a migration or restore its backup if the preview is unexpected. Undo document edits, use Recovery Browser after interrupted saves, disable a failing package/plugin, and keep the last valid build. Read docs/TROUBLESHOOTING_7_0.md for symptom-based recovery. Signing, clean-machine lifecycle, matching-host builds, independent observation and the real soak remain external until captured.' },
  de: { title: 'Nova_A 7: Ablauf der stabilen Creator-Plattform', intro: 'Mit diesem Ablauf ein vollständiges Projekt lernen, migrieren, prüfen und ausliefern, ohne stabile Verträge oder externe Grenzen zu verbergen.', steps: [
    'Verwalten → Lernzentrum → Plattformbereitschaft öffnen. Die gewünschte Funktion suchen und Bindung, Validierung, Rückgängig, Speicherung, Laufzeit/Export, Dokumentation und Tests prüfen. Kreis bedeutet nicht anwendbar; Strich bedeutet externe Evidenz.',
    'Mit einem geführten Projekt oder creator-v700-stable-platform beginnen. Voraussetzungen, exakte Schritte, Ergebnis, Speichern/Laden, Rückgängig/Wiederherstellung, Play/Step, Standalone-Build und Barrierefreiheit der Reihe nach prüfen.',
    'Beim Öffnen eines 6.x-Projekts zuerst die Migrationsvorschau lesen. Quell-/Zielversion, semantischen Diff, Backup und deterministische Prüfsumme prüfen. Der 7.0-Siegel ändert nur die Obergrenze auf <8.0.0 und keine Schema-29-Spieldaten.',
    'Rhai oder Visual Graph bearbeiten, speichern, die synchronisierte Gegenseite und Paritätstests prüfen. Nicht unterstütztes Rhai bleibt verlustfrei im Code-Block. Vor Runtime-Aufrufen API-Browser oder docs/API_REFERENCE_7_0.md verwenden.',
    'Projektzustand, Vorlagen/Referenzen und Build-Validierung ausführen. Windows unter Windows und Web lokal bauen. Linux/macOS benötigen Matching Host, Android ist experimentell/toolchain-gebunden, iOS/Konsolen sind verschoben.',
    'Tastatur und Zeiger auf Englisch, Deutsch und Chinesisch bei 100–200 %, hohem Kontrast und reduzierter Bewegung prüfen. Speichern, neu öffnen, einen absichtlich falschen Wert beheben und elf Release-Dateien kontrollieren.'
  ], recovery: 'Bei unerwarteter Vorschau abbrechen oder Backup wiederherstellen. Dokumentänderungen rückgängig machen, Recovery Browser nach unterbrochenem Speichern verwenden, fehlerhafte Pakete/Plugins deaktivieren und den letzten gültigen Build behalten. docs/TROUBLESHOOTING_7_0.md erklärt die Fehlerbehebung. Externe Nachweise bleiben offen.' },
  'zh-CN': { title: 'Nova_A 7 稳定创作平台流程', intro: '使用本流程学习、迁移、验证并发布完整项目，同时明确保留所有稳定契约和外部限制。', steps: [
    '打开“管理 → 学习中心 → 平台就绪情况”，搜索计划使用的功能，并检查绑定、验证、撤销、持久化、运行时／导出、文档和测试。圆圈代表不适用，短横线代表仍需外部证据。',
    '从引导项目或 creator-v700-stable-platform 参考开始，依次完成前提条件、准确步骤、预期结果、保存／重载、撤销／恢复、播放／单步、独立构建和无障碍检查。',
    '打开 6.x 项目时先查看迁移预览，核对源／目标引擎、语义差异、备份路径和确定性校验和。7.0 只把受支持引擎上限封存为 <8.0.0，不会重写 schema 29 玩法数据。',
    '编辑 Rhai 或可视化图中的任意一侧，保存后检查同步的另一侧并运行等价性测试。不支持的 Rhai 会无损保留在代码块中。使用运行时调用前请查阅 API 浏览器或 docs/API_REFERENCE_7_0.md。',
    '运行“项目健康”、模板／参考检查和构建验证。在 Windows 本机构建 Windows 与 Web；Linux／macOS 需要匹配主机，Android 为工具链门禁实验目标，iOS／主机平台仍延期，不能把不可用目标伪装为通过。',
    '在英／德／中、100–200% 界面缩放、高对比度和减少动态效果下测试键盘与指针。保存、关闭、重开，恢复一次故意输入的非法值，再检查证据和精确十一份发布文件。'
  ], recovery: '若预览不符合预期，请取消迁移或恢复备份；文档编辑使用撤销，中断保存使用恢复浏览器，故障包／插件应停用，并保留最后一次有效构建。按症状恢复请查 docs/TROUBLESHOOTING_7_0.md。签名、干净机器生命周期、匹配主机构建、独立观察和真实长测在取得证据前仍属于外部工作。' }
}

function replaceMarked(source, start, end, contents) {
  const expression = new RegExp(`${start}[\\s\\S]*?${end}`, 'm')
  const block = `${start}\n${contents}\n${end}`
  return expression.test(source) ? source.replace(expression, block) : `${source.trimEnd()}\n\n${block}\n`
}

function markdownFor(locale, guides, localizedLearningGuide) {
  const l = labels[locale], appLocale = locale === 'zh-CN' ? 'zh' : locale, grouped = Map.groupBy(guides, guide => guide.panel)
  const lines = [`# ${l.heading}`, '', l.intro, '', `- Engine: **${engineVersion}**`, '- Stable contracts: Project Format 2/schema 29; Rhai API 2; Graph Format 1; Plugin API 2; Package Manifest 1; Build CLI 1; workspace document 3.', '- External signing, independent clean-machine evidence, two-machine reproduction, matching-host builds and a real 72-hour soak remain pending until independently captured.', '', `## ${l.guided}`, '']
  for (const guide of guides.filter(guide => guide.taskProject)) lines.push(`- [${localizedLearningGuide(guide, appLocale).title}](#${guide.id})`)
  for (const [panel, panelGuides] of grouped) {
    lines.push('', `## ${panel}`, '')
    for (const guide of panelGuides) {
      const text = localizedLearningGuide(guide, appLocale)
      lines.push(`<a id="${guide.id}"></a>`, '', `### ${text.title}`, '', `**${l.class}:** ${guide.classifications.join(' · ')}`, '', `**${l.purpose}:** ${text.purpose} ${text.whenToUse}`, '', `**${l.pre}:**`, '', ...text.prerequisites.map(item => `- ${item}`), '', `**${l.steps}:**`, '', ...text.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.result}:** ${text.expectedResult}`, '', `**${l.persist}:** ${text.persistence}`, '', `**${l.undo}:** ${text.undoRecovery}`, '', `**${l.mistakes}:**`, '', ...text.mistakes.map(item => `- ${item}`), '', `**${l.a11y}:** ${text.accessibility}`, '', `**${l.minimal}:** ${text.minimalExample}`, '', `**${l.production}:** ${text.productionExample}`, '', `**${l.rhai}:** ${text.relatedRhai.length ? text.relatedRhai.map(value => `\`${value}\``).join(', ') : 'N/A'}`, '', `**${l.graph}:** ${text.relatedGraph.length ? text.relatedGraph.map(value => `\`${value}\``).join(', ') : 'N/A'}`, '')
    }
  }
  if (engineVersion === '6.5.0') {
    const lesson = v65[locale]
    lines.push('', `## ${lesson.title}`, '', lesson.intro, '', ...lesson.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.undo}:** ${lesson.recovery}`, '')
  }
  if (engineVersion === '6.6.0') {
    const lesson = v66[locale]
    lines.push('', `## ${lesson.title}`, '', lesson.intro, '', ...lesson.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.undo}:** ${lesson.recovery}`, '')
  }
  if (engineVersion === '6.7.0') {
    const lesson = v67[locale]
    lines.push('', `## ${lesson.title}`, '', lesson.intro, '', ...lesson.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.undo}:** ${lesson.recovery}`, '')
  }
  if (engineVersion === '6.8.0') {
    const lesson = v68[locale]
    lines.push('', `## ${lesson.title}`, '', lesson.intro, '', ...lesson.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.undo}:** ${lesson.recovery}`, '')
  }
  if (engineVersion === '7.0.0') {
    const lesson = v70[locale]
    lines.push('', '<a id="v70-stable-platform"></a>', '', `## ${lesson.title}`, '', lesson.intro, '', ...lesson.steps.map((step, index) => `${index + 1}. ${step}`), '', `**${l.undo}:** ${lesson.recovery}`, '')
  }
  return lines.join('\n')
}

function htmlFor(locale, guides, localizedLearningGuide) {
  const l = labels[locale], appLocale = locale === 'zh-CN' ? 'zh' : locale, grouped = Map.groupBy(guides, guide => guide.panel)
  const toc = guides.filter(guide => guide.taskProject).map(guide => `<a href="#${locale}-v6-${guide.id}">${escapeHtml(localizedLearningGuide(guide, appLocale).title)}</a>`).join('')
  const panels = [...grouped].map(([panel, panelGuides]) => `<section class="v6-panel"><h2>${escapeHtml(panel)}</h2>${panelGuides.map(guide => {
    const text = localizedLearningGuide(guide, appLocale)
    const list = values => `<ul>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ul>`
    const ordered = values => `<ol>${values.map(value => `<li>${escapeHtml(value)}</li>`).join('')}</ol>`
    return `<details id="${locale}-v6-${guide.id}" class="v6-guide"${guide.taskProject ? ' open' : ''}><summary><strong>${escapeHtml(text.title)}</strong><span>${escapeHtml(guide.classifications.join(' · '))}</span></summary><div><h3>${escapeHtml(l.purpose)}</h3><p>${escapeHtml(text.purpose)} ${escapeHtml(text.whenToUse)}</p><h3>${escapeHtml(l.pre)}</h3>${list(text.prerequisites)}<h3>${escapeHtml(l.steps)}</h3>${ordered(text.steps)}<h3>${escapeHtml(l.result)}</h3><p>${escapeHtml(text.expectedResult)}</p><h3>${escapeHtml(l.persist)}</h3><p>${escapeHtml(text.persistence)}</p><h3>${escapeHtml(l.undo)}</h3><p>${escapeHtml(text.undoRecovery)}</p><h3>${escapeHtml(l.mistakes)}</h3>${list(text.mistakes)}<h3>${escapeHtml(l.a11y)}</h3><p>${escapeHtml(text.accessibility)}</p><h3>${escapeHtml(l.minimal)}</h3><p>${escapeHtml(text.minimalExample)}</p><h3>${escapeHtml(l.production)}</h3><p>${escapeHtml(text.productionExample)}</p><h3>${escapeHtml(l.rhai)} / ${escapeHtml(l.graph)}</h3><p><code>${escapeHtml(text.relatedRhai.join(', ') || 'N/A')}</code> · <code>${escapeHtml(text.relatedGraph.join(', ') || 'N/A')}</code></p></div></details>`
  }).join('')}</section>`).join('')
  const lesson = engineVersion === '6.5.0' ? { id: 'v65-physics-renderer', ...v65[locale] } : engineVersion === '6.6.0' ? { id: 'v66-multiplayer', ...v66[locale] } : engineVersion === '6.7.0' ? { id: 'v67-device-mobile-accessibility', ...v67[locale] } : engineVersion === '6.8.0' ? { id: 'v68-large-world-performance', ...v68[locale] } : engineVersion === '7.0.0' ? { id: 'v70-stable-platform', ...v70[locale] } : null
  const release = lesson ? `<section class="v6-panel" id="${locale}-${lesson.id}"><h2>${escapeHtml(lesson.title)}</h2><p>${escapeHtml(lesson.intro)}</p><ol>${lesson.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}</ol><h3>${escapeHtml(l.undo)}</h3><p>${escapeHtml(lesson.recovery)}</p></section>` : ''
  return `<article data-lang="${locale}"${locale === 'en' ? '' : ' hidden'} class="v6-teaching"><section id="${locale}-v60"><div class="hero"><span class="eyebrow">Nova_A ${engineVersion} · Project Format 2/schema 29 · external certification honestly pending</span><h1>${escapeHtml(l.heading)}</h1><p>${escapeHtml(l.intro)}</p><div class="links">${toc}</div></div>${release}${panels}</section></article>`
}

try {
  const { CREATOR_LEARNING_GUIDES, localizedLearningGuide } = await server.ssrLoadModule('/src/runtime/creatorLearning.ts')
  for (const [locale, filename] of [['en', 'MANUAL.en.md'], ['de', 'MANUAL.de.md'], ['zh-CN', 'MANUAL.zh-CN.md']]) {
    const path = join(root, 'manual', filename), source = await readFile(path, 'utf8')
    const titles = { en: `# Nova_A ${engineVersion} Complete Manual`, de: `# Nova_A ${engineVersion} – Vollständiges Handbuch`, 'zh-CN': `# Nova_A ${engineVersion} 完整使用手册` }
    const updated = replaceMarked(source, '<!-- NOVA_V6_TEACHING_START -->', '<!-- NOVA_V6_TEACHING_END -->', markdownFor(locale, CREATOR_LEARNING_GUIDES, localizedLearningGuide)).replace(/^# Nova_A[^\r\n]*$/m, titles[locale])
    await writeReliable(path, updated)
  }
  const htmlPath = join(root, 'manual/index.html'), original = await readFile(htmlPath, 'utf8')
  let html = original
    .replace(/<title>Nova_A \d+\.\d+\.\d+ Manual<\/title>/, `<title>Nova_A ${engineVersion} Manual</title>`)
    .replace(/(<strong>Nova_A<\/strong><span>) \d+\.\d+\.\d+ Offline Teaching Manual(<\/span>)/, `$1 ${engineVersion} Offline Teaching Manual$2`)
    .replace(/Engine \d+\.\d+\.\d+ ·/g, `Engine ${engineVersion} ·`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="Complete Nova_A ${engineVersion} English, German and Chinese teaching manual for every editor, runtime, migration, recovery and release workflow.">`)
    .replace(/<footer>Nova_A \d+\.\d+\.\d+ · Whitelist · Open-source 2D game engine<\/footer>/, `<footer>Nova_A ${engineVersion} · Whitelist · Open-source 2D game engine</footer>`)
    .replaceAll('Nova_A 5.9 Manual', `Nova_A ${engineVersion} Manual`).replaceAll('Nova_A 6.0 Manual', `Nova_A ${engineVersion} Manual`).replaceAll('5.9.0 Offline Documentation', `${engineVersion} Offline Teaching Manual`).replaceAll('6.0.0 Offline Teaching Manual', `${engineVersion} Offline Teaching Manual`).replaceAll('Engine 5.9.0', `Engine ${engineVersion}`).replaceAll('Engine 6.0.0', `Engine ${engineVersion}`)
  const supplement = `<!-- NOVA_V6_TEACHING_START -->\n<div class="release-supplement v6-manual" aria-label="Nova_A ${engineVersion} task-oriented teaching manual">${['en', 'de', 'zh-CN'].map(locale => htmlFor(locale, CREATOR_LEARNING_GUIDES, localizedLearningGuide)).join('')}</div>\n<!-- NOVA_V6_TEACHING_END -->`
  html = replaceMarked(html, '<!-- NOVA_V6_TEACHING_START -->', '<!-- NOVA_V6_TEACHING_END -->', supplement.replace('<!-- NOVA_V6_TEACHING_START -->\n', '').replace('\n<!-- NOVA_V6_TEACHING_END -->', ''))
  html = html.replace('</style>', `.v6-manual{padding:0 24px 40px}.v6-panel{margin:24px 0}.v6-guide{border:1px solid var(--line);border-radius:14px;margin:8px 0;background:var(--panel)}.v6-guide summary{display:flex;justify-content:space-between;gap:16px;padding:14px;cursor:pointer}.v6-guide summary span{font-size:12px;color:var(--muted);text-align:end}.v6-guide>div{padding:0 16px 16px}.v6-guide h3{font-size:14px;margin:16px 0 6px}@media(max-width:760px){.v6-manual{padding:0 12px 28px}.v6-guide summary{align-items:flex-start;flex-direction:column}}@media(prefers-reduced-motion:reduce){.v6-guide{scroll-behavior:auto}}\n</style>`)
  await writeReliable(htmlPath, html)
  console.log(`Generated ${CREATOR_LEARNING_GUIDES.length} complete feature lessons in English, German and Chinese.`)
} finally { await server.close() }
