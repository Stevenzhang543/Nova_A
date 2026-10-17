"""Builds comparison tables from analyze_latency.py summaries.

usage: python report_latency.py <results-dir> <label>[,<label>...] > tables.md
Each label is read from <results-dir>/<label>-key-summary.json, <label>-drag-summary.json and
<label>-frames-summary.json when present. Missing data prints as N/A, never as 0.
"""
import json, os, sys

def load(directory, label, mode):
    path = os.path.join(directory, f'{label}-{mode}-summary.json')
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else None

def cell(stats, digits=1):
    if not stats or not stats.get('n'):
        return 'N/A'
    f = lambda value: f'{value:.{digits}f}'
    text = f"{f(stats['mean'])} / {f(stats['p50'])} / {f(stats['p95'])}"
    if 'p99' in stats:
        text += f" / {f(stats['p99'])}"
    return text + f" (n={stats['n']})"

STAGES = [
    ('sendToReceivedMs', 'SendInput → app handler (cross-clock)'),
    ('eventTimeStampToHandlerMs', 'OS event timestamp → handler'),
    ('receivedToConsumedMs', 'handler → Runtime fixed step consumed'),
    ('consumedToSubmittedMs', 'consumed → first WebGL2 world submit (flush)'),
    ('receivedToSubmittedMs', 'handler → submit (inputToSubmit)'),
    ('submittedToCapturedMs', 'submit → change seen in desktop capture (cross-clock)'),
    ('sendToCapturedMs', 'SendInput → change seen in desktop capture (end to end)'),
]

def main(directory, labels):
    labels = labels.split(',')
    for mode, edge_names in (('key', ('down', 'up')), ('drag', ('move-right', 'move-back'))):
        docs = {label: load(directory, label, mode) for label in labels}
        if not any(docs.values()):
            continue
        for edge in edge_names:
            print(f'\n### {mode} — {edge} edge (mean / P50 / P95 [/ P99] ms)\n')
            print('| Stage | ' + ' | '.join(labels) + ' |')
            print('| --- | ' + ' | '.join('---' for _ in labels) + ' |')
            for key, title in STAGES:
                if mode == 'drag':
                    title = title.replace('Runtime fixed step consumed', 'editor command applied').replace('consumed →', 'applied →')
                row = []
                for label in labels:
                    doc = docs[label]
                    stats = None
                    if doc:
                        stats = (doc.get('stages') or {}).get(edge, {}).get(key)
                        if stats is None and key == 'sendToCapturedMs':
                            stats = (doc.get('harness', {}).get('sendToCapturedMs') or {}).get(edge)
                    row.append(cell(stats))
                print(f'| {title} | ' + ' | '.join(row) + ' |')
        print('\nClock mapping error (± half the best round trip): ' + ', '.join(
            f"{label}: {docs[label]['clockMapping']['errorMs']:.2f} ms" if docs[label] and docs[label].get('clockMapping') else f'{label}: N/A' for label in labels))
    docs = {label: load(directory, label, 'frames') for label in labels}
    if any(docs.values()):
        print('\n### Frames (play mode, real input every second)\n')
        print('| Metric | ' + ' | '.join(labels) + ' |')
        print('| --- | ' + ' | '.join('---' for _ in labels) + ' |')
        def frames(label):
            doc = docs[label]
            return doc.get('frames') if doc else None
        rows = [
            ('Recorded seconds', lambda f: f"{f['seconds']:.1f}"),
            ('rAF callbacks', lambda f: str(f['hostFrames'])),
            ('World submissions', lambda f: str(f['submittedFrames'])),
            ('Deferred by fence credit', lambda f: f"{f['deferredFrames']} ({100 * f['deferredFrames'] / max(1, f['hostFrames']):.0f} %)"),
            ('Submissions per second', lambda f: f"{f['submissionsPerSecond']:.1f}" if f['submissionsPerSecond'] else 'N/A'),
            ('rAF interval ms', lambda f: cell(f['rafIntervalMs'])),
            ('Submission interval ms', lambda f: cell(f['submissionIntervalMs'])),
            ('CPU frame start → submit ms', lambda f: cell(f['cpuFrameToSubmitMs'])),
            ('Simulation (Runtime frame) ms', lambda f: cell(f['simulationMs'])),
            ('Render → submit ms', lambda f: cell(f['renderToSubmitMs'])),
            ('GPU timer (world pass) ms', lambda f: cell(f['gpuTimerMs'], 3)),
            ('Submission gaps > 8.3 / 16.7 / 33.3 ms', lambda f: ' / '.join(str(v) for v in f['longSubmissionGaps'].values())),
        ]
        for title, fn in rows:
            print(f'| {title} | ' + ' | '.join(fn(frames(label)) if frames(label) else 'N/A' for label in labels) + ' |')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
