# Migrating to Nova_A 3.5.0

Nova_A 3.5.0 upgrades Project Format 2 to schema 25. Opening an older supported project (schemas 5–24) previews and validates the migration before replacing editor state. Keep the automatically retained original if the project must return to an older editor.

## Script API version

New and migrated script assets declare `apiVersion: 1`. Nova Rhai API v1 is frozen for the 4.0 compatibility window. A migrated script without an explicit version is assigned API v1; its source is not rewritten.

## Export metadata

The legacy shorthand remains accepted:

```rhai
@export speed = 10.0;
```

New scripts should use explicit metadata when authoring constraints matter:

```rhai
@export(type="float", default=10.0, min=0.0, max=100.0, step=0.5,
        group="Movement", tooltip="World units per second", serialize=true)
let speed = 10.0;
```

Schema 25 stores the parsed type, default, range, step, enum/resource constraint, group, tooltip, and serialization decision. Existing values are preserved and clamped only when an explicit valid constraint requires it.

## Breakpoints, tests, signals, and recovery

Simple numeric breakpoint lines migrate to detailed enabled line breakpoints. New condition, hit count, log message, and function fields default to empty. Script tests, package/dependency metadata, reload policy, signal connections, recovery source, and last-saved source hash are additive and do not change old runtime behavior when absent.

## Deprecated compatibility names

Deprecated aliases still compile under API v1 and emit a warning with the supported replacement. Update them at a convenient time; they are not silently removed. Unsupported callback templates are removed from the creation menu, but existing source is retained and diagnosed.

## Hot reload behavior

- `preserve`: keep exported values whose types remain compatible.
- `recreate`: discard instance values and run lifecycle with new defaults.
- `disabled`: keep the active compiled program and report that reload was skipped.

All modes validate before activation. A failed compile leaves the previous valid instance running.
