# Nova_A 6.0.3 template export and accessibility audit

Engine **6.0.3**, Project Format 2/schema 29.

Open **project.nova** without changing Build Settings. The Windows x86-64 Game target must select the installed **windows-x64-v1** export template and produce no template-registration error. Build a single portable executable, launch it, move the blue block, clear all eight orange targets, reach 8 / 8, and show the congratulations UI.

The Game HUD, score, instructions, congratulations panel, and congratulations text are passive visual nodes. They must not enter keyboard/gamepad focus or produce accessible-name and duplicate-reading-order findings. Interactive UI authored in Interface uses explicit roles, labels, reachable focus, and positive unique order; order 0 remains automatic scene order.

At 1024 × 640 through 2560 × 1440, 100% through 200% scale, and English/German/Chinese, every editor block and label remains inside a reachable owning panel. Publisher signing and independent clean-machine/hardware/72-hour evidence remain pending external gates.
