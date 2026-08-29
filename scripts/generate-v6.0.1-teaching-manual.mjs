import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const START = '<!-- NOVA_V601_MOUSE_KNOCKOUT_START -->'
const END = '<!-- NOVA_V601_MOUSE_KNOCKOUT_END -->'
const V6_START = '<!-- NOVA_V6_TEACHING_START -->'
const V6_END = '<!-- NOVA_V6_TEACHING_END -->'
const v601Css = '.v601-manual{padding:0 24px}.v601-answer{margin:22px 4px 0;padding:22px;border:1px solid var(--line);border-radius:16px;background:var(--panel)}.v601-answer h2{font-size:23px}.v601-task{padding:28px 4px}.v601-task pre{white-space:pre;tab-size:2}.v601-task li+li{margin-top:7px}@media(max-width:760px){.v601-manual{padding:0 12px}.v601-task pre{font-size:12px}}'

const scripts = {
  manager: [
    '@export(type="int", min=1, max=64, step=1, group="Game") let remaining = 8;',
    'fn start() {',
    '  score_set(0.0);',
    '  entity_set_enabled(find_entity_handle("Congratulations Bar"), false);',
    '  entity_set_enabled(find_entity_handle("Congratulations Text"), false);',
    '  ui_set_text_on(find_entity_handle("Score Text"), "Score  0 / 8");',
    '  spawn_at("asset://TARGET_PREFAB_GUID", -6.0, -3.8, 0.0, 1.0, 1.0);',
    '  // Repeat spawn_at at the seven other authored positions.',
    '  timer_start("bounds", 0.05, true);',
    '}',
    'fn on_timer(name) {',
    '  if name != "bounds" || remaining <= 0 { return; }',
    '  let margin = 0.8;',
    '  for target in query_group("knockout-target", 16) {',
    '    let x = entity_position_x_on(target);',
    '    let y = entity_position_y_on(target);',
    '    if x < view_min_x() - margin || x > view_max_x() + margin',
    '      || y < view_min_y() - margin || y > view_max_y() + margin {',
    '      entity_destroy(target); score_add(1.0); remaining = remaining - 1;',
    '    }',
    '  }',
    '  ui_set_text_on(find_entity_handle("Score Text"), `Score  ${8 - remaining} / 8`);',
    '  if remaining == 0 {',
    '    timer_cancel("bounds");',
    '    entity_set_enabled(find_entity_handle("Congratulations Bar"), true);',
    '    entity_set_enabled(find_entity_handle("Congratulations Text"), true);',
    '  }',
    '}'
  ].join('\n')
}

const manuals = {
  en: {
    language: 'English', title: 'Build Mouse Knockout from project to portable game',
    intro: 'This is an exact, playable workflow—not a list of panel names. The supplied template already implements the complete game, and the manual also explains how to inspect, change, rebuild, test, and export it.',
    capabilityTitle: 'What Nova_A can produce now',
    capability: ['Yes. Nova_A can author this game, run it with deterministic fixed-step 2D physics, accept mouse/keyboard/gamepad input, spawn prefab instances, execute Rhai or Visual Graph logic, update UI, and export a standalone player.', 'On Windows, the Nova_A desktop editor can package the project into a portable x86-64 .exe when the matching Windows player template is installed and Project Health passes. The browser editor can build a web folder, but a browser cannot compile a native .exe. Code signing and clean-machine certification remain separate release-owner steps.'],
    sections: [
      { id: 'create', title: '1. Create the ready-to-play project', steps: ['Launch the Nova_A desktop editor and choose **New Project**.', 'Enter a project name such as **Mouse Knockout**, choose a writable empty folder, and select **Mouse Knockout** from Templates.', 'Choose **Create Project**. The project opens **Mouse Knockout Arena** as its startup scene and shows `Assets/Tutorials/Getting Started.md`.', 'Save once. This establishes the project document before you edit or build it.'] },
      { id: 'play', title: '2. Prove the game works before editing', steps: ['Choose **Play** in the runtime toolbar.', 'Move the pointer inside the Game view. The blue square follows the pointer in camera/world coordinates; zoom, DPI, and aspect ratio do not change its physical scale.', 'Hit the eight orange targets. A target counts only after its center and safety margin leave the active camera bounds.', 'Confirm **Score  1 / 8** through **Score  8 / 8** and the **Congratulations! All targets cleared.** bar.', 'Choose **Stop**. Play-mode mutations are discarded; authored scene and assets remain unchanged.'] },
      { id: 'scene', title: '3. Understand every supplied object and setting', bullets: ['**Main Camera** — active Camera2D, orthographic size 10, dark background.', '**Mouse Player** — visible Rectangle, Kinematic RigidBody2D, BoxCollider2D, restitution 0.7, low friction, and native **MouseFollower2D**. Maximum speed 40 keeps the response immediate while bounding collision impulses; 0 is the optional unrestricted mode.', '**Game Manager** — Script2D with `KnockoutGameManager.rhai`; resets score, spawns eight targets, checks their camera bounds on a timer, and updates UI.', '**Game HUD** — screen-space Canvas at reference size 1920 × 1080.', '**Score Text / Instruction Text** — runtime score and player instruction.', '**Congratulations Bar / Congratulations Text** — disabled at start and enabled only at 8 / 8.', '**Knockout Target.nova-prefab** — Dynamic RigidBody2D with zero scene gravity, restitution 0.86, low friction, BoxCollider2D, and group `knockout-target`.', '**Scene physics** — gravity 0, 60 Hz fixed tick, interpolation enabled. Collision layer 0 interacts with layer 0.'] },
      { id: 'draw', title: '4. Draw or replace an object yourself', steps: ['Stop Play, open **Design**, choose the **Rectangle** drawing tool, then drag in the Scene view. The drag defines actual world width and height.', 'Select the new object in Hierarchy. In Inspector rename it, set Transform2D position/scale, and verify ShapeRenderer2D plus BoxCollider2D.', 'For a replacement player, set RigidBody2D → **Body type: Kinematic**, Gravity scale 0, low friction, then add **MouseFollower2D**. Keep Offset at 0, 0 and Maximum speed at 40 for responsive, bounded collisions. Use 0 only when you intentionally want unrestricted velocity. Disable or delete the original player only after the replacement passes Play.', 'For a replacement target, use **Body type: Dynamic**, Gravity scale 0, restitution about 0.86, low friction, and add it to group `knockout-target`; it needs no per-target script.', 'With the target selected, choose **Create Prefab** in Inspector. Copy its `asset://GUID` from Assets and replace `TARGET_PREFAB_GUID` in the manager script.', 'Keep target size near 1.25 × 1.25 and spawn centers within the Camera2D view so they are visible before play begins.'] },
      { id: 'code', title: '5. Understand the automatic pointer component and edit the manager script', paragraphs: ['`MouseFollower2D` reads the active Game-view pointer in world units and supplies the kinematic velocity inside the native fixed-step loop. This preserves collision response without running a script every frame.', '`KnockoutGameManager.rhai` owns spawning, score, camera-bound checks, destruction, and UI. It checks the grouped targets on a repeating 50 ms timer, so identical per-target scripts are unnecessary. The shipped template contains all eight explicit `spawn_at` calls; the shortened excerpt below shows the contract.'], codes: [scripts.manager] },
      { id: 'configure', title: '6. Configuration checklist before release', bullets: ['Project Settings → Physics: fixed tick 60 Hz, finite gravity 0 for this scene, interpolation enabled.', 'Collision Matrix: player and target share an enabled collision pair; UI objects have no physics collider.', 'Input: no custom action is required for pointer position. `mouse_world_x/y` are read from the active Game view. Keyboard/gamepad actions remain available through Input Map.', 'Camera: exactly one active gameplay Camera2D; orthographic size and viewport determine `view_min/max_x/y`.', 'Build Settings: Runtime **Game**, startup scene **Mouse Knockout Arena**, Target **Windows**, Architecture **x86_64**, **Package into executable** on, identifier such as `top.whitelists.mouseknockout`, version `1.0.0`.', 'Project Health: resolve every Error before Build; warnings for signing or external clean-machine evidence do not change the game logic.'] },
      { id: 'build', title: '7. Build the portable Windows game', steps: ['Save the project, then open **Manage → Project Health** and run validation.', 'Open **Manage → Build Settings → Overview**.', 'Choose **Windows**, **x86_64**, runtime **Game**, and **Portable application / Package into executable**.', 'In Scenes, include **Mouse Knockout Arena**, put it first, and select it as Startup.', 'Use a Development build for testing or Release for distribution. Keep deterministic packaging enabled.', 'Choose an output directory outside the source project, then press **Build & Run**.', 'Nova_A creates the game data, invokes the matching local player template, writes the portable `.exe`, and launches it. Copy the resulting executable to another Windows x86-64 machine for the required clean-machine test.', 'For Web instead, select Web and **Web player folder**, build, and serve the whole output folder over HTTP(S); do not open `index.html` through `file://`.'] },
      { id: 'troubleshoot', title: '8. Expected failures and exact fixes', bullets: ['Player does not move: pointer must be over the Game view; verify MouseFollower2D is enabled, the body is Kinematic, and there is one active camera.', 'Targets do not move: verify Dynamic body, BoxCollider2D, gravity 0, and that the collision matrix enables layer 0 ↔ 0.', 'Target leaves view but score stays: verify the prefab group is exactly `knockout-target`, the manager timer is running, and API v2 provides `view_min/max`.', 'Score changes twice: targets must have the group only once; do not add a second scoring script.', 'Banner never appears: names must be exactly `Congratulations Bar`, `Congratulations Text`, and `Score Text`; remaining must start at the number of spawned targets.', 'Build is unavailable: use the desktop editor on the target host, install/validate the Windows x86-64 export template, select a startup scene, and clear Project Health errors.'] }
    ]
  },
  de: {
    language: 'Deutsch', title: 'Mouse Knockout vom Projekt bis zum portablen Spiel bauen',
    intro: 'Dies ist ein exakter, spielbarer Ablauf und keine Liste von Panelnamen. Die Vorlage enthält das vollständige Spiel; das Handbuch erklärt außerdem Prüfung, Änderung, Neuaufbau, Test und Export.',
    capabilityTitle: 'Was Nova_A jetzt erzeugen kann',
    capability: ['Ja. Nova_A kann dieses Spiel erstellen, mit deterministischer 2D-Physik ausführen, Maus/Tastatur/Gamepad lesen, Prefabs erzeugen, Rhai oder Visual Graph ausführen, UI aktualisieren und einen eigenständigen Player exportieren.', 'Unter Windows erzeugt der Nova_A-Desktop-Editor eine portable x86-64-.exe, wenn die passende Windows-Player-Vorlage installiert ist und Project Health besteht. Der Browser-Editor kann einen Web-Ordner bauen, aber keine native .exe kompilieren. Codesignatur und Prüfung auf einem sauberen Rechner bleiben getrennte Freigabeschritte.'],
    sections: [
      { id: 'create', title: '1. Spielbereites Projekt erstellen', steps: ['Nova_A-Desktop-Editor starten und **New Project** wählen.', 'Projektname, etwa **Mouse Knockout**, und einen beschreibbaren leeren Ordner eingeben; unter Templates **Maus-Knockout** wählen.', '**Create Project** wählen. **Mouse Knockout Arena** ist Startszene und `Assets/Tutorials/Getting Started.md` wird angezeigt.', 'Einmal speichern, bevor Inhalte geändert oder gebaut werden.'] },
      { id: 'play', title: '2. Das unveränderte Spiel prüfen', steps: ['In der Laufzeitleiste **Play** wählen.', 'Den Zeiger in der Game-Ansicht bewegen. Das blaue Quadrat folgt in Kamera-/Weltkoordinaten; Zoom, DPI und Seitenverhältnis ändern den Physikmaßstab nicht.', 'Alle acht orangefarbenen Ziele aus der Ansicht stoßen. Gezählt wird erst außerhalb der Kameragrenze plus Sicherheitsrand.', '**Score 1 / 8** bis **8 / 8** und danach die Glückwunschleiste prüfen.', '**Stop** wählen. Laufzeitänderungen werden verworfen; Szene und Assets bleiben unverändert.'] },
      { id: 'scene', title: '3. Objekte und Einstellungen der Vorlage', bullets: ['**Main Camera** — aktive Camera2D, Orthografiegröße 10.', '**Mouse Player** — Rectangle, kinematischer RigidBody2D, BoxCollider2D, Rückprall 0,7, geringe Reibung und native **MouseFollower2D**. Höchstgeschwindigkeit 40 reagiert direkt und begrenzt Kollisionsimpulse; 0 bleibt der optionale unbegrenzte Modus.', '**Game Manager** — erzeugt acht Ziele, prüft ihre Kameragrenzen per Timer und verwaltet Punktestand und Sieg.', '**Game HUD** — bildschirmbezogene Canvas mit 1920 × 1080 Referenz.', '**Score Text / Instruction Text** — Punktestand und Anleitung.', '**Congratulations Bar / Congratulations Text** — anfangs deaktiviert, bei 8 / 8 aktiviert.', '**Knockout Target.nova-prefab** — dynamischer Körper mit Rückprall 0,86, geringer Reibung und Gruppe `knockout-target`.', '**Szenenphysik** — Gravitation 0, 60-Hz-Fixed-Step, Interpolation; Ebene 0 kollidiert mit Ebene 0.'] },
      { id: 'draw', title: '4. Eigenes Objekt zeichnen oder ersetzen', steps: ['Play stoppen, **Design** öffnen, das **Rectangle**-Zeichenwerkzeug wählen und in der Scene-Ansicht ziehen. Die Ziehstrecke bestimmt echte Weltgröße.', 'Objekt in Hierarchy wählen, im Inspector umbenennen, Transform2D einstellen und ShapeRenderer2D sowie BoxCollider2D prüfen.', 'Für einen Player RigidBody2D auf **Kinematic**, Gravity scale 0 und geringe Reibung setzen; **MouseFollower2D** hinzufügen. Offset 0, 0 und Höchstgeschwindigkeit 40 liefern direkte, begrenzte Kollisionen; 0 nur bewusst für unbegrenzte Geschwindigkeit verwenden. Original erst nach erfolgreichem Play-Test entfernen oder deaktivieren.', 'Für ein Ziel **Dynamic**, Gravity scale 0, Rückprall etwa 0,86 und geringe Reibung verwenden und die Gruppe `knockout-target` hinzufügen; ein eigenes Zielskript ist nicht nötig.', 'Ziel auswählen, im Inspector **Create Prefab** wählen, `asset://GUID` aus Assets kopieren und `TARGET_PREFAB_GUID` im Manager ersetzen.', 'Zielgröße etwa 1,25 × 1,25 halten und Spawnpunkte innerhalb der Camera2D-Ansicht setzen.'] },
      { id: 'code', title: '5. Automatische Zeigerkomponente verstehen und Managerskript bearbeiten', paragraphs: ['`MouseFollower2D` liest den Zeiger der aktiven Game-Ansicht in Weltkoordinaten und liefert die kinematische Geschwindigkeit direkt im nativen Fixed-Step. Dadurch bleiben Kollisionen erhalten, ohne pro Frame ein Skript auszuführen.', '`KnockoutGameManager.rhai` verwaltet Spawns, Kameragrenzen, Zerstörung, Punktestand und UI. Es prüft die gruppierten Ziele alle 50 ms, sodass identische Skripte an jedem Ziel entfallen. Die Vorlage enthält acht vollständige `spawn_at`-Aufrufe; unten steht der verkürzte Vertrag.'], codes: [scripts.manager] },
      { id: 'configure', title: '6. Konfiguration vor der Freigabe', bullets: ['Project Settings → Physics: 60 Hz, Szenengravitation 0, Interpolation an.', 'Collision Matrix: Player und Ziel besitzen ein aktiviertes Kollisionspaar; UI hat keine Collider.', 'Input: Für den Zeiger ist keine Aktion nötig; `mouse_world_x/y` liest die aktive Game-Ansicht. Tastatur/Gamepad wird über Input Map konfiguriert.', 'Camera: genau eine aktive Camera2D; Orthografiegröße und Viewport bestimmen `view_min/max_x/y`.', 'Build Settings: Runtime **Game**, Startszene **Mouse Knockout Arena**, **Windows**, **x86_64**, **Package into executable**, Kennung z. B. `top.whitelists.mouseknockout`, Version `1.0.0`.', 'Project Health: alle Fehler vor Build beheben; Signatur- oder externe Testwarnungen verändern die Spiellogik nicht.'] },
      { id: 'build', title: '7. Portables Windows-Spiel bauen', steps: ['Projekt speichern und **Manage → Project Health** validieren.', '**Manage → Build Settings → Overview** öffnen.', '**Windows**, **x86_64**, Runtime **Game** und **Portable application / Package into executable** wählen.', '**Mouse Knockout Arena** aufnehmen, an erste Stelle setzen und als Startup wählen.', 'Development zum Testen oder Release zur Verteilung; deterministisches Paketieren aktiviert lassen.', 'Ausgabeordner außerhalb des Quellprojekts wählen und **Build & Run** drücken.', 'Nova_A erzeugt Daten, ruft die lokale passende Player-Vorlage auf, schreibt die `.exe` und startet sie. Danach auf einem anderen Windows-x86-64-Rechner prüfen.', 'Für Web: Web und **Web player folder** wählen und den gesamten Ordner über HTTP(S) bereitstellen, nicht über `file://`.'] },
      { id: 'troubleshoot', title: '8. Fehler und genaue Korrekturen', bullets: ['Player bewegt sich nicht: Zeiger über Game-Ansicht; aktivierte MouseFollower2D, kinematischen Körper und genau eine aktive Kamera prüfen.', 'Ziele bewegen sich nicht: Dynamic, BoxCollider2D, Gravitation 0 und Ebene 0 ↔ 0 prüfen.', 'Kein Punkt außerhalb der Ansicht: Gruppe exakt `knockout-target`, laufenden Manager-Timer und API v2 `view_min/max` prüfen.', 'Doppelte Punkte: Gruppe nur einmal vergeben und kein zweites Punkteskript hinzufügen.', 'Keine Siegesleiste: Namen exakt `Congratulations Bar`, `Congratulations Text`, `Score Text`; remaining entspricht Spawnanzahl.', 'Build fehlt: Desktop-Editor auf Zielhost, Windows-x86-64-Vorlage, Startszene und fehlerfreies Project Health erforderlich.'] }
    ]
  },
  'zh-CN': {
    language: '简体中文', title: '从项目到便携游戏：制作“鼠标击退”',
    intro: '这是一套可照着完成并运行的准确流程，不是面板名称列表。内置模板已经实现完整游戏；本文还讲解如何检查、修改、重建、测试与导出。',
    capabilityTitle: 'Nova_A 现在能否真正制作游戏',
    capability: ['可以。Nova_A 能制作并运行本游戏：使用确定性固定步长 2D 物理，读取鼠标／键盘／手柄输入，运行时生成预制体，执行 Rhai 或可视化图表逻辑，更新 UI，并导出独立播放器。', '在 Windows 上，只要安装了匹配的 Windows 播放器模板且“项目健康”通过，Nova_A 桌面编辑器就能打包便携的 x86-64 `.exe`。浏览器版编辑器可以构建网页文件夹，但浏览器无法编译原生 `.exe`。代码签名与全新电脑验证仍需发布者单独完成。'],
    sections: [
      { id: 'create', title: '1. 创建可直接游玩的项目', steps: ['启动 Nova_A 桌面编辑器，选择 **新建项目（New Project）**。', '输入项目名称（例如 **Mouse Knockout**），选择可写的空文件夹，在模板中选择 **鼠标击退**。', '选择 **创建项目（Create Project）**。系统将 **Mouse Knockout Arena** 设为启动场景，并显示 `Assets/Tutorials/Getting Started.md`。', '先保存一次，建立可靠的项目文档，再开始修改或构建。'] },
      { id: 'play', title: '2. 修改前先验证完整游戏', steps: ['在运行工具栏选择 **播放（Play）**。', '把鼠标移入游戏视图。蓝色方块会按摄像机世界坐标跟随指针；缩放、DPI 与宽高比不会改变物理单位。', '撞击八个橙色目标，把它们推出画面。目标中心越过摄像机边界和安全余量后才计分。', '确认分数依次从 **Score 1 / 8** 到 **8 / 8**，随后出现 **Congratulations! All targets cleared.** 提示条。', '选择 **停止（Stop）**。运行时变化会被丢弃，场景和资源的创作数据保持不变。'] },
      { id: 'scene', title: '3. 理解模板中的每个对象与设置', bullets: ['**Main Camera**：启用的 Camera2D，正交尺寸 10，深色背景。', '**Mouse Player**：矩形渲染、Kinematic RigidBody2D、BoxCollider2D、弹性 0.7、低摩擦，并使用原生 **MouseFollower2D**；最大速度 40 可保持快速响应并限制碰撞冲量，0 是可选的无限制模式。', '**Game Manager**：生成八个目标，按定时器检查摄像机边界，管理分数和胜利 UI。', '**Game HUD**：屏幕空间 Canvas，参考尺寸 1920 × 1080。', '**Score Text / Instruction Text**：运行分数与操作提示。', '**Congratulations Bar / Congratulations Text**：开始时禁用，只在 8 / 8 时启用。', '**Knockout Target.nova-prefab**：Dynamic RigidBody2D、弹性 0.86、低摩擦、BoxCollider2D、分组 `knockout-target`。', '**场景物理**：重力 0、固定频率 60 Hz、启用插值；碰撞层 0 与层 0 交互。'] },
      { id: 'draw', title: '4. 自己绘制或替换对象', steps: ['停止播放，打开 **设计（Design）**，选择 **矩形（Rectangle）** 绘制工具，在场景视图拖动；拖动范围就是实际世界宽高。', '在层级中选择新对象，在检查器重命名并设置 Transform2D，确认存在 ShapeRenderer2D 与 BoxCollider2D。', '若替换玩家：将 RigidBody2D → **Body type** 设为 **Kinematic**，Gravity scale 设为 0，摩擦设低，再添加 **MouseFollower2D**；Offset 保持 0, 0、最大速度设为 40，可得到快速且有界的碰撞；只有明确需要无限制速度时才设为 0。新对象通过播放测试后再禁用或删除原玩家。', '若替换目标：使用 **Dynamic**、Gravity scale 0、约 0.86 弹性和低摩擦，并加入 `knockout-target` 分组；目标不需要单独脚本。', '选中目标，在检查器选择 **创建预制体（Create Prefab）**；从资源面板复制 `asset://GUID`，替换管理器脚本中的 `TARGET_PREFAB_GUID`。', '目标尺寸建议约 1.25 × 1.25；生成中心必须位于 Camera2D 画面内。'] },
      { id: 'code', title: '5. 理解自动指针组件并编辑管理器脚本', paragraphs: ['`MouseFollower2D` 在原生固定物理步中读取活动游戏视图的世界坐标指针并设置运动速度；无需每帧运行脚本，也能保留碰撞响应。', '`KnockoutGameManager.rhai` 管理生成、边界检测、销毁、分数和 UI。它每 50 毫秒检查一次分组目标，因此无需为每个目标运行相同脚本。模板包含八条完整 `spawn_at`；下方是契约的缩略示例。'], codes: [scripts.manager] },
      { id: 'configure', title: '6. 发布前配置检查表', bullets: ['项目设置 → 物理：固定频率 60 Hz，本场景重力 0，启用插值。', '碰撞矩阵：玩家与目标所在层的交互必须启用；UI 对象不应有物理碰撞器。', '输入：读取指针无需创建动作；`mouse_world_x/y` 直接读取活动游戏视图。键盘／手柄仍通过输入映射配置。', '摄像机：只启用一个游戏 Camera2D；正交尺寸与视口决定 `view_min/max_x/y`。', '构建设置：运行模式 **Game**，启动场景 **Mouse Knockout Arena**，目标 **Windows**，架构 **x86_64**，启用 **Package into executable**，标识符如 `top.whitelists.mouseknockout`，版本 `1.0.0`。', '项目健康：构建前解决全部“错误”；签名或外部全新电脑证据的警告不会改变游戏逻辑。'] },
      { id: 'build', title: '7. 构建便携 Windows 游戏', steps: ['保存项目，打开 **管理 → 项目健康（Manage → Project Health）** 并运行验证。', '打开 **管理 → 构建设置 → 概览（Manage → Build Settings → Overview）**。', '选择 **Windows**、**x86_64**、运行模式 **Game**、**Portable application / Package into executable**。', '在场景列表加入 **Mouse Knockout Arena**，放到第一项并设为 Startup。', '测试选择 Development，发布选择 Release；保持确定性打包开启。', '选择项目源目录以外的输出文件夹，然后点击 **构建并运行（Build & Run）**。', 'Nova_A 会生成游戏数据、调用匹配的本地播放器模板、写出并启动 `.exe`。之后应复制到另一台 Windows x86-64 电脑完成全新环境验证。', '若构建网页：选择 Web 和 **Web player folder**，通过 HTTP(S) 提供完整输出文件夹；不要用 `file://` 直接打开 `index.html`。'] },
      { id: 'troubleshoot', title: '8. 常见失败与准确修复方法', bullets: ['玩家不动：鼠标必须位于游戏视图；确认 MouseFollower2D 已启用、刚体为 Kinematic，且只有一个活动摄像机。', '目标不动：确认 Dynamic、BoxCollider2D、重力 0，并启用碰撞层 0 ↔ 0。', '出界但不加分：确认分组严格为 `knockout-target`、管理器定时器正在运行、API v2 提供 `view_min/max`。', '重复加分：目标只加入一次分组，不要再添加第二套计分脚本。', '胜利条不出现：名称必须严格为 `Congratulations Bar`、`Congratulations Text`、`Score Text`；remaining 必须等于生成数量。', '无法构建：必须使用目标系统上的桌面编辑器，安装并验证 Windows x86-64 导出模板，设置启动场景并清除项目健康错误。'] }
    ]
  }
}

const escapeHtml = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const inlineHtml = value => escapeHtml(value).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')
const stripMarker = source => source.replace(new RegExp(`${START}[\\s\\S]*?${END}\\s*`, 'm'), '')

function markdownFor(locale) {
  const manual = manuals[locale]
  const lines = [START, '', `## Nova_A 6.0.1 — ${manual.title}`, '', manual.intro, '', `### ${manual.capabilityTitle}`, '']
  for (const paragraph of manual.capability) lines.push(paragraph, '')
  for (const section of manual.sections) {
    lines.push(`### ${section.title}`, '')
    for (const paragraph of section.paragraphs ?? []) lines.push(paragraph, '')
    for (const [index, step] of (section.steps ?? []).entries()) lines.push(`${index + 1}. ${step}`)
    if (section.steps?.length) lines.push('')
    for (const bullet of section.bullets ?? []) lines.push(`- ${bullet}`)
    if (section.bullets?.length) lines.push('')
    for (const code of section.codes ?? []) lines.push('```rhai', code, '```', '')
  }
  lines.push(END)
  return lines.join('\n')
}

function htmlFor(locale) {
  const manual = manuals[locale]
  const sections = manual.sections.map(section => {
    const body = [
      ...(section.paragraphs ?? []).map(value => `<p>${inlineHtml(value)}</p>`),
      section.steps?.length ? `<ol>${section.steps.map(value => `<li>${inlineHtml(value)}</li>`).join('')}</ol>` : '',
      section.bullets?.length ? `<ul>${section.bullets.map(value => `<li>${inlineHtml(value)}</li>`).join('')}</ul>` : '',
      ...(section.codes ?? []).map(value => `<pre><code>${escapeHtml(value)}</code></pre>`)
    ].join('')
    return `<section id="${locale}-v601-${section.id}" class="v601-task"><h2>${escapeHtml(section.title)}</h2>${body}</section>`
  }).join('')
  return `<article data-lang="${locale}"${locale === 'en' ? '' : ' hidden'} class="v601-teaching"><section id="${locale}-v601"><div class="hero"><span class="eyebrow">Nova_A 6.0.1 · complete playable project · world-space pointer physics</span><h1>${escapeHtml(manual.title)}</h1><p>${inlineHtml(manual.intro)}</p></div><div class="v601-answer"><h2>${escapeHtml(manual.capabilityTitle)}</h2>${manual.capability.map(value => `<p>${inlineHtml(value)}</p>`).join('')}</div></section>${sections}</article>`
}

const runtimeScript = `<script>
    const localeLabels={
      en:{contents:'Contents',search:'Search this language…',theme:'Switch theme',editor:'Editor'},
      de:{contents:'Inhalt',search:'Dieses Handbuch durchsuchen…',theme:'Farbschema wechseln',editor:'Editor'},
      'zh-CN':{contents:'目录',search:'搜索当前语言…',theme:'切换主题',editor:'编辑器'}
    };
    const supported=['en','de','zh-CN'];
    const articles=()=>[...document.querySelectorAll('article[data-lang]')];
    const standalone=()=>[...document.querySelectorAll('.release-supplement>section[id]')].filter(section=>!section.closest('article[data-lang]'));
    const buttons=()=>[...document.querySelectorAll('[data-lang-button]')];
    function normalizedLanguage(value){return supported.includes(value)?value:'en'}
    function activeHeadings(language){
      const articleHeadings=articles().filter(article=>article.dataset.lang===language).flatMap(article=>[...article.querySelectorAll('section[id]>h2')]);
      const standaloneHeadings=standalone().filter(section=>section.id.startsWith(language+'-')).map(section=>section.querySelector('h2')).filter(Boolean);
      return [...articleHeadings,...standaloneHeadings];
    }
    function rebuildToc(language){
      const seen=new Set();
      const links=activeHeadings(language).filter(heading=>{const id=heading.parentElement?.id||'';if(!id||seen.has(id))return false;seen.add(id);return true}).map(heading=>'<a href="#'+heading.parentElement.id+'">'+heading.textContent+'</a>').join('');
      document.getElementById('toc-links').innerHTML=links;
    }
    function setLanguage(requested,keepHash=false){
      const language=normalizedLanguage(requested);
      document.documentElement.lang=language;
      articles().forEach(article=>{article.hidden=article.dataset.lang!==language});
      standalone().forEach(section=>{section.hidden=!section.id.startsWith(language+'-')});
      buttons().forEach(button=>button.classList.toggle('active',button.dataset.langButton===language));
      const labels=localeLabels[language];
      document.getElementById('toc-title').textContent=labels.contents;
      const search=document.getElementById('manual-search');search.placeholder=labels.search;search.setAttribute('aria-label',labels.search);
      document.getElementById('theme').title=labels.theme;
      const editor=document.querySelector('.controls a[href="../index.html"]');if(editor)editor.textContent=labels.editor;
      localStorage.setItem('nova-manual-language',language);
      rebuildToc(language);
      if(search.value)searchManual();
      const url=new URL(location.href);url.searchParams.set('lang',language);if(!keepHash)url.hash='';history.replaceState(null,'',url);
    }
    function searchManual(){
      const query=document.getElementById('manual-search').value.trim().toLocaleLowerCase();
      const language=document.documentElement.lang;
      articles().filter(article=>article.dataset.lang===language).forEach(article=>{
        [...article.querySelectorAll(':scope>section[id]')].forEach(section=>{section.hidden=!!query&&!section.textContent.toLocaleLowerCase().includes(query)});
        [...article.querySelectorAll('.v6-guide')].forEach(guide=>{guide.hidden=!!query&&!guide.textContent.toLocaleLowerCase().includes(query);if(query&&!guide.hidden)guide.open=true});
      });
      standalone().filter(section=>section.id.startsWith(language+'-')).forEach(section=>{section.hidden=!!query&&!section.textContent.toLocaleLowerCase().includes(query)});
    }
    buttons().forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.langButton)));
    document.getElementById('manual-search').addEventListener('input',searchManual);
    const theme=document.getElementById('theme');theme.addEventListener('click',()=>{const next=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=next;localStorage.setItem('nova-manual-theme',next)});
    document.documentElement.dataset.theme=localStorage.getItem('nova-manual-theme')==='light'?'light':'dark';
    const hashLanguage=supported.find(language=>location.hash.startsWith('#'+language+'-'));
    const requested=hashLanguage||new URL(location.href).searchParams.get('lang')||localStorage.getItem('nova-manual-language')||'en';
    setLanguage(requested,true);
  </script>`

for (const [locale, filename] of [['en', 'MANUAL.en.md'], ['de', 'MANUAL.de.md'], ['zh-CN', 'MANUAL.zh-CN.md']]) {
  const path = join(root, 'manual', filename)
  const source = stripMarker(await readFile(path, 'utf8'))
  const firstBreak = source.indexOf('\n')
  const updated = `${source.slice(0, firstBreak + 1)}\n${markdownFor(locale)}\n\n${source.slice(firstBreak + 1).trimStart()}`
  await writeFile(path, updated, 'utf8')
}

const htmlPath = join(root, 'manual', 'index.html')
let html = stripMarker(await readFile(htmlPath, 'utf8'))
const v6Expression = new RegExp(`${V6_START}[\\s\\S]*?${V6_END}`, 'm')
const v6Match = html.match(v6Expression)
if (!v6Match) throw new Error('The v6 teaching reference block is missing.')
const v6Reference = v6Match[0]
html = html.replace(v6Expression, '')
const closingHtml = html.indexOf('</html>')
if (closingHtml < 0 || html.slice(closingHtml + 7).trim()) throw new Error('Unexpected content follows the HTML document after removing the v6 reference block.')
html = html.slice(0, closingHtml + 7)
const tutorial = `${START}\n<div class="release-supplement v601-manual" aria-label="Nova_A 6.0.1 Mouse Knockout teaching manual">${Object.keys(manuals).map(htmlFor).join('')}</div>\n${END}`
html = html.replace('<main>', `<main>\n${tutorial}`)
html = html.replace('</main>', `${v6Reference}\n</main>`)
html = html.replaceAll('Nova_A 6.0 Manual', 'Nova_A 6.0.1 Manual').replaceAll('6.0.0 Offline Teaching Manual', '6.0.1 Offline Teaching Manual').replaceAll('Engine 6.0.0', 'Engine 6.0.1')
html = html.replaceAll('Nova_A 5.9 · Whitelist', 'Nova_A 6.0.1 · Whitelist')
html = html.replaceAll(`${v601Css}\n`, '').replaceAll(v601Css, '')
html = html.replace('</style>', `${v601Css}\n</style>`)
const scriptExpression = /<script>[\s\S]*?<\/script>/m
if (!scriptExpression.test(html)) throw new Error('The manual language controller is missing.')
html = html.replace(scriptExpression, runtimeScript)
await writeFile(htmlPath, html, 'utf8')
console.log('Generated the localized Nova_A 6.0.1 Mouse Knockout manual and repaired HTML locale ownership.')
