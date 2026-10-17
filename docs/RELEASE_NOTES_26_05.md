# Nova_A 26.05 release notes

Machine version: **26.5.0**. Project Format: **2**. Schema: **29**. Rhai API: **2**. Visual Graph: **1**.

## Added

- Rendering Studio → Production, with one live checklist for materials, render passes, texture streaming, animation, audio and cinematics, shared by Project Health and Build validation.
- Configurable bounded texture residency and least-recently-used WebGL eviction, visible uploads/evictions/memory/miss diagnostics, and complete GPU texture cleanup.
- Deterministic numbered PNG sequence capture with fixed media time, integer audio sample ownership, optional UI composition, frame/memory limits and downloadable frames.
- Balanced and Low-end production profiles with an explicit same-semantics contract.
- A production-media reference project, EN/DE/ZH controls, updated teaching manual, generated feature inventory, implementation/layout contracts and release evidence.

## Changed

- Existing material/visual shader fallback, animation, timeline and audio validators now participate in the same build-readiness result.
- Performance, Balanced, High, Ultra and Pixel Art presets now select intentional texture residency and upload budgets in addition to their retained visual budgets.
- Renderer statistics use one backend-independent shape; Canvas2D truthfully reports zero GPU texture residency.
- Public and machine authorities advance from 26.04/26.4.0 to 26.05/26.5.0.

## Fixed

- WebGL texture handles are no longer retained indefinitely after their content becomes idle, the context is restored, or the renderer is destroyed.
- The final frame in a bounded capture retains its deterministic frame/time label even when reaching the maximum frame limit stops recording.

## Preserved

No feature, animation, public API, project field or schema was removed. Existing projects, assets, scripts, graphs, materials, animation, audio, timelines, templates and games keep their save/runtime/export behavior. Low-end changes budgets and presentation quality only.

## Qualification boundary

Local automated, source, build and package evidence is included. Publisher signing, independent clean-machine/usability/accessibility/security review, matching-host non-Windows builds, hardware/store certification and real wall-clock soak remain external.
