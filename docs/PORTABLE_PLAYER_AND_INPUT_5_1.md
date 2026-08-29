# Portable games and input in Nova_A 5.1

## Can Nova_A make a real game executable?

Yes. `.json` and `.nova` remain editable project interchange formats. A Windows Build preset can produce either:

- **Portable application** — one `.exe` containing the player and the compressed `.nova-pak` game payload; or
- **Player + data pack** — an executable beside `game.nova-pak` for teams that prefer separately replaceable content.

New Windows and Linux projects default to the portable option in 5.1. Existing projects that explicitly selected sidecar packaging keep their choice. Desktop builds are matching-host builds; this Windows editor does not pretend to produce qualified macOS/Linux executables without those toolchains. The current local binaries are unsigned unless the publisher configures signing.

At startup, an embedded player verifies its package footer, bounded payload size and SHA-256 digest. The standalone player mounts without editor shortcuts, mutation routing or recovery overlays.

## Can it make Snake?

Yes. Select the **Snake** project template, create the project and press Play. It demonstrates a complete small-game loop:

1. `input_axis("move_x")` and `input_axis("move_y")` read Arrow/WASD or gamepad D-pad actions.
2. A repeating timer advances the head on a grid and wraps it at the playfield edges.
3. Signals propagate the previous position through the body segments.
4. A trigger detects the food, deterministic random relocates it and a signal updates the score UI.
5. Build Settings can package the project as a portable application.

This proves keyboard-controlled gameplay, scripted movement, collision/trigger behavior, signals, timers, UI and export in one inspectable project. More elaborate growth/abilities are part of the dynamic-object API work in 5.4.

## Input devices and API

Input actions can bind keyboard logical or physical keys, mouse buttons/wheel/motion, gamepad buttons/axes, touch and gestures. Actions can be a button, one-dimensional axis or two-dimensional vector and support dead zones, response curves, modifiers, chords, conflict detection, rebinding, recording and replay.

Rhai gameplay scripts use:

```rhai
if input_pressed("jump") { apply_impulse(0.0, -8.0); }
let horizontal = input_axis("move_x");
let direction = input_vector("move_x", "move_y");
let pointer = input_mouse_position();
let wheel = input_mouse_wheel();
```

The exact stable functions, types and failure behavior are generated in the Script API documentation. Gameplay code should read named actions instead of hard-coded keys so rebinding and multiple devices continue to work.

## Build checklist

1. Open **Manage → Build Settings** and select Windows x64.
2. Confirm the artifact preview says **Portable application**.
3. Resolve every blocking Project Health issue.
4. Choose **Build & Run** for a local smoke test, then **Build** for the release artifact.
5. Copy only the resulting `.exe` to a clean folder and launch it.
6. Verify input, scene transitions, saves and quit behavior without the editor.
7. Sign the executable before public distribution if publisher identity is required.

