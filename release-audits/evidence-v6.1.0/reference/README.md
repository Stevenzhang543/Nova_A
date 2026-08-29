# Nova_A 6.0.4 linked build and performance audit

Engine **6.0.4**, Project Format 2/schema 29.

Open **project.nova**, leave the complete Mouse Knockout game unchanged, and create a visual graph. In its Generated Rhai tab choose **Create / update linked Rhai**. Change the log-message string in Script Studio and save: the matching API node input must change. Change it visually and save the graph: the linked Rhai must regenerate. Add a top-level helper function in Rhai; it must reappear as a visible Code node and survive save/reload. An ordinary script without an @nova-graph-link marker must remain untouched.

Build a Windows x86-64 single-file game, leave it running, and build again to the same folder. The first player stays alive and the second build succeeds with a build-ID suffix when Windows locks the preferred name. The player remains a valid NOVAPK2!/SHA-256 executable.

Exercise Balanced, Low-end and High quality editor profiles. Low-end reduces redundant idle editor work but does not alter project data, exported output, active tool/camera animations, gameplay cadence, or visual quality inside the game. Publisher signing, independent clean-machine/hardware evidence and 72-hour soak remain external gates.
