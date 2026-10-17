# Platform verification matrix

Nova_A 3.0 source supports Windows, Linux, macOS, web, and an official optional Android export contract. `.github/workflows/release-matrix.yml` defines clean Windows/Linux/macOS Rust, TypeScript, audit, web-build, and native Tauri bundle jobs.

| Platform | Local v3 release evidence | Clean-runner evidence | Release position |
| --- | --- | --- | --- |
| Windows x64 | Full portable EXE, MSI, NSIS, web/source/reference ZIPs; native startup smoke passed | Workflow defined | Locally qualified and checksummed; publisher signing remains pending |
| Web | Production Vite build and local browser smoke | Three-OS workflow defined | Qualified after local build/smoke passes |
| Linux x64 | Not produced on this Windows host | Ubuntu WebKit/Tauri job defined | Pending a successful uploaded CI bundle |
| macOS | Not produced on this Windows host | macOS Tauri job defined | Pending a successful uploaded CI bundle and signing/notarization by the publisher |
| Android | Optional package contract and SDK/JDK validation only | Contract job defined | APK/AAB production qualification remains pending; no signed Android binary is claimed in the core release |

A CI definition is not itself proof that a job passed. Release evidence must link or attach the successful run/artifact before changing “pending” to “qualified”. Signing identities, notarization credentials, Android keystores, and console SDKs are not stored in this repository.
