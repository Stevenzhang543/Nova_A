# Nova_A 4.3.0 edit ledger

Release date: 23 August 2026. Source: 7f753cb065aff42cef63361765cfefedbd5f72e1 (main, Release3.0.0(2026.08.16)-2-g7f753cb-dirty).

| Edit | Files/subsystem | User-visible consequence | Removed | Evidence |
| --- | --- | --- | --- | --- |
| Entity/scene authoring schema and validation | Entity, SceneManager, sceneAuthoring, physics, projectData | Stable identities, ownership, persistence, scene settings and actionable validation | None | authoring verification/determinism |
| Scene tabs and named layers | SceneTabs, EditorLayout, LayerBar, editor store | Multi-scene status/history/templates/settings/dependencies | None | layout/manual |
| Hierarchy virtualization/productivity | SceneSideBar, authoring2d | 10k navigation, type/tag/saved filters, selection history, pins, highlight, breadcrumbs and drag workflows | None | hierarchy performance |
| Inspector/component workflow | ConfigPanel, componentPalette, registry | Multi-edit, expressions, presets, dependencies/conflicts/help | None | multi-Inspector cases |
| Prefab v2/variants/conflicts/replacement | prefabs, ConfigPanel, Assets | Nested variant workflow, verified transactional source writes and safe replace | None | prefab fixtures |
| Large-scene persistence | SceneManager, physics, sceneAuthoring | Current-schema saves avoid redundant clones/migration; validation reads raw models without disabling UI reactivity | None | 10k create/save/reload benchmark |
| Asset reference navigation | EditorBottomPanel, AssetDatabase | Dependency and reverse-dependency references open their source asset | None | layout/typecheck |
| Viewport guides/rulers | ToolBar, WorldCanvas, authoring2d | Exact-unit layout guides and snapping explanation | None | layout/manual |
| Localization/manual/readmes/docs | i18n, manual, README, docs | Complete EN/DE/ZH authoring guidance | None | manual audit |
| Audit/references/release automation/version | scripts, manifests, locks, references | Exact 4.3 identity, distinct executable references, evidence and 11 artifacts | None | build/package hashes |

No feature or animation was removed. Project schema/public APIs/dependencies/package permissions are unchanged. External tests, signatures, scans, issues, pull requests, and approvals are never fabricated.
