import { useState } from 'react';
import { Notify } from 'notiflix';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import uk from 'date-fns/locale/uk';
import ModalWindow from '../ModalWindow/ModalWindow';
import Form from '../Form/Form';
import Icon from '../Icon/Icon';
import style from './StaffRateDrawer.module.css';
import { employeeFields } from '../../helpers/employees';
import { patchEmployee } from '../../helpers/axios/employees';

registerLocale('uk', {
  ...uk,
  options: { weekStartsOn: 1 },
});

const currencyOptions = ['UAH', 'USD', 'EUR'];

const drawerInfoKeys = [
  'unit',
  'department',
  'subdivision',
  'manager',
  'payment_form',
  'payment_details',
  'tax_id',
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

const StaffRateDrawer = ({ isOpen, employee, onClose, onSaved }) => {
  const [rateDate, setRateDate] = useState(new Date());
  const [rateValue, setRateValue] = useState(
    employee?.rate != null ? String(employee.rate) : ''
  );
  const [currency, setCurrency] = useState(employee?.currency || 'UAH');
  const [saving, setSaving] = useState(false);

  if (!employee) return null;

  const canSave = rateValue.trim() !== '' && !!currency && !!rateDate;

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchEmployee(employee.id, { rate: rateValue, currency });
      Notify.success('Ставку збережено.');
      await onSaved();
      onClose();
    } catch {
      Notify.failure('Не вдалося зберегти ставку.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWindow
      isModalOpen={isOpen}
      onCloseModal={onClose}
      closeBtn={false}
      customStyles={drawerCustomStyles}
    >
      <div className={style.drawer}>
        <div className={`${style.section} ${style.header}`}>
          <div className={style.titleContainer}>
            <p className={style.name}>{employee.local_full_name || '-'}</p>
            <p className={style.jobTitle}>{employee.position || '-'}</p>
          </div>
          <button
            type="button"
            className={style.closeBtn}
            onClick={onClose}
          >
            <Icon id="close" className={style.closeIcon} />
          </button>
        </div>

        <div className={style.section}>
          <p className={style.sectionTitle}>Інформація про співробітника</p>
          <div className={style.infoList}>
            {drawerInfoKeys.map(key => (
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
          <p className={style.historyText}>
            Записів ще немає — це нова ставка.
          </p>
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
    </ModalWindow>
  );
};

export default StaffRateDrawer;
