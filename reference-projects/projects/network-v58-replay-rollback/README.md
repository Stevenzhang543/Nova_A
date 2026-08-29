# Replay and Rollback 5.8

Engine **5.8.0**, Project Format 2/schema 29. This reference exercises protocol 2, bounded RPC and replication, explicit network permission, replay comparison and local-first multiplayer without an implicit cloud connection.

## Required packages:

- Nova Optional Networking (included in this project's Package Manifest 1 lockfile).

## Target platforms:

- Windows x86-64 desktop runtime and headless server; local lobby also works in the supported Chromium runtime.

## Test workflow

1. Open Network Studio and review the Session, Protocol, Replication, Simulation and Diagnostics tabs.
2. Keep permission enabled, start two localhost processes and invoke `player.ready`.
3. For loss/reconnect references, enable the deterministic link simulator and reconnect a client.
4. Record, export and compare a replay; divergence must identify its first mismatching tick.
5. Export diagnostics and confirm endpoints, tokens, secrets and authorization values are absent.

## Known limitations

Public-internet NAT traversal, hostile-network review, publisher signing, matching-host non-Windows builds and long cross-machine soak remain external certification gates.
