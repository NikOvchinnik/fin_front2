import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Notify } from 'notiflix';
import Form from '../../Form/Form';
import Loader from '../../Loader/Loader';
import style from './BulkPaymentForm.module.css';
import {
  getCurrencies,
  getExpenseCategories,
  getPaymentForms,
} from '../../../helpers/axios/payments';
import { getUnits } from '../../../helpers/axios/units';
import { getSubdivisions } from '../../../helpers/axios/subdivisions';
import { mapSubdivisionOptions } from '../../../helpers/departmentField';
import { isFinanceRole } from '../../../helpers/roles';
import { periodOptions } from '../../../helpers/paymentPeriods';
import { translateOptions } from '../../../helpers/i18nOptions';
import { generateDefaultPeriods } from '../../../helpers/periods';
import { getValidPaymentDatesOfMonth } from '../../../helpers/paymentDateOptions';
import {
  distributeEvenly,
  generateMonthRange,
  roundTo2,
} from '../../../helpers/budgetingDistribution';
import { createBulkRequests } from '../../../helpers/axios/requests';
import {
  getContractors,
  postContractors,
} from '../../../helpers/axios/contractors';
import { useSelector } from 'react-redux';
import { selectUserName, selectUserRole } from '../../../redux/auth/selectors';
import { useTranslation } from 'react-i18next';

const PERIOD_OPTIONS = generateDefaultPeriods(36);

const BulkPaymentForm = ({ closeModal, onRefresh }) => {
  const { t } = useTranslation();
  const userName = useSelector(selectUserName);
  const userRole = useSelector(selectUserRole);
  const canViewSubdivision = isFinanceRole(userRole);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [unitOptions, setUnitOptions] = useState([]);
  const [subdivisionOptions, setSubdivisionOptions] = useState([]);
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [expenseCategoryOptions, setExpenseCategoryOptions] = useState([]);
  const [paymentFormOptions, setPaymentFormOptions] = useState([]);
  const [contractorsOptions, setContractorsOptions] = useState([]);

  const [sharedValues, setSharedValues] = useState({
    unit_id: '',
    subdivision_id: '',
    expense_category_id: '',
    payment_form_id: '',
    contractor_id: '',
    payment_details: '',
    purpose: '',
    payment_period: '',
    currency_id: '',
    comment: '',
  });

  const defaultPeriod = dayjs().format('MM.YYYY');
  const [startPeriod, setStartPeriod] = useState(defaultPeriod);
  const [endPeriod, setEndPeriod] = useState(defaultPeriod);
  const [totalAmount, setTotalAmount] = useState('');
  const [entries, setEntries] = useState({});

  const months = useMemo(
    () => generateMonthRange(startPeriod, endPeriod),
    [startPeriod, endPeriod]
  );

  const datesByMonth = useMemo(() => {
    const map = {};
    months.forEach(period => {
      map[period] = getValidPaymentDatesOfMonth(period);
    });
    return map;
  }, [months]);

  const redistribute = (total = totalAmount) => {
    const amountValues = distributeEvenly(Number(total) || 0, months.length);

    const next = {};
    months.forEach((period, index) => {
      next[period] = {
        amount: amountValues[index] ?? 0,
        payment_date_await: datesByMonth[period]?.[0]?.value || '',
      };
    });
    setEntries(next);
  };

  useEffect(() => {
    redistribute();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months.join(',')]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const units = await getUnits();
        setUnitOptions(units.map(p => ({ value: p.id, label: p.name })));

        if (canViewSubdivision) {
          const subdivisions = await getSubdivisions();
          setSubdivisionOptions(mapSubdivisionOptions(subdivisions));
        }

        const currencies = await getCurrencies();
        setCurrencyOptions(currencies.map(c => ({ value: c.id, label: c.name })));

        const expenseCategories = await getExpenseCategories();
        setExpenseCategoryOptions(
          expenseCategories
            .filter(e => e.is_active)
            .map(e => ({ value: e.id, label: e.name }))
        );

        const paymentForms = await getPaymentForms();
        setPaymentFormOptions(
          paymentForms.map(p => ({ value: p.id, label: p.name }))
        );

        const contractors = await getContractors();
        setContractorsOptions(
          contractors.map(c => ({ value: c.id, label: c.name }))
        );
      } catch {
        Notify.failure('Сталася помилка, спробуйте ще раз');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [canViewSubdivision]);

  const handleEntryAmountChange = (period, rawValue) => {
    const value = rawValue.replace(',', '.').replace(/[^0-9.]/g, '');
    setEntries(prev => ({
      ...prev,
      [period]: { ...prev[period], amount: value },
    }));
  };

  const handleEntryDateChange = (period, value) => {
    setEntries(prev => ({
      ...prev,
      [period]: { ...prev[period], payment_date_await: value },
    }));
  };

  const sums = useMemo(() => {
    const distributed = months.reduce(
      (acc, period) => acc + (Number(entries[period]?.amount) || 0),
      0
    );

    return {
      distributed: roundTo2(distributed),
      remainder: roundTo2((Number(totalAmount) || 0) - distributed),
    };
  }, [entries, months, totalAmount]);

  const hasNegativeAmount = months.some(
    period => Number(entries[period]?.amount) < 0
  );

  const hasMissingDate = months.some(period => !entries[period]?.payment_date_await);

  const sharedFieldsFilled =
    sharedValues.unit_id &&
    sharedValues.expense_category_id &&
    sharedValues.payment_form_id &&
    sharedValues.contractor_id &&
    String(sharedValues.payment_details).trim() &&
    sharedValues.purpose.trim() &&
    sharedValues.payment_period &&
    sharedValues.currency_id;

  const canSubmit =
    sharedFieldsFilled &&
    months.length > 0 &&
    !hasNegativeAmount &&
    !hasMissingDate &&
    Math.abs(sums.remainder) < 0.005;

  const resolveContractorId = async () => {
    const contractorId = sharedValues.contractor_id;

    const existingContractor = contractorsOptions.find(c => {
      if (String(c.value) === String(contractorId)) return true;
      if (typeof contractorId === 'string') {
        return c.label.toLowerCase() === contractorId.toLowerCase();
      }
      return false;
    });

    if (existingContractor) return existingContractor.value;

    const newContractor = await postContractors({ name: contractorId });
    return newContractor.id;
  };

  const handleSubmit = async action => {
    if (!canSubmit) {
      Notify.failure(
        "Перевірте обов'язкові поля, дати оплати та розподіл сум — залишок має дорівнювати нулю."
      );
      return;
    }

    setSaving(true);
    try {
      const contractorId = await resolveContractorId();

      await createBulkRequests({
        action,
        unit_id: sharedValues.unit_id,
        subdivision_id: canViewSubdivision ? sharedValues.subdivision_id || null : null,
        expense_category_id: sharedValues.expense_category_id,
        payment_form_id: sharedValues.payment_form_id,
        contractor_id: contractorId,
        payment_details: String(sharedValues.payment_details).trim(),
        purpose: sharedValues.purpose.trim(),
        payment_period: sharedValues.payment_period,
        currency_id: sharedValues.currency_id,
        comment: sharedValues.comment.trim(),
        entries: months.map(period => ({
          period,
          payment_date_await: entries[period]?.payment_date_await || '',
          amount: roundTo2(entries[period]?.amount),
        })),
      });
      onRefresh();
      closeModal();
      Notify.success(`Створено ${months.length} платіж(ів).`);
    } catch (error) {
      Notify.failure(
        error?.response?.data?.message || 'Сталася помилка, спробуйте ще раз'
      );
      console.error('Error: ', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className={style.container}>
      <h3 className={style.title}>Створити регулярний платіж</h3>

      <h4 className={style.sectionTitle}>Спільні дані</h4>
      <label className={style.field}>
        <span className={style.fieldLabel}>Заявник</span>
        <input type="text" className={style.fieldInput} value={userName} disabled readOnly />
      </label>
      <div className={style.fieldsGrid}>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'unit_id',
                label: t('labels.department'),
                options: unitOptions,
                onChange: option =>
                  setSharedValues(prev => ({ ...prev, unit_id: option?.value ?? option ?? '' })),
              },
            ]}
            defaultValues={{ unit_id: sharedValues.unit_id }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'expense_category_id',
                label: t('labels.expenseCategory'),
                options: expenseCategoryOptions,
                onChange: option =>
                  setSharedValues(prev => ({
                    ...prev,
                    expense_category_id: option?.value ?? option ?? '',
                  })),
              },
            ]}
            defaultValues={{ expense_category_id: sharedValues.expense_category_id }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'payment_form_id',
                label: t('labels.paymentForm'),
                options: paymentFormOptions,
                onChange: option =>
                  setSharedValues(prev => ({
                    ...prev,
                    payment_form_id: option?.value ?? option ?? '',
                  })),
              },
            ]}
            defaultValues={{ payment_form_id: sharedValues.payment_form_id }}
          />
        </div>
        {canViewSubdivision && (
          <div className={style.selectField}>
            <Form
              asForm={false}
              fields={[
                {
                  type: 'autocomplete-select',
                  name: 'subdivision_id',
                  label: 'Subdivision',
                  options: subdivisionOptions,
                  onChange: option =>
                    setSharedValues(prev => ({
                      ...prev,
                      subdivision_id: option?.value ?? option ?? '',
                    })),
                },
              ]}
              defaultValues={{ subdivision_id: sharedValues.subdivision_id }}
            />
          </div>
        )}
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-input',
                name: 'contractor_id',
                label: t('labels.contractor'),
                options: contractorsOptions,
                onChange: value =>
                  setSharedValues(prev => ({ ...prev, contractor_id: value })),
              },
            ]}
            defaultValues={{ contractor_id: sharedValues.contractor_id }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'autocomplete-select',
                name: 'payment_period',
                label: t('labels.paymentPeriod'),
                options: translateOptions(periodOptions, t),
                onChange: option =>
                  setSharedValues(prev => ({
                    ...prev,
                    payment_period: option?.value ?? option ?? '',
                  })),
              },
            ]}
            defaultValues={{ payment_period: sharedValues.payment_period }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'currency_id',
                label: t('labels.currency'),
                options: currencyOptions,
                onChange: value => setSharedValues(prev => ({ ...prev, currency_id: value })),
              },
            ]}
            defaultValues={{ currency_id: sharedValues.currency_id }}
          />
        </div>
      </div>
      <label className={style.field}>
        <span className={style.fieldLabel}>{t('labels.paymentDetails')} *</span>
        <textarea
          className={style.fieldTextarea}
          value={sharedValues.payment_details}
          onChange={e =>
            setSharedValues(prev => ({ ...prev, payment_details: e.target.value }))
          }
        />
      </label>
      <label className={style.field}>
        <span className={style.fieldLabel}>{t('labels.purpose')} *</span>
        <textarea
          className={style.fieldTextarea}
          value={sharedValues.purpose}
          onChange={e => setSharedValues(prev => ({ ...prev, purpose: e.target.value }))}
        />
      </label>
      <label className={style.field}>
        <span className={style.fieldLabel}>{t('labels.comment')}</span>
        <textarea
          className={style.fieldTextarea}
          value={sharedValues.comment}
          onChange={e => setSharedValues(prev => ({ ...prev, comment: e.target.value }))}
        />
      </label>

      <h4 className={style.sectionTitle}>Період і суми</h4>
      <div className={style.fieldsGrid}>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'startPeriod',
                label: 'Період з',
                options: PERIOD_OPTIONS,
                onChange: value => setStartPeriod(value),
              },
            ]}
            defaultValues={{ startPeriod }}
          />
        </div>
        <div className={style.selectField}>
          <Form
            asForm={false}
            fields={[
              {
                type: 'select',
                name: 'endPeriod',
                label: 'Період по',
                options: PERIOD_OPTIONS,
                onChange: value => setEndPeriod(value),
              },
            ]}
            defaultValues={{ endPeriod }}
          />
        </div>
      </div>
      {months.length === 0 && (
        <p className={style.warningText}>
          Період «по» має бути не раніше періоду «з».
        </p>
      )}

      <div className={style.fieldsGrid}>
        <label className={style.field}>
          <span className={style.fieldLabel}>Загальна сума</span>
          <input
            type="text"
            inputMode="decimal"
            className={style.fieldInput}
            value={totalAmount}
            onChange={e =>
              setTotalAmount(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))
            }
          />
        </label>
        <button
          type="button"
          className={style.distributeBtn}
          onClick={() => redistribute()}
          disabled={months.length === 0}
        >
          Розподілити порівну
        </button>
      </div>

      {months.length > 0 && (
        <div className={style.tableWrapper}>
          <table className={style.table}>
            <thead>
              <tr>
                <th>Місяць</th>
                <th>Сума</th>
                <th>Дата оплати</th>
              </tr>
            </thead>
            <tbody>
              {months.map(period => {
                const dateOptions = datesByMonth[period] || [];
                return (
                  <tr key={period}>
                    <td>{period}</td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        className={style.cellInput}
                        value={entries[period]?.amount ?? ''}
                        onChange={e => handleEntryAmountChange(period, e.target.value)}
                      />
                    </td>
                    <td>
                      <select
                        className={style.cellSelect}
                        value={entries[period]?.payment_date_await || ''}
                        onChange={e => handleEntryDateChange(period, e.target.value)}
                      >
                        <option value="" disabled>
                          —
                        </option>
                        {dateOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {dateOptions.length === 0 && (
                        <span className={style.summaryError}>
                          Немає доступних дат
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className={style.summaryRow}>
            <div className={style.summaryBlock}>
              <span>Розподілено: {sums.distributed}</span>
              <span className={Math.abs(sums.remainder) >= 0.005 ? style.summaryError : ''}>
                Залишок: {sums.remainder}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className={style.actions}>
        <button
          type="button"
          className={style.cancelBtn}
          onClick={closeModal}
          disabled={saving}
        >
          Скасувати
        </button>
        <button
          type="button"
          className={style.draftBtn}
          onClick={() => handleSubmit('draft')}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Зберігаю...' : 'Зберегти чернетки'}
        </button>
        <button
          type="button"
          className={style.submitBtn}
          onClick={() => handleSubmit('send')}
          disabled={saving || !canSubmit}
        >
          {saving ? 'Зберігаю...' : 'Відправити на затвердження'}
        </button>
      </div>
    </div>
  );
};

export default BulkPaymentForm;
