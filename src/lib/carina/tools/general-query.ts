import { CarinaToolDefinition } from '../types';

export const generalQueryTool: CarinaToolDefinition = {
  name: 'general_query',
  description: 'Answer general questions about UCIS, clinic services, operating hours, how to use the system, and general health education. Use this for questions that do not require accessing specific patient data or clinical records.',
  allowedRoles: [],
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        description: 'The user question to answer',
      },
    },
    required: ['question'],
  },
  handler: async (args) => {
    const question = (args.question as string).toLowerCase();

    const clinicInfo = {
      services: [
        'Medical Consultation',
        'Dental Consultation',
        'Fasting Blood Sugar (FBS) Testing',
        'Vital Signs Monitoring',
        'Prescription Services',
        'Medical/Dental Clearances',
        'Referrals to Specialists',
        'Follow-up Appointments',
      ],
      features: [
        'Patient Registration',
        'Queue Management',
        'Digital Medical Records',
        'Prescription Management',
        'Document Verification via QR',
        'Notifications System',
      ],
      generalInfo: {
        name: 'University Clinic Information System (UCIS)',
        purpose: 'A comprehensive medical and dental clinic information system designed for Philippine State Universities.',
        registration: 'Visit the clinic or register online through the UCIS portal. You will need a valid university ID and email address.',
        checkin: 'After registration, join the queue at the front desk or through UCIS. You will receive a queue number and be called when it is your turn.',
        clearances: 'Medical and dental clearances are issued by authorized providers after consultation. Clearances can be verified using the QR code on the document.',
        prescriptions: 'Prescriptions are created by doctors and dentists. You can view your prescriptions in the UCIS patient portal.',
        notifications: 'UCIS sends notifications for queue updates, appointment reminders, and important clinic announcements.',
      },
    };

    if (question.includes('service') || question.includes('offer') || question.includes('what can')) {
      return {
        success: true,
        data: {
          answer: 'The UCIS clinic offers the following services:',
          services: clinicInfo.services,
        },
      };
    }

    if (question.includes('hour') || question.includes('time') || question.includes('open') || question.includes('schedule')) {
      return {
        success: true,
        data: {
          answer: 'Clinic operating hours vary by location. Please check with your specific campus clinic or contact them directly for exact hours.',
          tip: 'You can also check the operating hours displayed at the clinic entrance or in the UCIS dashboard.',
        },
      };
    }

    if (question.includes('register') || question.includes('sign up') || question.includes('account')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.registration,
          steps: [
            'Go to the UCIS portal or visit the clinic',
            'Click "Register" on the login page',
            'Fill in your personal information',
            'Select your user type (student, faculty, or staff)',
            'Submit the form',
            'You will receive login credentials',
          ],
        },
      };
    }

    if (question.includes('check in') || question.includes('queue') || question.includes('wait')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.checkin,
          steps: [
            'Register or log in to UCIS',
            'Visit the front desk for patient registration (if new)',
            'You will be added to the queue',
            'Wait for your queue number to be called',
            'Proceed to the assigned service area',
          ],
        },
      };
    }

    if (question.includes('clearance') || question.includes('medical cert') || question.includes('fit to work')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.clearances,
          types: [
            'Medical Clearance - Fitness for physical activities or employment',
            'Dental Clearance - Dental health certification',
            'General Clearance - Overall health status',
          ],
        },
      };
    }

    if (question.includes('prescription') || question.includes('medicine') || question.includes('medication')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.prescriptions,
          note: 'Prescriptions are issued by licensed doctors and dentists. Visit the clinic for a consultation to receive a prescription.',
        },
      };
    }

    if (question.includes('notification') || question.includes('alert') || question.includes('message')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.notifications,
          types: ['Queue updates', 'Appointment reminders', 'Clinic announcements', 'Security alerts'],
        },
      };
    }

    if (question.includes('contact') || question.includes('phone') || question.includes('email') || question.includes('reach')) {
      return {
        success: true,
        data: {
          answer: 'For clinic inquiries, please visit the clinic in person or check the contact information displayed on the UCIS dashboard. Each campus clinic has its own contact details.',
        },
      };
    }

    if (question.includes('what is ucis') || question.includes('about ucis') || question.includes('ucis system')) {
      return {
        success: true,
        data: {
          answer: clinicInfo.generalInfo.purpose,
          features: clinicInfo.features,
        },
      };
    }

    return {
      success: true,
      data: {
        answer: 'I can help you with information about UCIS and the clinic. Here are some things I can assist with:',
        suggestions: [
          'What services does the clinic provide?',
          'How do I register for UCIS?',
          'How does the queue system work?',
          'What are clearances and how do I get one?',
          'How do prescriptions work?',
          'What notifications will I receive?',
        ],
      },
    };
  },
};
