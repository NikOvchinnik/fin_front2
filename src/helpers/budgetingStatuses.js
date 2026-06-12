import { BudgetingStatus } from './enums';
import { FILTER_ALL, FILTER_DELETED } from './status';

export const BudgetingStatusFilter = Object.freeze({
  ALL: FILTER_ALL,
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  APPROVED: 'approved',
  NEEDS_REVISION: 'needs_revision',
  CANCELED: 'canceled',
  DELETED: FILTER_DELETED,
});

export const getBudgetingStatusStyle = staatusId => {
  switch (staatusId) {
    case BudgetingStatus.DRAFT:
      return { color: '#c74736' }; //Чернетка
    case BudgetingStatus.PENDING_LEAD_APPROVAL:
      return { color: '#c79a1b' }; //Очікує затвердження Керівник відділу
    case BudgetingStatus.LEAD_DECLINED:
      return { color: '#c74736' }; //Керівник відділу: Скасовано
    case BudgetingStatus.NEEDS_REVISION:
      return { color: '#c74736' }; //Потребує виправлень
    case BudgetingStatus.PENDING_FINANCE_APPROVAL:
      return { color: '#c79a1b' }; //Очікує затвердження Фінанси
    case BudgetingStatus.FINANCE_DECLINED:
      return { color: '#c74736' }; //Фінанси: Скасовано
    case BudgetingStatus.FINANCE_APPROVED:
      return { color: '#6b9429' }; //Фінанси: Затверджено
    case BudgetingStatus.PENDING_CEO_APPROVAL:
      return { color: '#c79a1b' }; //Очікує затвердження СЕО
    case BudgetingStatus.CEO_APPROVED:
      return { color: '#6b9429' }; //СЕО: Затверджено
    case BudgetingStatus.CEO_DECLINED:
      return { color: '#c74736' }; //СЕО: Скасовано
    default:
      return { color: '#6c757d' };
  }
};

export const getShortBudgetingStatus = statusName => {
  if (!statusName) return '';
  if (
    statusName ===
    'Сплачено і очікуються документи від контрагента після оплати'
  )
    return 'Сплачено, чекаємо документи';
  return statusName;
};

export const statusSelectorBudgetingFin = [
  { value: BudgetingStatusFilter.ALL, label: 'Всі', labelKey: 'filters.all' },
  {
    value: BudgetingStatusFilter.PENDING_APPROVAL,
    label: 'Очікує затвердження',
    labelKey: 'budgetingStatus.pendingApproval',
  },
  {
    value: BudgetingStatusFilter.APPROVED,
    label: 'Затверджено',
    labelKey: 'budgetingStatus.approved',
  },
  {
    value: BudgetingStatusFilter.CANCELED,
    label: 'Скасовано',
    labelKey: 'budgetingStatus.canceled',
  },
  {
    value: BudgetingStatusFilter.DELETED,
    label: 'Видалені',
    labelKey: 'filters.deleted',
  },
];

export const statusSelectorBudgetingUser = [
  { value: BudgetingStatusFilter.ALL, label: 'Всі', labelKey: 'filters.all' },
  {
    value: BudgetingStatusFilter.DRAFT,
    label: 'Чернетка',
    labelKey: 'budgetingStatus.draft',
  },
  {
    value: BudgetingStatusFilter.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
  {
    value: BudgetingStatusFilter.PENDING_APPROVAL,
    label: 'Очікує затвердження',
    labelKey: 'budgetingStatus.pendingApproval',
  },
  {
    value: BudgetingStatusFilter.APPROVED,
    label: 'Затверджено',
    labelKey: 'budgetingStatus.approved',
  },
  {
    value: BudgetingStatusFilter.CANCELED,
    label: 'Скасовано',
    labelKey: 'budgetingStatus.canceled',
  },
  {
    value: BudgetingStatusFilter.DELETED,
    label: 'Видалені',
    labelKey: 'filters.deleted',
  },
];

export const getActiveBudgetingStatus = (statusIdOrName, statusName) => {
  if (!statusIdOrName && !statusName) return '';

  const statusId = Number(statusIdOrName);

  switch (statusId) {
    case BudgetingStatus.DRAFT:
      return BudgetingStatusFilter.DRAFT;
    case BudgetingStatus.NEEDS_REVISION:
      return BudgetingStatusFilter.NEEDS_REVISION;
    case BudgetingStatus.PENDING_LEAD_APPROVAL:
    case BudgetingStatus.PENDING_FINANCE_APPROVAL:
    case BudgetingStatus.PENDING_CEO_APPROVAL:
      return BudgetingStatusFilter.PENDING_APPROVAL;
    case BudgetingStatus.FINANCE_APPROVED:
    case BudgetingStatus.CEO_APPROVED:
      return BudgetingStatusFilter.APPROVED;
    case BudgetingStatus.LEAD_DECLINED:
    case BudgetingStatus.FINANCE_DECLINED:
    case BudgetingStatus.CEO_DECLINED:
      return BudgetingStatusFilter.CANCELED;
    default:
      break;
  }

  const fallbackStatusName = statusName || statusIdOrName;

  if (
    fallbackStatusName === 'Фінанси: Скасовано' ||
    fallbackStatusName === 'CEO/COO/CFO: Скасовано' ||
    fallbackStatusName === 'Керівник відділу: Скасовано'
  )
    return BudgetingStatusFilter.CANCELED;
  if (
    fallbackStatusName === 'Очікує затвердження Фінанси' ||
    fallbackStatusName === 'Очікує затвердження CEO/COO/CFO' ||
    fallbackStatusName === 'Очікує затвердження Керівник відділу'
  )
    return BudgetingStatusFilter.PENDING_APPROVAL;
  if (
    fallbackStatusName === 'Фінанси: Затверджено' ||
    fallbackStatusName === 'CEO/COO/CFO: Затверджено'
  )
    return BudgetingStatusFilter.APPROVED;
  if (fallbackStatusName === 'Чернетка') return BudgetingStatusFilter.DRAFT;
  if (fallbackStatusName === 'Потребує виправлень') {
    return BudgetingStatusFilter.NEEDS_REVISION;
  }
  return fallbackStatusName;
};

export const approveBudgetingStatus = [
  {
    value: BudgetingStatus.CEO_APPROVED,
    label: 'CEO/COO/CFO: Затверджено',
    labelKey: 'budgetingStatus.ceoApproved',
  },
  {
    value: BudgetingStatus.CEO_DECLINED,
    label: 'CEO/COO/CFO: Скасовано',
    labelKey: 'budgetingStatus.ceoDeclined',
  },
  {
    value: BudgetingStatus.FINANCE_APPROVED,
    label: 'Фінанси: Затверджено',
    labelKey: 'budgetingStatus.financeApproved',
  },
  {
    value: BudgetingStatus.PENDING_CEO_APPROVAL,
    label: 'На затвердження CEO/COO/CFO',
    labelKey: 'budgetingStatus.pendingCeoApproval',
  },
  {
    value: BudgetingStatus.FINANCE_DECLINED,
    label: 'Фінанси: Скасовано',
    labelKey: 'budgetingStatus.financeDeclined',
  },
  {
    value: BudgetingStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
  {
    value: BudgetingStatus.LEAD_DECLINED,
    label: 'Керівник відділу: Скасовано',
    labelKey: 'budgetingStatus.leadDeclined',
  },
];

export const approveBudgetingStatusFin = [
  {
    value: BudgetingStatus.FINANCE_APPROVED,
    label: 'Фінанси: Затверджено',
    labelKey: 'budgetingStatus.financeApproved',
  },
  {
    value: BudgetingStatus.PENDING_CEO_APPROVAL,
    label: 'На затвердження CEO/COO/CFO',
    labelKey: 'budgetingStatus.pendingCeoApproval',
  },
  {
    value: BudgetingStatus.FINANCE_DECLINED,
    label: 'Фінанси: Скасовано',
    labelKey: 'budgetingStatus.financeDeclined',
  },
  {
    value: BudgetingStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
];

export const approveBudgetingStatusCEO = [
  {
    value: BudgetingStatus.CEO_APPROVED,
    label: 'CEO/COO/CFO: Затверджено',
    labelKey: 'budgetingStatus.ceoApproved',
  },
  {
    value: BudgetingStatus.CEO_DECLINED,
    label: 'CEO/COO/CFO: Скасовано',
    labelKey: 'budgetingStatus.ceoDeclined',
  },
  {
    value: BudgetingStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
];

export const approveBudgetingStatusHd = [
  {
    value: BudgetingStatus.PENDING_FINANCE_APPROVAL,
    label: 'На затвердження Фінанси',
    labelKey: 'budgetingStatus.pendingFinanceApproval',
  },
  {
    value: BudgetingStatus.LEAD_DECLINED,
    label: 'Керівник відділу: Скасовано',
    labelKey: 'budgetingStatus.leadDeclined',
  },
  {
    value: BudgetingStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
];
