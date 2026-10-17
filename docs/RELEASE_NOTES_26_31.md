# Nova_A 26.31

Engine version: **26.31.0**. Project Format 2/schema 29 is retained.

This release improves editor controls and crowded forms and repairs release-version synchronization. It does not replace the physics solver or introduce a new project format.

- Collapsed bottom docks now reserve the actual header height, preventing their larger controls from overlapping adjacent UI.
- Common dock controls, playback pause/step and workspace navigation use theme-colored SVGs with translated accessible names. Text labels remain where they explain unfamiliar actions.
- Studio cards stack fields according to their own width. Descriptions, card actions and Manage section names wrap. Short windows give more height to the working page by reducing the Manage heading and hiding its decorative stability card.
- The version updater accepts the existing dynamic translation version labels while retaining transactional preflight and rollback.
- Automatic CI no longer invokes audits hard-coded to obsolete engine releases. Rust setup matches the repository pin, and `pnpm run audit` explicitly runs current source checks without old release-report prerequisites. Plain `pnpm audit` is the package manager's separate dependency-security command.
- Current source/feature/field/panel inventories expose all registered operations and declared binding routes. The browser audit now checks docked and maximized routes, pending edits/save, locales, palettes, enlarged text and collapsed-header containment.

See [every edit](EDIT_LEDGER_26_31.md), [audit scope and limitations](ISSUE_CLOSURE_26_31.md), [feature inventory](FEATURE_INVENTORY_26_31.md), [source map](SOURCE_MAP_26_31.md), [panel inventory](PANEL_INVENTORY_26_31.md) and [Godot reference decisions](COMPETITIVE_REVIEW_26_31.md).

## Verification and release files

The source-bound executed-gates report inside the release-evidence ZIP determines which checks actually passed. The 26.31 plan runs native/Web builds, TypeScript, Rust workspace tests, compiled WASM probes, workspace/resize behavior, browser panel and downloaded-game flows, Windows and renderer-disabled authority smoke, manual validation and archive hygiene. Unchanged historical performance, exhaustive template, networking and dependency matrices are not rerun or presented as new evidence.

The release contains the eleven requested files: Windows portable EXE, setup EXE, MSI, Web/source/reference-project/release-evidence ZIPs, these notes, the edit ledger, license and SHA256SUMS.txt. A completed release is accepted only after packaging and verification of the actual source and artifact hashes. Do not reuse historical executables under new filenames.

Unsigned Windows binaries require WebView2. Installation/uninstallation on a disposable clean machine, signing, physical mobile/assistive-device checks and other native platforms remain outside local qualification. Native physics JSONL is not a complete native scripted game server. Web hosting is online-only; see [hosting](WEB_HOSTING_26_31.md).
