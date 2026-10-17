# 26.15 directional-light Inspector capability notice

Integration notice: this journal retains historical staged paths, intermediate failures and pending-at-the-time entries. Its reviewed authored files are integrated for26.15 after26.14 was separately finalized. Current behavior and final evidence boundaries are in [26.15 release notes](RELEASE_NOTES_26_15.md); source-bound executed gates determine production/native qualification. Copied build/check roots and generated reports are not promoted as source authorities.

Consequence assessed: the renderer does not implement directional-light shadows. Leaving an active checkbox and softness slider would imply an effect that the renderer cannot produce. Disable both for Directional and explain the capability beside them; retain the stored values so a later supported light type restores the authored choices. No light type or saved scene value is normalized or cleared.

Every edit:
- src/components/RuntimeComponentsInspector.vue: copied the final active26.13 baseline (no14 edits exist here), disabled Directional castsShadows/shadowSoftness controls, associated both with the localized explanatory paragraph, added wrapping notice styling. ConfigPanel already embeds this owner and needs no15 edit.
- src/editor/lightInspectorCopy.ts: added matching English/German/Chinese capability text.
- verify-light-component.mjs: local staged compilation check for the actual SFC; it is not a browser or renderer proof.
- docs/VERSION_26_15_LIGHT_UI.md: this consequence and evidence ledger.

Verification: the actual SFC script, template and scoped styles compile with zero errors. Integrated15 typecheck will run with the next merged root build. Actual pointer, high-scale layout and renderer pixel evidence remain separate checks; this notice does not qualify the renderer itself.