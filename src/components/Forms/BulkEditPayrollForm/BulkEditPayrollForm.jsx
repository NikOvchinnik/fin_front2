import { useState } from 'react';
import Icon from '../../Icon/Icon';
import ModalWindow from '../../ModalWindow/ModalWindow';
import { clampToRange } from '../../../helpers/employees';
import style from './BulkEditPayrollForm.module.css';

// "Податки" поки не має де зберігатись (немає такого поля в
// EmployeePayrollEntry на бекенді) — інпут навмисно неактивний, поле
// ігнорується при збереженні, доки не з'ясуємо з бізнесом його логіку.
const BULK_EDIT_FIELDS = [
  {
    name: 'distribution',
    label: 'Розподіл',
    placeholder: 'Введіть відсоток',
    editable: true,
  },
  {
    name: 'worked_days',
    label: 'Відпрацьовані робочі дні',
    placeholder: 'Введіть кількість відпрацьованих днів',
    editable: true,
  },
  { name: 'bonus', label: 'Бонус', placeholder: 'Введіть суму', editable: true },
  {
    name: 'taxes',
    label: 'Податки',
    placeholder: 'Введіть суму',
    editable: false,
  },
];

const EDITABLE_FIELD_NAMES = BULK_EDIT_FIELDS.filter(
  field => field.editable
).map(field => field.name);

const INITIAL_FIELD_VALUES = BULK_EDIT_FIELDS.reduce((acc, field) => {
  acc[field.name] = '';
  return acc;
}, {});

const BulkEditPayrollForm = ({
  employees,
  onRemoveEmployee,
  onSave,
  saving,
  maxWorkedDays,
  onClose,
}) => {
  const [fieldValues, setFieldValues] = useState(INITIAL_FIELD_VALUES);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  // "Розподіл" — відсоток (0-100). "Відпрацьовані робочі дні" — межа
  // приходить ззовні (найменше "Робочі дні місяця" серед обраних
  // співробітників), щоб лишатись коректною, навіть коли це значення
  // перестане бути статичним.
  const fieldLimits = {
    distribution: { min: 0, max: 100 },
    worked_days: { min: 0, max: maxWorkedDays },
  };

  const handleFieldChange = (field, value) => {
    const limits = fieldLimits[field.name];
    const nextValue = limits ? clampToRange(value, limits.min, limits.max) : value;
    setFieldValues(prev => ({ ...prev, [field.name]: nextValue }));
  };

  const handleFieldClear = name => {
    setFieldValues(prev => ({ ...prev, [name]: '' }));
  };

  const hasUnsavedChanges = EDITABLE_FIELD_NAMES.some(
    name => fieldValues[name] !== ''
  );

  const handleCancelClick = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleContinueEditing = () => setShowUnsavedConfirm(false);

  const handleDiscardClose = () => {
    setShowUnsavedConfirm(false);
    onClose();
  };

  return (
    <div className={style.container}>
      <div className={style.titleRow}>
        <h3 className={style.title}>Масове редагування співробітників</h3>
        <button type="button" className={style.closeBtn} onClick={onClose}>
          <Icon id="close" className={style.closeIcon} />
        </button>
      </div>

      <p className={style.selectedCount}>
        Вибрано співробітників: {employees.length}
      </p>

      <div className={style.chipsList}>
        {employees.map(employee => (
          <span key={employee.id} className={style.chip}>
            {employee.local_full_name}
            <button
              type="button"
              className={style.chipRemoveBtn}
              onClick={() => onRemoveEmployee(employee.id)}
            >
              <Icon id="close" className={style.chipRemoveIcon} />
            </button>
          </span>
        ))}
      </div>

      <div className={style.fieldsGrid}>
        {BULK_EDIT_FIELDS.map(field => {
          const limits = fieldLimits[field.name];
          return (
            <div key={field.name} className={style.field}>
              <span className={style.fieldLabel}>{field.label}</span>
              <input
                type={field.editable ? 'number' : 'text'}
                className={style.fieldInput}
                placeholder={field.placeholder}
                value={fieldValues[field.name]}
                disabled={!field.editable}
                min={limits?.min}
                max={limits?.max}
                onChange={e => handleFieldChange(field, e.target.value)}
              />
              {field.editable && fieldValues[field.name] && (
                <button
                  type="button"
                  className={style.fieldClearBtn}
                  onClick={() => handleFieldClear(field.name)}
                >
                  <Icon id="close" className={style.fieldClearIcon} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className={style.hint}>
        *Зміни будуть застосовані для всіх вибраних співробітників
      </p>

      <div className={style.actions}>
        <button
          type="button"
          className={style.saveBtn}
          disabled={!hasUnsavedChanges || saving}
          onClick={() => onSave(fieldValues)}
        >
          {saving ? 'Збереження...' : 'Зберегти зміни'}
        </button>
        <button
          type="button"
          className={style.cancelBtn}
          onClick={handleCancelClick}
          disabled={!hasUnsavedChanges || saving}
        >
          Скасувати
        </button>
      </div>

      <ModalWindow
        isModalOpen={showUnsavedConfirm}
        onCloseModal={handleContinueEditing}
        closeBtn={false}
      >
        <div className={style.unsavedConfirm}>
          <div className={style.unsavedConfirmHeader}>
            <p className={style.unsavedConfirmTitle}>Незбережені зміни</p>
            <button
              type="button"
              className={style.unsavedConfirmCloseBtn}
              onClick={handleContinueEditing}
            >
              <Icon id="close" className={style.unsavedConfirmCloseIcon} />
            </button>
          </div>
          <p className={style.unsavedConfirmText}>
            Якщо закрити вікно зараз, внесені зміни не збережуться і не будуть
            внесені у таблицю.
          </p>
          <div className={style.unsavedConfirmActions}>
            <button
              type="button"
              className={style.unsavedConfirmPrimaryBtn}
              onClick={handleContinueEditing}
            >
              Продовжити редагування
            </button>
            <button
              type="button"
              className={style.unsavedConfirmSecondaryBtn}
              onClick={handleDiscardClose}
            >
              Закрити без збереження
            </button>
          </div>
        </div>
      </ModalWindow>
    </div>
  );
};

export default BulkEditPayrollForm;
