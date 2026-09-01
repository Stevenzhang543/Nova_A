# Nova_A 7.0 known limitations

This 7.0 statement supersedes historical implementation notes later in this file:

- Nova_A remains deliberately 2D-first; 3D, XR, ray tracing, AAA terrain/film systems, and proprietary console SDKs are not included.
- Windows and Web are the locally qualified Tier-1 outputs. Linux and macOS require matching-host build/lifecycle evidence; Android is optional and toolchain/signing/device/store gated; iOS is deferred to a matching macOS host.
- Local Windows release binaries are unsigned until a Whitelist publisher certificate is supplied. Hashes prove file identity but do not replace Authenticode reputation.
- The signed updater architecture is disabled by default and stages only verified plans. Nova_A does not operate a mandatory hosted update, registry, account, matchmaking, relay, cloud-save, telemetry, or anti-cheat service.
- Native extensions are declared but never downloaded or run implicitly. Third-party packages/plugins remain permission-, signature-, hash-, compatibility-, advisory-, and lifecycle-gated.
- Tier-1 Web accessibility uses DOM/ARIA evidence. Native screen-reader adapters depend on what the Tauri/WebView and target OS expose and still need independent assistive-technology qualification.
- Rhai callback-boundary stepping is not arbitrary VM statement suspension; the external editor protocol is not claimed as a complete LSP.
- Interactive native cold-start, working-set, GPU frame-time, real low-end-device results, independent beginner/expert studies, and a real wall-clock soak remain external until measured.
- Networking is optional infrastructure, not a production hosted service. Public deployment requires independently reviewed authentication, encryption/tunnel, relay/NAT, abuse, operations, and privacy design.
- Project Format 2/schema 29 remains frozen. A future format needs an explicit preview/backup/migration/diff/rollback path; 7.0 does not promise future downgrade support.

The exact current platform and evidence boundaries are in `STABLE_CREATOR_PLATFORM_7_0.md`. The remaining text is retained as a historical 5.0 candidate record and is not the current implementation inventory.

## Historical 5.0 candidate record

Nova_A is deliberately a professional 2D-first engine. It does not include built-in 3D rendering/physics, ray tracing, VR/XR, AAA terrain or foliage, cinematic virtual-production tools, or proprietary console SDKs.

Lighting, rigging, behavior/navigation tools, networking, and third-party integrations can remain official optional packages. Android, iOS and console export are deferred in the 4.0 Stable channel; dormant legacy metadata stays readable but cannot create a Stable build.

Other release boundaries:

- Native packages are never downloaded or executed by the package browser; users install trusted native tools externally.
- API 1 plugins are compatibility-only and cannot request API 2 editor/runtime capabilities.
- Windows and web are Tier 1. Cross-platform templates are modeled explicitly, but native Linux/macOS outputs require matching-host CI and remain Experimental until their clean-machine matrices pass; unavailable targets cannot be selected as if they worked.
- macOS distribution still needs publisher signing/notarization. Linux and macOS remain Experimental until matching-host clean-machine matrices pass.
- The locally produced Windows EXE/MSI/NSIS artifacts are not Authenticode-signed because no Whitelist publisher certificate was provided. Their SHA-256 hashes are published, but Windows may show a SmartScreen/unverified-publisher prompt until the release is signed.
- Console export needs the platform holder's SDK and agreement and is not included.
- Web performance depends on browser/WebGL2/WebAssembly support; Canvas2D is a functional fallback with different throughput.
- The included networking sample is opt-in infrastructure, not a managed matchmaking, relay, anti-cheat, or account service.
- Nova_A 5.0 does not integrate Tauri's updater plugin or publish updater signatures. Windows releases use the complete MSI/NSIS installers; signing/notarization values are explicit external hooks and automatic update remains unavailable until its signing and rollback lifecycle is qualified.
- The 5.0 release-candidate observation began on 25 August 2026. Its minimum 14-day gate, independent-machine reproducibility, disposable clean-machine lifecycle and publisher signing cannot be satisfied by a same-day local run and are never reported as complete without attached external evidence.
- Stable package installation trusts exact manifests from the configured verified registry snapshot. Arbitrary self-asserted publisher flags or matching-looking signature text are rejected and quarantined.
- Tier-1 web game accessibility uses DOM/ARIA names, descriptions, roles, states, values, focus, and live-region hooks. Native operating-system screen-reader bridges still require adapters and qualification per desktop target.
- The v3 headless benchmark does not claim interactive native startup, memory, or GPU frame-time results until reference-machine evidence is attached.
- Chain and concave-polygon colliders are available for authoring and queries, but are labelled query-only and are not submitted to the dynamic solver. Capsule and finite-segment colliders are native deterministic convex shapes.
- Multiple local collider shapes currently share one rigid transform and are reduced to a deterministic convex envelope for native dynamics. Individual local shapes remain editable and round-trip exactly.
- The included twelve-hour physics report advances exactly 2,592,000 fixed ticks (twelve simulated hours at 60 Hz) in an optimized process. It is accelerated-time stability evidence, not a twelve-hour wall-clock qualification.
- Rhai step into/over/out pauses at safe callback boundaries; arbitrary statement-level suspension is not exposed by the embedded VM adapter. Line/function/conditional/log breakpoints, source frames, watches, evaluation, and break-on-error remain supported.
- Per-script allocation values are deterministic estimates because the Rhai allocator does not expose exact allocation telemetry. Calls and duration counters are measured.
- The external editor adapter implements the documented `nova-rhai-language/1` JSON-lines stdio protocol; it is not advertised as a complete Language Server Protocol implementation.
- Tilemap chunk storage is sparse and suitable for million-cell authoring, but the editor deliberately renders and processes only visible/requested chunks. A million simultaneously visible animated tiles is not a supported frame-time target.
- TileSet navigation polygons and costs participate in grid navigation baking. Polygon navigation regions use their authored polygon plus dynamic obstacles; automatic union of arbitrary per-tile concave polygons into a polygon mesh is not included.
- Stream cells use asynchronous dependency-aware lifecycle and memory budgeting in the core runtime. Disk/network transport remains supplied by the host loader, so measured load latency depends on the game and target platform.
- Save slots use the browser storage backend in web builds. Native/cloud backends use the same serializer and commit contract but require their platform adapter and target-specific crash/power-loss qualification.
- AI, Object Pool, and Streaming Tools remain optional packages. Removing one preserves component data but intentionally disables that package's runtime behavior until it is re-enabled.
