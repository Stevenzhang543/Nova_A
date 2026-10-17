/** Exact admitted transformation; checksum/capture math is checked separately before restoration. */
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import ts from 'typescript'

const sha = source => createHash('sha256').update(source).digest('hex')
const parse = source => ts.createSourceFile('simulationEvidence.ts', source, ts.ScriptTarget.Latest, true)
const functionNode = (ast, name) => { const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name); assert(node?.body, `Missing exact function ${name}`); return node }
const variableNode = (ast, name) => { const node = ast.statements.find(node => ts.isVariableStatement(node) && node.declarationList.declarations.some(item => item.name.getText(ast) === name)); assert(node, `Missing exact variable ${name}`); return node }
const body = (ast, name) => functionNode(ast, name).body.getText(ast)

export function assertSimulationEvidenceOwnerSource(beforeAuthoring, currentOwner) {
  const original = parse(beforeAuthoring), owner = parse(currentOwner)
  const pairs = [
    ['stableFingerprint', body(original, 'stableFingerprint'), body(owner, 'stableFingerprint')],
    ['simulationStateChecksum', body(original, 'simulationStateChecksum'), body(owner, 'computeSimulationStateChecksum').replace('checksumPort.blackboardSnapshot(entity.uuid)', 'blackboardSnapshot(entity.uuid)')],
    ['captureSimulationEvidence', body(original, 'captureSimulationEvidence'), body(owner, 'captureSimulationEvidenceIntoState').replace('computeSimulationStateChecksum(entities, connections, checksumPort)', 'simulationStateChecksum(entities, connections)')],
    ['clearSimulationEvidence', body(original, 'clearSimulationEvidence'), body(owner, 'clearSimulationEvidenceState')]
  ]
  for (const [name, expected, actual] of pairs) assert.equal(actual, expected, `Unapproved original algorithm/body change: ${name}`)
  assert.equal(variableNode(owner, 'fixed').getText(owner), variableNode(original, 'fixed').getText(original), 'Preserve exact quantization math')
  assert.equal(variableNode(owner, 'MAX_EVIDENCE_FRAMES').declarationList.declarations[0].initializer.getText(owner), '600')
  for (const node of owner.statements.filter(ts.isImportDeclaration)) {
    const path = node.moduleSpecifier.text
    assert(!/vue|pinia|editor|store|aiTools|AssetDatabase|simulationAuthoring26/.test(path), `Pure evidence boundary violation: ${path}`)
    if (!node.importClause?.isTypeOnly) assert.equal(path, '../world/hierarchy', 'Only the existing pure hierarchy runtime import is admitted')
  }
  return { exactOriginalBodies: pairs.map(([name, expected]) => ({ name, bodySha256: sha(expected) })), quantization: 'ORIGINAL_BYTE_EXACT', boundedFrames: 600, pureImportBoundary: 'PASSED' }
}

export function expectedSimulationAuthoringFacade(beforeAuthoring) {
  const ast = parse(beforeAuthoring), fn = name => functionNode(ast, name), variable = name => variableNode(ast, name)
  const edits = [
    { start: variable('MAX_EVIDENCE_FRAMES').getStart(ast), end: variable('MAX_EVIDENCE_FRAMES').end, text: '' },
    { start: variable('fixed').getStart(ast), end: variable('fixed').end, text: '' },
    { start: fn('stableFingerprint').getStart(ast), end: fn('stableFingerprint').end, text: '' },
    { start: fn('simulationStateChecksum').getStart(ast), end: fn('simulationStateChecksum').end, text: "export function simulationStateChecksum(entities: readonly Entity[], connections: readonly Connection[]): string { return computeSimulationStateChecksum(entities, connections, legacyChecksumPort) }" },
    { start: variable('simulationEvidenceState').getStart(ast), end: variable('simulationEvidenceState').end, text: "const rawSimulationEvidenceState = createInitialSimulationEvidenceState()\nexport const simulationEvidenceState = reactive(rawSimulationEvidenceState)\nexport function getLegacySimulationEvidenceRawState(): SimulationEvidenceState { return rawSimulationEvidenceState }" },
    { start: fn('captureSimulationEvidence').getStart(ast), end: fn('captureSimulationEvidence').end, text: "export function captureSimulationEvidence(frame: number, entities: readonly Entity[], connections: readonly Connection[]): string { return captureSimulationEvidenceIntoState(simulationEvidenceState, frame, entities, connections, legacyChecksumPort) }" },
    { start: fn('clearSimulationEvidence').getStart(ast), end: fn('clearSimulationEvidence').end, text: "export function clearSimulationEvidence(): void { clearSimulationEvidenceState(simulationEvidenceState) }" }
  ]
  let expected = beforeAuthoring
  for (const edit of edits.sort((a, b) => b.start - a.start)) expected = expected.slice(0, edit.start) + edit.text + expected.slice(edit.end)
  const unusedHierarchyImport = "import { worldTransform } from '../world/hierarchy'\n"
  assert.equal(expected.split(unusedHierarchyImport).length, 2, 'Unique now-unused original hierarchy import required')
  expected = expected.replace(unusedHierarchyImport, '')
  const stableStart = fn('stableFingerprint').getStart(ast)
  const movedStableComment = beforeAuthoring.slice(beforeAuthoring.lastIndexOf('\n', stableStart - 1) + 1, stableStart)
  assert(movedStableComment.endsWith(' '), 'Original inline stableFingerprint comment suffix required')
  assert.equal(expected.split(movedStableComment + '\n').length, 2, 'Unique moved stableFingerprint comment line required')
  expected = expected.replace(movedStableComment + '\n', movedStableComment.trimEnd() + '\n')
  const anchor = "import { prepareColliderSet } from './physicsGeometry'"
  assert.equal(expected.split(anchor).length, 2, 'Unique original import anchor required')
  return expected.replace(anchor, anchor + "\nimport { captureSimulationEvidenceIntoState, clearSimulationEvidenceState, computeSimulationStateChecksum, createInitialSimulationEvidenceState, type SimulationEvidenceChecksumPort, type SimulationEvidenceState } from './simulationEvidenceOwner'\n\n// Transitional authoring API uses the actual legacy AI blackboard; it does not claim AI isolation.\nconst legacyChecksumPort: SimulationEvidenceChecksumPort = { scope: 'shared-legacy-ai', blackboardSnapshot }")
}

/** Restores only after proving the entire facade equals the admitted evidence edits plus the single now-unused import removal and
 * all four relocated bodies/math remain exact. Returning a cached before blindly is forbidden. */
export function invertSimulationAuthoringFacade(beforeAuthoring, currentFacade, currentOwner) {
  const evidence = assertSimulationEvidenceOwnerSource(beforeAuthoring, currentOwner)
  assert.equal(currentFacade, expectedSimulationAuthoringFacade(beforeAuthoring), 'Unapproved simulation authoring/source change outside exact evidence delegation')
  const beforeAst = parse(beforeAuthoring), afterAst = parse(currentFacade)
  const unaffected = beforeAst.statements.filter(ts.isFunctionDeclaration).map(node => node.name?.text).filter(name => !['stableFingerprint', 'simulationStateChecksum', 'captureSimulationEvidence', 'clearSimulationEvidence'].includes(name))
  for (const name of unaffected) assert.equal(functionNode(afterAst, name).getText(afterAst), functionNode(beforeAst, name).getText(beforeAst), `Preserve complete authoring function/signature/body: ${name}`)
  return { source: beforeAuthoring, evidence: { ...evidence, exactFacadeTransformation: 'PASSED', unaffectedWholeFunctions: unaffected, restoredSha256: sha(beforeAuthoring) } }
}
