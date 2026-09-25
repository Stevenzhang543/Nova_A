# Nova_A 26.26 / 26.26.0

Baseline: released26.25 source digest955a512258eb4fdf93432f5d599c0f8c34bc049c8ef8bd26581d5b04c96162cf; prior uncommitted edits are preserved. Schema29 and all40starters remain.

## Implementation obligations
1. Stable reimport/rename UUIDs, dependency closure, variants, atlases/fonts/tilemaps and reusable scenes. Invalidate affected image/audio/thumbnail/scene content; preserve authored overrides.
2. Atomic recoverable import/package/library transactions; missing-resource repair and explicit deduplication identity choice. Export reachable content deterministically, including changed bytes.
3. Readable Assets/Library/import/resource grid/list/details, full paths, progress, dedicated settings, provenance and diagnostics. Bounded virtualization and no nested form scroll traps. EN/DE/ZH copy.
4. Inventory EVERY Vue panel and source-conditional state: path, owner, minimum width, expansion, scroll owner, clipping, keyboard flow and owned findings. Distinguish static inspection from actual interaction evidence.
5. Actual user checks for changed resource workflows, all40starter walkthroughs/export integrity, large-library memory/latency measurement and archived release integrity.

## Risk scope
Keep builds, current-source focused checks, save/reopen/export/undo and resource lifetime tests; shared-layout checks target affected panels. Do not repeat old palette matrices, unaffected debugging/network/rendering/audio-mixing suites or full dependency certification without relevant changes. Audio resource replacement is affected and must be checked. Skips remain explicitly not-run, never borrowed as new passes. Same-frozen-build subtest receipts may resume only under prior user authorization.

## External boundaries
Only Windows local builds/browser checks are available. Hosted discovery/publishing needs real service evidence and remains unqualified without it. Physical mobile, Firefox/WebKit, Linux/macOS, clean machine/signing, native assistive technology and long-duration soak are not certified by local emulation.

## Implemented contracts and evidence entry points
- `verify-v26.26-asset-production.mjs`: staged atomic import, cancellation/stale completion, UUID/settings preservation, source relocation, dependency closure and platform overrides, font fallback, audio replacement/disposal/undo, playback-to-authoring resource history.
- `verify-v26.26-library-regression.mjs`: bounded large-library traversal with measured duration/heap delta, transactional package observers and rollback, localized production/import diagnostics. These are module measurements, not total editor FPS or long-soak certification.
- `verify-v26.22-asset-library-operations.mjs`, `verify-v26.22-package-lifecycle.mjs`, `verify-v26.22-audio-import-boundaries.mjs`: retained relevant fixtures are actually executed against 26.26; their old filenames do not imply reuse of old results.
- `verify-v26.26-asset-production-user.mjs`, `verify-v26.26-library-user.mjs`, `verify-v26.26-panel-layout-user.mjs`: actual browser interaction, file selection, save/reopen/export and changed panel operation. Reports define the precise executed cases.
- `generate-panel-inventory-26.26.mjs --check`: all Vue template/CSS branches, host ownership, sizing, clipping, scroll and keyboard inventory. This is exhaustive source enumeration, not execution of every possible state combination.
- `verify-v26.26-template-library.mjs --qualification`: all 40 actual starter launches, visible runtime content and applicable movement controls. `verify-v26.26-template-output.mjs`: all 40 Web/native exports, asset identity and exact byte integrity. Native packaging uses the current real player; separate Windows smoke checks actual process startup.
- `prepare-release-26.26.mjs` and `qualify-v26.26-scoped.mjs`: 14 frozen-source execution gates, 7 explicit omitted categories. Completion is determined by executed-gates.json and final independent archive verification, not this checklist.

## 编辑说明
逐文件修改及原因记录在 `EDIT_LEDGER_26_26.md`。本版未删除模板、动画或已有项目格式能力；没有把未取得设备或服务证据的平台改成“通过”。中文代码注释检查限于本版新增及修改文件；格式受限的 JSON 与二进制由本清单及对应教程说明。
