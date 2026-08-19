# Archived engine compatibility guidance

Teams that cannot upgrade immediately should pin the exact Nova_A version, source commit/tag, package lock, Node/pnpm/Rust toolchains, and target platform in version control. Keep installers, portable binary, web package, source archive, reference projects, evidence archive, release notes, and `SHA256SUMS.txt` together.

Do not open the only production copy in a newer Development build. Branch first, run `nova validate`, archive the original, review Upgrade Assistant output, and compare deterministic saves/build reports. A 4.0 save remains schema 29, but 3.x tools are not promised to understand 4.0 support metadata or later patch corrections. Use the downloaded pre-upgrade copy for an actual downgrade.

Security fixes are not backported indefinitely. If remaining on an archived engine, isolate package registries, accept only pinned hashes/signatures, disable unnecessary network permissions, and document the owner and upgrade deadline.
