# Build your first Nova_A 5.0 game

Create a **Platformer** project in the launcher. Give it a valid project path and open it. The template is authored in Rhai API v2 and uses Project Format 2 schema 29. In Design, select the player, inspect Transform2D, RigidBody2D/CharacterBody2D and Collider2D, and use Play/Stop to verify input and collision. Grid/world units are metres; a transform delta of 10 moves exactly 10 world units.

Open Script and read the generated `.rhai` file. Problems links to Script Studio help; API v1 may appear only on migrated legacy assets and cannot be selected for a new script. Run the project tests, then inspect Debug, Physics Monitor, Console, Profiler, and collision timeline. Stop play before editing source state.

Open Manage → Project Health. Resolve missing references, package conflicts, script diagnostics, accessibility failures, and build errors. Create a backup before migration or repair. Then open Manage → Build, choose Windows or Web, Release, clean cache, provenance, SBOM, and explicit content rules. Build Windows locally on Windows. Build Web and serve it through HTTP(S) with the generated headers; do not use `file://`.

Use the corresponding `first-game-v50-tier1` reference project if any step differs. The reference controls and expected output are testable. Shipping certification additionally requires clean-machine lifecycle, external browsers, reproducibility, signing where applicable, the observation window, and independent verification; a successful local Build button does not substitute for those gates.
