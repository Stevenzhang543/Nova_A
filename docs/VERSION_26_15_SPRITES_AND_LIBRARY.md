# 26.15 sprite identity, asset previews and reference discovery

Integration notice: this journal retains historical staged paths, intermediate failures and pending-at-the-time entries. Its reviewed authored files are integrated for26.15 after26.14 was separately finalized. Current behavior and final evidence boundaries are in [26.15 release notes](RELEASE_NOTES_26_15.md); source-bound executed gates determine production/native qualification. Copied build/check roots and generated reports are not promoted as source authorities.

Development journal. These files remain isolated below `.cache/development-v26.15`; the active26.13 release source is immutable. This journal records work and failures as they occur, not a completed26.15 release.

## Consequences assessed before changes

Repeated grid slicing previously produced fresh UUIDs and copies of the entire image source. Imported atlas metadata did not have a rendered sprite consumer, and trimmed frames lost their original pixel offset. New frames have an additive validated `derivedSprite` descriptor with owner UUID, stable source-frame key, image UUID, pixel rectangle, original dimensions, trim offset, rotation and imported pivot. They share the original image pixels. Existing legacy sliced images remain untouched; their historical copies cannot safely be guessed back into parent relationships. Older editors do not render the new derived-source representation; preserve a backup when returning to an older release. Project Format2/schema29 remains unchanged and the optional field is preserved by current save/export.

Slicing validates all geometry, keys and names before adding or updating records. Repeating it retains each live asset object, UUID, path/name and independent import-setting edits. Reimport prepares every affected existing child before committing the source. Missing frames or invalid local crops reject the candidate and retain the last working source/children, with an actionable error. Source renames/moves use UUID links. Dependency analysis and exact-reference repair include both atlas owner and image. Derived images cannot be independently reimported; use their original image/atlas.

Rendering normalizes clockwise-packed and trimmed frames into original source coordinates and applies any authored crop afterward. Pixel-space subregion calls use source pixels exactly once rather than cropping a previously cropped texture again. Temporary derived textures have a512-entry/64MiB bound and clear on project replacement, reimport and atlas publication. Decoded image fallback has a256-entry/128MiB bound; eviction cancels pending loads. Source-specific decode/budget failures avoid repeated frame-by-frame allocations and expose an actionable transient diagnostic. Successful reimport enables retry. Atlas content keys advance on successful publication, preventing a pending rebuild from caching old pixels under the future key.

## Every root-owned file edit so far

- `src/assets/derivedSprites.ts` — New strict descriptor validation, grid/atlas frame definitions,4096-frame and8192-dimension/16M-pixel limits, stable frame keys, detached child refresh preparation and imported-versus-authored pivot preservation. A TypeScript preflight found the frozen dimension default inferred as the literal8192; the parameter now explicitly accepts a number while keeping its default bound. Serialized UUID references normalize case.
- `src/assets/derivedSpriteTexture.ts` — New rotated/trimmed frame extraction in original coordinates, original-size transparent canvas output, source/geometry-keyed bounded LRU texture retention, diagnostics accounting and disposal. The CanvasImageSource cast is limited to decoded images/atlas canvases supplied by the database.
- `src/assets/types.ts` — Add optional typed `AssetRecord.derivedSprite` metadata.
- `src/assets/AssetDatabase.ts` — Replace repeated fresh-ID pixel-copy slicing with stable source-backed materialization; return the actual reactive database records consistently; preflight persisted derived metadata before clearing the current project; load/save the field; prepare dependent reimport updates and reject direct frame reimport; invalidate stale atlas regions; resolve uncropped/derived textures and pixel subregions; bound image decoding cache, cancel eviction work and expose cache/failure diagnostics.
- `src/assets/contentInteroperability.ts` — Retain and round-trip the imported trim offset instead of losing it while parsing atlas frames.
- `src/assets/assetReferences.ts` — Include derived owner/image references in dependency closure and exact metadata repair.
- `src/assets/TextureAtlas.ts` — Skip derived images when packing original sources, avoiding duplicated pixel decoding/atlas allocation.
- `scripts/verify-v26.15-sprites.mjs` — Execute actual database, importer transaction, serializer, dependency-closure and texture-cache cases with explicitly controlled decoding/canvas IO. First run found raw/proxy handle inconsistency in newly returned slices; the function now returns canonical live records. One test used the wrong readTextAsset argument and was repaired. All16 current groups pass; these are programmer tests, not pixel or user interaction evidence.
- `docs/VERSION_26_15_SPRITES_AND_LIBRARY.md` — This consequence review, exact edit ledger, results and remaining work.

## Evidence and work remaining

The existing43 asset groups still pass after the derived-sprite changes. The new16 groups pass: repeat identities/local edits, removed frame rejection, malformed/oversized grids, successful and failed parent replacement, direct-child reimport refusal, source/field save-load, malformed-load retention, dependency closure, trim metadata, atlas reorder, missing image refusal, exact UUID repair/moves, single pixel cropping and bounded cache cleanup. Source types passed after the literal-bound correction. Later image diagnostics still require the next full typecheck. Original failures remain in the staged reports folder.

Actual rotation/color pixel output, full image-cache pressure/disposal cases, UI preview/details/dependency/retry/cancel, slicing/animation and Tiled consumption, library metadata/manual links, user save/reopen/export and browser/native rendering comparison are still pending. No count-only or descriptor-only result completes those requirements. Renderer work is independently staged by the backend agent; media/interface work remains26.16.
## Preview integration and additional verification

The sprite suite now has21 passing groups, adding decoded-cache pressure/pending-load disposal, budget/retry diagnostics, serialized geometry authority, normalized UUID references and missing-owner/invalid-rectangle feedback. Non-image assets cannot carry derived metadata. Decoded dimensions of derived records come from the validated frame descriptor after load. The image-cache and typed asset modules passed typechecking before the latest UI integration.

- `src/assets/assetWorkflowCopy.ts` — New complete EN/DE/ZH preview/extraction/source/retry/batch vocabulary and actionable texture-diagnostic summaries.
- `src/components/AssetImagePreview.vue` — New real texture/region canvas preview with bounded display pixels, five-second retry deadline, ResizeObserver, source/generation invalidation, localized accessible name/error, and frame/observer disposal. It displays original and derived pixels through the same texture resolver.
- `src/components/EditorBottomPanel.vue` — Use the real preview for image cards and selected images; show slice failures and retain the previous assets; clear errors on selection change; hide source-sheet/atlas ownership controls on derived frames. Existing local crop/pivot/filter controls remain.
- `src/components/ContentAssetInspector.vue` — Add original-source navigation and explanatory linked-frame metadata, actual atlas-frame extraction with failure feedback, and an accessible slice-search name. Errors clear on asset change.
- `src/assets/derivedSpriteTexture.ts` and `src/assets/AssetDatabase.ts` — Adopt the renderer agent’s additive TextureRegion.revision contract: include parent content revision in derived cache identity and mark published atlas/image/derived output revisions explicitly. Immutable frames therefore avoid uploads on every render; dynamic renderer sources retain the renderer’s frame-based fallback.

These new UI files are not yet qualified by browser interaction or the all-panel matrix. Frame-animation creation, derived trim/automatic-slice behavior, Tiled instantiation, batch cancel/retry flow and library/task guidance remain work to do.

### Frame animation and source pixel analysis
Consequences checked before edits: frame identity must stay independent of metadata sort order; animation creation must be a separate undoable transaction and preserve imported per-frame duration. Pixel analysis must use full-resolution source/normalized linked pixels, reject oversized or changed sources before editing, and release temporary decode/canvas ownership.
- `src/assets/contentInteroperability.ts` — persist original frame order; infer unrotated dimensions for packed frames without original-size metadata.
- `src/assets/derivedSprites.ts` — use original playback order while retaining stable source identities.
- `src/assets/assetFrameAnimation.ts` — create ordinary serialized animation clips from already-extracted UUID frames with source timing, rejecting missing/duplicate frames before creation.
- `src/assets/assetPixels.ts` — bounded, cancellable original-pixel reader with source/settings staleness checks and deterministic cleanup; supports rotated/trimmed linked frames.
- `src/assets/AssetDatabase.ts` — transparent trim uses the bounded source reader and commits only current results.
- `src/components/EditorBottomPanel.vue` — automatic slicing and trimming share actual original pixels; expose failures; add frame-animation action; remove three impossible image comparisons from the non-image icon branch (merged Vue typecheck passed).
- `src/components/ContentAssetInspector.vue` — atlas frame-animation action opens the ordinary Animation workspace with an undo record.
Validation pending: expanded actual-module corpus, pixel golden proof and visible user workflows.

### Tiled runtime and rendering cache integration
Consequences checked: imported maps must reach the same TileMap component, serialization, physics/render/export consumers; missing sources must prevent scene mutation. Global IDs must clear all four flag bits, choose the owning firstgid, preserve flips and convert downward source rows into the Y-up scene. Refer to [Tiled JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/) and [global IDs](https://doc.mapeditor.org/en/stable/reference/global-tile-ids/). Unsupported layouts/encodings/collision geometry now fail with actionable import diagnostics rather than silently dropping content.
- `src/assets/tiledInterchange.ts` — bounded finite orthogonal map/atlas-tileset conversion, multiple tilesets, explicit original GIDs, collision geometry, per-frame animation durations and unsupported-input rejection.
- `src/assets/contentInteroperability.ts` — replace lossy Tiled converters with the explicit bounded implementation.
- `src/assets/tiledMapAssets.ts` — stable dependency binding, original-source resolution, detached merged tileset/layer preparation, firstgid/flip/row mapping and failure before creation.
- `src/assets/interchangeBindings.ts` — persist map-to-tileset/image UUID dependencies and retain unchanged-source references on reimport.
- `src/runtime/tilemap.ts` — consume imported maps as real tilesets; preserve variable frame durations; bound parsed-document cache and detach authoring copies; reuse valid runtime cell arrays; invalidate chunk output when image pixels become ready; additive explicit simulation clock hook for 26.16.
- `src/assets/AssetDatabase.ts` — publish atlas content revisions only after successful publication, clear normalized sprite caches, and expose decode/content revision for dependent draw caches.
- `src/editor/tiledMapAuthoring.ts` — prepare complete tilemap before scene creation, use one history transaction, and select the authored result.
- `src/assets/assetWorkflowCopy.ts` — translate the tilemap creation action into EN/DE/ZH.
- `src/components/ContentAssetInspector.vue` — imported-map scene action and visible dependency failure, opening the normal Tilemap workspace.
- `scripts/verify-v26.15-sprites.mjs` — seven additional animation/pixel analysis cases; 28 groups pass, including saved original order and stale/cancelled decoding. First new-corpus failure was a fixture generation invalidation omission, corrected without changing product resolution.
New Tiled/type/pixel/user checks remain pending.

### Batch ownership and narrow asset flow
Consequences checked: cancellation stops uncommitted work and preserves earlier successful imports; it must never cancel another unrelated importer job. Reimport uses retained original interchange text, not generated Nova JSON. Source/settings/project identity are rechecked across async reading. Small docks need an explicit return to Browse and full-width details, while desktop keeps a three-pane view.
- `src/assets/importPipeline.ts` — optional caller AbortSignal propagates to owned work and its listener is disposed.
- `src/assets/AssetDatabase.ts` — optional cancellation on import/reimport, including the final prepared-record/metadata commit; cancelled replacement preserves all authored fields.
- `src/assets/assetBatch.ts` — bounded sequential import/reimport batches, current source checks, retained original atlas/map input, per-item recovery, progress, cancellation and bounded result history.
- `src/assets/contentInteroperability.ts` — retain bounded original interchange source across serialization; simple TMX/TSX adapter resolves images/external sets and rejects unsupported XML metadata/compression.
- `src/components/EditorBottomPanel.vue` — aggregate progress/cancel/failure details; one undo record for successful batch work; dispose batch on unmount; explicit Browse/Details at small container widths; wider desktop details.
- `scripts/verify-v26.15-tiled.mjs` — 10 actual-module import/identity/flip/runtime/cache/animation/closure groups pass. All43 prior asset groups also pass after Tiled changes; the deliberately failed atlas decode remains logged as failure-recovery evidence.
Batch/new layout user and cancellation tests pending.

Batch review follow-up: `src/assets/AssetDatabase.ts` now owns an explicit project-session epoch, rejecting late import commits after project replacement; `src/assets/assetBatch.ts` stops remaining queued files on epoch change; `src/components/EditorBottomPanel.vue` avoids stale selection/history writes and watches the already-initialized asset selection store. These prevent cross-project writes and an initial setup temporal-dead-zone error.

### Explicit source binding repair
Consequence checked: an initially missing/ambiguous image has no UUID for the generic missing-reference repair to replace. The imported source therefore needs its own typed selector, saving only the selected dependency and preserving source identity.
- `src/assets/interchangeAuthoring.ts` — typed atlas/map image and external tileset slots, strict current-project/asset-kind checks, transactional UUID binding.
- `src/components/ImportedAssetBindings.vue` — readable source selectors and navigation with explicit failure feedback and one undo transaction; stops duplicate parent change handling.
- `src/assets/assetWorkflowCopy.ts` — complete EN/DE/ZH source-binding vocabulary.
- `src/components/ContentAssetInspector.vue` — expose source binding repair in the overview.

### Resource draft ownership
Consequences checked: leaving Assets or choosing another asset must not lose invalid JSON, per-variant edits or an unfinished variant name. Conflicted saved content must require an explicit review choice before overwrite. Resource source data is only committed through its existing validator and ordinary undo/save path.
- `src/editor/studioDraftRetention.ts` — additive resource kind on final14 blueprint-capable baseline; shares project departure/rollback ownership with code, graph, events and blueprint drafts.
- `src/components/ContentAssetInspector.vue` — retain/restore full resource editor state by live record/project; conflict comparison and explicit keep/discard; preserve current variant edits when switching; reject invalid variant text without dropping it; clear drafts only on successful save/discard.
- `src/assets/interchangeAuthoring.ts` — reject nested maps as external tilesets; recompute all remaining source diagnostics after a binding edit rather than hiding unrelated missing dependencies.
Validation pending: actual handler/user resource draft corpus.

Actual browser follow-up: importing, extracting, trimming and creating the frame animation passed, then entering Tilemap hung the page. `src/runtime/tilemap.ts` read helpers (including streaming boundary count used by a Vue computed value) rebuilt live reactive arrays on every query. They now use a read-only structural view: valid runtime data is reused, malformed data is normalized into a detached view. Mutating authoring operations keep their explicit normalization. This removes repeated reactive invalidation and preserves runtime cell-array identities; the browser workflow is being rerun.

### Imported map ownership and editing
Consequences reviewed: saving a TileSet over an imported map would erase its layers and source links. Definition edits now require an explicit independent copy; map painting remains available. The copy shares stable image dependencies and is included through ordinary export closure. Reimport updates the original only.
- `src/runtime/tilemap.ts` — refuse destructive imported-map save; add complete editable TileSet copy.
- `src/components/TilemapPanel.vue` — source-ownership explanation and copy transaction; definition controls disabled until copied; successful definition edits now record undo; per-tile preview uses its actual source and region instead of the selected tile's image/grid.
- `src/assets/assetWorkflowCopy.ts` — EN/DE/ZH ownership/copy and saved-resource labels.
- `src/components/ContentAssetInspector.vue` — label resolved data as saved runtime values so an unsaved draft is not mistaken for live preview.
- `src/assets/contentInteroperability.ts` — convert XML numeric/boolean layer attributes; explicit zero offsets and invisible layers retain their intended values.
- `scripts/verify-v26.15-asset-authoring.mjs` — correct Tilemap workspace selector after the genuine freeze was removed.

Resource/capture review: `ContentAssetInspector.vue` now rejects array/null override JSON, refuses duplicate or invalid variant creation before altering the current draft, and requires a saved base for Create override. Generic images no longer show unrelated animation-production instructions. `assetWorkflowCopy.ts` provides matching EN/DE/ZH explanations. `TilemapPanel.vue` initializes its source selector to the actual imported source identity instead of showing a blank primary ID. Actual extracted-handler regressions are being added.

Visible user-audit follow-up: source rename and native folder drag/drop preserve the atlas UUID, and TileSet copy/edit/Undo/Redo pass. Initially missing image diagnostics were saved on pipeline metadata but the overview rendered only interchange metadata, hiding the failure. `ContentAssetInspector.vue` now deduplicates and displays both real diagnostic sources; `ImportedAssetBindings.vue` exposes malformed source-slot errors instead of silently presenting an empty form. Binding repair clears only the resolved diagnostic.

`verify-v26.15-resource-handlers.mjs` adds14 passing actual SFC/production-resource handler groups (explicit view/history/cache fixtures). Initial two harness setup failures concerned missing browser document stubs and are retained; no product pass came from those attempts.

Ownership follow-up: `ContentAssetInspector.vue` stops draft/search change events from reaching the parent importer-settings history/atlas-rebuild handler; each saved content action already owns its transaction. `importRetention.ts` adds a bounded module-cache cleanup registry, `importPipeline.ts` invokes it at project-session disposal, and `runtime/tilemap.ts` registers its parsed TileSet cache, so old project documents are released immediately. `verify-v26.15-tiled.mjs` adds an immediate-disposal regression.

Audit helper correction: `scripts/lib/browserUserAudit.mjs` counts enabled options for native Home/ArrowDown selection. Native Home skips disabled placeholders, so the prior helper selected one item too far when repairing a missing source. This was an automation mismatch; the product selected the actual keyboard-targeted image. `verify-v26.15-asset-authoring.mjs` uses this staged helper until promotion.

Screenshot review: `EditorBottomPanel.vue` replaces the persistent absolute import-job overlay with an inline bounded disclosure. It opens for running jobs, collapses on completion, and retains individual retry/cancel/log controls for explicit review. Aggregate batch progress stays separate. This removes an overlay that covered grid controls even after all imports completed.

### Fresh release reporting and observed asset flow
Consequences checked: passing development fixtures must never be presented as production qualification. New `scripts/lib/assetAudit15.mjs` reads the actual package and distinguishes a source overlay from an integrated26.15 root. The six verifier files `verify-v26.15-assets.mjs`, `verify-v26.15-sprites.mjs`, `verify-v26.15-tiled.mjs`, `verify-v26.15-batches.mjs`, `verify-v26.15-resource-handlers.mjs` and `verify-v26.15-library-metadata.mjs` now emit fresh timestamps, format/version and actual release/engine/source-mode identity without changing their behavioral assertions.

`scripts/verify-v26.15-asset-authoring.mjs` now records13 passing actual browser groups: blank creation; real import; atlas extraction/pixel trim; ordinary frame animation; real Tilemap mounting; editable source copy/edit/Undo/Redo; actual native HTML folder drag/drop and rename; missing dependency repair/navigation; invalid resource draft retention and successful save; a240-source cancellation/reimport sequence; partial failed-import recovery; actual project download; actual reload/file-picker reopen. Screenshots and the exact downloaded project are retained. Prior fixture/product failures remain in separate development logs.

New `scripts/verify-v26.15-asset-layout.mjs` opens that exact downloaded project through visible controls, checks36 introduced binding/linked-frame surfaces at720×700 across EN/DE/ZH,100/150/200%,dark/light, and verifies readable named form controls and actual center-point hit reachability after scrolling. All36 pass. Representative German200% dark bindings and Chinese200% light linked-frame screenshots were visually reviewed: content requires vertical scrolling at this narrow/high-scale combination; there is no claim that every legacy importer field or physical assistive technology was exercised. Initial onboarding-covered navigation was a harness setup failure, corrected before the final pass.

The actual asset-authoring harness adds a fourteenth workflow: create a named variant; retain malformed variant JSON when changing the selector; repair and save; reject a duplicate name; create a child resource override; inspect inherited saved values and unchanged parent; verify both exact documents in the downloaded project and the child resolved values after reopening. This extends existing programmer inheritance/variant tests through real user controls. Validation pending at this edit.

Variant user-harness correction: the ordinary select helper asserts that the requested choice becomes active, but the malformed-JSON test intentionally requires the product to refuse that change. That one attempt now uses native Home/Tab directly and asserts the retained old selection and draft. The first report correctly observed the product refusal; its harness assertion was corrected, without a product edit.

The variant user oracle now includes the existing Theme resource defaults (themeAsset:null, variant:Default) alongside authored tokens, matching the documented normalized root-resource shape. Child data remains a partial override and is asserted separately in the saved document; no product source changed for this fixture correction.

The duplicate-variant user assertion now checks the actual English diagnostic, “Choose a new variant name”, rather than an invented “unique” substring. Existing exact retained values and saved-document assertions remain. This was a harness wording mismatch; no product change.

### Complete localized teaching and separate release references
Consequences reviewed: Related task should open the selected starter’s actual controls/expected output, while Feature manual can retain its existing detailed subsystem chapter. `src/projects/templateGuides.ts` now returns a stable per-template26.15 task anchor; all40 IDs and feature-manual targets are unchanged. The new teaching generator will create the matching120 EN/DE/ZH chapters from the same actual catalog/guide records, plus a complete asset/rendering workflow. `scripts/generate-v26.15-reference-projects.mjs` adds a separately versioned deterministic code/blocks/mixed Coin Trail quartet with retained authority and cumulative graph/object lessons; old references remain. Source generation and later link/user checks are separately reported.

New localized teaching sources `docs/ASSET_RENDERING_LESSON_26_15.en.md`, `.de.md` and `.zh.md` explain actual import/cancel/recovery, linked/grid/automatic slicing distinctions, variable frame timing, supported Tiled boundaries, independent editable map ownership, inherited resources/variants, selected/global lighting, diagnostics/budgets and complete ZIP/native export checks. They state existing limits and do not infer an untested platform pass.

New `scripts/generate-v26.15-teaching.mjs` generates the three complete workflow lessons and120 starter-specific task sections from the actual catalog/guide modules. Development output is confined to an isolated root and retains its real package identity; production requires26.15.0. The corrected helper preview on the actual14 baseline passes full Vue/TypeScript and optimized Vite build; all9 library metadata groups and actual EN/DE/ZH help navigation pass with the120 new anchors. The expanded asset-authoring flow now passes all14 groups including named variants and actual reopened inherited values.

New `scripts/lib/milestoneBuildReceipt.mjs` resolves only a unique running qualification with a passed current native-build gate and verifies its copied source snapshot. New `scripts/verify-v26.15-focus.mjs` executes fresh asset/library/export/guard and affected14/12 regressions, then actual browser/native renderer fixtures against that source/PE receipt. New `scripts/verify-v26.15-authoring.mjs` runs asset creation,36 layout states,all40 library entries,actual lit-template Web download/player and its matching native package consumer sequentially, retaining hashed reports/captures/downloads. These wrappers are authored qualification gates, not yet executed production passes.

Final library evidence refinement: `verify-v26.15-template-library.mjs` now records one fresh full-window capture per running starter through the shared capture helper, in addition to the existing cropped preview. `verify-v26.15-authoring.mjs` requires41 groups,40 distinct runtime observations and40 fresh runtime captures, preventing development filters/discovery-only settings from accidentally qualifying an incomplete library. This adds evidence capture and completeness assertions, without changing product behavior.

The focus wrapper also runs the six native-consumer lineage/rejection fixtures before actual native execution. These validate byte/package/evidence ownership and safe executable selection; they do not substitute for the later real15 native player comparison.

### UI foundation corrections found during16 real use
Consequences reviewed before editing: the UI foundation used obsolete Button.text and ProgressBar.minimum/maximum fields plus invalid Panel.layout=vertical. Runtime hydration discarded these fields, yielding a blank Play caption,100% progress instead of68%, and accidental absolute layout. `src/projects/templates.ts` now creates a real localized Text component for Button captions, removes obsolete Button.text, uses current min/max0/100 with value68, and declares layout None to retain the authored absolute positions. The ui-showcase, responsive-ui and audio-lab template IDs/entities remain stable; a deterministic Text component is additive. Their intentionally unbound second-scene/audio sample actions remain documented. This change requires factory/hydration and actual runtime screenshot checks before15 qualification; earlier startup-only screenshots did not prove these values.


Qualification wrapper follow-up: `scripts/verify-v26.15-focus.mjs` now executes the seven real factory/WASM/hydration/package template-UI regression groups. `scripts/verify-v26.15-authoring.mjs` now executes the separate three-starter visible caption/progress audit and embeds its fresh captures; this adds evidence without replacing the complete forty-entry startup corpus.


Additional observed UI starter correction: `src/projects/templates.ts` supplies the supported Checkbox.localizationKey plus readable Sound enabled fallback. TextInput.placeholder uses the literal Player name fallback because15 does not resolve placeholder tokens;16 introduces that capability separately. This prevents raw {menu...} strings in all three starters without changing values, actions, positions or component IDs. Their actual pixel/serialization checks and three preview PNGs are refreshed after the change.
