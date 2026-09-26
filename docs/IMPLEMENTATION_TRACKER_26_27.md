# Nova_A 26.27 / 26.27.0

Baseline: committed26.26 (39956b4), released source digest387e651b294ce3c751566c8311d1a404a0666f664490a4467e3ff0fc8c51b4a9. Existing releases are immutable. Schema29 and all40starters retained.

## Requirements and edit consequences
- Measure editor/player frames, cold/warm Design transitions, memory and idle/background/resume before and after on the same host/scene/quality. Report median/p95/p99 and actual elapsed duration, no universal FPS claim.
- Optimize demonstrated renderer/cache/frame-loop work, retain effects, authored simulation/animation time and exports. Keep actual backend/backing dimensions/AA limits and GPU-timing availability visible.
- Extend opt-in low-end editor preferences with independent motion/idle/preview controls and Reset. Defaults preserve motion. System reduced motion is independent. Editor pixel ratio must not override Game or packed output quality.
- Verify cancellation/disposal ownership, bounded previews and resource residency, device recovery/pixels/transparent order, output-equivalent delivery and current native/WASM/Web builds.
- Use existing mounted Design canvas instead of speculative additional preload: measure cold/warm behavior and retained memory.

## Risk-based checks
Only affected render/runtime/preferences/lifecycle and delivery contracts are executed; unrelated full palettes, resource-library production matrices, scripting round-trip/catalog, dependency certification and all-template walkthrough are not repeated. Relevant existing tests execute against current source; old reports are not relabelled. Native/Web builds, reference exports, source freeze and11artifact integrity remain mandatory.

## Qualification limits
This Windows host is the available platform. Chromium software GPU measurements, if used, are identified; CPU submission is not GPU timing. Five-minute observations are not multi-hour soak tests. Physical older PCs/mobile, Firefox/WebKit, other OS binaries, signing/install lifecycle and hosted services remain externally unqualified.

## Evidence entry points
- `verify-v26.27-renderer.mjs`: frozen26.26 comparison, exact RGBA, AA edge pixels, upload/index bounds, resource residency and real context loss/restoration. Local cache maintenance time is reported separately from full submission/completion and frame tail distributions.
- `verify-v26.27-editor-preferences.mjs` / `verify-v26.27-editor-preferences-user.mjs`: independent policy combinations, persisted values, live system reduced motion, Reset, preview bounds and authored project/CSS player isolation.
- `verify-v26.27-sampling.mjs`: actual performanceTools module with controlled time/heap observations proves wall-clock invariance across frame sampling rates and reset.
- `verify-v26.27-runtime-stage.mjs` Native/WASM runs and retained `verify-v26.16-media-performance.mjs`: same command/output expectations and object/VM disposal; media clock partition equivalence. Host fixtures and actual runtime boundaries remain explicitly distinguished.
- Retained `verify-v26.27-quality-user.mjs` (retained26.22 behavior) executes against26.27: real quality editing, undo/redo, save/reopen, download and standalone player resolution/input. It does not borrow26.22 results.
- `measure-v26.27-performance.mjs`: immutable baseline, quiet comparison, short development checks and full frozen-source final measurement kept separately. Same-page project switches must preserve performance.timeOrigin; page reload is not resource disposal proof. Timing windows run without simultaneous builds or other benchmark processes.
- Current native/WASM/Web builds, reference output startup, historical format checks and independent eleven-file package verification remain required. Formal completion is declared only by current executed-gates and package verification.

## 编辑影响说明
隐藏停止态以15Hz上限保留插件/热重载更新并跳过图形提交；播放与调试暂停保持原有更新；低频编辑排程在游戏、播放、拖动时不生效。Game取消编辑器像素比覆盖，但保留作者自适应质量设置。缓存到期与预算淘汰、透明顺序不变。全文逐路径修改记录由 EDIT_LEDGER_26_27.md 提供。
