# Nova_A 26.22 migration and compatibility notes

Engine/build authorities are 26.22.0. The packaged qualification evidence, source snapshot and checksums establish the release identity; this document alone is not a qualification report.

Project Format 2 and schema 29 remain unchanged. No asset UUID migration or automatic project rewrite is required for the editing changes. Keep the existing project backup and reopen the saved project before replacing an older release installation.

Numeric expression controls retain malformed and out-of-range drafts for correction. Escape restores the authored value. A rejected draft can prevent Save, Undo or playback until it is corrected or cancelled. Valid edits are committed before those boundaries. The original free numeric companion of a slider remains available where the slider window is only a convenience range.

Public Entity forwarding setters now throw a RangeError for nonfinite numeric values, vector coordinates or color channels before modifying the underlying component. Callers must correct NaN and infinity at their source. This does not change the separate Unlimited joint-limit control or its persisted representation. Finite values retain their previous ranges.

Separate field edits remain separate history entries. Long inspector and mixer slider gestures are one transaction. Failed serialization leaves the active transaction available for correction or cancellation. Loading malformed project/component records preserves the previously open document. Prefab overrides, selection, scene references and reviewed merge identity have separate regression cases.

The local development migration audit passed all 225 authored reference projects through the current rebuilt WASM migrator and repeated migration. This is not frozen 26.22 qualification, a clean-machine installation test, or proof that every reference game was executed. Final migration, Web/Windows builds, exported-reference workflows and the eleven release-file hashes remain required.

See [implementation record](IMPLEMENTATION_TRACKER_26_22.md), [editing contract](VERSION_26_22_TRANSACTIONS.md), and [known capability gaps](GAP_REGISTER_26_22.md). Other operating systems, independent accessibility/device acceptance, signing and long-duration soak remain separately qualified external checks.

## Additional compatibility corrections

Legacy rope `breakForce` and `breakTorque` values of JSON null preserve unlimited thresholds, matching Joint2D components. Finite values, including zero, retain their authored value; native solver interpretation remains covered separately. The serializer writes unlimited thresholds explicitly as null. Recent-project bookkeeping no longer changes the authored timestamp after saving, and new asset records include the same default metadata that hydration previously added. No project format or schema change is introduced.

Triangle vertex setters reject malformed/nonfinite coordinates atomically. Input binding indices must be integers from 0 through 31. Project repair requires the source and output that were reviewed; intervening edits or changed repair output require a fresh preview. Global Save/export/Play/Step reject unsaved studio assets until their owning editor saves or explicitly discards them. Dedicated animation preview retains its draft audition workflow. Graph unlinking preserves code and literal/comment content; replacing a node retains compatible external wires. Newly embedded image names match their stored paths so reopen does not rename them.
