# Nova_A 4.0 dependency and license review

Nova_A source is distributed under the repository `LICENSE.md`. The release evidence contains the generated SPDX software bill of materials and third-party notices derived from the locked Cargo and pnpm graphs.

Release review verifies exact lockfiles, direct dependency purpose, known advisory status available to the build environment, source/license metadata, bundled fonts/icons/assets, and package-template samples. Unknown or incompatible licenses, unlocked network downloads, and dependencies without provenance block Stable publication. This repository does not assert that a local offline review replaces legal advice or registry advisory services.

The v4 qualification used npm's advisory registry and a 1,217-entry RustSec snapshot. npm reported no known vulnerabilities. RustSec reported no vulnerabilities after the Tauri 2.11 alignment and patched `bytes`, `plist`/`quick-xml`, and `time` lock updates. Its remaining allowed notices concern unmaintained or unsound transitive crates (primarily Experimental Linux GTK3 bindings, build-time helpers, and Rhai's `smartstring` dependency); they are recorded as S2 maintenance debt and are not hidden as a clean advisory-free graph. The desktop toolchain MSRV is Rust 1.88 because the patched graph requires it.
