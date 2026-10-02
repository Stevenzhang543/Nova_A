# Phase II implementation roadmap — 26.34

Engine → UX → UI V2 → final qualification. Baseline da21825 was clean. Development results are separate from final frozen-source release reports.

| Step | State | Accepted scope / remaining boundary |
|---|---|---|
| Baseline and source map | COMPLETE | Current Rust all-target and actual WASM/frontend build; owned source indexed, generated/dependency/reference trees distinguished |
| A–Z/AA audit/classification | COMPLETE | Runtime/editor/persistence/history owners and every family classified; semantic coverage limited to actual traces/contracts in matrix |
| Five-engine official comparison | COMPLETE | Specific scene/physics/input/UI/resource/script/debug/profile/save contracts; no whole-engine equivalence claim |
| Required foundational defects | COMPLETE for reproduced cases | Save key loss/cancellation/snapshot/session isolation, preview mutation, camera geometry, wheel ownership, profiler false certification; focused before/after regressions |
| Representative game integration | RELEASE GATE | Three real template projects execute compiled WASM, media/UI/physics/save/scene integration; browser starters and downloaded Coin Trail completion are separate gates |
| New-user reusable authoring | RELEASE GATE | Empty project, SVG import, nested reusable object, history/save/reopen; visible controls, no private engine injection |
| UX integration | COMPLETE for changed flows | UI consumes scrolling; cancellation and unsupported tools preserve truthful feedback; existing atomic history/drafts remain |
| UI V2 | RELEASE GATE | Existing SVG/tokens/shared controls/shell retained; font availability and measured profiler copy integrated; all-panel geometry/navigation and actual screenshots |
| Release26.34 | SOURCE-BOUND GATE | Native/Web/Rust/WASM/typecheck/focused/browser/Windows/headless/hygiene/manual/product commands must all succeed, then verify eleven files |

Residual scopes in FEATURE_MATRIX are explicit: affine shear, navmesh/unrestricted shader parity, GPU simulation, metadata-only advanced fonts, physical device/audio/accessibility and clean-install certification. These require architectural or matching-host work rather than superficial controls. Unchanged systems are not rewritten or repeatedly stress-tested without a demonstrated linked risk.

Publish only at `releases/v26.34`; preserve all historical releases. Verify exact versions, source digest, actual reports, archive asset closure and SHA256SUMS before immutable publication. Final pass status is in the delivered evidence archive; a roadmap row is not a successful execution.

Low-priority recorded follow-up: manually constructed valid-frame captures with nonfinite GPU/draw-call/texture telemetry may produce nonfinite comparison deltas. Their measured budgets correctly fail, current renderer telemetry is normalized, and no actual-user regression was observed. Harden arbitrary externally fabricated telemetry if capture import becomes supported; do not infer hardware timing from these fields.
