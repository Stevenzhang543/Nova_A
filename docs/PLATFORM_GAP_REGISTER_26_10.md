# Nova_A 26.10 platform gap register

This register is the human-readable companion to `src/runtime/platformGapRegister.ts`. It records the difference between a locally qualified capability, a deliberate product boundary, and work that requires evidence outside this repository. It is not a backlog disguised as a success report.

## Status contract

- `closed`: the stated local boundary has named implementation or executable evidence.
- `intentional-scope`: Nova_A deliberately does not promise the broader capability. The current boundary must remain visible in the UI and documentation.
- `deferred-external`: the work cannot be completed by a source-tree run alone. It remains pending until the named independent or matching-host evidence is attached.
- `open-blocking`: an unresolved local requirement. Any such item blocks the 26.10 release candidate and packaging.

The 26.10 local candidate requires **zero `open-blocking` entries**. `deferred-external` entries are not local passes and must never be added to a “passed” count.

## Closed local boundaries

| ID | Area | Closed boundary | Evidence |
| --- | --- | --- | --- |
| `contracts-seven-frozen-authorities` | Contracts | The seven additive contract authorities remain frozen; no schema change is inferred from the calendar version. | `stableContracts.ts`, stable-platform decision, focused readiness verifier |
| `windows-web-local-delivery` | Platforms | Windows editor/player and Web player have local build/package/smoke routes. | platform support source, Windows verifier, support matrix |
| `package-native-execution-boundary` | Extensions | Package inspection is bounded; browsing/installing a package cannot implicitly download or execute native code. | package/plugin runtime and SDK contract |

These statements close only the boundary written in the table. They do not close publisher signing, another physical machine, every browser, or an independent security review.

## Intentional scope

| ID | Current boundary | Product decision |
| --- | --- | --- |
| `arbitrary-vm-suspension` | Debugging stops at mapped lifecycle, callback and safe statement boundaries. | Do not claim arbitrary interpreter-instruction suspension without deterministic VM continuations. |
| `static-rhai-type-system` | Rhai is dynamic with API validation, completion and optional inference; Visual Graph pins are typed. | Retain Rhai API 2 and do not advertise static-language guarantees. |
| `public-remote-debug-service` | External-editor/runtime inspection is authenticated and localhost-scoped. | Keep public remote debugging outside the default attack surface. |
| `multi-instance-process-isolation` | Multiplayer testing launches isolated native players. | Call it multi-instance launch, not embedded multi-play; isolation reflects shipped players and contains crashes. |
| `full-simulation-network-rollback` | Supported replicated transforms, rotation and velocity reconcile; arbitrary nonlinear Rhai side effects do not rewind. | Keep unsupported side effects authoritative until input, physics, script and side-effect journals form one deterministic contract. |
| `windowless-dedicated-server` | Headless authority disables rendering in a WebView-backed player process. | Do not call it a truly windowless native service. |
| `mandatory-cloud-services` | Authoring and play remain local-first and offline-capable. | Accounts, telemetry, managed matchmaking, hosted relay and anti-cheat stay optional adapters. |
| `three-dimensional-production` | Nova_A provides a focused 2D scene, physics and renderer stack. | 3D, XR and ray tracing are out of scope for 26.10. |
| `proprietary-console-sdks` | No proprietary SDK, platform contract, signing identity or kit is bundled. | Console delivery requires an independently licensed adapter. |

## Deferred external evidence

| ID | Required evidence | Promotion condition |
| --- | --- | --- |
| `publisher-signing-identity` | Timestamped publisher signing/notarization result with public certificate identity; never store private keys. | Required before claiming signed public distribution. |
| `disposable-clean-machine-lifecycle` | Independent install, first launch, upgrade, repair and uninstall on a disposable Windows machine. | Required before a production-qualified installer claim. |
| `second-machine-byte-reproduction` | Full rebuild of the same clean source/toolchain on another machine with distributable SHA-256 comparison. | Required before cross-machine reproducibility claim. |
| `linux-matching-host` | Linux graphics, WebKitGTK, audio, input, package and lifecycle logs. | Required to promote Linux from experimental. |
| `macos-matching-host` | macOS architectures, Xcode, hardware, signing, notarization, audio/input and lifecycle logs. | Required to promote macOS. |
| `android-production-device` | Toolchain, production signing, clean-device install, sensor/input/audio and store evidence. | Required to promote Android beyond experimental. |
| `ios-production-host` | macOS/Xcode/device/signing/store evidence. | Required before exposing a supported iOS target. |
| `firefox-webkit-browser-matrix` | Hosted player render/input/audio/storage/lifecycle evidence in Firefox and WebKit. | Required before broad Tier 1 browser claims. |
| `native-assistive-technology` | Observed native screen-reader, magnification, switch and high-contrast workflows. | Required before native accessibility certification. |
| `independent-beginner-expert-study` | Raw observations and task outcomes from independent beginners and expert keyboard users. | Required before claiming independent usability qualification. |
| `real-low-end-hardware` | Startup, input-to-pixel, frame pacing and memory evidence on the published minimum hardware. | Required before minimum-system performance certification. |
| `public-relay-hostile-network` | Provider-specific relay/NAT, authentication, abuse, privacy, disconnect and hostile-network evidence. | Required only if a public networking service is offered. |
| `independent-security-review` | Independent package, plugin, updater and malformed-input assessment with finding disposition. | Required before third-party ecosystem production certification. |
| `ecosystem-production-adoption` | Independently authored packages and shipped projects observed over time. | Required before ecosystem-parity claims. |
| `seventy-two-hour-soak` | An unchanged release candidate running for 72 continuous hours with memory, fault and recovery evidence. | Required before a real long-duration stability claim. |

## Closure workflow

1. Add or change the typed entry first; never remove history to make a count smaller.
2. Attach evidence to the exact source identity and machine/toolchain identity.
3. For a local correction, add a regression test and move to `closed` only after the report passes.
4. For a deliberate boundary, use `intentional-scope`, state the user-visible limitation, and remove unreachable controls or misleading claims only through the normal product review.
5. For external work, keep `deferred-external` until the independent artifact exists. A plan or empty JSON placeholder is not evidence.
6. `scripts/verify-v26.10-readiness.mjs` rejects an unknown status, duplicate ID, incomplete record, missing documentation entry, or any `open-blocking` item.

The release owner signs the final disposition. Severity 0/1 remains zero; a deferred external gate must not conceal a locally reproducible failure.
