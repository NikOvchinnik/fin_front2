import { BudgetingStatus } from './enums';

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
  { value: 'Всі', label: 'Всі' },
  { value: 'Очікує затвердження', label: 'Очікує затвердження' },
  { value: 'Затверджено', label: 'Затверджено' },
  { value: 'Скасовано', label: 'Скасовано' },
  { value: 'Видалені', label: 'Видалені' },
];

export const statusSelectorBudgetingUser = [
  { value: 'Всі', label: 'Всі' },
  { value: 'Чернетка', label: 'Чернетка' },
  {
    value: BudgetingStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
  },
  { value: 'Очікує затвердження', label: 'Очікує затвердження' },
  { value: 'Затверджено', label: 'Затверджено' },
  { value: 'Скасовано', label: 'Скасовано' },
  { value: 'Видалені', label: 'Видалені' },
];

export const getActiveBudgetingStatus = statusName => {
  if (!statusName) return '';
  if (
    statusName === 'Фінанси: Скасовано' ||
    statusName === 'CEO/COO/CFO: Скасовано' ||
    statusName === 'Керівник відділу: Скасовано'
  )
    return 'Скасовано';
  if (
    statusName === 'Очікує затвердження Фінанси' ||
    statusName === 'Очікує затвердження CEO/COO/CFO' ||
    statusName === 'Очікує затвердження Керівник відділу'
  )
    return 'Очікує затвердження';
  if (
    statusName === 'Фінанси: Затверджено' ||
    statusName === 'CEO/COO/CFO: Затверджено'
  )
    return 'Затверджено';
  return statusName;
};

export const approveBudgetingStatus = [
  { value: BudgetingStatus.CEO_APPROVED, label: 'CEO/COO/CFO: Затверджено' },
  { value: BudgetingStatus.CEO_DECLINED, label: 'CEO/COO/CFO: Скасовано' },
  { value: BudgetingStatus.FINANCE_APPROVED, label: 'Фінанси: Затверджено' },
  {
    value: BudgetingStatus.PENDING_CEO_APPROVAL,
    label: 'На затвердження CEO/COO/CFO',
  },
  { value: BudgetingStatus.FINANCE_DECLINED, label: 'Фінанси: Скасовано' },
  { value: BudgetingStatus.NEEDS_REVISION, label: 'Потребує виправлень' },
  { value: BudgetingStatus.LEAD_DECLINED, label: 'Керівник відділу: Скасовано' },
];

export const approveBudgetingStatusFin = [
  { value: BudgetingStatus.FINANCE_APPROVED, label: 'Фінанси: Затверджено' },
  {
    value: BudgetingStatus.PENDING_CEO_APPROVAL,
    label: 'На затвердження CEO/COO/CFO',
  },
  { value: BudgetingStatus.FINANCE_DECLINED, label: 'Фінанси: Скасовано' },
  { value: BudgetingStatus.NEEDS_REVISION, label: 'Потребує виправлень' },
];

export const approveBudgetingStatusCEO = [
  { value: BudgetingStatus.CEO_APPROVED, label: 'CEO/COO/CFO: Затверджено' },
  { value: BudgetingStatus.CEO_DECLINED, label: 'CEO/COO/CFO: Скасовано' },
  { value: BudgetingStatus.NEEDS_REVISION, label: 'Потребує виправлень' },
];

export const approveBudgetingStatusHd = [
  { value: BudgetingStatus.PENDING_FINANCE_APPROVAL, label: 'На затвердження Фінанси' },
  { value: BudgetingStatus.LEAD_DECLINED, label: 'Керівник відділу: Скасовано' },
  { value: BudgetingStatus.NEEDS_REVISION, label: 'Потребує виправлень' },
];
