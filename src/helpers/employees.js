export const EMPLOYEE_REQUIRED_MESSAGE =
  "Заповніть обов'язкові поля перед збереженням.";

// Використовується сторінкою "Співробітники" фінансиста (таблиця + дровер
// редагування ставки) для однакового форматування суми в обох місцях.
const CURRENCY_SYMBOLS = { UAH: '₴', USD: '$', EUR: '€' };

export const formatRate = (rate, currency) => {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const formattedNumber = String(rate).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${symbol}${formattedNumber}`;
};

// Використовується в "Зарплатній відомості" — і inline-редагуванням у таблиці,
// і масовим редагуванням — щоб обидва місця клемпили однаково.
export const clampToRange = (value, min, max) => {
  if (value === '') return value;
  const num = Number(value);
  if (Number.isNaN(num)) return value;
  return String(Math.min(max, Math.max(min, num)));
};

// "Налаштовано" — коли призначена ставка, валюта, реквізити та дата, з якої
// ставка діє. Всі чотири мають бути заповнені одночасно.
const CONFIG_FIELD_LABELS = {
  rate: 'Ставка',
  currency: 'Валюта',
  payment_details: 'Реквізити',
  rate_date: 'Дата початку',
};

export const getMissingConfigFields = employee =>
  Object.entries(CONFIG_FIELD_LABELS)
    .filter(([key]) => !employee?.[key])
    .map(([, label]) => label);

export const isEmployeeConfigured = employee =>
  getMissingConfigFields(employee).length === 0;

export const employeeFields = [
  { key: 'unit', label: 'unit' },
  { key: 'department', label: 'Department' },
  { key: 'subdivision', label: 'Subdivision' },
  { key: 'position', label: 'Position' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'accounting_full_name', label: 'ПІБ 1С' },
  { key: 'local_full_name', label: 'ПІБ' },
  { key: 'payment_form', label: 'Форма оплати' },
  { key: 'payment_details', label: 'Реквізити' },
  { key: 'tax_id', label: 'ІПН' },
  { key: 'gender', label: 'Стать' },
  { key: 'work_schedule', label: 'Графік роботи' },
  { key: 'contacts', label: 'Контакти' },
  { key: 'manager', label: 'Керівник' },
  { key: 'hire_date', label: 'Дата прийому' },
  { key: 'termination_date', label: 'Дата звільнення' },
];

export const employeeLookupFieldIds = {
  unit: 'unit_id',
  department: 'department_id',
  subdivision: 'subdivision_id',
  payment_form: 'payment_form_id',
  manager: 'manager_id',
};

export const requiredEmployeeFields = employeeFields
  .filter(field => field.key !== 'termination_date')
  .map(field => employeeLookupFieldIds[field.key] || field.key);

export const genderOptions = [
  { value: 'Ж', label: 'Ж' },
  { value: 'Ч', label: 'Ч' },
];

export const workScheduleOptions = [
  { value: 'Part', label: 'Part' },
  { value: 'Full', label: 'Full' },
];

export const employeeImportAliases = {
  unit: ['unit', 'юніт'],
  department: ['department', 'департамент'],
  subdivision: ['subdivision', 'підрозділ'],
  position: ['position', 'посада'],
  full_name: ['full name', 'fullname'],
  accounting_full_name: ['піб 1с', 'піб1с', '1с'],
  local_full_name: ['піб'],
  payment_form: ['форма оплати'],
  payment_details: ['реквізити'],
  tax_id: ['іпн', 'ipn', 'tax id', 'tax_id'],
  gender: ['стать', 'gender'],
  work_schedule: ['графік роботи', 'графік', 'work schedule', 'work_schedule'],
  contacts: ['контакти', 'contacts'],
  manager: ['керівник', 'manager'],
  hire_date: ['дата прийому', 'hire date', 'hire_date'],
  termination_date: ['дата звільнення', 'termination date', 'termination_date'],
};

export const emptyEmployee = employeeFields.reduce((acc, field) => {
  acc[field.key] = '';
  return acc;
}, {});

Object.values(employeeLookupFieldIds).forEach(field => {
  emptyEmployee[field] = '';
});

export const normalizeEmployeeValue = value =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

export const normalizeComparableValue = value =>
  normalizeEmployeeValue(value).toLowerCase();

export const toEmployeeOptionLabel = value =>
  normalizeEmployeeValue(
    value?.name ?? value?.label ?? value?.title ?? value?.value ?? value
  );

export const buildEmployeeOptions = values => {
  const labels = values.map(toEmployeeOptionLabel).filter(Boolean);
  const uniqueLabels = [...new Set(labels)];

  return uniqueLabels
    .sort((a, b) =>
      a.localeCompare(b, 'uk', { numeric: true, sensitivity: 'base' })
    )
    .map(label => ({
      value: label,
      label,
    }));
};

export const buildEmployeeFieldOptions = (
  employees,
  fieldKey,
  extraValues = []
) =>
  buildEmployeeOptions([
    ...extraValues,
    ...(employees || []).map(employee => employee?.[fieldKey]),
  ]);

export const getEmployeeId = employee =>
  employee?.id ?? employee?.employee_id ?? employee?.profile_id;

export const normalizeEmployee = employee => ({
  ...emptyEmployee,
  ...employee,
  id: getEmployeeId(employee),
  unit_id: employee?.unit_id ?? employee?.unit_details?.id ?? '',
  department_id:
    employee?.department_id ?? employee?.department_details?.id ?? '',
  subdivision_id:
    employee?.subdivision_id ?? employee?.subdivision_details?.id ?? '',
  payment_form_id:
    employee?.payment_form_id ?? employee?.payment_form_details?.id ?? '',
  manager_id: employee?.manager_id ?? employee?.manager_user?.id ?? '',
  tax_id: normalizeEmployeeValue(employee?.tax_id ?? employee?.ipn),
  accounting_full_name: normalizeEmployeeValue(
    employee?.accounting_full_name ?? employee?.pib_1c
  ),
  local_full_name: normalizeEmployeeValue(
    employee?.local_full_name ?? employee?.pib
  ),
  hire_date: normalizeEmployeeValue(employee?.hire_date).slice(0, 10),
  termination_date: normalizeEmployeeValue(employee?.termination_date).slice(
    0,
    10
  ),
});

export const buildEmployeePayload = (data, creationSource = undefined) => {
  const payload = employeeFields.reduce((acc, field) => {
    const lookupIdField = employeeLookupFieldIds[field.key];

    if (lookupIdField) {
      acc[lookupIdField] = data[lookupIdField] || null;
      return acc;
    }

    acc[field.key] = normalizeEmployeeValue(data[field.key]);
    return acc;
  }, {});

  if (!payload.termination_date) {
    payload.termination_date = null;
  }

  if (creationSource) {
    payload.creation_source = creationSource;
  }

  return payload;
};

const hasSharedNamePart = (left, right) => {
  const leftParts = normalizeComparableValue(left)
    .split(' ')
    .filter(part => part.length >= 3);
  const rightValue = normalizeComparableValue(right);

  return leftParts.some(part => rightValue.includes(part));
};

export const findEmployeeDuplicate = (employees, candidate, ignoredId = null) => {
  const payload = buildEmployeePayload(candidate);
  const taxId = normalizeComparableValue(payload.tax_id);
  const accountingName = normalizeComparableValue(payload.accounting_full_name);

  const comparableEmployees = employees
    .map(normalizeEmployee)
    .filter(employee => String(employee.id) !== String(ignoredId ?? ''));

  const fullDuplicate = comparableEmployees.find(employee => {
    return (
      taxId &&
      accountingName &&
      normalizeComparableValue(employee.tax_id) === taxId &&
      normalizeComparableValue(employee.accounting_full_name) === accountingName
    );
  });

  if (fullDuplicate) {
    return { type: 'error', reason: 'full', employee: fullDuplicate };
  }

  const taxDuplicate = comparableEmployees.find(
    employee => taxId && normalizeComparableValue(employee.tax_id) === taxId
  );

  if (taxDuplicate) {
    return { type: 'error', reason: 'tax_id', employee: taxDuplicate };
  }

  const similarName = comparableEmployees.find(employee => {
    return (
      hasSharedNamePart(payload.accounting_full_name, employee.accounting_full_name) ||
      hasSharedNamePart(payload.local_full_name, employee.local_full_name) ||
      hasSharedNamePart(payload.local_full_name, employee.accounting_full_name)
    );
  });

  if (similarName) {
    return { type: 'warning', reason: 'similar_name', employee: similarName };
  }

  return null;
};

export const getEmployeeHistory = employee =>
  employee?.history ?? employee?.profile_history ?? employee?.audit_log ?? [];
