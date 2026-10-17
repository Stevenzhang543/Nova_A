import { PerformanceCoordinator } from './coordinator'
import { BudgetedWorkScheduler } from './workScheduler'

// The platform supplies capabilities/configuration at startup. Unknown capabilities start conservatively.
export const performanceCoordinator = new PerformanceCoordinator(() => performance.now())
export const auxiliaryWork = new BudgetedWorkScheduler(performanceCoordinator)
