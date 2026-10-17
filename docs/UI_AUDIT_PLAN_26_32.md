# Nova_A 26.32 — visual audit plan and research

The GUI refresh changes shared editor styling and reusable numeric controls. The high-value risks are fields crossing cards or docks, stretched scalar controls, long translated labels, inaccessible icon actions, lost pending edits after layout changes, and regressions in keyboard navigation. The new audit targets these consequences; it does not repeat unrelated physics, networking, or historical product matrices.

## Primary-source design study

- [GDevelop Scene Editor](https://wiki.gdevelop.io/gdevelop5/interface/scene-editor/) separates object resources from selected-instance properties, groups position/size/rotation fields, exposes panel toggles in the toolbar, and permits moving panels. Adopt these organizational ideas: contextual properties, compact related values, and discoverable dock controls.
- [GDevelop Events Editor](https://wiki.gdevelop.io/gdevelop5/interface/events-editor/) changes the toolbar for the active editing context, keeps undo/redo available, and groups event editing actions. Adopt contextual tool grouping and preserve keyboard equivalents when replacing decorative glyphs.
- [GDevelop interface](https://wiki.gdevelop.io/gdevelop5/interface/) presents project editors in tabs, with a clear preview action and separate project/preferences access. Keep the persistent workspace/navigation hierarchy distinct from the active tool's properties.
- [Official tank-shooter tutorial](https://wiki.gdevelop.io/gdevelop5/tutorials/tank-shooter/) teaches selecting an object, opening its property editor, then editing behavior and instance values. Audit real selected-entity fixtures, not only empty panel shells.

These are design observations, not imported source or copied artwork. No GDevelop code, images, or documentation paragraphs are bundled by this audit. Other 26.32 research records cover Godot and other references.

## New audit and evidence

`scripts/verify-v26.32-layout-user.mjs` preserves the 26.31 audit and adds a separate current-version audit. It records a PNG for every inspected route and writes `release-audits/v26.32-layout-user-gallery.html` as an image index. The JSON report ties every screenshot to its actual route, viewport, control count, field widths, containing host and any detected overflow. A geometry pass is not a substitute for looking at the screenshots.

The script activates the launcher and new-project category views, then cancels creation without creating project files. It also activates all currently exposed workspace routes, every bottom dock both docked and maximized, known nested tool navigation, all Manage sections and their settings/build/rendering branches. It opens non-destructive disclosure sections, plus workspace/shortcut/command dialogs. Selected tilemap, world and network fixtures expose conditional tools. EN/DE/ZH, all existing palettes, enlarged text, narrow landscape and keyboard/touch inputs remain represented without an expensive Cartesian product.

Fields are checked against their containing card or horizontal scroll host; intentional horizontal lists/canvases are not treated as panel overflow. Scalar numeric and range controls also have a generous upper-width usability guard that scales with computed text size. Single-line text/number/select heights must remain below a generous text-scaled ceiling; textarea and range controls are excluded from that height rule. Text and source editors are not subject to the scalar width cap. Alignment is intentionally not asserted as centered: normal text uses start alignment and numeric values use end alignment in this version.

A real transform edit must survive resize and maximize/restore, then undo, redo and downloaded save. This guards the connection between the refreshed controls and project data. Accessible SVG names and complete collapsed-header containment remain checked. Playback buttons and the persistent layout/command summaries must fit the viewport at every inspected state; the intentionally scrolling workspace tab strip is excluded from that toolbar rule.

## Limits and economical selection

All available navigation routes are enumerated from the current DOM. This is not every possible component branch: native pickers, device permission failures, remote services, installed plugins, all asset types and every runtime error require their own fixtures. Screenshots are viewport images; offscreen content receives geometry checks but is not automatically claimed visually reviewed. Report the actual visited count and reviewed screenshot set after execution.

Run the browser audit after the GUI build is ready. First use its failure screenshot and measured geometry to fix an actual defect, then repeat this affected audit. Do not repeatedly rebuild native installers or run unrelated physics suites while iterating CSS. Final release qualification remains the release owner's responsibility.

## Edit consequences

Only a new audit script and this document are added by this work. Existing 26.31 scripts and application behavior are unchanged. Broader traversal may reveal previously hidden layout defects and fail sooner; screenshots increase evidence size. Real editing occurs only inside the disposable browser profile and downloaded evidence copy; source reference projects remain untouched.

The first diagnostic traversal exposed collapsed search fields, an excessively wide large-text rendering slider and, during screenshot review, vertically stretched numeric inputs. The audit now checks single-line heights as well as widths. Geometry defects are aggregated into a final failing check, allowing one traversal to diagnose multiple routes; interaction failures still stop immediately. For the launcher creation dialog, viewport containment applies to its fixed scrim while its tall card remains intentionally vertically scrollable. Candidate failures remain separate from the final qualification evidence.
