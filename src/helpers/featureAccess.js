import { UserRole } from './enums';

const GOOGLE_SHEETS_ANALYTICS_FINANCE_ALLOWLIST = [10];
const GOOGLE_SHEETS_ANALYTICS_DENIED_ROLES = [
  UserRole.CEO,
  UserRole.ACCOUNTANT,
];

export const canAccessGoogleSheetsAnalytics = ({ userId, userRole }) => {
  if (GOOGLE_SHEETS_ANALYTICS_DENIED_ROLES.includes(userRole)) {
    return false;
  }

  if (userRole === UserRole.FINANCE) {
    return GOOGLE_SHEETS_ANALYTICS_FINANCE_ALLOWLIST.includes(Number(userId));
  }

  return true;
};
