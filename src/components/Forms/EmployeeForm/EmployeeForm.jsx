import { useEffect, useState } from 'react';
import { Notify } from 'notiflix';
import Icon from '../../Icon/Icon';
import Form from '../../Form/Form';
import {
  EMPLOYEE_REQUIRED_MESSAGE,
  MAX_ASSIGNMENTS_PER_EMPLOYEE,
  buildAssignmentPayload,
  buildEmployeePayload,
  emptyAssignment,
  findEmployeeDuplicate,
  genderOptions,
  getEmployeeId,
  normalizeAssignment,
  normalizeEmployee,
  workScheduleOptions,
} from '../../../helpers/employees';
import {
  deleteEmployeeAssignment,
  getEmployeeLookups,
  patchEmployee,
  patchEmployeeAssignment,
  postEmployee,
  postEmployeeAssignment,
} from '../../../helpers/axios/employees';
import style from './EmployeeForm.module.css';

// "Особисті дані" — заповнюються один раз на людину, незалежно від того,
// скільки в неї призначень (керівників).
const PERSON_FIELD_DEFS = [
  { key: 'full_name', label: 'Full Name', type: 'text' },
  { key: 'accounting_full_name', label: 'ПІБ 1С', type: 'text', required: true },
  { key: 'local_full_name', label: 'ПІБ', type: 'text', required: true },
  {
    key: 'payment_form_id',
    label: 'Форма оплати',
    type: 'select',
    optionsKey: 'payment_forms',
    required: true,
    searchable: true,
  },
  { key: 'payment_details', label: 'Реквізити', type: 'textarea' },
  { key: 'tax_id', label: 'ІПН', type: 'text' },
  { key: 'gender', label: 'Стать', type: 'select', options: genderOptions },
  { key: 'contacts', label: 'Контакти', type: 'textarea' },
];

// "Призначення" — окремий блок на кожного керівника: де саме людина працює
// під ним і з якої дати.
const ASSIGNMENT_FIELD_DEFS = [
  {
    key: 'manager_id',
    label: 'Керівник',
    type: 'select',
    optionsKey: 'managers',
    required: true,
    searchable: true,
  },
  {
    key: 'unit_id',
    label: 'Unit',
    type: 'select',
    optionsKey: 'units',
    searchable: true,
  },
  {
    key: 'department_id',
    label: 'Department',
    type: 'select',
    optionsKey: 'departments',
    searchable: true,
  },
  {
    key: 'subdivision_id',
    label: 'Subdivision',
    type: 'select',
    optionsKey: 'subdivisions',
    searchable: true,
  },
  { key: 'position', label: 'Position', type: 'text' },
  {
    key: 'work_schedule',
    label: 'Графік роботи',
    type: 'select',
    options: workScheduleOptions,
  },
  { key: 'hire_date', label: 'Дата прийому', type: 'date', required: true },
  { key: 'termination_date', label: 'Дата звільнення', type: 'date' },
];

const emptyPersonValues = {
  full_name: '',
  accounting_full_name: '',
  local_full_name: '',
  payment_form_id: '',
  payment_details: '',
  tax_id: '',
  gender: '',
  contacts: '',
};

const buildPersonValues = employee => {
  if (!employee) return { ...emptyPersonValues };
  const normalized = normalizeEmployee(employee);
  return {
    full_name: normalized.full_name || '',
    accounting_full_name: normalized.accounting_full_name || '',
    local_full_name: normalized.local_full_name || '',
    payment_form_id: normalized.payment_form_id || '',
    payment_details: normalized.payment_details || '',
    tax_id: normalized.tax_id || '',
    gender: normalized.gender || '',
    contacts: normalized.contacts || '',
  };
};

// Стабільний React key для блоку призначення — id, якщо він уже збережений
// на бекенді, інакше локальний одноразовий ключ. Без цього видалення НЕ
// останнього блоку зсуває решту по індексу, і React переносить стан
// (обране значення в селектах) на чужий блок замість того, щоб прибрати
// потрібний.
let nextLocalAssignmentKey = 0;
const createLocalAssignmentKey = () => `local-${++nextLocalAssignmentKey}`;

const buildAssignmentBlocks = employee => {
  const assignments = employee?.assignments;
  if (Array.isArray(assignments) && assignments.length > 0) {
    return assignments.map(item => ({
      ...normalizeAssignment(item),
      __clientKey: `assignment-${item.id}`,
    }));
  }
  return [{ ...normalizeAssignment(null), __clientKey: createLocalAssignmentKey() }];
};

const extractLookupOptions = items => {
  if (!Array.isArray(items)) return [];
  return items
    .map(item => {
      const label = item?.label ?? item?.name;
      if (!label || item?.id === undefined || item?.id === null) return null;
      return { value: item.id, label };
    })
    .filter(Boolean);
};

const getApiErrorMessage = error => {
  const responseData = error?.response?.data ?? {};
  if (responseData.errors && typeof responseData.errors === 'object') {
    const messages = Object.entries(responseData.errors).map(
      ([field, message]) => `${field}: ${message}`
    );
    if (messages.length > 0) return messages;
  }
  if (responseData.message) return [responseData.message];
  return ['Сталася помилка, спробуйте ще раз.'];
};

const EmployeeForm = ({
  closeModal,
  employee = null,
  employees = [],
  onRefresh,
  mode = 'create',
}) => {
  const employeeId = getEmployeeId(employee);
  const [submitErrors, setSubmitErrors] = useState([]);
  const [dictionaryValues, setDictionaryValues] = useState({
    units: [],
    departments: [],
    subdivisions: [],
    payment_forms: [],
    managers: [],
  });
  const [personValues, setPersonValues] = useState(() => buildPersonValues(employee));
  const [assignmentBlocks, setAssignmentBlocks] = useState(() =>
    buildAssignmentBlocks(employee)
  );
  const [initialAssignmentIds] = useState(() =>
    new Set(buildAssignmentBlocks(employee).map(item => item.id).filter(Boolean))
  );
  // Якщо створення нового співробітника впирається в уже наявну людину
  // (збіг по ІПН) — пропонуємо додати призначення їй замість блокування.
  const [duplicateEmployee, setDuplicateEmployee] = useState(null);
  const [addingToExisting, setAddingToExisting] = useState(false);
  const [saving, setSaving] = useState(false);

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

  const handlePersonChange = (key, value) => {
    setPersonValues(prev => ({ ...prev, [key]: value }));
  };

  const handleAssignmentChange = (index, key, value) => {
    setAssignmentBlocks(prev =>
      prev.map((block, i) => (i === index ? { ...block, [key]: value } : block))
    );
  };

  const handleAddAssignment = () => {
    if (assignmentBlocks.length >= MAX_ASSIGNMENTS_PER_EMPLOYEE) return;
    setAssignmentBlocks(prev => [
      ...prev,
      { ...emptyAssignment, __clientKey: createLocalAssignmentKey() },
    ]);
  };

  const handleRemoveAssignment = index => {
    setAssignmentBlocks(prev => prev.filter((_, i) => i !== index));
  };

  const handleCancelAddToExisting = () => {
    setDuplicateEmployee(null);
    setAddingToExisting(false);
    setSubmitErrors([]);
  };

  const handleConfirmAddToExisting = () => {
    setAddingToExisting(true);
    setSubmitErrors([]);
  };

  const validate = () => {
    const errors = [];

    if (!addingToExisting) {
      PERSON_FIELD_DEFS.forEach(field => {
        if (field.required && !String(personValues[field.key] || '').trim()) {
          errors.push(`${field.label}: обов'язкове поле.`);
        }
      });
    }

    assignmentBlocks.forEach((block, index) => {
      ASSIGNMENT_FIELD_DEFS.forEach(field => {
        if (field.required && !String(block[field.key] || '').trim()) {
          errors.push(`Призначення ${index + 1} — ${field.label}: обов'язкове поле.`);
        }
      });
    });

    return errors;
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setSubmitErrors([]);

    const validationErrors = validate();
    if (validationErrors.length > 0) {
      setSubmitErrors(validationErrors);
      Notify.failure(EMPLOYEE_REQUIRED_MESSAGE);
      return;
    }

    if (!addingToExisting && mode !== 'edit') {
      const duplicate = findEmployeeDuplicate(employees, personValues, employeeId);
      if (duplicate?.type === 'error' && duplicate.reason === 'tax_id') {
        setSubmitErrors(['Співробітник з таким ІПН вже існує.']);
        Notify.failure('Перевірте помилки у формі.');
        return;
      }
      if (duplicate?.type === 'warning') {
        Notify.warning('Знайдено схоже ПІБ. Перевірте картку перед збереженням.');
      }
    }

    setSaving(true);
    try {
      if (mode === 'edit') {
        await patchEmployee(employeeId, buildEmployeePayload(personValues));
        for (const block of assignmentBlocks) {
          const payload = buildAssignmentPayload(block);
          if (block.id) {
            await patchEmployeeAssignment(employeeId, block.id, payload);
          } else {
            await postEmployeeAssignment(employeeId, payload);
          }
        }
        for (const removedId of initialAssignmentIds) {
          if (!assignmentBlocks.some(block => block.id === removedId)) {
            await deleteEmployeeAssignment(employeeId, removedId);
          }
        }
        Notify.success('Картку співробітника оновлено.');
      } else if (addingToExisting && duplicateEmployee) {
        for (const block of assignmentBlocks) {
          await postEmployeeAssignment(
            duplicateEmployee.id,
            buildAssignmentPayload(block)
          );
        }
        Notify.success('Призначення додано наявному співробітнику.');
      } else {
        const payload = {
          ...buildEmployeePayload(personValues, 'manual'),
          assignments: assignmentBlocks.map(buildAssignmentPayload),
        };
        await postEmployee(payload);
        Notify.success('Співробітника створено.');
      }

      await onRefresh();
      closeModal();
    } catch (error) {
      if (error?.response?.status === 409 && !addingToExisting && mode !== 'edit') {
        const duplicate = error.response.data?.duplicate;
        if (duplicate?.type === 'full_duplicate' && duplicate.employee) {
          setDuplicateEmployee(duplicate.employee);
          setSubmitErrors([
            `Співробітник з таким ІПН і ПІБ 1С вже існує (${duplicate.employee.accounting_full_name}).`,
          ]);
        } else {
          setSubmitErrors(['Співробітник з такими даними вже існує.']);
        }
      } else {
        setSubmitErrors(getApiErrorMessage(error));
      }
      Notify.failure('Перевірте помилки у формі.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (fieldDef, value, onChange, disabled = false) => {
    const options = fieldDef.optionsKey
      ? dictionaryValues[fieldDef.optionsKey] || []
      : fieldDef.options || [];

    if (fieldDef.type === 'select') {
      // Той самий Form-компонент (MUI, notched outline), що й у фільтрах
      // Unit/Department/Subdivision над таблицями — щоб вигляд повністю
      // збігався, а не імітувався нативним <select>.
      return (
        <div key={fieldDef.key} className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: fieldDef.searchable ? 'autocomplete-select' : 'select',
                name: fieldDef.key,
                label: `${fieldDef.label}${fieldDef.required ? ' *' : ''}`,
                options,
                readOnly: disabled,
                onChange: onChange,
              },
            ]}
            defaultValues={{ [fieldDef.key]: value ?? '' }}
          />
        </div>
      );
    }

    return (
      <label key={fieldDef.key} className={style.field}>
        <span className={style.fieldLabel}>
          {fieldDef.label}
          {fieldDef.required && ' *'}
        </span>
        {fieldDef.type === 'textarea' ? (
          <textarea
            className={style.fieldTextarea}
            value={value ?? ''}
            disabled={disabled}
            rows={2}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <input
            type={fieldDef.type === 'date' ? 'date' : 'text'}
            className={style.fieldInput}
            value={value ?? ''}
            disabled={disabled}
            onChange={e => onChange(e.target.value)}
          />
        )}
      </label>
    );
  };

  if (duplicateEmployee && !addingToExisting) {
    return (
      <div className={style.container}>
        <h3 className={style.title}>Такий співробітник вже є</h3>
        <p className={style.duplicateText}>
          Співробітник <strong>{duplicateEmployee.accounting_full_name}</strong> з
          таким ІПН вже існує в системі. Додати йому ще одне призначення
          (керівника/юніт/посаду) замість створення нового запису?
        </p>
        <div className={style.actions}>
          <button
            type="button"
            className={style.submitBtn}
            onClick={handleConfirmAddToExisting}
          >
            Додати призначення
          </button>
          <button
            type="button"
            className={style.cancelLinkBtn}
            onClick={handleCancelAddToExisting}
          >
            Скасувати
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={style.container}>
      <h3 className={style.title}>
        {mode === 'edit'
          ? 'Редагування картки співробітника'
          : addingToExisting
          ? `Нове призначення: ${duplicateEmployee?.accounting_full_name || ''}`
          : 'Додати співробітника'}
      </h3>

      {submitErrors.length > 0 && (
        <div className={style.errorBlock} role="alert">
          <p className={style.errorTitle}>Не вдалося зберегти співробітника</p>
          <ul className={style.errorList}>
            {submitErrors.map(error => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className={style.form}>
        {!addingToExisting && (
          <>
            <h4 className={style.sectionTitle}>Особисті дані</h4>
            <div className={style.fieldsGrid}>
              {PERSON_FIELD_DEFS.map(fieldDef =>
                renderField(fieldDef, personValues[fieldDef.key], value =>
                  handlePersonChange(fieldDef.key, value)
                )
              )}
            </div>
          </>
        )}

        <h4 className={style.sectionTitle}>Призначення</h4>
        {assignmentBlocks.map((block, index) => (
          <div key={block.__clientKey} className={style.assignmentBlock}>
            <div className={style.assignmentBlockHeader}>
              <span className={style.assignmentBlockTitle}>
                Призначення {index + 1}
              </span>
              {assignmentBlocks.length > 1 && !block.id && (
                <button
                  type="button"
                  className={style.removeAssignmentBtn}
                  onClick={() => handleRemoveAssignment(index)}
                >
                  <Icon id="close" className={style.removeAssignmentIcon} />
                </button>
              )}
            </div>
            <div className={style.fieldsGrid}>
              {ASSIGNMENT_FIELD_DEFS.map(fieldDef =>
                renderField(fieldDef, block[fieldDef.key], value =>
                  handleAssignmentChange(index, fieldDef.key, value)
                )
              )}
            </div>
          </div>
        ))}

        {assignmentBlocks.length < MAX_ASSIGNMENTS_PER_EMPLOYEE && (
          <button
            type="button"
            className={style.addAssignmentBtn}
            onClick={handleAddAssignment}
          >
            + Додати ще одне призначення
          </button>
        )}

        <div className={style.actions}>
          <button type="submit" className={style.submitBtn} disabled={saving}>
            {saving ? 'Зберігаю...' : 'Зберегти'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
