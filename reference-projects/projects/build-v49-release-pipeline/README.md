# Build 4.9 Release Pipeline

Engine **5.0.1**, Project Format 2, schema 29.

Required packages: None; the package fixture may additionally load `../../plugins/hello-plugin/plugin.json` after reviewing its permissions and provenance.

Target platforms: Windows x86-64 and Web (Tier 1). Linux and macOS are matching-host Experimental targets; mobile is unavailable.

Known limitations: signing, disposable clean-machine lifecycle, external browsers, independent-machine reproducibility and the 14-day RC window require real external evidence.

## Purpose

Validates provenance, SBOM, web headers, release channel, clean-machine job, build comparison without a mandatory cloud service.

## Procedure

1. Open `project.nova` and follow `test-controls.json`.
2. Resolve local Project Health failures before export.
3. Build both declared Tier-1 presets and retain manifests, hashes, logs, provenance, and evidence.
4. Treat matching-host Linux/macOS, mobile, clean-machine lifecycle, independent-machine reproducibility, and the 14-day RC window as external gates until signed evidence is attached.
