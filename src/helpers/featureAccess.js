import { UserRole } from './enums';

const GOOGLE_SHEETS_ANALYTICS_FINANCE_ALLOWLIST = [10];

export const canAccessGoogleSheetsAnalytics = ({ userId, userRole }) => {
  if (userRole !== UserRole.FINANCE) {
    return true;
  }

  return GOOGLE_SHEETS_ANALYTICS_FINANCE_ALLOWLIST.includes(Number(userId));
};
