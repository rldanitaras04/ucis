export const VALID_USER_TYPES = ['student', 'faculty', 'non_teaching_staff'] as const;
export type ValidUserType = typeof VALID_USER_TYPES[number];

export function isValidUserType(value: string): value is ValidUserType {
  return VALID_USER_TYPES.includes(value as ValidUserType);
}
