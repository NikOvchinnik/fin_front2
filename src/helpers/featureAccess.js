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

// Доступ до "Зарплатної відомості" визначається не роллю, а прапорцем
// is_payroll_manager (CEO/FINANCE вручну відзначають користувача як
// керівника при створенні/редагуванні в "Користувачах").
export const canAccessPayrollStatement = ({ isPayrollManager }) =>
  Boolean(isPayrollManager);

// Доступ до "Співробітники" (Staff) і "Перевірка відомостей" — той самий
// підхід: не роль FINANCE, а точковий прапорець has_finance_staff_access,
// який CEO/FINANCE вмикають вручну конкретним людям незалежно від ролі.
export const canAccessStaffAndPayrollReview = ({ hasFinanceStaffAccess }) =>
  Boolean(hasFinanceStaffAccess);
