# Nova_A 5.0 build and export guide

Open **Manage → Build**. Choose a version-pinned preset, game name, Tier-1 target, architecture, Release profile, startup scene, and output directory. Release output must use deterministic metadata, provenance, an explicit include rule, and the pinned export template. SBOM and generated web headers are strongly required; Stable channel output cannot use development diagnostics. Remote deployment, signing, and notarization are hooks only: Nova_A records them and never runs a network or credential-bearing command implicitly.

The Build warning list has a `?` help target for every diagnostic. Fix red errors before Build; warnings remain visible in Project Health and release evidence. Platform errors link to the support matrix, privacy errors to the privacy contract, and content/build errors to this guide or Project Health.

CLI contract 1 is frozen. Validate with `pnpm nova validate --project project.nova --jsonl`; export with `pnpm nova export --project project.nova --target windows|web --profile release --cache clean --jsonl`. Structured logs, exit codes, build manifest, content manifest, provenance, CycloneDX SBOM, size/dependency reports, symbols, and deployment headers are stable outputs. Host-incompatible or unavailable targets fail closed.

Before distribution, compare two clean unsigned payload manifests, then test portable/MSI/setup launch, upgrade, repair, uninstall, and hosted Web output on disposable Tier-1 environments. Signing timestamps and installer metadata are excluded only according to the documented reproducibility model. Retain the command log, exact source identity, toolchain, hashes, and evidence. A local package is a candidate until independent and time-based gates are attached.
