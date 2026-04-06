import { UserRole } from './enums';

const GOOGLE_SHEETS_ANALYTICS_DENIED_ROLES = [
  UserRole.CEO,
  UserRole.ACCOUNTANT,
];

export const canAccessGoogleSheetsAnalytics = ({ userRole }) => {
  if (GOOGLE_SHEETS_ANALYTICS_DENIED_ROLES.includes(userRole)) {
    return false;
  }

  if (userRole === UserRole.FINANCE) {
    return true;
  }

  return true;
};
