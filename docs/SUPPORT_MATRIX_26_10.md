# Nova_A 26.10 support matrix

Support describes demonstrated evidence, not whether a target name appears in Build Settings. “Local” means exercised on the release host. “External” remains pending until matching-host or independent artifacts are attached.

| Target | Editor | Exported player | 26.10 tier | Local evidence | Remaining gate |
| --- | --- | --- | --- | --- | --- |
| Windows 10 1809+ x86-64 with WebView2 | Yes | Yes | Tier 1 local | Native editor build/smoke; portable player; MSI/setup routes; Web player hosted locally | Publisher signing and independent disposable-machine lifecycle are `deferred-external`. |
| Web: pinned Chromium/WebGL2/WASM | No | Yes | Tier 1 local | Production bundle, HTTP-served startup, deterministic player smoke | Firefox and WebKit are not inferred from Chromium. |
| Firefox and WebKit | No | Intended | Pending browser matrix | Source and standards-compatible output | Independent hosted render/input/audio/storage/lifecycle evidence is `deferred-external`. |
| Linux x86-64/WebKitGTK 4.1 | Intended | Intended | Experimental / matching-host | Source and pipeline definitions | Matching-host graphics, audio, input, packages, install and lifecycle evidence is `deferred-external`. |
| macOS 12+ x86-64/aarch64 | Intended | Intended | Experimental / matching-host | Source and pipeline definitions | Xcode, hardware, architectures, signing, notarization and lifecycle evidence is `deferred-external`. |
| Android 10+ aarch64 | No | Optional | Experimental / toolchain-gated | Tool discovery and export-plan validation | JDK 17, SDK/API 35, build-tools, NDK 27, reviewed template, signing, clean device, input/audio/sensors and store evidence are `deferred-external`. |
| iOS | No | No qualified target | Deferred | No local production claim | macOS/Xcode/device/signing/store program is `deferred-external`. |
| Proprietary consoles | No | Not bundled | Excluded | None claimed | Licensed SDK, agreement, hardware and certification program; this is `intentional-scope`. |

## Runtime boundaries

- Nova_A 26.10 is a **2D** engine. 3D, XR and ray tracing are intentionally out of scope.
- Local Play and exported games do not require a Nova_A account, telemetry or cloud service.
- Networking is optional and permission-gated. Local lobby/direct-connect and registered transports do not imply a hosted public relay, universal NAT traversal or anti-cheat.
- Multiplayer test instances are isolated native player processes. They are not several embedded game views inside the editor.
- Headless authority disables rendering in the current player host; it is not a truly windowless service binary.
- The package browser validates declarative/WASM content and never implicitly downloads or runs arbitrary native code.
- Runtime/external-editor inspection stays authenticated and localhost-scoped.

## Accessibility and input

Keyboard, gamepad, pointer, touch semantics, DOM/ARIA snapshots, focus metadata, text scaling, contrast and reduced-motion checks are local gates. Native screen-reader, switch-control, magnification and real-device observations remain external. A semantic snapshot is useful evidence but not a substitute for a person using assistive technology.

## Performance claims

Local benchmarks and synthetic profiles qualify regressions on the release host. They do not prove the published minimum system. A low-end profile may reduce editor diagnostic sampling or idle presentation cost, but it may not change authored data, gameplay physics, scripts, camera/tool response, animation availability or exported quality. Real minimum-device results remain `deferred-external`.

See `PLATFORM_GAP_REGISTER_26_10.md` for the exact status, owner and promotion condition of every limitation.
