# Nova_A 26.04 release notes

Machine version: **26.4.0**. Project Format: **2**. Schema: **29**. Rhai API: **2**. Visual Graph: **1**.

## Added

- Bounded two-way asset dependency visualization with direct/transitive counts, missing references, cycles and canonical node selection.
- Deterministic thumbnails for non-image assets and a unified production profile for importer provenance, cache, slices, nine-patch, vector/SDF, fonts, audio, localization, Resources and export groups.
- Named variants for Material, Animation Library, Input Map, Physics Material, Theme and Data Table Resources, including inherited variant resolution and local overrides.
- MP3/FLAC signatures and CSV/PO/ARB localization validation in the production source catalog.
- Deterministic trusted offline template/package discovery and a 50,000-record content-library audit.
- EN/DE/ZH labels, implementation contract, layout contract, task manual update, complete feature inventory and release evidence.

## Changed

- The Assets browser now shows deterministic previews for all content families while preserving image aspect ratio.
- The content Inspector is available for every asset; contextual Slices, Resource and Animation tabs remain conditional.
- Public and machine authorities advance from 26.03/26.3.0 to 26.04/26.4.0. Release/build/evidence commands target the new candidate.

## Preserved

No feature, animation, public API, project field or schema was removed. Existing assets, Resources, packages, scripts, graphs, templates, workspaces and games continue through the same save/runtime/export paths. Unsupported or invalid content remains visible and recoverable rather than being silently rewritten.

## Qualification boundary

Local automated, source, build and package evidence is included. Publisher signing, independent clean-machine/usability/accessibility/security review, matching-host non-Windows builds, hardware/store certification and real wall-clock soak are not represented as completed.
