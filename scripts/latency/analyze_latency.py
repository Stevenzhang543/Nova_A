"""Joins harness trials (QPC clock) with the app's latency-probe records (page clock).

usage: python analyze_latency.py <run-stem> [--out summary.json]
  <run-stem> is the path prefix the harness wrote, e.g. results/new-key  ->  new-key-trials.json, new-key-probe.jsonl

Clock mapping: every probe sync is a round trip page t0 -> collector QPC -> page t1. The offset with
the shortest round trip is used; its half round trip is the stated mapping error for every value that
crosses clocks (send->received and submitted->captured). Values on one clock carry no mapping error.
"""
import csv, json, os, statistics, sys

def describe(values):
    data = sorted(v for v in values if v is not None)
    if not data:
        return {'n': 0}
    at = lambda q: data[min(len(data) - 1, int(round((len(data) - 1) * q)))]
    out = {'n': len(data), 'mean': round(statistics.fmean(data), 3), 'p50': round(at(.5), 3), 'p95': round(at(.95), 3), 'min': round(data[0], 3), 'max': round(data[-1], 3)}
    if len(data) >= 200:
        out['p99'] = round(at(.99), 3)
    return out

def main(stem, out_path=None):
    trials_doc = json.load(open(stem + '-trials.json', encoding='utf-8'))
    trials, log = trials_doc['trials'], trials_doc['log']
    batches = []
    if os.path.exists(stem + '-probe.jsonl'):
        for line in open(stem + '-probe.jsonl', encoding='utf-8'):
            if line.strip():
                batches.append(json.loads(line)['payload'])
    syncs = [s for b in batches for s in b.get('syncs', [])]
    inputs = [r for b in batches for r in b.get('inputs', [])]
    incomplete = [r for b in batches for r in b.get('incomplete', [])]
    frames = [f for b in batches for f in b.get('frames', [])]
    summary = {'mode': log['mode'], 'label': log['label'], 'harness': {k: log[k] for k in ('sendToCapturedMs', 'capturePollIntervalMs', 'sendInputCallMs', 'sendTimestamp', 'timeouts', 'calibration', 'title') if k in log}}
    mapping = None
    if syncs:
        best = min(syncs, key=lambda s: s['t1'] - s['t0'])
        mapping = {'offsetMs': best['collector'] - (best['t0'] + best['t1']) / 2, 'errorMs': (best['t1'] - best['t0']) / 2, 'samples': len(syncs)}
        summary['clockMapping'] = mapping
    to_qpc = (lambda page_ms: None if page_ms is None or mapping is None else page_ms + mapping['offsetMs'])

    rows = []
    if inputs and log['mode'] in ('key', 'drag'):
        if log['mode'] == 'key':
            pools = {True: [r for r in inputs if r['kind'] == 'key' and r['down']], False: [r for r in inputs if r['kind'] == 'key' and not r['down']]}
        else:
            pools = {None: [r for r in inputs if r['kind'] == 'editor-drag']}
        used = set()
        for trial in trials:
            if 'sentNs' not in trial or trial.get('capturedNs') is None and trial.get('sendToCapturedMs') is None:
                pass
            sent_ms = trial['sentNs'] / 1e6
            pool = pools.get(trial['edge'] == 'down') if log['mode'] == 'key' else pools[None]
            match = None
            if mapping and pool:
                for record in pool:
                    if record['id'] in used:
                        continue
                    received = to_qpc(record['receivedAt'])
                    # A handler cannot run before the input was sent; allow only the stated mapping error.
                    if sent_ms - mapping['errorMs'] <= received <= sent_ms + 500:
                        match = record; break
            if match:
                used.add(match['id'])
            row = {'trial': trial['trial'], 'edge': trial['edge'], 'sendToCapturedMs': trial.get('sendToCapturedMs')}
            if match:
                received, consumed, submitted = match['receivedAt'], match['consumedAt'], match['submittedAt']
                row.update({
                    'sendToReceivedMs': to_qpc(received) - sent_ms,
                    'receivedToConsumedMs': None if consumed is None else consumed - received,
                    'consumedToSubmittedMs': None if consumed is None or submitted is None else submitted - consumed,
                    'receivedToSubmittedMs': None if submitted is None else submitted - received,
                    'submittedToCapturedMs': None if submitted is None or trial.get('capturedNs') is None else trial['capturedNs'] / 1e6 - to_qpc(submitted),
                    'consumedStage': match['consumedStage'], 'coalesced': match.get('coalesced', 0),
                    'eventTimeStampToHandlerMs': None if match.get('eventTimeStamp') is None else received - match['eventTimeStamp'],
                })
            rows.append(row)
        keys = ['sendToReceivedMs', 'receivedToConsumedMs', 'consumedToSubmittedMs', 'receivedToSubmittedMs', 'submittedToCapturedMs', 'sendToCapturedMs', 'eventTimeStampToHandlerMs']
        edges = sorted({row['edge'] for row in rows})
        summary['stages'] = {edge: {key: describe([row.get(key) for row in rows if row['edge'] == edge]) for key in keys} for edge in edges}
        summary['matchedTrials'] = sum(1 for row in rows if 'receivedToSubmittedMs' in row)
        summary['incompleteProbeInputs'] = len(incomplete)
        with open(stem + '-joined.csv', 'w', newline='', encoding='utf-8') as handle:
            writer = csv.DictWriter(handle, fieldnames=['trial', 'edge', 'consumedStage', 'coalesced'] + keys)
            writer.writeheader()
            for row in rows:
                writer.writerow({k: row.get(k) for k in writer.fieldnames})
    if frames:
        frames.sort(key=lambda f: f['cpuStart'])
        raf = [b['rafTime'] - a['rafTime'] for a, b in zip(frames, frames[1:]) if a.get('rafTime') is not None and b.get('rafTime') is not None and b['rafTime'] > a['rafTime']]
        submitted = [f for f in frames if f.get('submittedAt') is not None]
        sub_intervals = [b['submittedAt'] - a['submittedAt'] for a, b in zip(submitted, submitted[1:])]
        duration = (frames[-1]['cpuStart'] - frames[0]['cpuStart']) / 1000 if len(frames) > 1 else 0
        gpu = [f['gpuMs'] for f in frames if f.get('gpuMs') is not None]
        summary['frames'] = {
            'seconds': round(duration, 2), 'hostFrames': len(frames), 'submittedFrames': len(submitted), 'deferredFrames': sum(1 for f in frames if f.get('deferred')),
            'submissionsPerSecond': round(len(submitted) / duration, 2) if duration else None,
            'rafIntervalMs': describe(raf), 'submissionIntervalMs': describe(sub_intervals),
            'cpuFrameToSubmitMs': describe([f['submittedAt'] - f['cpuStart'] for f in submitted]),
            'simulationMs': describe([f['simulationEnd'] - f['cpuStart'] for f in frames]),
            'renderToSubmitMs': describe([f['submittedAt'] - f['renderStart'] for f in submitted]),
            'gpuTimerMs': describe(gpu), 'gpuTimerSamples': len(gpu),
            'longSubmissionGaps': {'over8.3ms': sum(1 for v in sub_intervals if v > 8.34), 'over16.7ms': sum(1 for v in sub_intervals if v > 16.7), 'over33.3ms': sum(1 for v in sub_intervals if v > 33.4)},
        }
        with open(stem + '-frames.csv', 'w', newline='', encoding='utf-8') as handle:
            writer = csv.DictWriter(handle, fieldnames=list(frames[0].keys()))
            writer.writeheader(); writer.writerows(frames)
    text = json.dumps(summary, indent=1)
    open(out_path or stem + '-summary.json', 'w', encoding='utf-8').write(text)
    print(text)

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[3] if len(sys.argv) > 3 and sys.argv[2] == '--out' else None)
