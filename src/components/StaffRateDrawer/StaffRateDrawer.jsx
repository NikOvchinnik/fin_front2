import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import { Tooltip } from '@mui/material';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import uk from 'date-fns/locale/uk';
import ModalWindow from '../ModalWindow/ModalWindow';
import Form from '../Form/Form';
import Icon from '../Icon/Icon';
import style from './StaffRateDrawer.module.css';
import { employeeFields, formatRate } from '../../helpers/employees';
import {
  postEmployeeRate,
  putEmployeeRate,
} from '../../helpers/axios/employees';

registerLocale('uk', {
  ...uk,
  options: { weekStartsOn: 1 },
});

const currencyOptions = ['UAH', 'USD', 'EUR'];

// "Спільні дані" — однакові для людини незалежно від того, скільки в неї
// призначень (керівників). Керівник/юніт/департамент/підрозділ/посада/
// графік належать конкретному призначенню — показуються нижче, під
// вкладкою обраного керівника.
const sharedInfoKeys = ['payment_form', 'payment_details', 'gender'];

const assignmentInfoKeys = [
  'unit',
  'department',
  'subdivision',
  'position',
  'work_schedule',
];

const employeeFieldByKey = employeeFields.reduce((acc, field) => {
  acc[field.key] = field;
  return acc;
}, {});

const drawerCustomStyles = {
  position: 'fixed',
  top: 0,
  right: 0,
  left: 'auto',
  bottom: 0,
  transform: 'none',
  width: '556px',
  maxWidth: '100vw',
  height: '100%',
  maxHeight: '100vh',
  borderRadius: 0,
  padding: 0,
};

const StaffRateDrawer = ({
  isOpen,
  employee,
  initialAssignmentId = null,
  onClose,
  onSaved,
}) => {
  // Бекенд завжди віддає хоча б одне призначення; про всяк випадок — якщо
  // раптом масив порожній — падаємо назад на самого employee (у нього ці
  // самі поля лежать сплющено, для сумісності зі старим кодом). Обчислюємо
  // ДО хуків (звичайний JS, не хук) — потрібно для initial-значення стейту
  // нижче.
  const assignments = employee?.assignments?.length
    ? employee.assignments
    : employee
    ? [employee]
    : [];
  const initialIndex = Math.max(
    assignments.findIndex(item => item.id === initialAssignmentId),
    0
  );

  const [selectedAssignmentIndex, setSelectedAssignmentIndex] =
    useState(initialIndex);
  const [pendingTabIndex, setPendingTabIndex] = useState(null);
  const [rateDate, setRateDate] = useState(() => new Date());
  const [rateValue, setRateValue] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [saving, setSaving] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [rateHistory, setRateHistory] = useState([]);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [editRateValue, setEditRateValue] = useState('');
  const [editCurrency, setEditCurrency] = useState('UAH');
  const [editRateDate, setEditRateDate] = useState(new Date());
  const [editSaving, setEditSaving] = useState(false);

  const selectedAssignment =
    assignments[selectedAssignmentIndex] || assignments[0] || null;

  // При відкритті/перемиканні вкладки керівника — скидаємо поле нової
  // ставки (це чернетка саме для ЦЬОГО керівника) і підвантажуємо історію
  // саме його призначення, а не когось іншого.
  useEffect(() => {
    setCurrency(selectedAssignment?.currency || 'UAH');
    setRateValue('');
    setRateDate(new Date());
    setRateHistory(selectedAssignment?.rate_history || []);
    setEditingEntryId(null);
  }, [selectedAssignment?.id]);

  if (!employee) return null;

  const canSave = rateValue.trim() !== '' && !!currency && !!rateDate;
  const hasUnsavedChanges = rateValue.trim() !== '';

  const handleRequestClose = () => {
    if (hasUnsavedChanges) {
      setPendingTabIndex(null);
      setShowUnsavedConfirm(true);
    } else {
      onClose();
    }
  };

  const handleTabClick = index => {
    if (index === selectedAssignmentIndex) return;
    if (hasUnsavedChanges) {
      setPendingTabIndex(index);
      setShowUnsavedConfirm(true);
      return;
    }
    setSelectedAssignmentIndex(index);
  };

  const handleContinueEditing = () => {
    setShowUnsavedConfirm(false);
    setPendingTabIndex(null);
  };

  const handleDiscardClose = () => {
    setShowUnsavedConfirm(false);
    if (pendingTabIndex !== null) {
      setSelectedAssignmentIndex(pendingTabIndex);
      setPendingTabIndex(null);
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await postEmployeeRate(employee.id, selectedAssignment.id, {
        rate: rateValue,
        currency,
        rate_date: dayjs(rateDate).format('DD.MM.YYYY'),
      });
      Notify.success('Ставку збережено.');
      await onSaved();
      onClose();
    } catch {
      Notify.failure('Не вдалося зберегти ставку.');
    } finally {
      setSaving(false);
    }
  };

  const startEditingEntry = entry => {
    setEditingEntryId(entry.id);
    setEditRateValue(String(entry.rate));
    setEditCurrency(entry.currency);
    setEditRateDate(dayjs(entry.effective_date).toDate());
  };

  const cancelEditingEntry = () => {
    setEditingEntryId(null);
  };

  const handleSaveEntryEdit = async entryId => {
    setEditSaving(true);
    try {
      const updatedEmployee = await putEmployeeRate(
        employee.id,
        selectedAssignment.id,
        entryId,
        {
          rate: editRateValue,
          currency: editCurrency,
          rate_date: dayjs(editRateDate).format('DD.MM.YYYY'),
        }
      );
      const updatedAssignment = (updatedEmployee.assignments || []).find(
        item => item.id === selectedAssignment.id
      );
      setRateHistory(updatedAssignment?.rate_history || []);
      setEditingEntryId(null);
      Notify.success('Запис оновлено.');
      // Оновлюємо таблицю на фоні — дровер лишається відкритим.
      onSaved();
    } catch {
      Notify.failure('Не вдалося оновити запис.');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <ModalWindow
      isModalOpen={isOpen}
      onCloseModal={handleRequestClose}
      closeBtn={false}
      customStyles={drawerCustomStyles}
    >
      <div className={style.drawer}>
        <div className={`${style.section} ${style.header}`}>
          <div className={style.titleContainer}>
            <p className={style.name}>{employee.local_full_name || '-'}</p>
            <p className={style.jobTitle}>ІПН: {employee.tax_id || '-'}</p>
          </div>
          <button
            type="button"
            className={style.closeBtn}
            onClick={handleRequestClose}
          >
            <Icon id="close" className={style.closeIcon} />
          </button>
        </div>

        <div className={style.section}>
          <p className={style.sectionTitle}>Спільні дані</p>
          <div className={style.infoList}>
            {sharedInfoKeys.map(key => (
              <div key={key} className={style.infoItem}>
                <p className={style.infoLabel}>
                  {employeeFieldByKey[key]?.label || key}
                </p>
                <p className={style.infoValue}>{employee[key] || '-'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className={style.section}>
          <p className={style.sectionTitle}>Дані по керівнику</p>
          <div className={style.managerTabs}>
            {assignments.map((assignment, index) => (
              <button
                key={assignment.id ?? index}
                type="button"
                className={`${style.managerTab} ${
                  index === selectedAssignmentIndex ? style.managerTabActive : ''
                }`}
                onClick={() => handleTabClick(index)}
              >
                {assignment.manager || '-'}
              </button>
            ))}
          </div>
          <div className={style.infoList}>
            {assignmentInfoKeys.map(key => (
              <div key={key} className={style.infoItem}>
                <p className={style.infoLabel}>
                  {employeeFieldByKey[key]?.label || key}
                </p>
                <p className={style.infoValue}>
                  {selectedAssignment[key] || '-'}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className={style.section}>
          <p className={style.sectionTitle}>Оплата праці</p>
          <div className={style.salaryRow}>
            <div className={style.field}>
              <p className={style.fieldLabel}>Ставка</p>
              <input
                type="text"
                inputMode="numeric"
                className={style.fieldInput}
                placeholder="0"
                value={rateValue}
                onChange={e =>
                  setRateValue(e.target.value.replace(/\D/g, ''))
                }
              />
            </div>
            <div className={`${style.field} ${style.styledFormField}`}>
              <Form
                // Form (react-hook-form) бере defaultValues лише при
                // монтуванні — без key, прив'язаного до обраного
                // призначення, видима валюта не оновлювалась би при
                // перемиканні вкладки керівника (хоч внутрішній стейт і
                // збереження вже й так були б правильні).
                key={selectedAssignment.id}
                fields={[
                  {
                    type: 'select',
                    name: 'currency',
                    label: 'Валюта',
                    options: currencyOptions.map(option => ({
                      value: option,
                      label: option,
                    })),
                    onChange: value => setCurrency(value),
                  },
                ]}
                defaultValues={{ currency }}
              />
            </div>
          </div>
          <div className={style.field}>
            <p className={style.fieldLabel}>Дата, з якої діє ставка</p>
            <DatePicker
              selected={rateDate}
              onChange={date => setRateDate(date)}
              dateFormat="dd.MM.yyyy"
              locale="uk"
              className={style.fieldInput}
              wrapperClassName={style.dateWrapper}
            />
            <p className={style.fieldHint}>
              * За замовчуванням — сьогодні. Можна вказати іншу дату
              (наприклад, заднім числом або на майбутнє).
            </p>
          </div>
        </div>

        <div className={style.section}>
          <p className={style.sectionTitle}>Історія змін ставки</p>
          {rateHistory.length > 0 ? (
            <div className={style.historyList}>
              {rateHistory.map(entry =>
                editingEntryId === entry.id ? (
                  <div key={entry.id} className={style.historyEditRow}>
                    <div className={style.historyEditFields}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={style.historyEditInput}
                        value={editRateValue}
                        onChange={e =>
                          setEditRateValue(e.target.value.replace(/\D/g, ''))
                        }
                      />
                      <select
                        className={style.historyEditSelect}
                        value={editCurrency}
                        onChange={e => setEditCurrency(e.target.value)}
                      >
                        {currencyOptions.map(option => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      <DatePicker
                        selected={editRateDate}
                        onChange={date => setEditRateDate(date)}
                        dateFormat="dd.MM.yyyy"
                        locale="uk"
                        className={style.historyEditInput}
                        wrapperClassName={style.historyEditDateWrapper}
                      />
                    </div>
                    <div className={style.historyEditActions}>
                      <button
                        type="button"
                        className={style.historyConfirmBtn}
                        disabled={editSaving}
                        onClick={() => handleSaveEntryEdit(entry.id)}
                      >
                        <Icon id="check" className={style.historyActionIcon} />
                      </button>
                      <button
                        type="button"
                        className={style.historyCancelBtn}
                        disabled={editSaving}
                        onClick={cancelEditingEntry}
                      >
                        <Icon id="close" className={style.historyActionIcon} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div key={entry.id} className={style.historyItem}>
                    <span className={style.historyRate}>
                      {formatRate(entry.rate, entry.currency)}
                    </span>
                    <span className={style.historyMeta}>
                      {dayjs(entry.effective_date).format('DD.MM.YY')}
                      {' • '}
                      {entry.created_by_name
                        ? `Внесено: ${entry.created_by_name}`
                        : 'Автор невідомий'}
                    </span>
                    {entry.is_editable ? (
                      <Tooltip title="Редагувати запис" arrow>
                        <button
                          type="button"
                          className={style.historyActionBtn}
                          onClick={() => startEditingEntry(entry)}
                        >
                          <Icon id="edit" className={style.historyActionIcon} />
                        </button>
                      </Tooltip>
                    ) : (
                      <Tooltip title="Редагування недоступне" arrow>
                        <span className={style.historyLockBtn}>
                          <Icon id="lock" className={style.historyActionIcon} />
                        </span>
                      </Tooltip>
                    )}
                  </div>
                )
              )}
            </div>
          ) : (
            <p className={style.historyText}>
              Записів ще немає — це нова ставка.
            </p>
          )}
        </div>

        <div className={style.buttonsRow}>
          <button
            type="button"
            className={style.saveBtn}
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? 'Зберігаю...' : 'Зберегти зміни'}
          </button>
          <button type="button" className={style.cancelBtn} onClick={onClose}>
            Скасувати
          </button>
        </div>
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
            {pendingTabIndex !== null
              ? 'Ви ввели нову ставку для цього керівника, але не зберегли її. Якщо перейдете до іншого керівника, ці дані буде втрачено.'
              : 'Ви внесли зміни в картку співробітника, але не зберегли їх. Якщо ви закриєте панель, усі нові дані буде втрачено.'}
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
              {pendingTabIndex !== null
                ? 'Перейти без збереження'
                : 'Закрити без збереження'}
            </button>
          </div>
        </div>
      </ModalWindow>
    </ModalWindow>
  );
};

export default StaffRateDrawer;
