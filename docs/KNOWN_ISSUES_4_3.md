# Nova_A 4.3 known issues and qualification gates

No open severity-0 or severity-1 defect was found by the local v4.3 compiler, audit, deterministic authoring checks, Rust tests, web production build, layout qualification, or packaged Windows launch smoke.

Truthful external gates remain pending until their named environments or credentials are available: five independent clean builds; 24-hour mixed editor/player soak; clean disposable Windows install/upgrade/uninstall and rollback; publisher code signing and timestamp verification; independent malware/security scan; physical 100/125/150/175/200% DPI and assistive-technology review; Firefox/macOS/Linux matching-host qualification; store/notarization approval. Linux and macOS remain Experimental, and mobile/console remain Unsupported.

The component model intentionally permits one active record per concrete component kind. Copy/paste and presets are the supported duplication workflow. Scene inheritance stores authoring metadata and dependency relationships; it does not merge two simultaneously edited scene documents in real time. Prefab variant conflict resolution is explicit Apply/Revert/Reset/Unpack rather than an automatic three-way merge.
