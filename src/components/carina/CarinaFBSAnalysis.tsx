'use client';

interface CarinaFBSAnalysisProps {
  fbs: Record<string, string | null>;
}

interface Insight {
  parameter: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  message: string;
}

function classifyFBS(value: number, fastingHours: number | null): Insight {
  if (fastingHours !== null && fastingHours < 8) {
    return {
      parameter: 'FBS',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Insufficient fasting — min 8 hrs required (ADA 2023)',
    };
  }

  if (value < 54) {
    return {
      parameter: 'FBS',
      value: `${value} mg/dL`,
      status: 'critical',
      message: 'Severe Hypoglycemia — administer glucose/glucagon immediately',
    };
  }
  if (value < 70) {
    return {
      parameter: 'FBS',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Hypoglycemia — check symptoms, provide fast-acting carbs',
    };
  }
  if (value < 100) {
    return {
      parameter: 'FBS',
      value: `${value} mg/dL`,
      status: 'normal',
      message: 'Normal — within healthy range',
    };
  }
  if (value < 126) {
    return {
      parameter: 'FBS',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Pre-diabetic — lifestyle modification; consider OGTT',
    };
  }
  return {
    parameter: 'FBS',
    value: `${value} mg/dL`,
    status: 'critical',
    message: 'Diabetic range — confirm with repeat FBS or HbA1c; initiate DM mgmt per Philippine CPG',
  };
}

export default function CarinaFBSAnalysis({ fbs }: CarinaFBSAnalysisProps) {
  const value = fbs.fbs_value ? Number(fbs.fbs_value) : null;
  if (value === null || isNaN(value)) return null;

  const fastingHours = fbs.fasting_hours ? Number(fbs.fasting_hours) : null;
  const insight = classifyFBS(value, fastingHours);

  const hasCritical = insight.status === 'critical';
  const hasWarning = insight.status === 'warning';

  return (
    <div className="mb-3">
      <div className={`rounded-lg border p-3 ${
        hasCritical ? 'bg-[#FEF2F2] border-[#FECACA]' :
        hasWarning ? 'bg-[#FFFBEB] border-[#FDE68A]' :
        'bg-[#F0FDF4] border-[#BBF7D0]'
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-[#1E40AF] flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-semibold text-[#0F172A]">Carina FBS Analysis</span>
            {hasCritical && <span className="ml-2 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded">ALERT</span>}
            {!hasCritical && hasWarning && <span className="ml-2 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">CAUTION</span>}
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs">
          <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
            hasCritical ? 'bg-[#DC2626]' :
            hasWarning ? 'bg-[#F59E0B]' :
            'bg-[#059669]'
          }`} />
          <span className="text-[#334155]">
            <span className="font-medium text-[#0F172A]">{insight.parameter}</span>
            {' '}<span className="tabular-nums">{insight.value}</span>
            {' — '}
            <span className={
              hasCritical ? 'text-[#DC2626] font-medium' :
              hasWarning ? 'text-[#B45309]' :
              'text-[#059669]'
            }>{insight.message}</span>
          </span>
        </div>

        {hasCritical && (
          <div className="mt-2 text-[10px] text-[#991B1B] bg-[#FEE2E2] rounded px-2 py-1">
            Provider Alert: Abnormal glucose — assess per DOH Diabetes Management Protocol.
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#94A3B8] mt-1 px-1 italic">
        Draft analysis based on ADA 2023, WHO, and Philippine DOH guidelines. Requires provider review.
      </p>
    </div>
  );
}
