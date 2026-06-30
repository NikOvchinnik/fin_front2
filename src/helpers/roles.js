import { UserRole } from './enums';

export const roles = {
  admin: { id: UserRole.CEO, label: 'Administrators' },
  head: { id: UserRole.HEAD_OF_DEPARTMENT, label: 'Department Heads' },
  teamLead: { id: UserRole.APPLICANT, label: 'Team Leads' },
  financier: { id: UserRole.FINANCE, label: 'Financiers' },
  accountant: { id: UserRole.ACCOUNTANT, label: 'Accountants' },
};

export const getRoleId = userRole => {
  if (userRole && typeof userRole === 'object') {
    return Number(userRole.id ?? userRole.user_role_id ?? userRole.role_id);
  }

  return Number(userRole);
};

export const isExecutiveRole = userRole => getRoleId(userRole) === UserRole.CEO;

export const isFinanceRole = userRole => {
  if (getRoleId(userRole) === UserRole.FINANCE) return true;
  if (typeof userRole !== 'string') return false;

  const normalizedRole = userRole.toLowerCase();
  return (
    normalizedRole.includes('finance') ||
    normalizedRole.includes('financial') ||
    normalizedRole.includes('financier') ||
    normalizedRole.includes('фінанс')
  );
};
