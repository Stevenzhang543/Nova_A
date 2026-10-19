"""Builds the latency test project from a Platformer template export.

Adds one plain white 'LatencyMarker' box (no physics) whose script moves it into view while the Jump
action (Space) is held. The marker goes through the normal input -> Runtime fixed step -> script ->
transform -> WebGL2 renderer path, so a captured change shows a real game response.

usage: python make_test_project.py <platformer-export.json> <out.nova> [--marker box|character] [--tick 60|120|240]
                                    [--interpolation Interpolate|None]

26.42 (M-1): `--marker character` replaces the box with a physics-driven marker: a Kinematic RigidBody2D with
CharacterBody2D (copied from the template's Player) moved by `move_character` in fixed_update, so the measured
path includes the physics step and, with Interpolate, the render interpolation of the body (P-C). Only one marker
exists in a project, so the two can never share the measured ROI. `--tick` and `--interpolation` set every scene's
physics tick rate (and its profile) and the interpolation mode.
"""
import argparse, copy, hashlib, json, sys, uuid

SOURCE = (
    "// Latency test marker: visible at the centre while Jump is held, parked off-screen otherwise.\n"
    "fn fixed_update(dt) {\n"
    "  if input_down(\"Jump\") { set_position(0.0, 3.0); } else { set_position(0.0, 40.0); }\n"
    "}\n"
)

CHARACTER_SOURCE = (
    "// Latency test marker (physics): moved by the character controller into view while Jump is held.\n"
    "fn fixed_update(dt) {\n"
    "  let y = transform().position_y;\n"
    "  let target = if input_down(\"Jump\") { 3.0 } else { 40.0 };\n"
    "  move_character(0.0, target - y);\n"
    "}\n"
)

def fresh(value):
    """Gives every 'uuid' field inside a copied record a new identity."""
    if isinstance(value, dict):
        return {key: (str(uuid.uuid4()) if key == 'uuid' else fresh(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [fresh(item) for item in value]
    return value

def add_script(project, source, name):
    template_asset = next(a for a in project['assets'] if a.get('assetType') == 'script')
    script = fresh(copy.deepcopy(template_asset))
    digest = hashlib.sha256(source.encode()).hexdigest()
    script.update({'name': name + '.rhai', 'path': 'Assets/Scripts/' + name + '.rhai', 'source': source, 'byteLength': len(source.encode())})
    for key in ('artifactHash', 'cacheKey', 'contentHash', 'settingsHash', 'sourceHash', 'artifactSettingsHash'):
        if key in script.get('pipeline', {}):
            script['pipeline'][key] = digest
    script['pipeline']['lastValidSource'] = source
    project['assets'].append(script)
    return script

def script_component(script):
    return {'data': {'eventSheetAsset': None, 'objectBlueprintAsset': None, 'properties': {}, 'scriptAsset': f"asset://{script['uuid']}"},
            'enabled': True, 'kind': 'Script2D', 'removed': False, 'uuid': str(uuid.uuid4())}

def white_square(data):
    data.update({'color': {'r': 255, 'g': 255, 'b': 255}, 'opacity': 100, 'strokeOpacity': 0, 'radiusX': 1.5, 'radiusY': 1.5,
                 'vertices': [{'x': -1.5, 'y': -1.5}, {'x': 1.5, 'y': -1.5}, {'x': 1.5, 'y': 1.5}, {'x': -1.5, 'y': 1.5}], 'sortingLayer': 1, 'orderInLayer': 50})

def box_marker(project, scene):
    script = add_script(project, SOURCE, 'LatencyMarker')
    template_entity = next(e for e in scene['entities'] if e['name'] == 'Platform')
    marker = fresh(copy.deepcopy(template_entity))
    marker['name'] = 'LatencyMarker'
    kept = []
    for component in marker['components']:
        if component['kind'] == 'Transform2D':
            component['data']['position'] = {'x': 0, 'y': 3}  # visible in the editor; the script parks it while playing
        elif component['kind'] == 'ShapeRenderer2D':
            white_square(component['data'])
        else:
            continue
        kept.append(component)
    kept.append(script_component(script))
    marker['components'] = kept
    return marker

def character_marker(project, scene):
    script = add_script(project, CHARACTER_SOURCE, 'CharacterMarker')
    template_entity = next(e for e in scene['entities'] if e['name'] == 'Player')
    marker = fresh(copy.deepcopy(template_entity))
    marker['name'] = 'CharacterMarker'
    kept = []
    for component in marker['components']:
        kind = component['kind']
        if kind == 'Transform2D':
            component['data']['position'] = {'x': 0, 'y': 40}  # parked above the level; Jump brings it to (0, 3)
            component['data']['scale'] = {'x': 1, 'y': 1}
        elif kind == 'ShapeRenderer2D':
            white_square(component['data'])
        elif kind == 'BoxCollider2D':
            data = component['data']
            data.update({'size': {'x': 3, 'y': 3}, 'radiusX': 1.5, 'radiusY': 1.5,
                         'vertices': [{'x': -1.5, 'y': -1.5}, {'x': 1.5, 'y': -1.5}, {'x': 1.5, 'y': 1.5}, {'x': -1.5, 'y': 1.5}]})
        elif kind not in ('RigidBody2D', 'CharacterBody2D'):
            continue
        kept.append(component)
    assert any(c['kind'] == 'CharacterBody2D' for c in kept), 'template Player has no CharacterBody2D'
    kept.append(script_component(script))
    marker['components'] = kept
    return marker

def main(argv):
    parser = argparse.ArgumentParser()
    parser.add_argument('source'); parser.add_argument('out')
    parser.add_argument('--marker', choices=['box', 'character'], default='box')
    parser.add_argument('--tick', type=int, choices=[60, 120, 240])
    parser.add_argument('--interpolation', choices=['Interpolate', 'None'])
    args = parser.parse_args(argv)
    project = json.load(open(args.source, encoding='utf-8'))
    scene = project['scenes'][0]
    scene['entities'].append(character_marker(project, scene) if args.marker == 'character' else box_marker(project, scene))
    for each in project['scenes']:
        settings = each.get('globalSettings', {})
        if args.tick:
            settings['tickRate'] = args.tick
            if isinstance(settings.get('profile'), dict):
                settings['profile']['tickRate'] = args.tick
        if args.interpolation:
            settings['interpolation'] = args.interpolation
            if isinstance(settings.get('profile'), dict):
                settings['profile']['interpolation'] = args.interpolation
    project['projectMetadata']['name'] = 'Latency Test' + ('' if args.marker == 'box' else ' Character')
    json.dump(project, open(args.out, 'w', encoding='utf-8'), indent=2)

if __name__ == '__main__':
    main(sys.argv[1:])
