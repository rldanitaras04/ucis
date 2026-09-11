'use client';

interface FBSData {
  fbs_value: string;
  fasting_hours: string | null;
}

interface Insight {
  parameter: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  message: string;
  reference: string;
}

function classifyFBS(value: number, fastingHours: number | null): Insight {
  if (fastingHours !== null && fastingHours < 8) {
    return {
      parameter: 'Fasting Blood Sugar',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Insufficient fasting time — result may be unreliable. Minimum 8 hours fasting required.',
      reference: 'ADA 2023 / Philippine DOH',
    };
  }

  if (value < 54) {
    return {
      parameter: 'Fasting Blood Sugar',
      value: `${value} mg/dL`,
      status: 'critical',
      message: 'Severe Hypoglycemia — Immediate intervention required. Administer glucose or glucagon.',
      reference: 'ADA 2023 / WHO',
    };
  }
  if (value < 70) {
    return {
      parameter: 'Fasting Blood Sugar',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Hypoglycemia — Check for symptoms (tremors, diaphoresis, confusion). Provide fast-acting carbohydrate.',
      reference: 'ADA 2023 / Philippine DOH',
    };
  }
  if (value < 100) {
    return {
      parameter: 'Fasting Blood Sugar',
      value: `${value} mg/dL`,
      status: 'normal',
      message: 'Normal — Within healthy range. Maintain balanced diet and regular physical activity.',
      reference: 'ADA 2023',
    };
  }
  if (value < 126) {
    return {
      parameter: 'Fasting Blood Sugar',
      value: `${value} mg/dL`,
      status: 'warning',
      message: 'Impaired Fasting Glucose (Pre-diabetes) — Lifestyle modification recommended. Consider OGTT for confirmation.',
      reference: 'ADA 2023 / Philippine DOH Protocol',
    };
  }
  return {
    parameter: 'Fasting Blood Sugar',
    value: `${value} mg/dL`,
    status: 'critical',
    message: 'Diabetic Range — Confirm with repeat fasting FBS or HbA1c. Initiate diabetes management per Philippine CPG.',
    reference: 'ADA 2023 / Philippine DOH Clinical Practice Guidelines',
  };
}

export default function FBSAnalysis({ fbs }: { fbs: FBSData }) {
  const value = fbs.fbs_value ? Number(fbs.fbs_value) : null;
  if (value === null || isNaN(value)) return null;

  const fastingHours = fbs.fasting_hours ? Number(fbs.fasting_hours) : null;
  const insight = classifyFBS(value, fastingHours);

  const hasCritical = insight.status === 'critical';
  const hasWarning = insight.status === 'warning';

  return (
    <div className={`card mt-4 border-l-4 ${
      hasCritical ? 'border-l-[#DC2626] bg-[#FEF2F2]' :
      hasWarning ? 'border-l-[#F59E0B] bg-[#FFFBEB]' :
      'border-l-[#059669] bg-[#F0FDF4]'
    }`}>
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <h3 className="text-subheading text-[#0F172A]">
          Carina FBS Analysis
        </h3>
        {hasCritical && (
          <span className="badge bg-[#DC2626] text-white text-xs">ALERT</span>
        )}
        {!hasCritical && hasWarning && (
          <span className="badge bg-[#F59E0B] text-white text-xs">CAUTION</span>
        )}
      </div>

      <div className="flex items-start gap-3 text-sm">
        <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
          hasCritical ? 'bg-[#DC2626]' :
          hasWarning ? 'bg-[#F59E0B]' :
          'bg-[#059669]'
        }`} />
        <div className="flex-1">
          <span className="font-medium text-[#0F172A]">{insight.parameter}: </span>
          <span className="text-[#334155]">{insight.value}</span>
          <span className={`ml-2 font-medium ${
            hasCritical ? 'text-[#DC2626]' :
            hasWarning ? 'text-[#B45309]' :
            'text-[#059669]'
          }`}>
            — {insight.message}
          </span>
          <span className="text-[#94A3B8] text-xs ml-1">({insight.reference})</span>
        </div>
      </div>

      {hasCritical && (
        <div className="mt-3 p-2 bg-[#FEE2E2] rounded text-xs text-[#991B1B]">
          <strong>Provider Alert:</strong> Abnormal glucose level detected. Consider immediate clinical assessment per DOH Diabetes Management Protocol.
        </div>
      )}

      <p className="mt-3 text-xs text-[#94A3B8] italic">
        Draft analysis for provider review only. Not a clinical diagnosis. Based on ADA 2023, WHO, and Philippine DOH guidelines.
      </p>
    </div>
  );
}
