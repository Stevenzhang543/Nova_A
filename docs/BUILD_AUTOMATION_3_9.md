# Nova_A 3.9 build automation

The Build CLI is the authoritative automation surface:

    pnpm nova validate --project project.nova --jsonl
    pnpm nova import --source Assets/hero.png --output .nova/imported/hero.json --reproducible --jsonl
    pnpm nova test --project project.nova --jsonl
    pnpm nova build --project project.nova --target windows --output Builds/Game --cache validate --jsonl
    pnpm nova export --project project.nova --target web --output Builds/Web --cache clean --jsonl
    pnpm nova package --manifest Packages/example/manifest.json --output Builds/example.nova-package --jsonl
    pnpm nova version --jsonl

Build Settings persists shared presets, content inclusion/exclusion, stripping, compression, symbols, reports, branding and manifests. Output folders and signing identities are user-local. Release builds should use clean or validate, deterministic output, size/dependency reports and archived crash symbols. JSONL logs use the nova-cli-log envelope.

The cache report distinguishes changed files and hits. Clean ignores reusable outputs, incremental reuses identical files, and validate requires deterministic hash agreement. Reproducible archives use sorted paths, fixed timestamps and stable JSON. Host toolchains, platform signing and notarization remain documented nondeterministic boundaries.
