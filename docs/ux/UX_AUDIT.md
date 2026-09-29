# Phase II UX audit — 26.33

Dedicated integration review now follows the stable core-engine checks. Preserve the completed UI rebuild.

| User task | Evidence / finding | Action |
|---|---|---|
| Create a starter and reopen it | Three fresh starters save/reopen with every scene and semantic asset value preserved | Keep existing launcher/dialog flow |
| Play while inspecting a character | Editor W shortcut swallowed game movement | Fixed editing-only shortcut ownership; actual W/S and Stop/Q/W pass |
| Save runtime progress in a second slot | Subsequent script writes returned to slot1 | Fixed; editor-authored Rhai script proves browser slot2 persistence |
| Restore custom game state | Namespace normalization prevented callbacks receiving saved values | Fixed in runtime owner; format-compatible module regression |
| Recover an interrupted save | Cleanup refusal mislabeled valid data; stale recovery could overwrite newer commit | Fixed with failure-injected regressions; UI status follow-up pending |
| Compose existing joint components | Three descriptors were absent despite solver support | Registry repaired; actual composition/toggle/roundtrip pass; UI follow-up pending |
| Use multilingual game UI | Native text input and checkbox work in responsive starter | Real browser interaction passes |
| Deliver a Web game | Actual ZIP validates and player starts in a nested static URL | Passed; does not certify public hosting or native installer |
| Navigate compact editor panels | Prior rebuild established full-panel baseline | Final candidate visual/navigation rerun pending |

Remaining dedicated review: resource discovery/inspector/commands, pending drafts and undo, actionable errors, progress/cancellation, saved layout, nearby visual consistency, and reference-game completion. Avoid speculative convenience features; only change demonstrated friction or broken tasks.
