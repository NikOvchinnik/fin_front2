import { BudgetingStatus, FinancialRequestStatus } from './enums';

const financialStatusKeyById = {
  [FinancialRequestStatus.DRAFT]: 'financialStatus.draft',
  [FinancialRequestStatus.PENDING_APPROVAL]: 'financialStatus.pendingApproval',
  [FinancialRequestStatus.NEEDS_REVISION]: 'financialStatus.needsRevision',
  [FinancialRequestStatus.SENT_TO_PAYMENT]: 'financialStatus.sentToPayment',
  [FinancialRequestStatus.ACCOUNTANT_PAID]: 'financialStatus.accountantPaid',
  [FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS]:
    'financialStatus.accountantPaidAwaitingDocuments',
  [FinancialRequestStatus.FINANCE_CANCELED]: 'financialStatus.financeCanceled',
  [FinancialRequestStatus.ACCOUNTANT_CANCELED]:
    'financialStatus.accountantCanceled',
  [FinancialRequestStatus.FINANCE_PAID]: 'financialStatus.financePaid',
  [FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS]:
    'financialStatus.financePaidAwaitingDocuments',
};

const financialStatusKeyByName = {
  Чернетка: 'financialStatus.draft',
  'Очікує затвердження': 'financialStatus.pendingApproval',
  'Потребує виправлень': 'financialStatus.needsRevision',
  'Передано на оплату': 'financialStatus.sentToPayment',
  'Бухгалтер: Сплачено': 'financialStatus.accountantPaid',
  'Бухгалтер: Сплачено, очікуються документи':
    'financialStatus.accountantPaidAwaitingDocuments',
  'Фінанси: Скасовано': 'financialStatus.financeCanceled',
  'Бухгалтер: Скасовано': 'financialStatus.accountantCanceled',
  'Фінанси: Сплачено': 'financialStatus.financePaid',
  'Фінанси: Сплачено, очікуються документи':
    'financialStatus.financePaidAwaitingDocuments',
};

const budgetingStatusKeyById = {
  [BudgetingStatus.DRAFT]: 'budgetingStatus.draft',
  [BudgetingStatus.PENDING_LEAD_APPROVAL]: 'budgetingStatus.pendingApproval',
  [BudgetingStatus.LEAD_DECLINED]: 'budgetingStatus.leadDeclined',
  [BudgetingStatus.NEEDS_REVISION]: 'budgetingStatus.needsRevision',
  [BudgetingStatus.PENDING_FINANCE_APPROVAL]:
    'budgetingStatus.pendingFinanceApproval',
  [BudgetingStatus.FINANCE_DECLINED]: 'budgetingStatus.financeDeclined',
  [BudgetingStatus.FINANCE_APPROVED]: 'budgetingStatus.financeApproved',
  [BudgetingStatus.PENDING_CEO_APPROVAL]: 'budgetingStatus.pendingCeoApproval',
  [BudgetingStatus.CEO_APPROVED]: 'budgetingStatus.ceoApproved',
  [BudgetingStatus.CEO_DECLINED]: 'budgetingStatus.ceoDeclined',
};

const budgetingStatusKeyByName = {
  Чернетка: 'budgetingStatus.draft',
  'Потребує виправлень': 'budgetingStatus.needsRevision',
  'Очікує затвердження Керівник відділу': 'budgetingStatus.pendingApproval',
  'Очікує затвердження Фінанси': 'budgetingStatus.pendingFinanceApproval',
  'Очікує затвердження CEO/COO/CFO': 'budgetingStatus.pendingCeoApproval',
  'Керівник відділу: Скасовано': 'budgetingStatus.leadDeclined',
  'Фінанси: Скасовано': 'budgetingStatus.financeDeclined',
  'Фінанси: Затверджено': 'budgetingStatus.financeApproved',
  'CEO/COO/CFO: Затверджено': 'budgetingStatus.ceoApproved',
  'CEO/COO/CFO: Скасовано': 'budgetingStatus.ceoDeclined',
};

export const translateOptions = (options, t) =>
  (options || []).map(option => ({
    ...option,
    label: option.labelKey ? t(option.labelKey) : option.label,
  }));

export const translateFinancialStatus = (status, t) => {
  const statusId =
    typeof status === 'object' ? Number(status?.id ?? status?.status_id) : Number(status);
  const statusName = typeof status === 'object' ? status?.name : status;
  const key = financialStatusKeyById[statusId] || financialStatusKeyByName[statusName];

  return key ? t(key) : statusName || '';
};

export const translateBudgetingStatus = (status, t) => {
  const statusId =
    typeof status === 'object' ? Number(status?.id ?? status?.status_id) : Number(status);
  const statusName = typeof status === 'object' ? status?.name : status;
  const key = budgetingStatusKeyById[statusId] || budgetingStatusKeyByName[statusName];

  return key ? t(key) : statusName || '';
};
