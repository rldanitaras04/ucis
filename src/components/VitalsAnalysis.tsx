'use client';

interface VitalsData {
  blood_pressure_systolic: string;
  blood_pressure_diastolic: string;
  pulse_rate: string;
  respiratory_rate: string;
  temperature: string;
  oxygen_saturation: string;
  height: string;
  weight: string;
}

interface Insight {
  parameter: string;
  value: string;
  status: 'normal' | 'warning' | 'critical';
  message: string;
  reference: string;
}

function classifyBP(sys: number, dia: number): { status: 'normal' | 'warning' | 'critical'; label: string } {
  if (sys > 180 || dia > 120) return { status: 'critical', label: 'Hypertensive Crisis' };
  if (sys >= 140 || dia >= 90) return { status: 'critical', label: 'Stage 2 Hypertension' };
  if (sys >= 130 || dia >= 80) return { status: 'warning', label: 'Stage 1 Hypertension' };
  if (sys >= 120 && dia < 80) return { status: 'warning', label: 'Elevated Blood Pressure' };
  if (sys < 90 || dia < 60) return { status: 'warning', label: 'Hypotension' };
  return { status: 'normal', label: 'Normal' };
}

function classifyHR(hr: number): { status: 'normal' | 'warning' | 'critical'; label: string } {
  if (hr > 120) return { status: 'critical', label: 'Severe Tachycardia' };
  if (hr > 100) return { status: 'warning', label: 'Tachycardia' };
  if (hr < 40) return { status: 'critical', label: 'Severe Bradycardia' };
  if (hr < 60) return { status: 'warning', label: 'Bradycardia' };
  return { status: 'normal', label: 'Normal' };
}

function classifyRR(rr: number): { status: 'normal' | 'warning' | 'critical'; label: string } {
  if (rr > 30) return { status: 'critical', label: 'Severe Tachypnea' };
  if (rr > 20) return { status: 'warning', label: 'Tachypnea' };
  if (rr < 10) return { status: 'critical', label: 'Severe Bradypnea' };
  if (rr < 12) return { status: 'warning', label: 'Bradypnea' };
  return { status: 'normal', label: 'Normal' };
}

function classifyTemp(temp: number): { status: 'normal' | 'warning' | 'critical'; label: string } {
  if (temp >= 40) return { status: 'critical', label: 'Hyperpyrexia' };
  if (temp >= 39) return { status: 'warning', label: 'High-Grade Fever' };
  if (temp >= 37.5) return { status: 'warning', label: 'Fever (DOH threshold)' };
  if (temp < 35) return { status: 'critical', label: 'Severe Hypothermia' };
  if (temp < 36) return { status: 'warning', label: 'Mild Hypothermia' };
  return { status: 'normal', label: 'Normal' };
}

function classifySpO2(spO2: number): { status: 'normal' | 'warning' | 'critical'; label: string } {
  if (spO2 < 90) return { status: 'critical', label: 'Severe Hypoxemia' };
  if (spO2 < 94) return { status: 'warning', label: 'Mild Hypoxemia' };
  if (spO2 < 95) return { status: 'warning', label: 'Borderline Low' };
  return { status: 'normal', label: 'Normal' };
}

function classifyBMI(height: number, weight: number): { status: 'normal' | 'warning' | 'critical'; label: string; value: number } {
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  if (bmi >= 40) return { status: 'critical', label: 'Class III Obesity', value: Math.round(bmi * 10) / 10 };
  if (bmi >= 35) return { status: 'warning', label: 'Class II Obesity', value: Math.round(bmi * 10) / 10 };
  if (bmi >= 30) return { status: 'warning', label: 'Class I Obesity', value: Math.round(bmi * 10) / 10 };
  if (bmi >= 25) return { status: 'warning', label: 'Overweight', value: Math.round(bmi * 10) / 10 };
  if (bmi < 16) return { status: 'critical', label: 'Severely Underweight', value: Math.round(bmi * 10) / 10 };
  if (bmi < 18.5) return { status: 'warning', label: 'Underweight', value: Math.round(bmi * 10) / 10 };
  return { status: 'normal', label: 'Normal', value: Math.round(bmi * 10) / 10 };
}

export default function VitalsAnalysis({ vitals }: { vitals: VitalsData }) {
  const insights: Insight[] = [];

  const sys = vitals.blood_pressure_systolic ? Number(vitals.blood_pressure_systolic) : null;
  const dia = vitals.blood_pressure_diastolic ? Number(vitals.blood_pressure_diastolic) : null;
  if (sys !== null && dia !== null) {
    const bp = classifyBP(sys, dia);
    insights.push({
      parameter: 'Blood Pressure',
      value: `${sys}/${dia} mmHg`,
      status: bp.status,
      message: bp.label,
      reference: 'AHA 2017 Guidelines',
    });
  }

  const hr = vitals.pulse_rate ? Number(vitals.pulse_rate) : null;
  if (hr !== null) {
    const h = classifyHR(hr);
    insights.push({
      parameter: 'Heart Rate',
      value: `${hr} bpm`,
      status: h.status,
      message: h.label,
      reference: 'WHO / AHA',
    });
  }

  const rr = vitals.respiratory_rate ? Number(vitals.respiratory_rate) : null;
  if (rr !== null) {
    const r = classifyRR(rr);
    insights.push({
      parameter: 'Respiratory Rate',
      value: `${rr} breaths/min`,
      status: r.status,
      message: r.label,
      reference: 'WHO Normal Values',
    });
  }

  const temp = vitals.temperature ? Number(vitals.temperature) : null;
  if (temp !== null) {
    const t = classifyTemp(temp);
    insights.push({
      parameter: 'Temperature',
      value: `${temp}°C`,
      status: t.status,
      message: t.label,
      reference: 'Philippine DOH / WHO',
    });
  }

  const spO2 = vitals.oxygen_saturation ? Number(vitals.oxygen_saturation) : null;
  if (spO2 !== null) {
    const s = classifySpO2(spO2);
    insights.push({
      parameter: 'O2 Saturation',
      value: `${spO2}%`,
      status: s.status,
      message: s.label,
      reference: 'WHO Clinical Guidelines',
    });
  }

  const height = vitals.height ? Number(vitals.height) : null;
  const weight = vitals.weight ? Number(vitals.weight) : null;
  if (height !== null && weight !== null && height > 0) {
    const bmi = classifyBMI(height, weight);
    insights.push({
      parameter: 'BMI',
      value: `${bmi.value} kg/m²`,
      status: bmi.status,
      message: bmi.label,
      reference: 'WHO / Philippine Dietary Reference Intake',
    });
  }

  if (insights.length === 0) return null;

  const hasWarning = insights.some(i => i.status === 'warning');
  const hasCritical = insights.some(i => i.status === 'critical');

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
          Carina Clinical Insights
        </h3>
        {hasCritical && (
          <span className="badge bg-[#DC2626] text-white text-xs">ALERT</span>
        )}
        {!hasCritical && hasWarning && (
          <span className="badge bg-[#F59E0B] text-white text-xs">CAUTION</span>
        )}
      </div>

      <div className="space-y-2">
        {insights.map((insight) => (
          <div key={insight.parameter} className="flex items-start gap-3 text-sm">
            <span className={`inline-block w-2 h-2 rounded-full mt-1.5 shrink-0 ${
              insight.status === 'critical' ? 'bg-[#DC2626]' :
              insight.status === 'warning' ? 'bg-[#F59E0B]' :
              'bg-[#059669]'
            }`} />
            <div className="flex-1">
              <span className="font-medium text-[#0F172A]">{insight.parameter}: </span>
              <span className="text-[#334155]">{insight.value}</span>
              <span className={`ml-2 font-medium ${
                insight.status === 'critical' ? 'text-[#DC2626]' :
                insight.status === 'warning' ? 'text-[#B45309]' :
                'text-[#059669]'
              }`}>
                — {insight.message}
              </span>
              <span className="text-[#94A3B8] text-xs ml-1">({insight.reference})</span>
            </div>
          </div>
        ))}
      </div>

      {hasCritical && (
        <div className="mt-3 p-2 bg-[#FEE2E2] rounded text-xs text-[#991B1B]">
          <strong>Provider Alert:</strong> Critical values detected. Consider immediate clinical assessment per DOH Emergency Triage Protocol.
        </div>
      )}

      <p className="mt-3 text-xs text-[#94A3B8] italic">
        Draft analysis for provider review only. Not a clinical diagnosis. Based on AHA 2017, WHO, and Philippine DOH guidelines.
      </p>
    </div>
  );
}
