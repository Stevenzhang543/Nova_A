# Nova_A 4.1 reference projects

These are generated, schema-valid source projects. Open any `.nova` file through **File → Import Project**, inspect it, press **Play**, run its project tests, and export it from **Build Settings**.

| Project | Demonstrates |
| --- | --- |
| `empty.nova` | Camera, input map, scene editing, save/load, and build settings |
| `platformer.nova` | Platformer movement, collisions, tilemap, animation, audio, lighting/shadows, UI, scripts, and export |
| `top-down.nova` | Top-down input, prefabs, particles, triggers, scene transitions, and Save API |
| `physics-sandbox.nova` | Rigid bodies, materials, joints, Rope2D, collision diagnostics, and physics monitoring |
| `platformer-character/project.nova` | Character slopes, steps, floor snap, moving platforms, edges and ceilings |
| `top-down-character/project.nova` | Top-down character motion, named collision layers, and triggers |
| `joint-showcase/project.nova` | Seven joint workflows, limits, motors and break thresholds |
| `trigger-showcase/project.nova` | Stable trigger enter/stay/exit ordering and contact data |
| `ccd-test/project.nova` | Continuous collision reference against thin geometry |
| `stacking-test/project.nova` | Stacking, friction, restitution, sleep and wake stability |
| `ui-showcase.nova` | Responsive UI, text input, themes, localization, focus navigation, and audio mixer |
| `networked-optional.nova` | Opt-in networking package, replication, prediction, diagnostics, and headless test configuration |
| `workspace-recovery-validation.nova` | Workspace import/export, docking, 100-step undo, autosave recovery, safe layout, and read-only recovery qualification |
| `data-foundation-validation.nova` | Manifest, nested scenes/prefabs, overrides, imported hashes, dependency graph, and missing-resource repair |
| `authoring-pixel-art/project.nova` | Nearest filtering, pixel-perfect camera, sprite drops, and zoom comparisons |
| `authoring-resolution-independent/project.nova` | World-unit scaling and common-resolution overlays |
| `authoring-parallax/project.nova` | Parallax hierarchy, motion scale, and repeat metadata |
| `authoring-multiple-cameras/project.nova` | Camera stacking, viewports, previews, and overlays |
| `authoring-nested-prefabs/project.nova` | Nested prefab layers, overrides, and hierarchy statuses |
| `authoring-5000-stress/project.nova` | 5,000-object viewport, search, navigation, and selection workload |
| `rendering-lighting-shadows/project.nova` | Ambient/point lighting, masks, occluders, soft shadows, and quality fallback |
| `rendering-particles/project.nova` | Particle preview, curves, gradients, shapes, additive blending, and budgets |
| `rendering-shader-uniforms/project.nova` | Typed uniforms, safe shaders, includes, variants, cache, and material serialization |
| `rendering-render-textures/project.nova` | Multiple cameras, render textures, render graph, and post-processing |
| `rendering-fonts-multilingual/project.nova` | Scalable/bitmap text cache, fallbacks, shaping, outlines, and multilingual text |
| `audio-positional/project.nova` | 2D panning/attenuation, listeners, polyphony, randomization, and priority |
| `audio-bus-effects/project.nova` | Buses, effects, snapshots, meters, ducking, and voice limits |
| `audio-streaming/project.nova` | Streaming profile, trim/loop points, codec metadata, latency, and underruns |
| `script-lifecycle-signals/project.nova` | Complete callback order, property metadata, and editor-visible signal connections |
| `script-async-tasks/project.nova` | Timers, deferred tasks, cancellation, and entity ownership |
| `script-debugger-scenarios/project.nova` | Conditional/function/hit-count breakpoints, logpoints, locals, and watches |
| `script-test-runner/project.nova` | Setup/teardown, cases, tags, skip, timeout, deterministic seeds, and CI reports |
| `script-api-v1-examples/project.nova` | Stable handles and API v1 namespace coverage |
| `build-automation/project.nova` | Seven-command CLI, presets, caches, content rules, reports and CI logs |
| `package-authoring/project.nova` | Manifest contract, permissions, signature failures, quarantine and rollback |
| `source-control-workflow/project.nova` | Structured diffs, no-op output, Git setup, CI and locks |
| `web-deployment/project.nova` | Tier-1 browser matrix and deterministic HTTPS deployment |
| `headless-networking/project.nova` | Optional Experimental networking and headless-server gates |

`plugins/hello-plugin` is a minimal, permission-free Plugin API 2 package. Import its manifest in **Packages → Plugin API** and select the included WASM entry. Plugin failures are isolated and can be bypassed with Safe Mode.

Import `workspace-recovery-validation.nova-workspaces` from **View → Manage Workspaces**. The validation project is deliberately small enough to exercise repeated edits, 100 undo/redo operations, autosave snapshots, forced termination, safe-layout startup, and monitor recovery without unrelated content noise.

Generated by `pnpm references`. Do not hand-edit generated project files; edit `src/projects/templates.ts` and regenerate them.
