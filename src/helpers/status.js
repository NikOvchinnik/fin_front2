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
    case 'Скасовано':
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
  { value: '10', label: 'Передано на оплату' },
  {
    value: '9',
    label: 'Потребує виправлень',
  },
  { value: '14', label: 'Скасовано фінансами' },
];

export const approveStatusBuh = [
  { value: '18', label: 'Сплачено' },
  {
    value: '19',
    label: 'Сплачено і очікуються документи від контрагента після оплати',
  },
  {
    value: '16',
    label: 'Потребує виправлень',
  },
  { value: '20', label: 'Скасовано' },
];
