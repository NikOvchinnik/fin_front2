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
  {
    value: 'Потребує виправлень',
    label: 'Потребує виправлень',
  },
  { value: 'Скасовано', label: 'Скасовано' },
];

export const statusSelectorBuh = [
  { value: 'Всі', label: 'Всі' },
  { value: 'Передано на оплату', label: 'Передано на оплату' },
  { value: 'Сплачено', label: 'Сплачено' },
  { value: 'Скасовано', label: 'Скасовано' },
];

export const approveStatus = [
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
  { value: '5', label: 'Бухгалтер: Сплачено' },
  {
    value: '6',
    label: 'Бухгалтер: Сплачено, очікуються документи',
  },
  { value: '14', label: 'Фінанси: Скасовано' },
  { value: '20', label: 'Бухгалтер: Скасовано' },
  { value: '21', label: 'Фінанси: Сплачено' },
  { value: '22', label: 'Фінанси: Сплачено, очікуються документи' },
];

export const approveStatusFin = [
  { value: '4', label: 'Передано на оплату' },
  {
    value: '3',
    label: 'Потребує виправлень',
  },
  {
    value: '21',
    label: 'Фінанси: Сплачено',
  },
  {
    value: '22',
    label: 'Фінанси: Сплачено, очікуються документи',
  },
  { value: '14', label: 'Фінанси: Скасовано' },
];

export const approveStatusBuh = [
  { value: '5', label: 'Бухгалтер: Сплачено' },
  {
    value: '6',
    label: 'Бухгалтер: Сплачено, очікуються документи',
  },
  {
    value: '3',
    label: 'Потребує виправлень',
  },
  { value: '20', label: 'Бухгалтер: Скасовано' },
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

  const paidStatuses = [
    'Фінанси: Сплачено',
    'Фінанси: Сплачено, очікуються документи',
    'Бухгалтер: Сплачено',
    'Бухгалтер: Сплачено, очікуються документи',
  ];

  const canceledStatuses = ['Фінанси: Скасовано', 'Бухгалтер: Скасовано'];

  if (paidStatuses.includes(statusName)) {
    return 'Сплачено';
  }

  if (canceledStatuses.includes(statusName)) {
    return 'Скасовано';
  }

  return statusName;
};
