/** Named runtime dispositions; a persistence case does not imply an executable hook. */
export const runtimeFieldDispositions22={
 'projectSettings.production.testing.tests.[*].setup':{status:'unsupported',consumer:'src/runtime/testRunner.ts#runOne',gap:'TEST-HOOKS-22',detail:'Stored by normalizeProductionSettings but not invoked by the project test runner.'},
 'projectSettings.production.testing.tests.[*].teardown':{status:'unsupported',consumer:'src/runtime/testRunner.ts#runOne',gap:'TEST-HOOKS-22',detail:'Stored by normalizeProductionSettings but not invoked by the project test runner.'},
 'projectSettings.production.testing.tests.[*].fixture':{status:'report metadata',consumer:'src/runtime/testRunner.ts#runOne',gap:'TEST-FIXTURE-22',detail:'Copied into test result metadata; it does not load a fixture resource.'},
 'projectSettings.production.testing.tests.[*].seed':{status:'unsupported execution binding',consumer:'src/runtime/testRunner.ts#runOne',gap:'TEST-SEED-22',detail:'Reported in results but not applied to the GameplayRuntime seed owner. Project replay/script seeds remain separate settings.'}
}
