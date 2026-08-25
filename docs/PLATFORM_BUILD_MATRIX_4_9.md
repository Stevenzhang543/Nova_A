# Nova_A 4.9 platform and build matrix

Nova_A separates target visibility, export availability, and support tier. A visible target is not automatically qualified.

| Target | Tier | Local availability | Required host | Release boundary |
| --- | --- | --- | --- | --- |
| Windows x86-64 | Tier 1 | Editor, player, portable, MSI, setup | Windows x86-64 | Unsigned locally; publisher signing remains external. |
| Web | Tier 1 | Player export on every editor host | Any supported host | Pinned Chromium is local evidence; Firefox/WebKit are matrix jobs. |
| Linux x86-64 | Experimental | Matching-host CI only | Linux x86-64 | No Stable channel until clean-machine input/audio/render/export evidence passes. |
| macOS x86-64/arm64 | Experimental | Matching-host CI only | Matching macOS host | Signing, notarization and hardware evidence are mandatory. |
| Android arm64 | Experimental, unavailable | None | None declared | Remains unavailable until SDK/template/sign/install/runtime matrices pass. |

Build Settings owns the version-pinned export template, content include/exclude rules, unused-asset stripping, compression, symbols, crash artifacts, provenance, SBOM, deployment policy and clean-machine job. Unsupported cross-targets fail before project or output mutation.

CLI examples:

```text
pnpm nova export --project project.nova --target windows --profile release --cache validate --jsonl
pnpm nova export --project project.nova --target web --profile release --cache validate --jsonl
```

Linux/macOS commands must run on matching hosts. Nova_A never implies remote build capacity and never sends project data to a service automatically.
