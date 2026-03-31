import { UserRole } from './enums';

export const roles = {
  admin: { id: UserRole.CEO, label: 'Administrators' },
  head: { id: UserRole.HEAD_OF_DEPARTMENT, label: 'Department Heads' },
  teamLead: { id: UserRole.APPLICANT, label: 'Team Leads' },
  financier: { id: UserRole.FINANCE, label: 'Financiers' },
  accountant: { id: UserRole.ACCOUNTANT, label: 'Accountants' },
};
