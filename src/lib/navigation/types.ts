import { ElementType } from 'react';

export type UserRole =
  | 'guest'
  | 'student'
  | 'faculty'
  | 'non_teaching_staff'
  | 'clinic_staff'
  | 'nurse'
  | 'doctor'
  | 'dentist'
  | 'admin'
  | 'super_admin';

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  section: string;
  priority: number;

  requiredRoles?: UserRole[];
  requiredPermissions?: string[];

  requiresProvider?: boolean;
  providerTypes?: ('doctor' | 'dentist' | 'nurse')[];

  requiresPatientLink?: boolean;

  children?: NavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  items: NavigationItem[];
}

export interface AuthorizationContext {
  userId: string;
  roles: string[];
  permissions: string[];
  clinicIds: string[];
  provider?: {
    id: string;
    type: 'doctor' | 'dentist' | 'nurse';
    active: boolean;
  };
  patient?: {
    id: string;
  };
}
