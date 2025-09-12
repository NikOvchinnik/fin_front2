export const geBudgetingStatusStyle = staatusId => {
  switch (staatusId) {
    case 1:
      return { color: '#c74736' }; //Чернетка
    case 2:
      return { color: '#c79a1b' }; //Очікує затвердження Керівник відділу
    case 3:
      return { color: '#c74736' }; //Керівник відділу: Скасовано
    case 4:
      return { color: '#c74736' }; //Потребує виправлень
    case 5:
      return { color: '#c79a1b' }; //Очікує затвердження Фінанси
    case 6:
      return { color: '#c74736' }; //Фінанси: Скасовано
    case 7:
      return { color: '#6b9429' }; //Фінанси: Затверджено
    case 8:
      return { color: '#c79a1b' }; //Очікує затвердження СЕО
    case 9:
      return { color: '#6b9429' }; //СЕО: Затверджено
    case 10:
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
  { value: 'Всі', label: 'Всі' },
  { value: 'Очікує затвердження', label: 'Очікує затвердження' },
  { value: 'Затверджено', label: 'Затверджено' },
  { value: 'Скасовано', label: 'Скасовано' },
];

export const getActiveBudgetingStatus = statusName => {
  if (!statusName) return '';
  if (statusName === 'Фінанси: Скасовано' || statusName === 'СЕО: Скасовано')
    return 'Скасовано';
  if (
    statusName === 'Очікує затвердження Фінанси' ||
    statusName === 'Очікує затвердження СЕО'
  )
    return 'Очікує затвердження';
  if (
    statusName === 'Фінанси: Затверджено' ||
    statusName === 'СЕО: Затверджено'
  )
    return 'Затверджено';
  return statusName;
};

export const approveBudgetingStatusFin = [
  { value: 7, label: 'Фінанси: Затверджено' },
  { value: 8, label: 'На затвердження СЕО' },
  { value: 6, label: 'Фінанси: Скасовано' },
  { value: 4, label: 'Потребує виправлень' },
];

export const approveBudgetingStatusCEO = [
  { value: 9, label: 'СЕО: Затверджено' },
  { value: 10, label: 'СЕО: Скасовано' },
  { value: 4, label: 'Потребує виправлень' },
];

export const approveBudgetingStatusHd = [
  { value: 5, label: 'На затвердження Фінанси' },
  { value: 3, label: 'Керівник відділу: Скасовано' },
  { value: 4, label: 'Потребує виправлень' },
];
