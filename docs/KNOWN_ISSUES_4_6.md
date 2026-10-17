# Nova_A 4.6 known issues and qualification boundaries

- Script Studio's project tests use the scripts attached to loaded project entities. The headless runner is the authoritative whole-source-folder/CI discovery path.
- Tests that mutate the editor's shared world execute serially. Use deterministic CLI shards for parallel CI.
- Remote debug is intentionally loopback-only. WAN debugging, port forwarding, and unauthenticated exported players are unsupported.
- The bundled protocol is a documented integration path, not a packaged VS Code/JetBrains extension.
- API v1 remains supported per imported asset and produces migration diagnostics. Conflicting aliases are scheduled for removal no earlier than API v3; no 4.x project is silently rewritten.
- Windows x86-64 and the supported Chromium web runtime are Tier 1. Clean-machine installer, Firefox/WebKit, Linux/macOS, real exported-player remote-debug, and 24-hour soak status must be read from release evidence; pending evidence is not a pass.
- Function/line/API coverage is practical source instrumentation, not native Rust instruction coverage.
