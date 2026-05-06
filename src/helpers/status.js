import { FinancialRequestStatus } from './enums';

export const FILTER_ALL = 'all';
export const FILTER_DELETED = 'deleted';

export const FinancialStatusFilter = Object.freeze({
  ALL: FILTER_ALL,
  DRAFT: 'draft',
  PENDING_APPROVAL: 'pending_approval',
  SENT_TO_PAYMENT: 'sent_to_payment',
  PAID: 'paid',
  AWAITING_DOCUMENTS: 'awaiting_documents',
  NEEDS_REVISION: 'needs_revision',
  CANCELED: 'canceled',
  DELETED: FILTER_DELETED,
});

export const getStatusStyle = status => {
  const statusId =
    typeof status === 'object' ? Number(status?.id ?? status?.status_id) : Number(status);
  const statusName = typeof status === 'object' ? status?.name : status;

  switch (statusId || statusName) {
    case FinancialRequestStatus.DRAFT:
    case 'Чернетка':
      return { color: '#c74736' };
    case FinancialRequestStatus.PENDING_APPROVAL:
    case 'Очікує затвердження':
      return { color: '#c79a1b' };
    case FinancialRequestStatus.SENT_TO_PAYMENT:
    case 'Передано на оплату':
      return { color: '#378a9e' };
    case FinancialRequestStatus.FINANCE_PAID:
    case FinancialRequestStatus.ACCOUNTANT_PAID:
    case 'Фінанси: Сплачено':
    case 'Бухгалтер: Сплачено':
      return { color: '#6b9429' };
    case FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS:
    case FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS:
    case 'Фінанси: Сплачено, очікуються документи':
    case 'Бухгалтер: Сплачено, очікуються документи':
      return { color: '#6b9429' };
    case FinancialRequestStatus.NEEDS_REVISION:
    case 'Потребує виправлень':
    case FinancialRequestStatus.FINANCE_CANCELED:
    case FinancialRequestStatus.ACCOUNTANT_CANCELED:
    case 'Фінанси: Скасовано':
    case 'Бухгалтер: Скасовано':
      return { color: '#c74736' };
    default:
      return { color: '#6c757d' };
  }
};

export const statusSelectorFin = [
  { value: FinancialStatusFilter.ALL, label: 'Всі', labelKey: 'filters.all' },
  {
    value: FinancialStatusFilter.PENDING_APPROVAL,
    label: 'Очікує затвердження',
    labelKey: 'financialStatus.pendingApproval',
  },
  {
    value: FinancialStatusFilter.SENT_TO_PAYMENT,
    label: 'Передано на оплату',
    labelKey: 'financialStatus.sentToPayment',
  },
  {
    value: FinancialStatusFilter.PAID,
    label: 'Сплачено',
    labelKey: 'financialStatus.paid',
  },
  {
    value: FinancialStatusFilter.AWAITING_DOCUMENTS,
    label: 'Очікуються документи',
    labelKey: 'financialStatus.awaitingDocuments',
  },
  {
    value: FinancialStatusFilter.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  {
    value: FinancialStatusFilter.CANCELED,
    label: 'Скасовано',
    labelKey: 'financialStatus.canceled',
  },
  {
    value: FinancialStatusFilter.DELETED,
    label: 'Видалені',
    labelKey: 'filters.deleted',
  },
];

export const statusSelectorBuh = [
  { value: FinancialStatusFilter.ALL, label: 'Всі', labelKey: 'filters.all' },
  {
    value: FinancialStatusFilter.SENT_TO_PAYMENT,
    label: 'Передано на оплату',
    labelKey: 'financialStatus.sentToPayment',
  },
  {
    value: FinancialStatusFilter.PAID,
    label: 'Сплачено',
    labelKey: 'financialStatus.paid',
  },
  {
    value: FinancialStatusFilter.AWAITING_DOCUMENTS,
    label: 'Очікуються документи',
    labelKey: 'financialStatus.awaitingDocuments',
  },
  {
    value: FinancialStatusFilter.CANCELED,
    label: 'Скасовано',
    labelKey: 'financialStatus.canceled',
  },
  {
    value: FinancialStatusFilter.DELETED,
    label: 'Видалені',
    labelKey: 'filters.deleted',
  },
];

export const statusSelectorUser = [
  { value: FinancialStatusFilter.ALL, label: 'Всі', labelKey: 'filters.all' },
  {
    value: FinancialStatusFilter.DRAFT,
    label: 'Чернетка',
    labelKey: 'financialStatus.draft',
  },
  {
    value: FinancialStatusFilter.PENDING_APPROVAL,
    label: 'Очікує затвердження',
    labelKey: 'financialStatus.pendingApproval',
  },
  {
    value: FinancialStatusFilter.SENT_TO_PAYMENT,
    label: 'Передано на оплату',
    labelKey: 'financialStatus.sentToPayment',
  },
  {
    value: FinancialStatusFilter.PAID,
    label: 'Сплачено',
    labelKey: 'financialStatus.paid',
  },
  {
    value: FinancialStatusFilter.AWAITING_DOCUMENTS,
    label: 'Очікуються документи',
    labelKey: 'financialStatus.awaitingDocuments',
  },
  {
    value: FinancialStatusFilter.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  {
    value: FinancialStatusFilter.CANCELED,
    label: 'Скасовано',
    labelKey: 'financialStatus.canceled',
  },
  {
    value: FinancialStatusFilter.DELETED,
    label: 'Видалені',
    labelKey: 'filters.deleted',
  },
];

export const approveStatus = [
  {
    value: FinancialRequestStatus.DRAFT,
    label: 'Чернетка',
    labelKey: 'financialStatus.draft',
  },
  {
    value: FinancialRequestStatus.PENDING_APPROVAL,
    label: 'Очікує затвердження',
    labelKey: 'financialStatus.pendingApproval',
  },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  {
    value: FinancialRequestStatus.SENT_TO_PAYMENT,
    label: 'Передано на оплату',
    labelKey: 'financialStatus.sentToPayment',
  },
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID,
    label: 'Бухгалтер: Сплачено',
    labelKey: 'financialStatus.accountantPaid',
  },
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Бухгалтер: Сплачено, очікуються документи',
    labelKey: 'financialStatus.accountantPaidAwaitingDocuments',
  },
  {
    value: FinancialRequestStatus.FINANCE_CANCELED,
    label: 'Фінанси: Скасовано',
    labelKey: 'financialStatus.financeCanceled',
  },
  {
    value: FinancialRequestStatus.ACCOUNTANT_CANCELED,
    label: 'Бухгалтер: Скасовано',
    labelKey: 'financialStatus.accountantCanceled',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID,
    label: 'Фінанси: Сплачено',
    labelKey: 'financialStatus.financePaid',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Фінанси: Сплачено, очікуються документи',
    labelKey: 'financialStatus.financePaidAwaitingDocuments',
  },
];

export const approveFilesFin = [
  {
    value: FinancialRequestStatus.FINANCE_PAID,
    label: 'Всі документи додано',
    labelKey: 'financialStatus.allDocumentsAdded',
  }, //Фінанси: Сплачено
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Очікуються ще документи',
    labelKey: 'financialStatus.awaitingMoreDocuments',
  }, //Фінанси: Сплачено, очікуються документи
];

export const approveFilesBuh = [
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID,
    label: 'Всі документи додано',
    labelKey: 'financialStatus.allDocumentsAdded',
  }, //Бухгалтер: Сплачено
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Очікуються ще документи',
    labelKey: 'financialStatus.awaitingMoreDocuments',
  }, //Бухгалтер: Сплачено, очікуються документи
];

export const approveStatusFin = [
  {
    value: FinancialRequestStatus.SENT_TO_PAYMENT,
    label: 'Передано на оплату',
    labelKey: 'financialStatus.sentToPayment',
  },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID,
    label: 'Фінанси: Сплачено',
    labelKey: 'financialStatus.financePaid',
  },
  {
    value: FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS,
    label: 'Фінанси: Сплачено, очікуються документи',
    labelKey: 'financialStatus.financePaidAwaitingDocuments',
  },
  {
    value: FinancialRequestStatus.FINANCE_CANCELED,
    label: 'Фінанси: Скасовано',
    labelKey: 'financialStatus.financeCanceled',
  },
];

export const approveStatusBuh = [
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID,
    label: 'Бухгалтер: Сплачено',
    labelKey: 'financialStatus.accountantPaid',
  },
  {
    value: FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS,
    label: 'Бухгалтер: Сплачено, очікуються документи',
    labelKey: 'financialStatus.accountantPaidAwaitingDocuments',
  },
  {
    value: FinancialRequestStatus.NEEDS_REVISION,
    label: 'Потребує виправлень',
    labelKey: 'financialStatus.needsRevision',
  },
  {
    value: FinancialRequestStatus.ACCOUNTANT_CANCELED,
    label: 'Бухгалтер: Скасовано',
    labelKey: 'financialStatus.accountantCanceled',
  },
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

export const getActiveStatus = (statusIdOrName, statusName) => {
  if (!statusIdOrName && !statusName) return '';

  const statusId = Number(statusIdOrName);

  switch (statusId) {
    case FinancialRequestStatus.DRAFT:
      return FinancialStatusFilter.DRAFT;
    case FinancialRequestStatus.PENDING_APPROVAL:
      return FinancialStatusFilter.PENDING_APPROVAL;
    case FinancialRequestStatus.SENT_TO_PAYMENT:
      return FinancialStatusFilter.SENT_TO_PAYMENT;
    case FinancialRequestStatus.FINANCE_PAID:
    case FinancialRequestStatus.ACCOUNTANT_PAID:
      return FinancialStatusFilter.PAID;
    case FinancialRequestStatus.FINANCE_PAID_AWAITING_DOCUMENTS:
    case FinancialRequestStatus.ACCOUNTANT_PAID_AWAITING_DOCUMENTS:
      return FinancialStatusFilter.AWAITING_DOCUMENTS;
    case FinancialRequestStatus.NEEDS_REVISION:
      return FinancialStatusFilter.NEEDS_REVISION;
    case FinancialRequestStatus.FINANCE_CANCELED:
    case FinancialRequestStatus.ACCOUNTANT_CANCELED:
      return FinancialStatusFilter.CANCELED;
    default:
      break;
  }

  const fallbackStatusName = statusName || statusIdOrName;

  const paidStatuses = ['Фінанси: Сплачено', 'Бухгалтер: Сплачено'];

  const awaitStatuses = [
    'Фінанси: Сплачено, очікуються документи',
    'Бухгалтер: Сплачено, очікуються документи',
  ];

  const canceledStatuses = ['Фінанси: Скасовано', 'Бухгалтер: Скасовано'];

  if (paidStatuses.includes(fallbackStatusName)) {
    return FinancialStatusFilter.PAID;
  }

  if (awaitStatuses.includes(fallbackStatusName)) {
    return FinancialStatusFilter.AWAITING_DOCUMENTS;
  }

  if (canceledStatuses.includes(fallbackStatusName)) {
    return FinancialStatusFilter.CANCELED;
  }

  if (fallbackStatusName === 'Чернетка') {
    return FinancialStatusFilter.DRAFT;
  }

  if (fallbackStatusName === 'Очікує затвердження') {
    return FinancialStatusFilter.PENDING_APPROVAL;
  }

  if (fallbackStatusName === 'Передано на оплату') {
    return FinancialStatusFilter.SENT_TO_PAYMENT;
  }

  if (fallbackStatusName === 'Потребує виправлень') {
    return FinancialStatusFilter.NEEDS_REVISION;
  }

  return fallbackStatusName;
};
