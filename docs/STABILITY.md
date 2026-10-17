# Stability qualification

`pnpm stability:v3` runs a bounded local smoke covering repeated play/stop isolation, scene load/unload toggles, content-hash-stable asset reimports, corrupted JSON, and WebAssembly plugin trap isolation followed by a healthy Plugin API 2 start. The 3.9 release report is written to `release-audits/v3.9.0-stability-smoke.json`; it composes every retained feature audit with deterministic package/build/collaboration, browser-layout and Windows startup gates. The v3.8 world-data soak remains part of that chain. The browser matrix traverses every retained workspace, bottom panel, settings scope, and all three locales while rejecting runtime/fatal surfaces.

The 24-hour gate is separate and explicit:

```text
node scripts/stability-v3.mjs --duration-hours=24 --output=release-audits/v3.9.0-stability-24h.json
```

Only a report with `qualified24Hours: true` is a 24-hour pass. A normal smoke report states that it is not a 24-hour qualification. `.github/workflows/stability-24h.yml` provides the long-running self-hosted job and uploads its evidence. Until that job completes, the 24-hour gate is published as pending, not passed.

Runtime fault containment catches Vue render errors, animation-frame failures, unhandled promises, optional-package startup failures, texture-atlas rebuild failures, and project-link opener failures. Fatal errors show an in-app recovery surface with bounded diagnostics, continue, download/copy, and Safe Mode restart. Expected user cancellation is not reported as fatal.
