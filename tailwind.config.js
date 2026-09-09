/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* University Blue System */
        primary: {
          DEFAULT: '#1E40AF',
          hover: '#1D4ED8',
          active: '#1E3A8A',
          subtle: '#EFF6FF',
          border: '#BFDBFE',
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB',
          600: '#1E40AF',
          700: '#1D4ED8',
          800: '#1E3A8A',
          900: '#1E3370',
        },
        /* Deep/Navy */
        navy: {
          DEFAULT: '#0F172A',
          light: '#1E293B',
        },
        /* Neutral */
        neutral: {
          white: '#FFFFFF',
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        /* Clinical Semantic Colors */
        emergency: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          border: '#FCA5A5',
        },
        urgent: {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          border: '#FCD34D',
        },
        priority: {
          DEFAULT: '#CA8A04',
          bg: '#FEFCE8',
          border: '#FDE047',
        },
        routine: {
          DEFAULT: '#059669',
          bg: '#ECFDF5',
          border: '#6EE7B7',
        },
        /* Status Colors */
        success: {
          DEFAULT: '#059669',
          bg: '#ECFDF5',
          border: '#6EE7B7',
        },
        warning: {
          DEFAULT: '#D97706',
          bg: '#FFFBEB',
          border: '#FCD34D',
        },
        danger: {
          DEFAULT: '#DC2626',
          bg: '#FEF2F2',
          border: '#FCA5A5',
        },
        info: {
          DEFAULT: '#2563EB',
          bg: '#EFF6FF',
          border: '#BFDBFE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        'heading': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'subheading': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.25rem' }],
        'small': ['0.75rem', { lineHeight: '1rem' }],
        'caption': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'panel': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
