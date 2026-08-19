# Nova Rhai API v1 deprecations

Nova_A 3.5 does not remove a frozen API v1 symbol. The language service and runtime classify compatibility aliases as deprecated so projects can migrate before 4.0 without interruption.

## Policy

- Every warning has a stable diagnostic code, exact source range, replacement, and documentation entry.
- Deprecated calls remain executable throughout the API v1 compatibility window unless they are unsafe unstable host handles; those are rejected with an explicit error.
- Undocumented globals are diagnosed instead of being inferred.
- New templates never generate unsupported callbacks.
- `tests/fixtures/scripting/api-v1-contract.json` is the archived symbol contract checked by release verification.

Open Script Studio → Problems to apply an available replacement quick fix, or browse Script Studio → API for the canonical signature and example. The complete generated contract is in `docs/RHAI_API_V1.md`.
