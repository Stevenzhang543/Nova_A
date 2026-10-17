# Nova_A 26.10 reproducibility protocol

Reproducibility is evaluated at three different levels. Passing one level must not be reported as passing the next.

## Level A — deterministic project and game output

For one clean source identity and locked toolchain:

1. Validate and canonicalize the project twice without changing it.
2. Require byte-identical canonical project output, stable manifest ordering and normalized line endings.
3. Build each representative code, block and mixed-authoring game twice.
4. Compare included paths, package identity, scene order, generated Rhai, Visual Graph semantic IDs, assets, player metadata and SHA-256 values.
5. Run the same recorded inputs and compare fixed-tick state, event order, physics/render/audio/network checksums and expected gameplay assertions.
6. Confirm that an editor performance profile cannot alter project data or exported-player quality.

A deterministic manifest does not excuse a nondeterministic payload. Timestamps, locale-dependent sorting, absolute paths, random temporary names and filesystem enumeration order must not enter canonical output.

## Level B — same-machine full release reconstruction

Run the complete release process twice from the same clean source identity and pinned dependencies into two empty staging roots. Archive generation must use canonical path order, fixed timestamps and normalized metadata. Compare every distributable byte-for-byte, then independently extract and verify:

- no absolute developer path, private key, `.env`, repository metadata, dependency cache, target directory or reparse-point escape;
- exactly the required release members and checksum entries;
- each SHA-256 against the extracted file rather than trusting the embedded manifest;
- source archive rebuildability with the documented offline dependency/toolchain boundary;
- Web archive startup through HTTP(S);
- Windows portable player launch and clean exit;
- installer metadata, architecture and product identity.

If platform-native packaging embeds nondeterministic signed metadata, separate the unsigned reproducible payload result from the signed distribution result and explain the exact byte difference. Never relabel content-equivalent files as byte-identical.

## Level C — independent-machine reconstruction

Level C is `deferred-external`. On a second machine:

1. Obtain the exact source commit/archive SHA-256 and toolchain lock from the release evidence, not from the first build directory.
2. Verify the host identity, operating system, architecture, Node/pnpm/Rust/WASM/Tauri versions and dependency hashes.
3. Build without reusing the first machine's caches or output.
4. Compare all unsigned distributables byte-for-byte and record signed-artifact differences separately.
5. Attach commands, exit codes, logs, artifact hashes and reviewer identity to `pending-external/second-machine-reproduction.json`.

Until that evidence exists, the correct statement is “same-machine deterministic reconstruction passed; second-machine reproduction pending,” never “fully reproducible everywhere.”

## Source identity and dirty-state rules

Every evidence bundle records the exact Git commit when available, branch/ref only as context, submodule identities, dirty/untracked status, lockfile hashes and `SOURCE_DATE_EPOCH`. A filesystem snapshot without Git history may qualify local mechanics, but it must be labeled `filesystem-snapshot`; it cannot invent a commit, tag, signature or clean state.

Dirty source may be tested during development. A final public release candidate must either be built from an identified clean source or include a canonical patch/untracked-file manifest that completely reconstructs the tested tree. Generated evidence must never hardcode `dirty: true` or `dirty: false` independently of the actual source.

## Performance and visual equivalence

Optimization qualification uses identical fixtures, seeds, input traces and frame counts. Compare canonical saves, runtime checksums, event logs and representative screenshots. Startup, panel switch, Inspector reveal, draw/drag input-to-pixel, graph gestures, p95/worst frames and memory slope are measured without deleting features, visual feedback or animation. Reduced motion is a user preference and must not be silently enabled to improve benchmark numbers.

## External gates

Publisher signing identity, notarization, another-machine reproduction, a real low-end device and a 72-hour wall-clock soak remain `deferred-external`. Empty templates and planned commands are not evidence. See `CLEAN_MACHINE_QUALIFICATION_26_10.md` and `PLATFORM_GAP_REGISTER_26_10.md`.
