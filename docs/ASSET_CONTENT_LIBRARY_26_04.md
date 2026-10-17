# Nova_A 26.04 asset, content, and reusable-library contract

Nova_A 26.04 is additive. Project Format 2/schema 29 and Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1, Workspace Document 3 remain frozen. Existing assets and Resource version-1 documents remain readable; the optional `variants` and `activeVariant` fields are ignored safely by older Resource readers.

## Canonical ownership

The Asset Database remains the only owner of asset identity. Source path, content hash, importer identity/version, normalized settings, generated outputs, dependency references, source-control state, collections, favorites, and editor-only/export-group status are projections of the same record. UI cards, the Inspector, repair tools, build closure, and exported players may not keep independent asset identities.

`asset://<uuid>` is the stable reference. Renames and moves preserve UUIDs. Reimport preserves stable slice IDs derived from source identity and slice names/frames. A changed source or setting invalidates its cache key deterministically; a valid matching key can reuse the recorded worker result. Missing or malformed sources produce diagnostics and never execute imported data.

## Import pipelines

- Aseprite JSON, TexturePacker/common atlas JSON, Tiled JSON/TMX/TSX, sprite sheets, SVG, bitmap images, fonts, WAV/OGG/MP3/FLAC audio, CSV/PO/ARB localization, Resources, scripts, graphs and normal binary content are bounded before parsing or decoding.
- Worker imports cap source size, slices, atlas frames, map cells, diagnostics, and generated output. Import failure does not partially replace the previous usable asset.
- Sprite animation slices retain frame duration, pivot, collider, tag and source-region metadata. Nine-patch borders are finite, non-negative and visible in the production profile.
- SVG external-resource behavior is explicit. Font distance-field and declared-language coverage, audio preload/streaming/codec/loop regions, and localization locale/fallback are visible rather than implicit.
- Deterministic non-image thumbnails are generated from type, UUID, name and source fingerprint; they decode or execute nothing. Image thumbnails retain their aspect ratio.

## Dependency visualization and export closure

The Inspector builds a bounded two-way projection from production references. The left lane shows assets that use the selection; the right lane shows its direct and transitive dependencies; the center remains the selected canonical record. Cycle members and missing references are visible. Clicking a present node selects the actual Asset Database UUID. The view stops at 2,048 nodes and reports truncation rather than freezing the editor.

Build closure starts from scenes and explicitly included content groups, follows canonical dependency edges, rejects unresolved required references, and removes editor-only or unreachable content. Cycles are diagnosed deterministically. Export never silently replaces missing assets or includes a package solely because it appears in an editor collection.

## Reusable Resources and variants

Material, Animation Library, Input Map, Physics Material, Theme and Data Table Resources share one inheritance model:

1. Resolve the oldest valid parent first, up to 64 levels.
2. Deep-merge each child base document.
3. If a named variant is selected, deep-merge that variant at every inheritance level after its base layer.
4. Apply the selected asset's local override in the same order.
5. Reject cycles, invalid parents, excessive depth, invalid kind data and more than 128 variants.

Variant names are normalized, deterministic and explicit. `Default` means no variant override. Creating or editing a variant does not mutate a parent. Saving records one undo/history transaction; creating a local override creates another Asset Database resource.

## Offline discovery, provenance, and trust

Offline template and package entries are searchable by name, ID, kind, provenance and tags. Results are deterministic, trusted entries sort first, and online-only content is not represented as locally available. Package validation checks manifests, hashes/signatures when supplied, contribution limits and declared permissions without loading executable code. Installing or enabling a package remains an explicit user action.

## Limits and failure behavior

- Dependency projection: 2,048 visible nodes.
- Library audit and virtual asset window: 50,000 records.
- Offline discovery result: 10,000 entries.
- Resource inheritance: 64 layers; named variants: 128.
- Thumbnail cache: 512 deterministic entries.

Limit hits, malformed data, missing references, cycles, stale caches and non-reproducible provenance are visible attention states. They do not delete authored data, fabricate success, or block unrelated editor navigation.

## Release audit

26.04 exercises golden and malformed importer input, reorder-stable slices, Unicode paths, moved-source repair, dependency cycles and missing references, deterministic thumbnails/hashes, cache invalidation, named variants, offline sorting, package-permission source gates, export stripping, 50,000 assets, EN/DE/ZH source coverage, TypeScript, Rust/WASM, production web/native builds, historical projects, interaction reachability, layout containment, evidence and the exact eleven-artifact package. Publisher signing, independent clean-machine/usability/accessibility/security review, non-Windows matching-host builds, hardware/store certification and a real-duration soak remain external.
