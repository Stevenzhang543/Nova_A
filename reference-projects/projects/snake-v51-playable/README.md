# Snake v5.1 playable reference

Engine **5.3.0**, Project Format 2, schema 29.

Required packages: None; Nova_A core only.

Target platforms: Windows x86-64 and Web (Tier 1). The single-file executable is a matching-host Windows build.

Known limitations: this focused fixture does not certify publisher signing, independent clean-machine launch, other desktop hosts, gamepad hardware, or a long-duration soak.

## Purpose

Open `project.nova`, press Play, and steer with Arrow keys, WASD, or a standard gamepad D-pad. The head moves on a timer; body segments follow through signals; the food uses a trigger and deterministic random relocation; the score listens for the score signal. Build Settings defaults to a single portable Windows executable.

## Validation

Create/open, Play, steer in four directions, collect food, rebind one action, Build & Run, then launch the copied executable without a sidecar pack.
