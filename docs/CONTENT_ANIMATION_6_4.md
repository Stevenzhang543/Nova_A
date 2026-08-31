# Nova_A 6.4 content and animation production

Nova_A 6.4 adds bounded, deterministic interchange and reusable editor Resources without changing Project Format 2/schema 29 or any frozen public contract.

## Import and reimport

Use **Assets → Import assets** for Aseprite JSON metadata, TexturePacker JSON, common JSON atlases, Tiled JSON/TMJ/TSJ, and Tiled XML/TMX/TSX. Nova_A canonicalizes imported metadata, records the source hash and importer identity, and assigns every frame a stable ID derived from its source key. Reordering frames in an external tool therefore does not break animation references. The contextual **Overview** and **Slices** tabs show source format, texture path, pivots, source sizes, tags, frame time, collider points, and diagnostics.

Reimport compares the external source to the stored artifact. A successful reimport keeps the Asset UUID and stable slice IDs. A malformed, unsupported, or oversized source fails visibly and leaves the last valid imported artifact unchanged. Metadata is capped at 16 MiB, atlases at 65,536 slices, Tiled data at 4,194,304 cells, and individual collider polygons at 256 points. Large metadata is parsed in a time-bounded worker so editing remains responsive; repeat sources use a bounded deterministic cache.

If a source file moves, choose the asset and use the existing source repair/reimport workflow to select the new file. Confirm its format and texture reference in **Overview**, then reimport. Undo restores the previous Asset Database snapshot.

## Reusable Resource assets

From **Assets → More**, create a Material, Animation Library, Input Map, Physics Material, Theme, or Data Table Resource. A `.nova-resource` contains a stable ID, kind, optional parent reference, and bounded typed data. Choose it to open the contextual **Resource** tab.

Use **Create local override** to inherit a shared Resource. The child stores only locally edited keys; the resolved preview displays the deterministic parent-to-child result and inheritance chain. Parent cycles, missing parents, kind mismatches, invalid JSON, and non-finite physics values are reported by the Inspector, Project Health, and Build validation. Resource assets and their references are included in Web and native game packages.

## Rigging and animation

Open a rig in **Animation**. Select a bone to see normalized skin influence as a color/opacity heat view. **Auto weights** computes deterministic inverse-distance-to-bone-segment weights, limits each vertex to eight influences, normalizes every sum, and refuses work above two million bone/vertex comparisons instead of freezing the editor. Existing rig constraints remain editable and are respected by runtime pose evaluation.

Enable **Onion skin** around the playhead to inspect neighboring runtime samples while using the existing curve editor. **Retarget preview** reports matched and missing source/target aliases before playback. **Root-motion preview** samples the same runtime interpolation path used by the player and reports start/end delta, total distance, duration, and sample count.

## Performance and fidelity contract

Import caching and workers affect only editor scheduling; canonical bytes and exported game content remain identical. The Low-end profile can reduce editor presentation cost but does not change authored data, physics ticks, runtime animation, player rendering quality, controls, or motion. The larger data-oriented scheduling, latency, 1%-low, cancellation, and worker-equivalence program remains the dedicated 6.8 milestone and builds on the v6.4 before/after evidence.

## Release qualification

The v6.4 gate covers golden and malformed importer fixtures, reordered-frame identity, pivot/frame precision, Resource inheritance/cycles/serialization, retarget/root-motion/weights, large atlas/timeline timing, export inclusion, EN/DE/ZH layout, Web/native builds, player launch, exact eleven-file packaging, and non-circular SHA-256 verification. Publisher signing, independent clean-machine and hardware/accessibility certification, matching-host non-Windows builds, and real-duration soak remain external gates until independently executed.
