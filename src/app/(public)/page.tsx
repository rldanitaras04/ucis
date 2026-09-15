import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Buildings,
  Queue,
  Pill,
  Tooth,
  Robot,
  Stethoscope,
  FileText,
  ChartBar,
  UserCircle,
  Heartbeat,
  Student,
  FirstAid,
  ClipboardText,
  CheckCircle,
  GraduationCap,
  Briefcase,
} from '@phosphor-icons/react/dist/ssr';

const FEATURES = [
  {
    icon: ShieldCheck,
    iconBg: 'bg-[#EFF6FF]',
    iconColor: 'text-[#1E40AF]',
    title: 'Role-Based Security',
    description: 'Row-level security ensures only authorized users access patient data. Every action is audit-logged for compliance.',
  },
  {
    icon: Queue,
    iconBg: 'bg-[#FFF7ED]',
    iconColor: 'text-[#EA580C]',
    title: 'Digital Queue Management',
    description: 'Real-time queue with automatic numbering. Patients track their queue status and estimated wait times.',
  },
  {
    icon: Pill,
    iconBg: 'bg-[#FDF2F8]',
    iconColor: 'text-[#DB2777]',
    title: 'Pharmacy & Dispensing',
    description: 'Medicine inventory with batch tracking, expiry alerts, and automated dispensing with prescription validation.',
  },
  {
    icon: Tooth,
    iconBg: 'bg-[#F0FDF4]',
    iconColor: 'text-[#16A34A]',
    title: 'Dental Records',
    description: 'Digital odontogram charting, dental clinical notes, and treatment planning with visual tooth mapping.',
  },
  {
    icon: Robot,
    iconBg: 'bg-[#EDE9FE]',
    iconColor: 'text-[#7C3AED]',
    title: 'Carina AI Assistant',
    description: 'AI-powered clinical assistant with 21 tools. Search patients, record vitals, manage prescriptions through natural conversation.',
  },
  {
    icon: Stethoscope,
    iconBg: 'bg-[#FEF2F2]',
    iconColor: 'text-[#DC2626]',
    title: 'Vitals & Lab Tracking',
    description: 'Record and classify vital signs with clinical range validation. FBS analysis with automated health assessments.',
  },
  {
    icon: FileText,
    iconBg: 'bg-[#F5F3FF]',
    iconColor: 'text-[#6D28D9]',
    title: 'Document Management',
    description: 'Medical certificates, clearances, referrals, and consent forms with document control numbers and verification tokens.',
  },
  {
    icon: ChartBar,
    iconBg: 'bg-[#ECFDF5]',
    iconColor: 'text-[#059669]',
    title: 'Analytics & Reports',
    description: 'Role-adaptive dashboards with inventory alerts, clinical reports, and campus-wide health statistics.',
  },
];

const STEPS = [
  {
    number: '01',
    icon: UserCircle,
    title: 'Register',
    description: 'Create your account with your university credentials. Select your role and campus during registration.',
  },
  {
    number: '02',
    icon: ClipboardText,
    title: 'Visit the Clinic',
    description: 'Join the digital queue or book an appointment. Your medical history is instantly available to clinic staff.',
  },
  {
    number: '03',
    icon: CheckCircle,
    title: 'Get Treatment',
    description: 'Receive care from doctors and dentists. Prescriptions, referrals, and follow-ups are managed digitally.',
  },
];

const ROLES = [
  {
    icon: Student,
    label: 'Students',
    description: 'Access your records, join queues, and manage prescriptions through the patient portal.',
  },
  {
    icon: Stethoscope,
    label: 'Doctors & Dentists',
    description: 'Clinical notes, vitals recording, prescriptions, and treatment planning in one interface.',
  },
  {
    icon: Heartbeat,
    label: 'Nurses & Staff',
    description: 'Queue management, vitals intake, dispensing, and clinic operations streamlined.',
  },
  {
    icon: GraduationCap,
    label: 'Faculty',
    description: 'Access clinic services, view employee health records, and manage work-related medical clearances.',
  },
  {
    icon: Briefcase,
    label: 'Non-Teaching Staff',
    description: 'Employee health services, benefits coordination, and occupational health tracking.',
  },
  {
    icon: Buildings,
    label: 'Admins',
    description: 'User management, audit logs, campus configuration, and system-wide analytics.',
  },
];

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E3A8A] to-[#1E40AF]">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <Image
                src="/clinic_logo.png"
                alt="UCIS Logo"
                width={72}
                height={72}
                className="rounded-2xl shadow-lg"
                priority
              />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              U-Care
            </h1>
            <p className="mt-2 text-lg sm:text-xl text-[#93C5FD] font-medium">
              University Clinic Information System
            </p>
            <p className="mt-4 max-w-2xl mx-auto text-base sm:text-lg text-[#CBD5E1] leading-relaxed">
              A comprehensive medical and dental clinic management system designed for Iloilo State University of Fisheries Science and Technology — Dingle Campus.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/login"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-lg bg-white text-[#1E40AF] hover:bg-[#F1F5F9] transition-colors shadow-lg"
              >
                Get Started
              </Link>
              <Link
                href="/auth/register"
                className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-lg border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                Create Account
              </Link>
            </div>
            <div className="mt-8 flex justify-center gap-8 text-sm text-[#93C5FD]">
              <span className="flex items-center gap-1.5">
                <FirstAid className="w-4 h-4" weight="bold" />
                Medical & Dental
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" weight="bold" />
                Secure & Private
              </span>
              <span className="flex items-center gap-1.5">
                <Robot className="w-4 h-4" weight="bold" />
                AI-Powered
              </span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent" />
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-heading text-[#0F172A]">
            Everything Your Clinic Needs
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-body text-[#64748B]">
            From patient registration to AI-assisted clinical decisions — a complete platform for university clinic management.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="card hover:shadow-card-hover transition-shadow duration-200"
            >
              <div className={`w-11 h-11 ${feature.iconBg} rounded-lg flex items-center justify-center mb-4`}>
                <feature.icon className={`w-5 h-5 ${feature.iconColor}`} weight="duotone" />
              </div>
              <h3 className="text-subheading text-[#0F172A]">{feature.title}</h3>
              <p className="mt-2 text-body text-[#64748B] leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-[#F8FAFC] border-y border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center mb-14">
            <h2 className="text-heading text-[#0F172A]">
              How It Works
            </h2>
            <p className="mt-3 max-w-xl mx-auto text-body text-[#64748B]">
              Getting started is simple. Three steps to digitize your clinic experience.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((step, index) => (
              <div key={step.title} className="text-center relative">
                {index < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[60%] w-[80%] border-t-2 border-dashed border-[#CBD5E1]" />
                )}
                <div className="relative z-10 w-16 h-16 bg-[#1E40AF] rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-md">
                  <step.icon className="w-7 h-7 text-white" weight="duotone" />
                </div>
                <span className="text-caption text-[#94A3B8] font-semibold tracking-widest uppercase">Step {step.number}</span>
                <h3 className="mt-2 text-subheading text-[#0F172A]">{step.title}</h3>
                <p className="mt-2 text-body text-[#64748B] max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* User Roles */}
      <section id="roles" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-heading text-[#0F172A]">
            Built for Every Role
          </h2>
          <p className="mt-3 max-w-2xl mx-auto text-body text-[#64748B]">
            Whether you&apos;re a student visiting the clinic or an admin managing operations — U-Care adapts to your needs.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {ROLES.map((role) => (
            <div
              key={role.label}
              className="text-center p-6 rounded-xl border border-[#E2E8F0] bg-white hover:border-[#BFDBFE] hover:shadow-sm transition-all duration-200"
            >
              <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <role.icon className="w-6 h-6 text-[#1E40AF]" weight="duotone" />
              </div>
              <h3 className="text-subheading text-[#0F172A]">{role.label}</h3>
              <p className="mt-2 text-body text-[#64748B]">
                {role.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-[#1E40AF] to-[#1E3A8A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Ready to modernize your university clinic?
          </h2>
          <p className="mt-3 text-[#BFDBFE] max-w-xl mx-auto">
            Join ISUFST Dingle Campus in delivering faster, smarter, and more secure healthcare services.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-lg bg-white text-[#1E40AF] hover:bg-[#F1F5F9] transition-colors shadow-lg"
            >
              Create Free Account
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex items-center justify-center px-8 py-3.5 text-base font-semibold rounded-lg border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
