# Nova_A 4.4 known issues and external gates

No locally reproduced severity-0 or severity-1 defect is open at packaging time. These claims are deliberately limited to recorded local evidence.

- Importer 3.0.0 intentionally invalidates importer 2.x cache keys. Existing verified artifacts render, but reproducible provenance requires reimport.
- SVG runtime rasterization is available only where the target renderer/browser supports it; active content and external resources remain blocked.
- Font shaping, color emoji, hinting, and MSDF appearance can differ by OS/GPU/browser. Missing coverage is diagnosed, not silently replaced.
- TileMap streaming records deterministic chunk boundaries; host-specific asynchronous disk streaming remains subject to platform I/O.
- Atlas rotation is opt-in because rotated regions can affect custom shaders that assume unrotated UVs.
- The 20,000-asset and large-TileMap tests are local synthetic workloads, not a guarantee for every storage device or GPU.
- Five independent clean builds, a second matching machine, signed binaries, malware/security review, clean-machine install/upgrade/uninstall, 24-hour soak, physical mixed-DPI review, screen-reader/operator approval, Firefox, Linux, and macOS remain external release gates. Reports mark them pending; none is fabricated.
