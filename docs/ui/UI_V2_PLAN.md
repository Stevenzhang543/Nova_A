# UI V2 integration plan — 26.33

The completed UI rebuild remains the visual source. Phase II repaired engine integration rather than adding another editor shell. Core runtime/browser contracts are stable enough for this dedicated integration pass.

1. Preserve shared tokens, UiButton/UiSlider/UiTabs/UiDialog and persistent workspace hosts. Do not repeat the prior visual redesign.
2. Verify repaired joint descriptors through the existing object composition controls and descriptions; no alternate joint editor.
3. Verify runtime save controls and clear load/commit/recovery status in their existing runtime tools. Preserve distinction from project Save.
4. Confirm editor shortcuts resume after Stop and do not consume game keys during Play/Pause.
5. Re-run actual all-panel navigation, compact/stacked numeric controls, translations and scaling against the release candidate. Inspect captured images and nearby surfaces; fix observed defects only.
6. Run real reference-game edit/undo/save/reopen/export and persistent-shell navigation checks. No screenshot-only functional claims.
7. Record results in MIGRATION.md, DECISIONS.md and the 26.33 edit ledger. Final release evidence must match frozen source.

No new visual pattern or dependency is proposed. Game UI is separately verified through canvas text entry, checkbox interaction and the exported player; editor geometry cannot substitute for those checks.
