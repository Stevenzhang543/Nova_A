# Nova_A 26.27 / 26.27.0

## 26.27 — Measured performance and editor-only controls

Engine: **26.27.0** · Project Format 2/schema 29.

Choose a low-end editor preset in Settings, then independently adjust decorative motion, idle frame limit and preview policy. Reset restores preset defaults; system reduced motion and the explicit accessibility preference remain independent. These controls do not rewrite project animation, physics or export quality.

Compare the same scene, resolution, effects and hardware. Profiler shows actual backing dimensions, backend, AA samples, CPU passes and whether GPU timing is available. Median, p95 and p99 describe recorded frames; unavailable GPU data is not zero. Memory growth is a wall-clock observation, not proof of a leak.

Switch Design/Script, leave the editor idle, background and restore it, then reopen projects and check input. Low-end previews use bounded canvases and release pending callbacks when closed. Existing canvas reuse avoids an extra preload cache. Save, export and run the game to confirm authored effects, resolution and animation survive.

Reports retain noisy measurements and unavailable devices. A short local observation does not certify all-day stability, old PCs or physical mobile GPUs.
