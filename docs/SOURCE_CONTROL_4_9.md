# Nova_A 4.9 source control and optional team workflow

The Team page is opt-in and local-first. Disabling it does not disable saving, building or source control outside Nova_A.

- Stable project text makes scene/resource diffs reviewable.
- The generated `.gitignore` excludes caches/builds while retaining project and package locks.
- Inline semantic comparison reports scene, asset, prefab, resource, settings and package changes.
- External diff/merge commands are configured by the user and invoked only through explicit buttons.
- Ownership rules export to `CODEOWNERS`; task links and change notes travel as project metadata.
- Shared build presets contain no user-local signing identity or output directory.
- Binary locks are advisory metadata. Enforcement belongs to the selected Git host/LFS workflow.
- Repository initialization writes hooks and CI templates only inside the chosen project directory.

There is no mandatory Nova_A cloud account. The network toggle describes permission to perform future explicit repository operations; it never starts background synchronization.
