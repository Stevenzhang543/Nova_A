# Nova_A calendar versioning from 2026

Nova_A uses a creator-facing calendar release name beginning with **26.01**. The first two digits are the year and the second pair is the ordered release in that year. The planned sequence is 26.01 through 26.10; a corrective release appends a patch label such as 26.01.1.

Cargo, npm, Tauri, MSI, package manifests, and semantic-version range solvers do not accept a leading-zero minor field. Nova_A therefore records two deliberately different values:

- Release name: 26.01. This is shown in the editor, documentation, release directory, archive names, and user communication.
- Machine version: 26.1.0. This is written to Cargo/npm/Tauri metadata, project engineVersion, build reports, SBOMs, and compatibility comparisons.

The mapping is one-to-one: 26.01 = 26.1.0, 26.02 = 26.2.0, 26.03 = 26.3.0, 26.04 = 26.4.0, and 26.10 = 26.10.0. Code must import the centralized release constants instead of embedding either string. The current release is **26.04** with machine version **26.4.0**.

This is a version-policy migration, not a project-schema migration. Project Format 2/schema 29 and the frozen Rhai API 2, Visual Graph 1, Plugin API 2, Package Manifest 1, Build CLI 1, and Workspace Document 3 contracts remain unchanged through 26.04. Historical projects whose reviewed maximum was 8.0.0 receive a metadata-only preview to widen that ceiling to 27.0.0; preview, backup, deterministic diff, atomic apply, and rollback remain mandatory.
