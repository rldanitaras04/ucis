'use client';

interface CarinaVitalsAnalysisProps {
  vitals: Record<string, string | null>;
}

interface Insight {
  parameter: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  message: string;
}

function classifyBP(sys: number, dia: number): Insight {
  if (sys > 180 || dia > 120) return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'critical', message: 'Hypertensive Crisis — Seek immediate medical attention' };
  if (sys >= 140 || dia >= 90) return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'critical', message: 'Stage 2 Hypertension — Requires medication review' };
  if (sys >= 130 || dia >= 80) return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'warning', message: 'Stage 1 Hypertension — Lifestyle modification recommended' };
  if (sys >= 120 && dia < 80) return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'warning', message: 'Elevated Blood Pressure — Monitor closely' };
  if (sys < 90 || dia < 60) return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'warning', message: 'Hypotension — Check for symptoms' };
  return { parameter: 'Blood Pressure', value: `${sys}/${dia} mmHg`, status: 'normal', message: 'Normal — Within healthy range' };
}

function classifyHR(hr: number): Insight {
  if (hr > 120) return { parameter: 'Heart Rate', value: `${hr} bpm`, status: 'critical', message: 'Severe Tachycardia — Requires evaluation' };
  if (hr > 100) return { parameter: 'Heart Rate', value: `${hr} bpm`, status: 'warning', message: 'Tachycardia — May indicate stress, fever, or dehydration' };
  if (hr < 40) return { parameter: 'Heart Rate', value: `${hr} bpm`, status: 'critical', message: 'Severe Bradycardia — Requires immediate attention' };
  if (hr < 60) return { parameter: 'Heart Rate', value: `${hr} bpm`, status: 'warning', message: 'Bradycardia — Normal for athletes, evaluate otherwise' };
  return { parameter: 'Heart Rate', value: `${hr} bpm`, status: 'normal', message: 'Normal — Within healthy range' };
}

function classifyRR(rr: number): Insight {
  if (rr > 30) return { parameter: 'Resp. Rate', value: `${rr}/min`, status: 'critical', message: 'Severe Tachypnea — Possible respiratory distress' };
  if (rr > 20) return { parameter: 'Resp. Rate', value: `${rr}/min`, status: 'warning', message: 'Tachypnea — Monitor for respiratory issues' };
  if (rr < 10) return { parameter: 'Resp. Rate', value: `${rr}/min`, status: 'critical', message: 'Severe Bradypnea — Possible respiratory depression' };
  if (rr < 12) return { parameter: 'Resp. Rate', value: `${rr}/min`, status: 'warning', message: 'Bradypnea — Below normal range' };
  return { parameter: 'Resp. Rate', value: `${rr}/min`, status: 'normal', message: 'Normal — Within healthy range' };
}

function classifyTemp(temp: number): Insight {
  if (temp >= 40) return { parameter: 'Temperature', value: `${temp}°C`, status: 'critical', message: 'Hyperpyrexia — Emergency cooling required' };
  if (temp >= 39) return { parameter: 'Temperature', value: `${temp}°C`, status: 'warning', message: 'High-Grade Fever — Antipyretic indicated (DOH Protocol)' };
  if (temp >= 37.5) return { parameter: 'Temperature', value: `${temp}°C`, status: 'warning', message: 'Fever — Philippine DOH threshold. Monitor and hydrate' };
  if (temp < 35) return { parameter: 'Temperature', value: `${temp}°C`, status: 'critical', message: 'Severe Hypothermia — Active rewarming needed' };
  if (temp < 36) return { parameter: 'Temperature', value: `${temp}°C`, status: 'warning', message: 'Mild Hypothermia — Monitor closely' };
  return { parameter: 'Temperature', value: `${temp}°C`, status: 'normal', message: 'Normal — Afebrile' };
}

function classifySpO2(spO2: number): Insight {
  if (spO2 < 90) return { parameter: 'SpO2', value: `${spO2}%`, status: 'critical', message: 'Severe Hypoxemia — Supplemental O2 required (WHO)' };
  if (spO2 < 94) return { parameter: 'SpO2', value: `${spO2}%`, status: 'warning', message: 'Mild Hypoxemia — Monitor respiratory status' };
  if (spO2 < 95) return { parameter: 'SpO2', value: `${spO2}%`, status: 'warning', message: 'Borderline Low — Observe for trends' };
  return { parameter: 'SpO2', value: `${spO2}%`, status: 'normal', message: 'Normal — Adequate oxygenation' };
}

function classifyBMI(h: number, w: number): Insight {
  const bmi = w / ((h / 100) ** 2);
  const rounded = Math.round(bmi * 10) / 10;
  if (bmi >= 40) return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'critical', message: 'Class III Obesity — Intensive intervention needed' };
  if (bmi >= 30) return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'warning', message: `Obese (Class ${bmi >= 35 ? 'II' : 'I'}) — Weight management program` };
  if (bmi >= 25) return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'warning', message: 'Overweight — Dietary counseling recommended' };
  if (bmi < 16) return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'critical', message: 'Severely Underweight — Nutritional assessment required' };
  if (bmi < 18.5) return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'warning', message: 'Underweight — Evaluate nutritional intake' };
  return { parameter: 'BMI', value: `${rounded} kg/m²`, status: 'normal', message: 'Normal — Healthy weight range' };
}

export default function CarinaVitalsAnalysis({ vitals }: CarinaVitalsAnalysisProps) {
  const insights: Insight[] = [];

  const sys = vitals.blood_pressure_systolic ? Number(vitals.blood_pressure_systolic) : null;
  const dia = vitals.blood_pressure_diastolic ? Number(vitals.blood_pressure_diastolic) : null;
  if (sys !== null && dia !== null) insights.push(classifyBP(sys, dia));

  const hr = vitals.pulse_rate ? Number(vitals.pulse_rate) : null;
  if (hr !== null) insights.push(classifyHR(hr));

  const rr = vitals.respiratory_rate ? Number(vitals.respiratory_rate) : null;
  if (rr !== null) insights.push(classifyRR(rr));

  const temp = vitals.temperature ? Number(vitals.temperature) : null;
  if (temp !== null) insights.push(classifyTemp(temp));

  const spO2 = vitals.oxygen_saturation ? Number(vitals.oxygen_saturation) : null;
  if (spO2 !== null) insights.push(classifySpO2(spO2));

  const height = vitals.height ? Number(vitals.height) : null;
  const weight = vitals.weight ? Number(vitals.weight) : null;
  if (height !== null && weight !== null && height > 0) insights.push(classifyBMI(height, weight));

  if (insights.length === 0) return null;

  const hasCritical = insights.some(i => i.status === 'critical');
  const hasWarning = insights.some(i => i.status === 'warning');

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
            <span className="text-xs font-semibold text-[#0F172A]">Carina Vitals Analysis</span>
            {hasCritical && <span className="ml-2 text-[10px] font-bold text-[#DC2626] bg-[#FEE2E2] px-1.5 py-0.5 rounded">ALERT</span>}
            {!hasCritical && hasWarning && <span className="ml-2 text-[10px] font-bold text-[#B45309] bg-[#FEF3C7] px-1.5 py-0.5 rounded">CAUTION</span>}
          </div>
        </div>

        <div className="space-y-1.5">
          {insights.map((i) => (
            <div key={i.parameter} className="flex items-start gap-2 text-xs">
              <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                i.status === 'critical' ? 'bg-[#DC2626]' :
                i.status === 'warning' ? 'bg-[#F59E0B]' :
                'bg-[#059669]'
              }`} />
              <span className="text-[#334155]">
                <span className="font-medium text-[#0F172A]">{i.parameter}</span>
                {' '}<span className="tabular-nums">{i.value}</span>
                {' — '}
                <span className={
                  i.status === 'critical' ? 'text-[#DC2626] font-medium' :
                  i.status === 'warning' ? 'text-[#B45309]' :
                  'text-[#059669]'
                }>{i.message}</span>
              </span>
            </div>
          ))}
        </div>

        {hasCritical && (
          <div className="mt-2 text-[10px] text-[#991B1B] bg-[#FEE2E2] rounded px-2 py-1">
            Provider Alert: Critical values — consider immediate assessment per DOH Emergency Triage Protocol.
          </div>
        )}
      </div>
      <p className="text-[10px] text-[#94A3B8] mt-1 px-1 italic">
        Draft analysis based on AHA 2017, WHO, and Philippine DOH guidelines. Requires provider review.
      </p>
    </div>
  );
}
