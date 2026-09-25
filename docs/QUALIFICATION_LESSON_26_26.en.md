# Nova_A 26.26 / 26.26.0

## 26.26 — production assets and readable libraries

Engine: **26.26.0** · Project Format 2/schema 29.

### Import and reimport

Import a small valid batch first. Replace a sprite, audio clip or font through the existing asset so its UUID remains stable; creating a new asset is a separate identity decision. A failed batch must report failure without silently retaining earlier files. Undo/redo and save/reopen must preserve the chosen identity and authored overrides.

### Dependencies and export

Inspect dependencies and consumers before deletion or replacement. Repair a missing reference by choosing the intended existing identity. Review an atlas or variant after source changes. Save before rebuilding; compare the downloaded game package with the saved assets. Updating only a loose file beside an old packed game does not update that game.

### Library and panels

Use grid/list for discovery and the inspector/details view for full paths, metadata, provenance and import settings. Long names must remain inspectable and controls keyboard reachable. Large collections keep rendered rows bounded; timing and memory reports describe the measured workload, not every device. All forty starters remain available.

### Checks and limits

Replace resources during playback, undo, repair a missing consumer, reopen from a moved project, choose a variant, rebuild an atlas and export. Test fonts and audio on target hardware. Offline authoring remains supported; hosted discovery/publishing requires a real configured service. The complete panel inventory distinguishes source branches from actually exercised UI states.

