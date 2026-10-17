/** Legacy Editor fault API: the same application-level raw record Owner, with Vue and the existing Editor logger explicitly installed. */
import { reactive, toRaw } from 'vue'
import { addEditorLog } from '../store/editor'
import { drainPendingFaultLogs, installFaultCenterStateAdapter, installFaultLogHost } from './runtimeFaultRecords'
installFaultCenterStateAdapter({ wrap: target => reactive(target), unwrap: toRaw })
installFaultLogHost(addEditorLog)
drainPendingFaultLogs()
export { faultCenterState, isExpectedCancellation, reportRecoverableError, reportFatalError, dismissActiveFault, faultDiagnostics, guardAsync } from './runtimeFaultRecords'
export type { AppFault, FaultSeverity } from './runtimeFaultRecords'
