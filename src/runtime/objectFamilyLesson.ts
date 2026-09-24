/** 对象家族教学配置：为蓝图、继承及实例工作流提供学习资料。 */
import type { LearningGuide, LocalizedLearningGuide } from './creatorLearning'
import type { Locale } from '../store/preferences'

export const OBJECT_FAMILY_LESSON_ID = 'task-object-family-reusable-enemy-family'
export const objectFamilyGuide: LearningGuide = {
  id: OBJECT_FAMILY_LESSON_ID, panel: 'Event Sheet and Object Blueprint', workspace: 'Design / Script / Debug', feature: 'Reusable enemy family',
  classifications: ['Assisted', 'Runtime', 'Per-object', 'Reversible'], prerequisites: ['An editable project', 'A shape or sprite with a saved Event Sheet'],
  relatedRhai: ['on_collision_enter', 'signal_emit', 'task_wait', 'spawn_at', 'despawn'], relatedGraph: ['Language/FunctionDeclaration', 'Language/CallExpression'], taskProject: true
}

const lessons: Record<Locale, LocalizedLearningGuide> = {
  en: {
    title: 'Reusable enemy family', purpose: 'Build one reusable enemy and a derived variant, then prove which asset owns each property and callback.', whenToUse: 'Use a blueprint for shared composition and an Event Sheet for declared behavior. Change only the instance values that should differ.',
    prerequisites: ['Stop Play before authoring.', 'Open Script → Event Sheet and create a Rectangle object, or select an existing scripted object.'],
    steps: [
      'Use the object workflow to create a prefab, saved Event Sheet and Object Blueprint. Edit the blueprint, name it Enemy Family and save. Save is refused if a required component is also excluded or an inherited source is missing.',
      'Choose Derive child blueprint, name it Scout Enemy and leave Prefab and Event Sheet inherited. Save, then instantiate the saved blueprint. The child keeps the actual base asset reference.',
      'In Design, refresh Script2D properties and change only the new instance’s move_speed from 6 to 9. Expand Object ownership, search move_speed and compare Authored with Inherited/default value.',
      'Open Event authors and follow Open callback author. The editor selects the unique callback declaration in the actual author asset; overloaded or malformed declarations report that the location is ambiguous.',
      'Use the enemy-family reference to inspect collision and task callbacks, the UI restart signal and ObjectPool2D. spawn_at uses a matching pool; despawn() in that instance returns it to the pool. There is no separate pool_spawn command.',
      'Play and pause. Expand Runtime state to compare the captured authored values with current behavior properties, subscriptions and task/timer queues. These observations cannot edit the running VM.',
      'While paused, make a valid logic edit and save. Reload validates all affected scripts before replacing them. Attempt an invalid edit too: the failed candidate must leave the old runtime and dirty source intact.',
      'Stop, Undo and Redo an instance change, save the project, reopen it and repeat Play. Inspect the inherited source references and the one deliberate override after reopening.'
    ],
    expectedResult: 'The child resolves the parent composition; the instance override is visible separately from its baseline; callbacks navigate to their real authors; failed edits preserve the previous runnable state.',
    persistence: 'Blueprints, Event Sheets, prefab references and instance values are project assets/data. Runtime observations are snapshots and are not saved as authored values.',
    undoRecovery: 'Create, derive and instantiate use document history. Invalid blueprint drafts survive Cancel and workspace departure. Save or explicit Discard resolves a draft; a changed saved base produces a visible conflict.',
    mistakes: ['Treating a whole component-array prefab patch as proof that every field is overridden.', 'Editing a child’s inherited callback in an unrelated local script.', 'Assuming a generated reference or an editor preview is evidence of a successful exported game.'],
    accessibility: 'All blueprint fields have visible labels. Tab through the modal; Escape opens the same Save/Discard/Cancel decision. At high UI scale, scroll the form while the footer remains reachable.',
    minimalExample: '@export(type="float") let move_speed = 6.0;\nfn update(dt) { if input_pressed("Jump") { set_position(move_speed, 0.0); } }',
    productionExample: 'Open reference-projects/projects/creator-v2614-enemy-family/project.nova. Follow test-controls.json for collision, UI restart, pooled reuse, paused reload and save/reopen; its audit reports record which checks actually ran.', relatedRhai: objectFamilyGuide.relatedRhai, relatedGraph: objectFamilyGuide.relatedGraph
  },
  de: {
    title: 'Wiederverwendbare Gegnerfamilie', purpose: 'Einen gemeinsamen Gegner und eine abgeleitete Variante erstellen und die tatsächlichen Autoren von Eigenschaften und Rückrufen prüfen.', whenToUse: 'Blueprints bestimmen gemeinsame Komponenten; Event Sheets bestimmen deklarierte Ereignisse. Nur abweichende Instanzwerte ändern.',
    prerequisites: ['Play vor der Bearbeitung stoppen.', 'Script → Event Sheet öffnen und ein Rechteck erstellen oder ein vorhandenes Skriptobjekt wählen.'],
    steps: [
      'Im Objektablauf Prefab, gespeichertes Event Sheet und Object Blueprint erstellen. Den Blueprint Enemy Family nennen und speichern. Widersprüchliche Komponenten oder fehlende Vererbungsquellen verhindern das Speichern.',
      'Einen untergeordneten Blueprint ableiten und Scout Enemy nennen. Prefab und Event Sheet geerbt lassen, speichern und die gespeicherte Vorlage instanziieren.',
      'In Design die Script2D-Eigenschaften aktualisieren. Nur bei der neuen Instanz move_speed von 6 auf 9 ändern. Objekteigentum öffnen und Autorenwert mit geerbtem Standard vergleichen.',
      'Unter Ereignisautoren den Rückrufautor öffnen. Die eindeutige Deklaration im tatsächlichen Quellasset wird ausgewählt. Mehrdeutige oder fehlerhafte Deklarationen werden gemeldet.',
      'Im Referenzprojekt Kollisions- und Task-Rückrufe, das UI-Neustartsignal und ObjectPool2D prüfen. spawn_at verwendet den passenden Pool; despawn() gibt die ausführende Instanz in den Pool zurück. pool_spawn existiert nicht als eigener Befehl.',
      'Play starten und pausieren. Im Laufzeitzustand ursprüngliche Autorenwerte mit aktuellen Eigenschaften, Abonnements und Timer-/Task-Warteschlangen vergleichen. Diese Ansicht verändert die VM nicht.',
      'Pausiert eine gültige Logikänderung speichern. Alle betroffenen Skripte werden vor dem Austausch geprüft. Auch einen ungültigen Versuch prüfen: bisherige Laufzeit und ungespeicherter Quelltext bleiben erhalten.',
      'Stoppen, eine Instanzänderung rückgängig machen und wiederholen, Projekt speichern und öffnen. Play und die geerbten Verweise sowie die absichtliche Überschreibung erneut prüfen.'
    ], expectedResult: 'Die Variante erbt ihre Komponenten; einzelne Überschreibungen und Laufzeitwerte bleiben unterscheidbar; Navigation führt zum tatsächlichen Autor; ungültige Änderungen ersetzen keinen funktionierenden Zustand.',
    persistence: 'Blueprints, Event Sheets, Prefab-Verweise und Instanzwerte werden gespeichert. Laufzeitbeobachtungen bleiben Momentaufnahmen.', undoRecovery: 'Erstellen, Ableiten und Instanziieren verwenden den Verlauf. Ungültige Entwürfe bleiben bei Abbrechen und Arbeitsbereichswechsel erhalten. Eine extern geänderte Basis erzeugt einen sichtbaren Konflikt.',
    mistakes: ['Eine Komponentenlisten-Änderung als Überschreibung jedes Feldes interpretieren.', 'Einen geerbten Rückruf im falschen lokalen Skript bearbeiten.', 'Eine erzeugte Referenz als Nachweis einer erfolgreich ausgeführten Exportversion ansehen.'], accessibility: 'Felder besitzen sichtbare Beschriftungen. Tab navigiert im Dialog; Escape führt zu Speichern/Verwerfen/Abbrechen. Bei großer UI-Skalierung bleibt die Fußzeile erreichbar.',
    minimalExample: '@export(type="float") let move_speed = 6.0;\nfn update(dt) { if input_pressed("Jump") { set_position(move_speed, 0.0); } }', productionExample: 'reference-projects/projects/creator-v2614-enemy-family/project.nova öffnen. test-controls.json beschreibt Kollision, UI-Neustart, Pool-Wiederverwendung, pausiertes Neuladen und Speichern/Öffnen. Nur die Prüfberichte belegen ausgeführte Tests.', relatedRhai: objectFamilyGuide.relatedRhai, relatedGraph: objectFamilyGuide.relatedGraph
  },
  zh: {
    title: '可复用的敌人家族', purpose: '创建共同的敌人对象及其派生变体，确认每个属性和回调实际由哪个资源定义。', whenToUse: '用对象蓝图共享组件组成，用事件表声明行为；只覆盖需要不同的实例属性。', prerequisites: ['创作前停止播放。', '打开“脚本 → 事件表”，创建矩形对象，或选择已有的脚本对象。'],
    steps: [
      '通过对象流程创建预制体、已保存的事件表和对象蓝图。将蓝图命名为 Enemy Family 并保存。组件同时被要求和排除，或继承资源缺失时，保存会被阻止。',
      '派生子蓝图，命名为 Scout Enemy。预制体和事件表保持继承，保存后再实例化。子蓝图保留真实的父资源引用。',
      '在设计工作区刷新 Script2D 属性，只将新实例的 move_speed 从 6 改为 9。展开“对象来源”，搜索 move_speed，对比创作值与继承或默认值。',
      '展开事件作者并打开回调作者。编辑器选中实际作者资源中的唯一回调声明；重载歧义或语法损坏会显示定位问题。',
      '在敌人家族参考项目中查看碰撞和任务回调、UI 重启信号及 ObjectPool2D。spawn_at 使用匹配的对象池，实例中的 despawn() 将其回收到池中；不存在独立的 pool_spawn 命令。',
      '播放并暂停。在运行状态中对比播放前创作值、当前行为属性、订阅以及定时器和任务队列。此视图不会修改正在运行的虚拟机。',
      '暂停时保存有效的逻辑修改。替换前会验证所有受影响脚本。再尝试无效修改：失败的候选版本必须保留旧运行状态和未保存源代码。',
      '停止，撤销并重做一次实例修改，保存并重新打开项目。再次播放，检查继承引用与有意覆盖的那个属性。'
    ], expectedResult: '子对象继承父对象组成；单个实例覆盖与默认值清晰区分；回调可跳转至实际作者；失败修改不破坏原有可运行状态。', persistence: '蓝图、事件表、预制体引用和实例属性属于项目数据。运行观察是快照，不会作为创作值保存。', undoRecovery: '创建、派生和实例化使用文档历史。取消或离开工作区保留无效草稿；保存或明确丢弃才解决草稿。已保存基础发生变化时显示冲突。',
    mistakes: ['把整个组件数组的预制体补丁误认为每个属性都被覆盖。', '在无关的本地脚本中修改继承回调。', '把生成的参考文件或编辑器预览当作已通过导出运行验证。'], accessibility: '蓝图字段有可见标签。用 Tab 在对话框内移动；Escape 使用相同的保存、丢弃、取消流程。高 UI 缩放时可以滚动表单，底部操作保持可达。',
    minimalExample: '@export(type="float") let move_speed = 6.0;\nfn update(dt) { if input_pressed("Jump") { set_position(move_speed, 0.0); } }', productionExample: '打开 reference-projects/projects/creator-v2614-enemy-family/project.nova。按 test-controls.json 检查碰撞、UI 重启、池复用、暂停热重载及保存重开。实际运行结果以审计报告为准。', relatedRhai: objectFamilyGuide.relatedRhai, relatedGraph: objectFamilyGuide.relatedGraph
  }
}
/* 调用 structuredClone(lessons[locale]) 并返回调用结果。 */ export function objectFamilyLesson(locale: Locale): LocalizedLearningGuide { return structuredClone(lessons[locale]) }