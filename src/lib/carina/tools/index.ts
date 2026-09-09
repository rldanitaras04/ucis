import { CarinaToolDefinition, CarinaSecurityContext } from '../types';
import { getClinicsTool } from './get-clinics';
import { getNotificationsTool } from './get-notifications';
import { getDashboardStatsTool } from './get-dashboard-stats';
import { searchPatientsTool } from './search-patients';
import { getPatientTool } from './get-patient';
import { getPatientEncountersTool } from './get-patient-encounters';
import { getVitalSignsTool } from './get-vital-signs';
import { getFbsRecordsTool } from './get-fbs-records';
import { getPrescriptionsTool } from './get-prescriptions';
import { getClearancesTool } from './get-clearances';
import { getMedicinesTool } from './get-medicines';
import { getQueueTool } from './get-queue';
import { registerPatientTool } from './register-patient';
import { recordVitalSignsTool } from './record-vital-signs';
import { recordFbsTool } from './record-fbs';
import { createPrescriptionTool } from './create-prescription';
import { cancelPrescriptionTool } from './cancel-prescription';
import { addToQueueTool } from './add-to-queue';
import { callNextPatientTool } from './call-next-patient';
import { issueClearanceTool } from './issue-clearance';
import { generalQueryTool } from './general-query';

const allTools: CarinaToolDefinition[] = [
  generalQueryTool,
  getClinicsTool,
  getNotificationsTool,
  getDashboardStatsTool,
  searchPatientsTool,
  getPatientTool,
  getPatientEncountersTool,
  getVitalSignsTool,
  getFbsRecordsTool,
  getPrescriptionsTool,
  getClearancesTool,
  getMedicinesTool,
  getQueueTool,
  registerPatientTool,
  recordVitalSignsTool,
  recordFbsTool,
  createPrescriptionTool,
  cancelPrescriptionTool,
  addToQueueTool,
  callNextPatientTool,
  issueClearanceTool,
];

export function getCarinaTools(ctx: CarinaSecurityContext): CarinaToolDefinition[] {
  return allTools.filter(tool => {
    if (!ctx.authenticated && tool.allowedRoles.length > 0) {
      return false;
    }

    if (ctx.authenticated && !ctx.roles.includes('super_admin')) {
      if (tool.allowedRoles.length > 0) {
        const hasRole = tool.allowedRoles.some(role => ctx.roles.includes(role));
        if (!hasRole) return false;
      }
    }

    if (tool.requiredPermission && !ctx.permissions.includes(tool.requiredPermission)) {
      if (!ctx.roles.includes('super_admin')) {
        return false;
      }
    }

    return true;
  });
}

export function toolDefinitionsForGroq(tools: CarinaToolDefinition[]) {
  return tools.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    },
  }));
}
