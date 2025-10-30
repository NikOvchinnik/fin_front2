export const searchType = [
  { value: 'request', label: 'Заявка' },
  { value: 'budgeting', label: 'Бюджет' },
];

export const statusHistory = [
  {
    value: 'All',
    label: 'Всі',
  },
  {
    value: '1',
    label: 'Чернетка',
  },
  {
    value: '2',
    label: 'Очікує затвердження',
  },
  {
    value: '3',
    label: 'Потребує виправлень',
  },
  { value: '4', label: 'Передано на оплату' },
  { value: '5', label: 'Сплачено' },
  { value: '20', label: 'Скасовано' },
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
  },
  {
    value: '1',
    label: 'Чернетка',
  },
  {
    value: '2',
    label: 'Очікує затвердження',
  },
  {
    value: '4',
    label: 'Потребує виправлень',
  },
  { value: '7', label: 'Затверджено' },
  { value: '6', label: 'Скасовано' },
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
