/** 模板教学资料：保存各模板的目标、操作步骤及使用提示。 */
import type { ProjectTemplateId } from './templates'

export type TemplateGuideLocale = 'en' | 'de' | 'zh'
type Localized = readonly [string, string, string]
export type TemplateRequirement = 'offline' | 'keyboard' | 'pointer' | 'audio' | 'twoPlayers' | 'optionalServer'
interface TemplateGuideRecord { id: ProjectTemplateId; control: keyof typeof controls; manualSection: string; taskSection: string; expected: Localized; requirements: readonly TemplateRequirement[]; foundation?: ProjectTemplateId }
export interface TemplateGuide { controls: string; expected: string; requirements: readonly string[]; manualSection: string; taskSection: string; foundation?: ProjectTemplateId }
const controls = {
  "none": [
    "Press Play. No gameplay input is required; Stop restores the authored scene.",
    "Play starten. Keine Spieleingabe nötig; Stop stellt die Ausgangsszene wieder her.",
    "点击播放即可，无需游戏输入；停止后恢复编辑场景。"
  ],
  "blank": [
    "Create objects in Design, then press Play. The empty scene intentionally has no game controls.",
    "Objekte in Design erstellen, dann Play starten. Die leere Szene hat absichtlich keine Spielsteuerung.",
    "在设计工作区创建对象后播放。空场景没有预设游戏操作。"
  ],
  "platform": [
    "Play: A/D to move, Space to jump. Click the Game viewport before using keys.",
    "Play: A/D zum Bewegen, Leertaste zum Springen. Vor Tastatureingaben in die Spielansicht klicken.",
    "播放后用 A/D 移动、空格跳跃；先点击游戏视口再按键。"
  ],
  "top": [
    "Play: WASD to move; E spawns an enemy. Enter the exit zone on the right to save a checkpoint and open Main Menu.",
    "Play: WASD bewegt; E erzeugt einen Gegner. Die rechte Ausgangszone speichert einen Checkpoint und öffnet Main Menu.",
    "播放后用 WASD 移动，E 生成敌人。进入右侧出口区域会保存检查点并打开 Main Menu 场景。"
  ],
  "snake": [
    "Play: WASD, arrow keys or gamepad D-pad to turn. Stop, then Play to restart.",
    "Play: WASD, Pfeiltasten oder Steuerkreuz zum Abbiegen. Stop und Play starten neu.",
    "播放后用 WASD、方向键或手柄十字键转向。停止并再次播放可重新开始。"
  ],
  "mouse": [
    "Play: move the pointer inside the Game view to steer the blue block and push targets off screen.",
    "Play: Den Zeiger in der Spielansicht bewegen, um den blauen Block zu steuern und Ziele hinauszustoßen.",
    "播放后在游戏视口内移动指针，控制蓝色方块将目标撞出屏幕。"
  ],
  "pong": [
    "Two local players: W/S moves the left paddle; Up/Down moves the right paddle. Stop and Play restart.",
    "Zwei lokale Spieler: W/S bewegt das linke Paddel, Hoch/Runter das rechte. Stop und Play starten neu.",
    "本地双人：W/S 控制左球拍，上/下方向键控制右球拍。停止并再次播放可重开。"
  ],
  "breakout": [
    "Play: A/D or Left/Right moves the paddle. Stop and Play restart the board.",
    "Play: A/D oder Links/Rechts bewegt das Paddel. Stop und Play starten das Feld neu.",
    "播放后用 A/D 或左/右方向键移动球拍。停止并再次播放可重置关卡。"
  ],
  "course": [
    "Play: WASD or arrow keys to move; R restarts. Collect the highlighted checkpoints in order and avoid red hazards.",
    "Play: WASD oder Pfeiltasten bewegen, R startet neu. Markierte Checkpoints der Reihe nach sammeln und roten Gefahren ausweichen.",
    "播放后用 WASD 或方向键移动，R 重开。按顺序收集高亮检查点，避开红色障碍。"
  ],
  "ui": [
    "Play: click the name field, type, and use Tab/Shift+Tab to move focus. Click or press Space on the sound checkbox. The Play button emits an action; no second game scene is supplied.",
    "Play: Namensfeld anklicken, tippen und mit Tab/Umschalt+Tab fokussieren. Die Sound-Checkbox per Klick oder Leertaste ändern. Die Play-Schaltfläche sendet eine Aktion; es gibt keine zweite Spielszene.",
    "播放后点击姓名框输入，用 Tab/Shift+Tab 切换焦点；点击或按空格切换声音复选框。Play 按钮发出动作事件，模板不包含第二个游戏场景。"
  ],
  "network": [
    "Play previews the arena offline. For multiplayer, start a compatible WebSocket server, then enable Networking in Manage and set its endpoint (default ws://127.0.0.1:7777). The sample does not start a server or add player movement.",
    "Play zeigt die Arena offline. Für Mehrspieler einen kompatiblen WebSocket-Server starten, dann Networking in Manage aktivieren und den Endpunkt setzen (Standard ws://127.0.0.1:7777). Die Vorlage startet keinen Server und enthält keine Spielerbewegung.",
    "播放可离线预览竞技场。多人联机需先启动兼容的 WebSocket 服务器，再在管理中启用网络并设置地址（默认 ws://127.0.0.1:7777）。模板不会启动服务器，也未添加玩家移动。"
  ]
} as const
const guides: readonly TemplateGuideRecord[] = [
  {
    "id": "empty",
    "control": "blank",
    "manualSection": "v6-project-manager-create-project",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "An empty scene is ready for your first object; an empty Game preview is expected.",
      "Eine leere Szene ist für das erste Objekt bereit; eine leere Spielansicht ist korrekt.",
      "创建空场景后即可添加第一个对象；空白游戏预览是预期结果。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "physics-sandbox",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "A jointed box, elastic-rope bodies and ground demonstrate gravity and constraints.",
      "Eine verbundene Box, elastisch verbundene Körper und Boden zeigen Schwerkraft und Zwangsbedingungen.",
      "带关节方块、弹性绳连接物体与地面展示重力和约束。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "platformer",
    "control": "platform",
    "manualSection": "v6-physics-character-bodies",
    "taskSection": "v6-task-platformer-complete-platformer",
    "expected": [
      "The player moves and jumps on the ground/platform; an included sprite, idle clip, tile map and jump sound are attached.",
      "Die Figur läuft und springt auf Boden/Plattform; Sprite, Idle-Clip, Tilemap und Sprungton sind enthalten.",
      "玩家可在地面和平台上移动跳跃；已绑定精灵、待机动画、瓦片地图和跳跃音效。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "audio"
    ]
  },
  {
    "id": "top-down",
    "control": "top",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The player moves through a tiled world, spawns enemies and reaches the exit scene.",
      "Die Figur bewegt sich durch die Kachelwelt, erzeugt Gegner und erreicht die Ausgangsszene.",
      "玩家可在瓦片世界移动、生成敌人并到达出口场景。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "lighting-starter",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "Shapes, sprite, text and particles are shown under the configured point light.",
      "Formen, Sprite, Text und Partikel erscheinen im eingerichteten Punktlicht.",
      "形状、精灵、文字与粒子由预设点光源照明。"
    ],
    "requirements": [
      "offline"
    ],
    "foundation": "rendering-lab"
  },
  {
    "id": "tile-world",
    "control": "top",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The Top-down foundation includes a tile palette, layered map, navigation region and streamed chunks.",
      "Die Top-down-Grundlage enthält Kachelpalette, Ebenenkarte, Navigationsregion und gestreamte Chunks.",
      "Top-down 基础项目包含瓦片调色板、分层地图、导航区域与分块流式加载。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ],
    "foundation": "top-down"
  },
  {
    "id": "responsive-ui",
    "control": "ui",
    "manualSection": "v6-interface-buttons-and-inputs",
    "taskSection": "v6-task-menu-localized-responsive-menu",
    "expected": [
      "A responsive menu exposes text entry, focus, checkbox and progress display.",
      "Ein anpassbares Menü zeigt Texteingabe, Fokus, Checkbox und Fortschritt.",
      "响应式菜单提供文本输入、焦点导航、复选框和进度显示。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "pointer"
    ],
    "foundation": "ui-showcase"
  },
  {
    "id": "collision-lab",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "A fast CCD bullet meets a thin wall; falling bodies compare friction, restitution and a sensor. Inspect Debug → Physics.",
      "Ein schnelles CCD-Projektil trifft eine dünne Wand; fallende Körper vergleichen Reibung, Rückprall und Sensor. Debug → Physics prüfen.",
      "高速 CCD 弹丸碰撞薄墙，落体展示摩擦、弹性与传感器；可在调试 → 物理检查。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "rendering-lab",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "Rectangle, ellipse, triangle, sprite, world text, particles and point lighting appear together.",
      "Rechteck, Ellipse, Dreieck, Sprite, Welttext, Partikel und Punktlicht erscheinen zusammen.",
      "矩形、椭圆、三角形、精灵、世界文字、粒子与点光源同屏显示。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "ui-showcase",
    "control": "ui",
    "manualSection": "v6-interface-buttons-and-inputs",
    "taskSection": "v6-task-menu-localized-responsive-menu",
    "expected": [
      "The localized menu accepts a player name and toggles its checkbox. Theme and a sample audio asset are included; the audio asset is not attached to a click action.",
      "Das lokalisierte Menü nimmt einen Namen an und schaltet die Checkbox. Theme und Audiobeispiel sind enthalten; der Ton ist nicht an Klicks gebunden.",
      "本地化菜单可输入姓名并切换复选框；包含主题和音频示例，但音频尚未绑定到点击动作。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "pointer"
    ]
  },
  {
    "id": "networked-optional",
    "control": "network",
    "manualSection": "v6-network-authority-and-replication",
    "taskSection": "v6-task-network-local-network-sample",
    "expected": [
      "Two configured replication objects appear without a network connection. Optional multiplayer requires the explicit server setup above.",
      "Zwei konfigurierte Replikationsobjekte erscheinen ohne Netzwerkverbindung. Mehrspieler erfordert die oben beschriebene Servereinrichtung.",
      "两个配置了同步的对象在无网络连接时显示；可选多人功能需按上述步骤配置服务器。"
    ],
    "requirements": [
      "offline",
      "optionalServer"
    ]
  },
  {
    "id": "particle-lab",
    "control": "none",
    "manualSection": "v6-rendering-particles-and-trails",
    "taskSection": "v6-task-cutscene-animation-and-cutscene",
    "expected": [
      "The Rendering Lab emitter produces a colored particle plume beside shapes, sprite and text.",
      "Der Emitter aus Rendering Lab erzeugt eine farbige Partikelwolke neben Formen, Sprite und Text.",
      "Rendering Lab 发射器在形状、精灵和文字旁生成彩色粒子流。"
    ],
    "requirements": [
      "offline"
    ],
    "foundation": "rendering-lab"
  },
  {
    "id": "audio-lab",
    "control": "ui",
    "manualSection": "v6-audio-audio-clips-and-sources",
    "taskSection": "v6-task-menu-localized-responsive-menu",
    "expected": [
      "A UI menu and embedded UIClick audio asset are ready to inspect in Audio. This focused foundation does not play the asset automatically.",
      "Ein UI-Menü und der enthaltene UIClick-Ton lassen sich in Audio prüfen. Diese Grundlage spielt den Ton nicht automatisch ab.",
      "可在 Audio 面板检查 UI 菜单及内嵌 UIClick 音频；该基础模板不会自动播放音频。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "pointer",
      "audio"
    ],
    "foundation": "ui-showcase"
  },
  {
    "id": "animation-lab",
    "control": "platform",
    "manualSection": "v6-animation-state-machines",
    "taskSection": "v6-task-cutscene-animation-and-cutscene",
    "expected": [
      "The Platformer player runs an attached looping idle-opacity clip through its Animator controller.",
      "Die Platformer-Figur spielt einen angehängten Idle-Deckkraftclip über ihren Animator-Controller.",
      "Platformer 玩家通过 Animator 控制器播放已绑定的循环待机透明度动画。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "audio"
    ],
    "foundation": "platformer"
  },
  {
    "id": "mouse-knockout",
    "control": "mouse",
    "manualSection": "v601-play",
    "taskSection": "v601-create",
    "expected": [
      "Eight orange targets spawn; clearing all eight produces the congratulations panel.",
      "Acht orange Ziele erscheinen; nach allen acht erscheint die Glückwunschtafel.",
      "生成八个橙色目标，全部撞出屏幕后显示祝贺面板。"
    ],
    "requirements": [
      "offline",
      "pointer"
    ]
  },
  {
    "id": "snake",
    "control": "snake",
    "manualSection": "v6-task-snake-complete-snake-game",
    "taskSection": "v6-task-snake-complete-snake-game",
    "expected": [
      "A moving snake wraps at the edges, grows on pickups and ends on self-collision.",
      "Die Schlange umläuft Bildschirmränder, wächst bei Pickups und endet bei Selbstkollision.",
      "蛇在屏幕边缘循环移动，拾取食物后增长，撞到自身会结束游戏。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "pong",
    "control": "pong",
    "manualSection": "v6-debug-project-tests",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "The ball rebounds between two paddles; scoring reaches a winner at seven points.",
      "Der Ball springt zwischen zwei Paddeln; sieben Punkte ergeben den Sieg.",
      "球在双球拍间反弹，先得七分者获胜。"
    ],
    "requirements": [
      "offline",
      "keyboard",
      "twoPlayers"
    ]
  },
  {
    "id": "breakout",
    "control": "breakout",
    "manualSection": "v6-debug-project-tests",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "The ball breaks 24 collider-backed bricks and the HUD tracks completion.",
      "Der Ball zerstört 24 Kollisionssteine; das HUD zeigt den Fortschritt.",
      "球撞碎 24 块带碰撞体的砖块，HUD 显示完成进度。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "physics-cleanup",
    "control": "mouse",
    "manualSection": "v601-play",
    "taskSection": "v601-create",
    "expected": [
      "The complete Mouse Knockout foundation provides eight targets and a runtime win panel.",
      "Die vollständige Mouse-Knockout-Grundlage enthält acht Ziele und eine Sieganzeige.",
      "完整 Mouse Knockout 基础项目提供八个目标和运行时胜利面板。"
    ],
    "requirements": [
      "offline",
      "pointer"
    ],
    "foundation": "mouse-knockout"
  },
  {
    "id": "grid-chase",
    "control": "snake",
    "manualSection": "v6-task-snake-complete-snake-game",
    "taskSection": "v6-task-snake-complete-snake-game",
    "expected": [
      "The complete Snake foundation provides grid movement, food, growth and self-collision.",
      "Die vollständige Snake-Grundlage bietet Rasterbewegung, Nahrung, Wachstum und Selbstkollision.",
      "完整 Snake 基础项目提供网格移动、食物、增长与自身碰撞。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ],
    "foundation": "snake"
  },
  {
    "id": "coin-trail",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 6 checkpoints and shows a finish state. No time limit.",
      "Das HUD zählt 6 Checkpoints und zeigt den Abschluss. Ohne Zeitlimit.",
      "HUD 记录 6 个检查点并显示完成状态。无时间限制。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "checkpoint-sprint",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 8 checkpoints and shows a finish state. Finish within 25 seconds.",
      "Das HUD zählt 8 Checkpoints und zeigt den Abschluss. In 25 Sekunden abschließen.",
      "HUD 记录 8 个检查点并显示完成状态。需在 25 秒内完成。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "slalom-run",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 6 checkpoints and shows a finish state. Dodge the slalom hazards.",
      "Das HUD zählt 6 Checkpoints und zeigt den Abschluss. Slalom-Gefahren ausweichen.",
      "HUD 记录 6 个检查点并显示完成状态。避开回转障碍。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "orbit-dodge",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 6 checkpoints and shows a finish state. Avoid two moving orbital hazards.",
      "Das HUD zählt 6 Checkpoints und zeigt den Abschluss. Zwei umlaufenden Gefahren ausweichen.",
      "HUD 记录 6 个检查点并显示完成状态。避开两个环绕移动障碍。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "target-circuit",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 8 checkpoints and shows a finish state. Complete the figure-eight route within 20 seconds.",
      "Das HUD zählt 8 Checkpoints und zeigt den Abschluss. Die Achterroute in 20 Sekunden abschließen.",
      "HUD 记录 8 个检查点并显示完成状态。在 20 秒内完成八字路线。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "hazard-crossing",
    "control": "course",
    "manualSection": "v6-world-tile-palettes-and-paint-tools",
    "taskSection": "v6-task-top-down-complete-top-down-game",
    "expected": [
      "The HUD counts 4 checkpoints and shows a finish state. Cross three moving hazard lanes.",
      "Das HUD zählt 4 Checkpoints und zeigt den Abschluss. Drei bewegte Gefahrenbahnen überqueren.",
      "HUD 记录 4 个检查点并显示完成状态。穿过三条移动障碍通道。"
    ],
    "requirements": [
      "offline",
      "keyboard"
    ]
  },
  {
    "id": "domino-cascade",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Twenty dominoes fall after the striker reaches the row.",
      "Zwanzig Dominosteine fallen nach dem Anstoß.",
      "撞击体接触后，二十块多米诺骨牌依次倒下。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "pyramid-stack",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Twenty-eight boxes settle into a stacked pyramid above the ground.",
      "Achtundzwanzig Boxen setzen sich als Pyramide auf dem Boden.",
      "二十八个方块在地面上堆叠成金字塔并趋于稳定。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "restitution-gallery",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Six falling balls compare restitution from zero to one.",
      "Sechs fallende Bälle vergleichen Rückprall von null bis eins.",
      "六个落球对比从零到一的弹性系数。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "friction-ramp",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Four ramp cases compare friction coefficients 0, 0.2, 0.6 and 1.2.",
      "Vier Rampen vergleichen Reibungswerte 0, 0,2, 0,6 und 1,2.",
      "四组斜坡对比 0、0.2、0.6 和 1.2 的摩擦系数。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "pendulum-row",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Five distance-joint pendulums swing from separate anchors.",
      "Fünf Pendel mit Distanzgelenken schwingen an getrennten Ankern.",
      "五个距离关节摆锤绕各自固定点摆动。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "billiards-break",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "A cue ball breaks a rack of ten balls in zero gravity.",
      "Eine Spielkugel stößt zehn Kugeln ohne Schwerkraft an.",
      "零重力下，母球撞开十个球组成的球阵。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "gravity-fountain",
    "control": "none",
    "manualSection": "v6-debug-physics-monitor",
    "taskSection": "v6-task-physics-puzzle-physics-puzzle-with-rope-and-joints",
    "expected": [
      "Twenty-four balls follow ballistic arcs and bounce on the ground.",
      "Vierundzwanzig Bälle folgen Flugbahnen und prallen am Boden ab.",
      "二十四个球沿抛物线运动并在地面反弹。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "shape-poster",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "A static composition displays colored geometry and world-space text.",
      "Eine statische Komposition zeigt farbige Geometrie und Welttext.",
      "静态构图展示彩色几何形状与世界空间文字。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "neon-garden",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "Three point lights illuminate eighteen arranged shapes.",
      "Drei Punktlichter beleuchten achtzehn angeordnete Formen.",
      "三个点光源照亮十八个排列的形状。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "particle-fireworks",
    "control": "none",
    "manualSection": "v6-rendering-particles-and-trails",
    "taskSection": "v6-task-cutscene-animation-and-cutscene",
    "expected": [
      "Five particle fountains emit continuously after Play.",
      "Fünf Partikelfontänen emittieren nach Play fortlaufend.",
      "播放后五个粒子喷泉持续发射。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "rain-room",
    "control": "none",
    "manualSection": "v6-rendering-particles-and-trails",
    "taskSection": "v6-task-cutscene-animation-and-cutscene",
    "expected": [
      "Seven emitters create falling rain around a room silhouette.",
      "Sieben Emitter erzeugen Regen um eine Raumsilhouette.",
      "七个发射器在房间轮廓周围产生降雨。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "starfield",
    "control": "none",
    "manualSection": "v6-rendering-particles-and-trails",
    "taskSection": "v6-task-cutscene-animation-and-cutscene",
    "expected": [
      "Three particle layers create a drifting star field.",
      "Drei Partikelebenen erzeugen ein wanderndes Sternenfeld.",
      "三个粒子层生成漂移星空。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "orbit-gallery",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "Six script-driven shapes orbit their configured centers.",
      "Sechs skriptgesteuerte Formen umkreisen ihre Mittelpunkte.",
      "六个脚本驱动形状绕各自中心运动。"
    ],
    "requirements": [
      "offline"
    ]
  },
  {
    "id": "sprite-wall",
    "control": "none",
    "manualSection": "v6-rendering-lights-and-shadows",
    "taskSection": "v6-task-web-web-deployment",
    "expected": [
      "Twenty-four tinted sprite instances reuse one included image.",
      "Vierundzwanzig eingefärbte Sprites nutzen ein enthaltenes Bild.",
      "二十四个着色精灵实例复用同一张内嵌图像。"
    ],
    "requirements": [
      "offline"
    ]
  }
]
const requirementText: Record<TemplateRequirement, Localized> = {
 offline: ['Ready offline', 'Offline bereit', '离线可用'], keyboard: ['Keyboard', 'Tastatur', '键盘'], pointer: ['Pointer', 'Zeiger', '指针'], audio: ['Audio included', 'Audio enthalten', '包含音频'], twoPlayers: ['Two local players', 'Zwei lokale Spieler', '本地双人'], optionalServer: ['Server optional', 'Server optional', '服务器可选']
}
const index = /* 根据 locale === 'de' 的真假，分别返回 1 或 locale === 'zh' ? 2 : 0。 */ (locale: TemplateGuideLocale): 0 | 1 | 2 => locale === 'de' ? 1 : locale === 'zh' ? 2 : 0
const byId = new Map(guides.map(/* 返回按声明顺序构造的数组 [guide.id, guide]。 */ guide => [guide.id, guide]))
/** Instructions describe the actual supplied foundation; no external downloads are needed for Play. */
/** 要求模板指南存在，按语言选择操作、预期结果和依赖提示并返回手册定位信息。 */ export function templateGuide(id: ProjectTemplateId, locale: TemplateGuideLocale = 'en'): TemplateGuide {
 const guide = byId.get(id)
 if (!guide) throw new Error(`Missing template instructions: ${id}`)
 const at = index(locale)
 return { controls: controls[guide.control][at], expected: guide.expected[at], requirements: guide.requirements.map(/* 返回 requirementText[requirement][at] 的当前值。 */ requirement => requirementText[requirement][at]), manualSection: guide.manualSection, taskSection: 'v2615-template-' + id, foundation: guide.foundation }
}
