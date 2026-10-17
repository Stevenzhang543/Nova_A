"""Builds the latency test project from a Platformer template export.

Adds one plain white 'LatencyMarker' box (no physics) whose script moves it into view while the Jump
action (Space) is held. The marker goes through the normal input -> Runtime fixed step -> script ->
transform -> WebGL2 renderer path, so a captured change shows a real game response.

usage: python make_test_project.py <platformer-export.json> <out.nova>
"""
import copy, hashlib, json, sys, uuid

SOURCE = (
    "// Latency test marker: visible at the centre while Jump is held, parked off-screen otherwise.\n"
    "fn fixed_update(dt) {\n"
    "  if input_down(\"Jump\") { set_position(0.0, 3.0); } else { set_position(0.0, 40.0); }\n"
    "}\n"
)

def fresh(value):
    """Gives every 'uuid' field inside a copied record a new identity."""
    if isinstance(value, dict):
        return {key: (str(uuid.uuid4()) if key == 'uuid' else fresh(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [fresh(item) for item in value]
    return value

def main(source_path, out_path):
    project = json.load(open(source_path, encoding='utf-8'))
    scene = project['scenes'][0]
    template_entity = next(e for e in scene['entities'] if e['name'] == 'Platform')
    template_asset = next(a for a in project['assets'] if a.get('assetType') == 'script')
    script = fresh(copy.deepcopy(template_asset))
    digest = hashlib.sha256(SOURCE.encode()).hexdigest()
    script.update({'name': 'LatencyMarker.rhai', 'path': 'Assets/Scripts/LatencyMarker.rhai', 'source': SOURCE, 'byteLength': len(SOURCE.encode())})
    for key in ('artifactHash', 'cacheKey', 'contentHash', 'settingsHash', 'sourceHash', 'artifactSettingsHash'):
        if key in script.get('pipeline', {}):
            script['pipeline'][key] = digest
    script['pipeline']['lastValidSource'] = SOURCE
    project['assets'].append(script)
    marker = fresh(copy.deepcopy(template_entity))
    marker['name'] = 'LatencyMarker'
    kept = []
    for component in marker['components']:
        if component['kind'] == 'Transform2D':
            component['data']['position'] = {'x': 0, 'y': 3}  # visible in the editor; the script parks it while playing
        elif component['kind'] == 'ShapeRenderer2D':
            data = component['data']
            data.update({'color': {'r': 255, 'g': 255, 'b': 255}, 'opacity': 100, 'strokeOpacity': 0, 'radiusX': 1.5, 'radiusY': 1.5,
                         'vertices': [{'x': -1.5, 'y': -1.5}, {'x': 1.5, 'y': -1.5}, {'x': 1.5, 'y': 1.5}, {'x': -1.5, 'y': 1.5}], 'sortingLayer': 1, 'orderInLayer': 50})
        else:
            continue
        kept.append(component)
    kept.append({'data': {'eventSheetAsset': None, 'objectBlueprintAsset': None, 'properties': {}, 'scriptAsset': f"asset://{script['uuid']}"},
                 'enabled': True, 'kind': 'Script2D', 'removed': False, 'uuid': str(uuid.uuid4())})
    marker['components'] = kept
    scene['entities'].append(marker)
    project['projectMetadata']['name'] = 'Latency Test'
    json.dump(project, open(out_path, 'w', encoding='utf-8'), indent=2)

if __name__ == '__main__':
    main(*sys.argv[1:3])
