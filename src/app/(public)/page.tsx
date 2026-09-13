import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-display text-[#0F172A] sm:text-5xl md:text-6xl">
            University Clinic
            <span className="text-[#1E40AF]"> Information System</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-body text-[#64748B] sm:text-lg md:mt-5 md:text-xl md:max-w-2xl">
            A comprehensive medical and dental clinic management system designed for Philippine State Universities and Colleges.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/auth/login" className="btn-primary px-8 py-3 text-base">
              Get Started
            </Link>
            <Link href="#features" className="btn-secondary px-8 py-3 text-base">
              Learn More
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-20">
          <h2 className="text-heading text-[#0F172A] text-center mb-10">
            Key Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            <div className="card text-center">
              <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-subheading text-[#0F172A]">Secure & Private</h3>
              <p className="mt-2 text-body text-[#64748B]">
                Row-level security ensures patients can only see their own records. Clinical data is protected at the database level.
              </p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-[#ECFDF5] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-subheading text-[#0F172A]">Multi-Campus</h3>
              <p className="mt-2 text-body text-[#64748B]">
                Support for multiple campuses under one university. Admins see only their campus data.
              </p>
            </div>
            <div className="card text-center">
              <div className="w-12 h-12 bg-[#EFF6FF] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <h3 className="text-subheading text-[#0F172A]">Digital Queue</h3>
              <p className="mt-2 text-body text-[#64748B]">
                Real-time queue management with automatic numbering. Patients can track their queue status.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
