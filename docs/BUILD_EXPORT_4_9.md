# Nova_A 4.9 build and export guide

Build Settings is organized around preset, platform, content/delivery, diagnostics/history and optional team metadata.

1. Choose a version-pinned preset and target. Availability and evidence appear beside the target.
2. Set application identity/version and choose signing mode. Signing identities remain user-local and are never serialized into project files.
3. Select startup scenes and content include/exclude rules. `stripUnusedAssets` removes only content outside the dependency closure.
4. Enable deterministic output, provenance and SBOM for Release builds. Stable also requires the Release profile.
5. Configure local output or an explicit HTTPS remote hook. Nova_A writes a deployment manifest but does not invoke remote delivery implicitly.
6. Build, inspect diagnostics, then compare build history input/output hashes and cache keys.

Outputs contain `nova-build-report.json`, `nova-build-provenance.json`, `nova-sbom.cdx.json`, `nova-deployment-manifest.json`, cache diagnostics, size/dependency reports, optional patch manifest and symbol workflow metadata. Web exports can include `_headers` with safe cache and browser-policy defaults.

Signing and notarization hooks are recorded as external explicit steps. They are not shell-evaluated from project data. Clean-machine jobs cover install, launch, upgrade, repair and uninstall on disposable hosts.
