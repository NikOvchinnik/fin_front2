export const searchType = [
  { value: 'request', label: 'Заявка', labelKey: 'options.request' },
  { value: 'budgeting', label: 'Бюджет', labelKey: 'options.budget' },
];

export const statusHistory = [
  {
    value: 'All',
    label: 'Всі',
    labelKey: 'filters.all',
  },
  {
    value: '1',
    label: 'Чернетка',
    labelKey: 'financialStatus.draft',
  },
  {
    value: '2',
    label: 'Очікує затвердження',
    labelKey: 'financialStatus.pendingApproval',
  },
  {
    value: '3',
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  { value: '4', label: 'Передано на оплату', labelKey: 'financialStatus.sentToPayment' },
  { value: '5', label: 'Сплачено', labelKey: 'financialStatus.paid' },
  { value: '20', label: 'Скасовано', labelKey: 'financialStatus.canceled' },
];

export const getActiveStatus = statusId => {
  if (!statusId) return '';

  if (statusId === 5 || statusId === 21) {
    return '5';
  }

  if (statusId === 14 || statusId === 20) {
    return '20';
  }

  if (statusId === 6 || statusId === 22) {
    return '5';
  }

  return String(statusId);
};

export const statusHistoryBudgeting = [
  {
    value: 'All',
    label: 'Всі',
    labelKey: 'filters.all',
  },
  {
    value: '1',
    label: 'Чернетка',
    labelKey: 'budgetingStatus.draft',
  },
  {
    value: '2',
    label: 'Очікує затвердження',
    labelKey: 'budgetingStatus.pendingApproval',
  },
  {
    value: '4',
    label: 'Потребує виправлень',
    labelKey: 'budgetingStatus.needsRevision',
  },
  { value: '7', label: 'Затверджено', labelKey: 'budgetingStatus.approved' },
  { value: '6', label: 'Скасовано', labelKey: 'budgetingStatus.canceled' },
];

export const getActiveBudgetingStatus = statusId => {
  if (!statusId) return '';

  if (statusId === 2 || statusId === 5 || statusId === 8) {
    return '2';
  }

  if (statusId === 3 || statusId === 6 || statusId === 10) {
    return '6';
  }

  if (statusId === 7 || statusId === 9) {
    return '7';
  }

  return String(statusId);
};
