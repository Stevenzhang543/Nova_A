# Nova_A 4.0 known issues and workarounds

No open S0 or S1 defect is accepted by the repository qualification. Remaining release-operator boundaries are recorded as S2 until completed: publisher signing/signed tag, disposable-VM installer lifecycle, matching-host Linux/macOS promotion, and one-thousand aggregate beta/automation soak hours. Experimental networking remains outside the core stability promise.

The final advisory scan reports zero known vulnerabilities after updating `bytes`, `quick-xml`, `time`, and the Tauri dependency family. RustSec still reports informational maintenance/unsoundness notices in `smartstring` and Linux/GTK3/build-only transitive crates; none is a known exploitable vulnerability in the Windows Tier-1 binary, but dependency replacement/upstream migration remains an S2 maintenance item. Vite also retains two non-fatal shared-chunk advisories; measured output and layout qualification pass, so late code-splitting is deferred to a profiled patch rather than risk release behavior.

The authoritative machine-readable record is `release-audits/v4.0.0-known-issues.json`; Studio Status carries a versioned offline feed. Each accepted S2 record includes its workaround and patch/release gate. Do not interpret a local automated pass as proof that an external gate ran.
