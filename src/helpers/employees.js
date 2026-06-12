export const EMPLOYEE_REQUIRED_MESSAGE =
  "Заповніть обов'язкові поля перед збереженням.";

export const employeeFields = [
  { key: 'unit', label: 'Unit' },
  { key: 'department', label: 'Department' },
  { key: 'subdivision', label: 'Subdivision' },
  { key: 'position', label: 'Position' },
  { key: 'full_name', label: 'Full Name' },
  { key: 'accounting_full_name', label: 'ПІБ 1С' },
  { key: 'local_full_name', label: 'ПІБ' },
  { key: 'payment_form', label: 'Форма оплати' },
  { key: 'payment_details', label: 'Реквізити' },
  { key: 'tax_id', label: 'ІПН' },
  { key: 'contacts', label: 'Контакти' },
  { key: 'manager', label: 'Керівник' },
  { key: 'hire_date', label: 'Дата прийому' },
  { key: 'termination_date', label: 'Дата звільнення' },
];

export const requiredEmployeeFields = [
  'tax_id',
  'accounting_full_name',
  'local_full_name',
  'payment_form',
  'hire_date',
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
  contacts: ['контакти', 'contacts'],
  manager: ['керівник', 'manager'],
  hire_date: ['дата прийому', 'hire date', 'hire_date'],
  termination_date: ['дата звільнення', 'termination date', 'termination_date'],
};

export const emptyEmployee = employeeFields.reduce((acc, field) => {
  acc[field.key] = '';
  return acc;
}, {});

export const normalizeEmployeeValue = value =>
  String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');

export const normalizeComparableValue = value =>
  normalizeEmployeeValue(value).toLowerCase();

export const getEmployeeId = employee =>
  employee?.id ?? employee?.employee_id ?? employee?.profile_id;

export const normalizeEmployee = employee => ({
  ...emptyEmployee,
  ...employee,
  id: getEmployeeId(employee),
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
    acc[field.key] = normalizeEmployeeValue(data[field.key]);
    return acc;
  }, {});

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
