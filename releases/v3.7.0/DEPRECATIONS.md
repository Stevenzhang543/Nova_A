# Nova_A 3.7 deprecations

- Raw material uniform/texture JSON remains available under **Shaders → Advanced** but is no longer the default authoring surface. Typed controls are the supported primary workflow.
- Renderer controls that the active Canvas2D fallback cannot execute are hidden and reported, not silently accepted.
- Unbounded shader loops, discard, storage/image operations, cube/3D samplers and fragment-depth writes remain outside the safe 2D shader subset.
- No public runtime, plugin, package, build, scripting, animation, physics or editor feature was removed.
