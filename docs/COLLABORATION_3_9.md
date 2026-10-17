# Nova_A 3.9 collaboration

Project output is canonical and stable. The source-control page separates project metadata, shared settings, package locks, scenes, prefabs, resources and assets; it provides before/after views and external three-way comparison. No-op saves produce identical canonical text.

Output directories, signing identities, layout and editor preferences are user-local. Generated caches/imports/builds are ignored and marked disposable. Package locks remain authoritative. Optional .nova-lock files coordinate binaries only when a team opts in.

Repository initialization uses an existing directory and invokes Git without a shell. It never overwrites an existing ignore, hook or CI file. Downloadable pre-commit and CI templates run project validation and source checks.
