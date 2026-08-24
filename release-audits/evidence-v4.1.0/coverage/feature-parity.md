# Nova_A 4.1 feature-parity report

v4.1 changes navigation and presentation, not project data or gameplay behavior. Project Format 2 remains schema 29; Runtime API 1, Plugin API 2, Package Manifest 1, and Build CLI 1 stay frozen at the 4.0 contract.

| 4.0 surface/capability | v4.1 location | Status |
| --- | --- | --- |
| Scene/design authoring, hierarchy, Inspector, tools | Design | Preserved |
| Script editor/debugger/tests/API | Script | Preserved; completion is automatic, Ctrl/Cmd+Space requests it explicitly |
| Animation clips/controller/timeline | Animation | Preserved |
| UI, themes, localization, accessibility/audio authoring | UI | Preserved |
| Game, Console, Profiler, Physics Monitor | Debug | Preserved; Physics Monitor is contextual |
| Settings | Manage → Settings | Moved |
| Packages | Manage → Packages | Moved |
| Project Health | Manage → Project health | Moved; summary/table/detail layout |
| Rendering policy | Manage → Rendering | Moved |
| Build Settings | Manage → Build | Moved; four readiness states |
| Assets, Console, Animation, Audio, Profiler transient tools | Bottom dock where contextually useful | Preserved, rearrangeable, pinnable/auto-hide |
| Templates | Launcher plus dismissible `Assets/Tutorials/Getting Started.md` | Preserved; instructional prose removed from runtime scene chrome |
| Physics, rendering, scripts, packages, build/export, collaboration, diagnostics | Original runtime/services | No contract/schema removal |

The automated parity chain consists of the v4.0 Rust workspace tests, TypeScript compiler, production WASM/web/native builds, v4.1 template audits, workspace/shortcut/task integration verification, browser surface qualification, and native portable smoke. Tests that require clean machines, multiple physical monitors, or human review remain explicit external gates.
