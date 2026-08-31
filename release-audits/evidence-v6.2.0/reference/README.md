# Nova_A 6.2.0 behavior-contract audit

Engine **6.2.0** · Project Format 2 · schema 29

Open **project.nova** and inspect **Assets/Scripts/KnockoutGameManager.rhai** in Script Studio → Contract. Strict and deterministic must be active; commands must be 32 and logs 8. Play the complete Mouse Knockout game and push all eight targets out. The contract must not change physics or scoring.

Add **// @requires input MissingAction**, save, and Play: Script Studio, Project Health, Build Settings, and runtime must identify the missing input. Replace it with a real action or remove it; the game must run immediately. Change **// @budget commands 32** to zero and verify a precise range diagnostic, then restore 32. Add **mouse_x()** to this deterministic script and verify the host-dependent diagnostic, then undo.

Existing scripts without a contract remain valid. Graph↔Rhai synchronization and Project Format 2/schema 29 remain unchanged. Publisher signing, independent clean-machine/hardware certification, matching-host builds, and a 72-hour soak remain external.
