# Nova_A 26.28 localization evidence

## Changes and consequences

- `src/i18n.ts`: added explicit German/Chinese translations for `noReferencesFound` and `heartbeat`, corrected inherited English Chinese friction labels, and added all three translations for `vertices`, `transform`, `rotation`, `time`, and `shape`. These five absent keys previously appeared literally in Config, Network Studio, Presentation, and World Tools. No project keys or serialized data changed.
- `src/editor/graphStatusCopy.ts`: new semantic presentation formatter for wire state, layout progress/results and diagnostics. Raw unknown errors remain intact; the formatter does not guess translations of author text.
- `src/components/VisualGraphEditor.vue`: transient status stores message identity/arguments instead of translated strings. Computed display observes the current locale, including messages left visible after an operation finishes. Pin/edge identities, validation, undo, graph serialization and compiled code are unchanged.
- `src/editor/graphStandardApiCopy.ts`: 34 public standard-library overloads have empty upstream descriptions. German/Chinese help now displays actual parameter and result types and explicitly states that no additional description exists. This avoids blank/English fallback without inventing behavioral documentation. Nonempty exact-match translated long documentation remains unchanged.
- `scripts/verify-v26.28-localization.mjs`: targeted real-module and Vue-reactivity checks plus a mechanical source inventory; writes `release-audits/v26.28-localization.json`, preserving an earlier report before replacement.
- This document records the evidence and its limits.

## Reproduction

`node scripts/verify-v26.28-localization.mjs --qualification-release=26.28`

The qualification option checks the actual package identity is 26.28.0. The report includes `status`, `release`, `engineVersion`, `generatedAt`, and named checks.

The completed run verifies:

- 3,943 centralized translation keys in EN/DE/ZH: final keys, explicit translation declarations (English object spreading cannot disguise a missing declaration), nonempty values, and named-placeholder equality.
- All direct literal `t('key')` calls in source files importing the centralized translator resolve. Dynamic keys and author/plugin values are outside this literal check.
- 658 available public non-operator WASM API signatures in each of German and Chinese: 1,316 help checks. Empty upstream descriptions have explicit signature-based explanation. Unknown plugin help and author-renamed titles preserve original content.
- Real Vue computed invalidation across EN → DE → ZH → EN for stored wire status and centralized labels; layout counts, progress suffixes and coded diagnostics also change language. Unknown technical errors remain visible unchanged.
- Mechanical inventory of 98 locale-bearing source files and 42 identifiable three-language object groups. Comparable direct object groups have identical keys. Paths, source hashes and actual key lists are in the JSON report. Arrays of translated paragraphs, imported/spread copy objects, dynamic dispatch and runtime-authored localization are classified by source inventory, not asserted semantically complete by this structural scan.

`npx vue-tsc --noEmit` and targeted `git diff --check` passed after the graph state change. The final centralized-label additions do not alter types or runtime logic; the targeted localization test passed again.

## Evidence boundaries

This is a focused programmer regression check, not an independent translator review, browser click test, device/audio/accessibility test, or blanket assertion that every document is translated correctly. Generated manuals and the authored media/menu workflow are checked by their release owners. Runtime game-UI locale fallback belongs to the separate game-UI contract; project localization resources and unknown diagnostic details retain source data intentionally.

Initial test development exposed harness-only issues (TypeScript `as` wrappers and JSON module interop), then the 34 empty-documentation overloads; those were corrected before the passing report. Whole-app builds and unrelated renderer/asset matrices are not duplicated here.

Final visual inspection found six obsolete26.24 release/version dictionary strings. They now derive from NOVA_RELEASE_NAME; the localization test asserts both labels in allthree locales. Candidate1 was invalidated, preserving its executed logs; only a new frozen candidate may be packaged.
