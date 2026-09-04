# Nova_A 26.07 co-op rollback

Engine **26.7.0** · Project Format 2/schema 29 · Network Protocol 2

This local-first reference contains two scripted rigid-body players, a bounded `coop.move` RPC, server-authoritative transform/rotation/velocity replication, prediction on the client body, interest radius, reconnect, late join, scene handoff, replay/save settings, and deterministic bad-network controls. Networking is explicit and uses native UDP loopback; no Nova_A cloud is contacted.

In **Network Studio → Orchestration**, build once and exercise 2, 4, then 8 instances. Each process must expose a distinct role/identity, bind/endpoint, editor-event log scope and player Inspector identity. Simulate 80 ms latency, 20 ms jitter, 5% loss, 3% reorder and 2% duplication with seed 2607. The 26.07 rollback check restores authoritative transform/rotation/velocity and reapplies recorded fixed-tick state deltas; it does not rerun InputSnapshot values through physics or Rhai. A counter or visual blend is not enough. Follow `test-controls.json` for the normal-user gate.
