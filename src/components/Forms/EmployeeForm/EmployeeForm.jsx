import { useEffect, useMemo, useState } from 'react';
import { Notify } from 'notiflix';
import Form from '../../Form/Form';
import {
  EMPLOYEE_REQUIRED_MESSAGE,
  buildEmployeePayload,
  employeeFields,
  employeeLookupFieldIds,
  emptyEmployee,
  findEmployeeDuplicate,
  genderOptions,
  getEmployeeId,
  normalizeEmployee,
  toEmployeeOptionLabel,
  requiredEmployeeFields,
  workScheduleOptions,
} from '../../../helpers/employees';
import {
  getEmployeeLookups,
  patchEmployee,
  postEmployee,
} from '../../../helpers/axios/employees';
import style from './EmployeeForm.module.css';

const lookupOptionKeys = {
  unit: 'units',
  department: 'departments',
  subdivision: 'subdivisions',
  payment_form: 'payment_forms',
  manager: 'managers',
};

const fixedSelectOptions = {
  gender: genderOptions,
  work_schedule: workScheduleOptions,
};

const getFieldType = key => {
  if (employeeLookupFieldIds[key]) return 'autocomplete-select';
  if (fixedSelectOptions[key]) return 'select';
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
    subdivisions: [],
    payment_forms: [],
    managers: [],
  });
  const normalizedEmployee = useMemo(
    () => (employee ? normalizeEmployee(employee) : null),
    [employee]
  );
  const employeeId = getEmployeeId(normalizedEmployee);

  useEffect(() => {
    const fetchDictionaries = async () => {
      const result = await getEmployeeLookups();

      setDictionaryValues({
        units: extractLookupOptions(result?.units),
        departments: extractLookupOptions(result?.departments),
        subdivisions: extractLookupOptions(result?.subdivisions),
        payment_forms: extractLookupOptions(result?.payment_forms),
        managers: extractLookupOptions(result?.managers),
      });
    };

    fetchDictionaries().catch(() => {
      Notify.failure('Не вдалося завантажити довідники співробітника.');
    });
  }, []);

  const optionsByField = useMemo(() => {
    return Object.entries(lookupOptionKeys).reduce((acc, [field, key]) => {
      acc[field] = dictionaryValues[key] || [];
      return acc;
    }, {});
  }, [dictionaryValues]);

  const fields = employeeFields.map(field => {
    const name = employeeLookupFieldIds[field.key] || field.key;

    return {
      type: getFieldType(field.key),
      name,
      label: field.label,
      options: optionsByField[field.key] || fixedSelectOptions[field.key] || [],
      rows: field.key === 'contacts' || field.key === 'payment_details' ? 3 : 2,
      containerClassName:
        field.key === 'contacts' || field.key === 'payment_details'
          ? 'fullWidth'
          : undefined,
      validation: requiredEmployeeFields.includes(name)
        ? { required: EMPLOYEE_REQUIRED_MESSAGE }
        : undefined,
    };
  });

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

const extractLookupOptions = items => {
  if (!Array.isArray(items)) return [];

  return items
    .map(item => {
      const label =
        item?.label ??
        item?.name ??
        toEmployeeOptionLabel(item);

      if (!label || item?.id === undefined || item?.id === null) return null;

      return {
        value: item.id,
        label,
      };
    })
    .filter(Boolean);
};

export default EmployeeForm;
