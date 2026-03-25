import { FinancialRequestStatus } from './enums';

export const getStatusStyle = status => {
  switch (status) {
    case 'Чернетка':
      return { color: '#c74736' };
    case 'Очікує затвердження':
      return { color: '#c79a1b' };
    case 'Передано на оплату':
      return { color: '#378a9e' };
    case 'Фінанси: Сплачено':
      return { color: '#6b9429' };
    case 'Фінанси: Сплачено, очікуються документи':
      return { color: '#6b9429' };
    case 'Бухгалтер: Сплачено':
      return { color: '#6b9429' };
    case 'Бухгалтер: Сплачено, очікуються документи':
      return { color: '#6b9429' };
    case 'Потребує виправлень':
      return { color: '#c74736' };
    case 'Фінанси: Скасовано':
      return { color: '#c74736' };
    case 'Бухгалтер: Скасовано':
      return { color: '#c74736' };
    default:
      return { color: '#6c757d' };
  }
};

export const statusSelectorFin = [
  { value: 'Всі', label: 'Всі' },
  { value: 'Очікує затвердження', label: 'Очікує затвердження' },
  { value: 'Передано на оплату', label: 'Передано на оплату' },
  { value: 'Сплачено', label: 'Сплачено' },
  { value: 'Очікуються документи', label: 'Очікуються документи' },
  {
    value: 'Потребує виправлень',
    label: 'Потребує виправлень',
  },
  { value: 'Скасовано', label: 'Скасовано' },
  { value: 'Видалені', label: 'Видалені' },
];

export const statusSelectorBuh = [
  { value: 'Всі', label: 'Всі' },
  { value: 'Передано на оплату', label: 'Передано на оплату' },
  { value: 'Сплачено', label: 'Сплачено' },
  { value: 'Очікуються документи', label: 'Очікуються документи' },
  { value: 'Скасовано', label: 'Скасовано' },
  { value: 'Видалені', label: 'Видалені' },
];

export const statusSelectorUser = [
  { value: 'Всі', label: 'Всі' },
  { value: 'Чернетка', label: 'Чернетка' },
  { value: 'Очікує затвердження', label: 'Очікує затвердження' },
  { value: 'Передано на оплату', label: 'Передано на оплату' },
  { value: 'Сплачено', label: 'Сплачено' },
  { value: 'Очікуються документи', label: 'Очікуються документи' },
  {
    value: 'Потребує виправлень',
    label: 'Потребує виправлень',
  },
  { value: 'Скасовано', label: 'Скасовано' },
  { value: 'Видалені', label: 'Видалені' },
];

export const approveStatus = [
  {
    value: FinancialRequestStatus.DRAFT,
    label: 'Чернетка',
  },
  {
    value: FinancialRequestStatus.PENDING_APPROVAL,
    label: 'Очікує затвердження',
  },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
  },
  { value: FinancialRequestStatus.SENT_TO_PAYMENT, label: 'Передано на оплату' },
  { value: FinancialRequestStatus.ACCOUNTANT_PAID, label: 'Бухгалтер: Сплачено' },
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Бухгалтер: Сплачено, очікуються документи',
  },
  { value: FinancialRequestStatus.FINANCE_CANCELED, label: 'Фінанси: Скасовано' },
  { value: FinancialRequestStatus.ACCOUNTANT_CANCELED, label: 'Бухгалтер: Скасовано' },
  { value: FinancialRequestStatus.FINANCE_PAID, label: 'Фінанси: Сплачено' },
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Фінанси: Сплачено, очікуються документи',
  },
];

export const approveFilesFin = [
  { value: FinancialRequestStatus.FINANCE_PAID, label: 'Всі документи додано' }, //Фінанси: Сплачено
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Очікуються ще документи',
  }, //Фінанси: Сплачено, очікуються документи
];

export const approveFilesBuh = [
  { value: FinancialRequestStatus.ACCOUNTANT_PAID, label: 'Всі документи додано' }, //Бухгалтер: Сплачено
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Очікуються ще документи',
  }, //Бухгалтер: Сплачено, очікуються документи
];

export const approveStatusFin = [
  { value: FinancialRequestStatus.SENT_TO_PAYMENT, label: 'Передано на оплату' },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID,
    label: 'Фінанси: Сплачено',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Фінанси: Сплачено, очікуються документи',
  },
  { value: FinancialRequestStatus.FINANCE_CANCELED, label: 'Фінанси: Скасовано' },
];

export const approveStatusBuh = [
  { value: FinancialRequestStatus.ACCOUNTANT_PAID, label: 'Бухгалтер: Сплачено' },
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Бухгалтер: Сплачено, очікуються документи',
  },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
  },
  { value: FinancialRequestStatus.ACCOUNTANT_CANCELED, label: 'Бухгалтер: Скасовано' },
];

export const getShortStatus = statusName => {
  if (!statusName) return '';
  // if (
  //   statusName ===
  //   'Сплачено і очікуються документи від контрагента після оплати'
  // )
  //   return 'Сплачено, чекаємо документи';
  return statusName;
};

export const getActiveStatus = statusName => {
  if (!statusName) return '';

  const paidStatuses = ['Фінанси: Сплачено', 'Бухгалтер: Сплачено'];

  const awaitStatuses = [
    'Фінанси: Сплачено, очікуються документи',
    'Бухгалтер: Сплачено, очікуються документи',
  ];

  const canceledStatuses = ['Фінанси: Скасовано', 'Бухгалтер: Скасовано'];

  if (paidStatuses.includes(statusName)) {
    return 'Сплачено';
  }

  if (awaitStatuses.includes(statusName)) {
    return 'Очікуються документи';
  }

  if (canceledStatuses.includes(statusName)) {
    return 'Скасовано';
  }

  return statusName;
};
