export const getStatusStyle = status => {
  switch (status) {
    case 'Чернетка':
      return { color: '#c74736' };
    case 'Очікує затвердження':
      return { color: '#c79a1b' };
    case 'Передано на оплату':
      return { color: '#378a9e' };
    case 'Сплачено':
      return { color: '#6b9429' };
    case 'Сплачено і очікуються документи від контрагента після оплати':
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

export const approveStatusFin = [
  { value: '4', label: 'Передано на оплату' },
  {
    value: '3',
    label: 'Потребує виправлень',
  },
  { value: '14', label: 'Скасовано фінансами' },
];

export const approveStatusBuh = [
  { value: '5', label: 'Сплачено' },
  {
    value: '6',
    label: 'Сплачено і очікуються документи від контрагента',
  },
  {
    value: '3',
    label: 'Потребує виправлень',
  },
  { value: '20', label: 'Скасовано бухгалтером' },
];

export const getShortStatus = statusName => {
  if (!statusName) return '';
  if (
    statusName ===
    'Сплачено і очікуються документи від контрагента після оплати'
  )
    return 'Сплачено, чекаємо документи';
  return statusName;
};

export const getActiveStatus = statusName => {
  if (!statusName) return '';
  if (
    statusName ===
    'Сплачено і очікуються документи від контрагента після оплати'
  )
    return 'Сплачено';
    if (
      statusName === 'Фінанси: Скасовано' ||
      statusName === 'Бухгалтер: Скасовано'
    )
      return 'Скасовано';
  return statusName;
};
