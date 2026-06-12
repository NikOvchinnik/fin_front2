import { Notify } from 'notiflix';
import Form from '../../Form/Form';
import {
  EMPLOYEE_REQUIRED_MESSAGE,
  buildEmployeePayload,
  employeeFields,
  emptyEmployee,
  findEmployeeDuplicate,
  getEmployeeId,
  normalizeEmployee,
  requiredEmployeeFields,
} from '../../../helpers/employees';
import {
  patchEmployee,
  postEmployee,
} from '../../../helpers/axios/employees';
import style from './EmployeeForm.module.css';

const getFieldType = key => {
  if (key === 'tax_id') return 'number';
  if (key === 'hire_date' || key === 'termination_date') return 'date';
  if (key === 'payment_details' || key === 'contacts') return 'textarea';
  return 'text';
};

const EmployeeForm = ({
  closeModal,
  employee = null,
  employees = [],
  onRefresh,
  mode = 'create',
}) => {
  const normalizedEmployee = employee ? normalizeEmployee(employee) : null;
  const employeeId = getEmployeeId(normalizedEmployee);

  const fields = employeeFields.map(field => ({
    type: getFieldType(field.key),
    name: field.key,
    label: field.label,
    rows: field.key === 'contacts' || field.key === 'payment_details' ? 3 : 2,
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
    const duplicate = findEmployeeDuplicate(employees, data, employeeId);

    if (duplicate?.type === 'error') {
      Notify.failure(
        duplicate.reason === 'tax_id'
          ? 'Співробітник з таким ІПН вже існує.'
          : 'Співробітник з таким ІПН і ПІБ 1С вже існує.'
      );
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
      if (error?.response?.status === 409) {
        Notify.failure('Співробітник з такими даними вже існує.');
      } else {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      }
    }
  };

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
      />
    </div>
  );
};

export default EmployeeForm;

