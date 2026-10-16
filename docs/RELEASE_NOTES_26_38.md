# Nova_A 26.38 — Release engineering maintenance

Engine 26.38.0. Existing workflows, project format 2/schema 29 and game behaviour are preserved.

## What changed

| Area | Change |
| --- | --- |
| Release tooling | The integrated browser and regression harness now accepts the current and later calendar labels (26.38 and above) instead of refusing anything after 26.37, so the same source-bound suites can qualify this release. The layout evidence gallery derives its release label from the actual run instead of a fixed literal. |
| Rust quality gates | `cargo fmt --all -- --check` and `cargo clippy --workspace --all-targets -- -D warnings` pass across the workspace again. The single `clippy::possible_missing_else` finding in the script world view was closed by the documented formatting fix; both guards, their order and their error strings are unchanged. |
| Version authority | One stale hardcoded `engineVersion:'6.7.0'` in the editor-automation evidence now reads the shared `NOVA_ENGINE_VERSION`, matching the other 65 runtime evidence producers. |
| Native window permission | The Tauri capability now grants `core:window:allow-close`, which the standalone Player exit action already invoked. The permission set stays minimal; no other window or shell capability was added. |
| External artifact inputs | The branding negative control no longer requires the packaged 26.35 executables to be present. When a historical executable is absent it derives an equivalent controlled corruption from the freshly parsed PE group and records the substitution in the report instead of silently skipping the control. |
| Release identity | All version authorities, the three complete manuals and the multilingual offline manual identify 26.38 / 26.38.0. The 26.38 reference project pair is registered for qualification. |

## Unchanged

Editor behaviour, project format 2/schema 29, gameplay, rendering, input, audio, storage, packaging formats and the exact eleven-file release contract are unchanged. No feature was removed, no tolerance was widened and no quality floor was lowered. The Comfortable typography, control sizes, spacing, radii and core motion remain the current defaults.

## Verification status

Implementation and final qualification are distinct. The claims above are established only by the executed gates recorded in the release evidence archive: fresh WASM identity and execution, complete Web inventory, Vue/TypeScript checking, the Rust workspace suite, the focused environment/branding/native-stdio gates, real browser layout and interaction runs, the Windows build with exact PE/MSI versions, the renderer-disabled headless authority export, the manual audit and repository hygiene. Reports that were not executed are listed as explicit omissions in the qualification plan; they are not passes.

## Explicit limits

Software-rendered headless Edge measures actual editor DOM, input and finite animations; it does not measure physical GPU cost, monitor DPI, input-to-scanout latency, native assistive technology, code signing or a clean-machine installation. Linux, low-end hardware and independent usability observation remain unqualified. No vulnerability certification and no unrelated engine feature expansion is claimed.
