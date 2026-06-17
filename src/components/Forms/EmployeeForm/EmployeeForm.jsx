import { useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import Form from '../../Form/Form';
import {
  EMPLOYEE_REQUIRED_MESSAGE,
  buildEmployeeFieldOptions,
  buildEmployeePayload,
  employeeFields,
  emptyEmployee,
  findEmployeeDuplicate,
  getEmployeeId,
  normalizeEmployee,
  toEmployeeOptionLabel,
  requiredEmployeeFields,
} from '../../../helpers/employees';
import {
  patchEmployee,
  postEmployee,
} from '../../../helpers/axios/employees';
import { getDepartments } from '../../../helpers/axios/departments';
import { getPaymentForms } from '../../../helpers/axios/payments';
import { getUnits } from '../../../helpers/axios/units';
import style from './EmployeeForm.module.css';

const autocompleteFields = [
  'unit',
  'department',
  'subdivision',
  'position',
  'payment_form',
  'manager',
];

const getFieldType = key => {
  if (autocompleteFields.includes(key)) return 'autocomplete-input';
  if (key === 'tax_id') return 'number';
  if (key === 'hire_date' || key === 'termination_date') return 'date';
  if (key === 'payment_details' || key === 'contacts') return 'textarea';
  return 'text';
};

const fieldLabels = employeeFields.reduce((acc, field) => {
  acc[field.key] = field.label;
  return acc;
}, {});

const normalizeBackendErrorMessage = (message, fieldKey) => {
  const text = String(message ?? '').trim();
  const label = fieldLabels[fieldKey] || fieldKey;

  if (!text) return `${label}: помилка валідації.`;
  if (/required/i.test(text)) return `${label}: обов'язкове поле.`;

  return `${label}: ${text}`;
};

const getEmployeeErrorDetails = error => {
  const responseData = error?.response?.data ?? {};
  const details = [];

  if (responseData.errors && typeof responseData.errors === 'object') {
    Object.entries(responseData.errors).forEach(([fieldKey, value]) => {
      if (Array.isArray(value)) {
        value.forEach(item =>
          details.push(normalizeBackendErrorMessage(item, fieldKey))
        );
        return;
      }

      details.push(normalizeBackendErrorMessage(value, fieldKey));
    });
  }

  if (details.length > 0) return [...new Set(details)];

  if (responseData.message) return [responseData.message];
  if (responseData.error) return [responseData.error];

  return ['Сталася помилка, спробуйте ще раз.'];
};

const EmployeeForm = ({
  closeModal,
  employee = null,
  employees = [],
  onRefresh,
  mode = 'create',
}) => {
  const [submitErrors, setSubmitErrors] = useState([]);
  const [dictionaryValues, setDictionaryValues] = useState({
    units: [],
    departments: [],
    paymentForms: [],
  });
  const normalizedEmployee = useMemo(
    () => (employee ? normalizeEmployee(employee) : null),
    [employee]
  );
  const employeeId = getEmployeeId(normalizedEmployee);

  useEffect(() => {
    const fetchDictionaries = async () => {
      const [unitsResult, departmentsResult, paymentFormsResult] =
        await Promise.allSettled([
          getUnits(),
          getDepartments(),
          getPaymentForms(),
        ]);

      setDictionaryValues({
        units:
          unitsResult.status === 'fulfilled'
            ? extractList(unitsResult.value)
            : [],
        departments:
          departmentsResult.status === 'fulfilled'
            ? extractList(departmentsResult.value)
            : [],
        paymentForms:
          paymentFormsResult.status === 'fulfilled'
            ? extractList(paymentFormsResult.value)
            : [],
      });
    };

    fetchDictionaries();
  }, []);

  const optionsByField = useMemo(() => {
    const currentValues = key =>
      normalizedEmployee?.[key] ? [normalizedEmployee[key]] : [];
    const employeeNameValues = employees.flatMap(item => {
      const normalized = normalizeEmployee(item);

      return [
        normalized.local_full_name,
        normalized.accounting_full_name,
        normalized.full_name,
      ];
    });

    return {
      unit: buildEmployeeFieldOptions(employees, 'unit', [
        ...dictionaryValues.units,
        ...currentValues('unit'),
      ]),
      department: buildEmployeeFieldOptions(employees, 'department', [
        ...dictionaryValues.departments,
        ...currentValues('department'),
      ]),
      subdivision: buildEmployeeFieldOptions(
        employees,
        'subdivision',
        currentValues('subdivision')
      ),
      position: buildEmployeeFieldOptions(
        employees,
        'position',
        currentValues('position')
      ),
      payment_form: buildEmployeeFieldOptions(employees, 'payment_form', [
        ...dictionaryValues.paymentForms,
        ...currentValues('payment_form'),
      ]),
      manager: buildEmployeeFieldOptions(employees, 'manager', [
        ...employeeNameValues,
        ...currentValues('manager'),
      ]),
    };
  }, [dictionaryValues, employees, normalizedEmployee]);

  const fields = employeeFields.map(field => ({
    type: getFieldType(field.key),
    name: field.key,
    label: field.label,
    options: optionsByField[field.key] || [],
    rows: field.key === 'contacts' || field.key === 'payment_details' ? 3 : 2,
    containerClassName:
      field.key === 'contacts' || field.key === 'payment_details'
        ? 'fullWidth'
        : undefined,
    validation: requiredEmployeeFields.includes(field.key)
      ? { required: EMPLOYEE_REQUIRED_MESSAGE }
      : undefined,
  }));

  const buttons = [
    {
      label: 'Зберегти',
      className: 'submitBtn',
      type: 'submit',
    },
  ];

  const handleSubmit = async data => {
    setSubmitErrors([]);
    const duplicate = findEmployeeDuplicate(employees, data, employeeId);

    if (duplicate?.type === 'error') {
      const message =
        duplicate.reason === 'tax_id'
          ? 'Співробітник з таким ІПН вже існує.'
          : 'Співробітник з таким ІПН і ПІБ 1С вже існує.';

      setSubmitErrors([message]);
      Notify.failure(message);
      return;
    }

    if (duplicate?.type === 'warning') {
      Notify.warning('Знайдено схоже ПІБ. Перевірте картку перед збереженням.');
    }

    try {
      const payload = buildEmployeePayload(
        data,
        mode === 'create' ? 'manual' : undefined
      );

      if (mode === 'edit') {
        await patchEmployee(employeeId, payload);
        Notify.success('Картку співробітника оновлено.');
      } else {
        await postEmployee(payload);
        Notify.success('Співробітника створено.');
      }

      await onRefresh();
      closeModal();
    } catch (error) {
      const details = getEmployeeErrorDetails(error);
      setSubmitErrors(details);

      if (error?.response?.status === 409) {
        Notify.failure('Співробітник з такими даними вже існує.');
      } else {
        Notify.failure('Перевірте помилки у формі.');
      }
    }
  };

  const formError =
    submitErrors.length > 0 ? (
      <div className={style.errorBlock} role="alert">
        <p className={style.errorTitle}>Не вдалося зберегти співробітника</p>
        <ul className={style.errorList}>
          {submitErrors.map(error => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      </div>
    ) : null;

  return (
    <div className={style.container}>
      <Form
        title={
          mode === 'edit'
            ? 'Редагування картки співробітника'
            : 'Додати співробітника'
        }
        fields={fields}
        buttons={buttons}
        onSubmit={handleSubmit}
        onInvalid={() => Notify.failure(EMPLOYEE_REQUIRED_MESSAGE)}
        defaultValues={normalizedEmployee ?? emptyEmployee}
        styleForm="employeeFormContainer"
        formError={formError}
      />
    </div>
  );
};

const extractList = response => {
  if (Array.isArray(response)) return response.map(toEmployeeOptionLabel);
  if (!response || typeof response !== 'object') return [];

  const list = Object.values(response).find(Array.isArray);

  return Array.isArray(list) ? list.map(toEmployeeOptionLabel) : [];
};

export default EmployeeForm;
