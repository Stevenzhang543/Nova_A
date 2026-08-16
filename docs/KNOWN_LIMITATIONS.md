# Nova_A 3.0 known limitations

Nova_A is deliberately a professional 2D-first engine. It does not include built-in 3D rendering/physics, ray tracing, VR/XR, AAA terrain or foliage, cinematic virtual-production tools, or proprietary console SDKs.

Lighting, rigging, behavior/navigation tools, networking, Android support, and third-party integrations can remain official optional packages. Projects that do not reference an optional package do not load or serialize its runtime state.

Other release boundaries:

- Native packages are never downloaded or executed by the package browser; users install trusted native tools externally.
- API 1 plugins are compatibility-only and cannot request API 2 editor/runtime capabilities.
- Native export is host-oriented. Cross-platform bundles are built on their target OS in the release matrix.
- macOS distribution still needs publisher signing/notarization; Android distribution needs a user-owned SDK/JDK/keystore.
- The locally produced Windows EXE/MSI/NSIS artifacts are not Authenticode-signed because no Whitelist publisher certificate was provided. Their SHA-256 hashes are published, but Windows may show a SmartScreen/unverified-publisher prompt until the release is signed.
- Console export needs the platform holder's SDK and agreement and is not included.
- Web performance depends on browser/WebGL2/WebAssembly support; Canvas2D is a functional fallback with different throughput.
- The included networking sample is opt-in infrastructure, not a managed matchmaking, relay, anti-cheat, or account service.
- Nova_A 3.0 does not integrate Tauri's updater plugin or publish updater signatures. Windows releases use the complete MSI/NSIS installers; the Tauri bundle-type marker warning therefore does not affect the shipped install/update path.
- The v3 headless benchmark does not claim interactive native startup, memory, or GPU frame-time results until reference-machine evidence is attached.
