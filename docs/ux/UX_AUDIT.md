# Phase II UX audit — 26.34

Engine regressions were investigated first. Dedicated workflow review then traced discovery → editing → history → save/reopen → play → export using existing shared editor architecture.

| Task / friction | Decision and acceptance |
|---|---|
| Scroll an authored game panel | Consumed UI wheel never becomes named gameplay input; bare game canvas remains usable. Actual authored ScrollPanel/Rhai counter/browser gate |
| Type/scroll a native field or inspector | Native/editor input stays local; gameplay keyboard still works on the game surface. Browser fixture covers ownership and Design/Game toggling |
| Cancel load or change projects | Save transaction checks cancellation/session immediately before publish; old project cannot overwrite newly selected data.15 focused checks |
| Preview particle settings | Runtime completion state replaces mutation of authored autoplay. Preview/reset/loop/one-shot serialization checks |
| Frame a zoomed subviewport | Camera dead zones use actual visible extents and rotated axes. Numerical and representative camera tests |
| Understand imported-font controls | EN/DE/ZH note clearly states which modes currently render and which are metadata. Existing controls/data retained |
| Read performance capture | Empty/invalid results cannot appear as measured passes; missing GPU and estimated overhead are explicit; CPU submission label matches actual boundary |
| Discover reusable assets and history | Existing shared mutation/draft router supports atomic resource history. Actual empty project/SVG/nested-prefab/override/revert/undo/save/reopen workflow |
| Create and deliver a game | Three fresh starter workflows, saved normal projects and actual downloaded six-checkpoint game; no private engine patches |
| Navigate specialist tools | Full-panel traversal plus representative translations/scales/docks and pending edits. Actual screenshots reviewed separately from geometry |

Source-only discovery does not prove every mutation path. Callback-boundary debugging is supported; arbitrary statement stepping is deferred. Platform-effect settings, every responsive/AT/IME/device combination and every conditional plugin state remain limited to executed evidence. Avoid speculative convenience dependencies or duplicating the editor shell.
