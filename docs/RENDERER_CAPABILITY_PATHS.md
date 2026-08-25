# Nova_A 4.8 renderer paths and capabilities

Nova_A exposes the renderer that is actually executing a project. It no longer uses an unexplained quality tier.

## Paths

- **Auto** chooses WebGL2 first and records the selected path and fallback reason. In the desktop editor this is the Native path because WebGL2 is hosted by the installed WebView2/ANGLE graphics stack; the exact device and driver reported by the context remain visible. In the web player it is the Compatibility path.
- **Native** requires the desktop host. Requesting it in a browser produces an actionable diagnostic; it never pretends that a native graphics device is active.
- **Compatibility** uses WebGL2 on supported browsers. Canvas2D is a diagnostic fallback for opening and repairing a project, not a feature-equivalent renderer.

The Rendering page reports backend, path, device, driver, API/shading language, maximum texture size, enabled extensions, quality profile, context-loss state, and the reason for any fallback. Each capability is `supported`, `limited`, or `unsupported` and has a direct corrective action.

## Feature and budget workflow

Sprite batching respects texture, filter, material, blend, camera, and vertex-limit boundaries. The Diagnostics view reports draw calls, batches, texture bytes, render targets, GPU timing where available, and the exact batch-break counters. Overdraw and batch-break debug views are selectable.

Project rendering budgets cover draw calls, texture memory, overdraw, GPU frame time, and particle update time. Project Health and Build Diagnostics evaluate these values. A build is blocked by declared unsupported features or shader failures; warnings identify the exact setting or asset to change.

Context loss clears invalid resources, records the event, and rebuilds on restoration. Project data is not mutated by renderer recovery. A failed recovery remains visible in the capability report.

## Platform boundary

Windows x86-64 and Chromium/WebGL2 are the locally built paths. A particular Intel, AMD, NVIDIA, Firefox, WebKit, or audio-device result is claimed only when its hashed release evidence exists. Canvas2D does not execute custom shaders, GPU timings, normal-map lighting, or post-processing render targets.
