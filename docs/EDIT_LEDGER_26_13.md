# Nova_A26.13 exhaustive edit ledger

Engine26.13.0. Baseline: finalized26.12 source digest `0d824ccfc9a79c7800fdec95a4f41bd9282b937172becc31d543cc733b2888a4`. This deterministic path-level manifest compares actual source bytes against that immutable baseline, including dirty/untracked authored sources. Every path below changed or was added; 0 authored paths were removed. Detailed individual refinements and observed defect consequences are retained in the six26.13 implementation journals.

## Consequences assessed before integration

Layout and wire geometry do not change generated program semantics. Explicit arrangement changes the requested positions as one undo action; saved manual positions and existing formats remain compatible. Draft retention is exact-asset session state, and project replacement checks it before mutation. Modal focus/labels and wrapping retain existing controls and model bindings; reset/apply/import affect workspace preferences. Tooling preserves fresh raw results and attachments and uses the preceding release archive for comparisons. Metadata changes identify the candidate so newly built binaries can be checked; they are not qualification claims. No finalized26.12 release is overwritten.

The final packaging source manifest records before/after source identity and generated outputs separately. Version qualification requires all declared local gates. Physical assistive technology, clean-machine installation, other platforms/hardware and extended soak remain external and visible.

## Files changed/added

- `Cargo.lock` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `Cargo.toml` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `README.md` — Present26.13 current behavior and link its notes/ledger, retaining historical feature material.
- `crates/nova_format/src/lib.rs` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `docs/EDIT_LEDGER_26_13.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/IMPLEMENTATION_TRACKER_26_12_TO_26_16.md` — Record finalized26.12 and integrated26.13 work without treating pending production or external checks as passes.
- `docs/LAYOUT_ENGINE_STAGE.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/PANEL_ACCESSIBILITY_REVIEW_26_13.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/PROJECTION_AUDIT_26_13.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/RELEASE_NOTES_26_13.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/VERSION_26_13_UI.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/VERSION_26_13_WORKSPACES.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `docs/WORKSPACE_REVIEW_26_13.md` — Record detailed26.13 consequences, implementation, every edit and evidence boundaries; retain historical failed/staged observations with integration notice.
- `manual/MANUAL.de.md` — Add the current localized26.13 task lesson and release/engine metadata, retaining prior teaching chapters and anchors.
- `manual/MANUAL.en.md` — Add the current localized26.13 task lesson and release/engine metadata, retaining prior teaching chapters and anchors.
- `manual/MANUAL.zh-CN.md` — Add the current localized26.13 task lesson and release/engine metadata, retaining prior teaching chapters and anchors.
- `manual/index.html` — Add the current localized26.13 task lesson and release/engine metadata, retaining prior teaching chapters and anchors.
- `package.json` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `reference-projects/README.md` — Add distinct26.13 reference links and expected task/output guidance.
- `reference-projects/projects/creator-v2613-blocks-game/README.md` — Add this26.13 reference README.md with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-blocks-game/expected-output.json` — Add this26.13 reference expected-output.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-blocks-game/project.nova` — Add this26.13 reference project.nova with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-blocks-game/test-controls.json` — Add this26.13 reference test-controls.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-code-game/README.md` — Add this26.13 reference README.md with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-code-game/expected-output.json` — Add this26.13 reference expected-output.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-code-game/project.nova` — Add this26.13 reference project.nova with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-code-game/test-controls.json` — Add this26.13 reference test-controls.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-mixed-game/README.md` — Add this26.13 reference README.md with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-mixed-game/expected-output.json` — Add this26.13 reference expected-output.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-mixed-game/project.nova` — Add this26.13 reference project.nova with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/creator-v2613-mixed-game/test-controls.json` — Add this26.13 reference test-controls.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/server-v2613-headless-authority/README.md` — Add this26.13 reference README.md with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/server-v2613-headless-authority/expected-output.json` — Add this26.13 reference expected-output.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/server-v2613-headless-authority/project.nova` — Add this26.13 reference project.nova with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `reference-projects/projects/server-v2613-headless-authority/test-controls.json` — Add this26.13 reference test-controls.json with stable identities, exact current engine, expected controls/results and isolated qualification scope.
- `scripts/audit-v26.13-panels.mjs` — Parse every Vue template/import/conditional/disclosure/control and source hash; distinguish source inventory from observed workflows.
- `scripts/generate-v26.13-reference-projects.mjs` — Generate and independently verify deterministic code/blocks/mixed games, layout-preserved Rhai, controls/oracles and exact-session authority.
- `scripts/generate-v26.13-teaching.mjs` — Add localized nested-loop/layout/workspace tasks and current manual identity while retaining historical lessons.
- `scripts/lib/browserUserAudit.mjs` — Isolated Edge/CDP real mouse/key/file-picker/download helpers, measured surfaces, retained screenshots and clean profile disposal.
- `scripts/lib/milestoneAuditBundle.mjs` — Aggregate only newly executed passing reports and embed bounded actual screenshots/downloads with SHA256 hashes.
- `scripts/probe-native-key.mjs` — Disposable browser probe documenting native Enter/Space text/keypress behavior used by the user harness.
- `scripts/verify-v26.13-authoring.mjs` — Run all four current-production browser workflows sequentially and retain their raw screenshot/download evidence.
- `scripts/verify-v26.13-focus.mjs` — Verify the genuine26.12 baseline source digest, run affected behavior/performance suites and retain raw inventory/results.
- `scripts/verify-v26.13-layout.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-panel-accessibility.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-panel-controls.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-panels.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-project-authoring.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-project-departure.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-projection.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-studio-authoring.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-studio-drafts.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-studio-layout.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-workspace-authoring.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `scripts/verify-v26.13-workspaces.mjs` — Execute the named actual26.13 behavior/user regression suite, retain fresh scoped results, and fail on observed mismatches; browser suites preserve real-input captures and downloads.
- `src-tauri/Cargo.lock` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `src-tauri/Cargo.toml` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `src-tauri/tauri.conf.json` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `src/App.vue` — Own the single project-departure confirmation across launcher/editor routes.
- `src/assets/main.css` — Correct measured-Studio grid ownership, named-container specificity, scaled form sizes, visible grips and opaque maximized panels.
- `src/components/AnimationPanel.vue` — Name conditional controls, wrap track/property forms and keep editing shortcuts inside text fields.
- `src/components/AudioSystemPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/AutomationStudio.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/CommandPalette.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ConfigPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ConfirmDialog.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ConnectionBuilder.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ConsolePanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ContentAssetInspector.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/CreateObjectPalette.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/CreatorOnboarding.vue` — Use canonical release identity; keep focused native button activation, trap modal focus and scope page shortcuts to dialog background.
- `src/components/DeviceInputPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/EditorBottomPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ErrorRecovery.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/EventSheetEditor.vue` — Retain exact unsaved event drafts, await departure choices, validate raw callback/priority/seed fields and improve wrapping/names.
- `src/components/ExternalChangeDialog.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/GraphProductionPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ManualViewer.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/MaterialGraphEditor.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/PackageManagerPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/PanelMaximizeButton.vue` — Shared named maximize/restore action with expanded state.
- `src/components/PanelResizeHandle.vue` — Shared visible pointer/keyboard resize, Shift step, Home/End, reset, Escape and cancelled gesture cleanup.
- `src/components/ParticleGraphEditor.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/PresentationPanel.vue` — Readable localized audio/render controls, narrow snapshot rows and full-width scale-aware numeric fields.
- `src/components/ProjectManager.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/RecoveryCenter.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/RenderingPanel.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/SceneSideBar.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/ScriptStudio.vue` — Measured resizable code panes, reachable commands/natural tabs, full dirty-tab recovery, conflict review and one-shot fresh graph arrangement.
- `src/components/ScriptWorkspace.vue` — Guard mode switching, provide real keyboard tabs and wrapped Help, and request first measured projection layout once.
- `src/components/ShortcutEditor.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/StudioDraftConflict.vue` — Localized saved/draft comparison with reachable Keep/Discard actions and bounded preview only; retain full recovery source.
- `src/components/StudioStatusDialog.vue` — Improve named controls and container-sized wrapping and/or attach shared modal focus. Exact field/action changes are listed in VERSION_26_13_WORKSPACES.md and PANEL_ACCESSIBILITY_REVIEW_26_13.md; existing bindings are compared against the frozen26.12 baseline.
- `src/components/VisualGraphEditor.vue` — Measured cards/pins and panes; undoable selected/full worker layout, cancellation, routing and keyboard wiring, search/compact nodes, exact draft recovery, readable nonoverlapping comment creation and one-step viewport undo.
- `src/components/WorkspaceManager.vue` — Apply named layouts, show import/capacity errors, retain existing export/import controls and modal focus.
- `src/editor/eventSheetDraftValidation.ts` — Reject invalid raw callback identifiers, priorities and seeds before any saved-document normalization.
- `src/editor/modalFocus.ts` — Contain visible top-modal Tab/focus, restore surviving triggers and dispose shared listeners after the last modal.
- `src/editor/panelAuthoringGuards.ts` — Editable-target shortcut detection and stale/concurrent/failed-save-safe authoring transitions.
- `src/editor/panelControlCopy.ts` — English/German/Chinese contextual control names and Event Sheet decision/errors.
- `src/editor/panelLayout.ts` — Finite measured dock constraints and scale-aware resize/reset calculations.
- `src/editor/projectDepartureCopy.ts` — English/German/Chinese project discard/cancel/error explanations.
- `src/editor/projectDepartureGuard.ts` — Serialize replacement decisions against the actual project and every pending draft revision.
- `src/editor/scriptStudioState.ts` — Retain source explorer/details dimensions and focus/compact preferences.
- `src/editor/studioDraftRetention.ts` — Keep full exact-live-asset drafts and active providers; distinguish original draft base from saved-at-snapshot source for failed-project rollback.
- `src/editor/studioLayoutCopy.ts` — English/German/Chinese Studio sizing, focus, layout, routing and draft conflict copy.
- `src/editor/studioPaneLayout.ts` — Finite container-derived Studio pane budgets and collapse/focus/resize rules.
- `src/editor/workspaces.ts` — Remember preset dimensions and project scope, atomically bound custom imports, and apply named saved layouts.
- `src/i18n.ts` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `src/layout/EditorLayout.vue` — Coordinate dock maximize/restore and covered-panel inert focus; move the shared confirmation host to App.
- `src/panels/SettingsPanel.vue` — Label every input-binding field and its search/device controls; wrap device/code/vector/scale/gamepad/dead-zone and advanced settings.
- `src/projects/projectFormat.ts` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.
- `src/projects/projectManager.ts` — Guard new/open/upgrade by exact pending revisions; commit save directory only on success and restore conflict-aware drafts after load rollback.
- `src/visual/graphEditorGeometry.ts` — Scale-correct focal/drag geometry, hit areas and clear-space comment placement at readable zoom.
- `src/visual/graphLayout.worker.ts` — Execute the shared layout engine in a disposable worker with progress and explicit errors.
- `src/visual/graphLayoutEngine.ts` — Pure deterministic measured-node layout, control regions, obstacle routing, explicit failure diagnostics, bounded inputs and corrected empty-selection route-only behavior.
- `src/visual/graphLayoutService.ts` — Per-request worker ownership, abort/stale reply handling, timeout and same-engine cooperative fallback.
- `src/visual/graphStudioState.ts` — Retain graph presentation preferences and exact-asset one-shot initial arrangement requests.
- `src/visual/graphSyntax.ts` — Index token/span ownership to remove repeated whole-source scans while preserving exact source/VM semantics.
- `src/visual/graphTypes.ts` — Validate and serialize additive finite reroute points with per-edge and document bounds.
- `src/visual/graphWireEditing.ts` — Validate compatible pin connections, bounded reroute editing and keyboard wire operations.
- `tests/fixtures/migrations/public-schema-expected.json` — Update only the26.13/26.13.0 release authority or expected migration target; dependency versions and public schema remain unchanged.

## Generated outputs and reproducibility

Focus preflight correction: extract the hash-verified26.12 baseline into a uniquely owned directory below this checkout's excluded `.cache`, where the installed Vue dependencies resolve naturally. Extraction in the OS temporary directory could not resolve Vue while bundling the unchanged baseline. The archive bytes and baseline digest checks remain identical; only temporary dependency resolution changes. The failing preflight log is retained.

The final Event Sheet handlers also exposed stale fixtures in `scripts/verify-v26.13-panel-accessibility.mjs`: its extracted Save/departure functions lacked the now-required conflict, saved-base and recovery-provider dependencies. The fixture now exercises those real dependencies, retains failed writes, checks conflict-before-write and rejects discard when the saved source is missing or malformed. All original40 groups plus2 new groups passed against the immutable26.12 baseline; product behavior was unchanged by this verifier repair.

WASM glue, dist, Rust/Tauri targets, temporary merged checkouts, report JSON/PNGs/downloads and qualification directories are generated outputs outside the authored source snapshot. Four reference directories and four manuals are deterministic authored deliverables listed above. The final eleven release artifacts are written only after source/build/gate hashes agree. Focus results include all SFC conditional states, fresh graph/workspace/draft tests and actualVM comparisons; the authoring bundle embeds real screenshots and downloaded project/workspace documents.
