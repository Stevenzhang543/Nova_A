# Nova_A 3.9 package ecosystem

Package Manifest 1 requires semantic version, engine and package-API ranges, explicit permissions, one entry-point type, dependency hashes, archive SHA-256 and a verifiable registry signature. The deterministic lock records source, version, type, digest, signature and dependency digests.

Stable blocks malformed, unsigned, permission-escalating and engine-incompatible installs. Failed verification enters quarantine and disables the package. Permission changes require a new review. The manager keeps up to five verified rollback manifests, verifies offline caches, and Recovery safe mode disables non-first-party packages.

Registry browsing is metadata-only. Package types are editor extensions, build extensions, importers, runtime packages and templates. Native extensions remain externally reviewed and disabled by the browser. Use templates/package-authoring, the CLI publish validator, and the security reference project.
