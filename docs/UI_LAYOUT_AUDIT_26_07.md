# Nova_A 26.07 Network Studio and all-panel layout audit

The 26.07 UI contract covers the complete editor plus the multi-instance/network workflow. Required states are English, German, and Chinese at 1024×640, 1024×768, 1366×768, 1920×1080, and 2560×1440, with 80%, 100%, 125%, and 150% UI scale where supported.

## Global contract

- Nunito Sans remains the primary interface face, Noto Sans SC the Chinese fallback, and JetBrains Mono the code/address/hash face.
- Shared type tokens control body, label, tab, button, badge, table, and help text. Normal line height remains at least 1.35 and compact labels at least 1.25; letter spacing is restrained and language-aware.
- Single-line inputs, selects, segmented controls, and their placeholders are centered. Multiline prose, code, logs, addresses, packet rows, and numeric tables remain left aligned.
- Every grid/flex child that may shrink owns `min-width: 0`. Long translated labels wrap inside their owner. IDs, paths, endpoints, hashes, and errors wrap or elide with a reachable full-value detail; they never widen the root document.
- Tabs/actions may wrap or use an explicitly labelled owned scroller. No horizontal browser-default scrollbar may hide the final action.
- Dialogs, menus, toasts, cards, and popovers stay within the viewport and retain keyboard focus/recovery.

## Network Studio information architecture

| Area | Primary task | Containment and interaction requirement |
| --- | --- | --- |
| Session | package, permission, local/direct transport, role, identity, connect | permission and encryption state remain visible; endpoint help wraps; Connect/Disconnect never leaves the card |
| Protocol | channels, RPCs, bounds, admission/security | wide contracts use owned tables/cards; validation appears beside the affected field and in the summary |
| Replication | object contract, owner, fields, prediction, interest | object/peer selectors show readable names plus copyable IDs; long lists virtualize without losing keyboard order |
| Orchestration | 2/4/8 plan, build/launch, process controls | instance cards reflow; each has status, PID, role, endpoint, Stop, Logs, Inspector; partial-failure text is fully visible |
| Replay | network impairment, record/play/compare, save/restore | sliders/numbers remain paired; seed and exact profile are copyable; playback state cannot cover transport actions |
| Diagnostics | ownership, bandwidth, diffs, rollback, packets, services | timelines virtualize/page; selected detail owns scroll; update sampling does not move focus or reorder the row under pointer |

At 1024 px, Network Studio becomes one main column plus a context drawer or stacked detail region. It must not preserve a compressed desktop grid. The tab row may wrap to two lines; it may not overlap the editor workspace bar, scene controls, canvas label, or bottom-dock resize handle.

## Multi-instance logs and Inspectors

- The orchestration list has one stable card per launched instance and keeps the shared launch summary separate.
- In Network Studio, **Logs** filters the bounded editor-observed network event list by that instance ID. It does not claim to capture the process's stdout/stderr.
- The editor's **Inspector** action opens the selected process detail card with identity, role, endpoint, bind address, PID, and status. It does not focus/control the child or open its UI. The corresponding player's own Inspector toggle shows that player's live network state and bounded `editorState` log; this release does not claim pause, filter, copy, clear-view, or follow-tail controls for that surface.
- Opening or closing Logs/Inspector never substitutes for process control. Stopping a process requires the named **Stop** action and normal confirmation/recovery language.
- An 8-peer card grid wraps or stacks rather than shrinking text below the shared minimum. Exited status remains visible in the orchestration card; persistent crash-log retention beyond the bounded editor/player views is not claimed.

## All-panel regression matrix

| Surface | Required regression check |
| --- | --- |
| top/workspace/scene bars | no overlap with canvas label or mouse tools; long locale text wraps/owns overflow |
| Hierarchy and Inspector | entity/component names, property labels, centered fields, error help, and action rows remain readable |
| Assets/Content/Library | tree, grid, importer and preview own independent scroll; buttons never become a browser-style sliding strip |
| Script/Event/Visual Graph | code, blocks, graph stage and details retain independent sizing, zoom/pan and keyboard access |
| Animation/Timeline/Tilemap/Profiler | horizontal timelines own their scrollbar; headers and save/add actions stay fixed and visible |
| Rendering/Audio/World/Physics/AI | cards reflow; diagnostics and remedies wrap; canvas overlays do not intercept unrelated clicks |
| Project/Build/Packages/Ecosystem | template/service identity, permission and output errors remain fully readable |
| Console/Network diagnostics | tables virtualize; monospace content wraps or scrolls only inside the table/detail owner |
| dialogs/toasts/launcher/player | viewport-bounded; translated actions and fatal errors do not escape or cover dismissal controls |

## Performance and motion

Network counters, packets, replication diffs, logs, and rollback entries use bounded buffers and a sampled UI snapshot. A fixed simulation tick must not force Vue to clone and reconcile the complete diagnostic history. Virtualization must retain stable row keys, focus, selection, copy, and screen-reader order.

Panel transitions use the existing motion tokens and GPU-friendly opacity/transform properties. Reduced-motion preference suppresses nonessential movement without removing information. No verification may solve overlap by deleting animation, shrinking text below the token minimum, or hiding a feature.

## Evidence boundary

`pnpm qualify:v26.07:layout` records geometry and screenshots for the required viewports/locales/scales. `pnpm verify:v26.07:interactions` checks that all retained actions are bound and reachable. Automated geometry is not proof of rendered glyph quality, IME behavior, assistive-technology behavior, or independent user comprehension; those remain explicit external/manual gates.
