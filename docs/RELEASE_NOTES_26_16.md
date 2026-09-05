# Nova_A26.16 release notes

Engine26.16.0 · Project Format2/schema29 · Graph Format1. This release joins animation, audio and interface authoring to the same runtime evaluation and preserves the separately packaged26.12–26.15 versions. Candidate status ends only when the frozen source passes all21 local gates and the eleven release artifacts pass independent verification.

## Runtime and authoring

- Animation/controller layers use the shared14,112,000-tick media clock, including direct clips, zero-weight layers, transition boundaries, synchronized and interrupted blends, masks, sprite-frame timing, markers and command dispatch. Preview seeks evaluate the real saved asset without dispatching skipped commands. Recording retains evaluated poses as an unsaved draft after authored-scene restoration.
- Timeline traversal preserves frame position, nested rates/offsets, independent overlapping audio voices, visibility/camera ownership, subtitle state, skip/resume markers and bounded command ordering. Four explicit Button actions use the nearest enabled TimelinePlayer without Script2D or fixed target IDs. Captions resolve clip/Canvas/project language and export the required fallback tables/fonts.
- Rig evaluation applies constraints after IK, uses rest-relative retargeting and mirrored bind handling, and refuses malformed indices/cycles/excessive work. Existing Root Motion Apply remains absolute root sampling; accumulated deltas require the explicit API.
- Audio uses bounded decoded PCM ownership, signed sample-addressed playback, trim/loop/seek/end state, separate game and audition mixers, bus/send/effect routing, and synchronous voice disposal. Streaming keeps the browser's supported rate range and reports unsupported transport. Meters explicitly describe RMS/sample-peak estimates.
- Responsive layout, game rendering, validation and preview share geometry and text rules. Parent visibility/clipping, anchors, safe area, RTL, Unicode wrapping/truncation, sparse inherited themes, localization fallback and native IME/selection participate in actual save/reopen/export. Editor focus does not send game input.
- Animation panes have readable matched track rows, resize/reset controls, explicit draft/preview/record modes and retained invalid/conflicting documents. Audio routing, waveform and sample-clock controls fit narrow panes. Theme/localization drafts preserve Cancel/Save/Discard behavior. The SVG key-control naming failure and Timeline action disclosure collapse are fixed.
- Optional browser recovery-cache quota failures no longer prevent an external project save or turn a completed save into failure. Real destination permission/disk/cancellation errors retain dirty state and failure behavior. Cache failures remain in the transaction task log; the downloaded/saved file remains essential.

## Teaching and references

The40 library starters and their120 localized task pages remain. Three additional complete animation/audio/interface lessons explain the actual runtime semantics, authoring limits, action binding and export checks. Five separate26.16 references provide code, blocks, mixed authoring, the renderer-disabled authority and an animated menu. The menu foundation contains a30-second sequence, title-opacity animation, PCM music, three languages and Skip/Resume markers. Generated references are starting inputs; actual authoring downloads and player observations are retained separately in evidence.

## Qualification and measured limits

The focused gate requires12 current suites covering219 programmer groups: animation/audio49, authoring15, UI handlers14, real browser PCM11, interface55, actual Canvas pixels7, report context7, report bundle14, every-field media roundtrip12, timeline actions11, timing/performance15 and save recovery9. Affected native/WASM scripting, retained format/language, deterministic-reference and every-Vue-panel checks run again on the integrated version.

The user gate requires11 interface workflows,9 animation workflows,12 combined menu workflows and54 additional timeline/audio/responsive layout surfaces across EN/DE/ZH,100/150/200 percent and both themes. The combined audit binds a Button, edits the curve/music/caption, uses actual IME/keyboard/touch input, saves and reopens the exact project, downloads its complete Web ZIP and runs only those exported bytes. Common native/Windows, networking, stability, security and performance gates retain their original assertions. Only recorded behavior is qualified.

Performance evidence records5 warmups and20 measured iterations for animation/timeline/UI at10/100/1000 owners/controls and rigs at16/64/256 bones, plus exact30/60Hz partition equivalence and100 evaluator reset cycles. Final report samples identify their host and Node version; timings are observations, not portable frame budgets. Common release benchmarks and cleanup checks are separate.

Decoded audio is bounded to64MiB resident PCM,32MiB per clip and16 pending decodes. Animation curve baking has1e-6 sampled tolerance with10,000-key/depth24 limits. Timeline nesting/traversal/commands and UI work have explicit bounds; UI refuses more than20,000 entities. Resource limits can reject excessive data instead of silently doing partial work. The implementation journals list the complete limits and error policies.

Physical audio output/streaming recovery, native IME/picker behavior, screen-reader hardware, low-end GPUs, installation/uninstallation, signing, other hosts and long-duration soak require their own observations. Local successful gates do not prove zero global defects or universal maximum performance. The headless authority still runs in a renderer-disabled WebView.

See [every26.16 edit](EDIT_LEDGER_26_16.md), the four implementation journals and the localized task lessons for exact consequences and evidence boundaries.