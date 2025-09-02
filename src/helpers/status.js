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

export const statusSelector = [
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
