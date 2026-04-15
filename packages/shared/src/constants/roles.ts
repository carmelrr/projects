export const OrgRole = {
  OWNER: 'OWNER',
  ADMIN_COACH: 'ADMIN_COACH',
  COACH: 'COACH',
  CLIENT: 'CLIENT',
} as const;

export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 4,
  ADMIN_COACH: 3,
  COACH: 2,
  CLIENT: 1,
};
