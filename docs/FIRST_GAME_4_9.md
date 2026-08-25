# Nova_A 4.9 first-game tutorial

## 1. Create

Open the launcher, choose the Platformer template, select an empty project folder and create the project. The tutorial remains project-local and can be dismissed.

## 2. Author

In Design, create a player rectangle and floor. Add `RigidBody2D`/colliders through the Inspector, set the player to the character controller required by the template and save with Ctrl+S. Project Health must show no missing reference or schema error.

## 3. Script and test

Create a Rhai API v2 script in Assets, attach it to the player, and use Script Studio diagnostics. Start Game preview, exercise input, pause/step, and inspect physics/runtime values. Run the project test controls before export.

## 4. Build Windows and web

Open Build Settings. Choose Windows Tier-1 release, select the startup scene, keep provenance/SBOM enabled, and build. Repeat with Web Tier-1 release. Serve web output over HTTP(S); never open its HTML through `file://`.

## 5. Release readiness

Return to Project Health. Resolve every blocking schema, content, package, renderer/audio and build diagnostic. External signing, clean-machine, Firefox/WebKit and RC-observation gates remain visible until their evidence is attached.
